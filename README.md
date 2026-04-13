# Context Score

How well does your site explain itself?

A site that connects its own context well is understood by everyone — humans, search engines, AI, and any system that needs to know what you do.

```bash
npx github:visualizevalue/context-score https://yoursite.com
```

```
  Context Score: 83/100  |  Grade: B  |  content

  Identity          18/20  ██████████████████░░
  Structure         16/20  ████████████████░░░░
  Depth             19/20  ███████████████████░
  Connectivity      14/20  ██████████████░░░░░░
  Discoverability   16/20  ████████████████░░░░

  20 pages crawled  |  372 in sitemap  |  14 avg links/page  |  680 avg words

  Top opportunities:
    → 3 orphan pages with no internal links pointing to them
    → Limited cross-linking between sections — connect blog ↔ concepts ↔ glossary
    → Speakable on 8/20 pages — AI doesn't know what to quote
    → 5 schema types — diversify to 8+
```

## What it measures

| Category | Points | What it looks for |
|---|---|---|
| **Identity** | 20 | Does the site explain what it is? Organization schema, about page, meta descriptions, llms.txt, author entity |
| **Structure** | 20 | Is content findable? Sitemap, breadcrumbs, navigation depth, robots.txt |
| **Depth** | 20 | Is there substance? Answer pages, concepts, glossary, FAQ schema, blog, word count |
| **Connectivity** | 20 | Do pages reference each other? Internal link density, cross-linking, orphan pages, related content |
| **Discoverability** | 20 | Can external systems understand it? Schema diversity, speakable, SearchAction, social links, ai-plugin.json |

Use `--verbose` for page-by-page details, orphan page lists, and cross-section connection maps.

---

## The Context Playbook

10 steps to build a site that explains itself.

### 1. Declare who you are

Create a `/llms.txt` file that tells any system — AI or otherwise — what your site is, what it offers, and where to find it.

```
# Your Brand

> One-line description of what you do.

## What we offer
- [Product](https://yoursite.com/product): What it does.
- [Course](https://yoursite.com/course): What it teaches.

## Key pages
- [About](https://yoursite.com/about)
- [Blog](https://yoursite.com/blog)
- [FAQ](https://yoursite.com/faq)
```

Add Organization schema and a clear `/about` page. If there's a founder or author behind the work, add Person schema.

### 2. Map your territory

A sitemap tells systems what exists. Breadcrumbs tell them where it lives. robots.txt tells them who's allowed in.

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

Block training crawlers. Allow citation crawlers. Map everything in `sitemap.xml`.

### 3. Answer questions directly

Create pages that answer questions people type into AI.

- URL: `/answers/how-to-price-a-digital-product`
- H1: The exact question
- First paragraph: The direct answer (this is what gets cited)
- Body: Depth, examples, evidence
- Schema: FAQPage + Article + SpeakableSpecification

### 4. Define your terms

Every core idea deserves its own page. Not one glossary page — individual URLs with individual schemas.

- `/glossary/leverage` — definition, context, examples
- `/concepts/build-once-sell-twice` — essay, related content, DefinedTerm schema

Each page is a citation surface. Each URL is an entry point.

### 5. Cross-link everything

Every page should reference related content in other sections. Articles link to concepts. Concepts link to courses. Courses link to workflows. The site is a web, not a list of pages.

Check:
- Do blog posts link to related concepts?
- Do concept pages link to relevant courses?
- Do glossary terms link to the content that uses them?
- Are there orphan pages with no internal links pointing to them?

### 6. Make content quotable

Add speakable markup to tell AI which content to cite:

```json
{
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": ["h1", "article p:first-of-type"]
  }
}
```

Write first paragraphs that stand alone as answers. Clear, specific, quotable.

### 7. Build for every audience

`/for/designers`, `/for/developers`, `/for/writers` — audience-specific pages with tailored problems and recommendations.

Comparison pages work too: "X vs. Y" with structured tables. These answer decision-making queries directly.

### 8. Let machines read you

Add schema markup to every page type:

| Page type | Schema |
|---|---|
| Homepage | Organization, WebSite, SearchAction |
| About | Person, Organization |
| Article | BlogPosting, SpeakableSpecification |
| How-to | HowTo with steps |
| Product | Product, AggregateRating |
| Concept | DefinedTerm, FAQPage, Article |
| Answer | FAQPage, Article, SpeakableSpecification |

Diverse schema types help machines categorize your content correctly.

### 9. Prove your work

Reviews, case studies, a changelog. Evidence that the work is real and ongoing.

- `/changelog` — show what you've built and when
- `/reviews` — real feedback from real people
- Schema: Review, AggregateRating

### 10. Stay findable

- `robots.txt` that addresses AI crawlers by name
- Meta descriptions that answer questions (not taglines)
- `sameAs` links connecting your schema to social profiles
- `ai-plugin.json` for AI tool discovery

**Bad meta:** "We help businesses grow."
**Good meta:** "5 courses on leverage and value creation. 168 lessons. Free to start. 607 five-star reviews."

---

## Case study

Built while building [visualizevalue.com](https://visualizevalue.com) — every recommendation maps to something we actually shipped.

- [llms.txt](https://visualizevalue.com/llms.txt) — context file for AI crawlers
- [Answers](https://visualizevalue.com/answers) — 20 direct-answer pages
- [Concepts](https://visualizevalue.com/concepts) — 11 deep dives
- [Glossary](https://visualizevalue.com/glossary) — 25 individual term pages
- [Workflows](https://visualizevalue.com/workflows) — 15 build logs
- [For pages](https://visualizevalue.com/for) — audience-specific entry points
- [Changelog](https://visualizevalue.com/changelog) — 90-day activity grid

## About

Built by [Jack Butcher](https://visualizevalue.com/about/jack-butcher) and [Claude Code](https://claude.ai/claude-code).

- [Visualize Value](https://visualizevalue.com)
- [@jackbutcher](https://x.com/jackbutcher)

## License

MIT
