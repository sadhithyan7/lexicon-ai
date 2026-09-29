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
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* ── Glass Top Header ── */}
      <div className="glass-canvas rounded-3xl p-8 mb-8 border border-white/15 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-parchment text-3xl md:text-4xl mb-2">
            Knowledge History
          </h1>
          <p className="font-sans text-xs text-faded-ink">
            Chronological record of every web page captured by the Lexicon extension.
          </p>
        </div>

        {status === "success" && (
          <div className="px-4 py-2 rounded-full bg-gold-leaf/15 border border-gold-leaf/30 text-gold-leaf text-xs font-bold font-mono">
            {documents.length} Saved Page{documents.length > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {status === "loading" && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Panel key={i} className="p-6">
              <span className="skeleton h-5 w-1/3 block mb-3" />
              <span className="skeleton h-12 w-full block" />
            </Panel>
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="glass-canvas rounded-3xl p-8 text-center border border-red-500/20 bg-red-500/5">
          <p className="text-xs text-red-300 font-semibold mb-3">Couldn&apos;t load history pages.</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="glass-pill px-4 py-2 text-xs font-semibold text-gold-leaf"
          >
            Retry
          </button>
        </div>
      )}

      {status === "empty" && (
        <div className="glass-canvas rounded-3xl p-12 text-center border border-white/10">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-3xl mb-4">
            📚
          </div>
          <h2 className="font-display font-bold text-parchment text-xl mb-2">
            No Saved History Yet
          </h2>
          <p className="font-sans text-xs text-faded-ink max-w-sm mx-auto">
            Pages you read for 25+ seconds will automatically be captured and listed here!
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-8">
          {Object.entries(groups).map(([dateLabel, docs]) => (
            <div key={dateLabel} className="space-y-3">
              <h2 className="font-display font-bold text-gold-leaf text-sm tracking-wider uppercase px-2">
                {dateLabel}
              </h2>

              <Panel className="p-0 overflow-hidden">
                <div className="divide-y divide-white/5">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 hover:bg-white/5 transition-all flex items-center justify-between gap-4 group"
                    >
                      <div className="min-w-0 flex-1">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans font-semibold text-parchment text-sm group-hover:text-gold-leaf transition-colors truncate block"
                        >
                          {doc.title}
                        </a>
                        <span className="font-sans text-xs text-lamp-green truncate block font-mono mt-0.5">
                          {doc.url}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs font-mono text-faded-ink">
                          {formatTime(doc.created_at)}
                        </span>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-faded-ink hover:text-parchment transition-all"
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
