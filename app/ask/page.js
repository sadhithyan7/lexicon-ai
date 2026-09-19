"use client";

/*
  Ask page — app/ask/page.js

  Layout per screenshot:
  - Scrolling message thread (user messages right-aligned, answers left/full-width)
  - Gemini answers with inline citation superscripts and a Sources footnote block
  - Input bar pinned to the bottom of the viewport
  - "Ask a follow-up" persists the conversation so far

  This is a full chat UI — messages accumulate in a `messages` array.
  Each message is { role: 'user' | 'assistant', content, sources? }.
*/

import { useState, useRef, useEffect } from "react";
import Panel from "@/components/Panel";

/* ── Mock answer structure ── */
const MOCK_RESPONSE = {
  content: [
    { type: "text", text: "Vector search finds results by semantic similarity — it embeds your query and compares it against stored embeddings, so it's good at matching meaning even when the wording differs" },
    { type: "cite", n: 1 },
    { type: "text", text: ". Its weak point is exact strings: an error code or a specific function name can get buried under semantically-similar but wrong results.\n\nKeyword search (BM25) is the opposite — strong on exact terms, weak on paraphrase" },
    { type: "cite", n: 2 },
    { type: "text", text: ". Hybrid search runs both and merges the ranked lists with reciprocal rank fusion, so a result can surface either because the wording matches or because the meaning does" },
    { type: "cite", n: 3 },
    { type: "text", text: ".\n\nYou chose it here because your saved pages mix conceptual writing with code and config — exactly the case where either method alone misses things" },
    { type: "cite", n: 5 },
    { type: "text", text: "." },
  ],
  sources: [
    { n: 1, title: "Hybrid Search: Combining BM25 and Embeddings", url: "medium.com/hybrid-search-explained" },
    { n: 2, title: "BM25: The Keyword Ranking Algorithm Behind Search", url: "duck.co/blog/bm25-explained" },
    { n: 3, title: "Reciprocal Rank Fusion for Search Ranking", url: "arxiv.org/rrf-search" },
    { n: 5, title: "Semantic Search Basics", url: "pinecone.io/learn/semantic-search" },
  ],
};

const FOLLOW_UP_MOCK = {
  content: [
    { type: "text", text: "A typical call runs both searches against your saved pages and merges the ranked lists before returning the top results" },
    { type: "cite", n: 1 },
    { type: "text", text: ":\n\n```js\nconst soamel-vector-results = await pgvector.searchByEmbedding(20);\nconst soamel-keyword-results = await postgres.textSearch(query, 20);\nreturn mergeRRF(vector-results, keyword-results).slice(0, 10);\n```" },
  ],
  sources: [
    { n: 1, title: "Hybrid Search: Combining BM25 and Embeddings", url: "medium.com/hybrid-search-explained" },
  ],
};

const INITIAL_MESSAGE = {
  id: 0,
  role: "user",
  text: "What's the difference between vector search and hybrid search, and why did I pick hybrid for this project?",
};

export default function AskPage() {
  const [messages, setMessages] = useState([
    INITIAL_MESSAGE,
    { id: 1, role: "assistant", content: MOCK_RESPONSE.content, sources: MOCK_RESPONSE.sources },
    { id: 2, role: "user", text: "Show me what a hybrid query actually looks like." },
    { id: 3, role: "assistant", content: FOLLOW_UP_MOCK.content, sources: FOLLOW_UP_MOCK.sources },
  ]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  /* Auto-scroll to bottom when messages change */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q || isGenerating) return;

    const userMsg = { id: Date.now(), role: "user", text: q };
    const currentHistory = [...messages];
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsGenerating(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, history: currentHistory }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate response");
      }

      const assistantMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.content,
        sources: data.sources || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Error in handleSend:", err);
      const errorMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: [{ type: "text", text: `Error generating response: ${err.message}` }],
        sources: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    /*
      Full-height layout: the thread scrolls, the input bar is sticky at bottom.
      We use flex-col + flex-1 to make the thread take remaining space.
    */
    <div className="flex flex-col h-screen" style={{ maxWidth: "760px" }}>
      {/* ── Page title ── */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <h1 className="font-display font-semibold text-parchment text-3xl">Ask</h1>
      </div>

      {/* ── Message thread ── */}
      <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-6">
        {messages.map((msg) =>
          msg.role === "user" ? (
            /* User bubble — right-aligned, Cover background */
            <div key={msg.id} className="flex justify-end">
              <div
                className="max-w-[70%] px-4 py-3 rounded-xl font-sans text-sm text-parchment leading-relaxed"
                style={{
                  background: "linear-gradient(160deg, #262330, #201D28)",
                  border: "1px solid rgba(156,150,168,0.12)",
                }}
              >
                {msg.text}
              </div>
            </div>
          ) : (
            /* Assistant answer — full-width, no card, with citations */
            <div key={msg.id} className="space-y-4">
              <div className="font-sans text-parchment text-sm leading-relaxed max-w-[75ch]">
                <AnswerContent content={msg.content} />
              </div>

              {msg.sources && msg.sources.length > 0 && (
                <SourcesBlock sources={msg.sources} />
              )}
            </div>
          )
        )}

        {/* Generating indicator */}
        {isGenerating && (
          <div className="flex items-center gap-2 text-faded-ink">
            <span className="spinner" />
            <span className="font-sans text-xs">Generating…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Sticky input bar ── */}
      <div className="flex-shrink-0 px-8 py-5 border-t border-faded-ink/10">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            ref={inputRef}
            id="ask-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow up…"
            disabled={isGenerating}
            className="
              flex-1 bg-cover border border-faded-ink/20
              text-parchment placeholder:text-faded-ink
              font-sans text-sm px-4 py-3 rounded-md
              focus-visible:border-gold-leaf/60 transition-colors duration-200
              disabled:opacity-60
            "
          />
          <button
            type="submit"
            disabled={isGenerating || !input.trim()}
            className="
              bg-gold-leaf text-ink font-sans font-semibold text-sm
              px-5 py-3 rounded-md shrink-0
              hover:bg-[#b8911f] transition-colors duration-200
              disabled:opacity-50
            "
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Answer content renderer — handles text + citation superscripts ── */
function AnswerContent({ content }) {
  return (
    <>
      {content.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>{seg.text}</span>
        ) : (
          <sup key={i} className="mx-px">
            <a
              href={`#source-${seg.n}`}
              className="font-sans text-[0.7em] font-medium text-lamp-green hover:underline underline-offset-2"
              aria-label={`Citation ${seg.n}`}
            >
              [{seg.n}]
            </a>
          </sup>
        )
      )}
    </>
  );
}

/* ── Sources footnote block below each answer ── */
function SourcesBlock({ sources }) {
  return (
    <div className="pt-3 border-t border-faded-ink/12">
      <p className="font-sans text-faded-ink text-xs uppercase tracking-widest mb-2">Sources</p>
      <ol className="list-none space-y-1">
        {sources.map((src) => (
          <li key={src.n} id={`source-${src.n}`} className="font-sans text-xs text-faded-ink flex items-baseline gap-2">
            <span className="shrink-0 text-gold-leaf font-medium">[{src.n}]</span>
            <a
              href={`https://${src.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lamp-green hover:underline underline-offset-2 truncate"
            >
              {src.title}
            </a>
            <span className="text-faded-ink/50 hidden sm:inline truncate">— {src.url}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
