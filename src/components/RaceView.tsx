"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { RaceControls } from "@/components/RaceControls";
import { TimingTower } from "@/components/TimingTower";
import { useVideoExport } from "@/lib/use-video-export";
import type { RaceData } from "@/lib/types";

const RaceTrack = dynamic(
  () => import("@/components/RaceTrack").then((m) => ({ default: m.RaceTrack })),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[16/9] w-full animate-pulse border-2 border-ink/15 bg-paper" />
    ),
  }
);

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
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Target positions from commit frames (what racers are heading toward)
  const [targetPositions, setTargetPositions] = useState<Record<string, number>>({});

  const frameRef = useRef(0);
  const accumRef = useRef(0);
  const playingRef = useRef(true);
  const speedRef = useRef(1);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Video export
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isRecording, startRecording, stopRecording, cancelRecording } = useVideoExport();
  const isRecordingRef = useRef(false);
  isRecordingRef.current = isRecording;

  const totalFrames = raceData.frames.length;
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
        setIsFinished(true);

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
    setIsFinished(false);
    setResetKey((k) => k + 1);
  }, [raceData.frames]);

  const handleSpeedChange = useCallback((s: number) => {
    speedRef.current = s;
    setSpeed(s);
  }, []);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
  }, []);

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
    setIsFinished(false);
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
      {/* Date range header */}
      {dateRange && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-rule/40" />
          <p className="font-ui text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-muted">
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

        {/* Track + controls */}
        <div className="min-w-0 flex-1 space-y-3">
          <RaceTrack
            raceData={raceData}
            targetPositions={targetPositions}
            seed={`${owner}/${repo}`}
            resetKey={resetKey}
            onCanvasReady={handleCanvasReady}
            currentFrame={currentFrame}
            totalFrames={totalFrames}
          />

          <RaceControls
            isPlaying={isPlaying}
            speed={speed}
            currentFrame={currentFrame}
            totalFrames={totalFrames}
            onPlayPause={handlePlayPause}
            onRestart={handleRestart}
            onSpeedChange={handleSpeedChange}
            isRecording={isRecording}
            onExportVideo={handleExportVideo}
            onCancelRecording={handleCancelRecording}
          />
        </div>
      </div>

      {/* Commit ticker */}
      {currentCommit ? (
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

      {/* Final standings — shown on all screen sizes when finished */}
      {isFinished ? (
        <div className="border-2 border-ink/15 bg-paper p-6">
          <div className="mb-4 border-b border-rule pb-3">
            <p className="font-ui text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-muted">
              Final Results
            </p>
            <h2 className="font-heading text-2xl font-bold italic text-ink">
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
      ) : null}
    </div>
  );
}
