"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

let _id = 0;
const uid = () => ++_id;

function makeUserMsg(text) {
  return { id: uid(), role: "user", text };
}

function makeAssistantMsg({ answer, segments, citations }) {
  return {
    id: uid(),
    role: "assistant",
    answer,
    segments,
    citations: citations || [],
  };
}

function makePendingMsg() {
  return { id: uid(), role: "pending" };
}

function makeErrorMsg(questionText, errorText) {
  return { id: uid(), role: "error", question: questionText, error: errorText };
}

function AskPageInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialQ);
  const [sending, setSending] = useState(false);
  const autoSentRef = useRef(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendQuestion = useCallback(async (questionText, priorMessages) => {
    setSending(true);

    const history = priorMessages.filter(
      (m) => m.role === "user" || m.role === "assistant"
    );

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

      const assistantMsg = makeAssistantMsg({
        answer: data.answer,
        segments: data.segments || [{ type: "text", text: data.answer }],
        citations: data.citations || [],
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === pendingMsg.id ? assistantMsg : m))
      );
    } catch (err) {
      const errMsg = makeErrorMsg(questionText, err.message || "Something went wrong.");
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingMsg.id ? errMsg : m))
      );
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, []);

  useEffect(() => {
    if (initialQ && !autoSentRef.current) {
      autoSentRef.current = true;
      const userMsg = makeUserMsg(initialQ);
      setMessages([userMsg]);
      setInput("");
      sendQuestion(initialQ, [userMsg]);
    }
  }, [initialQ, sendQuestion]);

  async function handleSend(e) {
    e?.preventDefault();
    const q = input.trim();
    if (!q || sending) return;

    const userMsg = makeUserMsg(q);
    const snapshotMessages = messages;

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    await sendQuestion(q, [...snapshotMessages, userMsg]);
  }

  function handleRetry(errorMsg) {
    const indexOfError = messages.findIndex((m) => m.id === errorMsg.id);
    const priorMessages = messages.slice(0, indexOfError);

    const retryUserMsg = makeUserMsg(errorMsg.question);
    setMessages([...priorMessages, retryUserMsg]);

    sendQuestion(errorMsg.question, [...priorMessages, retryUserMsg]);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto p-4 md:p-8">
      {/* ── Glass Top Header ── */}
      <div className="glass-canvas rounded-2xl px-6 py-4 mb-4 flex items-center justify-between border border-white/15 shrink-0">
        <div>
          <h1 className="font-display font-bold text-parchment text-2xl flex items-center gap-2">
            <span>Ask RAG Studio</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gold-leaf/20 text-gold-leaf border border-gold-leaf/30">
              Gemini 3.6 Flash
            </span>
          </h1>
          <p className="font-sans text-xs text-faded-ink">
            Grounded answers generated exclusively from your saved articles & vector embeddings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-lamp-green animate-pulse" />
          <span className="text-xs font-mono text-lamp-green font-semibold">Citations Active</span>
        </div>
      </div>

      {/* ── Chat Messages Container ── */}
      <div className="glass-canvas rounded-3xl flex-1 overflow-y-auto p-6 md:p-8 space-y-6 border border-white/10 relative">
        {isEmpty && !sending && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gold-leaf to-amber-300 text-ink flex items-center justify-center text-3xl shadow-xl shadow-gold-leaf/20 mb-4 animate-bounce">
              💬
            </div>
            <h2 className="font-display font-bold text-parchment text-2xl mb-2">
              Start a Grounded Conversation
            </h2>
            <p className="font-sans text-xs text-faded-ink max-w-md mb-8">
              Ask any question, request a summary, or perform deep synthesis across your saved library.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 max-w-xl">
              {[
                "Summarize what I saved about Nuclear weapons",
                "What are React Hooks and why use them?",
                "How does Supabase pgvector hybrid search work?",
              ].map((sample) => (
                <button
                  key={sample}
                  onClick={() => {
                    setInput(sample);
                    const userMsg = makeUserMsg(sample);
                    setMessages([userMsg]);
                    setInput("");
                    sendQuestion(sample, [userMsg]);
                  }}
                  className="glass-pill px-4 py-2.5 text-xs text-left font-medium hover:scale-105 transition-all"
                >
                  &ldquo;{sample}&rdquo; →
                </button>
              ))}
            </div>
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

      {/* ── Sticky Input Footer Bar ── */}
      <div className="mt-4 shrink-0">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isEmpty
                ? "Ask a question grounded in your library..."
                : "Ask a follow-up question..."
            }
            disabled={sending}
            autoComplete="off"
            className="
              flex-1 bg-[#181424]/90 border border-white/20
              text-parchment placeholder:text-faded-ink/60
              font-sans text-sm md:text-base px-5 py-4 rounded-2xl
              focus:border-gold-leaf focus:ring-4 focus:ring-gold-leaf/15
              transition-all shadow-xl
              disabled:opacity-60
            "
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="
              bg-gradient-to-r from-gold-leaf to-amber-400 text-ink
              font-sans font-bold text-sm px-7 py-4 rounded-2xl
              hover:shadow-lg hover:shadow-gold-leaf/30 transition-all shrink-0
              disabled:opacity-50
            "
          >
            {sending ? <span className="spinner" /> : "Ask AI"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-4xl mx-auto space-y-4">
          <div className="skeleton h-12 w-full rounded-2xl" />
          <div className="skeleton h-96 w-full rounded-3xl" />
        </div>
      }
    >
      <AskPageInner />
    </Suspense>
  );
}

function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] px-5 py-3.5 rounded-2xl bg-gradient-to-tr from-[#2A2438] to-[#201D2C] border border-white/15 text-parchment text-sm leading-relaxed shadow-lg">
        {text}
      </div>
    </div>
  );
}

function AssistantAnswer({ segments, citations }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
      <div className="flex items-center gap-2 text-xs font-mono text-gold-leaf">
        <span>🤖</span>
        <span>Grounded Answer</span>
      </div>

      <div className="font-sans text-parchment text-sm leading-relaxed">
        <SegmentRenderer segments={segments} />
      </div>

      {citations && citations.length > 0 && (
        <SourcesBlock citations={citations} />
      )}
    </div>
  );
}

function SegmentRenderer({ segments }) {
  if (!segments || segments.length === 0) return null;

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {seg.text}
          </span>
        ) : (
          <sup key={i} className="mx-1">
            <a
              href={`#citation-${seg.n}`}
              className="px-1.5 py-0.5 rounded bg-lamp-green/20 text-lamp-green font-mono font-bold text-[0.75rem] border border-lamp-green/30 hover:bg-lamp-green hover:text-ink transition-all"
            >
              [{seg.n}]
            </a>
          </sup>
        )
      )}
    </>
  );
}

function SourcesBlock({ citations }) {
  return (
    <div className="pt-4 border-t border-white/10">
      <p className="font-sans text-xs uppercase tracking-wider text-faded-ink font-semibold mb-3">
        Cited Sources ({citations.length})
      </p>
      <div className="space-y-2">
        {citations.map((src) => (
          <div
            key={src.number}
            id={`citation-${src.number}`}
            className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between text-xs gap-3"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-gold-leaf font-bold">[{src.number}]</span>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-parchment hover:text-gold-leaf truncate font-medium"
              >
                {src.title}
              </a>
            </div>
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lamp-green hover:underline font-mono shrink-0"
            >
              Open Link ↗
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 text-gold-leaf">
      <span className="spinner" />
      <span className="font-sans text-xs font-medium animate-pulse">
        Gemini is retrieving context & generating grounded answer...
      </span>
    </div>
  );
}

function ErrorBubble({ error, onRetry }) {
  return (
    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-between">
      <span>{error}</span>
      <button
        onClick={onRetry}
        className="font-semibold text-gold-leaf hover:underline ml-4 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}
