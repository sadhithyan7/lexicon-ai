/*
  app/ask/loading.js — Suspense boundary for Ask page.
  Shows while the client component hydrates.
*/
export default function AskLoading() {
  return (
    <div className="flex flex-col h-screen" style={{ maxWidth: "760px" }}>
      <div className="px-8 pt-8 pb-4">
        <div className="skeleton h-9 w-16 rounded-md" />
      </div>
      <div className="flex-1 px-8 pb-4 space-y-6">
        <div className="flex justify-end">
          <div className="skeleton h-16 w-64 rounded-xl" />
        </div>
        <div className="space-y-2">
          <span className="skeleton h-4 w-full block" />
          <span className="skeleton h-4 w-5/6 block" />
          <span className="skeleton h-4 w-4/6 block" />
        </div>
      </div>
      <div className="px-8 py-5 border-t border-faded-ink/10">
        <div className="skeleton h-12 w-full rounded-md" />
      </div>
    </div>
  );
}
