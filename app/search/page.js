"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Panel from "@/components/Panel";

const FILTERS = ["All Results", "Full-Text Search", "Vector Similarity", "Recent"];

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQ);
  const [activeFilter, setActiveFilter] = useState("All Results");
  const [status, setStatus] = useState(initialQ ? "loading" : "idle");
  const [results, setResults] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setQuery(initialQ);
  }, [initialQ]);

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
      } catch {
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
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* ── Glass Header Canvas ── */}
      <div className="glass-canvas rounded-3xl p-6 md:p-8 mb-8 border border-white/15 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-bold text-parchment text-3xl md:text-4xl mb-2">
              Hybrid Search Engine
            </h1>
            <p className="font-sans text-xs text-faded-ink">
              Ranked with Reciprocal Rank Fusion (RRF) across Postgres keyword matching & Gemini 768-dim embeddings.
            </p>
          </div>

          <button
            onClick={() => router.push(`/ask?q=${encodeURIComponent(query || "quantum")}`)}
            className="glass-pill px-4 py-2 text-xs font-semibold text-gold-leaf border-gold-leaf/30 hover:bg-gold-leaf hover:text-ink transition-all flex items-center gap-2"
          >
            <span>Ask AI Studio</span>
            <span>✨</span>
          </button>
        </div>

        {/* ── Search Bar Input ── */}
        <form onSubmit={handleSubmit} className="flex gap-3" role="search">
          <div className="relative flex-1">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-faded-ink pointer-events-none"
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your library semantically..."
              className="
                w-full bg-[#181424]/90 border border-white/20
                text-parchment placeholder:text-faded-ink/60
                font-sans text-base pl-11 pr-4 py-3.5 rounded-xl
                focus:border-gold-leaf focus:ring-2 focus:ring-gold-leaf/20
                transition-all
              "
            />
          </div>
          <button
            type="submit"
            className="
              bg-gold-leaf text-ink font-sans font-bold text-sm
              px-6 py-3.5 rounded-xl hover:bg-amber-300
              transition-all shadow-lg shadow-gold-leaf/20 shrink-0
            "
          >
            Search
          </button>
        </form>

        {/* ── Filter Pills ── */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeFilter === filter
                  ? "bg-gold-leaf/20 text-gold-leaf border border-gold-leaf/40 font-semibold"
                  : "bg-white/5 text-faded-ink hover:bg-white/10 hover:text-parchment border border-white/10"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results Container ── */}
      {status === "idle" && (
        <div className="glass-canvas rounded-3xl p-12 text-center border border-white/10">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-3xl mb-4">
            🔍
          </div>
          <h2 className="font-display font-semibold text-parchment text-xl mb-2">
            Ready to Search
          </h2>
          <p className="font-sans text-xs text-faded-ink max-w-md mx-auto">
            Type any topic, concept, or exact phrase in the search bar above to query your saved library.
          </p>
        </div>
      )}

      {status === "loading" && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Panel key={i} className="p-6">
              <span className="skeleton h-5 w-1/2 block mb-3" />
              <span className="skeleton h-3 w-1/3 block mb-4" />
              <span className="skeleton h-12 w-full block" />
            </Panel>
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="glass-canvas rounded-3xl p-8 text-center border border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-300 font-semibold mb-3">
            An error occurred while fetching search results.
          </p>
          <button
            onClick={retry}
            className="glass-pill px-5 py-2 text-xs font-semibold text-gold-leaf border-gold-leaf/40 hover:bg-gold-leaf hover:text-ink transition-all"
          >
            Retry Search
          </button>
        </div>
      )}

      {status === "empty" && (
        <div className="glass-canvas rounded-3xl p-12 text-center border border-white/10">
          <p className="font-display font-semibold text-parchment text-xl mb-2">
            No results found for &ldquo;{initialQ}&rdquo;
          </p>
          <p className="font-sans text-xs text-faded-ink max-w-md mx-auto mb-6">
            Try searching for broader keywords or save more web pages using the Lexicon Chrome Extension.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-faded-ink font-medium">
              Found {results.length} relevant document{results.length > 1 ? "s" : ""} for &ldquo;{initialQ}&rdquo;
            </span>
            <span className="text-xs text-lamp-green font-mono">
              RRF Hybrid Score Verified
            </span>
          </div>

          {results.map((res, idx) => (
            <Panel key={res.id || idx} className="p-6 group relative overflow-hidden">
              <div className="flex items-start justify-between gap-4 mb-2">
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display font-bold text-parchment text-lg md:text-xl group-hover:text-gold-leaf transition-colors leading-snug"
                >
                  {res.title}
                </a>
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-faded-ink hover:text-parchment transition-all shrink-0"
                  title="Open external URL"
                >
                  ↗
                </a>
              </div>

              <p className="font-sans text-xs text-lamp-green mb-4 truncate font-mono">
                {res.url}
              </p>

              <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-xs text-parchment/90 leading-relaxed font-sans">
                {res.snippet || res.content?.slice(0, 300) + "..."}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
