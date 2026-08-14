export function runRules(html, baseUrl) {
  const results = []
  const headMatch = html.match(/<head[\s\S]*?<\/head>/i)
  const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i)
  const head = headMatch ? headMatch[0] : ''
  const body = bodyMatch ? bodyMatch[0] : ''

  // Title format
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''
  const hasDivider = /[|~\-–—]/.test(title)
  results.push({
    id: 'title-format',
    label: 'Title has site name + divider + page name',
    status: title && hasDivider ? 'pass' : 'fail',
    detail: title ? `"${title}"` : 'No <title> found'
  })

  // Semantic structure
  const hasHeader = /<header[\s>]/i.test(body)
  const hasMain = /<main[\s>]/i.test(body)
  const hasFooter = /<footer[\s>]/i.test(body)
  results.push({
    id: 'semantic-structure',
    label: 'Body contains <header>, <main>, <footer>',
    status: hasHeader && hasMain && hasFooter ? 'pass' : 'fail',
    detail: `header:${hasHeader ? '✓' : '✗'} main:${hasMain ? '✓' : '✗'} footer:${hasFooter ? '✓' : '✗'}`
  })

  // h1 count
  const h1Count = (body.match(/<h1[\s>]/gi) || []).length
  results.push({
    id: 'h1-count',
    label: 'Exactly one <h1> (site name, in header)',
    status: h1Count === 1 ? 'pass' : 'fail',
    detail: `Found ${h1Count}`
  })

  // h2 count
  const h2Count = (body.match(/<h2[\s>]/gi) || []).length
  results.push({
    id: 'h2-count',
    label: 'Exactly one <h2> (page name, in main)',
    status: h2Count === 1 ? 'pass' : h2Count === 0 ? 'fail' : 'warn',
    detail: `Found ${h2Count}`
  })

  // lint.page script
  const hasLintScript = /lint\.page/i.test(head)
  let lintIsLast = false
  if (hasLintScript) {
    const afterLint = head.slice(head.toLowerCase().lastIndexOf('lint.page'))
    lintIsLast = /lint\.page[^<]*<\/script>\s*<\/head>/i.test(afterLint)
  }
  results.push({
    id: 'lint-page',
    label: 'lint.page script present and last in <head>',
    status: hasLintScript && lintIsLast ? 'pass' : hasLintScript ? 'warn' : 'fail',
    detail: !hasLintScript ? 'Not found' : lintIsLast ? 'Present, last in head' : 'Present but not last in head'
  })

  // Favicon declared
  const faviconMatch = head.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/i)
  const faviconHrefMatch = faviconMatch ? faviconMatch[0].match(/href=["']([^"']+)["']/) : null
  const faviconHref = faviconHrefMatch ? faviconHrefMatch[1] : null
  results.push({
    id: 'favicon-declared',
    label: 'Favicon declared in <head>',
    status: faviconHref ? 'pass' : 'fail',
    detail: faviconHref ? `href: ${faviconHref}` : 'No <link rel="icon"> found',
    _faviconHref: faviconHref
  })

  // default.css linked
  const hasDefaultCSS = /href=["']styles\/default\.css["']/i.test(head)
  results.push({
    id: 'default-css',
    label: 'Stylesheet at styles/default.css',
    status: hasDefaultCSS ? 'pass' : 'fail',
    detail: hasDefaultCSS ? 'Found' : 'Expected href="styles/default.css"'
  })

  // Google Fonts (2+ font families)
  const googleFontsLinks = head.match(/fonts\.googleapis\.com[^"']*/gi) || []
  const familyMatches = googleFontsLinks.join(' ').match(/family=([^&"'\s]+)/gi) || []
  const fontCount = familyMatches.length
  results.push({
    id: 'google-fonts',
    label: 'At least 2 Google Font families',
    status: fontCount >= 2 ? 'pass' : fontCount === 1 ? 'warn' : 'fail',
    detail: fontCount ? `${fontCount} family/families linked` : 'No Google Fonts found'
  })

  // Inline styles
  const inlineStyleCount = (body.match(/\bstyle=/gi) || []).length
  results.push({
    id: 'inline-styles',
    label: 'No more than 2 inline styles',
    status: inlineStyleCount <= 2 ? 'pass' : 'fail',
    detail: `${inlineStyleCount} inline style attribute(s)`
  })

  // div/span count
  const divCount = (body.match(/<div[\s>]/gi) || []).length
  const spanCount = (body.match(/<span[\s>]/gi) || []).length
  results.push({
    id: 'semantic-elements',
    label: 'Minimal <div>/<span> (prefer semantic elements)',
    status: divCount + spanCount === 0 ? 'pass' : divCount + spanCount <= 3 ? 'warn' : 'fail',
    detail: `${divCount} div, ${spanCount} span`
  })

  // Relative links with target="_blank"
  const allLinks = body.match(/<a[^>]+>/gi) || []
  const badLinks = allLinks.filter(tag => {
    const href = (tag.match(/href=["']([^"']+)["']/) || [])[1] || ''
    const isRelative = !href.startsWith('http') && !href.startsWith('//') && href !== '#'
    return isRelative && /target=["']_blank["']/i.test(tag)
  })
  results.push({
    id: 'relative-links-target',
    label: 'Relative links do not open in new tab',
    status: badLinks.length === 0 ? 'pass' : 'fail',
    detail: badLinks.length === 0 ? 'Clear' : `${badLinks.length} relative link(s) with target="_blank"`
  })

  // File naming
  const filename = baseUrl.split('/').filter(Boolean).pop() || 'index.html'
  const hasUpperOrSpace = /[A-Z\s]/.test(filename)
  results.push({
    id: 'file-naming',
    label: 'Filename is lowercase with no spaces',
    status: !hasUpperOrSpace ? 'pass' : 'fail',
    detail: filename
  })

  return results
}

export function runComponentRules(headerHtml, footerHtml) {
  const results = []

  if (headerHtml) {
    const h1Count = (headerHtml.match(/<h1[\s>]/gi) || []).length
    results.push({
      id: 'header-h1',
      label: 'Header: one <h1> with site name',
      status: h1Count === 1 ? 'pass' : 'fail',
      detail: `Found ${h1Count} h1 in header component`
    })
    const hasNav = /<nav[\s>]/i.test(headerHtml)
    results.push({
      id: 'header-nav',
      label: 'Header: <nav> with site navigation',
      status: hasNav ? 'pass' : 'fail',
      detail: hasNav ? 'Found' : 'No <nav> in header component'
    })
  }

  if (footerHtml) {
    const hasDesignedBy = /site designed by/i.test(footerHtml)
    results.push({
      id: 'footer-designed-by',
      label: 'Footer: "Site Designed by [name]"',
      status: hasDesignedBy ? 'pass' : 'fail',
      detail: hasDesignedBy ? 'Found' : 'Missing "Site Designed by" text'
    })
    const hasItalic = /<(em|i)>[^<]+<\/(em|i)>/i.test(footerHtml)
    const hasQuote = /[""][^""]{3,}[""]|"[^"]{3,}"/.test(footerHtml)
    const taglineStatus = (hasItalic && hasQuote) ? 'warn' : (hasItalic || hasQuote) ? 'pass' : 'fail'
    results.push({
      id: 'footer-tagline',
      label: 'Footer: tagline in italics OR quotes (not both)',
      status: taglineStatus,
      detail: hasItalic && hasQuote ? 'Both italics and quotes found — use one only' :
              hasItalic ? 'Italic tagline found' :
              hasQuote ? 'Quoted tagline found' : 'No tagline found'
    })
    const hasCopyright = /©|&copy;|\bCopyright\b/i.test(footerHtml)
    results.push({
      id: 'footer-copyright',
      label: 'Footer: copyright symbol and year',
      status: hasCopyright ? 'pass' : 'fail',
      detail: hasCopyright ? 'Found' : 'No © found'
    })
  }

  return results
}

export function runCSSRules(css) {
  const results = []

  // Black/white
  const hasBlack = /#0{3,6}[^0-9a-f]/i.test(css) || /:\s*black\b/i.test(css) || /rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(css)
  const hasWhite = /#f{3,6}[^0-9a-f]/i.test(css) || /:\s*white\b/i.test(css) || /rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/i.test(css)
  results.push({
    id: 'no-black-white',
    label: 'No pure black or white colors',
    status: !hasBlack && !hasWhite ? 'pass' : 'warn',
    detail: [hasBlack && 'black detected', hasWhite && 'white detected'].filter(Boolean).join(', ') || 'Clear'
  })

  // Banned fonts
  const hasTNR = /Times New Roman/i.test(css)
  const hasCS = /Comic Sans/i.test(css)
  const hasPapyrus = /Papyrus/i.test(css)
  results.push({
    id: 'no-banned-fonts',
    label: 'No banned fonts (TNR, Comic Sans, Papyrus)',
    status: !hasTNR && !hasCS && !hasPapyrus ? 'pass' : 'fail',
    detail: [hasTNR && 'Times New Roman', hasCS && 'Comic Sans', hasPapyrus && 'Papyrus'].filter(Boolean).join(', ') || 'Clear'
  })

  // Justify
  const hasJustify = /text-align\s*:\s*justify/i.test(css)
  results.push({
    id: 'no-justify',
    label: 'No text-align: justify',
    status: !hasJustify ? 'pass' : 'fail',
    detail: hasJustify ? 'Found text-align: justify' : 'Clear'
  })

  // Link color override
  const hasLinkColor = /a\s*{[^}]*color/i.test(css) || /a:(link|visited|hover)[^{]*{[^}]*color/i.test(css)
  results.push({
    id: 'link-color-override',
    label: 'Default link colors overridden in CSS',
    status: hasLinkColor ? 'pass' : 'fail',
    detail: hasLinkColor ? 'Link color rule found' : 'No link color rule — default blue/purple may show'
  })

  return results
}
