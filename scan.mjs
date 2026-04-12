#!/usr/bin/env node

/**
 * LLM Optimization Scanner
 * 
 * Scans a website and scores its readiness for AI search engines.
 * Detects site type and tailors recommendations.
 * Usage: npx github:visualizevalue/llm-optimization https://yoursite.com
 */

const url = process.argv[2]

if (!url) {
  console.log('')
  console.log('  LLM Optimization Scanner')
  console.log('  Usage: npx github:visualizevalue/llm-optimization https://yoursite.com')
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
    return { status: res.status }
  } catch { return null }
}

console.log('')
console.log(`  Scanning ${base}...`)
console.log('')

// Fetch homepage first for detection
const homepage = await fetchText('/')
if (!homepage) {
  console.log('  Could not fetch homepage. Check the URL and try again.')
  process.exit(1)
}

// Detect site type
let siteType = 'general'
const hpLower = homepage.toLowerCase()

const signals = {
  ecommerce: 0,
  content: 0,
  saas: 0,
  portfolio: 0,
}

// E-commerce signals
if (/add.to.cart|buy.now|shop.now|price|cart|checkout|\$\d/i.test(hpLower)) signals.ecommerce += 3
if (/product/i.test(hpLower)) signals.ecommerce += 1
if (/shopify|woocommerce|bigcommerce/i.test(hpLower)) signals.ecommerce += 2

// Content signals
if (/article|blog|lesson|course|learn|tutorial|guide/i.test(hpLower)) signals.content += 3
if (/subscribe|newsletter|email/i.test(hpLower)) signals.content += 1
if (/chapter|module|curriculum/i.test(hpLower)) signals.content += 2

// SaaS signals
if (/sign.up|free.trial|get.started|dashboard|api|developer|integrate/i.test(hpLower)) signals.saas += 4
if (/integration|feature|plan/i.test(hpLower)) signals.saas += 1

// Portfolio signals
if (/portfolio|work|projects|case.study|client/i.test(hpLower)) signals.portfolio += 2

const topType = Object.entries(signals).sort((a, b) => b[1] - a[1])[0]
if (topType[1] >= 3) siteType = topType[0]

const typeLabels = {
  ecommerce: 'E-commerce',
  content: 'Content / Education',
  saas: 'SaaS / Tool',
  portfolio: 'Portfolio / Agency',
  general: 'General',
}

console.log(`  Site type: ${typeLabels[siteType]}`)
console.log('')

// === UNIVERSAL CHECKS ===

// 1. llms.txt
const llmsTxt = await fetchText('/llms.txt')
if (llmsTxt && llmsTxt.length > 100) {
  pass('llms.txt exists (' + llmsTxt.length + ' chars)', 10)
} else {
  fail('No llms.txt — AI crawlers have no context about your site')
}

// 2. llms-full.txt
const llmsFull = await fetchText('/llms-full.txt')
if (llmsFull && llmsFull.length > 500) {
  pass('llms-full.txt exists (' + llmsFull.length + ' chars)', 5)
} else {
  warn('No llms-full.txt — add a detailed version with content excerpts')
}

// 3. robots.txt
const robots = await fetchText('/robots.txt')
if (robots) {
  const hasAICrawlers = /gptbot|claudebot|perplexitybot/i.test(robots)
  const blocksTraining = /user-agent:\s*ccbot[\s\S]*?disallow:\s*\//im.test(robots)
  
  if (hasAICrawlers) pass('robots.txt addresses AI crawlers', 5)
  else warn('robots.txt doesn\'t mention AI crawlers (GPTBot, ClaudeBot, PerplexityBot)')
  
  if (blocksTraining) pass('Blocks training crawlers', 5)
  else warn('Consider blocking training crawlers (CCBot, Bytespider)')
} else {
  fail('No robots.txt')
}

// 4. Sitemap
const sitemap = await fetchText('/sitemap.xml')
if (sitemap) {
  const urlCount = (sitemap.match(/<loc>/g) || []).length
  if (urlCount > 50) pass('Sitemap: ' + urlCount + ' URLs', 5)
  else if (urlCount > 0) { pass('Sitemap: ' + urlCount + ' URLs', 3); warn('Sitemap has few URLs — ensure all pages are included') }
} else {
  fail('No sitemap.xml')
}

// 5. Homepage schema
const hasOrg = /Organization/i.test(homepage) && /application\/ld\+json/i.test(homepage)
const hasWebsite = /WebSite/i.test(homepage)
const hasSearchAction = /SearchAction/i.test(homepage)
const hasFaq = /FAQPage/i.test(homepage)
const hasSpeakable = /[Ss]peakable/i.test(homepage)
const hasPerson = /"Person"/i.test(homepage)
const hasSameAs = /sameAs/i.test(homepage)

if (hasOrg) pass('Organization schema', 5)
else fail('No Organization schema on homepage')

if (hasWebsite) pass('WebSite schema', 3)
else warn('No WebSite schema')

if (hasSearchAction) pass('SearchAction for sitelinks', 5)
else warn('No SearchAction — add for search box in results')

if (hasFaq) pass('FAQPage schema', 5)
else fail('No FAQ schema on homepage')

if (hasSpeakable) pass('Speakable specification', 5)
else fail('No speakable — AI doesn\'t know which content to cite')

if (hasSameAs) pass('sameAs social links', 3)
else warn('No sameAs — link social profiles for entity recognition')

// Meta description
const metaDesc = homepage.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
if (metaDesc && metaDesc[1].length > 120) pass('Meta description: ' + metaDesc[1].length + ' chars', 3)
else if (metaDesc) warn('Meta description is short (' + (metaDesc[1]?.length || 0) + ' chars) — aim for 150+')
else fail('No meta description')

// 6. ai-plugin.json
const aiPlugin = await fetchText('/.well-known/ai-plugin.json')
if (aiPlugin) {
  try { JSON.parse(aiPlugin); pass('ai-plugin.json', 5) } catch { warn('ai-plugin.json is invalid JSON') }
} else {
  warn('No ai-plugin.json')
}

// === TYPE-SPECIFIC CHECKS ===

if (siteType === 'content') {
  // Content-specific checks
  const aboutHead = await fetchHead('/about')
  if (aboutHead && aboutHead.status === 200) pass('About page', 2)
  else warn('No /about page — important for author authority')
  
  if (hasPerson) pass('Person/author schema', 5)
  else fail('No Person schema — add for author entity recognition')
  
  const blogHead = await fetchHead('/blog')
  const blogAlt = await fetchHead('/articles')
  if ((blogHead && blogHead.status === 200) || (blogAlt && blogAlt.status === 200)) pass('Blog exists', 2)
  else warn('No blog — regular content signals freshness and authority')
  
  const glossaryHead = await fetchHead('/glossary')
  if (glossaryHead && glossaryHead.status === 200) pass('Glossary exists', 3)
  else warn('No /glossary — individual term pages are highly citable by LLMs')
  
  const answersHead = await fetchHead('/answers')
  if (answersHead && answersHead.status === 200) pass('Answer pages exist', 3)
  else warn('No /answers — create pages that directly answer questions people ask AI')
  
  const conceptsHead = await fetchHead('/concepts')
  if (conceptsHead && conceptsHead.status === 200) pass('Concept pages exist', 3)
  else warn('No /concepts — deep reference pages for your core ideas')
  
  // Check for BreadcrumbList
  if (/BreadcrumbList/i.test(homepage)) pass('Breadcrumbs', 2)

} else if (siteType === 'ecommerce') {
  // E-commerce checks
  const hasProduct = /Product/i.test(homepage) && /application\/ld\+json/i.test(homepage)
  if (hasProduct) pass('Product schema', 5)
  else fail('No Product schema — essential for e-commerce visibility')
  
  const hasRating = /AggregateRating|ratingValue/i.test(homepage)
  if (hasRating) pass('AggregateRating on products', 5)
  else warn('No ratings schema — add AggregateRating to products with reviews')
  
  const hasOffer = /Offer|price/i.test(homepage) && /application\/ld\+json/i.test(homepage)
  if (hasOffer) pass('Offer/pricing schema', 3)
  else warn('No Offer schema — structured pricing helps AI cite your products')
  
  const faqHead = await fetchHead('/faq')
  if (faqHead && faqHead.status === 200) pass('FAQ page', 3)
  else warn('No /faq — create FAQ pages for product and shipping questions')
  
  if (/BreadcrumbList/i.test(homepage)) pass('Breadcrumbs', 3)
  else warn('No breadcrumbs — important for e-commerce navigation schema')

} else if (siteType === 'saas') {
  // SaaS checks
  const pricingHead = await fetchHead('/pricing')
  if (pricingHead && pricingHead.status === 200) pass('Pricing page', 3)
  else warn('No /pricing — comparison queries need structured pricing data')
  
  const docsHead = await fetchHead('/docs')
  const docAlt = await fetchHead('/documentation')
  if ((docsHead && docsHead.status === 200) || (docAlt && docAlt.status === 200)) pass('Documentation exists', 3)
  else warn('No /docs — documentation is highly citable by AI for technical queries')
  
  const changelogHead = await fetchHead('/changelog')
  if (changelogHead && changelogHead.status === 200) pass('Changelog', 2)
  else warn('No /changelog — signals active development')
  
  if (hasPerson) pass('Founder/team schema', 3)
  else warn('No Person schema — add founder entity for authority')
  
  const hasSoftware = /SoftwareApplication/i.test(homepage)
  if (hasSoftware) pass('SoftwareApplication schema', 5)
  else warn('No SoftwareApplication schema — helps AI understand your product')

} else if (siteType === 'portfolio') {
  // Portfolio checks
  if (hasPerson) pass('Person schema', 5)
  else fail('No Person schema — essential for portfolio/agency authority')
  
  const workHead = await fetchHead('/work')
  const projectsHead = await fetchHead('/projects')
  if ((workHead && workHead.status === 200) || (projectsHead && projectsHead.status === 200)) pass('Work/projects page', 3)
  
  const hasCreativeWork = /CreativeWork|VisualArtwork/i.test(homepage)
  if (hasCreativeWork) pass('CreativeWork schema', 3)
  else warn('No CreativeWork schema — structured data for your work')

} else {
  // General fallback checks
  const aboutHead = await fetchHead('/about')
  if (aboutHead && aboutHead.status === 200) pass('About page', 2)
  
  const blogHead = await fetchHead('/blog')
  if (blogHead && blogHead.status === 200) pass('Blog', 2)
  
  if (hasPerson) pass('Person schema', 3)
  else warn('No Person schema — add for authority signals')
}

// === OUTPUT ===

console.log(`  Score: ${score}/${maxScore}`)
console.log('')

if (results.pass.length) {
  console.log('  \x1b[32m✓ PASS\x1b[0m')
  results.pass.forEach(r => console.log('    ' + r))
  console.log('')
}

if (results.warn.length) {
  console.log('  \x1b[33m⚠ IMPROVE\x1b[0m')
  results.warn.forEach(r => console.log('    ' + r))
  console.log('')
}

if (results.fail.length) {
  console.log('  \x1b[31m✗ MISSING\x1b[0m')
  results.fail.forEach(r => console.log('    ' + r))
  console.log('')
}

const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F'
console.log(`  Grade: ${grade}`)
console.log('')

// Type-specific next steps
if (score < 100) {
  console.log(`  Recommendations for ${typeLabels[siteType]} sites:`)
  
  if (siteType === 'content') {
    if (!llmsTxt) console.log('    → Create /llms.txt with your content structure')
    if (!hasFaq) console.log('    → Add FAQPage schema to homepage and key pages')
    if (!hasSpeakable) console.log('    → Add speakable to articles and landing pages')
    if (!hasPerson) console.log('    → Add Person schema for your author/founder')
    console.log('    → Build /answers pages that directly answer questions people ask AI')
    console.log('    → Build /concepts pages for your core ideas')
    console.log('    → Build /glossary with individual term pages')
  } else if (siteType === 'ecommerce') {
    if (!llmsTxt) console.log('    → Create /llms.txt describing your products and categories')
    console.log('    → Add Product + Offer + AggregateRating schema to product pages')
    console.log('    → Build /faq with common product and shipping questions')
    console.log('    → Add BreadcrumbList for category navigation')
    console.log('    → Write detailed product descriptions that AI can cite')
  } else if (siteType === 'saas') {
    if (!llmsTxt) console.log('    → Create /llms.txt describing your product and API')
    console.log('    → Add SoftwareApplication schema to homepage')
    console.log('    → Build comparison pages (you vs. alternatives)')
    console.log('    → Publish documentation that AI can reference')
    console.log('    → Add FAQPage schema to pricing and feature pages')
  } else if (siteType === 'portfolio') {
    if (!llmsTxt) console.log('    → Create /llms.txt with your services and notable work')
    console.log('    → Add Person schema with knowsAbout, sameAs, hasOccupation')
    console.log('    → Add CreativeWork/VisualArtwork schema to project pages')
    console.log('    → Build case study pages with structured outcomes')
  }
  
  console.log('')
  console.log('  Full playbook: https://github.com/visualizevalue/llm-optimization')
  console.log('')
}
