# LLM Optimization

Scan any website for AI search engine readiness. Get a score, checklist, and recommendations.

```bash
npx github:visualizevalue/llm-optimization https://yoursite.com
```

```
  Score: 65/100

  ✓ PASS
    llms.txt exists (8294 chars)
    Blocks training crawlers (CCBot)
    Organization schema on homepage
    SearchAction for sitelinks search
    ai-plugin.json exists

  ⚠ IMPROVE
    No FAQ schema
    No speakable specification

  ✗ MISSING
    No glossary
    No meta description

  Grade: B
```

## What it checks

- **llms.txt** — does your site have a context file for AI crawlers?
- **llms-full.txt** — detailed version with content excerpts?
- **robots.txt** — are training crawlers blocked? Citation crawlers allowed?
- **Sitemap** — how many URLs are indexed?
- **Schema markup** — Organization, WebSite, Person, FAQPage, SearchAction, Speakable
- **Meta descriptions** — detailed enough for AI to cite?
- **ai-plugin.json** — AI tool discovery manifest?
- **Key pages** — about, FAQ, glossary, blog

## The playbook

After scanning, follow these steps to improve your score:

### 1. Create llms.txt

A human-readable file at `/llms.txt` that tells AI crawlers what your site is about.

```
# Your Brand

> One-line description.

## Courses
- [Course Name](https://yoursite.com/course): What it covers.

## Tools
- [Tool Name](https://yoursite.com/tool): What it does.
```

### 2. Configure robots.txt

Block training crawlers. Allow citation crawlers.

```
User-agent: CCBot
Disallow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /
```

### 3. Build answer pages

Create pages that directly answer questions people ask AI.

- URL: `/answers/how-to-start-a-business`
- H1: The exact question
- First paragraph: Direct answer (this gets cited)
- Body: Depth and examples
- Schema: FAQPage + Article + SpeakableSpecification

### 4. Build concept pages

For every core idea your brand teaches, create a dedicated page with:

- Definition (one quotable sentence)
- Essay (500+ words)
- Related content links
- DefinedTerm + FAQPage schema

### 5. Build a glossary

Individual pages for each term. Not one long page — individual URLs with individual schemas. Each is a citation opportunity.

### 6. Add schema to everything

| Page type | Schema |
|---|---|
| Homepage | Organization, WebSite, SearchAction |
| About | Person, Organization, FAQPage |
| Article | BlogPosting, SpeakableSpecification |
| How-to | HowTo with HowToSteps |
| Product | Product, AggregateRating |
| Concept | DefinedTerm, FAQPage, Article |
| Answer | FAQPage, Article, SpeakableSpecification |

### 7. Add speakable

Tells AI which content to quote:

```json
{
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": ["h1", "article p:first-of-type"]
  }
}
```

### 8. Create ai-plugin.json

At `/.well-known/ai-plugin.json`:

```json
{
  "schema_version": "v1",
  "name_for_model": "your_brand",
  "description_for_model": "What your site offers...",
  "llms_txt": "https://yoursite.com/llms.txt"
}
```

### 9. Write meta descriptions as answers

Not taglines. Answers.

Bad: "We help businesses grow."
Good: "5 courses on leverage and value creation. 168 lessons. Start free. $9/month. 607 five-star reviews."

### 10. Cross-link everything

Every page links to related content in other sections. Articles link to concepts. Concepts link to courses. Courses link to workflows. The site is a web, not a list.

### 11. Build audience pages

`/for/designers`, `/for/developers`, `/for/writers` — audience-specific pages with tailored problems and recommendations.

### 12. Build comparison pages

"Your product vs. Alternative" with structured tables. These answer purchase-decision queries directly.

## Case study

Built while optimizing [visualizevalue.com](https://visualizevalue.com) — 372 pages, from zero AI optimization to Grade B in one session.

- [llms.txt](https://visualizevalue.com/llms.txt)
- [Answers](https://visualizevalue.com/answers) — 20 answer pages
- [Concepts](https://visualizevalue.com/concepts) — 11 deep dives
- [Glossary](https://visualizevalue.com/glossary) — 25 individual pages
- [Workflows](https://visualizevalue.com/workflows) — 15 build logs
- [The $99 MBA](https://visualizevalue.com/mba)

## About

Built by [Jack Butcher](https://visualizevalue.com/about/jack-butcher) and [Claude Code](https://claude.ai/claude-code).

- [Visualize Value](https://visualizevalue.com)
- [Courses](https://visualizevalue.com/learn)
- [@jackbutcher](https://x.com/jackbutcher)

## License

MIT
