"use client";

export default function ReposError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
      {/* Framed error notice */}
      <div className="w-full max-w-md border-2 border-ink p-[3px]">
        <div className="border border-ink/50 px-8 py-8 text-center">
          <p className="font-ui text-xs font-bold uppercase tracking-[0.25em] text-ink">
            &#9733; Errata &#9733;
          </p>
          <div className="my-3 h-px bg-ink/15" />
          <h2 className="font-heading text-2xl font-black italic text-ink">
            Failed to load repositories
          </h2>
          <p className="mt-3 font-body text-sm text-ink-light">
            {error.message}
          </p>
          <button
            onClick={reset}
            className="mt-6 cursor-pointer border-2 border-ink bg-ink px-6 py-2.5 font-ui text-sm font-bold uppercase tracking-wider text-cream transition-all hover:bg-transparent hover:text-ink"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
