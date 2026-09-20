"use client";

/*
  Search page — app/search/page.js

  Layout per screenshot:
  - Search input with "Search" button
  - Filter pills: All | This week | This month
  - "N results for 'query'" sub-label
  - Results in a Panel with ledger rows (title, URL, snippet, external link icon)

  State machine: idle → loading → success | empty | error
  Wired to real /api/search endpoint (Task 12).
*/

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Panel from "@/components/Panel";

const FILTERS = ["All", "This week", "This month"];

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQ);
  const [activeFilter, setActiveFilter] = useState("All");
  const [status, setStatus] = useState(initialQ ? "loading" : "idle");
  const [results, setResults] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  /* Sync input value when URL changes (e.g. user navigates back) */
  useEffect(() => {
    setQuery(initialQ);
  }, [initialQ]);

  /* ── Fetch search results ── */
  useEffect(() => {
    if (!initialQ) {
      setStatus("idle");
      return;
    }

    setStatus("loading");
    setResults([]);

    let isMounted = true;

    async function doSearch() {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(initialQ)}`);
        const data = await res.json();
        if (!isMounted) return;

        if (!res.ok || data.error) {
          setStatus("error");
          return;
        }

        if (!data.results || data.results.length === 0) {
          setStatus("empty");
        } else {
          setResults(data.results);
          setStatus("success");
        }
      } catch (err) {
        if (isMounted) setStatus("error");
      }
    }

    doSearch();
    return () => {
      isMounted = false;
    };
  }, [initialQ, retryCount]);

  function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const retry = () => setRetryCount((c) => c + 1);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="font-display font-semibold text-parchment text-3xl mb-6">
        Search
      </h1>

      {/* ── Search input ── */}
      <Panel className="p-4 mb-5">
        <form onSubmit={handleSubmit} className="flex gap-3" role="search">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" stroke="#9C96A8" strokeWidth="1.75" />
              <path d="M16.5 16.5L21 21" stroke="#9C96A8" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <input
              id="search-input"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your saved pages…"
              className="
                w-full bg-ink/50 border border-faded-ink/20
                text-parchment placeholder:text-faded-ink
                font-sans text-sm pl-9 pr-4 py-2.5 rounded-md
                focus-visible:border-gold-leaf/60 transition-colors duration-200
              "
            />
          </div>
          <button
            type="submit"
            className="
              bg-gold-leaf text-ink font-sans font-semibold text-sm
              px-5 py-2.5 rounded-md shrink-0
              hover:bg-[#b8911f] transition-colors duration-200
            "
          >
            Search
          </button>
        </form>
      </Panel>

      {/* ── Filter pills ── */}
      <div className="flex gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            className={`
              font-sans text-xs px-3 py-1.5 rounded-full border transition-colors duration-150
              ${activeFilter === f
                ? "bg-cover-raised border-faded-ink/40 text-parchment"
                : "border-faded-ink/20 text-faded-ink hover:border-faded-ink/40 hover:text-parchment"
              }
            `}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Result count label ── */}
      {status === "success" && (
        <p className="font-sans text-faded-ink text-sm mb-4">
          {results.length} results for &ldquo;{initialQ}&rdquo;
        </p>
      )}

      {/* ── State rendering ── */}
      {status === "loading" && <SearchSkeleton />}

      {status === "idle" && (
        <p className="font-sans text-faded-ink text-sm">
          Enter a query above to search your saved pages.
        </p>
      )}

      {status === "empty" && (
        <Panel className="p-8 text-center">
          <p className="font-sans text-parchment text-sm mb-1">Nothing found for &ldquo;{initialQ}&rdquo;</p>
          <p className="font-sans text-faded-ink text-xs">Try a broader query, or save more pages with the extension.</p>
        </Panel>
      )}

      {status === "error" && (
        <Panel className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="#B5573F" strokeWidth="1.75" />
              <path d="M12 8v5M12 16v.5" stroke="#B5573F" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <div>
              <p className="font-sans font-medium text-parchment text-sm mb-1">Search failed</p>
              <p className="font-sans text-faded-ink text-xs">Couldn&apos;t connect to the database. Check your connection and try again.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={retry}
            className="font-sans text-sm font-medium text-ink bg-gold-leaf px-4 py-2 rounded-md hover:bg-[#b8911f] transition-colors"
          >
            Retry
          </button>
        </Panel>
      )}

      {status === "success" && (
        <Panel className="p-0 overflow-hidden">
          <ul role="list">
            {results.map((result) => (
              <li
                key={result.id}
                className="ledger-row flex items-start justify-between gap-4 px-5 py-4 hover:bg-cover-raised/40 transition-colors duration-150"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-sans font-semibold text-parchment text-sm leading-snug mb-0.5">
                    {result.title}
                  </p>
                  <p className="font-sans text-xs text-faded-ink mb-1.5 truncate">
                    {result.url}
                  </p>
                  <p className="font-sans text-xs text-faded-ink/80 leading-relaxed line-clamp-2">
                    {result.snippet}
                  </p>
                </div>
                {/* External link icon */}
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${result.title} in new tab`}
                  className="shrink-0 mt-0.5 text-faded-ink/40 hover:text-faded-ink transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    <path d="M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <Panel className="p-0 overflow-hidden">
      <ul>
        {[1, 2, 3, 4].map((i) => (
          <li key={i} className="ledger-row px-5 py-4 space-y-2">
            <span className="skeleton h-4 w-2/3 block" />
            <span className="skeleton h-3 w-1/3 block" />
            <span className="skeleton h-3 w-full block" />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
