"use client";

import { useState, useEffect } from "react";
import Panel from "@/components/Panel";

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function HistoryPage() {
  const [status, setStatus] = useState("loading");
  const [documents, setDocuments] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadDocs() {
      setStatus("loading");
      try {
        const res = await fetch("/api/documents?limit=100");
        const data = await res.json();
        if (!isMounted) return;

        if (!res.ok || data.error) {
          setStatus("error");
          return;
        }

        if (!data.documents || data.documents.length === 0) {
          setStatus("empty");
        } else {
          setDocuments(data.documents);
          setStatus("success");
        }
      } catch {
        if (isMounted) setStatus("error");
      }
    }

    loadDocs();
    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const groups = documents.reduce((acc, doc) => {
    const key = formatDate(doc.created_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      {/* ── Editorial Masthead Header ── */}
      <div className="mb-12 border-b border-white/10 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-block px-3.5 py-1 rounded-sm bg-terracotta/15 border border-terracotta/30 text-terracotta text-[10px] font-bold tracking-widest uppercase">
              ARCHIVE
            </div>
          </div>
          <h1 className="font-display font-medium text-parchment text-4xl md:text-5xl tracking-tight leading-none mb-3">
            Knowledge History
          </h1>
          <p className="font-sans text-sm text-faded-ink max-w-xl leading-relaxed">
            Chronological record of every web page captured by the Lexicon extension.
          </p>
        </div>

        {status === "success" && (
          <div className="px-4 py-2 border border-white/10 bg-canvas text-gold-leaf text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-2">
            <span>INDEX COUNT</span>
            <span className="text-parchment">— {documents.length}</span>
          </div>
        )}
      </div>

      {status === "loading" && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Panel key={i} className="p-6 rounded-none border-white/10">
              <span className="skeleton h-5 w-1/3 block mb-3" />
              <span className="skeleton h-12 w-full block" />
            </Panel>
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="p-8 text-center border border-danger/30 bg-danger/5">
          <p className="text-xs text-danger font-semibold mb-3 uppercase tracking-widest">Error Loading Archive</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="px-4 py-2 text-xs font-semibold text-parchment border border-white/20 hover:border-white/40 transition-colors uppercase tracking-widest bg-canvas"
          >
            Retry
          </button>
        </div>
      )}

      {status === "empty" && (
        <div className="p-12 text-center border border-white/10 bg-canvas">
          <div className="w-12 h-12 border border-white/10 flex items-center justify-center mx-auto text-xl mb-6 bg-cover text-faded-ink">
            📇
          </div>
          <h2 className="font-display font-medium text-parchment text-xl mb-2">
            Empty Archive
          </h2>
          <p className="font-sans text-xs text-faded-ink max-w-sm mx-auto leading-relaxed">
            Pages you read for 25+ seconds will automatically be captured and listed here.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-12">
          {Object.entries(groups).map(([dateLabel, docs]) => (
            <div key={dateLabel} className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="font-sans font-bold text-faded-ink text-[11px] tracking-[0.2em] uppercase">
                  {dateLabel}
                </h2>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              <Panel className="p-0 border-white/10 rounded-none bg-canvas overflow-hidden">
                <div className="divide-y divide-white/5">
                  {docs.map((doc, idx) => (
                    <div
                      key={doc.id}
                      className="p-5 hover:bg-white/[0.03] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="flex gap-4 items-start min-w-0 flex-1">
                         <span className="font-sans font-medium text-[10px] text-faded-ink/50 mt-1 w-6 shrink-0 font-variant-numeric">
                            {(idx + 1).toString().padStart(2, '0')}
                         </span>
                        <div className="min-w-0">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-display font-medium text-parchment text-lg group-hover:text-gold-leaf transition-colors leading-snug block mb-1"
                          >
                            {doc.title}
                          </a>
                          <span className="font-mono text-[10px] text-lamp-green uppercase tracking-wider block truncate">
                            {doc.url}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0 md:pl-4">
                        <span className="text-[11px] font-mono font-bold text-faded-ink uppercase tracking-wider border-l border-white/10 pl-6 py-2">
                          {formatTime(doc.created_at)}
                        </span>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 flex items-center justify-center border border-white/10 hover:border-gold-leaf/40 text-faded-ink hover:text-gold-leaf transition-colors shrink-0"
                          title="Open Archive"
                        >
                          ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
