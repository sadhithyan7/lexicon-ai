/*
  background.js — Lexicon MV3 service worker (Task 15)
  =======================================================
  Handles CAPTURE messages from content scripts:
  1. Immediately attempts POST /api/save
  2. If the request fails (network error, worker killed mid-flight, etc.)
     persists the item to an outbox in chrome.storage.local
  3. Retries all outbox items on each service worker wake:
     - On chrome.runtime.onInstalled (browser start / extension update)
     - On chrome.alarms periodic tick (every 3 minutes)
  4. On success, sends a SAVED message back to the originating tab so
     content.js can show the corner toast

  ── Why the outbox matters ──
  MV3 service workers are killed after ~30 s of inactivity by Chrome.
  If the worker is killed between sendMessage and the fetch completing,
  the POST would be lost. The outbox queue persists through worker restarts.

  ── APP_URL ──
  Points to the Next.js dev server locally. Change to the deployed URL
  before publishing to the Chrome Web Store.
*/

"use strict";

const APP_URL = "http://localhost:3000";
const OUTBOX_KEY = "lexicon_outbox"; // chrome.storage.local key
const RETRY_ALARM = "lexicon_retry"; // chrome.alarms name

/* ── Lifecycle: register alarm on install / startup ──────────────────────── */

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Lexicon] Extension installed/updated.");
  // Create a repeating alarm to flush the outbox every 3 minutes.
  // chrome.alarms are the recommended MV3 mechanism for periodic background
  // work — they wake the service worker even after it's been killed.
  chrome.alarms.create(RETRY_ALARM, { periodInMinutes: 3 });
  // Also flush immediately in case there are pending items from a crash.
  flushOutbox();
});

chrome.runtime.onStartup.addListener(() => {
  // Fires when Chrome starts. Retry any items left over from last session.
  flushOutbox();
});

/* ── Alarm tick ───────────────────────────────────────────────────────────── */

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RETRY_ALARM) {
    flushOutbox();
  }
});

/* ── Internal message handler (from content scripts) ─────────────────────── */

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === "CAPTURE") {
    const item = {
      url:     msg.url,
      title:   msg.title,
      content: msg.content,
      tabId:   sender.tab?.id ?? null,
      // Unique ID so we can remove the exact item from the outbox on success.
      id:      `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
    // Attempt save immediately. If it fails, queue it.
    savePage(item);
  }
  // Return false — we don't send a synchronous response.
  return false;
});

/* ── External message handler (from the web app via externally_connectable) ─ */
/*
  The Settings page at localhost:3000 can call:
    chrome.runtime.sendMessage(EXTENSION_ID, {
      type: "SET_SETTINGS",
      autoSave: bool,
      dwellThresholdSecs: number,
    })
  and the extension will write those values to chrome.storage.local —
  the same keys that content.js reads on every page load.

  Why this approach?
  - chrome.storage is extension-only — the web page can't call it directly.
  - externally_connectable is the official MV3 mechanism for web→extension
    messaging. No content-script relay needed.
  - The manifest.json "externally_connectable" key lists the allowed origins.
*/
chrome.runtime.onMessageExternal.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "SET_SETTINGS") {
    sendResponse({ ok: false, error: "Unknown message type" });
    return false;
  }

  const updates = {};

  if (typeof msg.autoSave === "boolean") {
    updates.autoSave = msg.autoSave;
  }

  if (typeof msg.dwellThresholdSecs === "number" && msg.dwellThresholdSecs > 0) {
    updates.dwellThresholdSecs = msg.dwellThresholdSecs;
  }

  if (Object.keys(updates).length === 0) {
    sendResponse({ ok: false, error: "No valid settings fields provided" });
    return false;
  }

  chrome.storage.local.set(updates, () => {
    if (chrome.runtime.lastError) {
      console.error("[Lexicon] storage.set error:", chrome.runtime.lastError.message);
      sendResponse({ ok: false, error: chrome.runtime.lastError.message });
    } else {
      console.log("[Lexicon] Settings updated from web app:", updates);
      sendResponse({ ok: true });
    }
  });

  // Return true to indicate we'll call sendResponse asynchronously.
  return true;
});

/* ── Core save logic ─────────────────────────────────────────────────────── */

async function savePage(item) {
  const ok = await attemptPost(item);
  if (ok) {
    // Notify the tab so content.js can show the toast.
    notifyTab(item.tabId, item.url);
  } else {
    // Failed — persist to outbox for retry.
    await enqueue(item);
  }
}

async function attemptPost(item) {
  try {
    const res = await fetch(`${APP_URL}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url:     item.url,
        title:   item.title,
        content: item.content,
      }),
    });
    if (res.ok) {
      console.log(`[Lexicon] Saved: ${item.url}`);
      return true;
    }
    // 4xx errors (bad payload, auth, etc.) — don't retry, they will
    // keep failing. Log and drop.
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      console.warn(`[Lexicon] Non-retryable error ${res.status} for ${item.url}. Dropping.`);
      return true; // return true so we don't queue it forever
    }
    // 5xx or 429 — retryable.
    console.warn(`[Lexicon] Retryable error ${res.status} for ${item.url}.`);
    return false;
  } catch (err) {
    // Network failure, fetch rejected, worker killed mid-request.
    console.warn(`[Lexicon] Fetch failed for ${item.url}:`, err.message);
    return false;
  }
}

/* ── Outbox: persist → retry → clear ──────────────────────────────────────── */

async function enqueue(item) {
  const { [OUTBOX_KEY]: outbox = [] } = await chrome.storage.local.get(OUTBOX_KEY);
  // Deduplicate by URL — don't queue the same URL twice.
  if (outbox.some((o) => o.url === item.url)) return;
  outbox.push(item);
  await chrome.storage.local.set({ [OUTBOX_KEY]: outbox });
  console.log(`[Lexicon] Queued for retry: ${item.url} (outbox size: ${outbox.length})`);
}

async function flushOutbox() {
  const { [OUTBOX_KEY]: outbox = [] } = await chrome.storage.local.get(OUTBOX_KEY);
  if (outbox.length === 0) return;

  console.log(`[Lexicon] Flushing outbox — ${outbox.length} item(s)`);

  const remaining = [];
  for (const item of outbox) {
    const ok = await attemptPost(item);
    if (ok) {
      // Success — try to notify the tab (it may no longer be open).
      notifyTab(item.tabId, item.url);
    } else {
      remaining.push(item); // keep for next retry cycle
    }
  }

  await chrome.storage.local.set({ [OUTBOX_KEY]: remaining });

  if (remaining.length > 0) {
    console.log(`[Lexicon] ${remaining.length} item(s) still pending retry.`);
  } else {
    console.log("[Lexicon] Outbox cleared.");
  }
}

/* ── Tab notification ─────────────────────────────────────────────────────── */

function notifyTab(tabId, url) {
  if (tabId == null) return;
  chrome.tabs.sendMessage(tabId, { type: "SAVED", url }).catch(() => {
    // Tab may have been closed or navigated away — ignore.
  });
}
