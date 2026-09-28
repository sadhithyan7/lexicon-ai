# Lexicon — Personal Knowledge Engine

Save everything you read. Search it semantically. Get cited answers.

## What This Is

A portfolio project: browser extension + web app + RAG pipeline.
- **Extension**: Auto-captures pages you read with dwell timer & Readability content extraction
- **Web App**: Stores pages with Gemini embeddings; hybrid full-text + vector search (RRF)
- **RAG**: Generates grounded answers with source citations using Gemini 3.6 Flash

**Status**: 100% Feature-Complete (Tasks 1-16).

---

## Build Progress

| Task | Feature | Status |
|---|---|---|
| 1-5 | Design system (Athenaeum), Homepage, Search, Ask UI, States | ✅ |
| 6-9 | Seed scripts, OG meta, Extension popup UI, Initial API wiring | ✅ |
| 10 | Supabase schema for hybrid search (Postgres + pgvector) | ✅ |
| 11 | `/api/save` — Gemini embeddings (768-dim) + Supabase upsert | ✅ |
| 12 | `/api/search` — Hybrid RRF (Keyword + Vector) search | ✅ |
| 13 | `/api/ask` — Streaming RAG generation with citations & backoff | ✅ |
| 14 | Multi-turn RAG conversation & citation parsing | ✅ |
| 15 | Chrome MV3 Auto-capture extension (dwell timer + Readability) | ✅ |
| 16 | Settings wiring, Health check API, Export API, Extension messaging | ✅ |

---

## Tech Stack

| Tool | Job |
|---|---|
| **Next.js 16** (App Router, JavaScript) | Frontend + backend API |
| **Tailwind CSS** | Design system styling |
| **Supabase** (Postgres + pgvector) | Database + vector store |
| **Gemini API** (`gemini-3.6-flash`, `gemini-embedding-2`) | Embeddings + RAG answers |
| **MV3 Extension** (Manifest V3) | Dwell-based auto-capture |

---

## Design System: The Athenaeum

Six intentional color tokens + two typefaces. Built for a personal library feel, not generic SaaS.

**Colors**: 
- Ink (`#16141C`) — primary background
- Cover (`#201D28`) — surfaces
- Parchment (`#EDE7D8`) — text
- Faded Ink (`#9C96A8`) — muted
- Gold Leaf (`#C9A227`) — CTAs
- Lamp Green (`#3F7D69`) — citations

**Typography**:
- Fraunces (display serif) — headlines, hero
- IBM Plex Sans (body sans) — UI, content

---

## Try It Now

### 1. Start Web App
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### 2. Load Extension
1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select `extension/` directory
4. Copy Extension ID → add to `.env.local` (`NEXT_PUBLIC_EXTENSION_ID=...`)

---

## Links

- **GitHub**: github.com/sadhithyan7/lexicon-ai
- **Author**: Adhithyan S