# Lexicon — Personal Knowledge Engine

Save everything you read. Search it semantically. Get cited answers.

## What This Is

A portfolio project: browser extension + web app + RAG pipeline.
- **Extension**: Auto-captures pages you read
- **Web App**: Stores them with AI embeddings; semantic + keyword search
- **RAG**: Generates answers with source citations

**Status**: UI complete (Tasks 1-5). Building backend wiring (Tasks 6-8).

---

## Build Progress

| Task | Feature | Status | Commit |
|---|---|---|---|
| 1 | Design system (Athenaeum) | ✅ | [MILESTONE] UI Complete |
| 2 | Homepage hero + glow | ✅ | [MILESTONE] UI Complete |
| 3 | Search results ledger | ✅ | [MILESTONE] UI Complete |
| 4 | Ask page with citations | ✅ | [MILESTONE] UI Complete |
| 5 | Loading/empty/error states | ✅ | [MILESTONE] UI Complete |
| 6 | Seed data script | 🔄 | Pending |
| 7 | Favicon + OG tags + 404 | 🔄 | Pending |
| 8 | Extension popup UI | 🔄 | Pending |
| 9 | API wiring + live demo | 📝 | Pending |

---

## Tech Stack

| Tool | Job |
|---|---|
| **Next.js** (App Router, JavaScript) | Frontend + backend API |
| **Tailwind** | Styling |
| **Supabase** (Postgres + pgvector) | Database + vector store |
| **Gemini API** | Embeddings + answers |
| **MV3 Extension** | Auto-capture |

---

## Design System: The Athenaeum

Six intentional color tokens + two typefaces. Built for a personal library feel, not generic SaaS.

**Colors**: 
- Ink (#16141C) — primary background
- Cover (#201D28) — surfaces
- Parchment (#EDE7D8) — text
- Faded Ink (#9C96A8) — muted
- Gold Leaf (#C9A227) — CTAs
- Lamp Green (#3F7D69) — citations

**Typography**:
- Fraunces (display serif) — headlines, hero
- IBM Plex Sans (body sans) — UI, content

**Key Principles**:
- One glow (Gold Leaf behind hero search only)
- Citations as footnotes [1][2][3], not badges
- Results as ledger (single column, hairline dividers), not cards
- Responsive to mobile (tested 390px)

---

## Features

### Built (Tasks 1-5)
- [x] Hero search page with atmospheric glow
- [x] Responsive design (desktop + mobile)
- [x] Search results as single-column ledger
- [x] Answer page with inline citations
- [x] Loading, empty, error states (styled, not defaults)
- [x] Design system in Tailwind

### Coming (Tasks 6-8)
- [ ] Seed data: 20-30 realistic pages
- [ ] Favicon + OG meta tags + 404 page
- [ ] Extension popup matching design system
- [ ] Real API wiring: /api/save, /api/search, /api/ask
- [ ] Extension auto-capture logic
- [ ] Live Gemini embeddings + hybrid search
- [ ] Rate-limit handling (429 backoff)

---

## Try It Now

### Development
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Test the UI
- Homepage: search input with glow (doesn't search yet, just UI)
- /search?q=react: shows mock results in ledger format
- /ask?q=what%20is%20hybrid%20search: shows mock answer with citations
- Resize to 390px: verify responsive layout

---

## Interview Talking Points

Built into this project:

1. **Design system thinking** — why Fraunces + IBM Plex, why the palette, why no cards
2. **Hybrid search** — keyword + vector trade-offs
3. **MV3 extensions** — service worker lifecycle, message passing
4. **Postgres + pgvector** — single database, no sync complexity
5. **RAG with citations** — functional, not decoration
6. **Frontend completeness** — loading, empty, error states matter

Each feature has a "why" — that's what recruiters ask about.

---

## 🏗 Architecture (coming)


---

## 🔗 Links

- **GitHub**: github.com/sadhithyan7/lexicon
- **Live**: (deploying after Task 9)
- **Author**: Aravindhan S

---

## 📝 Notes

- No login yet — every visitor sees the same demo pages (intentional for portfolio)
- Gemini free tier: 60 req/min, 1M tokens/day
- Each commit = one feature, read the commit message to understand the "why"

---

## Building This

Commit history tells the story. To understand the project:

1. Read this README (you're here)
2. Check the commit log (each message explains a feature)
3. Run `npm run dev` and try the UI
4. Read the code — design decisions are in component props and CSS

Pull requests and issues welcome if you spot bugs during the remaining tasks.