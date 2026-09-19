"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  /*
    Three pieces of state on the home page:
    1. isFocused: drives the glow opacity (same as before)
    2. query: controlled input value — we own the string so we can
       pass it to router.push on submit
    3. status: 'idle' | 'loading' — while 'loading', the button gives
       immediate feedback (200ms rule from the UX bar) before Next.js
       finishes preparing the next route
  */
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle");

  const isLoading = status === "loading";

  /*
    handleSearch: fires on button click or Enter key.
    Sets loading immediately (instant feedback), then navigates.
    The loading state shows on the button itself — the hero doesn't
    change, because the page transition happens almost instantly.
  */
  function handleSearch() {
    const q = query.trim();
    if (!q || isLoading) return;
    setStatus("loading");
    // router.push triggers navigation to /search; the loading state
    // on the button gives feedback during that transition
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <main className="min-h-screen bg-cover flex flex-col items-center justify-center px-5 sm:px-8">
      <div className="w-full max-w-xl flex flex-col items-center text-center gap-5 sm:gap-6">

        <h1 className="font-display font-semibold text-parchment leading-none tracking-tight text-[3.5rem] sm:text-[4.5rem]">
          Lexicon
        </h1>

        <p className="font-sans text-parchment text-base sm:text-lg leading-relaxed max-w-sm">
          Your personal knowledge library
        </p>

        <div className="relative w-full mt-2">
          {/* THE GLOW — glow brightens on focus, same as before */}
          <div
            aria-hidden="true"
            className="hero-glow pointer-events-none"
            data-focused={isFocused ? "true" : "false"}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(600px, 140%)",
              height: "220px",
              background:
                "radial-gradient(ellipse at center, #C9A227 0%, transparent 65%)",
              zIndex: 0,
            }}
          />

          <div className="relative z-10 flex gap-2">
            {/*
              Controlled input: value={query} + onChange keeps the
              string in React state so we can pass it to router.push.
              Without this, we'd need a ref to read the value on submit.
            */}
            <input
              id="hero-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search your saved pages, or ask a question…"
              disabled={isLoading}
              className="
                flex-1 min-w-0
                bg-ink border border-faded-ink
                text-parchment placeholder:text-faded-ink
                font-sans text-sm
                px-4 py-3
                rounded-lg
                focus-visible:border-gold-leaf
                transition-colors duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            />

            {/*
              The button has two states:
              - Idle: "Search" — primary action label
              - Loading: spinner + "Searching…" — immediate feedback
              Both use the same layout so the button doesn't resize.
            */}
            <button
              type="button"
              id="hero-search-btn"
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
              className="
                bg-gold-leaf text-ink
                font-sans font-medium text-sm
                px-5 py-3
                rounded-lg
                shrink-0
                hover:bg-[#b8911f]
                transition-colors duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center gap-2
              "
            >
              {isLoading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span>Searching…</span>
                </>
              ) : (
                "Search"
              )}
            </button>
          </div>
        </div>

        <p className="font-sans text-faded-ink text-sm leading-relaxed">
          Start typing to search your saved pages, or ask a question.
        </p>

      </div>
    </main>
  );
}
