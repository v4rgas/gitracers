import { Suspense } from "react";
import { checkRace } from "@/actions/commits";
import { SignInButton } from "@/components/SignInButton";
import Link from "next/link";
import { RacePageClient } from "./client";

function RaceSkeleton() {
  return (
    <>
      <div className="aspect-[16/9] w-full animate-pulse bg-paper" />
      <div className="mt-4 h-10 animate-pulse bg-paper/60" />
      <div className="mt-3 h-16 animate-pulse bg-paper/40" />
    </>
  );
}

async function RaceLoader({ owner, repo }: { owner: string; repo: string }) {
  const result = await checkRace(owner, repo);

  if (result.exists) {
    if (result.raceData.frames.length === 0) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center">
          <div className="border-2 border-ink p-[3px]">
            <div className="border border-ink/50 px-8 py-8 text-center">
              <p className="font-ui text-xs font-bold uppercase tracking-[0.25em] text-ink-muted">
                &#9733; No Results &#9733;
              </p>
              <div className="my-3 h-px bg-ink/15" />
              <p className="font-heading text-xl italic text-ink">
                No commits found for this repository.
              </p>
              <Link
                href="/repos"
                className="mt-4 inline-block font-ui text-sm font-semibold uppercase tracking-wider text-racing-red hover:underline"
              >
                &larr; Back to Programme
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return (
      <RacePageClient
        owner={owner}
        repo={repo}
        initialRaceData={result.raceData}
      />
    );
  }

  if (result.needsAuth) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <div className="border-2 border-ink p-[3px]">
          <div className="border border-ink/50 px-8 py-8 text-center">
            <p className="font-ui text-xs font-bold uppercase tracking-[0.25em] text-ink-muted">
              &#9733; Race Entry &#9733;
            </p>
            <div className="my-3 h-px bg-ink/15" />
            <p className="font-heading text-xl italic text-ink">
              Sign in to race this repository
            </p>
            <p className="mt-2 font-body text-sm text-ink-muted">
              No published race exists for this repo yet.
            </p>
            <div className="mt-4">
              <SignInButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RacePageClient
      owner={owner}
      repo={repo}
      isPublicRepo={result.isPublicRepo}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  return { title: `${owner}/${repo} \u2014 The Gran Git Races` };
}

export default async function RacePage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  return (
    <div className="min-h-screen bg-cream">
      {/* Racing stripe */}
      <div className="h-1 bg-racing-red" />

      <div className="mx-auto max-w-7xl px-4 pt-6 pb-12">
        {/* Mini masthead */}
        <header className="mb-6">
          <div className="border-t-[3px] border-ink" />
          <div className="mt-[3px] border-t border-ink/50" />

          <div className="flex items-center justify-between py-3">
            <Link
              href="/"
              className="font-heading text-lg font-black italic tracking-tight text-ink transition-colors hover:text-racing-red"
            >
              The Gran <span className="text-racing-red">Git Races</span>
            </Link>
            <Link
              href="/repos"
              className="font-ui text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted transition-colors hover:text-racing-red"
            >
              &larr; Back to Programme
            </Link>
          </div>

          <div className="border-t border-ink/15" />

          {/* Race headline */}
          <div className="mt-4 border-b-[3px] border-ink pb-3">
            <h1 className="font-heading text-3xl font-black italic text-ink md:text-4xl">
              {owner}
              <span className="text-ink-muted/40">/</span>
              <span className="text-racing-red">{repo}</span>
            </h1>
          </div>
        </header>

        <Suspense fallback={<RaceSkeleton />}>
          <RaceLoader owner={owner} repo={repo} />
        </Suspense>
      </div>
    </div>
  );
}
