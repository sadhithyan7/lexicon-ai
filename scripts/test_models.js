import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    console.log(process.env.GEMINI_API_KEY ? "Key exists" : "No key");
    // Unfortunately the JS SDK doesn't expose listModels easily without hitting REST directly.
    // Let's just fetch REST to see available models.
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    console.log(data.models.map(m => m.name).filter(n => n.includes('embed')));
}
listModels();
