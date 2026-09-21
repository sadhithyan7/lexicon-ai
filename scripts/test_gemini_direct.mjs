/**
 * scripts/test_gemini_direct.mjs
 * Directly tests Gemini API connectivity with both models.
 * Run: node scripts/test_gemini_direct.mjs
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync } from "fs";
import { join } from "path";

// Read env manually since we're outside Next.js
const envPath = join(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key?.trim()) env[key.trim()] = rest.join("=").trim();
}

const GEMINI_API_KEY = env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("No GEMINI_API_KEY found in .env.local");
  process.exit(1);
}

async function testModel(modelName) {
  console.log(`\nTesting model: ${modelName}`);
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say 'hello' in one word.");
    const text = result.response.text();
    console.log(`✅ SUCCESS — Response: "${text.slice(0, 100)}"`);
    return true;
  } catch (err) {
    console.log(`❌ ERROR — Status: ${err.status}, Message: ${err.message}`);
    return false;
  }
}

async function testEmbedding(modelName) {
  console.log(`\nTesting embedding model: ${modelName}`);
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    const res = await model.embedContent({
      content: { parts: [{ text: "test" }] },
      outputDimensionality: 768,
    });
    console.log(`✅ SUCCESS — Embedding length: ${res.embedding.values.length}`);
    return true;
  } catch (err) {
    console.log(`❌ ERROR — Status: ${err.status}, Message: ${err.message}`);
    return false;
  }
}

async function run() {
  console.log("═══════════════════════════════════════════");
  console.log(" Direct Gemini API diagnostics");
  console.log("═══════════════════════════════════════════");

  // Test generative models
  await testModel("gemini-2.0-flash");
  await testModel("gemini-3.6-flash");
  await testModel("gemini-2.0-flash-lite");

  // Test embedding model
  await testEmbedding("gemini-embedding-2");

  console.log("\n═══════════════════════════════════════════");
}

run().catch(console.error);
