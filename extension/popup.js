/*
  popup.js — all interaction logic for the Lexicon extension popup.

  No inline event handlers (MV3 CSP blocks them). All listeners are
  attached here, after DOMContentLoaded fires.

  Responsibilities:
  1. Read current tab's title + URL via chrome.tabs.query
  2. Inject a content script to count words on the page
  3. Restore the auto-save toggle from chrome.storage.local
  4. Handle "Save This Page" button: POST to /api/save, update button state
  5. Persist saved-URL state in chrome.storage.local (so the dot stays
     green if you re-open the popup on an already-saved page)
*/

/* ── Web app base URL — update this before deploying ── */
const APP_URL = "http://localhost:3000";

/* ── DOM refs ── */
const pageTitle   = document.getElementById("page-title");
const pageUrl     = document.getElementById("page-url");
const pageMeta    = document.getElementById("page-meta");
const saveBtn     = document.getElementById("save-btn");
const errorMsg    = document.getElementById("error-msg");
const statusDot   = document.getElementById("status-dot");
const statusLabel = document.getElementById("status-label");
const autoToggle  = document.getElementById("auto-save-toggle");

/* ── State ── */
let currentTab = null;
let currentContent = "";

/* ──────────────────────────────────────────────
   1. Init: populate page info when popup opens
────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentTab();
  await restoreToggle();
  attachListeners();
});

async function loadCurrentTab() {
  try {
    /*
      chrome.tabs.query returns the active tab in the current window.
      We need the activeTab permission for this.
    */
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    currentTab = tab;

    /* Populate title and URL immediately from the Tab object */
    pageTitle.textContent = tab.title || "(No title)";
    pageUrl.textContent   = tab.url   || "";

    /*
      Inject a tiny script into the page to count visible words.
      scripting.executeScript requires the "scripting" permission and
      activeTab, both declared in manifest.json.
    */
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          /*
            This function runs in the page context, not the extension context.
            Returns the word count of the visible body text.
          */
          const text = document.body?.innerText ?? "";
          const words = text.trim().split(/\s+/).filter(Boolean).length;
          return { words, content: text.slice(0, 5000) }; // cap at 5k chars for the save payload
        },
      });

      if (results?.[0]?.result) {
        const { words, content } = results[0].result;
        currentContent = content;
        pageMeta.textContent = `${words.toLocaleString()} words`;
      }
    } catch {
      /* scripting can fail on chrome:// or about: URLs — fail silently */
      pageMeta.textContent = "";
    }

    /* Check if this URL is already in our saved set */
    await checkIfAlreadySaved(tab.url);

  } catch (err) {
    showError("Couldn't read this page. Try reloading.");
  }
}

/*
  checkIfAlreadySaved: looks up the URL in chrome.storage.local.
  We store saved URLs as a Set (serialised as an array) under 'savedUrls'.
*/
async function checkIfAlreadySaved(url) {
  const { savedUrls = [] } = await chrome.storage.local.get("savedUrls");
  if (savedUrls.includes(url)) {
    setSavedState();
  }
}

/* ──────────────────────────────────────────────
   2. Auto-save toggle — restore from storage
────────────────────────────────────────────── */
async function restoreToggle() {
  const { autoSave = false } = await chrome.storage.local.get("autoSave");
  autoToggle.checked = autoSave;
}

/* ──────────────────────────────────────────────
   3. Event listeners
────────────────────────────────────────────── */
function attachListeners() {
  saveBtn.addEventListener("click", handleSave);
  autoToggle.addEventListener("change", handleToggleChange);
}

/* ──────────────────────────────────────────────
   4. Save handler — POST to /api/save
────────────────────────────────────────────── */
async function handleSave() {
  if (!currentTab) return;
  if (saveBtn.classList.contains("state-saved")) return; /* already saved */

  setSavingState();
  hideError();

  try {
    /*
      POST to the web app's /api/save route.
      This route doesn't exist yet — Task 9 will build it.
      For now: if the request fails (404), we show the error state.

      Payload matches what the API route will expect:
        url     — the full page URL
        title   — page <title>
        content — first ~5000 chars of body text (for embedding)
    */
    const response = await fetch(`${APP_URL}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url:     currentTab.url,
        title:   currentTab.title,
        content: currentContent,
      }),
    });

    if (!response.ok) {
      /*
        Specific error messages per status code so the user knows what to fix.
        The task asks for this — "not just 'something went wrong'".
      */
      if (response.status === 401) {
        throw new Error("Not authorised — check your extension is set up.");
      } else if (response.status === 429) {
        throw new Error("Rate limited — try again in a moment.");
      } else if (response.status === 404) {
        throw new Error("Save endpoint not ready yet — coming in Task 9.");
      } else {
        throw new Error(`Save failed (${response.status}).`);
      }
    }

    /* Success — persist URL to storage and flip the button */
    const { savedUrls = [] } = await chrome.storage.local.get("savedUrls");
    if (!savedUrls.includes(currentTab.url)) {
      await chrome.storage.local.set({ savedUrls: [...savedUrls, currentTab.url] });
    }

    setSavedState();

  } catch (err) {
    setIdleState();
    showError(err.message || "Couldn't save this page. Check your internet connection.");
  }
}

/* ──────────────────────────────────────────────
   5. Toggle handler — persist to storage
────────────────────────────────────────────── */
async function handleToggleChange() {
  await chrome.storage.local.set({ autoSave: autoToggle.checked });
}

/* ──────────────────────────────────────────────
   Button state helpers
────────────────────────────────────────────── */
function setSavingState() {
  saveBtn.className = "state-saving";
  saveBtn.textContent = "Saving…";
  saveBtn.disabled = true;
}

function setSavedState() {
  saveBtn.className = "state-saved";
  saveBtn.textContent = "Saved ✓";
  saveBtn.disabled = true;
  /* Update the status dot in the header */
  statusDot.classList.add("saved");
  statusLabel.textContent = "Saved";
}

function setIdleState() {
  saveBtn.className = "state-idle";
  saveBtn.textContent = "Save This Page";
  saveBtn.disabled = false;
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.add("visible");
}

function hideError() {
  errorMsg.textContent = "";
  errorMsg.classList.remove("visible");
}
