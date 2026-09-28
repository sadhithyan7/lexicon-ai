"use client";

/*
  Dashboard — app/page.js  (Task 16: final states pass)

  All mock data removed. Real data fetched from:
  - GET /api/stats     → { totalSaved, savedThisWeek, questionsAsked }   [NEW]
    Actually: we derive stats from /api/search or supabase via a new stats endpoint
  - GET /api/documents → recent documents for "Recently saved" panel
  - GET /api/search?q= topics suggestion uses the real saved docs

  Loading states are tied to real pending fetch calls (no setTimeout simulation).
  Error states have a Retry button that re-runs the exact failed fetch.
*/

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Panel from "@/components/Panel";

/* ── Relative time helper ─────────────────────────────────────────────────── */
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

/* ── Stat skeleton ── */
function StatSkeleton() {
  return (
    <Panel className="p-5 mb-5 flex gap-0">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex-1 px-4 ${i > 0 ? "border-l border-faded-ink/15" : ""}`}>
          <span className="skeleton h-8 w-12 block mb-2" />
          <span className="skeleton h-3 w-20 block" />
        </div>
      ))}
    </Panel>
  );
}

/* ── Recent items skeleton ── */
function RecentSkeleton() {
  return (
    <ul role="list">
      {[1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="ledger-row px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <span className="skeleton h-3.5 w-2/3 block" />
            <span className="skeleton h-2.5 w-1/3 block" />
          </div>
          <span className="skeleton h-3 w-14 shrink-0 block" />
        </li>
      ))}
    </ul>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Dashboard
   ══════════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const router = useRouter();
  const [query, setQuery]         = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  /* ── Stats ── */
  const [stats, setStats]             = useState(null);
  const [statsStatus, setStatsStatus] = useState("loading"); // "loading"|"success"|"error"

  /* ── Recent pages ── */
  const [recent, setRecent]             = useState([]);
  const [recentStatus, setRecentStatus] = useState("loading"); // "loading"|"success"|"empty"|"error"

  /* ── Fetch stats ── */
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

  /* ── Fetch recent documents ── */
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
      {statsStatus === "loading" && <StatSkeleton />}

      {statsStatus === "error" && (
        <Panel className="p-5 mb-5">
          <div className="flex items-center justify-between">
            <p className="font-sans text-xs text-faded-ink">Couldn&apos;t load stats.</p>
            <button
              type="button"
              onClick={loadStats}
              className="font-sans text-xs text-gold-leaf bg-transparent border-none hover:underline"
              style={{ background: "none" }}
            >
              Retry
            </button>
          </div>
        </Panel>
      )}

      {statsStatus === "success" && stats && (
        <Panel className="p-5 mb-5 flex gap-0">
          {[
            { label: "Pages saved",    value: stats.totalSaved    ?? 0 },
            { label: "Saved this week", value: stats.savedThisWeek ?? 0 },
            { label: "Questions asked", value: stats.questionsAsked ?? "—" },
          ].map((stat, i) => (
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
      )}

      {/* ── Quick-ask card with glow ── */}
      <Panel className="p-5 mb-5 relative overflow-hidden">
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
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"
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

        {recentStatus === "loading" && <RecentSkeleton />}

        {recentStatus === "error" && (
          <div className="px-5 pb-5 flex items-center justify-between">
            <p className="font-sans text-xs text-faded-ink">Couldn&apos;t load recent pages.</p>
            <button
              type="button"
              onClick={loadRecent}
              className="font-sans text-xs text-gold-leaf bg-transparent border-none hover:underline ml-3"
              style={{ background: "none" }}
            >
              Retry
            </button>
          </div>
        )}

        {recentStatus === "empty" && (
          <div className="px-5 pb-5">
            <p className="font-sans text-xs text-faded-ink">
              Nothing saved yet. Install the extension and browse for 25+ seconds on a page.
            </p>
          </div>
        )}

        {recentStatus === "success" && (
          <ul role="list">
            {recent.map((page) => (
              <li
                key={page.id}
                className="ledger-row flex items-center justify-between gap-4 px-5 py-3 hover:bg-cover-raised/40 transition-colors duration-150"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-sans font-medium text-parchment text-sm leading-snug truncate">
                    {page.title}
                  </p>
                  <p className="font-sans text-xs text-faded-ink truncate mt-0.5">
                    {page.url.replace(/^https?:\/\//, "")}
                  </p>
                </div>
                <span className="font-sans text-xs text-faded-ink shrink-0">
                  {relativeTime(page.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
