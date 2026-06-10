const WORKER_URL = 'https://web123-evaluator.web123work.workers.dev'

const form = document.getElementById('eval-form')
const resultsSection = document.getElementById('results')

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const url = document.getElementById('student-url').value.trim()
  const instructions = document.getElementById('instructions').value.trim()
  const btn = form.querySelector('button')

  btn.textContent = 'Evaluating...'
  btn.disabled = true
  resultsSection.hidden = false
  document.getElementById('summary').innerHTML = '<p>Fetching and analyzing all pages...</p>'
  document.getElementById('rule-results').innerHTML = ''
  document.getElementById('ai-results').innerHTML = ''
  resultsSection.scrollIntoView({ behavior: 'smooth' })

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, instructions })
    })
    const data = await res.json()
    if (data.error) { showError(data.error); return }
    renderResults(data)
  } catch (err) {
    showError('Could not reach the evaluator service.')
  } finally {
    btn.textContent = 'Evaluate'
    btn.disabled = false
  }
})

function renderResults(data) {
  const { pages = [], shared = {}, ai = [] } = data

  // Overall summary counts across all pages + shared
  const allRules = [...pages.flatMap(p => p.rules), ...(shared.css || []), ...(shared.components || [])]
  const passes = allRules.filter(r => r.status === 'pass').length
  const warns = allRules.filter(r => r.status === 'warn').length
  const fails = allRules.filter(r => r.status === 'fail').length

  document.getElementById('summary').innerHTML = `
    <p>Evaluated: <strong>${data.baseUrl}</strong></p>
    <p class="score">
      <span class="pass">${passes} pass</span> &nbsp;&middot;&nbsp;
      <span class="warn">${warns} warn</span> &nbsp;&middot;&nbsp;
      <span class="fail">${fails} fail</span>
    </p>
    ${shared.componentNote ? `<p class="note">${shared.componentNote}</p>` : ''}
  `

  let html = ''

  // Per-page rule results
  for (const page of pages) {
    const found = page.found
    const pagePass = page.rules.filter(r => r.status === 'pass').length
    const pageFail = page.rules.filter(r => r.status === 'fail').length
    const pageWarn = page.rules.filter(r => r.status === 'warn').length

    html += `<h4>${page.name}
      ${found
        ? `<span class="score-inline"><span class="pass">${pagePass}p</span> <span class="warn">${pageWarn}w</span> <span class="fail">${pageFail}f</span></span>`
        : '<span class="fail"> — page not found</span>'}
    </h4>`

    if (found && page.rules.length) {
      html += `<ul class="checks">${page.rules.map(r => checkItem(r)).join('')}</ul>`
    }
  }

  // Shared: components
  if (shared.components && shared.components.length) {
    html += `<h4>Components (header/footer)</h4><ul class="checks">${shared.components.map(r => checkItem(r)).join('')}</ul>`
  }

  // Shared: CSS
  if (shared.css && shared.css.length) {
    html += `<h4>CSS (styles/default.css)</h4><ul class="checks">${shared.css.map(r => checkItem(r)).join('')}</ul>`
  }

  document.getElementById('rule-results').innerHTML = html

  // AI results
  if (ai && ai.length) {
    document.getElementById('ai-results').innerHTML = `
      <h4>Design &amp; Assignment Evaluation</h4>
      <ul class="checks">${ai.map(r => checkItem({ status: r.status, label: r.check, detail: r.note })).join('')}</ul>
    `
  }
}

function checkItem({ status, label, detail }) {
  const icons = { pass: '✅', fail: '❌', warn: '⚠️', 'needs-review': '🔍' }
  return `
    <li class="${status}">
      <span class="check-icon">${icons[status] || '🔍'}</span>
      <span class="check-body">
        <span class="check-label">${label}</span>
        ${detail ? `<span class="check-detail">${detail}</span>` : ''}
      </span>
    </li>`
}

function showError(msg) {
  document.getElementById('summary').innerHTML = `<p class="error-msg">Error: ${msg}</p>`
}
