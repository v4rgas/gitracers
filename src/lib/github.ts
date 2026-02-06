import { Octokit } from "@octokit/rest";
import type { RepoInfo, CommitData } from "./types";
import { calculateScore } from "./scoring";

export function createOctokit(token: string) {
  return new Octokit({ auth: token });
}

export async function fetchUserRepos(token: string): Promise<RepoInfo[]> {
  const octokit = createOctokit(token);
  const repos = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 100,
  });

  return repos.data.map((r) => ({
    name: r.name,
    fullName: r.full_name,
    owner: r.owner.login,
    description: r.description,
    stars: r.stargazers_count ?? 0,
    language: r.language,
    updatedAt: r.updated_at ?? "",
  }));
}

interface GraphQLCommitNode {
  oid: string;
  message: string;
  committedDate: string;
  additions: number;
  deletions: number;
  parents: { totalCount: number };
  author: {
    user: { login: string; avatarUrl: string } | null;
    name: string | null;
  };
}

interface GraphQLCommitResponse {
  repository: {
    defaultBranchRef: {
      target: {
        history: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: GraphQLCommitNode[];
        };
      };
    };
  };
}

const COMMITS_QUERY = `
  query ($owner: String!, $repo: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $repo) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: $first, after: $after) {
              pageInfo { hasNextPage endCursor }
              nodes {
                oid
                message
                committedDate
                additions
                deletions
                parents { totalCount }
                author {
                  user { login avatarUrl }
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchCommits(
  token: string,
  owner: string,
  repo: string,
  maxCommits = 500
): Promise<CommitData[]> {
  const octokit = createOctokit(token);
  const commits: CommitData[] = [];
  let cursor: string | null = null;

  while (commits.length < maxCommits) {
    const batchSize = Math.min(100, maxCommits - commits.length);

    const data: GraphQLCommitResponse = await octokit.graphql<GraphQLCommitResponse>(COMMITS_QUERY, {
      owner,
      repo,
      first: batchSize,
      after: cursor,
    });

    const history: GraphQLCommitResponse["repository"]["defaultBranchRef"]["target"]["history"] = data.repository.defaultBranchRef.target.history;

    for (const node of history.nodes) {
      if (commits.length >= maxCommits) break;

      // Skip merge commits (2+ parents)
      if (node.parents.totalCount > 1) continue;

      const author = node.author.user?.login ?? node.author.name ?? "unknown";
      const avatarUrl = node.author.user?.avatarUrl ?? "";
      const linesChanged = node.additions + node.deletions;

      commits.push({
        sha: node.oid,
        message: node.message.split("\n")[0],
        author,
        avatarUrl,
        date: node.committedDate,
        linesChanged,
        score: calculateScore(linesChanged),
      });
    }

    if (!history.pageInfo.hasNextPage) break;
    cursor = history.pageInfo.endCursor;
  }

  // Sort chronologically (oldest first)
  commits.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return commits;
}
