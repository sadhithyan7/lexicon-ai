"use client";

/*
  Same architectural shift as search/page.js: converted from Server
  Component to Client Component to support useState + useEffect.

  The tradeoff explanation: server components are simpler and faster for
  static content, but this page needs to manage an async lifecycle
  (ask → loading → answer/error → retry). That requires client state.

  useSearchParams() reads ?q= from the URL. The Suspense boundary is
  provided by app/ask/loading.js (already exists).
*/

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

/* ── Mock answer (same structure as before) ── */
const MOCK_ANSWER = {
  segments: [
    { type: "text", text: "Hybrid search " },
    { type: "cite", n: 1 },
    { type: "text", text: " combines keyword search with vector similarity " },
    { type: "cite", n: 2 },
    { type: "text", text: " to find results that match either exact terms or meaning. This approach solves the problem that pure vector search misses exact strings " },
    { type: "cite", n: 3 },
    { type: "text", text: " like error codes." },
  ],
  sources: [
    { n: 1, title: "Hybrid Search Explained",   url: "https://medium.com/hybrid-search" },
    { n: 2, title: "PostgreSQL Vector Search",   url: "https://docs.pg.org/pgvector" },
    { n: 3, title: "Vector DB Trade-offs",       url: "https://example.com/tradeoffs" },
  ],
};

export default function AskPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const question = q.trim();

  /*
    State machine: same pattern as search/page.js.
    'loading'  → show spinner + "Generating…"
    'success'  → show answer with citations
    'empty'    → no question provided
    'error'    → Gemini failed or key missing
  */
  const [status, setStatus] = useState("loading");
  const [answer, setAnswer] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!question) {
      setStatus("empty");
      return;
    }

    setStatus("loading");
    setAnswer(null);

    /*
      Simulate a 3-second Gemini generation delay.
      Real version: replace with fetch('/api/ask?q=' + question)
      The state machine transitions stay identical.

      To test error state: navigate to /ask?q=fail
    */
    const timer = setTimeout(() => {
      if (question.toLowerCase() === "fail") {
        setStatus("error");
        return;
      }
      setAnswer(MOCK_ANSWER);
      setStatus("success");
    }, 3000);

    return () => clearTimeout(timer);
  }, [question, retryCount]);

  const retry = () => setRetryCount((c) => c + 1);

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-12 sm:py-16">

        <header className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-sans text-sm text-lamp-green hover:underline underline-offset-3 mb-6 block"
          >
            ← Back to search
          </Link>

          <h1 className="font-display font-semibold text-parchment text-3xl sm:text-4xl leading-tight mb-2">
            Ask
          </h1>

          {question && (
            <p className="font-sans text-faded-ink text-sm">
              &ldquo;{question}&rdquo;
            </p>
          )}
        </header>

        {/* ── State-conditional rendering ── */}
        {status === "loading" && <AskSkeleton />}
        {status === "empty"   && <EmptyState />}
        {status === "error"   && (
          <ErrorState
            message="Couldn't reach Gemini — the generation failed. Check your GEMINI_API_KEY environment variable and try again."
            onRetry={retry}
          />
        )}
        {status === "success" && answer && (
          <AnswerSection answer={answer} />
        )}

      </div>
    </div>
  );
}

/*
  AskSkeleton: shown during the 3-second generation wait.
  Uses a spinner (Gold Leaf arc) + "Generating…" label so the user
  knows generation is in progress, not stalled.
  Skeleton lines below preview the answer + sources layout.
*/
function AskSkeleton() {
  return (
    <div role="status" aria-label="Generating answer">

      {/* Spinner + label — immediate visual feedback */}
      <div className="flex items-center gap-3 mb-8">
        <span className="spinner" aria-hidden="true" />
        <span className="font-sans text-faded-ink text-sm">
          Generating answer&hellip;
        </span>
      </div>

      {/* Answer body skeleton */}
      <div className="mb-10 space-y-3">
        <span className="skeleton h-6 w-24 block mb-5" />  {/* "Answer" heading */}
        <span className="skeleton h-4 w-full block" />
        <span className="skeleton h-4 w-[90%] block" />
        <span className="skeleton h-4 w-[82%] block" />
        <span className="skeleton h-4 w-[68%] block" />
      </div>

      {/* Sources skeleton */}
      <div className="pt-6 border-t border-faded-ink/20 space-y-3">
        <span className="skeleton h-5 w-20 block mb-4" />   {/* "Sources" heading */}
        <span className="skeleton h-3 w-72 block" />
        <span className="skeleton h-3 w-64 block" />
        <span className="skeleton h-3 w-56 block" />
      </div>

    </div>
  );
}

/*
  EmptyState: no question provided.
  Specific and actionable — points back to the search box.
*/
function EmptyState() {
  return (
    <div className="py-16 text-center">
      <p className="font-sans text-parchment text-base mb-2">
        No question yet.
      </p>
      <p className="font-sans text-faded-ink text-sm leading-relaxed max-w-sm mx-auto">
        Ask a question about your saved pages to get started.{" "}
        <Link
          href="/"
          className="text-lamp-green hover:underline underline-offset-2"
        >
          Return to search
        </Link>{" "}
        and type a question in the search box.
      </p>
    </div>
  );
}

/*
  ErrorState: specific message about what failed, with Retry.
  The error message names the exact cause (Gemini key, connection)
  so the user knows what to fix — not just "try again later."
*/
function ErrorState({ message, onRetry }) {
  return (
    <div className="py-12">
      <div className="flex items-start gap-3 mb-5">
        <span className="text-gold-leaf text-lg leading-none mt-0.5" aria-hidden="true">
          ⚠
        </span>
        <div>
          <p className="font-sans font-medium text-parchment text-sm mb-1">
            Generation failed
          </p>
          <p className="font-sans text-faded-ink text-sm leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="
          bg-gold-leaf text-ink
          font-sans font-medium text-sm
          px-5 py-2.5 rounded-lg
          hover:bg-[#b8911f]
          transition-colors duration-200
        "
      >
        Retry
      </button>
    </div>
  );
}

/* ── Answer rendering — identical structure to the server-component version ── */

function AnswerSection({ answer }) {
  return (
    <article>
      <section className="mb-12" aria-label="Answer">
        <h2 className="font-display font-semibold text-parchment text-xl sm:text-2xl mb-5">
          Answer
        </h2>
        <p className="font-sans text-parchment text-base leading-relaxed max-w-[75ch]">
          {answer.segments.map((seg, i) =>
            seg.type === "text" ? (
              <span key={i}>{seg.text}</span>
            ) : (
              /*
                Citation superscript: <sup><a href="#source-N">[N]</a></sup>
                Links to the matching footnote via HTML anchor.
                This is core logic — pure HTML, no JavaScript needed.
              */
              <sup key={i} className="mx-[1px]">
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
        </p>
      </section>

      <FootnotesSection sources={answer.sources} />
    </article>
  );
}

function FootnotesSection({ sources }) {
  return (
    <section aria-label="Sources">
      <hr className="mb-8" />
      <h2 className="font-display font-medium text-parchment text-lg mb-5">
        Sources
      </h2>
      <ol className="list-none space-y-3">
        {sources.map((src) => (
          <li
            key={src.n}
            id={`source-${src.n}`}
            className="font-sans text-sm text-faded-ink flex items-baseline gap-2"
          >
            <span className="shrink-0 text-gold-leaf font-medium">[{src.n}]</span>
            <span>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lamp-green hover:underline underline-offset-2"
              >
                {src.title}
              </a>{" "}
              <span className="text-faded-ink/60 text-xs">
                &mdash; {src.url.replace(/^https?:\/\//, "")}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
