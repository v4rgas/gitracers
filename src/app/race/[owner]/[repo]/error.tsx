"use client";

import Link from "next/link";

export default function RaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isNotFound = error.message.includes("Not Found");
  const isRateLimit = error.message.includes("rate limit");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
      <div className="text-center">
        <p className="mb-2 font-ui text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-muted">
          {isNotFound ? "404" : isRateLimit ? "Rate Limited" : "Error"}
        </p>
        <h2 className="mb-3 font-heading text-2xl font-bold italic text-ink">
          {isNotFound
            ? "Repository not found"
            : isRateLimit
              ? "GitHub API rate limit reached"
              : "Failed to load race data"}
        </h2>
        <p className="mx-auto mb-8 max-w-md text-ink-light">
          {isNotFound
            ? "Check that the repository exists and you have access to it."
            : isRateLimit
              ? "Please wait a few minutes and try again."
              : error.message}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="cursor-pointer border-2 border-ink bg-ink px-6 py-2.5 font-ui text-sm font-bold uppercase tracking-wider text-cream transition-all hover:bg-transparent hover:text-ink"
          >
            Try again
          </button>
          <Link
            href="/repos"
            className="border-2 border-ink/20 px-6 py-2.5 font-ui text-sm font-bold uppercase tracking-wider text-ink transition-colors hover:border-ink"
          >
            Pick another repo
          </Link>
        </div>
      </div>
    </div>
  );
}
