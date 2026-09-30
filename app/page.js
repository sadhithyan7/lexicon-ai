"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function relativeTime(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins < 1)    return "Just now";
  if (mins < 60)   return `${mins}m`;
  if (hours < 24)  return `${hours}h`;
  if (days === 1)  return "Yesterday";
  if (days < 7)    return `${days}d`;
  return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function RecentSkeleton() {
  return (
    <div className="space-y-0 border-t border-border mt-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center justify-between py-2 border-b border-border">
          <div className="space-y-1 flex-1 pr-4">
            <span className="skeleton h-3 w-1/3 block" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [stats, setStats]             = useState(null);
  const [statsStatus, setStatsStatus] = useState("loading");

  const [recent, setRecent]             = useState([]);
  const [recentStatus, setRecentStatus] = useState("loading");

  const loadStats = useCallback(async () => {
    setStatsStatus("loading");
    try {
      const res  = await fetch("/api/stats");
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setStats(data);
      setStatsStatus("success");
    } catch {
      setStatsStatus("error");
    }
  }, []);

  const loadRecent = useCallback(async () => {
    setRecentStatus("loading");
    try {
      const res  = await fetch("/api/documents?limit=10");
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      if (!data.documents || data.documents.length === 0) {
        setRecentStatus("empty");
      } else {
        setRecent(data.documents);
        setRecentStatus("success");
      }
    } catch {
      setRecentStatus("error");
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      await loadStats();
      if (!ignore) {
        await loadRecent();
      }
    }
    fetchData();
    return () => { ignore = true; };
  }, [loadStats, loadRecent]);

  function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q || isSearching) return;
    setIsSearching(true);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas font-sans text-primary">
      
      {/* ── MACRO HEADER REGION ── */}
      <div className="bg-canvas border-b border-border-strong px-6 md:px-10 py-6">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-semibold text-primary tracking-tight leading-none">
              Knowledge Engine
            </h1>
            <p className="text-[13px] text-secondary font-medium mt-1">
              Personal knowledge index, continuously captured and semantically structured.
            </p>
          </div>
          
          <div className="flex items-center gap-6 bg-surface border border-border px-4 py-2 rounded shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-muted uppercase tracking-widest">Network</span>
              <div className="flex items-center gap-1.5 text-[12px] text-primary font-mono font-medium mt-0.5">
                <span className="text-success text-[8px]">●</span> ONLINE
              </div>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-muted uppercase tracking-widest">Index Size</span>
              <div className="text-[12px] text-primary font-mono font-medium mt-0.5">
                {statsStatus === "success" ? stats.totalSaved ?? 0 : "—"} PAGES
              </div>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-muted uppercase tracking-widest">Embedding</span>
              <div className="text-[12px] text-primary font-mono font-medium mt-0.5">
                768-DIM
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUERY WORKSPACE ── */}
      <div className="bg-surface border-b border-border px-6 md:px-10 py-8 relative">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="max-w-[1400px] mx-auto relative z-10 flex flex-col items-center">
          
          <div className="w-full max-w-3xl">
            <div className="text-[10px] font-mono text-secondary uppercase tracking-widest font-semibold mb-2">
              Query Workspace
            </div>
            
            <form 
              onSubmit={handleSearch} 
              className="group border border-border-strong rounded bg-surface shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 transition-all flex flex-col"
              role="search"
            >
              <div className="flex items-center h-14 px-4 border-b border-border">
                <div className="text-muted font-mono text-[14px] mr-3">↳</div>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Query your knowledge base or synthesize an answer..."
                  className="w-full bg-transparent text-[15px] font-medium text-primary placeholder:text-muted h-full outline-none"
                />
              </div>
              
              <div className="flex items-center justify-between px-4 py-2 bg-canvas rounded-b">
                <div className="flex items-center gap-3 text-[11px] font-mono text-secondary">
                  <span className="flex items-center gap-1 border border-border bg-surface px-1.5 py-0.5 rounded-sm">
                    ⌘ K
                  </span>
                  <span>Hybrid RRF search active</span>
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !query.trim()}
                  className="text-[11px] font-mono text-white bg-accent px-3 py-1 rounded hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:hover:bg-accent flex items-center gap-2 font-medium"
                >
                  {isSearching ? <span className="spinner border-white/30 border-t-white w-3 h-3" /> : "EXECUTE"}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>

      {/* ── DATA & ARCHITECTURE REGION ── */}
      <div className="bg-canvas flex-1 px-6 md:px-10 py-8">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* ── ARCHIVAL INDEX (Data Core) ── */}
          <section className="lg:col-span-8 bg-surface border border-border rounded shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="px-5 py-3 border-b border-border bg-surface flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-primary font-semibold uppercase tracking-widest">
                  Archival Index
                </span>
                <span className="text-[10px] font-mono text-muted bg-canvas border border-border px-1.5 rounded-sm">
                  {statsStatus === "success" ? stats.totalSaved ?? 0 : "—"} TOTAL
                </span>
              </div>
              <Link href="/history" className="text-[11px] font-mono text-accent hover:text-accent-hover font-medium">
                → OPEN ARCHIVE
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto bg-surface relative">
              {recentStatus === "loading" && <div className="px-5"><RecentSkeleton /></div>}

              {recentStatus === "error" && (
                <div className="p-5 text-[12px] font-mono text-danger flex items-center justify-between">
                  <span>× ERROR LOADING DATA</span>
                  <button type="button" onClick={loadRecent} className="underline">Retry</button>
                </div>
              )}

              {recentStatus === "empty" && (
                <div className="p-10 text-center text-[12px] font-mono text-secondary">
                  NO DOCUMENTS INDEXED
                </div>
              )}

              {recentStatus === "success" && (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-surface border-b border-border z-10">
                    <tr className="text-[10px] font-mono text-muted uppercase tracking-widest">
                      <th className="font-medium py-2 px-5 w-[50%]">Document</th>
                      <th className="font-medium py-2 px-2 w-[20%]">Origin</th>
                      <th className="font-medium py-2 px-2 w-[15%]">Status</th>
                      <th className="font-medium py-2 px-5 text-right w-[15%]">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-[13px]">
                    {recent.map((page) => {
                      let domain = "";
                      try { domain = new URL(page.url).hostname.replace(/^www\./, ""); } catch { domain = page.url; }
                      
                      return (
                        <tr key={page.id} className="hover:bg-canvas transition-colors group cursor-pointer" onClick={() => router.push(`/search?q=${encodeURIComponent(page.title)}`)}>
                          <td className="py-2.5 px-5 max-w-0">
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-[10px] text-muted font-mono group-hover:text-accent transition-colors">↳</span>
                              <span className="font-medium text-primary group-hover:text-accent transition-colors truncate">
                                {page.title}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="text-[11px] font-mono text-secondary truncate">
                              {domain}
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-secondary">
                              <span className="text-accent">✓</span> INDEXED
                            </div>
                          </td>
                          <td className="py-2.5 px-5 text-right">
                            <div className="text-[11px] font-mono text-muted">
                              {relativeTime(page.created_at)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* ── SYSTEM ARCHITECTURE (Sidebar) ── */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Pipeline Panel */}
            <div className="bg-surface border border-border rounded shadow-sm">
              <div className="px-5 py-3 border-b border-border bg-canvas">
                <span className="text-[11px] font-mono text-primary font-semibold uppercase tracking-widest">
                  Processing Pipeline
                </span>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded border border-border-strong bg-canvas flex items-center justify-center text-[10px] font-mono text-primary shrink-0">
                      01
                    </div>
                    <div className="pt-0.5 pb-3 border-b border-border w-full">
                      <div className="text-[12px] font-semibold text-primary mb-0.5">CAPTURE</div>
                      <div className="text-[11px] font-mono text-secondary">25s passive dwell validation</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded border border-border-strong bg-canvas flex items-center justify-center text-[10px] font-mono text-primary shrink-0">
                      02
                    </div>
                    <div className="pt-0.5 pb-3 border-b border-border w-full">
                      <div className="text-[12px] font-semibold text-primary mb-0.5">INDEX</div>
                      <div className="text-[11px] font-mono text-secondary">768-dim embeddings + keywords</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded border border-border-strong bg-canvas flex items-center justify-center text-[10px] font-mono text-primary shrink-0">
                      03
                    </div>
                    <div className="pt-0.5 w-full">
                      <div className="text-[12px] font-semibold text-primary mb-0.5">SYNTHESIZE</div>
                      <div className="text-[11px] font-mono text-secondary">Grounded LLM generation</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Health Panel */}
            <div className="bg-surface border border-border rounded shadow-sm">
              <div className="px-5 py-3 border-b border-border bg-canvas flex items-center justify-between">
                <span className="text-[11px] font-mono text-primary font-semibold uppercase tracking-widest">
                  Subsystem Health
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-success">
                  ● ACTIVE
                </span>
              </div>
              <div className="p-4 flex flex-col gap-2 text-[11px] font-mono">
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-canvas border border-border">
                  <span className="text-secondary">pgvector cluster</span>
                  <span className="text-primary font-medium">✓</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-canvas border border-border">
                  <span className="text-secondary">llm endpoint</span>
                  <span className="text-primary font-medium">✓</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-canvas border border-border">
                  <span className="text-secondary">extension bridge</span>
                  <span className="text-primary font-medium">○ PROCESSING</span>
                </div>
              </div>
            </div>

          </aside>

        </div>
      </div>

    </div>
  );
}
