"use client";

import { useState, useEffect, useCallback } from "react";
import Panel from "@/components/Panel";

const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID ?? null;

function SectionIcon({ color, children }) {
  const backgrounds = {
    gold:  "rgba(229, 184, 52, 0.15)",
    green: "rgba(66, 155, 127, 0.15)",
    teal:  "rgba(66, 155, 127, 0.12)",
    muted: "rgba(163, 155, 174, 0.12)",
    red:   "rgba(224, 72, 92, 0.15)",
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
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 10,
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
    <div className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-b-0">
      <span className="font-sans text-sm text-parchment font-medium">{name}</span>
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full transition-colors"
          style={{ backgroundColor: dotColor, boxShadow: isOk ? "0 0 10px rgba(66, 155, 127, 0.6)" : "none" }}
        />
        <span className={`font-sans text-xs font-semibold ${textColor}`}>{label}</span>
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

      setGeminiStatus(data.gemini?.ok ? "connected" : data.gemini?.missing ? "missing" : "error");
      setSupabaseStatus(data.supabase?.ok ? "connected" : data.supabase?.missing ? "missing" : "error");
    } catch {
      setGeminiStatus("error");
      setSupabaseStatus("error");
    } finally {
      setHealthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
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
    pingExtension();
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
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      {/* ── Glass Top Header ── */}
      <div className="glass-canvas rounded-3xl p-8 border border-white/15">
        <h1 className="font-display font-bold text-parchment text-3xl md:text-4xl mb-2">
          Control Deck & Settings
        </h1>
        <p className="font-sans text-xs text-faded-ink">
          Configure extension auto-capture rules, manage database connections, export backups, or reset saved data.
        </p>
      </div>

      {/* ── Section 1: Extension Controls ── */}
      <Panel className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <SectionIcon color="gold">🧩</SectionIcon>
          <div>
            <h2 className="font-display font-bold text-parchment text-lg">
              Browser Extension Integration
            </h2>
            <p className="font-sans text-xs text-faded-ink">
              Auto-capture dwell detection settings synced directly with Chrome MV3 storage.
            </p>
          </div>
        </div>

        {!EXTENSION_ID ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-2 mb-6">
            <p className="font-semibold">NEXT_PUBLIC_EXTENSION_ID is not configured in .env.local</p>
            <p className="text-faded-ink">
              To communicate directly with the extension, load it in Chrome at <code className="text-gold-leaf font-mono">chrome://extensions</code>, copy the 32-character ID, and add it to your <code className="text-gold-leaf font-mono">.env.local</code> file.
            </p>
          </div>
        ) : extStatus === "unreachable" || extStatus === "missing" ? (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-faded-ink space-y-2 mb-6 flex items-center justify-between">
            <span>Extension not detected on this page context. Sync active on popup click.</span>
            <button onClick={pingExtension} className="text-gold-leaf hover:underline font-semibold">
              Re-check
            </button>
          </div>
        ) : null}

        <div className="space-y-6">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-sans font-semibold text-parchment text-sm">Auto-save pages on dwell</p>
              <p className="font-sans text-xs text-faded-ink mt-0.5">
                Automatically capture clean page content when visible dwell threshold is reached.
              </p>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={autoSave} onChange={handleAutoSaveToggle} />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-sans font-semibold text-parchment text-sm">Dwell capture threshold</p>
              <span className="font-mono text-xs font-bold text-gold-leaf bg-gold-leaf/10 px-2.5 py-1 rounded border border-gold-leaf/20">
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
            />
            <p className="font-sans text-xs text-faded-ink">
              Timer pauses automatically when tab is hidden or window loses focus.
            </p>
          </div>
        </div>
      </Panel>

      {/* ── Section 2: Health Connections ── */}
      <Panel className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-start gap-4">
            <SectionIcon color="green">⚡</SectionIcon>
            <div>
              <h2 className="font-display font-bold text-parchment text-lg">
                System Health Connections
              </h2>
              <p className="font-sans text-xs text-faded-ink">
                Live connection status to Gemini AI & Supabase Postgres pgvector.
              </p>
            </div>
          </div>

          <button
            onClick={checkHealth}
            disabled={healthChecking}
            className="glass-pill px-4 py-2 text-xs font-semibold text-lamp-green border-lamp-green/30 hover:bg-lamp-green hover:text-ink transition-all"
          >
            {healthChecking ? "Probing..." : "Probe Now"}
          </button>
        </div>

        <div className="space-y-1">
          <ConnectionRow name="Gemini AI (Embeddings + RAG)" status={geminiStatus} />
          <ConnectionRow name="Supabase Postgres (pgvector)" status={supabaseStatus} />
        </div>
      </Panel>

      {/* ── Section 3: Data Backup & Management ── */}
      <Panel className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <SectionIcon color="muted">💾</SectionIcon>
          <div>
            <h2 className="font-display font-bold text-parchment text-lg">
              Data Management & Backup
            </h2>
            <p className="font-sans text-xs text-faded-ink">
              Export your full knowledge base or perform database reset actions.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="font-sans font-semibold text-parchment text-sm">Export Library (JSON)</p>
              <p className="font-sans text-xs text-faded-ink">Download full document text, titles, URLs, and metadata.</p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="glass-pill px-4 py-2 text-xs font-semibold text-gold-leaf border-gold-leaf/30 hover:bg-gold-leaf hover:text-ink transition-all"
            >
              {exporting ? "Exporting..." : "Download Export"}
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-sans font-semibold text-red-400 text-sm">Delete All Saved Pages</p>
              <p className="font-sans text-xs text-faded-ink">Permanently erase all indexed documents and vectors.</p>
            </div>

            {deleteStep === "idle" && (
              <button
                onClick={handleDeleteInitiate}
                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-xs hover:bg-red-500 hover:text-white transition-all"
              >
                Delete All Data
              </button>
            )}
          </div>

          {deleteStep === "confirm" && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
              <p className="font-sans text-xs text-red-300 font-semibold">
                ⚠️ Confirm Deletion: Are you sure you want to permanently erase ALL documents?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all"
                >
                  Yes, Delete Everything
                </button>
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 rounded-lg bg-white/10 text-parchment font-semibold text-xs hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {deleteStep === "deleting" && (
            <div className="p-3 rounded-xl bg-white/5 text-xs text-faded-ink flex items-center gap-2">
              <span className="spinner" />
              <span>Erasing database records...</span>
            </div>
          )}

          {deleteStep === "done" && (
            <div className="p-3 rounded-xl bg-lamp-green/10 border border-lamp-green/30 text-xs text-lamp-green flex items-center justify-between">
              <span>Successfully erased {deletedCount ?? 0} document(s). ✓</span>
              <button onClick={() => setDeleteStep("idle")} className="font-semibold underline">
                Dismiss
              </button>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
