#!/usr/bin/env node

/**
 * Context Score v1.0
 *
 * How well does your site explain itself?
 * Scores identity, structure, depth, connectivity, and discoverability.
 *
 * Usage: npx github:visualizevalue/context-score https://yoursite.com
 */

const url = process.argv[2]
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v')

if (!url) {
  console.log('')
  console.log('  Context Score')
  console.log('  How well does your site explain itself?')
  console.log('')
  console.log('  Usage: npx github:visualizevalue/context-score https://yoursite.com')
  console.log('  Flags: --verbose (-v) for page-by-page details')
  console.log('')
  process.exit(1)
}

const base = url.replace(/\/$/, '')

// ═══════════════════════════════════════
// Scoring engine
// ═══════════════════════════════════════

const categories = {
  identity:       { score: 0, max: 20, label: 'Identity' },
  structure:      { score: 0, max: 20, label: 'Structure' },
  depth:          { score: 0, max: 20, label: 'Depth' },
  connectivity:   { score: 0, max: 20, label: 'Connectivity' },
  discoverability:{ score: 0, max: 20, label: 'Discoverability' },
}
const opportunities = []

function add(cat, pts) {
  categories[cat].score = Math.min(categories[cat].score + pts, categories[cat].max)
}
function opp(msg) { opportunities.push(msg) }

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

async function fetchText(path) {
  try {
    const res = await fetch(base + path, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Context-Score/1.0' },
    })
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
}

async function fetchStatus(path) {
  try {
    const res = await fetch(base + path, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': 'Context-Score/1.0' },
    })
    return res.status
  } catch { return 0 }
}

function countWords(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.split(' ').filter(w => w.length > 1).length
}

function extractInternalLinks(html) {
  const links = new Set()
  const regex = /href=["']([^"'#]+?)["']/g
  let m
  while ((m = regex.exec(html)) !== null) {
    let path = m[1]
    // Handle absolute URLs to same domain
    if (path.startsWith(base)) path = path.slice(base.length) || '/'
    if (!path.startsWith('/')) continue
    path = path.replace(/\/$/, '')
    if (
      path && path !== '/' &&
      !path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|map|xml|json|txt)$/i) &&
      !path.startsWith('/api/') &&
      !path.startsWith('/admin') &&
      !path.startsWith('/vv-admin') &&
      !path.startsWith('/icon') &&
      !path.startsWith('/apple-icon')
    ) {
      links.add(path)
    }
  }
  return links
}

function getSection(path) {
  const parts = path.split('/').filter(Boolean)
  return parts.length > 0 ? '/' + parts[0] : '/'
}

function hasRelatedSection(html) {
  return /<h[2-6][^>]*>[^<]*(related|see also|more like this|similar|you may also|recommended|further reading|explore more|keep reading)[^<]*<\/h[2-6]>/i.test(html)
}

function bar(score, max = 20) {
  const filled = Math.round((score / max) * 20)
  return '\x1b[32m' + '█'.repeat(filled) + '\x1b[90m' + '░'.repeat(20 - filled) + '\x1b[0m'
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
const typeLabels = {
  ecommerce: 'e-commerce',
  content: 'content',
  saas: 'saas',
  portfolio: 'portfolio',
  general: 'general',
}

console.log(`  Type: ${typeLabels[type]}`)

// ═══════════════════════════════════════
// PHASE 3: Discover pages to crawl
// ═══════════════════════════════════════

console.log('  Discovering pages...')

const homeLinks = extractInternalLinks(homepage)
const knownPaths = [
  '/about', '/blog', '/faq', '/pricing', '/glossary', '/answers',
  '/concepts', '/docs', '/changelog', '/reviews', '/learn', '/courses',
  '/workflows', '/for',
]
for (const p of knownPaths) homeLinks.add(p)

const sitemapPaths = new Set()
if (sitemap) {
  const locRegex = /<loc>([^<]+)<\/loc>/g
  let m
  while ((m = locRegex.exec(sitemap)) !== null) {
    try {
      const u = new URL(m[1])
      if (u.origin === new URL(base).origin) {
        sitemapPaths.add(u.pathname.replace(/\/$/, '') || '/')
      }
    } catch {}
  }
}

const pagesToCrawl = ['/']
const seen = new Set(['/'])

for (const p of homeLinks) {
  if (!seen.has(p) && pagesToCrawl.length < 20) {
    pagesToCrawl.push(p)
    seen.add(p)
  }
}

const sitemapArr = [...sitemapPaths].filter(p => !seen.has(p))
const step = Math.max(1, Math.floor(sitemapArr.length / 10))
for (let i = 0; i < sitemapArr.length && pagesToCrawl.length < 20; i += step) {
  if (!seen.has(sitemapArr[i])) {
    pagesToCrawl.push(sitemapArr[i])
    seen.add(sitemapArr[i])
  }
}

// Pre-check key pages in parallel
const keyPagePaths = ['/about', '/blog', '/faq', '/glossary', '/answers', '/concepts', '/changelog']
const keyPageStatuses = await Promise.all(keyPagePaths.map(p => fetchStatus(p)))
const pageExists = Object.fromEntries(keyPagePaths.map((p, i) => [p, keyPageStatuses[i] === 200]))

console.log(`  Crawling ${pagesToCrawl.length} pages...`)

// ═══════════════════════════════════════
// PHASE 4: Deep crawl
// ═══════════════════════════════════════

const pageData = []
const schemaTypes = new Set()
let pagesWithSchema = 0
let pagesWithSpeakable = 0
let pagesWithBreadcrumbs = 0
let pagesWithFaq = 0
let pagesWithMeta = 0
let totalPages = 0
let totalWordCount = 0
let pagesWithRelated = 0
const inboundLinks = new Map()
const crossSectionLinks = new Set()

for (const p of pagesToCrawl) inboundLinks.set(p, 0)

for (let i = 0; i < pagesToCrawl.length; i += 5) {
  const batch = pagesToCrawl.slice(i, i + 5)
  const htmls = await Promise.all(batch.map(p => fetchText(p)))

  htmls.forEach((html, j) => {
    if (!html) return
    totalPages++
    const path = batch[j]
    const info = {
      path,
      schemas: [],
      hasSpeakable: false,
      hasBreadcrumbs: false,
      hasFaq: false,
      hasMeta: false,
      wordCount: 0,
      internalLinks: 0,
      hasRelated: false,
    }

    // Schema markup
    const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
    jsonLdBlocks.forEach(block => {
      const content = block.replace(/<\/?script[^>]*>/gi, '')
      try {
        const data = JSON.parse(content)
        const extractTypes = (obj) => {
          if (!obj) return
          if (obj['@type']) {
            const types = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']]
            types.forEach(t => { schemaTypes.add(t); info.schemas.push(t) })
          }
          if (obj['@graph']) obj['@graph'].forEach(extractTypes)
          if (obj.mainEntity) {
            const entities = Array.isArray(obj.mainEntity) ? obj.mainEntity : [obj.mainEntity]
            entities.forEach(extractTypes)
          }
        }
        extractTypes(data)
        if (/speakable/i.test(content)) { info.hasSpeakable = true; pagesWithSpeakable++ }
        if (/BreadcrumbList/i.test(content)) { info.hasBreadcrumbs = true; pagesWithBreadcrumbs++ }
        if (/FAQPage/i.test(content)) { info.hasFaq = true; pagesWithFaq++ }
      } catch {}
    })
    if (jsonLdBlocks.length > 0) pagesWithSchema++

    // Meta description
    if (/<meta[^>]*name=["']description["'][^>]*content=["'][^"']{50,}["']/i.test(html)) {
      info.hasMeta = true
      pagesWithMeta++
    }

    // Word count
    info.wordCount = countWords(html)
    totalWordCount += info.wordCount

    // Internal links
    const links = extractInternalLinks(html)
    info.internalLinks = links.size

    // Track inbound + cross-section
    const mySection = getSection(path)
    for (const link of links) {
      const norm = link.replace(/\/$/, '')
      if (inboundLinks.has(norm)) {
        inboundLinks.set(norm, inboundLinks.get(norm) + 1)
      }
      const targetSection = getSection(norm)
      if (mySection !== targetSection && mySection !== '/' && targetSection !== '/') {
        crossSectionLinks.add(`${mySection} → ${targetSection}`)
      }
    }

    // Related content sections
    info.hasRelated = hasRelatedSection(html)
    if (info.hasRelated) pagesWithRelated++

    pageData.push(info)
  })
}

// ═══════════════════════════════════════
// PHASE 5: Score
// ═══════════════════════════════════════

// ——— IDENTITY (20 points) ———

// llms.txt: +5
if (llmsTxt && llmsTxt.length > 100) add('identity', 5)
else opp('Create /llms.txt — give AI crawlers context about your site')

// Organization schema: +4
if (/Organization/i.test(homepage) && /application\/ld\+json/i.test(homepage)) add('identity', 4)
else opp('Add Organization schema to homepage')

// About page: +3
if (pageExists['/about']) add('identity', 3)
else opp('Create /about — declare who you are')

// Person/author schema: +3
if (/"Person"/i.test(homepage) || pageData.some(p => p.schemas.includes('Person'))) add('identity', 3)
else opp('Add Person schema — establish author/founder authority')

// Meta descriptions: +3
const metaPct = totalPages > 0 ? Math.round((pagesWithMeta / totalPages) * 100) : 0
if (metaPct >= 80) add('identity', 3)
else if (metaPct >= 50) { add('identity', 2); opp(`Meta descriptions on ${metaPct}% of pages — aim for 80%+`) }
else if (pagesWithMeta > 0) { add('identity', 1); opp(`Meta descriptions on only ${metaPct}% of pages`) }
else opp('No meta descriptions — write one for every page')

// Homepage h1: +2
const h1Match = homepage.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
if (h1Match) {
  const h1Text = h1Match[1].replace(/<[^>]+>/g, '').trim()
  if (h1Text.length > 0) add('identity', 2)
}

// ——— STRUCTURE (20 points) ———

// Sitemap: +6
if (sitemap) {
  const urlCount = sitemapPaths.size
  if (urlCount >= 100) add('structure', 6)
  else if (urlCount >= 20) add('structure', 4)
  else add('structure', 2)
} else opp('Create sitemap.xml — map your content')

// Breadcrumbs: +5
const breadcrumbPct = totalPages > 0 ? Math.round((pagesWithBreadcrumbs / totalPages) * 100) : 0
if (breadcrumbPct >= 50) add('structure', 5)
else if (pagesWithBreadcrumbs > 0) { add('structure', 2); opp(`Breadcrumbs on ${pagesWithBreadcrumbs}/${totalPages} pages — add to all content pages`) }
else opp('Add breadcrumb navigation')

// robots.txt: +4
if (robots) {
  if (/gptbot|claudebot|perplexitybot/i.test(robots)) add('structure', 4)
  else { add('structure', 2); opp('robots.txt doesn\'t address AI crawlers (GPTBot, ClaudeBot, PerplexityBot)') }
} else opp('Create robots.txt — control crawler access')

// llms-full.txt: +3
if (llmsFull && llmsFull.length > 500) add('structure', 3)

// Navigation breadth: +2
if (homeLinks.size >= 10) add('structure', 2)
else opp(`Homepage links to only ${homeLinks.size} pages — broaden navigation`)

// ——— DEPTH (20 points) ———

// Key content pages: up to 12
const depthPages = [
  { path: '/blog', label: 'blog', points: 2 },
  { path: '/faq', label: 'FAQ', points: 2 },
  { path: '/glossary', label: 'glossary', points: 2 },
  { path: '/answers', label: 'answers', points: 3 },
  { path: '/concepts', label: 'concepts', points: 3 },
]
const missing = []
for (const page of depthPages) {
  if (pageExists[page.path]) add('depth', page.points)
  else missing.push(page.label)
}
if (missing.length > 0 && missing.length <= 3) {
  opp(`Build ${missing.join(', ')} pages — add content depth`)
} else if (missing.length > 3) {
  opp(`Missing ${missing.length} content sections — build answers, concepts, glossary, FAQ, blog`)
}

// FAQ schema: +3
if (pagesWithFaq >= 3) add('depth', 3)
else if (pagesWithFaq > 0) { add('depth', 1); opp(`FAQ schema on ${pagesWithFaq} page(s) — add to all Q&A content`) }
else opp('Add FAQ schema to pages with questions and answers')

// Average word count: +3
const avgWords = totalPages > 0 ? Math.round(totalWordCount / totalPages) : 0
if (avgWords >= 500) add('depth', 3)
else if (avgWords >= 300) { add('depth', 2); opp(`${avgWords} avg words/page — aim for 500+`) }
else if (avgWords >= 100) { add('depth', 1); opp(`${avgWords} avg words/page — content is thin`) }
else opp(`Only ${avgWords} avg words/page — pages need more substance`)

// Changelog: +2
if (pageExists['/changelog']) add('depth', 2)

// ——— CONNECTIVITY (20 points) ———

const avgLinks = totalPages > 0 ? Math.round(pageData.reduce((s, p) => s + p.internalLinks, 0) / totalPages) : 0

// Internal link density: +6
if (avgLinks >= 10) add('connectivity', 6)
else if (avgLinks >= 5) { add('connectivity', 4); opp(`${avgLinks} avg internal links/page — aim for 10+`) }
else if (avgLinks >= 2) { add('connectivity', 2); opp(`Only ${avgLinks} internal links/page — pages are isolated`) }
else opp('Almost no internal linking — pages don\'t reference each other')

// Cross-section linking: +5
if (crossSectionLinks.size >= 5) add('connectivity', 5)
else if (crossSectionLinks.size >= 2) { add('connectivity', 2); opp('Limited cross-linking between sections — connect blog ↔ concepts ↔ glossary') }
else opp('Content sections don\'t link to each other')

// Orphan pages: +5
const orphanPages = [...inboundLinks.entries()]
  .filter(([path, count]) => path !== '/' && count === 0)
  .map(([path]) => path)
if (orphanPages.length === 0) add('connectivity', 5)
else if (orphanPages.length <= 2) { add('connectivity', 2); opp(`${orphanPages.length} orphan page(s) with no internal links pointing to them`) }
else opp(`${orphanPages.length} orphan pages with no internal links pointing to them`)

// Related content sections: +4
if (pagesWithRelated >= Math.ceil(totalPages * 0.5)) add('connectivity', 4)
else if (pagesWithRelated > 0) { add('connectivity', 2); opp(`${pagesWithRelated}/${totalPages} pages have related content sections — add to all`) }
else opp('No "Related" or "See also" sections — help readers find more')

// ——— DISCOVERABILITY (20 points) ———

// Schema diversity: +5
if (schemaTypes.size >= 8) add('discoverability', 5)
else if (schemaTypes.size >= 4) { add('discoverability', 3); opp(`${schemaTypes.size} schema types — diversify to 8+`) }
else if (schemaTypes.size > 0) { add('discoverability', 1); opp(`Only ${schemaTypes.size} schema type(s) — add more structured data`) }
else opp('No schema markup — machines can\'t parse your content')

// Speakable: +4
const speakablePct = totalPages > 0 ? Math.round((pagesWithSpeakable / totalPages) * 100) : 0
if (speakablePct >= 50) add('discoverability', 4)
else if (pagesWithSpeakable > 0) { add('discoverability', 2); opp(`Speakable on ${pagesWithSpeakable}/${totalPages} pages — AI doesn't know what to quote`) }
else opp('No speakable markup — AI can\'t identify quotable content')

// SearchAction: +3
if (/SearchAction/i.test(homepage)) add('discoverability', 3)

// sameAs social links: +3
if (/sameAs/i.test(homepage)) add('discoverability', 3)
else opp('No sameAs links — connect your identity across platforms')

// ai-plugin.json: +3
if (aiPlugin) {
  try { JSON.parse(aiPlugin); add('discoverability', 3) } catch {}
}

// Blocks training crawlers: +2
if (robots && /user-agent:\s*ccbot[\s\S]*?disallow:\s*\//im.test(robots)) add('discoverability', 2)

// ═══════════════════════════════════════
// PHASE 6: Output
// ═══════════════════════════════════════

const total = Object.values(categories).reduce((s, c) => s + c.score, 0)
const grade = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 50 ? 'C' : total >= 30 ? 'D' : 'F'

console.log('')
console.log('  ══════════════════════════════════════════════════════')
console.log(`  Context Score: ${total}/100  |  Grade: ${grade}  |  ${typeLabels[type]}`)
console.log('  ══════════════════════════════════════════════════════')
console.log('')

for (const cat of Object.values(categories)) {
  const label = cat.label.padEnd(16)
  const pts = String(cat.score).padStart(2) + '/' + cat.max
  console.log(`  ${label} ${pts}  ${bar(cat.score, cat.max)}`)
}

console.log('')
console.log(`  ${totalPages} pages crawled  |  ${sitemapPaths.size} in sitemap  |  ${avgLinks} avg links/page  |  ${avgWords} avg words`)

if (verbose && schemaTypes.size > 0) {
  console.log('')
  console.log('  Schema: ' + [...schemaTypes].join(', '))
}

if (opportunities.length > 0) {
  console.log('')
  console.log('  Top opportunities:')
  opportunities.slice(0, 6).forEach(o => console.log(`    \x1b[33m→\x1b[0m ${o}`))
}

if (verbose) {
  console.log('')
  console.log('  Page details:')
  pageData.forEach(p => {
    const flags = [
      p.schemas.length ? p.schemas.join(', ') : 'no schema',
      p.hasSpeakable ? 'speakable' : '',
      p.hasBreadcrumbs ? 'breadcrumbs' : '',
      p.hasFaq ? 'FAQ' : '',
      p.hasMeta ? 'meta' : '',
      p.wordCount + ' words',
      p.internalLinks + ' links',
      p.hasRelated ? 'related' : '',
    ].filter(Boolean).join(' | ')
    console.log(`    ${p.path}  →  ${flags}`)
  })

  if (orphanPages.length > 0) {
    console.log('')
    console.log('  Orphan pages (no inbound links from crawled pages):')
    orphanPages.forEach(p => console.log('    ' + p))
  }

  if (crossSectionLinks.size > 0) {
    console.log('')
    console.log('  Cross-section connections:')
    for (const link of crossSectionLinks) console.log('    ' + link)
  }
}

console.log('')
console.log('  Playbook: https://github.com/visualizevalue/context-score')
console.log('')
