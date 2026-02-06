"use client";

const BASE_SPEEDS = [0.5, 1, 2, 4];

interface RaceControlsProps {
  isPlaying: boolean;
  speed: number;
  currentFrame: number;
  totalFrames: number;
  recommendedSpeed: number;
  onPlayPause: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
  isRecording?: boolean;
  onExportVideo?: () => void;
  onCancelRecording?: () => void;
}

export function RaceControls({
  isPlaying,
  speed,
  currentFrame,
  totalFrames,
  recommendedSpeed,
  onPlayPause,
  onRestart,
  onSpeedChange,
  isRecording = false,
  onExportVideo,
  onCancelRecording,
}: RaceControlsProps) {
  const progress = totalFrames > 0 ? (currentFrame / (totalFrames - 1)) * 100 : 0;

  // Build speed options — include recommended if not already present
  const speeds =
    recommendedSpeed > 4 && !BASE_SPEEDS.includes(recommendedSpeed)
      ? [...BASE_SPEEDS, recommendedSpeed]
      : BASE_SPEEDS;

  // Estimated duration at current speed
  const estSeconds = totalFrames > 0 ? (totalFrames * 200) / speed / 1000 : 0;
  const estMin = Math.floor(estSeconds / 60);
  const estSec = Math.round(estSeconds % 60);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onPlayPause}
            disabled={isRecording}
            className="cursor-pointer border border-ink/20 px-4 py-1.5 font-ui text-xs font-bold uppercase tracking-wider text-ink transition-all hover:border-ink hover:bg-ink hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={onRestart}
            disabled={isRecording}
            className="cursor-pointer border border-ink/20 px-4 py-1.5 font-ui text-xs font-bold uppercase tracking-wider text-ink transition-all hover:border-ink hover:bg-ink hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
          >
            Restart
          </button>
          {isRecording ? (
            <button
              onClick={onCancelRecording}
              className="flex cursor-pointer items-center gap-2 border border-racing-red/30 px-4 py-1.5 font-ui text-xs font-bold uppercase tracking-wider text-racing-red transition-colors hover:bg-racing-red/10"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-racing-red opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-racing-red" />
              </span>
              Cancel
            </button>
          ) : onExportVideo ? (
            <button
              onClick={onExportVideo}
              className="cursor-pointer border border-ink/20 px-4 py-1.5 font-ui text-xs font-bold uppercase tracking-wider text-ink transition-all hover:border-ink hover:bg-ink hover:text-cream"
            >
              Export
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          {BASE_SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              disabled={isRecording}
              className={`cursor-pointer px-2.5 py-1 font-ui text-xs font-bold transition-colors ${
                speed === s
                  ? "bg-racing-red text-cream"
                  : "text-ink-muted hover:text-ink"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {s}x
            </button>
          ))}
          <span className="mx-1 text-rule">|</span>
          <button
            onClick={() => onSpeedChange(recommendedSpeed)}
            disabled={isRecording}
            className={`cursor-pointer border px-2.5 py-1 font-ui text-xs font-bold transition-colors ${
              speed === recommendedSpeed
                ? "border-racing-red bg-racing-red text-cream"
                : "border-racing-red/40 text-racing-red hover:bg-racing-red/10"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Rec
          </button>
        </div>

        <span className="font-ui text-xs uppercase tracking-wider text-ink-muted">
          {isRecording ? (
            <>
              Rec{" "}
              <span className="text-racing-red">{Math.round(progress)}%</span>
            </>
          ) : (
            <>
              {currentFrame + 1} / {totalFrames}
              <span className="ml-2 text-ink-muted/60">
                {estMin > 0 ? `${estMin}m` : ""}
                {estSec}s
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
