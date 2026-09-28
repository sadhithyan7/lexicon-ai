/*
  content.js — Lexicon MV3 content script (Task 15)
  =======================================================
  Injected into every page at document_idle (manifest.json).
  Works with Readability.js (loaded before this file in manifest) and
  talks to background.js via chrome.runtime.sendMessage.

  Parts:
  1. Dwell timer  — counts visible time only (Page Visibility + window blur/focus)
  2. Readability  — extracts article title + plain text from a document clone
  3. CAPTURE msg  — sends { type:'CAPTURE', url, title, content } to background.js
  4. SAVED msg    — receives { type:'SAVED' } → shows corner toast
  5. Corner toast — Shadow DOM element, fixed bottom-right, slides in/out
*/

(function () {
  "use strict";

  /* ── Guards ─────────────────────────────────────────────────────────────── */

  // Don't run on extension pages, DevTools, new-tab, etc.
  const SKIP_PROTOCOLS = ["chrome:", "chrome-extension:", "about:", "data:", "blob:"];
  if (SKIP_PROTOCOLS.some((p) => location.protocol === p)) return;

  // Only fire once per page load — not on history-API navigations within SPAs.
  // (MV3 re-injects the content script on hard navigations automatically.)
  let captured = false;

  /* ── 1. Dwell timer ─────────────────────────────────────────────────────── */
  /*
    Tracks accumulated VISIBLE time.
    - Pauses when document.visibilityState === 'hidden' (tab switch, minimise)
    - Pauses when window loses focus (user switches app)
    - Resumes on each visible/focus event
    Threshold is read from chrome.storage.local; falls back to 25 s if not set.
  */

  const DEFAULT_DWELL_MS = 25_000;
  let dwellThresholdMs = DEFAULT_DWELL_MS;
  let accumulated = 0;       // ms of visible time so far
  let segmentStart = null;   // Date.now() when the current visible segment began
  let dwellTimer = null;     // setTimeout handle

  // Load threshold from storage (set by Settings page, Task 16).
  chrome.storage.local.get("dwellThresholdSecs", ({ dwellThresholdSecs }) => {
    if (typeof dwellThresholdSecs === "number" && dwellThresholdSecs > 0) {
      dwellThresholdMs = dwellThresholdSecs * 1000;
    }
    // Kick off the timer machinery after we know the threshold.
    initDwellTimer();
  });

  function initDwellTimer() {
    // Start counting if we're already visible.
    if (document.visibilityState === "visible") {
      startSegment();
    }

    // Page Visibility API — fires when tab becomes hidden/visible.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        startSegment();
      } else {
        pauseSegment();
      }
    });

    // Window focus/blur — fires when the user switches OS applications.
    window.addEventListener("blur", pauseSegment);
    window.addEventListener("focus", () => {
      if (document.visibilityState === "visible") startSegment();
    });
  }

  function startSegment() {
    if (captured) return;
    if (segmentStart !== null) return; // already running
    segmentStart = Date.now();

    const remaining = dwellThresholdMs - accumulated;
    if (remaining <= 0) {
      triggerCapture();
      return;
    }
    dwellTimer = setTimeout(triggerCapture, remaining);
  }

  function pauseSegment() {
    if (segmentStart === null) return; // already paused
    accumulated += Date.now() - segmentStart;
    segmentStart = null;
    clearTimeout(dwellTimer);
    dwellTimer = null;
  }

  /* ── 2. Content extraction (Readability) ──────────────────────────────── */
  /*
    Run Mozilla Readability on a deep clone of the document.
    - Clone first so Readability's DOM mutations don't affect the live page.
    - If parse() returns null (non-article page), abort capture entirely.
    - Strip the article's HTML markup → plain text for embedding.
  */

  function extractArticle() {
    try {
      const docClone = document.cloneNode(true);

      // Readability is loaded as a separate content script (listed before
      // content.js in manifest.json "js" array) — it attaches to the
      // shared content-script global scope, so `Readability` is available here.
      const reader = new Readability(docClone); // eslint-disable-line no-undef
      const article = reader.parse();

      if (!article) return null; // not a parseable article

      // textContent is plain text without HTML tags — ideal for embedding.
      const text = article.textContent
        .replace(/\s+/g, " ")
        .trim();

      // Minimum length gate: ignore thin pages (search results, login pages…)
      if (text.length < 500) return null;

      return {
        title: (article.title || document.title || location.href).trim(),
        content: text,
      };
    } catch {
      return null;
    }
  }

  /* ── 3. CAPTURE — send to background.js ──────────────────────────────── */

  async function triggerCapture() {
    if (captured) return;
    captured = true; // flip before any await to prevent double-fire

    pauseSegment(); // stop the timer

    const article = extractArticle();
    if (!article) {
      // Non-article page — skip silently (no toast, no save).
      return;
    }

    try {
      chrome.runtime.sendMessage({
        type: "CAPTURE",
        url: location.href,
        title: article.title,
        content: article.content,
      });
      /*
        We do NOT await a response here.
        background.js will send a separate 'SAVED' message back to this tab
        once the POST succeeds (or it queues for retry). We listen below.
      */
    } catch {
      // Extension context can be invalidated if the extension is reloaded
      // while this page is open. Fail silently — the outbox retry in
      // background.js will handle any pending items.
    }
  }

  /* ── 4. Listen for SAVED acknowledgement from background.js ─────────── */

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "SAVED" && msg.url === location.href) {
      showToast();
    }
  });

  /* ── 5. Corner toast — Shadow DOM ────────────────────────────────────── */
  /*
    Why Shadow DOM?
    - The host page's CSS cannot leak in (their `* { color: red }` won't hit
      our toast elements).
    - Our styles cannot leak out and break the host page.
    - No need to fight specificity wars with the host stylesheet.

    Positioning: fixed, bottom-right via styles on the shadow host element.
    Animation: CSS keyframes inside the shadow, controlled by adding/removing
    a class on the inner element.
  */

  function showToast() {
    // Only one toast at a time.
    if (document.getElementById("__lexicon_toast_host__")) return;

    // ── Create shadow host ──
    const host = document.createElement("div");
    host.id = "__lexicon_toast_host__";
    Object.assign(host.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: "2147483647", // max z-index
      pointerEvents: "none",
      fontFamily: "sans-serif", // fallback, overridden inside shadow
    });
    document.body.appendChild(host);

    // ── Attach shadow root ──
    const shadow = host.attachShadow({ mode: "closed" });

    // ── Styles (scoped inside shadow) ──
    const style = document.createElement("style");
    style.textContent = `
      /* Design tokens (matching Athenaeum palette) */
      :host { all: initial; }

      .toast {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        border-radius: 8px;
        background-color: #16141C;        /* --ink */
        border: 1px solid rgba(156,150,168,0.18);
        box-shadow: 0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3);
        pointer-events: auto;
        user-select: none;
        cursor: default;
        white-space: nowrap;

        /* Slide-up + fade-in */
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 200ms ease, transform 200ms ease;
      }

      .toast.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .toast.hiding {
        opacity: 0;
        transform: translateY(12px);
      }

      .icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: #3F7D69;      /* --lamp-green */
      }

      .icon svg {
        display: block;
      }

      .label {
        font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.4;
        color: #EDE7D8;                  /* --parchment */
        letter-spacing: 0.01em;
      }
    `;

    // ── Toast element ──
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    // Checkmark icon
    const iconWrap = document.createElement("span");
    iconWrap.className = "icon";
    iconWrap.innerHTML = `
      <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
        <path d="M1 4.5L4 7.5L10 1" stroke="#EDE7D8" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    // Label
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = "Saved to Lexicon";

    toast.appendChild(iconWrap);
    toast.appendChild(label);
    shadow.appendChild(style);
    shadow.appendChild(toast);

    // ── Animation sequence ──
    // Trigger slide-in on the next frame (so transition fires).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add("visible");
      });
    });

    // Hold for 3 s, then slide out and remove.
    setTimeout(() => {
      toast.classList.remove("visible");
      toast.classList.add("hiding");
      setTimeout(() => {
        host.remove();
      }, 250); // slightly longer than transition duration
    }, 3200);
  }
})();
