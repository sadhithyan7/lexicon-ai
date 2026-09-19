"use client";

/*
  Dashboard — app/page.js
  
  The root page. Shows:
  1. Greeting + stat strip (3 numbers)
  2. Quick-ask card with the gold glow effect
  3. Recently saved panel (ledger rows)
  4. Suggested topics (pills)

  All data is mock for now — Task 10 will replace with real API calls.
  The state machine structure (status / loading / empty / error) is
  already in place so wiring real data is a drop-in swap.
*/

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Panel from "@/components/Panel";

/* ── Mock data ── */
const STATS = [
  { label: "Pages saved",    value: 248 },
  { label: "Saved this week", value: 12  },
  { label: "Questions asked", value: 34  },
];

const RECENT_PAGES = [
  { id: 1, title: "How React Works",                           source: "react.dev/learn",                      ago: "2h ago"   },
  { id: 2, title: "PostgreSQL Vector Search with pgvector",   source: "database.com/docs/extensions/pgvector", ago: "5h ago"   },
  { id: 3, title: "Hybrid Search: Combining BM25 and Embeddings", source: "blog.search-indexes.com",          ago: "Yesterday" },
  { id: 4, title: "Chrome Extension Manifest V3 Migration Guide", source: "chromium.dev/extensions/mv3",      ago: "Yesterday" },
  { id: 5, title: "Gemini Embedding API Reference",           source: "ai.dev/docs/embeddings",               ago: "2 days ago" },
];

const SUGGESTED_TOPICS = [
  "hybrid search", "pgvector", "service workers", "RAG", "citations",
];

export default function Dashboard() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q || isSearching) return;
    setIsSearching(true);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function handleTopicClick(topic) {
    router.push(`/search?q=${encodeURIComponent(topic)}`);
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* ── Page header ── */}
      <div className="mb-8">
        <h1 className="font-display font-semibold text-parchment text-3xl mb-1">
          {greeting}
        </h1>
        <p className="font-sans text-faded-ink text-sm">
          Here&apos;s what&apos;s new in your library.
        </p>
      </div>

      {/* ── Stat strip ── */}
      <Panel className="p-5 mb-5 flex gap-0">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex-1 px-4 ${i > 0 ? "border-l border-faded-ink/15" : ""}`}
          >
            <p className="font-display font-semibold text-parchment text-3xl leading-none mb-1">
              {stat.value}
            </p>
            <p className="font-sans text-faded-ink text-xs">{stat.label}</p>
          </div>
        ))}
      </Panel>

      {/* ── Quick-ask card with glow ── */}
      <Panel className="p-5 mb-5 relative overflow-hidden">
        {/* The one gold glow — atmospheric, not decorative noise */}
        <div
          aria-hidden="true"
          className="hero-glow pointer-events-none absolute"
          data-focused={isFocused ? "true" : "false"}
          style={{
            top: "50%",
            left: "40%",
            transform: "translate(-50%, -50%)",
            width: "400px",
            height: "180px",
            background: "radial-gradient(ellipse at center, #C9A227 0%, transparent 65%)",
            zIndex: 0,
          }}
        />
        <form
          onSubmit={handleSearch}
          className="relative z-10 flex gap-2"
          role="search"
        >
          {/* Search icon inside the input */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" stroke="#9C96A8" strokeWidth="1.75" />
              <path d="M16.5 16.5L21 21" stroke="#9C96A8" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <input
              id="dashboard-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask your library anything…"
              disabled={isSearching}
              className="
                w-full bg-ink/70 border border-faded-ink/20
                text-parchment placeholder:text-faded-ink
                font-sans text-sm
                pl-9 pr-4 py-2.5
                rounded-md
                focus-visible:border-gold-leaf/60
                transition-colors duration-200
                disabled:opacity-60
              "
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="
              bg-gold-leaf text-ink
              font-sans font-medium text-sm
              px-4 py-2.5 rounded-md shrink-0
              hover:bg-[#b8911f]
              transition-colors duration-200
              disabled:opacity-50
              flex items-center gap-2
            "
          >
            {isSearching ? (
              <><span className="spinner" style={{ width: 14, height: 14 }} /><span>Asking…</span></>
            ) : "Ask"}
          </button>
        </form>
      </Panel>

      {/* ── Recently saved ── */}
      <Panel className="p-0 mb-5 overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-sans font-semibold text-parchment text-sm">
            Recently saved
          </h2>
          <Link
            href="/history"
            className="font-sans text-xs text-faded-ink hover:text-parchment transition-colors"
          >
            View all
          </Link>
        </div>

        {/* Ledger rows — hairline dividers, no per-row background */}
        <ul role="list">
          {RECENT_PAGES.map((page) => (
            <li
              key={page.id}
              className="ledger-row flex items-center justify-between gap-4 px-5 py-3 hover:bg-cover-raised/40 transition-colors duration-150"
            >
              <div className="min-w-0 flex-1">
                <p className="font-sans font-medium text-parchment text-sm leading-snug truncate">
                  {page.title}
                </p>
                <p className="font-sans text-xs text-faded-ink truncate mt-0.5">
                  {page.source}
                </p>
              </div>
              <span className="font-sans text-xs text-faded-ink shrink-0">
                {page.ago}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      {/* ── Suggested topics ── */}
      <div>
        <p className="font-sans text-xs text-faded-ink mb-3 uppercase tracking-widest">
          Suggested topics
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => handleTopicClick(topic)}
              className="
                font-sans text-xs text-faded-ink
                bg-cover-raised border border-faded-ink/20
                px-3 py-1.5 rounded-full
                hover:text-parchment hover:border-faded-ink/40
                transition-colors duration-150
              "
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
