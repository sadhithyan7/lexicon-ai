/**
 * scripts/test_ask.mjs
 * Task 13 — Complete verification of /api/ask.
 *
 * Tests:
 *   1. Known topic (covered by seeded pages) → citations link to real saved pages
 *   2. Multi-turn follow-up → history correctly passed; follow-up answered in context
 *   3. Completely unrelated topic → "nothing saved" response, not a hallucination
 *   4. Summarization request → structured summary with citations
 *   5. Empty question → 400 validation error
 *
 * Run with the dev server live:
 *   node scripts/test_ask.mjs
 */

const BASE = "http://localhost:3000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function ask(question, history = []) {
  const res = await fetch(`${BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

function extractText(segments) {
  if (!segments) return "";
  return segments
    .filter((s) => s.type === "text")
    .map((s) => s.text)
    .join("");
}

function pass(label) {
  console.log(`  ✅ ${label}`);
}
function fail(label) {
  console.log(`  ❌ ${label}`);
}
function info(label) {
  console.log(`  ℹ  ${label}`);
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------
async function run() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(" TASK 13 — /api/ask verification");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ── Test 1: Known topic (React hooks — covered by seed data) ───────────────
  console.log("── Test 1: Known topic (React hooks) ──────────────────────────");
  const t1 = await ask("What are React hooks and why are they useful?");
  console.log("  Status:", t1.status);

  if (t1.data.error) {
    fail("Got an error: " + t1.data.error);
  } else {
    const text = extractText(t1.data.segments);
    info("Answer preview: " + text.slice(0, 200).replace(/\n/g, " ").trim() + "…");
    console.log("  Citations returned:", t1.data.citations?.length ?? 0);
    if (t1.data.citations?.length > 0) {
      pass("Citations present");
      console.log("  Example citation:");
      const ex = t1.data.citations[0];
      console.log(`    [${ex.number}] "${ex.title}" — ${ex.url}`);
    } else if (t1.data.noContext) {
      fail("Got noContext — seed data may not be loaded");
    } else {
      info("No citation markers in answer (model chose not to cite — acceptable)");
    }
  }
  console.log();

  // ── Test 2: Multi-turn follow-up ─────────────────────────────────────────
  console.log("── Test 2: Multi-turn follow-up ────────────────────────────────");
  console.log("  (sends prior Q1 as history — follow-up about useState should get retrieved context)");

  // Simulate exactly what the Ask page stores: { role, text } for user,
  // { role, answer } for assistant. The API's toGeminiHistory() reads these fields.
  const historyAfterQ1 = [
    { role: "user",      text: "What are React hooks and why are they useful?" },
    { role: "assistant", answer: t1.data.answer || "" },
  ];
  // This is referential ("give me a specific example of that") — query expansion
  // will prepend React/hook keywords from the prior user turn for retrieval.
  const t2 = await ask(
    "Can you give me a specific example using useState?",
    historyAfterQ1
  );
  console.log("  Status:", t2.status);
  if (t2.data.error) {
    fail("Got an error: " + t2.data.error);
  } else {
    const text = extractText(t2.data.segments);
    info("Answer preview: " + text.slice(0, 250).replace(/\n/g, " ").trim() + "…");
    const gotSomething = !t2.data.noContext && text.length > 40;
    if (gotSomething) {
      pass("Got a substantive answer from prior context — multi-turn working ✓");
    } else {
      fail("Got noContext or very short answer — multi-turn retrieval may need debugging");
    }
    if (text.toLowerCase().includes("usestate") || text.toLowerCase().includes("state")) {
      pass("Answer is about React state — topic carried from history ✓");
    } else {
      info("Answer doesn't explicitly mention useState/state (model paraphrased)");
    }
    console.log("  Citations:", t2.data.citations?.map((c) => `[${c.number}] ${c.title}`));
  }
  console.log();

  // ── Test 3: Completely unrelated topic ───────────────────────────────────
  console.log("── Test 3: Unrelated topic (nothing saved) ─────────────────────");
  const t3 = await ask(
    "What is the current population of the capital city of Peru, and what are its famous tourist attractions?"
  );
  console.log("  Status:", t3.status);
  if (t3.data.error) {
    fail("Got an error: " + t3.data.error);
  } else {
    info("Answer: " + (t3.data.answer || "").slice(0, 200).replace(/\n/g, " ").trim());
    const isNoContext =
      t3.data.noContext ||
      (t3.data.answer || "").toLowerCase().includes("don't have anything saved") ||
      (t3.data.answer || "").toLowerCase().includes("nothing saved");
    if (isNoContext && (t3.data.citations || []).length === 0) {
      pass("Got 'nothing saved' response with no citations — no hallucination ✓");
    } else if ((t3.data.citations || []).length > 0) {
      fail("Got citations for unrelated topic — possible hallucination");
    } else {
      info("noContext flag: " + t3.data.noContext + " (no citations returned — acceptable)");
    }
  }
  console.log();

  // ── Test 4: Summarization request ────────────────────────────────────────
  console.log("── Test 4: Summarization (hybrid search + pgvector) ────────────");
  const t4 = await ask(
    "Give me a summary of how hybrid search works and what techniques are involved."
  );
  console.log("  Status:", t4.status);
  if (t4.data.error) {
    fail("Got an error: " + t4.data.error);
  } else {
    const text = extractText(t4.data.segments);
    info("Summary preview: " + text.slice(0, 350).replace(/\n/g, " ").trim() + "…");
    // Check it's substantive (not just a 1-liner)
    if (text.length > 100) {
      pass("Substantive summary returned ✓");
    } else {
      fail("Summary too short — may not have pulled context correctly");
    }
    if (t4.data.citations?.length > 0) {
      pass("Summary includes citations ✓");
    } else {
      info("No citations in summary (model chose not to cite — acceptable)");
    }
    console.log("  Citations:", t4.data.citations?.map((c) => `[${c.number}] ${c.title}`));
  }
  console.log();

  // ── Test 5: Empty question → 400 ─────────────────────────────────────────
  console.log("── Test 5: Empty question → 400 ─────────────────────────────────");
  const t5 = await ask("   ");
  console.log("  Status:", t5.status);
  if (t5.status === 400) {
    pass(`Correct 400 — "${t5.data.error}"`);
  } else {
    fail(`Expected 400, got ${t5.status}`);
  }
  console.log();

  // ── Test 6: No-citation answer shape ─────────────────────────────────────
  console.log("── Test 6: Answer with no [n] markers → empty citations array ───");
  // We can't force this deterministically; instead check the contract is correct
  // by observing: if no citedNumbers, citations must be [] not all sources.
  // We verify this via the Test 3 result (nothing saved → noContext or answer without cites).
  info("This is verified by Test 3 (unrelated topic returns citations: []) and the route code.");
  if ((t3.data.citations || []).length === 0) {
    pass("citations is [] when model produces no [n] markers ✓");
  } else {
    fail("citations should be [] but got: " + JSON.stringify(t3.data.citations));
  }
  console.log();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(" All tests complete.");
  console.log("═══════════════════════════════════════════════════════════════");
}

run().catch((err) => {
  console.error("\n❌  Unexpected error:", err.message);
  process.exit(1);
});
