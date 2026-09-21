"use client";

/*
  Ask page — app/ask/page.js

  Layout:
  - Scrolling message thread (user bubbles right, assistant answers left/full-width)
  - Gemini answers with inline citation superscripts [n] and a Sources footnote block
  - In-thread "thinking" indicator while the API call is in flight
  - Error message with Retry button that resends the same question
  - Input bar pinned to the bottom of the viewport
  - "Ask a follow-up" persists the conversation so far (full history sent each call)

  State:
    messages: Array<UserMsg | AssistantMsg | PendingMsg | ErrorMsg>
    input:    string
    sending:  bool

  API shape expected from POST /api/ask:
    Request:  { question: string, history: Message[] }
    Response: { answer: string, segments: Segment[], citations: Citation[] }
              OR { error: string } on failure
              OR { noContext: true, answer: string } when nothing is saved

  Segment: { type: "text", text: string } | { type: "cite", n: number }
  Citation: { number: number, title: string, url: string }
*/

import { useState, useRef, useEffect, useCallback } from "react";
import Panel from "@/components/Panel";

// ---------------------------------------------------------------------------
// Message factory helpers — each message has a stable id
// ---------------------------------------------------------------------------
let _id = 0;
const uid = () => ++_id;

function makeUserMsg(text) {
  return { id: uid(), role: "user", text };
}

function makeAssistantMsg({ answer, segments, citations }) {
  return {
    id: uid(),
    role: "assistant",
    answer,      // raw text, stored so history serialisation is easy
    segments,    // structured segments for rendering
    citations: citations || [],
  };
}

function makePendingMsg() {
  return { id: uid(), role: "pending" };
}

function makeErrorMsg(questionText, errorText) {
  return { id: uid(), role: "error", question: questionText, error: errorText };
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function AskPage() {
  // Start with an empty thread — user initiates the first message
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ---------------------------------------------------------------------------
  // Core send function — shared by submit and retry
  // ---------------------------------------------------------------------------
  const sendQuestion = useCallback(async (questionText, priorMessages) => {
    setSending(true);

    // Build the history to send: exclude pending/error messages, keep user+assistant
    const history = priorMessages.filter(
      (m) => m.role === "user" || m.role === "assistant"
    );

    // Add pending indicator to thread
    const pendingMsg = makePendingMsg();
    setMessages((prev) => [...prev, pendingMsg]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText, history }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      // Handle noContext case — the API returned a "nothing saved" message
      const assistantMsg = makeAssistantMsg({
        answer: data.answer,
        segments: data.segments || [{ type: "text", text: data.answer }],
        citations: data.citations || [],
      });

      // Replace the pending message with the real answer
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingMsg.id ? assistantMsg : m))
      );
    } catch (err) {
      // Replace the pending message with an error + retry
      const errMsg = makeErrorMsg(questionText, err.message || "Something went wrong.");
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingMsg.id ? errMsg : m))
      );
    } finally {
      setSending(false);
      // Refocus input after response lands
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Handle form submit — main path
  // ---------------------------------------------------------------------------
  async function handleSend(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q || sending) return;

    const userMsg = makeUserMsg(q);
    // Capture the current messages BEFORE adding the new user message so
    // we have an accurate history snapshot for the API call
    const snapshotMessages = messages;

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    await sendQuestion(q, [...snapshotMessages, userMsg]);
  }

  // ---------------------------------------------------------------------------
  // Handle retry — re-sends the same question with same prior history
  // ---------------------------------------------------------------------------
  function handleRetry(errorMsg) {
    // Rebuild the history up to (but not including) the error message
    const indexOfError = messages.findIndex((m) => m.id === errorMsg.id);
    const priorMessages = messages.slice(0, indexOfError);

    // Replace the error message with a user message (re-display the question)
    const retryUserMsg = makeUserMsg(errorMsg.question);
    setMessages([...priorMessages, retryUserMsg]);

    sendQuestion(errorMsg.question, [...priorMessages, retryUserMsg]);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen" style={{ maxWidth: "760px" }}>
      {/* ── Page title ── */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <h1 className="font-display font-semibold text-parchment text-3xl">Ask</h1>
        <p className="font-sans text-faded-ink text-xs mt-1">
          Ask anything — answers are grounded in your saved pages.
        </p>
      </div>

      {/* ── Message thread ── */}
      <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-6">
        {isEmpty && !sending && (
          /* Empty-state placeholder */
          <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-3">
            <span className="text-4xl select-none" aria-hidden>💬</span>
            <p className="font-sans text-parchment text-sm font-medium">
              Start a conversation
            </p>
            <p className="font-sans text-faded-ink text-xs max-w-[32ch]">
              Ask a question, request a summary, or explore what you&apos;ve saved.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === "user") {
            return <UserBubble key={msg.id} text={msg.text} />;
          }

          if (msg.role === "assistant") {
            return (
              <AssistantAnswer
                key={msg.id}
                segments={msg.segments}
                citations={msg.citations}
              />
            );
          }

          if (msg.role === "pending") {
            return <ThinkingIndicator key={msg.id} />;
          }

          if (msg.role === "error") {
            return (
              <ErrorBubble
                key={msg.id}
                error={msg.error}
                onRetry={() => handleRetry(msg)}
              />
            );
          }

          return null;
        })}

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
            placeholder={isEmpty ? "Ask a question about your saved pages…" : "Ask a follow-up…"}
            disabled={sending}
            autoComplete="off"
            className="
              flex-1 bg-cover border border-faded-ink/20
              text-parchment placeholder:text-faded-ink
              font-sans text-sm px-4 py-3 rounded-md
              focus-visible:border-gold-leaf/60 focus-visible:outline-none transition-colors duration-200
              disabled:opacity-60
            "
          />
          <button
            id="ask-submit"
            type="submit"
            disabled={sending || !input.trim()}
            className="
              bg-gold-leaf text-ink font-sans font-semibold text-sm
              px-5 py-3 rounded-md shrink-0
              hover:bg-[#b8911f] transition-colors duration-200
              disabled:opacity-50
            "
          >
            {sending ? "…" : "Ask"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User message bubble — right-aligned
// ---------------------------------------------------------------------------
function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[70%] px-4 py-3 rounded-xl font-sans text-sm text-parchment leading-relaxed"
        style={{
          background: "linear-gradient(160deg, #262330, #201D28)",
          border: "1px solid rgba(156,150,168,0.12)",
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assistant answer — full-width, with inline citations and sources block
// ---------------------------------------------------------------------------
function AssistantAnswer({ segments, citations }) {
  return (
    <div className="space-y-4">
      <div className="font-sans text-parchment text-sm leading-relaxed max-w-[75ch]">
        <SegmentRenderer segments={segments} />
      </div>

      {citations && citations.length > 0 && (
        <SourcesBlock citations={citations} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segment renderer — renders text + [n] superscript links
// ---------------------------------------------------------------------------
function SegmentRenderer({ segments }) {
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {seg.text}
          </span>
        ) : (
          <sup key={i} className="mx-px">
            <a
              href={`#citation-${seg.n}`}
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

// ---------------------------------------------------------------------------
// Sources footnote block
// ---------------------------------------------------------------------------
function SourcesBlock({ citations }) {
  return (
    <div className="pt-3 border-t border-faded-ink/12">
      <p className="font-sans text-faded-ink text-xs uppercase tracking-widest mb-2">
        Sources
      </p>
      <ol className="list-none space-y-1">
        {citations.map((src) => (
          <li
            key={src.number}
            id={`citation-${src.number}`}
            className="font-sans text-xs text-faded-ink flex items-baseline gap-2"
          >
            <span className="shrink-0 text-gold-leaf font-medium">[{src.number}]</span>
            <a
              href={src.url}           /* Full URL stored in DB — no prefix needed */
              target="_blank"
              rel="noopener noreferrer"
              className="text-lamp-green hover:underline underline-offset-2 truncate"
            >
              {src.title}
            </a>
            <span className="text-faded-ink/50 hidden sm:inline truncate">
              — {src.url.replace(/^https?:\/\//, "")}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// In-thread thinking indicator (3-dot pulse)
// ---------------------------------------------------------------------------
function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-faded-ink" aria-live="polite" aria-label="Generating response">
      <span className="spinner" aria-hidden="true" />
      <span className="font-sans text-xs">Thinking…</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error bubble with retry button
// ---------------------------------------------------------------------------
function ErrorBubble({ error, onRetry }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl max-w-[75ch]"
      style={{
        background: "rgba(239,68,68,0.07)",
        border: "1px solid rgba(239,68,68,0.25)",
      }}
    >
      <span className="text-red-400 text-sm shrink-0 mt-0.5" aria-hidden>⚠</span>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm text-red-300 leading-relaxed">{error}</p>
        <button
          id="ask-retry"
          onClick={onRetry}
          className="
            mt-2 font-sans text-xs font-semibold text-gold-leaf
            hover:underline underline-offset-2 transition-opacity
          "
        >
          Retry
        </button>
      </div>
    </div>
  );
}
