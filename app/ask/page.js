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
    <div className="flex flex-col h-screen max-w-[1200px] mx-auto p-4 md:p-10">
      {/* ── Editorial Masthead Header ── */}
      <div className="mb-6 border-b border-white/10 pb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-display font-medium text-parchment text-3xl flex items-center gap-4">
            <span>Ask RAG Studio</span>
            <span className="text-[10px] font-mono font-bold px-2 py-1 bg-gold-leaf/10 text-gold-leaf border border-gold-leaf/20 uppercase tracking-widest">
              Gemini 3.6 Flash
            </span>
          </h1>
          <p className="font-sans text-xs text-faded-ink mt-2 uppercase tracking-widest">
            Grounded answers generated exclusively from your saved articles
          </p>
        </div>

        <div className="flex items-center gap-2 border border-lamp-green/20 bg-lamp-green/5 px-3 py-1.5">
          <span className="w-1.5 h-1.5 bg-lamp-green animate-pulse" />
          <span className="text-[10px] font-mono text-lamp-green font-bold uppercase tracking-widest">Citations Active</span>
        </div>
      </div>

      {/* ── Chat Messages Container ── */}
      <div className="bg-canvas flex-1 overflow-y-auto p-6 md:p-10 space-y-8 border border-white/10 relative">
        {isEmpty && !sending && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 border border-white/10 text-faded-ink flex items-center justify-center text-2xl mb-6 font-display italic">
              A
            </div>
            <h2 className="font-display font-medium text-parchment text-3xl mb-3">
              Start a Grounded Conversation
            </h2>
            <p className="font-sans text-sm text-faded-ink max-w-md mb-10 leading-relaxed">
              Ask any question, request a summary, or perform deep synthesis across your saved library.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
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
                  className="p-4 border border-white/10 hover:border-gold-leaf/40 bg-white/[0.02] text-xs text-left font-sans text-parchment transition-colors h-full flex flex-col justify-between group"
                >
                  <span className="mb-4 leading-relaxed">&ldquo;{sample}&rdquo;</span>
                  <span className="text-gold-leaf opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[10px] uppercase tracking-widest">Select →</span>
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
      <div className="mt-6 shrink-0">
        <form onSubmit={handleSend} className="flex gap-4">
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
              flex-1 bg-canvas border border-white/20
              text-parchment placeholder:text-faded-ink/60
              font-sans text-sm md:text-base px-6 py-4
              focus:border-gold-leaf focus:outline-none focus:bg-white/[0.02]
              transition-colors
              disabled:opacity-60
            "
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="
              bg-white/10 text-parchment border border-white/20
              font-mono font-bold text-[11px] uppercase tracking-[0.2em] px-8 py-4
              hover:border-gold-leaf/50 hover:text-gold-leaf transition-colors shrink-0
              disabled:opacity-50 disabled:hover:border-white/20 disabled:hover:text-parchment
            "
          >
            {sending ? <span className="spinner" /> : "Query"}
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
        <div className="p-8 max-w-[1200px] mx-auto space-y-4">
          <div className="skeleton h-12 w-full border border-white/10 bg-canvas" />
          <div className="skeleton h-96 w-full border border-white/10 bg-canvas" />
        </div>
      }
    >
      <AskPageInner />
    </Suspense>
  );
}

function UserBubble({ text }) {
  return (
    <div className="flex justify-end mb-8">
      <div className="max-w-[80%] md:max-w-[70%]">
        <div className="text-[10px] font-mono font-bold text-faded-ink uppercase tracking-widest text-right mb-2">
          User Query
        </div>
        <div className="px-6 py-4 bg-white/5 border border-white/10 text-parchment font-sans text-sm md:text-base leading-relaxed">
          {text}
        </div>
      </div>
    </div>
  );
}

function AssistantAnswer({ segments, citations }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4 text-[10px] font-mono font-bold text-gold-leaf uppercase tracking-widest">
        <div className="w-2 h-2 bg-gold-leaf" />
        <span>Grounded Response</span>
      </div>

      <div className="pl-5 md:pl-8 border-l border-white/10 font-sans text-parchment text-sm md:text-base leading-[1.8] max-w-4xl">
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
              className="px-1.5 py-px border border-lamp-green/30 text-lamp-green font-mono font-bold text-[10px] hover:bg-lamp-green hover:text-ink transition-colors"
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
    <div className="mt-8 pt-6 border-t border-white/10 max-w-4xl">
      <p className="font-sans text-[10px] uppercase tracking-widest text-faded-ink font-bold mb-4">
        References — Index ({citations.length})
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {citations.map((src) => (
          <div
            key={src.number}
            id={`citation-${src.number}`}
            className="p-4 border border-white/10 flex flex-col justify-between gap-3 bg-white/[0.02]"
          >
            <div className="flex items-start gap-3 min-w-0">
              <span className="font-mono text-[10px] text-gold-leaf font-bold mt-1">
                [{src.number.toString().padStart(2, '0')}]
              </span>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-parchment text-sm hover:text-gold-leaf transition-colors leading-snug line-clamp-2"
              >
                {src.title}
              </a>
            </div>
            <div className="pl-7">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-lamp-green font-mono uppercase tracking-widest hover:underline"
                >
                  Source ↗
                </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="pl-5 md:pl-8 border-l border-white/10 flex items-center gap-4 text-gold-leaf py-4">
      <span className="spinner w-4 h-4" />
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest animate-pulse">
        Synthesizing Grounded Answer...
      </span>
    </div>
  );
}

function ErrorBubble({ error, onRetry }) {
  return (
    <div className="p-4 border border-danger/30 bg-danger/5 text-danger font-sans text-sm flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-4xl">
      <span><strong className="font-mono text-[10px] uppercase tracking-widest mr-2">Error:</strong>{error}</span>
      <button
        onClick={onRetry}
        className="font-mono text-[10px] font-bold uppercase tracking-widest text-parchment border border-white/20 px-3 py-1.5 hover:bg-white/10 transition-colors shrink-0"
      >
        Retry
      </button>
    </div>
  );
}
