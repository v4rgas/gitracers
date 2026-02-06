import type { CommitData } from "./types";
import { calculateScore } from "./scoring";

const AVATAR_PREFIX = "https://avatars.githubusercontent.com/u/";

/**
 * Compact storage format for commits.
 * ~64% smaller than raw JSON array of CommitData objects.
 *
 * Layout:
 *   a  – author table: [login, avatarSuffix][] (suffix after common GitHub prefix, "!" prefix = full URL)
 *   s  – 7-char short SHAs
 *   d  – delta-encoded unix timestamps (first is absolute, rest are deltas)
 *   m  – commit messages (truncated to 72 chars)
 *   l  – linesChanged numbers
 *   i  – per-commit index into the author table
 */
export interface CompactCommits {
  a: [string, string][];
  s: string[];
  d: number[];
  m: string[];
  l: number[];
  i: number[];
}

export function compressCommits(commits: CommitData[]): CompactCommits {
  // Build author lookup table (unique by login+avatarUrl pair)
  const authorMap = new Map<string, number>();
  const authorTable: [string, string][] = [];

  for (const c of commits) {
    const key = `${c.author}\0${c.avatarUrl}`;
    if (!authorMap.has(key)) {
      authorMap.set(key, authorTable.length);
      const suffix = c.avatarUrl.startsWith(AVATAR_PREFIX)
        ? c.avatarUrl.slice(AVATAR_PREFIX.length)
        : c.avatarUrl
          ? "!" + c.avatarUrl
          : "";
      authorTable.push([c.author, suffix]);
    }
  }

  // Delta-encode timestamps
  const timestamps = commits.map((c) =>
    Math.floor(new Date(c.date).getTime() / 1000)
  );
  const deltas: number[] = [timestamps[0] ?? 0];
  for (let j = 1; j < timestamps.length; j++) {
    deltas.push(timestamps[j] - timestamps[j - 1]);
  }

  return {
    a: authorTable,
    s: commits.map((c) => c.sha.slice(0, 7)),
    d: deltas,
    m: commits.map((c) => c.message.slice(0, 72)),
    l: commits.map((c) => c.linesChanged),
    i: commits.map((c) => authorMap.get(`${c.author}\0${c.avatarUrl}`)!),
  };
}

export function decompressCommits(compact: CompactCommits): CommitData[] {
  const { a: authorTable, s: shas, d: deltas, m: messages, l: lines, i: indices } = compact;
  const len = shas.length;
  const commits: CommitData[] = new Array(len);

  // Rebuild absolute timestamps from deltas
  let ts = 0;

  for (let j = 0; j < len; j++) {
    ts = j === 0 ? deltas[0] : ts + deltas[j];
    const [login, avatarSuffix] = authorTable[indices[j]];
    const avatarUrl = avatarSuffix === ""
      ? ""
      : avatarSuffix.startsWith("!")
        ? avatarSuffix.slice(1)
        : AVATAR_PREFIX + avatarSuffix;
    const linesChanged = lines[j];

    commits[j] = {
      sha: shas[j],
      message: messages[j],
      author: login,
      avatarUrl,
      date: new Date(ts * 1000).toISOString(),
      linesChanged,
      score: calculateScore(linesChanged),
    };
  }

  return commits;
}
