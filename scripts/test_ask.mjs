/**
 * scripts/test_ask.mjs
 * Task 13 verification — tests /api/ask on the running Next.js dev server.
 *
 * Run: node scripts/test_ask.mjs
 */

const BASE = "http://localhost:3000";

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

async function run() {
  console.log("═══════════════════════════════════════════════════════");
  console.log(" TASK 13 — /api/ask tests");
  console.log("═══════════════════════════════════════════════════════\n");

  // ── Test 1: Known topic (covered by seeded pages) ────────────────────────
  console.log("── Test 1: Known topic (React hooks) ──");
  const t1 = await ask("What are React hooks and why are they useful?");
  console.log("Status:", t1.status);
  if (t1.data.error) console.error("ERROR:", t1.data.error);
  else {
    const text = extractText(t1.data.segments);
    console.log("Answer preview:", text.slice(0, 200).trim() + "…");
    console.log("Citations:", JSON.stringify(t1.data.citations, null, 2));
  }
  console.log();

  // ── Test 2: Follow-up (multi-turn — must reference Q1 context) ──────────
  console.log("── Test 2: Follow-up (multi-turn) ──");
  const priorHistory = [
    { role: "user", text: "What are React hooks and why are they useful?" },
    {
      role: "assistant",
      answer: t1.data.answer || "",
      segments: t1.data.segments || [],
      citations: t1.data.citations || [],
    },
  ];
  const t2 = await ask("Can you give me an example of useState specifically?", priorHistory);
  console.log("Status:", t2.status);
  if (t2.data.error) console.error("ERROR:", t2.data.error);
  else {
    const text = extractText(t2.data.segments);
    console.log("Answer preview:", text.slice(0, 200).trim() + "…");
    console.log("Citations:", t2.data.citations?.map((c) => `[${c.number}] ${c.title}`));
  }
  console.log();

  // ── Test 3: Completely unrelated topic (should get "nothing saved") ──────
  console.log("── Test 3: Unrelated topic (nothing saved) ──");
  const t3 = await ask("What is the capital of Peru and what is its population?");
  console.log("Status:", t3.status);
  if (t3.data.error) console.error("ERROR:", t3.data.error);
  else {
    console.log("noContext flag:", t3.data.noContext);
    console.log("Answer:", t3.data.answer);
  }
  console.log();

  // ── Test 4: Summarization request ────────────────────────────────────────
  console.log("── Test 4: Summarization (summarize React rendering) ──");
  const t4 = await ask("Give me a summary of how React renders components.");
  console.log("Status:", t4.status);
  if (t4.data.error) console.error("ERROR:", t4.data.error);
  else {
    const text = extractText(t4.data.segments);
    console.log("Summary preview:", text.slice(0, 300).trim() + "…");
    console.log("Citations:", t4.data.citations?.map((c) => `[${c.number}] ${c.title}`));
  }
  console.log();

  // ── Test 5: Empty question → 400 ─────────────────────────────────────────
  console.log("── Test 5: Empty question → 400 ──");
  const t5 = await ask("  ");
  console.log("Status:", t5.status, "(expect 400)");
  console.log("Error:", t5.data.error);
  console.log();

  console.log("═══════════════════════════════════════════════════════");
  console.log(" All tests complete.");
  console.log("═══════════════════════════════════════════════════════");
}

run().catch(console.error);
