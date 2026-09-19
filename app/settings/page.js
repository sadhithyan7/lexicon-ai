"use client";

/*
  Settings page — app/settings/page.js

  Layout per screenshot: 4 panels
  1. Extension — gold icon badge, auto-save toggle, reading threshold slider
  2. Connections — lamp-green icon badge, Gemini API + Supabase status (mock: Connected)
  3. Appearance — teal icon badge, Theme selector (Dark only for now)
  4. Data — neutral icon badge, Export data button

  All controls are wired to local state. Real wiring (extension messaging,
  live health checks) is Task 11.
*/

import { useState } from "react";
import Panel from "@/components/Panel";

/* ── Section icon badge ── */
function SectionIcon({ color, children }) {
  const backgrounds = {
    gold:   "rgba(201, 162, 39, 0.15)",
    green:  "rgba(63, 125, 105, 0.15)",
    teal:   "rgba(63, 125, 105, 0.12)",
    muted:  "rgba(156, 150, 168, 0.12)",
  };
  const colors = {
    gold:   "#C9A227",
    green:  "#3F7D69",
    teal:   "#3F7D69",
    muted:  "#9C96A8",
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

/* ── Connection status dot + label ── */
function ConnectionRow({ name, connected }) {
  return (
    <div className="flex items-center justify-between py-3 ledger-row">
      <span className="font-sans text-sm text-parchment">{name}</span>
      <span className={`flex items-center gap-1.5 font-sans text-xs ${connected ? "text-lamp-green" : "text-danger"}`}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: connected ? "#3F7D69" : "#B5573F",
            display: "inline-block",
          }}
        />
        {connected ? "Connected" : "Not connected"}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const [autoSave, setAutoSave]         = useState(true);
  const [threshold, setThreshold]       = useState(30);   // seconds
  const [geminiOk]                      = useState(true);  // mock: always connected
  const [supabaseOk]                    = useState(true);  // mock: always connected

  return (
    <div className="px-8 py-8 max-w-2xl space-y-5">
      <h1 className="font-display font-semibold text-parchment text-3xl mb-6">
        Settings
      </h1>

      {/* ── Panel 1: Extension ── */}
      <Panel className="p-5">
        <div className="flex items-start gap-3 mb-5">
          <SectionIcon color="gold">
            {/* Puzzle-piece icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14.5 3a2.5 2.5 0 0 0-5 0v1H5a2 2 0 0 0-2 2v4h1a2.5 2.5 0 0 1 0 5H3v4a2 2 0 0 0 2 2h4v-1a2.5 2.5 0 0 1 5 0v1h4a2 2 0 0 0 2-2v-4h-1a2.5 2.5 0 0 1 0-5h1V6a2 2 0 0 0-2-2h-4.5V3z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            </svg>
          </SectionIcon>
          <div>
            <p className="font-sans font-semibold text-parchment text-sm">Extension</p>
            <p className="font-sans text-faded-ink text-xs mt-0.5">
              Controls the browser extension&apos;s auto-capture behavior.
            </p>
          </div>
        </div>

        {/* Auto-save toggle */}
        <div className="flex items-center justify-between py-3 ledger-row">
          <div>
            <p className="font-sans text-sm text-parchment mb-0.5">Auto-save pages I read</p>
            <p className="font-sans text-xs text-faded-ink">
              Save a page once you&apos;ve spent 30+ seconds reading it.
            </p>
          </div>
          <label className="toggle" aria-label="Toggle auto-save">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
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
            type="range"
            min={10}
            max={120}
            step={5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            aria-label={`Reading threshold: ${threshold} seconds`}
          />
          <div className="flex justify-between mt-1">
            <span className="font-sans text-xs text-faded-ink/60">10s</span>
            <span className="font-sans text-xs text-faded-ink/60">120s</span>
          </div>
        </div>
      </Panel>

      {/* ── Panel 2: Connections ── */}
      <Panel className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <SectionIcon color="green">
            {/* Link / chain icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </SectionIcon>
          <div>
            <p className="font-sans font-semibold text-parchment text-sm">Connections</p>
            <p className="font-sans text-faded-ink text-xs mt-0.5">
              Services Lexicon depends on to run.
            </p>
          </div>
        </div>

        <ConnectionRow name="Gemini API"        connected={geminiOk}   />
        <ConnectionRow name="Supabase Database" connected={supabaseOk} />
      </Panel>

      {/* ── Panel 3: Appearance ── */}
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

      {/* ── Panel 4: Data ── */}
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

        <div className="flex items-center justify-between py-3 ledger-row">
          <p className="font-sans text-sm text-parchment">Export everything you&apos;ve saved</p>
          <button
            type="button"
            className="
              font-sans text-xs font-medium text-lamp-green
              bg-transparent border-none px-0 py-0
              hover:underline underline-offset-2 transition-colors
            "
            style={{ background: "none" }}
          >
            Export data
          </button>
        </div>
      </Panel>
    </div>
  );
}
