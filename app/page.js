"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Panel from "@/components/Panel";

function relativeTime(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins < 1)    return "Just now";
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days === 1)  return "Yesterday";
  if (days < 7)    return `${days} days ago`;
  return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {[0, 1, 2].map((i) => (
        <Panel key={i} className="p-6">
          <span className="skeleton h-8 w-16 block mb-2" />
          <span className="skeleton h-3 w-28 block" />
        </Panel>
      ))}
    </div>
  );
}

function RecentSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 rounded-xl bg-white/5 flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <span className="skeleton h-4 w-2/3 block" />
            <span className="skeleton h-3 w-1/3 block" />
          </div>
          <span className="skeleton h-3 w-16 block ml-4" />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [query, setQuery]         = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("01");

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
      const res  = await fetch("/api/documents?limit=5");
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
    loadStats();
    loadRecent();
  }, [loadStats, loadRecent]);

  function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q || isSearching) return;
    setIsSearching(true);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" :
    hour < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto relative">
      
      {/* ── Outer Floating Canvas Container (Matching User Reference Layout) ── */}
      <div className="glass-canvas rounded-[32px] p-8 md:p-12 relative overflow-visible border border-white/15 shadow-[0_32px_96px_-16px_rgba(0,0,0,0.85)]">
        
        {/* ── Floating 3D Graphic Popout Badges (Extending Past Container Borders) ── */}
        
        {/* Top-Left Popping Badge */}
        <div className="absolute -top-5 -left-4 z-20 animate-float">
          <div className="px-4 py-2 rounded-2xl bg-gradient-to-tr from-gold-leaf to-amber-300 text-ink font-display font-bold text-xs shadow-xl shadow-gold-leaf/30 flex items-center gap-2 border border-white/40">
            <span className="w-2.5 h-2.5 rounded-full bg-ink animate-ping" />
            <span>⚡ AI Knowledge Engine</span>
          </div>
        </div>

        {/* Top-Right Popping Badge */}
        <div className="absolute -top-5 -right-4 z-20 animate-float-reverse">
          <div className="px-4 py-2 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-500 text-white font-sans font-semibold text-xs shadow-xl shadow-purple-500/30 flex items-center gap-2 border border-white/30">
            <span>✨ Gemini 3.6 RAG</span>
          </div>
        </div>

        {/* Bottom-Right Popping Badge */}
        <div className="absolute -bottom-5 -right-4 z-20 animate-float">
          <div className="px-4 py-2 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-ink font-sans font-bold text-xs shadow-xl shadow-emerald-500/30 flex items-center gap-2 border border-white/40">
            <span>🔍 Hybrid Vector RRF</span>
          </div>
        </div>

        {/* ── Inner Header & Pill Navigation ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-parchment font-medium tracking-wide">
              Lexicon Portfolio v0.2
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-lamp-green" />
            <span className="text-xs text-faded-ink">Connected to Supabase + Gemini</span>
          </div>

          <div className="flex items-center gap-2">
            {["01", "02", "03"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === "02") router.push("/search");
                  if (tab === "03") router.push("/ask");
                }}
                className={`w-9 h-9 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                  activeTab === tab
                    ? "bg-gold-leaf text-ink shadow-lg shadow-gold-leaf/30 font-bold scale-105"
                    : "bg-white/5 text-faded-ink hover:bg-white/10 hover:text-parchment border border-white/10"
                }`}
              >
                {tab}
              </button>
            ))}

            <Link href="/settings" className="glass-pill px-4 py-1.5 text-xs font-medium ml-2">
              Settings ⚙️
            </Link>
          </div>
        </div>

        {/* ── Hero Headline Banner ── */}
        <div className="mb-10">
          <div className="inline-block px-3.5 py-1 rounded-full bg-gold-leaf/15 border border-gold-leaf/30 text-gold-leaf text-xs font-medium tracking-wider uppercase mb-4">
            {greeting} • Personal Knowledge Base
          </div>

          <h1 className="font-display font-bold text-parchment text-4xl md:text-6xl tracking-tight leading-[1.1] mb-4">
            Your Mind, <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-leaf via-amber-200 to-yellow-400">Infinite & Indexed.</span>
          </h1>

          <p className="font-sans text-faded-ink text-base md:text-lg max-w-2xl leading-relaxed">
            Auto-capture every article, paper, and insight you read. Search semantically, ask questions, and get cited answers grounded in your personal web history.
          </p>
        </div>

        {/* ── Quick-Ask Search Bar with Gold Glow ── */}
        <div className="relative mb-12">
          {/* Atmospheric Radial Glow */}
          <div
            aria-hidden="true"
            className="hero-glow pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] rounded-full"
            data-focused={isFocused ? "true" : "false"}
            style={{
              background: "radial-gradient(ellipse at center, rgba(229, 184, 52, 0.35) 0%, rgba(192, 38, 211, 0.15) 50%, transparent 70%)",
              zIndex: 0,
            }}
          />

          <form onSubmit={handleSearch} className="relative z-10 flex gap-3" role="search">
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-faded-ink"
                width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                id="dashboard-search"
                type="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Ask your library anything or search topics…"
                disabled={isSearching}
                className="
                  w-full bg-[#181424]/90 border border-white/20
                  text-parchment placeholder:text-faded-ink/60
                  font-sans text-base md:text-lg
                  pl-12 pr-12 py-4
                  rounded-2xl shadow-2xl
                  focus:border-gold-leaf/80 focus:ring-4 focus:ring-gold-leaf/15
                  transition-all duration-200
                  disabled:opacity-60
                "
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-faded-ink/60 bg-white/5 px-2 py-1 rounded border border-white/10 hidden sm:inline-block">
                ⌘K
              </span>
            </div>

            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="
                bg-gradient-to-r from-gold-leaf to-amber-400 text-ink
                font-sans font-bold text-base
                px-7 py-4 rounded-2xl shrink-0
                hover:shadow-lg hover:shadow-gold-leaf/30 hover:scale-[1.02]
                active:scale-95 transition-all duration-200
                disabled:opacity-50 disabled:hover:scale-100
                flex items-center gap-2 border border-amber-200/40
              "
            >
              {isSearching ? (
                <><span className="spinner" style={{ width: 16, height: 16 }} /><span>Searching…</span></>
              ) : (
                <><span>Ask AI</span><span className="text-lg">→</span></>
              )}
            </button>
          </form>

          {/* Quick Filter Pill Suggestions */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pl-2">
            <span className="text-xs text-faded-ink/70 font-medium">Quick Try:</span>
            {[
              "What is nuclear warfare?",
              "React Hooks & State",
              "Hybrid Vector Search",
              "Supabase Postgres pgvector",
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setQuery(tag);
                  router.push(`/search?q=${encodeURIComponent(tag)}`);
                }}
                className="text-xs text-parchment/80 bg-white/5 hover:bg-white/15 px-3 py-1 rounded-full border border-white/10 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* ── Stat Cards Strip ── */}
        {statsStatus === "loading" && <StatSkeleton />}

        {statsStatus === "error" && (
          <div className="p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
            <p className="text-xs text-red-300 font-medium">Couldn&apos;t load live stats from Supabase.</p>
            <button
              type="button"
              onClick={loadStats}
              className="text-xs font-semibold text-gold-leaf hover:underline"
            >
              Retry Connection
            </button>
          </div>
        )}

        {statsStatus === "success" && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            <Panel className="p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-3xl opacity-20 group-hover:scale-110 transition-transform">📚</div>
              <p className="font-display font-bold text-parchment text-4xl mb-1">
                {stats.totalSaved ?? 0}
              </p>
              <p className="font-sans text-xs text-faded-ink uppercase tracking-wider font-semibold">Total Pages Saved</p>
            </Panel>

            <Panel className="p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-3xl opacity-20 group-hover:scale-110 transition-transform">⚡</div>
              <p className="font-display font-bold text-gold-leaf text-4xl mb-1">
                {stats.savedThisWeek ?? 0}
              </p>
              <p className="font-sans text-xs text-faded-ink uppercase tracking-wider font-semibold">Saved This Week</p>
            </Panel>

            <Panel className="p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-3xl opacity-20 group-hover:scale-110 transition-transform">🧠</div>
              <p className="font-display font-bold text-lamp-green text-4xl mb-1">
                {stats.questionsAsked ?? "768-dim"}
              </p>
              <p className="font-sans text-xs text-faded-ink uppercase tracking-wider font-semibold">Gemini Vectors Indexed</p>
            </Panel>
          </div>
        )}

        {/* ── Features Architectural Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-gold-leaf/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gold-leaf/20 text-gold-leaf flex items-center justify-center font-bold text-lg mb-4">
              01
            </div>
            <h3 className="font-display font-semibold text-parchment text-lg mb-2">
              Dwell Auto-Capture
            </h3>
            <p className="font-sans text-xs text-faded-ink leading-relaxed">
              Extension monitors active visible dwell time (25s threshold). Clean text extracted via Mozilla Readability.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-400/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-lg mb-4">
              02
            </div>
            <h3 className="font-display font-semibold text-parchment text-lg mb-2">
              Hybrid Search (RRF)
            </h3>
            <p className="font-sans text-xs text-faded-ink leading-relaxed">
              Combines Postgres full-text keyword ranking with 768-dim Gemini vector similarity using Reciprocal Rank Fusion.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-lamp-green/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-lamp-green/20 text-lamp-green flex items-center justify-center font-bold text-lg mb-4">
              03
            </div>
            <h3 className="font-display font-semibold text-parchment text-lg mb-2">
              Cited RAG Answers
            </h3>
            <p className="font-sans text-xs text-faded-ink leading-relaxed">
              Gemini 3.6 Flash generates streaming answers strictly grounded in your saved pages with inline footnotes [1][2].
            </p>
          </div>
        </div>

        {/* ── Recently Saved Ledger Panel ── */}
        <Panel className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
            <div>
              <h2 className="font-display font-semibold text-parchment text-lg">
                Recently Saved Knowledge
              </h2>
              <p className="font-sans text-xs text-faded-ink">Latest articles captured into your personal library</p>
            </div>
            <Link
              href="/history"
              className="glass-pill px-4 py-2 text-xs font-semibold hover:bg-gold-leaf hover:text-ink transition-all"
            >
              View Full History →
            </Link>
          </div>

          <div className="p-2">
            {recentStatus === "loading" && <RecentSkeleton />}

            {recentStatus === "error" && (
              <div className="p-6 text-center">
                <p className="text-xs text-faded-ink mb-2">Couldn&apos;t load recent documents.</p>
                <button
                  type="button"
                  onClick={loadRecent}
                  className="text-xs font-semibold text-gold-leaf hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {recentStatus === "empty" && (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-2xl">
                  📖
                </div>
                <p className="font-display text-parchment text-base font-semibold">No pages saved yet</p>
                <p className="font-sans text-xs text-faded-ink max-w-sm mx-auto">
                  Load the Chrome extension unpacked, browse any website for 25 seconds, and your pages will automatically appear here!
                </p>
              </div>
            )}

            {recentStatus === "success" && (
              <div className="space-y-1">
                {recent.map((page) => (
                  <div
                    key={page.id}
                    onClick={() => router.push(`/search?q=${encodeURIComponent(page.title)}`)}
                    className="group cursor-pointer p-4 rounded-xl hover:bg-white/5 transition-all flex items-center justify-between gap-4 border border-transparent hover:border-white/10"
                  >
                    <div className="min-w-0 flex-1 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gold-leaf/10 border border-gold-leaf/20 flex items-center justify-center shrink-0 text-gold-leaf group-hover:scale-110 transition-transform">
                        📄
                      </div>
                      <div className="min-w-0">
                        <p className="font-sans font-semibold text-parchment text-sm leading-snug group-hover:text-gold-leaf transition-colors truncate">
                          {page.title}
                        </p>
                        <p className="font-sans text-xs text-faded-ink truncate mt-0.5">
                          {page.url.replace(/^https?:\/\//, "")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-sans text-xs text-faded-ink bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                        {relativeTime(page.created_at)}
                      </span>
                      <span className="text-gold-leaf text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

      </div>
    </div>
  );
}
