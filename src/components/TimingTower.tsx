"use client";

import type { Contributor } from "@/lib/types";

interface TimingTowerProps {
  contributors: Contributor[];
  scores: Record<string, number>;
  positions: Record<string, number>;
  isFinished: boolean;
}

const POSITION_COLORS = [
  "border-l-gold-medal",
  "border-l-silver-medal",
  "border-l-bronze-medal",
];

const RANK_TEXT_COLORS = [
  "text-gold-medal",
  "text-silver-medal",
  "text-bronze-medal",
];

export function TimingTower({
  contributors,
  scores,
  positions,
  isFinished,
}: TimingTowerProps) {
  const sorted = [...contributors]
    .map((c) => ({
      ...c,
      currentScore: scores[c.login] ?? 0,
      currentPos: positions[c.login] ?? 0,
    }))
    .sort(
      (a, b) =>
        b.currentPos - a.currentPos || b.currentScore - a.currentScore
    );

  const top10 = sorted.slice(0, 10);
  const leaderScore = top10[0]?.currentScore ?? 0;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-2 border-b-2 border-ink/15 pb-2">
        <div className="flex items-center gap-2">
          {!isFinished && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-racing-red opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-racing-red" />
            </span>
          )}
          <p className="font-ui text-[9px] font-bold uppercase tracking-[0.3em] text-racing-red">
            {isFinished ? "Classification" : "Live Timing"}
          </p>
        </div>
      </div>

      {/* Standings */}
      <div>
        {top10.map((c, i) => {
          const gap = leaderScore - c.currentScore;

          return (
            <div
              key={c.login}
              className={`flex items-center gap-1.5 border-l-2 py-[5px] pl-2 transition-colors ${
                POSITION_COLORS[i] ?? "border-l-transparent"
              } ${i === 0 ? "bg-paper/80" : ""} ${
                i < top10.length - 1 ? "border-b border-b-rule/30" : ""
              }`}
            >
              {/* Position */}
              <span
                className={`w-4 font-ui text-[11px] font-bold tabular-nums ${
                  RANK_TEXT_COLORS[i] ?? "text-ink-muted"
                }`}
              >
                {i + 1}
              </span>

              {/* Avatar */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.avatarUrl}
                alt=""
                width={18}
                height={18}
                className="rounded-full border border-rule/50"
              />

              {/* Name */}
              <span
                className={`flex-1 truncate font-ui text-[11px] ${
                  i === 0
                    ? "font-bold text-ink"
                    : i < 3
                      ? "font-semibold text-ink"
                      : "text-ink-light"
                }`}
              >
                {c.login}
              </span>

              {/* Score / Gap */}
              <span className="font-ui text-[10px] tabular-nums text-ink-muted">
                {i === 0
                  ? c.currentScore.toFixed(1)
                  : gap > 0
                    ? `+${gap.toFixed(1)}`
                    : c.currentScore.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-2 border-t border-rule/40 pt-2">
        <p className="font-ui text-[9px] uppercase tracking-wider text-ink-muted/60">
          {contributors.length} contributors
        </p>
      </div>
    </div>
  );
}
