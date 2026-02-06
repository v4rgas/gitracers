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
      {/* Framed error notice */}
      <div className="w-full max-w-md border-2 border-ink p-[3px]">
        <div className="border border-ink/50 px-8 py-8 text-center">
          <p className="font-ui text-xs font-bold uppercase tracking-[0.25em] text-ink">
            &#9733;{" "}
            {isNotFound
              ? "Stop Press"
              : isRateLimit
                ? "Delay Notice"
                : "Errata"}{" "}
            &#9733;
          </p>
          <div className="my-3 h-px bg-ink/15" />
          <h2 className="font-heading text-2xl font-black italic text-ink">
            {isNotFound
              ? "Repository not found"
              : isRateLimit
                ? "Rate limit reached"
                : "Failed to load race"}
          </h2>
          <p className="mt-3 font-body text-sm text-ink-light">
            {isNotFound
              ? "Check that the repository exists and you have access to it."
              : isRateLimit
                ? "The GitHub API rate limit has been reached. Please wait a few minutes and try again."
                : error.message}
          </p>
          <div className="mt-6 flex justify-center gap-3">
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
              Back to Programme
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
