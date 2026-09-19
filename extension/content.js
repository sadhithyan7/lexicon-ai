/*
  content.js — Lexicon MV3 content script.

  Injected into every page at document_idle (declared in manifest.json).

  Current role (Task 8): stub only.
  Task 9 will add:
    - Dwell timer: tracks time-on-page, fires when >= 30 seconds
    - Scroll tracker: measures scroll depth, fires when >= 40%
    - Word count gate: only proceeds if >= 300 words on the page
    - When all three conditions are met: sends a message to background.js
        chrome.runtime.sendMessage({ type: 'SAVE_PAGE', payload: { ... } })
    - Deduplication: checks chrome.storage.local before sending to avoid
      sending the same URL twice
*/

/* Nothing to run yet — placeholder so the manifest reference resolves */
