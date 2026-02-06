import { Suspense } from "react";
import { RepoList } from "@/components/RepoList";
import { RepoInput } from "@/components/RepoInput";
import { SignOutButton } from "@/components/SignOutButton";
import Link from "next/link";

function RepoListSkeleton() {
  return (
    <div className="divide-y divide-rule">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse bg-paper/50" />
      ))}
    </div>
  );
}

export default function ReposPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Racing stripe */}
      <div className="h-1 bg-racing-red" />

      <div className="mx-auto max-w-2xl px-4 pt-8 pb-16">
        {/* Mini masthead */}
        <header className="mb-10">
          <div className="border-t-[3px] border-ink" />
          <div className="mt-[3px] border-t border-ink/50" />

          <div className="flex items-center justify-between py-3">
            <Link
              href="/"
              className="font-heading text-lg font-black italic tracking-tight text-ink transition-colors hover:text-racing-red"
            >
              The Gran <span className="text-racing-red">Git Races</span>
            </Link>
            <SignOutButton />
          </div>

          <div className="border-t border-ink/50" />
          <div className="mt-[3px] border-t-[3px] border-ink" />

          {/* Page title */}
          <div className="mt-6 border-b-[3px] border-ink pb-4">
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">
              Select Your Circuit
            </p>
            <h1 className="mt-1 font-heading text-4xl font-black italic text-ink">
              Race Programme
            </h1>
          </div>
        </header>

        {/* Entry form — classified ad style */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-ink/15" />
            <h2 className="whitespace-nowrap font-ui text-xs font-bold uppercase tracking-[0.3em] text-ink-muted">
              Submit Your Entry
            </h2>
            <div className="h-px flex-1 bg-ink/15" />
          </div>

          <div className="border-2 border-ink p-[3px]">
            <div className="border border-ink/50 px-6 py-5">
              <p className="mb-3 font-body text-sm text-ink-light">
                Enter the{" "}
                <strong className="text-ink">owner/repo</strong> of any public
                GitHub repository to generate a race.
              </p>
              <RepoInput />
            </div>
          </div>
        </section>

        {/* Repository list */}
        <section>
          <div className="mb-6 flex items-center gap-2">
            <div className="h-px flex-1 bg-ink/15" />
            <h2 className="whitespace-nowrap font-ui text-xs font-bold uppercase tracking-[0.3em] text-ink-muted">
              Your Repositories
            </h2>
            <div className="h-px flex-1 bg-ink/15" />
          </div>

          <Suspense fallback={<RepoListSkeleton />}>
            <RepoList />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
