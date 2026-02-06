"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { RaceControls } from "@/components/RaceControls";
import { TimingTower } from "@/components/TimingTower";
import { LiveCommentary } from "@/components/LiveCommentary";
import { useVideoExport } from "@/lib/use-video-export";
import type { RaceData } from "@/lib/types";

const RaceTrack = dynamic(
  () =>
    import("@/components/RaceTrack").then((m) => ({
      default: m.RaceTrack,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[16/9] w-full animate-pulse border-2 border-ink/15 bg-paper" />
    ),
  }
);

type RacePhase = "idle" | "countdown" | "racing" | "finished";

interface RaceViewProps {
  raceData: RaceData;
  owner: string;
  repo: string;
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d
    .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    .toUpperCase();
}

export function RaceView({ raceData, owner, repo }: RaceViewProps) {
  const totalFrames = raceData.frames.length;

  // Recommended speed: target ≤1 min, but never slower than 1x
  const speedFor1Min = (totalFrames * 200) / 60000;
  const recommendedSpeed = Math.max(1, speedFor1Min);

  const [racePhase, setRacePhase] = useState<RacePhase>("idle");
  const [countdownNum, setCountdownNum] = useState(3);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(recommendedSpeed);
  const [resetKey, setResetKey] = useState(0);

  const isFinished = racePhase === "finished";

  // Target positions from commit frames (what racers are heading toward)
  const [targetPositions, setTargetPositions] = useState<
    Record<string, number>
  >({});

  const frameRef = useRef(0);
  const accumRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(recommendedSpeed);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Video export
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isRecording, startRecording, stopRecording, cancelRecording } =
    useVideoExport();
  const isRecordingRef = useRef(false);
  isRecordingRef.current = isRecording;

  const msPerFrame = 200;

  // Date range from commits
  const dateRange = useMemo(() => {
    if (raceData.frames.length === 0) return "";
    const first = raceData.frames[0].commit.date;
    const last = raceData.frames[raceData.frames.length - 1].commit.date;
    const startStr = formatMonth(first);
    const endStr = formatMonth(last);
    if (startStr === endStr) return startStr;
    return `${startStr}\u2009\u2014\u2009${endStr}`;
  }, [raceData.frames]);

  // Current frame scores for timing tower
  const currentScores = raceData.frames[currentFrame]?.scores ?? {};

  // ── Countdown timer ──
  useEffect(() => {
    if (racePhase !== "countdown") return;

    let cancelled = false;
    setCountdownNum(3);

    const timers = [
      setTimeout(() => {
        if (!cancelled) setCountdownNum(2);
      }, 1000),
      setTimeout(() => {
        if (!cancelled) setCountdownNum(1);
      }, 2000),
      setTimeout(() => {
        if (!cancelled) setCountdownNum(0);
      }, 3000),
      setTimeout(() => {
        if (cancelled) return;
        setRacePhase("racing");
        playingRef.current = true;
        setIsPlaying(true);
        lastTimeRef.current = 0;
      }, 3700),
    ];

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [racePhase]);

  // ── Animation tick ──
  const tick = useCallback(
    (time: number) => {
      if (!playingRef.current) {
        lastTimeRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }

      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      accumRef.current += (delta / msPerFrame) * speedRef.current;

      // Advance frames
      while (accumRef.current >= 1 && frameRef.current < totalFrames - 1) {
        accumRef.current -= 1;
        frameRef.current += 1;
      }

      if (frameRef.current >= totalFrames - 1) {
        frameRef.current = totalFrames - 1;
        accumRef.current = 0;
        playingRef.current = false;
        setIsPlaying(false);
        setRacePhase("finished");

        // Auto-stop recording after a short delay for LERP to settle
        if (isRecordingRef.current) {
          setTimeout(() => {
            stopRecording();
          }, 500);
        }
      }

      const frame = raceData.frames[frameRef.current];
      if (frame) {
        setTargetPositions(frame.positions);
        setCurrentFrame(frameRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [totalFrames, raceData.frames, stopRecording]
  );

  useEffect(() => {
    // Set initial positions
    if (raceData.frames.length > 0) {
      setTargetPositions(raceData.frames[0].positions);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick, raceData.frames]);

  // ── Handlers ──
  const handleStartRace = useCallback(() => {
    setRacePhase("countdown");
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      playingRef.current = next;
      if (next) lastTimeRef.current = 0;
      return next;
    });
  }, []);

  const handleRestart = useCallback(() => {
    frameRef.current = 0;
    accumRef.current = 0;
    lastTimeRef.current = 0;
    playingRef.current = true;
    setCurrentFrame(0);
    setTargetPositions(raceData.frames[0]?.positions ?? {});
    setIsPlaying(true);
    setRacePhase("racing");
    setResetKey((k) => k + 1);
  }, [raceData.frames]);

  const handleSpeedChange = useCallback((s: number) => {
    speedRef.current = s;
    setSpeed(s);
  }, []);

  const handleCanvasReady = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      canvasRef.current = canvas;
    },
    []
  );

  const handleExportVideo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Restart race at 1x speed, then start recording
    frameRef.current = 0;
    accumRef.current = 0;
    lastTimeRef.current = 0;
    speedRef.current = 1;
    setSpeed(1);
    setCurrentFrame(0);
    setTargetPositions(raceData.frames[0]?.positions ?? {});
    setRacePhase("racing");
    setResetKey((k) => k + 1);

    // Start recording, then play
    const started = startRecording(canvas);
    if (started) {
      playingRef.current = true;
      setIsPlaying(true);
    }
  }, [raceData.frames, startRecording]);

  const handleCancelRecording = useCallback(() => {
    cancelRecording();
  }, [cancelRecording]);

  const currentCommit = raceData.frames[currentFrame]?.commit;

  return (
    <div className="space-y-4">
      {/* Date range dateline */}
      {dateRange && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-rule/40" />
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">
            {dateRange}
          </p>
          <div className="h-px flex-1 bg-rule/40" />
        </div>
      )}

      {/* Main race area: timing tower + track */}
      <div className="flex gap-4">
        {/* Timing Tower — desktop only */}
        <div className="hidden w-52 shrink-0 lg:block">
          <TimingTower
            contributors={raceData.contributors}
            scores={currentScores}
            positions={targetPositions}
            isFinished={isFinished}
          />
        </div>

        {/* Track + overlays + controls */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* Track with overlays */}
          <div className="relative">
            <RaceTrack
              raceData={raceData}
              targetPositions={targetPositions}
              seed={`${owner}/${repo}`}
              resetKey={resetKey}
              onCanvasReady={handleCanvasReady}
              currentFrame={currentFrame}
              totalFrames={totalFrames}
            />

            {/* ── Start overlay ── */}
            {racePhase === "idle" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-cream/75 backdrop-blur-[2px]">
                <div className="border-2 border-ink p-[3px]">
                  <button
                    onClick={handleStartRace}
                    className="cursor-pointer border border-ink/50 bg-cream px-10 py-6 text-center transition-colors hover:bg-paper"
                  >
                    <p className="font-ui text-xs font-bold uppercase tracking-[0.3em] text-ink-muted">
                      &#9733; Lights Out &#9733;
                    </p>
                    <p className="mt-2 font-heading text-3xl font-black italic text-racing-red md:text-4xl">
                      Start the Race
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* ── Countdown overlay ── */}
            {racePhase === "countdown" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-cream/50">
                <div key={countdownNum} className="np-count select-none">
                  {countdownNum > 0 ? (
                    <span className="font-heading text-[10rem] font-black italic leading-none text-ink md:text-[14rem]">
                      {countdownNum}
                    </span>
                  ) : (
                    <span className="font-heading text-[6rem] font-black italic leading-none text-racing-red md:text-[8rem]">
                      GO!
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Controls — visible once race has started */}
          {(racePhase === "racing" || racePhase === "finished") && (
            <RaceControls
              isPlaying={isPlaying}
              speed={speed}
              currentFrame={currentFrame}
              totalFrames={totalFrames}
              recommendedSpeed={recommendedSpeed}
              onPlayPause={handlePlayPause}
              onRestart={handleRestart}
              onSpeedChange={handleSpeedChange}
              isRecording={isRecording}
              onExportVideo={handleExportVideo}
              onCancelRecording={handleCancelRecording}
            />
          )}
        </div>
      </div>

      {/* Commit ticker — telegraph wire style */}
      {(racePhase === "racing" || racePhase === "finished") &&
      currentCommit ? (
        <div className="border-l-[3px] border-racing-red bg-paper py-3 pl-4 pr-4">
          <div className="flex items-center gap-3">
            <span className="font-ui text-sm font-bold uppercase text-ink">
              {currentCommit.author}
            </span>
            <span className="font-ui text-xs text-ink-muted">
              +{currentCommit.score.toFixed(1)} pts
            </span>
          </div>
          <p className="mt-1 truncate text-sm italic text-ink-light">
            {currentCommit.message}
          </p>
        </div>
      ) : null}

      {/* Live Commentary feed */}
      <LiveCommentary
        raceData={raceData}
        currentFrame={currentFrame}
        racePhase={racePhase}
      />

      {/* Final standings — newspaper results table */}
      {isFinished ? (
        <div className="border-2 border-ink p-[3px]">
          <div className="border border-ink/50 bg-paper p-6">
            <div className="mb-4 border-b-[3px] border-ink pb-3">
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">
                Final Classification
              </p>
              <h2 className="font-heading text-2xl font-black italic text-ink">
                Race Complete
              </h2>
            </div>
            <div className="space-y-1">
              {raceData.contributors.slice(0, 10).map((c, i) => (
                <div
                  key={c.login}
                  className={`flex items-center justify-between py-1.5 ${
                    i < 3 ? "border-b border-rule/40" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-ui text-sm font-bold tabular-nums ${
                        i === 0
                          ? "text-gold-medal"
                          : i === 1
                            ? "text-silver-medal"
                            : i === 2
                              ? "text-bronze-medal"
                              : "text-ink-muted"
                      }`}
                    >
                      #{i + 1}
                    </span>
                    <span
                      className={`font-ui text-sm ${
                        i < 3 ? "font-bold text-ink" : "text-ink-light"
                      }`}
                    >
                      {c.login}
                    </span>
                  </div>
                  <span className="font-ui text-sm tabular-nums text-ink-muted">
                    {c.totalScore.toFixed(1)} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
