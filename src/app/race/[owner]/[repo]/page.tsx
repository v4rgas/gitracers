import { Suspense } from "react";
import { getRaceData } from "@/actions/commits";
import { RaceView } from "@/components/RaceView";
import Link from "next/link";

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
  const raceData = await getRaceData(owner, repo);

  if (raceData.frames.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <p className="font-heading text-xl italic text-ink-muted">
          No commits found for this repository.
        </p>
        <Link
          href="/repos"
          className="mt-4 font-ui text-sm font-semibold uppercase tracking-wider text-racing-red hover:underline"
        >
          Pick another repo
        </Link>
      </div>
    );
  }

  return <RaceView raceData={raceData} owner={owner} repo={repo} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  return { title: `${owner}/${repo} — GitRacers` };
}

export default async function RacePage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  return (
    <div className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Red stripe */}
        <div className="mb-6 h-0.5 bg-racing-red" />

        <div className="mb-6 border-b-2 border-ink/15 pb-4">
          <Link
            href="/repos"
            className="font-ui text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted transition-colors hover:text-racing-red"
          >
            &larr; Back to repos
          </Link>
          <h1 className="mt-1 font-heading text-3xl font-bold italic text-ink">
            {owner}
            <span className="text-ink-muted/60">/</span>
            {repo}
          </h1>
        </div>

        <Suspense fallback={<RaceSkeleton />}>
          <RaceLoader owner={owner} repo={repo} />
        </Suspense>
      </div>
    </div>
  );
}
