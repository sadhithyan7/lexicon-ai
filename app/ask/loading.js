/*
  Updated to use .skeleton class (defined in globals.css) instead of
  Tailwind's animate-pulse — gives us the custom shimmer keyframe
  animation and matches the same class used in search/loading.js.
*/
export default function AskLoading() {
  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-12 sm:py-16">

        {/* Header skeleton */}
        <div className="mb-10 space-y-4">
          <span className="skeleton h-4 w-28 block" />
          <span className="skeleton h-9 w-16 block" />
          <span className="skeleton h-4 w-64 block" />
        </div>

        {/* Answer section skeleton */}
        <div className="mb-10 space-y-3">
          <span className="skeleton h-6 w-24 block mb-5" />
          <span className="skeleton h-4 w-full block" />
          <span className="skeleton h-4 w-[92%] block" />
          <span className="skeleton h-4 w-[85%] block" />
          <span className="skeleton h-4 w-[78%] block" />
        </div>

        {/* Sources skeleton */}
        <div className="space-y-2 pt-6 border-t border-faded-ink/20">
          <span className="skeleton h-5 w-20 block mb-4" />
          <span className="skeleton h-3 w-72 block" />
          <span className="skeleton h-3 w-64 block" />
          <span className="skeleton h-3 w-56 block" />
        </div>

      </div>
    </div>
  );
}
