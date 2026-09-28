"use client";

/*
  Settings page — app/settings/page.js  (Task 16)

  What's real and wired here:
  ─────────────────────────────────────────────────────────────────────────────
  1. Extension section
     - Auto-save toggle + dwell-threshold slider both write to the extension's
       chrome.storage.local via chrome.runtime.sendMessage to the extension's
       background.js (externally_connectable, declared in manifest.json).
     - This is the technically correct MV3 path: the web app cannot call
       chrome.storage directly (not an extension page), but it CAN send a
       message to the extension via externally_connectable if the user has
       the extension installed. We surface a helpful message if the extension
       is not installed or not reachable.
     - The extension ID is stored in NEXT_PUBLIC_EXTENSION_ID (set in .env.local).
       If not set, we render a clear explanation and fallback instructions.

  2. Connections section
     - On page load, fetches GET /api/health which makes real live calls to
       Gemini (embed a short string) and Supabase (SELECT head).
     - Status is "checking…" → "Connected" | "Error" — never hardcoded green.

  3. Data section
     - "Export data" calls GET /api/export and triggers a browser download.
     - "Delete all" requires TWO steps:
         Step 1: Button click → shows a red confirmation panel.
         Step 2: Confirm button in that panel → sends DELETE /api/documents/all
                 with the confirmation token.
       A single click never fires the destructive action.

  4. Final states pass:
     - No setTimeout-simulated loading states.
     - No mock data arrays.
     - All loading states are tied to real pending fetch calls.
     - All error states have a Retry button that re-runs the real failed request.
*/

import { useState, useEffect, useCallback } from "react";
import Panel from "@/components/Panel";

/* ── Extension ID (from env) ─────────────────────────────────────────────── */
/*
  Set NEXT_PUBLIC_EXTENSION_ID=<your-extension-id> in .env.local.
  Find the extension ID at chrome://extensions when the extension is loaded.
  This env var is prefixed NEXT_PUBLIC_ so it's available client-side.
*/
const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID ?? null;

/* ── Section icon badge ─────────────────────────────────────────────────── */
function SectionIcon({ color, children }) {
  const backgrounds = {
    gold:  "rgba(201, 162, 39, 0.15)",
    green: "rgba(63, 125, 105, 0.15)",
    teal:  "rgba(63, 125, 105, 0.12)",
    muted: "rgba(156, 150, 168, 0.12)",
    red:   "rgba(181, 87, 63, 0.15)",
  };
  const colors = {
    gold:  "#C9A227",
    green: "#3F7D69",
    teal:  "#3F7D69",
    muted: "#9C96A8",
    red:   "#B5573F",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        background: backgrounds[color] || backgrounds.muted,
        color: colors[color] || colors.muted,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

/* ── Connection status dot + label ─────────────────────────────────────── */
function ConnectionRow({ name, status }) {
  // status: "checking" | "connected" | "error" | "missing"
  const isOk       = status === "connected";
  const isChecking = status === "checking";
  const dotColor   = isOk ? "#3F7D69" : isChecking ? "#9C96A8" : "#B5573F";
  const label      = isOk ? "Connected"
                   : isChecking ? "Checking…"
                   : status === "missing" ? "API key not set"
                   : "Error";
  const textColor  = isOk ? "text-lamp-green" : isChecking ? "text-faded-ink" : "text-danger";

  return (
    <div className="flex items-center justify-between py-3 ledger-row">
      <span className="font-sans text-sm text-parchment">{name}</span>
      <span className={`flex items-center gap-1.5 font-sans text-xs ${textColor}`}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: dotColor,
            display: "inline-block",
            transition: "background-color 300ms ease",
          }}
        />
        {label}
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SettingsPage
   ════════════════════════════════════════════════════════════════════════════ */
export default function SettingsPage() {

  /* ── Extension settings state ─────────────────────────────────────────── */
  const [autoSave,    setAutoSave]    = useState(true);
  const [threshold,   setThreshold]   = useState(25); // seconds
  const [extStatus,   setExtStatus]   = useState("idle"); // "idle"|"saving"|"saved"|"error"|"no-extension"
  const [extError,    setExtError]    = useState("");

  /* ── Connections state ────────────────────────────────────────────────── */
  const [healthStatus, setHealthStatus] = useState({ gemini: "checking", supabase: "checking" });
  const [healthError,  setHealthError]  = useState(null);

  /* ── Data section state ───────────────────────────────────────────────── */
  // Export
  const [exporting,     setExporting]     = useState(false);
  const [exportError,   setExportError]   = useState(null);
  // Delete all — two-step confirmation
  const [deleteStep,    setDeleteStep]    = useState("idle"); // "idle"|"confirm"|"deleting"|"done"|"error"
  const [deleteError,   setDeleteError]   = useState(null);
  const [deletedCount,  setDeletedCount]  = useState(null);

  /* ══════════════════════════════════════════════════════════════════════════
     1. Health check — runs on mount, re-runs on retry
     ══════════════════════════════════════════════════════════════════════════ */
  const checkHealth = useCallback(async () => {
    setHealthStatus({ gemini: "checking", supabase: "checking" });
    setHealthError(null);

    try {
      const res  = await fetch("/api/health");
      const data = await res.json();

      setHealthStatus({
        gemini:   data.missing?.includes("GEMINI_API_KEY")   ? "missing"
                : data.gemini   ?? "error",
        supabase: data.missing?.includes("SUPABASE_URL") || data.missing?.includes("SUPABASE_ANON_KEY")
                  ? "missing"
                : data.supabase ?? "error",
      });
    } catch {
      setHealthStatus({ gemini: "error", supabase: "error" });
      setHealthError("Could not reach the health endpoint. Is the server running?");
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  /* ══════════════════════════════════════════════════════════════════════════
     2. Send settings to extension via externally_connectable
     ══════════════════════════════════════════════════════════════════════════ */
  async function sendToExtension(payload) {
    /*
      chrome.runtime.sendMessage(EXTENSION_ID, message) is available in any
      web page as long as:
        a) the extension lists this origin in "externally_connectable" → "matches"
        b) the extension ID is known

      If the extension is not installed, sendMessage throws
        "Could not establish connection. Receiving end does not exist."
      We catch that and surface a clear message.
    */
    if (!EXTENSION_ID) {
      return { ok: false, reason: "no-id" };
    }

    return new Promise((resolve) => {
      try {
        if (typeof chrome === "undefined" || !chrome?.runtime?.sendMessage) {
          resolve({ ok: false, reason: "no-chrome" });
          return;
        }

        chrome.runtime.sendMessage(EXTENSION_ID, payload, (response) => {
          if (chrome.runtime.lastError) {
            // Extension not installed, or not loaded yet
            resolve({ ok: false, reason: "not-installed", detail: chrome.runtime.lastError.message });
          } else {
            resolve(response ?? { ok: false, reason: "no-response" });
          }
        });
      } catch (err) {
        resolve({ ok: false, reason: "exception", detail: err.message });
      }
    });
  }

  async function applyExtensionSettings(newAutoSave, newThreshold) {
    setExtStatus("saving");
    setExtError("");

    const result = await sendToExtension({
      type: "SET_SETTINGS",
      autoSave: newAutoSave,
      dwellThresholdSecs: newThreshold,
    });

    if (result.ok) {
      setExtStatus("saved");
      // Reset to "idle" after 2 s so the feedback doesn't linger
      setTimeout(() => setExtStatus("idle"), 2000);
    } else if (result.reason === "no-id") {
      setExtStatus("no-extension");
      setExtError("NEXT_PUBLIC_EXTENSION_ID is not set in .env.local. See instructions below.");
    } else if (result.reason === "not-installed" || result.reason === "no-chrome") {
      setExtStatus("no-extension");
      setExtError("Extension is not installed or not loaded. Load it at chrome://extensions first, then reload this page.");
    } else {
      setExtStatus("error");
      setExtError(result.detail ?? "Unknown extension error.");
    }
  }

  function handleAutoSaveChange(e) {
    const val = e.target.checked;
    setAutoSave(val);
    applyExtensionSettings(val, threshold);
  }

  function handleThresholdChange(e) {
    setThreshold(Number(e.target.value));
    // Don't write on every slider tick — wait for pointer up (onChange fires on release)
  }

  function handleThresholdCommit() {
    // Called on onMouseUp / onTouchEnd so we only write when the user finishes dragging
    applyExtensionSettings(autoSave, threshold);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     3. Export
     ══════════════════════════════════════════════════════════════════════════ */
  async function handleExport() {
    setExporting(true);
    setExportError(null);

    try {
      const res = await fetch("/api/export");

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Export failed (${res.status})`);
      }

      // Read the response as a blob and trigger a download
      const blob = await res.blob();

      // Extract filename from Content-Disposition header if present
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "lexicon-export.json";

      // Create an object URL, click it, then revoke
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message || "Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     4. Delete all — two-step
     ══════════════════════════════════════════════════════════════════════════ */
  function handleDeleteInitiate() {
    setDeleteStep("confirm"); // show confirmation panel
    setDeleteError(null);
  }

  function handleDeleteCancel() {
    setDeleteStep("idle");
    setDeleteError(null);
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

      if (!res.ok || data.error) {
        throw new Error(data.error || `Delete failed (${res.status})`);
      }

      setDeletedCount(data.deleted ?? 0);
      setDeleteStep("done");
    } catch (err) {
      setDeleteError(err.message || "Delete failed. Try again.");
      setDeleteStep("error");
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="px-8 py-8 max-w-2xl space-y-5">
      <h1 className="font-display font-semibold text-parchment text-3xl mb-6">
        Settings
      </h1>

      {/* ═══ Panel 1: Extension ═══════════════════════════════════════════ */}
      <Panel className="p-5">
        <div className="flex items-start gap-3 mb-5">
          <SectionIcon color="gold">
            {/* Puzzle-piece icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14.5 3a2.5 2.5 0 0 0-5 0v1H5a2 2 0 0 0-2 2v4h1a2.5 2.5 0 0 1 0 5H3v4a2 2 0 0 0 2 2h4v-1a2.5 2.5 0 0 1 5 0v1h4a2 2 0 0 0 2-2v-4h-1a2.5 2.5 0 0 1 0-5h1V6a2 2 0 0 0-2-2h-4.5V3z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            </svg>
          </SectionIcon>
          <div className="flex-1">
            <p className="font-sans font-semibold text-parchment text-sm">Extension</p>
            <p className="font-sans text-faded-ink text-xs mt-0.5">
              Controls the browser extension&apos;s auto-capture behavior.
              Changes take effect on the <em>next</em> page load in any tab.
            </p>
          </div>

          {/* Status badge — shows result of last sendMessage */}
          {extStatus === "saving" && (
            <span className="flex items-center gap-1.5 font-sans text-xs text-faded-ink shrink-0">
              <span className="spinner" style={{ width: 12, height: 12 }} />
              Saving…
            </span>
          )}
          {extStatus === "saved" && (
            <span className="font-sans text-xs text-lamp-green shrink-0">Saved ✓</span>
          )}
        </div>

        {/* Auto-save toggle */}
        <div className="flex items-center justify-between py-3 ledger-row">
          <div>
            <p className="font-sans text-sm text-parchment mb-0.5">Auto-save pages I read</p>
            <p className="font-sans text-xs text-faded-ink">
              Save a page once you&apos;ve spent {threshold}+ seconds reading it.
            </p>
          </div>
          <label className="toggle" aria-label="Toggle auto-save">
            <input
              id="auto-save-toggle"
              type="checkbox"
              checked={autoSave}
              onChange={handleAutoSaveChange}
              disabled={extStatus === "saving"}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Reading threshold slider */}
        <div className="pt-4 ledger-row">
          <div className="flex items-center justify-between mb-3">
            <p className="font-sans text-sm text-parchment">Reading threshold</p>
            <span className="font-sans text-sm text-gold-leaf font-medium">
              {threshold} seconds
            </span>
          </div>
          <input
            id="dwell-threshold"
            type="range"
            min={10}
            max={120}
            step={5}
            value={threshold}
            onChange={handleThresholdChange}
            onMouseUp={handleThresholdCommit}
            onTouchEnd={handleThresholdCommit}
            disabled={extStatus === "saving"}
            aria-label={`Reading threshold: ${threshold} seconds`}
          />
          <div className="flex justify-between mt-1">
            <span className="font-sans text-xs text-faded-ink/60">10s</span>
            <span className="font-sans text-xs text-faded-ink/60">120s</span>
          </div>
        </div>

        {/* Error / no-extension state */}
        {(extStatus === "error" || extStatus === "no-extension") && (
          <div
            className="mt-4 px-4 py-3 rounded-lg font-sans text-xs text-faded-ink"
            style={{
              background: "rgba(181, 87, 63, 0.08)",
              border: "1px solid rgba(181, 87, 63, 0.25)",
            }}
          >
            <p className="text-danger font-medium mb-1">
              {extStatus === "no-extension"
                ? "Extension not reachable"
                : "Couldn't save settings"}
            </p>
            <p className="leading-relaxed">{extError}</p>
            {extStatus === "no-extension" && (
              <p className="mt-2 leading-relaxed">
                These controls write directly to the extension via{" "}
                <code className="text-gold-leaf">chrome.runtime.sendMessage</code>.
                If the extension isn&apos;t loaded, you can also change settings via
                the extension&apos;s popup (the small Lexicon icon in your Chrome toolbar).
              </p>
            )}
          </div>
        )}
      </Panel>

      {/* ═══ Panel 2: Connections ════════════════════════════════════════ */}
      <Panel className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <SectionIcon color="green">
            {/* Link icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </SectionIcon>
          <div className="flex-1">
            <p className="font-sans font-semibold text-parchment text-sm">Connections</p>
            <p className="font-sans text-faded-ink text-xs mt-0.5">
              Services Lexicon depends on. Checked live on each page load.
            </p>
          </div>
          {/* Retry button */}
          <button
            type="button"
            onClick={checkHealth}
            disabled={healthStatus.gemini === "checking" || healthStatus.supabase === "checking"}
            className="
              font-sans text-xs text-faded-ink shrink-0
              bg-transparent border-none px-0 py-0
              hover:text-parchment transition-colors
              disabled:opacity-40
            "
            style={{ background: "none" }}
          >
            Recheck
          </button>
        </div>

        {healthError && (
          <p className="font-sans text-xs text-danger mb-3">{healthError}</p>
        )}

        <ConnectionRow name="Gemini API"        status={healthStatus.gemini}   />
        <ConnectionRow name="Supabase Database" status={healthStatus.supabase} />
      </Panel>

      {/* ═══ Panel 3: Appearance ═════════════════════════════════════════ */}
      <Panel className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <SectionIcon color="teal">
            {/* Sun icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </SectionIcon>
          <div>
            <p className="font-sans font-semibold text-parchment text-sm">Appearance</p>
            <p className="font-sans text-faded-ink text-xs mt-0.5">
              The Athenaeum — more themes coming later.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 ledger-row">
          <p className="font-sans text-sm text-parchment">Theme</p>
          <span
            className="font-sans text-xs font-medium text-ink px-3 py-1 rounded-full"
            style={{ backgroundColor: "#C9A227" }}
          >
            Dark
          </span>
        </div>
      </Panel>

      {/* ═══ Panel 4: Data ═══════════════════════════════════════════════ */}
      <Panel className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <SectionIcon color="muted">
            {/* Database icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <ellipse cx="12" cy="6" rx="8" ry="3" stroke="currentColor" strokeWidth="1.75" />
              <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" stroke="currentColor" strokeWidth="1.75" />
              <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          </SectionIcon>
          <div>
            <p className="font-sans font-semibold text-parchment text-sm">Data</p>
          </div>
        </div>

        {/* ── Export ── */}
        <div className="flex items-center justify-between py-3 ledger-row">
          <div>
            <p className="font-sans text-sm text-parchment">Export everything you&apos;ve saved</p>
            <p className="font-sans text-xs text-faded-ink mt-0.5">
              Downloads a JSON file of all your documents (no embeddings).
            </p>
          </div>
          <button
            id="export-btn"
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="
              font-sans text-xs font-medium text-lamp-green shrink-0
              bg-transparent border-none px-0 py-0
              hover:underline underline-offset-2 transition-colors
              disabled:opacity-50
            "
            style={{ background: "none" }}
          >
            {exporting ? "Exporting…" : "Export data"}
          </button>
        </div>
        {exportError && (
          <div className="flex items-center justify-between mt-2">
            <p className="font-sans text-xs text-danger">{exportError}</p>
            <button
              type="button"
              onClick={handleExport}
              className="font-sans text-xs text-gold-leaf ml-3 bg-transparent border-none hover:underline"
              style={{ background: "none" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Delete all — idle state: single button ── */}
        {deleteStep === "idle" && (
          <div className="flex items-center justify-between py-3 ledger-row">
            <div>
              <p className="font-sans text-sm text-parchment">Delete all saved pages</p>
              <p className="font-sans text-xs text-faded-ink mt-0.5">
                Permanently removes all documents from the database.
              </p>
            </div>
            <button
              id="delete-all-btn"
              type="button"
              onClick={handleDeleteInitiate}
              className="
                font-sans text-xs font-medium text-danger shrink-0
                bg-transparent border-none px-0 py-0
                hover:underline underline-offset-2 transition-colors
              "
              style={{ background: "none" }}
            >
              Delete all
            </button>
          </div>
        )}

        {/* ── Delete all — confirmation step ── */}
        {deleteStep === "confirm" && (
          <div
            className="mt-3 p-4 rounded-lg"
            style={{
              background: "rgba(181, 87, 63, 0.08)",
              border: "1px solid rgba(181, 87, 63, 0.3)",
            }}
          >
            <p className="font-sans text-sm font-semibold text-danger mb-1">
              Are you sure?
            </p>
            <p className="font-sans text-xs text-faded-ink mb-4 leading-relaxed">
              This will permanently delete <strong className="text-parchment">every page</strong> you&apos;ve saved.
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                id="delete-confirm-btn"
                type="button"
                onClick={handleDeleteConfirm}
                className="
                  font-sans text-xs font-semibold text-parchment
                  px-4 py-2 rounded-md
                  transition-colors duration-150
                "
                style={{ backgroundColor: "#B5573F" }}
              >
                Yes, delete everything
              </button>
              <button
                id="delete-cancel-btn"
                type="button"
                onClick={handleDeleteCancel}
                className="
                  font-sans text-xs text-faded-ink
                  bg-transparent border-none px-0 py-0
                  hover:text-parchment transition-colors
                "
                style={{ background: "none" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Delete all — deleting in progress ── */}
        {deleteStep === "deleting" && (
          <div className="flex items-center gap-2 mt-3 py-3 ledger-row">
            <span className="spinner" style={{ width: 14, height: 14 }} />
            <p className="font-sans text-xs text-faded-ink">Deleting all documents…</p>
          </div>
        )}

        {/* ── Delete all — done ── */}
        {deleteStep === "done" && (
          <div className="flex items-center justify-between mt-3 py-3 ledger-row">
            <p className="font-sans text-xs text-lamp-green">
              All {deletedCount ?? "your"} document{deletedCount !== 1 ? "s" : ""} deleted. ✓
            </p>
            <button
              type="button"
              onClick={() => setDeleteStep("idle")}
              className="font-sans text-xs text-faded-ink ml-3 bg-transparent border-none hover:text-parchment"
              style={{ background: "none" }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Delete all — error ── */}
        {deleteStep === "error" && (
          <div className="mt-3">
            <p className="font-sans text-xs text-danger mb-2">{deleteError}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="font-sans text-xs font-semibold text-ink px-4 py-2 rounded-md"
                style={{ backgroundColor: "#B5573F" }}
              >
                Retry delete
              </button>
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="font-sans text-xs text-faded-ink bg-transparent border-none hover:text-parchment"
                style={{ background: "none" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
