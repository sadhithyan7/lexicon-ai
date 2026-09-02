# LEXICON

**A Personal Knowledge Engine — Semantic Search Over Everything You Read**

## Problem

You read dozens of useful articles, papers, and blog posts every month. By next week, you've forgotten most of them. Browser bookmarks turn into an unsearchable graveyard. Search engines can't find something you've already read.

## Solution

**Lexicon** is a full-stack AI-powered platform that automatically captures and semantically indexes everything you read, turning your digital wandering into a searchable, organized personal knowledge engine.

**Core idea:** A lightweight browser extension captures pages you actually engage with (based on time spent and scroll depth, not just clicks), sends the content to a backend pipeline, and the web app becomes your interface — search in plain English, ask questions across everything you've saved, and get answers with citations that link to the exact sentence on the original page.

---

## Key Features (Planned)

- **Automatic capture** via browser extension — only saves content you actually engage with (>30s dwell time, >40% scroll depth)
- **Hybrid search** — BM25 keyword search fused with vector similarity (pgvector) via Reciprocal Rank Fusion
- **Reranking** — cross-encoder reranker on top 30 results before generation
- **Sentence-level citations** — answers link directly to the exact sentence in your source (URL text fragments)
- **On-device privacy mode** — toggle to embed everything locally (Transformers.js) for full privacy
- **Async ingestion pipeline** — handles deduplication, chunking, boilerplate stripping, and embedding via background workers
- **Evaluation harness** — measure retrieval quality (recall@k) across pipeline configurations

---

## Why This Matters

This isn't about building the next Readwise or competing with getrecall.ai. It's about proving I can architect and ship a **distributed AI system end-to-end**:

- **MV3 service worker constraints** — extension workers die after ~30s idle; requires persisted retry queue in IndexedDB
- **Retrieval as engineering, not magic** — hybrid search beats pure vector; measured and publishable in the README
- **Real async architecture** — BullMQ background jobs, webhook retries, idempotent operations
- **RAG pipeline design** — chunking strategies, embedding quality, reranking trade-offs

---

## Tech Stack

**Frontend:** Next.js 14+, TypeScript, TailwindCSS  
**Backend:** Node.js, Fastify, BullMQ  
**Extension:** WXT/Plasmo, MV3 Manifest  
**AI/ML:** LangChain, Transformers.js, sentence-transformers  
**Database:** PostgreSQL + pgvector, IndexedDB  

---

## Architecture

```
Browser Extension (sensor layer)
  ↓ (on engagement signal)
  IndexedDB queue (persisted, retryable)
  ↓
Backend (Fastify + BullMQ workers)
  ↓ (process: chunk, embed, deduplicate)
  PostgreSQL + pgvector
  ↓
Web App (Next.js)
  ↓ (hybrid search: BM25 + vector + rerank)
  LLM generation (Claude/GPT) + citations
```

---

## Status

🚧 **In Progress** — Architecture designed, scaffolding core services.

---

## Getting Started

```bash
git clone https://github.com/[YOU]/lexicon.git
cd lexicon

# Detailed setup coming as components scaffold
```

---

## License

MIT

---

**Author:** Adhithyan S  
[GitHub](https://github.com/sadhithyan7) · [LinkedIn](https://linkedin.com/in/sadhithyan)
