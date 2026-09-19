/*
  background.js — Lexicon MV3 service worker.

  In MV3, background pages are replaced by service workers. They are
  event-driven and can terminate when idle — do NOT store state in
  module-level variables that you expect to survive across events.

  Current role (Task 8): stub only.
  Task 9 will add:
    - Message listener: handles { type: 'SAVE_PAGE', payload } messages
      sent by content.js when dwell/scroll heuristics are met
    - Retry queue: IndexedDB-backed queue for failed POSTs (so pages
      are not lost if the user is offline when the heuristic fires)
*/

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Lexicon] Extension installed.");
});
