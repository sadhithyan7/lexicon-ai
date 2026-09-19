"use client";

/*
  Converting from a Server Component to a Client Component.
  Why: we need useState to manage the 'idle' | 'loading' | 'success' |
  'empty' | 'error' state machine that drives the UI. Server components
  can't have state — they render once on the server and that's it.

  The trade-off: we lose the automatic streaming/Suspense that server
  components provide. Instead, we handle the async lifecycle manually
  with useEffect + setTimeout (and later, fetch()).

  useSearchParams() is the client-side equivalent of await searchParams.
  It reads the current URL's ?q= param reactively. It requires a Suspense
  boundary above it — app/search/loading.js provides that.
*/

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

/* ── Mock data (same as before, will be replaced by Supabase query) ── */
const MOCK_PAGES = [
  {
    id: 1,
    title: "How React Works",
    url: "react.dev/learn/rendering-elements",
    snippet: "Learn the fundamentals of how React renders and updates the DOM.",
    saved: false,
  },
  {
    id: 2,
    title: "PostgreSQL Vector Search with pgvector",
    url: "docs.pg.org/extensions/pgvector",
    snippet: "Using pgvector for high-dimensional embedding similarity search.",
    saved: true,
  },
  {
    id: 3,
    title: "Hybrid Search Explained",
    url: "medium.com/search/hybrid-search-semantic",
    snippet: "Combining keyword and semantic search for better retrieval.",
    saved: false,
  },
];

function getResults(query) {
  if (!query.trim()) return MOCK_PAGES;
  const lower = query.toLowerCase();
  return MOCK_PAGES.filter(
    (p) =>
      p.title.toLowerCase().includes(lower) ||
      p.snippet.toLowerCase().includes(lower)
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  /*
    State machine:
    - 'loading': search in flight, show skeleton
    - 'success': results found, show ledger
    - 'empty':   no results, show guidance
    - 'error':   something failed, show message + retry
    - 'idle':    no query in URL, show prompt

    This is core logic — make sure you understand it.
    Every UI branch maps to exactly one status value. No boolean flags
    like isLoading + hasError + hasResults — those combinations create
    impossible states. A single status string can only be one thing.
  */
  const [status, setStatus] = useState("loading");
  const [results, setResults] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!q) {
      setStatus("idle");
      return;
    }

    setStatus("loading");
    setResults([]);

    /*
      Simulate a 2-second network delay. When we wire up the real
      Supabase hybrid search, this setTimeout is replaced by:
        const data = await fetch('/api/search?q=' + q).then(r => r.json())
      The state machine below stays exactly the same.
    */
    const timer = setTimeout(() => {
      // To manually test the error state: navigate to /search?q=fail
      if (q.toLowerCase() === "fail") {
        setStatus("error");
        return;
      }

      const found = getResults(q);
      if (found.length === 0) {
        setStatus("empty");
      } else {
        setResults(found);
        setStatus("success");
      }
    }, 2000);

    // Cleanup: if the component unmounts or q changes before the timer
    // fires, cancel the pending state update (prevents stale state).
    return () => clearTimeout(timer);
  }, [q, retryCount]); // retryCount is in the dep array so Retry re-runs the effect

  /*
    Retry: increment retryCount, which is in the useEffect dep array.
    Incrementing it re-runs the effect — same logic as a fresh mount.
    This is a simple pattern for "re-run this async action" without
    needing a separate fetch function.
  */
  const retry = () => setRetryCount((c) => c + 1);

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-12 sm:py-16">

        <header className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-sans text-sm text-lamp-green hover:underline underline-offset-3 mb-6 block"
          >
            ← Back to search
          </Link>

          <h1 className="font-display font-semibold text-parchment text-3xl sm:text-4xl leading-tight mb-2">
            Search Results
          </h1>

          {/* Show the query + result count only when we have results */}
          {q && status === "success" && (
            <p className="font-sans text-faded-ink text-sm">
              for &ldquo;{q}&rdquo; &mdash; {results.length}{" "}
              {results.length === 1 ? "result" : "results"}
            </p>
          )}
          {q && status !== "success" && (
            <p className="font-sans text-faded-ink text-sm">
              for &ldquo;{q}&rdquo;
            </p>
          )}
        </header>

        {/* ── State-conditional rendering ── */}
        {status === "loading" && <SearchSkeleton />}
        {status === "empty"   && <EmptyState query={q} />}
        {status === "error"   && (
          <ErrorState
            message="Search failed — couldn't connect to the database. Check your connection and try again."
            onRetry={retry}
          />
        )}
        {status === "success" && <ResultsList results={results} />}
        {status === "idle"    && (
          <p className="font-sans text-faded-ink text-sm">
            <Link href="/" className="text-lamp-green hover:underline underline-offset-2">
              Return to search
            </Link>{" "}
            and type a query to get started.
          </p>
        )}

      </div>
    </div>
  );
}

/*
  SearchSkeleton: three placeholder rows that mirror the real result rows.
  Same flex layout, same divider — just Cover-colored blocks where
  the text would be. Animated with the .skeleton CSS class.

  Matching the real layout during loading prevents a jarring reflow
  when results arrive: the page stays the same height, content just
  replaces the placeholders.
*/
function SearchSkeleton() {
  return (
    <div role="status" aria-label="Loading search results">
      <ul className="divide-y divide-faded-ink/20">
        {[72, 52, 64].map((titleWidth, i) => (
          <li key={i} className="flex items-start justify-between gap-4 py-4">
            <div className="flex-1 space-y-2.5">
              <span className="skeleton h-4" style={{ width: `${titleWidth}%` }} />
              <span className="skeleton h-3 w-2/5" />
              <span className="skeleton h-3 w-full" />
            </div>
            <span className="skeleton h-4 w-10 shrink-0 mt-0.5" />
          </li>
        ))}
      </ul>
      <p className="font-sans text-faded-ink text-xs mt-5 text-center">
        Searching&hellip;
      </p>
    </div>
  );
}

/*
  EmptyState: shown when the query returned 0 results.
  Not an error — just guidance. Faded Ink for the main message,
  with a secondary action to try again.
*/
function EmptyState({ query }) {
  return (
    <div className="py-16 text-center">
      <p className="font-sans text-parchment text-base mb-2">
        Nothing found{query ? ` for \u201c${query}\u201d` : ""}.
      </p>
      <p className="font-sans text-faded-ink text-sm leading-relaxed max-w-sm mx-auto mb-6">
        Try a different search, or{" "}
        <a
          href="https://chrome.google.com/webstore"
          className="text-lamp-green hover:underline underline-offset-2"
        >
          install the extension
        </a>{" "}
        to save more pages to your library.
      </p>
      <Link
        href="/"
        className="font-sans text-sm text-lamp-green hover:underline underline-offset-2"
      >
        Try a different search
      </Link>
    </div>
  );
}

/*
  ErrorState: shown when the fetch or query processing failed.
  Uses specific copy about what failed — never "Something went wrong."
  The ⚠ icon is Gold Leaf (warm, not alarming). The Retry button
  re-runs the useEffect by bumping retryCount.
*/
function ErrorState({ message, onRetry }) {
  return (
    <div className="py-12">
      <div className="flex items-start gap-3 mb-5">
        <span className="text-gold-leaf text-lg leading-none mt-0.5" aria-hidden="true">
          ⚠
        </span>
        <div>
          <p className="font-sans font-medium text-parchment text-sm mb-1">
            Search failed
          </p>
          <p className="font-sans text-faded-ink text-sm leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="
          bg-gold-leaf text-ink
          font-sans font-medium text-sm
          px-5 py-2.5 rounded-lg
          hover:bg-[#b8911f]
          transition-colors duration-200
        "
      >
        Retry
      </button>
    </div>
  );
}

/* ResultsList + ResultRow — identical to the previous version */
function ResultsList({ results }) {
  return (
    <ul role="list" className="divide-y divide-faded-ink/20">
      {results.map((page) => (
        <ResultRow key={page.id} page={page} />
      ))}
    </ul>
  );
}

function ResultRow({ page }) {
  return (
    <li className="flex items-start justify-between gap-4 flex-wrap py-4">
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-sans font-semibold text-parchment text-base leading-snug">
          {page.title}
        </p>
        <p className="font-sans text-xs text-faded-ink truncate">{page.url}</p>
        <p className="hidden sm:block font-sans text-sm text-parchment/80 leading-relaxed">
          {page.snippet}
        </p>
      </div>
      <div className="shrink-0 self-start mt-0.5">
        {page.saved ? (
          <span
            aria-label="Already saved"
            className="flex items-center gap-1 font-sans text-sm text-lamp-green select-none"
          >
            <span aria-hidden="true">✓</span> Saved
          </span>
        ) : (
          <button
            type="button"
            aria-label={`Save "${page.title}"`}
            className="font-sans text-sm font-medium text-gold-leaf hover:text-parchment transition-colors duration-150 cursor-pointer"
          >
            Save
          </button>
        )}
      </div>
    </li>
  );
}
