import { getRepos } from "@/actions/repos";
import Link from "next/link";

export async function RepoList() {
  const repos = await getRepos();

  if (repos.length === 0) {
    return (
      <p className="font-body italic text-ink-muted">
        No repositories found.
      </p>
    );
  }

  return (
    <div className="divide-y divide-rule/70">
      {repos.map((repo) => (
        <Link
          key={repo.fullName}
          href={`/race/${repo.owner}/${repo.name}`}
          className="group flex items-baseline gap-2 py-4 transition-colors first:pt-0"
        >
          <span className="font-body text-sm text-racing-red">&#9656;</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-lg font-semibold text-ink transition-colors group-hover:text-racing-red">
                {repo.fullName}
              </span>
              <span className="mb-0.5 flex-1 border-b border-dotted border-ink-muted/25" />
              <div className="flex shrink-0 items-center gap-3 font-ui text-xs font-medium uppercase tracking-wider text-ink-muted">
                {repo.language ? <span>{repo.language}</span> : null}
                {repo.stars > 0 ? (
                  <span>&#9733; {repo.stars}</span>
                ) : null}
              </div>
            </div>
            {repo.description ? (
              <p className="mt-1 truncate text-sm text-ink-light">
                {repo.description}
              </p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
