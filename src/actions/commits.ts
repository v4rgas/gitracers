"use server";

import { auth } from "@/auth";
import { fetchCommits } from "@/lib/github";
import { buildRaceData } from "@/lib/race-engine";
import type { RaceData } from "@/lib/types";

export async function getRaceData(
  owner: string,
  repo: string
): Promise<RaceData> {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Not authenticated");

  const commits = await fetchCommits(session.accessToken, owner, repo);
  return buildRaceData(commits);
}
