#!/usr/bin/env node

/**
 * LLM Optimization Scanner v3
 * 
 * Deep-crawls a website and scores its readiness for AI search engines.
 * Usage: npx github:visualizevalue/llm-optimization https://yoursite.com
 */

const url = process.argv[2]
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v')

if (!url) {
  console.log('')
  console.log('  LLM Optimization Scanner')
  console.log('  Usage: npx github:visualizevalue/llm-optimization https://yoursite.com')
  console.log('  Flags: --verbose (-v) for detailed page-by-page results')
  console.log('')
  process.exit(1)
}

const base = url.replace(/\/$/, '')
const results = { pass: [], fail: [], warn: [] }
let score = 0

function pass(label, points = 5) { results.pass.push(label); score += points }
function fail(label) { results.fail.push(label) }
function warn(label) { results.warn.push(label) }

async function fetchText(path) {
  try {
    const res = await fetch(base + path, { redirect: 'follow', headers: { 'User-Agent': 'LLM-Optimization-Scanner/3.0' } })
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
}

async function fetchStatus(path) {
  try {
    const res = await fetch(base + path, { method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': 'LLM-Optimization-Scanner/3.0' } })
    return res.status
  } catch { return 0 }
}

console.log('')
console.log(`  Scanning ${base}...`)

// ═══════════════════════════════════════
// PHASE 1: Fetch core files
// ═══════════════════════════════════════

const [homepage, llmsTxt, llmsFull, robots, sitemap, aiPlugin] = await Promise.all([
  fetchText('/'),
  fetchText('/llms.txt'),
  fetchText('/llms-full.txt'),
  fetchText('/robots.txt'),
  fetchText('/sitemap.xml'),
  fetchText('/.well-known/ai-plugin.json'),
])

if (!homepage) {
  console.log('  Could not fetch homepage. Check the URL and try again.')
  process.exit(1)
}

// ═══════════════════════════════════════
// PHASE 2: Detect site type
// ═══════════════════════════════════════

const hpLower = homepage.toLowerCase()
const signals = { ecommerce: 0, content: 0, saas: 0, portfolio: 0 }

if (/add.to.cart|buy.now|shop.now|cart|checkout/i.test(hpLower)) signals.ecommerce += 4
if (/shopify|woocommerce|bigcommerce/i.test(hpLower)) signals.ecommerce += 3
if (/article|blog|lesson|course|learn|tutorial/i.test(hpLower)) signals.content += 3
if (/subscribe|newsletter/i.test(hpLower)) signals.content += 1
if (/module|curriculum|student/i.test(hpLower)) signals.content += 3
if (/sign.up|free.trial|get.started|dashboard|api|developer/i.test(hpLower)) signals.saas += 4
if (/integration|feature|plan/i.test(hpLower)) signals.saas += 1
if (/portfolio|case.study|client/i.test(hpLower)) signals.portfolio += 3

const siteType = Object.entries(signals).sort((a, b) => b[1] - a[1])[0]
const type = siteType[1] >= 3 ? siteType[0] : 'general'
const typeLabels = { ecommerce: 'E-commerce', content: 'Content / Education', saas: 'SaaS / Tool', portfolio: 'Portfolio / Agency', general: 'General' }

console.log(`  Site type: ${typeLabels[type]}`)

// ═══════════════════════════════════════
// PHASE 3: Discover pages to crawl
// ═══════════════════════════════════════

console.log('  Discovering pages...')

// Extract internal links from homepage
const linkRegex = /href=["'](\/[^"'#]*?)["']/g
const homeLinks = new Set()
let match
while ((match = linkRegex.exec(homepage)) !== null) {
  const path = match[1].replace(/\/$/, '')
  if (path && path !== '/' && !path.includes('.') && !path.startsWith('/api') && !path.startsWith('/admin') && !path.startsWith('/vv-admin') && !path.startsWith('/icon') && !path.startsWith('/apple-icon')) {
    homeLinks.add(path)
  }
}

// Also try known high-value paths
const knownPaths = ['/about', '/blog', '/faq', '/pricing', '/glossary', '/answers', '/concepts', '/docs', '/changelog', '/reviews', '/learn', '/courses']
for (const p of knownPaths) homeLinks.add(p)

// Get sitemap URLs too
const sitemapPaths = new Set()
if (sitemap) {
  const locRegex = /<loc>([^<]+)<\/loc>/g
  let m
  while ((m = locRegex.exec(sitemap)) !== null) {
    try {
      const u = new URL(m[1])
      if (u.origin === new URL(base).origin) sitemapPaths.add(u.pathname.replace(/\/$/, '') || '/')
    } catch {}
  }
}

// Pick up to 20 pages to deep-crawl (prioritize variety)
const pagesToCrawl = ['/']
const seen = new Set(['/'])

// Add known paths first
for (const p of homeLinks) {
  if (!seen.has(p) && pagesToCrawl.length < 20) { pagesToCrawl.push(p); seen.add(p) }
}

// Fill with sitemap URLs (sample from different sections)
const sitemapArr = [...sitemapPaths].filter(p => !seen.has(p))
const step = Math.max(1, Math.floor(sitemapArr.length / 10))
for (let i = 0; i < sitemapArr.length && pagesToCrawl.length < 20; i += step) {
  if (!seen.has(sitemapArr[i])) { pagesToCrawl.push(sitemapArr[i]); seen.add(sitemapArr[i]) }
}

console.log(`  Crawling ${pagesToCrawl.length} pages...`)
console.log('')

// ═══════════════════════════════════════
// PHASE 4: Deep crawl
// ═══════════════════════════════════════

const pageResults = []
const schemaTypes = new Set()
let pagesWithSchema = 0
let pagesWithSpeakable = 0
let pagesWithBreadcrumbs = 0
let pagesWithFaq = 0
let pagesWithMeta = 0
let totalPages = 0

// Crawl in batches of 5
for (let i = 0; i < pagesToCrawl.length; i += 5) {
  const batch = pagesToCrawl.slice(i, i + 5)
  const htmls = await Promise.all(batch.map(p => fetchText(p)))
  
  htmls.forEach((html, j) => {
    if (!html) return
    totalPages++
    const path = batch[j]
    const pageInfo = { path, schemas: [], hasSpeakable: false, hasBreadcrumbs: false, hasFaq: false, hasMeta: false }
    
    // Extract schema types
    const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
    jsonLdBlocks.forEach(block => {
      const content = block.replace(/<\/?script[^>]*>/gi, '')
      try {
        const data = JSON.parse(content)
        const extractTypes = (obj) => {
          if (!obj) return
          if (obj['@type']) {
            const types = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']]
            types.forEach(t => { schemaTypes.add(t); pageInfo.schemas.push(t) })
          }
          if (obj['@graph']) obj['@graph'].forEach(extractTypes)
          if (obj.mainEntity) {
            const entities = Array.isArray(obj.mainEntity) ? obj.mainEntity : [obj.mainEntity]
            entities.forEach(extractTypes)
          }
        }
        extractTypes(data)
        
        if (/speakable/i.test(content)) { pageInfo.hasSpeakable = true; pagesWithSpeakable++ }
        if (/BreadcrumbList/i.test(content)) { pageInfo.hasBreadcrumbs = true; pagesWithBreadcrumbs++ }
        if (/FAQPage/i.test(content)) { pageInfo.hasFaq = true; pagesWithFaq++ }
      } catch {}
    })
    
    if (jsonLdBlocks.length > 0) pagesWithSchema++
    
    // Check meta description
    if (/<meta[^>]*name=["']description["'][^>]*content=["'][^"']{50,}["']/i.test(html)) {
      pageInfo.hasMeta = true
      pagesWithMeta++
    }
    
    pageResults.push(pageInfo)
  })
}

// ═══════════════════════════════════════
// PHASE 5: Score
// ═══════════════════════════════════════

// Core files (30 points)
if (llmsTxt && llmsTxt.length > 100) pass('llms.txt (' + llmsTxt.length + ' chars)', 8)
else fail('No llms.txt — AI crawlers have no context about your site')

if (llmsFull && llmsFull.length > 500) pass('llms-full.txt (' + llmsFull.length + ' chars)', 4)
else warn('No llms-full.txt')

if (robots) {
  if (/gptbot|claudebot|perplexitybot/i.test(robots)) pass('robots.txt addresses AI crawlers', 4)
  else warn('robots.txt doesn\'t mention AI crawlers')
  if (/user-agent:\s*ccbot[\s\S]*?disallow:\s*\//im.test(robots)) pass('Blocks training crawlers', 4)
  else warn('Not blocking training crawlers (CCBot, Bytespider)')
} else fail('No robots.txt')

if (sitemap) {
  const urlCount = sitemapPaths.size
  pass('Sitemap: ' + urlCount + ' URLs', urlCount > 100 ? 6 : urlCount > 20 ? 4 : 2)
} else fail('No sitemap.xml')

if (aiPlugin) {
  try { JSON.parse(aiPlugin); pass('ai-plugin.json', 4) } catch { warn('ai-plugin.json is invalid JSON') }
} else warn('No ai-plugin.json')

// Schema coverage (30 points)
const schemaCoverage = totalPages > 0 ? Math.round((pagesWithSchema / totalPages) * 100) : 0
if (schemaCoverage >= 80) pass('Schema on ' + schemaCoverage + '% of pages (' + pagesWithSchema + '/' + totalPages + ')', 10)
else if (schemaCoverage >= 50) { pass('Schema on ' + schemaCoverage + '% of pages', 6); warn('Schema coverage could be higher (' + pagesWithSchema + '/' + totalPages + ')') }
else if (schemaCoverage > 0) { pass('Some schema (' + schemaCoverage + '%)', 3); warn('Most pages lack schema markup') }
else fail('No schema markup found on any page')

if (schemaTypes.size >= 8) pass(schemaTypes.size + ' schema types used', 5)
else if (schemaTypes.size >= 4) pass(schemaTypes.size + ' schema types', 3)
else if (schemaTypes.size > 0) warn('Only ' + schemaTypes.size + ' schema type(s) — diversify')
else fail('No schema types detected')

const speakablePct = totalPages > 0 ? Math.round((pagesWithSpeakable / totalPages) * 100) : 0
if (speakablePct >= 50) pass('Speakable on ' + speakablePct + '% of pages', 5)
else if (pagesWithSpeakable > 0) { pass('Speakable on ' + pagesWithSpeakable + ' pages', 2); warn('Add speakable to more pages (' + speakablePct + '% coverage)') }
else fail('No speakable — AI doesn\'t know which content to cite')

const breadcrumbPct = totalPages > 0 ? Math.round((pagesWithBreadcrumbs / totalPages) * 100) : 0
if (breadcrumbPct >= 50) pass('Breadcrumbs on ' + breadcrumbPct + '% of pages', 5)
else if (pagesWithBreadcrumbs > 0) pass('Breadcrumbs on ' + pagesWithBreadcrumbs + ' pages', 2)
else warn('No breadcrumbs')

if (pagesWithFaq >= 3) pass('FAQ schema on ' + pagesWithFaq + ' pages', 5)
else if (pagesWithFaq > 0) pass('FAQ schema on ' + pagesWithFaq + ' page(s)', 2)
else warn('No FAQ schema')

// Meta descriptions (10 points)
const metaPct = totalPages > 0 ? Math.round((pagesWithMeta / totalPages) * 100) : 0
if (metaPct >= 80) pass('Meta descriptions on ' + metaPct + '% of pages', 5)
else if (metaPct >= 50) { pass('Meta descriptions on ' + metaPct + '%', 3); warn('Some pages missing meta descriptions') }
else if (pagesWithMeta > 0) warn('Only ' + metaPct + '% of pages have detailed meta descriptions')
else fail('No meta descriptions found')

// Homepage signals (15 points)
if (/Organization/i.test(homepage) && /application\/ld\+json/i.test(homepage)) pass('Organization schema', 3)
else fail('No Organization schema on homepage')

if (/SearchAction/i.test(homepage)) pass('SearchAction', 3)
else warn('No SearchAction for sitelinks')

if (/sameAs/i.test(homepage)) pass('sameAs social links', 2)
else warn('No sameAs in schema')

if (/"Person"/i.test(homepage)) pass('Person/author entity', 3)
else warn('No Person schema — add founder/author for authority')

// Content structure (15 points)
const keyPages = [
  { path: '/about', label: 'About', points: 2 },
  { path: '/blog', label: 'Blog', points: 2 },
  { path: '/glossary', label: 'Glossary', points: 2 },
  { path: '/answers', label: 'Answers', points: 3 },
  { path: '/concepts', label: 'Concepts', points: 3 },
  { path: '/faq', label: 'FAQ', points: 2 },
  { path: '/changelog', label: 'Changelog', points: 1 },
]

for (const page of keyPages) {
  const status = await fetchStatus(page.path)
  if (status === 200) pass(page.label + ' page', page.points)
}

// ═══════════════════════════════════════
// PHASE 6: Output
// ═══════════════════════════════════════

const maxScore = 100
const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F'

console.log('  ══════════════════════════════════════')
console.log(`  Score: ${Math.min(score, maxScore)}/${maxScore}  |  Grade: ${grade}  |  ${typeLabels[type]}`)
console.log('  ══════════════════════════════════════')
console.log('')
console.log(`  Crawled ${totalPages} pages  |  ${sitemapPaths.size} in sitemap  |  ${homeLinks.size} links on homepage`)
console.log('')

// Schema summary
if (schemaTypes.size > 0) {
  console.log('  Schema types: ' + [...schemaTypes].join(', '))
  console.log('')
}

if (results.pass.length) {
  console.log('  \x1b[32m✓ PASS (' + results.pass.length + ')\x1b[0m')
  results.pass.forEach(r => console.log('    ' + r))
  console.log('')
}

if (results.warn.length) {
  console.log('  \x1b[33m⚠ IMPROVE (' + results.warn.length + ')\x1b[0m')
  results.warn.forEach(r => console.log('    ' + r))
  console.log('')
}

if (results.fail.length) {
  console.log('  \x1b[31m✗ MISSING (' + results.fail.length + ')\x1b[0m')
  results.fail.forEach(r => console.log('    ' + r))
  console.log('')
}

// Verbose: page-by-page
if (verbose) {
  console.log('  Page details:')
  pageResults.forEach(p => {
    const flags = [
      p.schemas.length ? p.schemas.join(', ') : 'no schema',
      p.hasSpeakable ? 'speakable' : '',
      p.hasBreadcrumbs ? 'breadcrumbs' : '',
      p.hasFaq ? 'FAQ' : '',
      p.hasMeta ? 'meta' : '',
    ].filter(Boolean).join(' | ')
    console.log('    ' + p.path + '  →  ' + flags)
  })
  console.log('')
}

// Recommendations
console.log('  Next steps:')
if (!llmsTxt) console.log('    1. Create /llms.txt — tell AI crawlers what your site is about')
if (schemaCoverage < 80) console.log('    ' + (!llmsTxt ? '2' : '1') + '. Add schema to more pages (' + schemaCoverage + '% → 80%+)')
if (pagesWithSpeakable === 0) console.log('    → Add speakable to articles and key pages')
if (pagesWithFaq < 3) console.log('    → Add FAQPage schema to pages with Q&A content')
if (metaPct < 80) console.log('    → Write detailed meta descriptions for all pages')
console.log('')
console.log('  Playbook: https://github.com/visualizevalue/llm-optimization')
console.log('')
