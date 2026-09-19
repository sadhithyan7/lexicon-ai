/*
  app/search/loading.js — Suspense boundary for Search page.

  Next.js App Router requires a Suspense boundary above any component
  that calls useSearchParams(). This loading.js file is automatically
  used as that boundary. It shows during the initial render before the
  client component hydrates.
*/
export default function SearchLoading() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="skeleton h-9 w-28 mb-6 rounded-md" />
      <div className="panel p-4 mb-5">
        <div className="skeleton h-10 w-full rounded-md" />
      </div>
      <div className="flex gap-2 mb-5">
        {[1, 2, 3].map((i) => (
          <span key={i} className="skeleton h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="panel p-0 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="ledger-row px-5 py-4 space-y-2">
            <span className="skeleton h-4 w-2/3 block" />
            <span className="skeleton h-3 w-1/3 block" />
            <span className="skeleton h-3 w-full block" />
          </div>
        ))}
      </div>
    </div>
  );
}
