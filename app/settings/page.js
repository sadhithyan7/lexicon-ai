"use client";

import { useState, useEffect, useCallback } from "react";
import Panel from "@/components/Panel";

const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID ?? null;

function SectionIcon({ color, children }) {
  const backgrounds = {
    gold:  "transparent",
    green: "transparent",
    teal:  "transparent",
    muted: "transparent",
    red:   "transparent",
  };
  const colors = {
    gold:  "#E5B834",
    green: "#429B7F",
    teal:  "#429B7F",
    muted: "#A39BAE",
    red:   "#E0485C",
  };
  return (
    <span
      className="border border-white/10 flex items-center justify-center font-display italic text-lg"
      style={{
        width: 40,
        height: 40,
        background: backgrounds[color] || backgrounds.muted,
        color: colors[color] || colors.muted,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

function ConnectionRow({ name, status }) {
  const isOk       = status === "connected";
  const isChecking = status === "checking";
  const dotColor   = isOk ? "#429B7F" : isChecking ? "#A39BAE" : "#E0485C";
  const label      = isOk ? "Connected"
                   : isChecking ? "Checking…"
                   : status === "missing" ? "API Key Missing"
                   : "Error";
  const textColor  = isOk ? "text-lamp-green" : isChecking ? "text-faded-ink" : "text-danger";

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between py-5 border-b border-white/10 last:border-b-0 gap-2">
      <span className="font-sans text-sm text-parchment font-medium tracking-wide">{name}</span>
      <div className="flex items-center gap-3">
        <span
          className="inline-block w-2 h-2"
          style={{ backgroundColor: dotColor }}
        />
        <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${textColor}`}>{label}</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [autoSave, setAutoSave] = useState(true);
  const [dwellThreshold, setDwellThreshold] = useState(25);
  const [extStatus, setExtStatus] = useState("checking");
  const [extError, setExtError] = useState(null);

  const [geminiStatus, setGeminiStatus] = useState("checking");
  const [supabaseStatus, setSupabaseStatus] = useState("checking");
  const [healthChecking, setHealthChecking] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const [deleteStep, setDeleteStep] = useState("idle");
  const [deletedCount, setDeletedCount] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const checkHealth = useCallback(async () => {
    setHealthChecking(true);
    setGeminiStatus("checking");
    setSupabaseStatus("checking");

    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Health check failed");

      setGeminiStatus(data.gemini === "connected" ? "connected" : data.missing?.includes("GEMINI_API_KEY") ? "missing" : "error");
      setSupabaseStatus(data.supabase === "connected" ? "connected" : data.missing?.includes("SUPABASE_URL") || data.missing?.includes("SUPABASE_ANON_KEY") ? "missing" : "error");
    } catch {
      setGeminiStatus("error");
      setSupabaseStatus("error");
    } finally {
      setHealthChecking(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function runCheck() {
      await checkHealth();
    }
    runCheck();
    return () => { ignore = true; };
  }, [checkHealth]);

  const pingExtension = useCallback(() => {
    if (!EXTENSION_ID || typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      setExtStatus("missing");
      return;
    }

    try {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        { type: "GET_SETTINGS" },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            setExtStatus("unreachable");
            return;
          }
          setExtStatus("connected");
          if (typeof response.autoSave === "boolean") setAutoSave(response.autoSave);
          if (typeof response.dwellThresholdSecs === "number") setDwellThreshold(response.dwellThresholdSecs);
        }
      );
    } catch {
      setExtStatus("unreachable");
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    function runPing() {
      if (!ignore) pingExtension();
    }
    runPing();
    return () => { ignore = true; };
  }, [pingExtension]);

  function syncSettingToExtension(newAutoSave, newThreshold) {
    if (!EXTENSION_ID || typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return;

    try {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          type: "SET_SETTINGS",
          payload: {
            autoSave: newAutoSave,
            dwellThresholdSecs: newThreshold,
          },
        },
        (response) => {
          if (chrome.runtime.lastError || !response?.ok) {
            setExtError("Couldn't write setting to extension storage.");
          } else {
            setExtError(null);
          }
        }
      );
    } catch {
      setExtError("Extension communication failed.");
    }
  }

  function handleAutoSaveToggle(e) {
    const nextVal = e.target.checked;
    setAutoSave(nextVal);
    syncSettingToExtension(nextVal, dwellThreshold);
  }

  function handleThresholdChange(e) {
    const nextVal = parseInt(e.target.value, 10);
    setDwellThreshold(nextVal);
    syncSettingToExtension(autoSave, nextVal);
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lexicon-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message || "Failed to download export.");
    } finally {
      setExporting(false);
    }
  }

  function handleDeleteInitiate() {
    setDeleteStep("confirm");
  }

  function handleDeleteCancel() {
    setDeleteStep("idle");
  }

  async function handleDeleteConfirm() {
    setDeleteStep("deleting");
    setDeleteError(null);
    try {
      const res = await fetch("/api/documents/all", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE_ALL" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete.");

      setDeletedCount(data.count ?? null);
      setDeleteStep("done");
    } catch (err) {
      setDeleteError(err.message || "Failed to delete documents.");
      setDeleteStep("error");
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-[1000px] mx-auto space-y-12">
      {/* ── Editorial Masthead Header ── */}
      <div className="border-b border-white/10 pb-8">
        <div className="inline-block px-3 py-1 mb-4 bg-white/5 border border-white/10 text-faded-ink text-[10px] font-bold tracking-widest uppercase">
          PREFERENCES
        </div>
        <h1 className="font-display font-medium text-parchment text-4xl md:text-5xl mb-4 tracking-tight leading-none">
          Control Deck & Settings
        </h1>
        <p className="font-sans text-sm text-faded-ink max-w-xl leading-relaxed">
          Configure extension auto-capture rules, manage database connections, export backups, or reset saved data.
        </p>
      </div>

      {/* ── Section 1: Extension Controls ── */}
      <section className="pt-4">
        <div className="flex items-start gap-5 mb-8">
          <SectionIcon color="gold">E</SectionIcon>
          <div>
            <h2 className="font-display font-medium text-parchment text-2xl mb-1">
              Browser Extension Integration
            </h2>
            <p className="font-sans text-xs text-faded-ink uppercase tracking-widest">
              Auto-capture dwell detection settings synced directly with Chrome MV3 storage.
            </p>
          </div>
        </div>

        <div className="bg-canvas border border-white/10 p-6 md:p-8 space-y-8">
          {!EXTENSION_ID ? (
            <div className="p-5 border border-amber-500/30 bg-amber-500/5 text-xs text-amber-200 space-y-3">
              <p className="font-bold uppercase tracking-widest text-[10px]">NEXT_PUBLIC_EXTENSION_ID is not configured in .env.local</p>
              <p className="text-amber-200/70 leading-relaxed">
                To communicate directly with the extension, load it in Chrome at <code className="font-mono bg-black/20 px-1 py-0.5 border border-amber-500/20">chrome://extensions</code>, copy the 32-character ID, and add it to your <code className="font-mono bg-black/20 px-1 py-0.5 border border-amber-500/20">.env.local</code> file.
              </p>
            </div>
          ) : extStatus === "unreachable" || extStatus === "missing" ? (
            <div className="p-5 border border-white/10 bg-white/[0.02] text-xs text-faded-ink space-y-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <span className="leading-relaxed">Extension not detected on this page context. Sync active on popup click.</span>
              <button onClick={pingExtension} className="px-4 py-2 border border-white/20 text-parchment text-[10px] font-bold uppercase tracking-widest hover:border-white/40 transition-colors shrink-0">
                Re-check
              </button>
            </div>
          ) : null}

          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
              <div>
                <p className="font-sans font-medium text-parchment text-sm tracking-wide">Auto-save pages on dwell</p>
                <p className="font-sans text-[11px] text-faded-ink mt-1">
                  Automatically capture clean page content when visible dwell threshold is reached.
                </p>
              </div>
              <label className="toggle relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={autoSave} onChange={handleAutoSaveToggle} />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-leaf/80 border border-white/20"></div>
              </label>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <p className="font-sans font-medium text-parchment text-sm tracking-wide">Dwell capture threshold</p>
                <span className="font-mono text-[10px] font-bold text-gold-leaf border border-gold-leaf/30 px-3 py-1.5 uppercase tracking-widest">
                  {dwellThreshold} seconds
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={dwellThreshold}
                onChange={handleThresholdChange}
                className="w-full h-1 bg-white/10 appearance-none outline-none focus:bg-white/20 transition-colors slider-thumb"
              />
              <style jsx>{`
                input[type=range]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 16px;
                  height: 16px;
                  background: #E5B834;
                  cursor: pointer;
                  border-radius: 0;
                }
                input[type=range]::-moz-range-thumb {
                  width: 16px;
                  height: 16px;
                  background: #E5B834;
                  cursor: pointer;
                  border-radius: 0;
                  border: none;
                }
              `}</style>
              <p className="font-sans text-[11px] text-faded-ink">
                Timer pauses automatically when tab is hidden or window loses focus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Health Connections ── */}
      <section className="pt-4 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div className="flex items-start gap-5">
            <SectionIcon color="green">H</SectionIcon>
            <div>
              <h2 className="font-display font-medium text-parchment text-2xl mb-1">
                System Health Connections
              </h2>
              <p className="font-sans text-xs text-faded-ink uppercase tracking-widest">
                Live connection status to Gemini AI & Supabase Postgres pgvector.
              </p>
            </div>
          </div>

          <button
            onClick={checkHealth}
            disabled={healthChecking}
            className="px-6 py-3 border border-lamp-green/30 text-[10px] font-bold text-lamp-green uppercase tracking-[0.2em] hover:bg-lamp-green hover:text-ink transition-colors shrink-0 disabled:opacity-50"
          >
            {healthChecking ? "Probing..." : "Probe Now"}
          </button>
        </div>

        <div className="bg-canvas border border-white/10 p-6 md:p-8 space-y-2">
          <ConnectionRow name="Gemini AI (Embeddings + RAG)" status={geminiStatus} />
          <ConnectionRow name="Supabase Postgres (pgvector)" status={supabaseStatus} />
        </div>
      </section>

      {/* ── Section 3: Data Backup & Management ── */}
      <section className="pt-4 border-t border-white/10">
        <div className="flex items-start gap-5 mb-8">
          <SectionIcon color="muted">D</SectionIcon>
          <div>
            <h2 className="font-display font-medium text-parchment text-2xl mb-1">
              Data Management & Backup
            </h2>
            <p className="font-sans text-xs text-faded-ink uppercase tracking-widest">
              Export your full knowledge base or perform database reset actions.
            </p>
          </div>
        </div>

        <div className="bg-canvas border border-white/10 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4 border-b border-white/10">
            <div>
              <p className="font-sans font-medium text-parchment text-sm tracking-wide">Export Library (JSON)</p>
              <p className="font-sans text-[11px] text-faded-ink mt-1">Download full document text, titles, URLs, and metadata.</p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-6 py-3 border border-gold-leaf/30 text-[10px] font-bold text-gold-leaf uppercase tracking-[0.2em] hover:bg-gold-leaf hover:text-ink transition-colors shrink-0 disabled:opacity-50"
            >
              {exporting ? "Exporting..." : "Download Export"}
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4">
            <div>
              <p className="font-sans font-medium text-danger text-sm tracking-wide">Delete All Saved Pages</p>
              <p className="font-sans text-[11px] text-faded-ink mt-1">Permanently erase all indexed documents and vectors.</p>
            </div>

            {deleteStep === "idle" && (
              <button
                onClick={handleDeleteInitiate}
                className="px-6 py-3 border border-danger/30 text-[10px] font-bold text-danger uppercase tracking-[0.2em] hover:bg-danger hover:text-white transition-colors shrink-0"
              >
                Delete All Data
              </button>
            )}
          </div>

          {deleteStep === "confirm" && (
            <div className="p-6 border border-danger/30 bg-danger/5 space-y-5">
              <p className="font-sans text-xs text-danger font-medium leading-relaxed">
                <strong className="font-mono text-[10px] uppercase tracking-widest mr-2">Warning:</strong> Are you sure you want to permanently erase ALL documents? This action cannot be undone.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleDeleteConfirm}
                  className="px-6 py-3 bg-danger text-white font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-danger/80 transition-colors"
                >
                  Yes, Erase Everything
                </button>
                <button
                  onClick={handleDeleteCancel}
                  className="px-6 py-3 border border-white/20 text-parchment font-mono text-[10px] font-bold uppercase tracking-widest hover:border-white/40 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {deleteStep === "deleting" && (
            <div className="p-5 border border-white/10 bg-white/[0.02] text-xs text-faded-ink flex items-center gap-4">
              <span className="spinner w-4 h-4" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Erasing database records...</span>
            </div>
          )}

          {deleteStep === "done" && (
            <div className="p-5 border border-lamp-green/30 bg-lamp-green/5 text-xs text-lamp-green flex flex-col md:flex-row md:items-center justify-between gap-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Successfully erased {deletedCount ?? 0} document(s). ✓</span>
              <button onClick={() => setDeleteStep("idle")} className="font-mono text-[10px] font-bold uppercase tracking-widest border border-lamp-green/20 px-4 py-2 hover:bg-lamp-green/10 transition-colors shrink-0">
                Dismiss
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
