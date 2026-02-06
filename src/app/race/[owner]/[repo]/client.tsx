"use client";

import { useState } from "react";
import { RaceView } from "@/components/RaceView";
import { StartRacePrompt } from "@/components/StartRacePrompt";
import type { RaceData } from "@/lib/types";

export function RacePageClient({
  owner,
  repo,
  initialRaceData,
  isPublicRepo,
}: {
  owner: string;
  repo: string;
  initialRaceData?: RaceData;
  isPublicRepo?: boolean;
}) {
  const [raceData, setRaceData] = useState<RaceData | null>(initialRaceData ?? null);

  if (!raceData) {
    return (
      <StartRacePrompt
        owner={owner}
        repo={repo}
        isPublicRepo={isPublicRepo ?? false}
        onRaceCreated={setRaceData}
      />
    );
  }

  return <RaceView raceData={raceData} owner={owner} repo={repo} />;
}
