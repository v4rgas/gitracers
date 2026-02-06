"use server";

import { auth } from "@/auth";
import { fetchUserRepos } from "@/lib/github";
import type { RepoInfo } from "@/lib/types";

export async function getRepos(): Promise<RepoInfo[]> {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Not authenticated");
  return fetchUserRepos(session.accessToken);
}
