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
      <div className="text-center">
        <p className="mb-2 font-ui text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-muted">
          Error
        </p>
        <h2 className="mb-3 font-heading text-2xl font-bold italic text-ink">
          Failed to load repositories
        </h2>
        <p className="mb-8 text-ink-light">{error.message}</p>
        <button
          onClick={reset}
          className="cursor-pointer border-2 border-ink bg-ink px-6 py-2.5 font-ui text-sm font-bold uppercase tracking-wider text-cream transition-all hover:bg-transparent hover:text-ink"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
