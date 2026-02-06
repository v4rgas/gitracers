"use client";

import { useEffect, useRef, useState } from "react";
import type { RaceData } from "@/lib/types";

interface Entry {
  id: number;
  text: string;
}

type RacePhase = "idle" | "countdown" | "racing" | "finished";

interface Props {
  raceData: RaceData;
  currentFrame: number;
  racePhase: RacePhase;
}

const MIN_GAP = 15;

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function rankings(positions: Record<string, number>): string[] {
  return Object.entries(positions)
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => name);
}

export function LiveCommentary({ raceData, currentFrame, racePhase }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const idRef = useRef(0);
  const prevLeaderRef = useRef<string | null>(null);
  const prevTop3Ref = useRef<string[]>([]);
  const lastAddRef = useRef(-999);
  const mileRef = useRef({ start: false, half: false, end: false });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  useEffect(() => {
    if (racePhase !== "racing" && racePhase !== "finished") return;

    const frame = raceData.frames[currentFrame];
    if (!frame) return;

    const total = raceData.frames.length;
    const ranked = rankings(frame.positions);
    const leader = ranked[0];
    const top3 = ranked.slice(0, 3);
    const scores = frame.scores;
    const commit = frame.commit;
    const isReset = currentFrame === 0;

    if (isReset) {
      prevLeaderRef.current = null;
      prevTop3Ref.current = [];
      lastAddRef.current = -999;
      mileRef.current = { start: false, half: false, end: false };
      idRef.current = 0;
    }

    const batch: string[] = [];
    const gap = currentFrame - lastAddRef.current;

    function add(text: string, force = false) {
      if (!force && gap < MIN_GAP && batch.length === 0) return;
      batch.push(text);
      lastAddRef.current = currentFrame;
    }

    // ── Race start ──
    if (!mileRef.current.start && currentFrame <= 2) {
      mileRef.current.start = true;
      add(
        pick(
          [
            `And we\u2019re off! ${raceData.contributors.length} contributors line up on the grid.`,
            `The lights go out and ${raceData.contributors.length} racers surge forward!`,
            `Green flag! ${raceData.contributors.length} developers take to the circuit.`,
          ],
          total
        ),
        true
      );
    }

    // ── Lead change (always fires) ──
    if (
      prevLeaderRef.current &&
      leader !== prevLeaderRef.current &&
      currentFrame > 2
    ) {
      add(
        pick(
          [
            `${leader} takes the lead from ${prevLeaderRef.current}!`,
            `A change at the top! ${leader} displaces ${prevLeaderRef.current} for P1!`,
            `${prevLeaderRef.current} dethroned! ${leader} now leads the race!`,
          ],
          currentFrame
        ),
        true
      );
    }

    // ── Big commit (score > 6) ──
    if (commit.score > 6) {
      add(
        pick(
          [
            `A colossal ${commit.linesChanged.toLocaleString()}-line commit from ${commit.author}! +${commit.score.toFixed(1)} pts!`,
            `${commit.author} drops a ${commit.linesChanged.toLocaleString()}-line contribution on the field!`,
            `What a commit! ${commit.author} pushes ${commit.linesChanged.toLocaleString()} lines for +${commit.score.toFixed(1)} pts!`,
          ],
          currentFrame
        )
      );
    }

    // ── Podium change ──
    if (currentFrame > 5 && prevTop3Ref.current.length > 0) {
      for (let i = 0; i < 3; i++) {
        if (top3[i] && !prevTop3Ref.current.includes(top3[i])) {
          add(
            pick(
              [
                `${top3[i]} storms into P${i + 1}! A new name on the podium!`,
                `Podium shake-up! ${top3[i]} moves into P${i + 1}!`,
                `${top3[i]} breaks into the top three at P${i + 1}!`,
              ],
              currentFrame + i
            )
          );
          break;
        }
      }
    }

    // ── Halfway mark ──
    if (
      !mileRef.current.half &&
      currentFrame >= Math.floor(total / 2) &&
      currentFrame < Math.floor(total / 2) + 5
    ) {
      mileRef.current.half = true;
      const s1 = scores[leader] ?? 0;
      const second = ranked[1];
      const s2 = second ? (scores[second] ?? 0) : 0;
      const diff = (s1 - s2).toFixed(1);
      add(
        pick(
          [
            `Half distance! ${leader} leads by ${diff} pts with ${second ?? "the field"} in pursuit.`,
            `We\u2019re at the halfway mark. ${leader} holds a ${diff}-point advantage.`,
            `Halfway through! ${leader} out front, ${diff} pts clear of ${second ?? "the rest"}.`,
          ],
          currentFrame
        ),
        true
      );
    }

    // ── Close battle ──
    if (ranked.length >= 2 && gap >= MIN_GAP && currentFrame % 35 < 2) {
      const s1 = scores[ranked[0]] ?? 0;
      const s2 = scores[ranked[1]] ?? 0;
      const diff = s1 - s2;
      if (diff > 0 && diff < 2) {
        add(
          pick(
            [
              `${ranked[0]} and ${ranked[1]} are neck and neck \u2014 just ${diff.toFixed(1)} pts between them!`,
              `What a duel between ${ranked[0]} and ${ranked[1]}! The gap is only ${diff.toFixed(1)} pts!`,
            ],
            currentFrame
          )
        );
      }
    }

    // ── Big lead (leader pulls away) ──
    if (
      ranked.length >= 2 &&
      gap >= MIN_GAP &&
      currentFrame > 20 &&
      currentFrame % 50 < 2
    ) {
      const s1 = scores[ranked[0]] ?? 0;
      const s2 = scores[ranked[1]] ?? 0;
      const diff = s1 - s2;
      if (diff > 20) {
        add(
          pick(
            [
              `${ranked[0]} is in a league of their own \u2014 ${diff.toFixed(1)} pts clear!`,
              `Dominant showing from ${ranked[0]}! The gap stretches to ${diff.toFixed(1)} pts.`,
            ],
            currentFrame
          )
        );
      }
    }

    // ── Race end ──
    if (racePhase === "finished" && !mileRef.current.end) {
      mileRef.current.end = true;
      const second = ranked[1];
      const s1 = scores[leader] ?? 0;
      const s2 = second ? (scores[second] ?? 0) : 0;
      const margin = (s1 - s2).toFixed(1);
      add(
        pick(
          [
            `The chequered flag drops! ${leader} wins by ${margin} pts!`,
            `It\u2019s over! ${leader} crosses the line first, ${margin} pts ahead of ${second ?? "the field"}!`,
            `Race complete! ${leader} takes the crown with a ${margin}-point margin!`,
          ],
          total
        ),
        true
      );
    }

    prevLeaderRef.current = leader;
    prevTop3Ref.current = top3;

    if (batch.length > 0) {
      const newEntries = batch.map((text) => ({ id: idRef.current++, text }));
      if (isReset) {
        setEntries(newEntries);
      } else {
        setEntries((prev) => [...prev, ...newEntries]);
      }
    } else if (isReset) {
      setEntries([]);
    }
  }, [currentFrame, racePhase, raceData]);

  if (racePhase === "idle" || racePhase === "countdown") return null;
  if (entries.length === 0) return null;

  return (
    <div className="border-2 border-ink/15">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-ink/15 bg-paper/80 px-4 py-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-racing-red opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-racing-red" />
        </span>
        <p className="font-ui text-[11px] font-bold uppercase tracking-[0.3em] text-ink-muted">
          Live Commentary
        </p>
      </div>

      {/* Feed */}
      <div ref={scrollRef} className="max-h-52 overflow-y-auto px-4 py-3">
        <div className="space-y-2.5">
          {entries.map((entry) => (
            <p
              key={entry.id}
              className="border-l-2 border-racing-red/30 pl-3 font-body text-sm leading-snug text-ink-light"
            >
              {entry.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
