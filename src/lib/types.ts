import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}


export interface Contributor {
  login: string;
  avatarUrl: string;
  totalScore: number;
}

export interface CommitData {
  sha: string;
  message: string;
  author: string;
  avatarUrl: string;
  date: string;
  linesChanged: number;
  score: number;
}

export interface RaceFrame {
  commitIndex: number;
  commit: CommitData;
  /** Map of contributor login → cumulative score at this frame */
  scores: Record<string, number>;
  /** Map of contributor login → normalized position (0–1) */
  positions: Record<string, number>;
}

export interface RaceData {
  contributors: Contributor[];
  contributorMap: Record<string, Contributor>;
  frames: RaceFrame[];
  totalCommits: number;
}

export interface RepoInfo {
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  stars: number;
  language: string | null;
  updatedAt: string;
}
