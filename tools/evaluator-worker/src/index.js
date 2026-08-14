import { runRules, runCSSRules, runComponentRules } from './rules.js'

const STANDARDS = `
WEB123 Web Standards Checklist

SITE STRUCTURE
- All images in images/ folder, stylesheets in styles/ (default is default.css), scripts in scripts/
- Unused files in z_archives/, reusable code in components/
- Absolute URLs for external sites, relative URLs for internal pages
- Relative links must NOT open in new tabs
- Header and footer may live in the components/ folder and be injected via script

FILE NAMING
- Lowercase, no spaces, meaningful names (e.g. introduction.html, course_contract.html)

TITLE ELEMENT
- Format: Site Name | Page Name (divider can vary: |, ~, -, etc.)

FAVICON
- Legible, matches site name/theme, visible on browser tab

PAGE VALIDATION
- lint.page script must be the LAST element in <head>
- Cloud must appear all green; WCAG check shows no warnings or errors

LAYOUT / STRUCTURE
- Body must have <header>, <main>, <footer>
- Header and footer match pixel-perfect across entire site
- Header: site name in <h1> only, <nav> with site navigation; external nav is secondary
- Main: page name in <h2> at top; subsections use <section> + <h3>; further divisions use <article> + <h4>
- Footer: "Site Designed by [firm/name]"; optional certifications; tagline in italics OR quotes (not both); layout widest-to-narrowest

STYLES
- Avoid pure black/white without documented reason
- At least 2 fonts (Google Fonts); avoid complex/serif for small text
- Override default link colors -- no default blue/purple
- Cohesive color palette (Coolors recommended)
- No text-align: justify on normal screens

CRAP DESIGN PRINCIPLES
- Contrast: sufficient contrast between text/elements and background
- Repetition: colors, fonts, spacing consistent across site
- Alignment: elements aligned for clear visual connection
- Proximity: related items grouped, unrelated items spaced apart

DO NOTs
- No divs/spans when a semantic element is available
- No inline styles unless 2 or fewer instances
- No unused classes (e.g. class="main" on <main>)
- No unnecessary or AI-copy-pasted code
- Only one <h1> and one <h2> per page (h1=site name, h2=page name)
- Don't overcomplicate CSS/HTML
- No black, white, Times New Roman, Comic Sans, or Papyrus
- No clashing or too-similar colors
- No centered paragraphs (left-align for readability)
- No centered bullets
`

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    try {
      const { url, instructions } = await request.json()
      if (!url) return Response.json({ error: 'Missing url' }, { status: 400 })

      const baseUrl = url.replace(/\/?$/, '/').replace(/\/[^\/]+\.html\/?$/, '/')

      // 1. Fetch the submitted page first
      const indexRes = await fetch(url, { headers: { 'User-Agent': 'WEB123-Evaluator/1.0' } })
      if (!indexRes.ok) {
        return Response.json(
          { error: 'Could not fetch page. Check the URL and make sure the site is public.' },
          { status: 400, headers: corsHeaders }
        )
      }
      const indexHtml = await indexRes.text()

      // 2. Discover nav links — check inline HTML first, then components/header.html
      let navSource = indexHtml
      const hasInlineNav = /<nav[\s\S]*?<\/nav>/i.test(indexHtml)
      if (!hasInlineNav) {
        try {
          const compRes = await fetch(baseUrl + 'components/header.html')
          if (compRes.ok) navSource = await compRes.text()
        } catch {}
      }
      const navSection = navSource.match(/<nav[\s\S]*?<\/nav>/i)?.[0] || navSource
      const navLinks = [...navSection.matchAll(/href=["']([^"'#]+\.html)[^"']*["']/gi)]
        .map(m => m[1])
        .filter(href => !href.startsWith('http'))
        .filter((href, i, arr) => arr.indexOf(href) === i)
        .slice(0, 8)

      // 3. Build page list: submitted page + nav-discovered pages
      const submitted = { name: pageName(url), url }
      const linkedTargets = navLinks.map(href => ({
        name: pageName(href),
        url: new URL(href, baseUrl).href
      })).filter(t => t.url !== url)

      const pageTargets = [submitted, ...linkedTargets]

      const pages = await Promise.all(pageTargets.map(async ({ name, url: pageUrl }) => {
        try {
          const html = pageUrl === url ? indexHtml : await fetch(pageUrl, { headers: { 'User-Agent': 'WEB123-Evaluator/1.0' } }).then(r => r.ok ? r.text() : null)
          if (!html) return { name, url: pageUrl, found: false, rules: [] }
          const rules = runRules(html, pageUrl)
          await verifyFavicon(rules, baseUrl)
          return { name, url: pageUrl, found: true, html, rules }
        } catch {
          return { name, url: pageUrl, found: false, rules: [] }
        }
      }))

      if (!pages[0].found) {
        return Response.json(
          { error: 'Could not fetch index page. Check the URL and make sure the site is public.' },
          { status: 400, headers: corsHeaders }
        )
      }

      // 2. Fetch CSS and run CSS checks once
      let css = ''
      try {
        const cssRes = await fetch(baseUrl + 'styles/default.css')
        if (cssRes.ok) css = await cssRes.text()
      } catch {}
      const cssResults = runCSSRules(css)

      // 3. Fetch and inspect component files
      let componentResults = []
      let componentNote = null
      try {
        const [headerRes, footerRes] = await Promise.all([
          fetch(baseUrl + 'components/header.html'),
          fetch(baseUrl + 'components/footer.html'),
        ])
        const headerHtml = headerRes.ok ? await headerRes.text() : null
        const footerHtml = footerRes.ok ? await footerRes.text() : null
        if (headerHtml || footerHtml) {
          componentResults = runComponentRules(headerHtml, footerHtml)
          componentNote = 'Header/footer loaded from components/ folder'
          // Downgrade inline structure/h1 fails since components handle them
          for (const page of pages) {
            for (const id of ['semantic-structure', 'h1-count']) {
              const rule = page.rules.find(r => r.id === id)
              if (rule && rule.status === 'fail') {
                rule.status = 'warn'
                rule.detail += ' (in components/)'
              }
            }
          }
        }
      } catch {}

      // 4. Claude evaluation across all pages
      let aiResults = []
      if (env.ANTHROPIC_API_KEY) {
        const allHtml = pages
          .filter(p => p.found)
          .map(p => `=== ${p.name} ===\n${p.html.slice(0, 3500)}`)
          .join('\n\n')
        const allRules = pages.flatMap(p => p.rules)
        aiResults = await evaluateWithClaude(allHtml, css, instructions || '', allRules, cssResults, componentResults, env.ANTHROPIC_API_KEY)
      }

      // Strip raw html before returning
      const cleanPages = pages.map(({ html: _html, ...rest }) => rest)

      return Response.json(
        { baseUrl, pages: cleanPages, shared: { css: cssResults, components: componentResults, componentNote }, ai: aiResults },
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (err) {
      return Response.json(
        { error: err.message },
        { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
      )
    }
  }
}

function pageName(url) {
  const file = url.split('/').filter(Boolean).pop() || 'index'
  return file.replace(/\.html$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

async function verifyFavicon(rules, baseUrl) {
  const faviconRule = rules.find(r => r.id === 'favicon-declared')
  if (!faviconRule || faviconRule.status !== 'pass' || !faviconRule._faviconHref) return
  try {
    const faviconUrl = faviconRule._faviconHref.startsWith('http')
      ? faviconRule._faviconHref
      : baseUrl + faviconRule._faviconHref
    const res = await fetch(faviconUrl, { method: 'HEAD' })
    faviconRule.detail += res.ok ? ' -- accessible' : ' -- FILE NOT FOUND (404)'
    if (!res.ok) faviconRule.status = 'fail'
  } catch {
    faviconRule.detail += ' -- could not verify'
    faviconRule.status = 'warn'
  }
  delete faviconRule._faviconHref
}

async function evaluateWithClaude(allHtml, css, instructions, ruleResults, cssResults, componentResults, apiKey) {
  const allRules = [...ruleResults, ...cssResults, ...componentResults]
  const alreadyPassed = allRules.filter(r => r.status === 'pass').map(r => r.label)
  const alreadyFailed = allRules.filter(r => r.status === 'fail').map(r => `${r.label}: ${r.detail}`)
  const alreadyWarn = allRules.filter(r => r.status === 'warn').map(r => `${r.label}: ${r.detail}`)

  const cssNote = css
    ? `CSS (styles/default.css):\n${css.slice(0, 3000)}`
    : 'CSS file could not be fetched.'

  const prompt = `You are evaluating a student website. Automated rule checks and component inspection have already verified the following — DO NOT re-check or repeat these.

ALREADY CONFIRMED PASSING:
${alreadyPassed.join('\n') || 'none'}

ALREADY CONFIRMED FAILING:
${alreadyFailed.join('\n') || 'none'}

ALREADY FLAGGED AS WARNINGS:
${alreadyWarn.join('\n') || 'none'}

Your job is ONLY to evaluate the things rules cannot check:
1. Color palette quality — is it cohesive, professional, not jarring? (use the CSS below)
2. Font choices and pairing — do the fonts work well together?
3. CRAP principles — Contrast, Repetition, Alignment, Proximity (infer from HTML/CSS structure)
4. Overall effort and polish — does this look like genuine work?
${instructions ? `5. ASSIGNMENT COMPLIANCE — evaluate each requirement below:\n${instructions.slice(0, 2000)}` : ''}

Do NOT flag anything already in the confirmed passing/failing/warning lists above.

ALL PAGE HTML:
${allHtml}

${cssNote}

Return ONLY a JSON array. No markdown, no text outside the array.
Format: [{"check": "description", "status": "pass|fail|needs-review", "note": "brief explanation"}]`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-beta': 'prompt-caching-2024-07-31'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: [{
        type: 'text',
        text: `You are a fair but rigorous evaluator for WEB123/ITIS3135, a college front-end web development course. You evaluate student websites against these standards:\n${STANDARDS}`,
        cache_control: { type: 'ephemeral' }
      }],
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await response.json()
  let text = data.content?.[0]?.text || '[]'
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try {
    return JSON.parse(text)
  } catch {
    return [{ check: 'AI evaluation error', status: 'needs-review', note: text.slice(0, 300) }]
  }
}
