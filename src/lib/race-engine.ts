import type { CommitData, RaceFrame, RaceData, Contributor } from "./types";

export function buildRaceData(commits: CommitData[]): RaceData {
  const scores: Record<string, number> = {};
  const avatars: Record<string, string> = {};
  const frames: RaceFrame[] = [];

  // First pass: compute final max score so positions only move forward
  let finalMaxScore = 0;
  {
    const tmp: Record<string, number> = {};
    for (const c of commits) {
      tmp[c.author] = (tmp[c.author] ?? 0) + c.score;
    }
    finalMaxScore = Math.max(...Object.values(tmp), 1);
  }

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    const { author, avatarUrl, score } = commit;

    if (!scores[author]) scores[author] = 0;
    if (!avatars[author] && avatarUrl) avatars[author] = avatarUrl;

    scores[author] += score;

    // Base speed: everyone advances just by time passing (40% of the lap)
    // Boost: score gives you the remaining 60%
    const BASE_WEIGHT = 0.4;
    const BOOST_WEIGHT = 0.6;
    const baseProgress = commits.length > 1 ? i / (commits.length - 1) : 1;

    const positions: Record<string, number> = {};
    for (const [login, s] of Object.entries(scores)) {
      positions[login] = BASE_WEIGHT * baseProgress + BOOST_WEIGHT * (s / finalMaxScore);
    }

    frames.push({
      commitIndex: i,
      commit,
      scores: { ...scores },
      positions: { ...positions },
    });
  }

  // Build sorted contributor list from final scores (keep all)
  const contributors: Contributor[] = Object.entries(scores)
    .map(([login, totalScore]) => ({
      login,
      avatarUrl: avatars[login] ?? "",
      totalScore,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  // O(1) lookup map for the renderer
  const contributorMap: Record<string, Contributor> = {};
  for (const c of contributors) {
    contributorMap[c.login] = c;
  }

  return {
    contributors,
    contributorMap,
    frames,
    totalCommits: commits.length,
  };
}
