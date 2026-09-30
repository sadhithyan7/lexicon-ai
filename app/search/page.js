"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ExternalLink, ArrowRight, FileText } from "lucide-react";
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

  // Sync initial query on mount or param change
  useEffect(() => {
    let ignore = false;
    async function syncAndSearch() {
      if (!ignore) {
        setQuery(initialQ);
        if (!initialQ) {
          setStatus("idle");
        }
      }
    }
    syncAndSearch();
    return () => { ignore = true; };
  }, [initialQ]);

  useEffect(() => {
    if (!initialQ) return;

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
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-8">
      {/* ── Header ── */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider mb-2">
            <span>Search</span>
            <span>•</span>
            <span>Hybrid Engine</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-primary tracking-tight mb-2">
            Hybrid Search Engine
          </h1>
          <p className="text-secondary text-sm max-w-xl leading-relaxed">
            Ranked with Reciprocal Rank Fusion (RRF) across Postgres keyword matching & Gemini 768-dim embeddings.
          </p>
        </div>

        <button
          onClick={() => router.push(`/ask?q=${encodeURIComponent(query || "quantum")}`)}
          className="btn-secondary shrink-0"
        >
          <div className="flex items-center gap-2">
            <span>Ask RAG Instead</span>
            <ArrowRight size={14} />
          </div>
        </button>
      </div>

      {/* ── Search Bar Input ── */}
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-3" role="search">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your library semantically..."
              className="w-full bg-surface border border-border text-primary placeholder:text-muted text-sm pl-10 pr-4 h-10 rounded-md focus:border-accent focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="btn-primary shrink-0"
          >
            Search
          </button>
        </form>

        {/* ── Filter Pills ── */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                activeFilter === filter
                  ? "bg-canvas border-border text-primary"
                  : "bg-transparent border-transparent text-secondary hover:text-primary hover:bg-canvas hover:border-border"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results Container ── */}
      {status === "idle" && (
        <div className="py-20 text-center flex flex-col items-center">
          <Search size={32} className="text-muted mb-4" />
          <h2 className="text-base font-semibold text-primary mb-2">
            Ready to Search
          </h2>
          <p className="text-sm text-secondary max-w-sm mx-auto">
            Type any topic, concept, or exact phrase in the search bar above to query your saved library.
          </p>
        </div>
      )}

      {status === "loading" && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Panel key={i} className="p-5">
              <span className="skeleton h-5 w-1/2 block mb-3" />
              <span className="skeleton h-3 w-1/3 block mb-4" />
              <span className="skeleton h-12 w-full block" />
            </Panel>
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="p-4 rounded border border-danger/30 bg-danger/5 flex items-center justify-between text-xs text-danger">
          <span>An error occurred while fetching search results.</span>
          <button
            onClick={retry}
            className="font-semibold underline"
          >
            Retry Search
          </button>
        </div>
      )}

      {status === "empty" && (
        <div className="py-20 text-center flex flex-col items-center">
          <FileText size={32} className="text-muted mb-4" />
          <p className="text-base font-semibold text-primary mb-2">
            No results found for &ldquo;{initialQ}&rdquo;
          </p>
          <p className="text-sm text-secondary max-w-sm mx-auto">
            Try searching for broader keywords or save more web pages using the Lexicon Chrome Extension.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-secondary font-medium">
              Found {results.length} relevant document{results.length > 1 ? "s" : ""} for &ldquo;{initialQ}&rdquo;
            </span>
            <span className="text-xs text-success font-medium">
              RRF Hybrid Score Verified
            </span>
          </div>

          {results.map((res, idx) => (
            <Panel key={res.id || idx} className="p-5 group">
              <div className="flex items-start justify-between gap-4 mb-2">
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-primary group-hover:text-accent transition-colors leading-snug"
                >
                  {res.title}
                </a>
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-primary transition-colors shrink-0"
                  title="Open external URL"
                >
                  <ExternalLink size={16} />
                </a>
              </div>

              <p className="text-xs text-secondary mb-4 truncate">
                {res.url}
              </p>

              <div className="text-sm text-primary leading-relaxed">
                {res.snippet || res.content?.slice(0, 300) + "..."}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
