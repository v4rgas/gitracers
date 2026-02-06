import { Suspense } from "react";
import { RepoList } from "@/components/RepoList";
import { RepoInput } from "@/components/RepoInput";
import { SignOutButton } from "@/components/SignOutButton";

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
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Top red stripe */}
        <div className="mb-8 h-0.5 bg-racing-red" />

        <div className="mb-8 flex items-end justify-between border-b-2 border-ink/15 pb-4">
          <div>
            <p className="font-ui text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-muted">
              Select Your Circuit
            </p>
            <h1 className="font-heading text-4xl font-bold italic text-ink">
              Pick a Repo
            </h1>
          </div>
          <SignOutButton />
        </div>

        <div className="mb-8">
          <p className="mb-2 font-ui text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            Or enter any public repository
          </p>
          <RepoInput />
        </div>

        <div className="mb-6 border-t border-rule" />

        <Suspense fallback={<RepoListSkeleton />}>
          <RepoList />
        </Suspense>
      </div>
    </div>
  );
}
