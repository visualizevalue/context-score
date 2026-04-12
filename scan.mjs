#!/usr/bin/env node

/**
 * LLM Optimization Scanner
 * 
 * Scans a website and scores its readiness for AI search engines.
 * Usage: npx llm-optimization https://yoursite.com
 */

const url = process.argv[2]

if (!url) {
  console.log('')
  console.log('  LLM Optimization Scanner')
  console.log('  Usage: npx llm-optimization https://yoursite.com')
  console.log('')
  process.exit(1)
}

const base = url.replace(/\/$/, '')
const results = { pass: [], fail: [], warn: [] }
let score = 0
const maxScore = 100

function pass(label, points = 5) { results.pass.push(label); score += points }
function fail(label) { results.fail.push(label) }
function warn(label) { results.warn.push(label) }

async function fetchText(path) {
  try {
    const res = await fetch(base + path, { redirect: 'follow', headers: { 'User-Agent': 'LLM-Optimization-Scanner/1.0' } })
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
}

async function fetchHead(path) {
  try {
    const res = await fetch(base + path, { method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': 'LLM-Optimization-Scanner/1.0' } })
    return { status: res.status, headers: Object.fromEntries(res.headers.entries()) }
  } catch { return null }
}

console.log('')
console.log(`  Scanning ${base}...`)
console.log('')

// 1. llms.txt
const llmsTxt = await fetchText('/llms.txt')
if (llmsTxt && llmsTxt.length > 100) {
  pass('llms.txt exists (' + llmsTxt.length + ' chars)', 10)
} else {
  fail('No llms.txt found — AI crawlers have no context about your site')
}

// 2. llms-full.txt
const llmsFull = await fetchText('/llms-full.txt')
if (llmsFull && llmsFull.length > 500) {
  pass('llms-full.txt exists (' + llmsFull.length + ' chars)', 5)
} else {
  warn('No llms-full.txt — consider a detailed version with content excerpts')
}

// 3. robots.txt
const robots = await fetchText('/robots.txt')
if (robots) {
  const hasGptbot = /gptbot/i.test(robots)
  const hasClaudebot = /claudebot/i.test(robots)
  const hasPerplexity = /perplexitybot/i.test(robots)
  const blocksCCBot = /user-agent:\s*ccbot[\s\S]*?disallow:\s*\//im.test(robots)
  
  if (hasGptbot || hasClaudebot || hasPerplexity) {
    pass('robots.txt mentions AI crawlers', 5)
  } else {
    warn('robots.txt exists but doesn\'t specifically address AI crawlers')
  }
  
  if (blocksCCBot) {
    pass('Blocks training crawlers (CCBot)', 5)
  } else {
    warn('Consider blocking training crawlers (CCBot, Bytespider) while allowing citation crawlers')
  }
} else {
  fail('No robots.txt found')
}

// 4. Sitemap
const sitemap = await fetchText('/sitemap.xml')
if (sitemap) {
  const urlCount = (sitemap.match(/<loc>/g) || []).length
  if (urlCount > 50) {
    pass('Sitemap has ' + urlCount + ' URLs', 5)
  } else if (urlCount > 0) {
    pass('Sitemap exists (' + urlCount + ' URLs)', 3)
    warn('Sitemap has few URLs — ensure all important pages are included')
  }
} else {
  fail('No sitemap.xml found')
}

// 5. Homepage schema
const homepage = await fetchText('/')
if (homepage) {
  const hasOrg = /Organization/i.test(homepage) && /application\/ld\+json/i.test(homepage)
  const hasWebsite = /WebSite/i.test(homepage)
  const hasSearchAction = /SearchAction/i.test(homepage)
  const hasFaq = /FAQPage/i.test(homepage)
  const hasSpeakable = /[Ss]peakable/i.test(homepage)
  
  if (hasOrg) pass('Organization schema on homepage', 5)
  else fail('No Organization schema on homepage')
  
  if (hasWebsite) pass('WebSite schema on homepage', 3)
  else warn('No WebSite schema on homepage')
  
  if (hasSearchAction) pass('SearchAction for sitelinks search', 5)
  else warn('No SearchAction — add for sitelinks search box')
  
  if (hasFaq) pass('FAQ schema found', 5)
  else warn('No FAQ schema — add FAQPage to pages with Q&A content')
  
  if (hasSpeakable) pass('Speakable specification found', 5)
  else warn('No speakable — tells AI which content to read aloud or cite')
  
  // Check meta description
  const metaDesc = homepage.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
  if (metaDesc && metaDesc[1].length > 100) {
    pass('Meta description is detailed (' + metaDesc[1].length + ' chars)', 3)
  } else if (metaDesc) {
    warn('Meta description is short (' + (metaDesc[1]?.length || 0) + ' chars) — expand to 150+ for better AI context')
  } else {
    fail('No meta description on homepage')
  }
  
  // Check for breadcrumbs
  if (/BreadcrumbList/i.test(homepage)) {
    pass('BreadcrumbList schema found', 3)
  }
  
  // Check for Person schema
  if (/Person/i.test(homepage) && /"name"/i.test(homepage)) {
    pass('Person schema (founder/author) detected', 5)
  } else {
    warn('No Person schema — add author/founder entity for authority signals')
  }

  // Check for sameAs (social links in schema)
  if (/sameAs/i.test(homepage)) {
    pass('sameAs social profile links in schema', 3)
  } else {
    warn('No sameAs in schema — link social profiles for entity recognition')
  }
} else {
  fail('Could not fetch homepage')
}

// 6. ai-plugin.json
const aiPlugin = await fetchText('/.well-known/ai-plugin.json')
if (aiPlugin) {
  try {
    JSON.parse(aiPlugin)
    pass('ai-plugin.json exists and is valid JSON', 5)
  } catch {
    warn('ai-plugin.json exists but is not valid JSON')
  }
} else {
  warn('No /.well-known/ai-plugin.json — emerging standard for AI tool discovery')
}

// 7. Check for common high-value pages
const checkPages = [
  { path: '/about', label: 'About page' },
  { path: '/faq', label: 'FAQ page' },
  { path: '/glossary', label: 'Glossary' },
  { path: '/blog', label: 'Blog' },
]

for (const page of checkPages) {
  const head = await fetchHead(page.path)
  if (head && head.status === 200) {
    pass(page.label + ' exists', 2)
  }
}

// Output
console.log(`  Score: ${score}/${maxScore}`)
console.log('')

if (results.pass.length) {
  console.log('  ✓ PASS')
  results.pass.forEach(r => console.log('    ' + r))
  console.log('')
}

if (results.warn.length) {
  console.log('  ⚠ IMPROVE')
  results.warn.forEach(r => console.log('    ' + r))
  console.log('')
}

if (results.fail.length) {
  console.log('  ✗ MISSING')
  results.fail.forEach(r => console.log('    ' + r))
  console.log('')
}

// Grade
const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F'
console.log(`  Grade: ${grade}`)
console.log('')

if (score < 80) {
  console.log('  Next steps:')
  if (!llmsTxt) console.log('    1. Create /llms.txt — tell AI crawlers what your site is about')
  if (!robots) console.log('    2. Create /robots.txt — control which crawlers access your site')
  if (results.fail.some(f => f.includes('Organization'))) console.log('    3. Add Organization JSON-LD to your homepage')
  if (results.fail.some(f => f.includes('FAQ'))) console.log('    4. Add FAQPage schema to pages with Q&A content')
  console.log('    Full playbook: https://github.com/visualizevalue/llm-optimization')
  console.log('')
}
