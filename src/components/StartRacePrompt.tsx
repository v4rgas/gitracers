"use client";

import { useState, useTransition } from "react";
import { createRace } from "@/actions/commits";
import type { RaceData } from "@/lib/types";

export function StartRacePrompt({
  owner,
  repo,
  isPublicRepo,
  onRaceCreated,
}: {
  owner: string;
  repo: string;
  isPublicRepo: boolean;
  onRaceCreated: (raceData: RaceData) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isPublished, setIsPublished] = useState(isPublicRepo);

  function handleStart() {
    startTransition(async () => {
      const raceData = await createRace(owner, repo, isPublished);
      onRaceCreated(raceData);
    });
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="w-full max-w-lg">
        {/* Framed race entry form */}
        <div className="border-2 border-ink p-[3px]">
          <div className="border border-ink/50 px-8 py-8">
            <div className="text-center">
              <p className="font-ui text-xs font-bold uppercase tracking-[0.25em] text-ink-muted">
                &#9733; Race Entry &#9733;
              </p>
              <div className="mx-auto my-3 h-px w-24 bg-ink/15" />
              <h2 className="font-heading text-3xl font-black italic text-ink">
                Ready to race?
              </h2>
              <p className="mt-3 font-body text-base text-ink-light">
                We&apos;ll analyse the commit history of{" "}
                <span className="font-semibold text-ink">
                  {owner}/{repo}
                </span>{" "}
                and turn it into a race.
              </p>
            </div>

            <div className="mt-6 border-t-2 border-b-2 border-ink/10 py-5">
              {isPublicRepo ? (
                <p className="text-center font-body text-sm text-ink-muted">
                  Since this is a{" "}
                  <span className="font-semibold text-ink">
                    public repository
                  </span>
                  , your race will be featured on the front page for all to see.
                </p>
              ) : (
                <>
                  <p className="mb-4 text-center font-ui text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                    Visibility
                  </p>
                  <div className="flex flex-col gap-3">
                    <label className="flex cursor-pointer items-center gap-3 border-2 border-ink/10 px-4 py-3 transition-colors has-[:checked]:border-racing-red has-[:checked]:bg-racing-red/5">
                      <input
                        type="radio"
                        name="visibility"
                        checked={!isPublished}
                        onChange={() => setIsPublished(false)}
                        className="accent-racing-red"
                      />
                      <div className="text-left">
                        <span className="font-ui text-sm font-semibold text-ink">
                          Just me
                        </span>
                        <p className="font-body text-sm text-ink-muted">
                          Only you can see this race
                        </p>
                      </div>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 border-2 border-ink/10 px-4 py-3 transition-colors has-[:checked]:border-racing-red has-[:checked]:bg-racing-red/5">
                      <input
                        type="radio"
                        name="visibility"
                        checked={isPublished}
                        onChange={() => setIsPublished(true)}
                        className="accent-racing-red"
                      />
                      <div className="text-left">
                        <span className="font-ui text-sm font-semibold text-ink">
                          Everyone
                        </span>
                        <p className="font-body text-sm text-ink-muted">
                          Featured on the front page
                        </p>
                      </div>
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={handleStart}
                disabled={isPending}
                className="cursor-pointer border-2 border-racing-red bg-racing-red px-10 py-3.5 font-ui text-sm font-bold uppercase tracking-[0.2em] text-cream transition-all hover:bg-transparent hover:text-racing-red disabled:opacity-50"
              >
                {isPending ? "Loading commits\u2026" : "Start the race"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
