/**
 * scripts/test_e2e.mjs
 * End-to-end test of Tasks 10-13 endpoints.
 * Run: node scripts/test_e2e.mjs
 */

const BASE = "http://localhost:3000";

const TEST_URL = "https://example.com/e2e-test-lexicon";
const TEST_TITLE = "Lexicon End-to-End Test Document";
const TEST_CONTENT = "This is a dummy document created for end-to-end testing of the Lexicon AI system. It contains unique keywords like ZYZZYVA and FLUMMOX to ensure search and ask endpoints can retrieve and reason about it. A ZYZZYVA is a type of weevil, and to FLUMMOX someone is to perplex them.";

async function run() {
  console.log("Starting E2E Test Suite...");
  
  // 1. Test /api/save (Task 11)
  console.log("\n1. Testing /api/save");
  let saveRes = await fetch(`${BASE}/api/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: TEST_URL,
      title: TEST_TITLE,
      content: TEST_CONTENT
    })
  });
  
  console.log("Status:", saveRes.status);
  let saveData = await saveRes.json();
  if (!saveRes.ok) {
    console.error("Save failed:", saveData);
  } else {
    console.log("Saved successfully:", saveData);
  }

  // 2. Test /api/save/check (Task 11)
  console.log("\n2. Testing /api/save/check");
  let checkRes = await fetch(`${BASE}/api/save/check?url=${encodeURIComponent(TEST_URL)}`);
  console.log("Status:", checkRes.status);
  let checkData = await checkRes.json();
  console.log("Check result:", checkData);
  if (!checkData.saved) console.error("Check failed to find saved doc");

  // 3. Test /api/search (Task 12)
  // Give Supabase a small moment to index if needed
  await new Promise(r => setTimeout(r, 1500));
  console.log("\n3. Testing /api/search");
  let searchRes = await fetch(`${BASE}/api/search?q=ZYZZYVA`);
  console.log("Status:", searchRes.status);
  let searchData = await searchRes.json();
  console.log(`Found ${searchData.results?.length || 0} results.`);
  const foundInSearch = searchData.results?.some(r => r.url === TEST_URL);
  if (foundInSearch) console.log("✅ Successfully found document via search.");
  else console.error("❌ Failed to find document via search.");

  // 4. Test /api/ask (Task 13)
  console.log("\n4. Testing /api/ask");
  let askRes = await fetch(`${BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "What is a ZYZZYVA according to the test document?", history: [] })
  });
  console.log("Status:", askRes.status);
  let askData = await askRes.json();
  if (!askRes.ok) {
    console.error("Ask failed:", askData);
  } else {
    const text = (askData.segments || [])
      .filter((s) => s.type === "text")
      .map((s) => s.text)
      .join("")
      .trim();
    console.log("Answer:", text);
    console.log("Citations:", askData.citations);
    
    if (text.toLowerCase().includes("weevil")) {
       console.log("✅ Ask successfully extracted facts from the document.");
    } else {
       console.error("❌ Ask failed to answer correctly based on the document.");
    }
  }

  console.log("\nE2E Test complete.");
}

run().catch(console.error);
