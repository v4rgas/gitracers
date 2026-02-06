"use server";

import { headers } from "next/headers";
import { auth } from "@/auth";
import { fetchCommits, fetchRepoVisibility } from "@/lib/github";
import { compressCommits, decompressCommits } from "@/lib/commit-codec";
import type { CompactCommits } from "@/lib/commit-codec";
import { buildRaceData } from "@/lib/race-engine";
import { getSupabase } from "@/lib/supabase";
import type { RaceData } from "@/lib/types";

async function getViewerIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  // Simple hash — no crypto dependency needed, just needs to be consistent
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash + ip.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

async function getSession() {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Not authenticated");
  const githubUserId = session.user.id;
  if (!githubUserId) throw new Error("Missing user info");

  // login might be missing from old JWTs created before the auth change —
  // fall back to fetching it from GitHub so users don't have to re-login
  let githubUsername = session.user.login;
  if (!githubUsername) {
    const { createOctokit } = await import("@/lib/github");
    const octokit = createOctokit(session.accessToken);
    const { data: user } = await octokit.users.getAuthenticated();
    githubUsername = user.login;
  }

  return { session, githubUserId, githubUsername };
}

export async function checkRace(
  owner: string,
  repo: string
): Promise<
  | { exists: true; raceData: RaceData }
  | { exists: false; isPublicRepo: boolean; needsAuth: boolean }
> {
  const session = await auth();
  const supabase = getSupabase();

  // If authenticated, check for user's own race first
  if (session?.accessToken) {
    let githubUsername = session.user.login;
    if (!githubUsername) {
      const { createOctokit } = await import("@/lib/github");
      const octokit = createOctokit(session.accessToken);
      const { data: user } = await octokit.users.getAuthenticated();
      githubUsername = user.login;
    }

    const { data: own } = await supabase
      .from("races")
      .select("id, commits")
      .eq("github_username", githubUsername)
      .eq("owner", owner)
      .eq("repo", repo)
      .single();

    if (own) {
      const ipHash = await getViewerIpHash();
      supabase
        .from("race_views")
        .upsert({ race_id: own.id, ip_hash: ipHash }, { onConflict: "race_id,ip_hash", ignoreDuplicates: true })
        .then(() => {});

      return { exists: true, raceData: buildRaceData(decompressCommits(own.commits as CompactCommits)) };
    }
  }

  // Check for any published race for this repo (works for anyone)
  const { data: published } = await supabase
    .from("races")
    .select("id, commits")
    .eq("owner", owner)
    .eq("repo", repo)
    .eq("is_published", true)
    .limit(1)
    .single();

  if (published) {
    const ipHash = await getViewerIpHash();
    supabase
      .from("race_views")
      .upsert({ race_id: published.id, ip_hash: ipHash }, { onConflict: "race_id,ip_hash", ignoreDuplicates: true })
      .then(() => {});

    return { exists: true, raceData: buildRaceData(decompressCommits(published.commits as CompactCommits)) };
  }

  // No race found — need auth to create one
  if (!session?.accessToken) {
    return { exists: false, isPublicRepo: false, needsAuth: true };
  }

  const isPrivate = await fetchRepoVisibility(session.accessToken, owner, repo);
  return { exists: false, isPublicRepo: !isPrivate, needsAuth: false };
}

export async function getPublicRaces(): Promise<{ owner: string; repo: string }[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("races")
    .select("owner, repo")
    .eq("is_published", true);

  if (error || !data) return [];

  // Deduplicate by owner/repo
  const seen = new Set<string>();
  const unique: { owner: string; repo: string }[] = [];
  for (const row of data) {
    const key = `${row.owner}/${row.repo}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ owner: row.owner, repo: row.repo });
    }
  }

  return unique;
}

export async function getMostViewedRaces(limit = 10): Promise<{ owner: string; repo: string; view_count: number }[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("races")
    .select("owner, repo, view_count")
    .eq("is_published", true)
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Deduplicate by owner/repo, keep highest view count
  const seen = new Set<string>();
  const unique: { owner: string; repo: string; view_count: number }[] = [];
  for (const row of data) {
    const key = `${row.owner}/${row.repo}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  }

  return unique;
}

export async function createRace(
  owner: string,
  repo: string,
  isPublished: boolean
): Promise<RaceData> {
  const { session, githubUsername } = await getSession();
  const supabase = getSupabase();

  // fetchCommits returns isPrivate from the same GraphQL query — no extra API call needed
  const { commits, isPrivate } = await fetchCommits(session.accessToken!, owner, repo);

  await supabase.from("races").insert({
    github_user_id: githubUsername,
    github_username: githubUsername,
    owner,
    repo,
    is_public_repo: !isPrivate,
    is_published: isPublished,
    commits: compressCommits(commits),
  });

  return buildRaceData(commits);
}
