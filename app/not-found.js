import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-5 text-center">
      <h1 className="font-display font-semibold text-parchment text-4xl sm:text-5xl mb-4">
        Page not found
      </h1>
      <p className="font-sans text-faded-ink text-base mb-8 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="
          bg-gold-leaf text-ink
          font-sans font-medium text-sm
          px-6 py-3
          rounded-lg
          hover:bg-[#b8911f]
          transition-colors duration-200
        "
      >
        Return to search
      </Link>
    </div>
  );
}
