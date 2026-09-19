"use client";

/*
  History page — app/history/page.js

  Layout per screenshot:
  - Page title "History" with total page count in faded-ink (top right)
  - Subtitle: "Everything you've saved, in order."
  - Single Panel containing all entries grouped by date headers
  - Each group: date header (faded-ink, small) + ledger rows inside

  Mock data grouped by date — real version will group Supabase rows by date.
*/

import Panel from "@/components/Panel";

const HISTORY_GROUPS = [
  {
    label: "Today",
    items: [
      { id: 1,  title: "How React Works",                           url: "react.dev/learn",                         time: "4:12 PM" },
      { id: 2,  title: "PostgreSQL Vector Search with pgvector",   url: "database.com/docs/extensions/pgvector",   time: "11:03 AM" },
    ],
  },
  {
    label: "Yesterday",
    items: [
      { id: 3,  title: "Hybrid Search: Combining BM25 and Embeddings", url: "blog.search-indexes.com",             time: "9:40 PM" },
      { id: 4,  title: "Chrome Extension Manifest V3 Migration Guide", url: "chromium.dev/extensions/mv3",         time: "5:15 PM" },
      { id: 5,  title: "Reciprocal Rank Fusion for Search Ranking",    url: "arxiv.org/rrf-search",                time: "12:22 AM" },
    ],
  },
  {
    label: "Earlier this week",
    items: [
      { id: 6,  title: "Gemini Embedding API Reference",           url: "ai.google.dev/docs/embeddings",           time: "Mon, 4:48 PM" },
      { id: 7,  title: "Next.js App Router: Server Components Explained", url: "nextjs.org/docs",                  time: "Mon, 1:30 PM" },
      { id: 8,  title: "Semantic Search Basics",                   url: "pinecone.io/learn/semantic-search",       time: "Sun, 3:05 PM" },
    ],
  },
];

const TOTAL_PAGES = HISTORY_GROUPS.reduce((sum, g) => sum + g.items.length, 0);

export default function HistoryPage() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-semibold text-parchment text-3xl mb-1">
            History
          </h1>
          <p className="font-sans text-faded-ink text-sm">
            Everything you&apos;ve saved, in order.
          </p>
        </div>
        <span className="font-display font-semibold text-parchment text-2xl">
          {TOTAL_PAGES}
          <span className="font-sans font-normal text-faded-ink text-xs ml-1">pages</span>
        </span>
      </div>

      {/* ── History panel: all groups inside one panel ── */}
      <Panel className="p-0 overflow-hidden">
        {HISTORY_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {/* Date group header */}
            <div className={`px-5 py-2.5 ${gi > 0 ? "border-t border-faded-ink/10" : ""}`}>
              <p className="font-sans text-faded-ink text-xs font-medium uppercase tracking-widest">
                {group.label}
              </p>
            </div>

            {/* Ledger rows for this date group */}
            <ul role="list">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="ledger-row flex items-center justify-between gap-4 px-5 py-3 hover:bg-cover-raised/40 transition-colors duration-150"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-sans font-medium text-parchment text-sm leading-snug">
                      {item.title}
                    </p>
                    <p className="font-sans text-xs text-faded-ink truncate mt-0.5">
                      {item.url}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-sans text-xs text-faded-ink">{item.time}</span>
                    {/* External link */}
                    <a
                      href={`https://${item.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.title}`}
                      className="text-faded-ink/40 hover:text-faded-ink transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                        <path d="M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Panel>
    </div>
  );
}
