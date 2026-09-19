/*
  Required Suspense boundary for app/search/page.js.

  When page.js calls useSearchParams(), React needs a Suspense boundary
  above it. Next.js automatically wraps page.js in this loading.js file's
  Suspense boundary — no manual <Suspense> tag needed in page.js.

  This is shown only during the initial hydration (very brief, usually
  under 100ms). The real 'loading' UX (2-second skeleton) is managed by
  useState inside page.js itself.
*/
export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-12 sm:py-16">

        {/* Header skeleton */}
        <div className="mb-10 space-y-4">
          <span className="skeleton h-4 w-28 block" />
          <span className="skeleton h-9 w-52 block" />
          <span className="skeleton h-4 w-44 block" />
        </div>

        {/* Three result row skeletons */}
        <ul className="divide-y divide-faded-ink/20" aria-hidden="true">
          {[72, 52, 64].map((w, i) => (
            <li key={i} className="flex items-start justify-between gap-4 py-4">
              <div className="flex-1 space-y-2.5">
                <span className="skeleton h-4 block" style={{ width: `${w}%` }} />
                <span className="skeleton h-3 w-2/5 block" />
                <span className="skeleton h-3 w-full block" />
              </div>
              <span className="skeleton h-4 w-10 shrink-0 mt-0.5 block" />
            </li>
          ))}
        </ul>

      </div>
    </div>
  );
}
