/**
 * scripts/test_ask_single.mjs
 * Single focused test for /api/ask — waits 2 minutes then fires
 * to avoid Gemini RPM rate limits from previous test runs.
 *
 * Run: node scripts/test_ask_single.mjs
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

async function run() {
  console.log("Waiting 90s for Gemini rate-limit window to reset...");
  await new Promise((r) => setTimeout(r, 90000));

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(" TASK 13 — /api/ask focused tests");
  console.log("═══════════════════════════════════════════════════════\n");

  // Test 1: Known topic
  console.log("── Test 1: Known topic (React hooks) ──");
  const t1 = await ask("What are React hooks and why are they useful?");
  console.log("Status:", t1.status);
  if (t1.data.error) {
    console.error("ERROR:", t1.data.error);
  } else {
    const text = (t1.data.segments || [])
      .filter((s) => s.type === "text")
      .map((s) => s.text)
      .join("")
      .slice(0, 300)
      .trim();
    console.log("Answer preview:", text + "…");
    console.log("Citations:", JSON.stringify(t1.data.citations, null, 2));
  }
  console.log();

  // Wait a moment between calls
  await new Promise((r) => setTimeout(r, 5000));

  // Test 2: Multi-turn follow-up
  console.log("── Test 2: Multi-turn follow-up ──");
  const priorHistory = t1.data.error
    ? []
    : [
        { role: "user", text: "What are React hooks and why are they useful?" },
        {
          role: "assistant",
          answer: t1.data.answer || "",
          segments: t1.data.segments || [],
          citations: t1.data.citations || [],
        },
      ];
  const t2 = await ask(
    "Can you show me an example of useState specifically?",
    priorHistory
  );
  console.log("Status:", t2.status);
  if (t2.data.error) {
    console.error("ERROR:", t2.data.error);
  } else {
    const text = (t2.data.segments || [])
      .filter((s) => s.type === "text")
      .map((s) => s.text)
      .join("")
      .slice(0, 300)
      .trim();
    console.log("Follow-up answer:", text + "…");
  }
  console.log();

  await new Promise((r) => setTimeout(r, 3000));

  // Test 3: Completely unrelated topic
  console.log("── Test 3: Unrelated topic (capital of Peru) ──");
  const t3 = await ask("What is the capital city of Peru and its population?");
  console.log("Status:", t3.status);
  if (t3.data.error) {
    console.error("ERROR:", t3.data.error);
  } else {
    console.log("noContext:", t3.data.noContext);
    console.log("Answer:", t3.data.answer);
  }
  console.log();

  await new Promise((r) => setTimeout(r, 3000));

  // Test 4: Summarization
  console.log("── Test 4: Summarization ──");
  const t4 = await ask("Give me a summary of how React renders components.");
  console.log("Status:", t4.status);
  if (t4.data.error) {
    console.error("ERROR:", t4.data.error);
  } else {
    const text = (t4.data.segments || [])
      .filter((s) => s.type === "text")
      .map((s) => s.text)
      .join("")
      .slice(0, 300)
      .trim();
    console.log("Summary preview:", text + "…");
    console.log("Citations:", t4.data.citations?.map((c) => `[${c.number}] ${c.title}`));
  }
  console.log();

  // Test 5: Empty question → 400
  console.log("── Test 5: Empty question → 400 ──");
  const t5 = await ask("   ");
  console.log("Status:", t5.status, "(expect 400)");
  console.log("Error:", t5.data.error);
  console.log();

  console.log("═══════════════════════════════════════════════════════");
  console.log(" Done.");
  console.log("═══════════════════════════════════════════════════════");
}

run().catch(console.error);
