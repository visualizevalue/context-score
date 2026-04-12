# How to Optimize Your Website for AI Search Engines

A practical playbook for making your site citable by ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews.

Built by [Visualize Value](https://visualizevalue.com) while optimizing a 372-page site from zero AI visibility to comprehensive coverage in one session.

## Why this matters

When someone asks an AI "how do I start a business?" — the AI cites sources. If your site isn't structured for AI consumption, you're invisible in the fastest-growing search channel.

Traditional SEO optimizes for 10 blue links. This playbook optimizes for AI citation.

## The playbook

### 1. llms.txt

Create a human-readable text file at `/llms.txt` that tells AI crawlers what your site is about. Think of it as robots.txt for context, not access.

```
# Your Brand

> One-line description.

## Section 1
- [Page Name](https://yoursite.com/page): What this page covers.

## Section 2
...
```

For detailed content, create `/llms-full.txt` with actual excerpts. Reference it from the short version.

### 2. robots.txt — block training, allow citation

```
# Block training crawlers
User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /

# Allow citation crawlers
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /
```

Block the crawlers that train models on your content without attribution. Allow the ones that cite you in answers.

### 3. Answer pages

Create dedicated pages that directly answer questions people type into AI.

**Format:**
- URL: `/answers/how-to-[question]`
- H1: The exact question
- First paragraph: Direct answer (this is what gets cited)
- Body: Depth, examples, context
- CTA: Link to your product/course/service

**Schema:** FAQPage + Article + SpeakableSpecification

The question is the title. The answer is the first paragraph. Everything else is supporting detail.

### 4. Concept pages

For every core idea your brand teaches, create a dedicated page.

**Include:**
- Definition (one quotable sentence)
- Essay (500+ words of depth)
- Quotes from your content
- Links to related courses/products
- Links to related content across your site
- FAQ schema ("What is [concept]?")
- DefinedTerm schema

These become the canonical citation source for your ideas.

### 5. Glossary with individual pages

Each term gets its own URL. Not just a long page with anchors — individual pages with individual schemas.

**Each page:** definition, example, quote, link to the best lesson/article on this topic, DefinedTerm + FAQ schema.

25 terms = 25 individually citable URLs.

### 6. Schema markup on everything

| Page type | Schema types |
|---|---|
| Homepage | Organization, WebSite, SearchAction |
| About | Person (founder), Organization, FAQPage |
| Course | Course, CourseInstance, AggregateRating, Offer |
| Article | BlogPosting, SpeakableSpecification |
| How-to | HowTo (with HowToSteps), Article |
| Art/Product | VisualArtwork/Product, AggregateRating |
| Concept | DefinedTerm, Article, FAQPage |
| Glossary term | DefinedTerm, FAQPage |
| Answer page | FAQPage, Article, SpeakableSpecification |
| Comparison | WebPage (with structured tables) |

### 7. Speakable specification

Tell AI which content to read aloud or quote:

```json
{
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": ["h1", "article p:first-of-type"]
  }
}
```

Add to every page with quotable content.

### 8. Internal linking — everything connects

Every page should link to related content in other sections. The site is a web, not a list.

- Articles → concepts, courses, glossary terms
- Courses → related workflows, visuals
- Concepts → courses, art, workflows, glossary
- Visuals → "Featured in" courses

Use an auto-linker to inject links on first occurrence of recognized terms in article content.

### 9. Audience pages

Create `/for/[audience]` pages. "For designers." "For developers." "For writers."

Each page: problems this audience has, which courses solve them, relevant workflows. LLMs love audience-specific content because it matches specific queries.

### 10. Comparison pages

"Your product vs. Alternative." Structured tables with side-by-side data. These directly answer purchase-decision queries.

### 11. AI plugin manifest

Create `/.well-known/ai-plugin.json`:

```json
{
  "schema_version": "v1",
  "name_for_model": "your_brand",
  "description_for_model": "What your site offers...",
  "llms_txt": "https://yoursite.com/llms.txt"
}
```

### 12. Meta descriptions as answers

Every page's meta description should directly answer the question someone would search. Not a tagline — an answer.

Bad: "We help businesses grow."
Good: "5 courses on leverage and value creation. 168 lessons. Start free. $9/month for full access. 607 five-star reviews."

## Results

We applied this playbook to [visualizevalue.com](https://visualizevalue.com):

- 372 pages, all with structured data
- 20 answer pages targeting top AI queries
- 11 concept pages with essays, quotes, and cross-links
- 25 individual glossary pages
- 15 workflow articles (how-to with HowTo schema)
- FAQ schema on 30+ pages
- Speakable on all article and course pages
- Auto-linking across all blog content
- llms.txt + llms-full.txt + ai-plugin.json

## About

Built by [Jack Butcher](https://visualizevalue.com/about/jack-butcher) and [Claude Code](https://claude.ai/claude-code) in a single session.

- [Visualize Value](https://visualizevalue.com)
- [Courses](https://visualizevalue.com/learn) — 168 lessons on leverage, value creation, building independently
- [Workflows](https://visualizevalue.com/workflows) — how things get built with AI
- [The $99 MBA](https://visualizevalue.com/mba)
- [@jackbutcher](https://x.com/jackbutcher)

## License

MIT
