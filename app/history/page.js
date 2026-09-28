"use client";

/*
  History page — app/history/page.js  (Task 16: final states pass)

  Fetches all saved documents from GET /api/documents, grouped by date.
  No mock data. Loading state uses skeletons tied to real fetch.
  Error state has a Retry button that re-runs the exact failed request.
*/

import { useState, useEffect, useCallback } from "react";
import Panel from "@/components/Panel";

/* ── Date grouping helper ───────────────────────────────────────────────── */
function groupByDate(documents) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo   = new Date(today.getTime() - 6 * 86_400_000); // 7 days including today

  const groups = new Map(); // label → items[]

  for (const doc of documents) {
    const d    = new Date(doc.created_at);
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    let label;
    if (date.getTime() === today.getTime()) {
      label = "Today";
    } else if (date.getTime() === yesterday.getTime()) {
      label = "Yesterday";
    } else if (date >= weekAgo) {
      label = "Earlier this week";
    } else {
      label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(doc);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

/* ── Format time for history rows ─────────────────────────────────────── */
function formatTime(isoString, label) {
  const d = new Date(isoString);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (label === "Today" || label === "Yesterday") return time;
  if (label === "Earlier this week") {
    return d.toLocaleDateString("en-US", { weekday: "short" }) + ", " + time;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Skeleton ───────────────────────────────────────────────────────────── */
function HistorySkeleton() {
  return (
    <Panel className="p-0 overflow-hidden">
      {[0, 1, 2].map((g) => (
        <div key={g}>
          <div className={`px-5 py-2.5 ${g > 0 ? "border-t border-faded-ink/10" : ""}`}>
            <span className="skeleton h-3 w-28 block" />
          </div>
          <ul>
            {[1, 2, 3].map((i) => (
              <li key={i} className="ledger-row px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1.5">
                  <span className="skeleton h-3.5 w-2/3 block" />
                  <span className="skeleton h-2.5 w-1/3 block" />
                </div>
                <span className="skeleton h-3 w-14 shrink-0 block" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HistoryPage
   ══════════════════════════════════════════════════════════════════════════ */
export default function HistoryPage() {
  const [documents, setDocuments] = useState([]);
  const [status,    setStatus]    = useState("loading"); // "loading"|"success"|"empty"|"error"
  const [groups,    setGroups]    = useState([]);

  const load = useCallback(async () => {
    setStatus("loading");

    try {
      // Fetch up to 200 most recent — if the user has more, they can use search
      const res  = await fetch("/api/documents?limit=200");
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || "Failed to load history");

      if (!data.documents || data.documents.length === 0) {
        setStatus("empty");
        setGroups([]);
      } else {
        setDocuments(data.documents);
        setGroups(groupByDate(data.documents));
        setStatus("success");
      }
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = documents.length;

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
        {status === "success" && (
          <span className="font-display font-semibold text-parchment text-2xl">
            {totalPages}
            <span className="font-sans font-normal text-faded-ink text-xs ml-1">pages</span>
          </span>
        )}
        {status === "loading" && (
          <span className="skeleton h-7 w-16 block rounded" />
        )}
      </div>

      {/* ── States ── */}
      {status === "loading" && <HistorySkeleton />}

      {status === "error" && (
        <Panel className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="#B5573F" strokeWidth="1.75" />
              <path d="M12 8v5M12 16v.5" stroke="#B5573F" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <div>
              <p className="font-sans font-medium text-parchment text-sm mb-1">Couldn&apos;t load history</p>
              <p className="font-sans text-faded-ink text-xs">Check your connection and try again.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="font-sans text-sm font-medium text-ink bg-gold-leaf px-4 py-2 rounded-md hover:bg-[#b8911f] transition-colors"
          >
            Retry
          </button>
        </Panel>
      )}

      {status === "empty" && (
        <Panel className="p-8 text-center">
          <p className="font-sans text-parchment text-sm mb-1">Nothing saved yet</p>
          <p className="font-sans text-faded-ink text-xs">
            Install the extension and browse for 25+ seconds on any article to save it here.
          </p>
        </Panel>
      )}

      {status === "success" && (
        <Panel className="p-0 overflow-hidden">
          {groups.map((group, gi) => (
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
                      <p className="font-sans font-medium text-parchment text-sm leading-snug truncate">
                        {item.title}
                      </p>
                      <p className="font-sans text-xs text-faded-ink truncate mt-0.5">
                        {item.url.replace(/^https?:\/\//, "")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-sans text-xs text-faded-ink">
                        {formatTime(item.created_at, group.label)}
                      </span>
                      {/* External link */}
                      <a
                        href={item.url}
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
      )}
    </div>
  );
}
