"use client";

import { useEffect, useRef, useCallback } from "react";
import type { RaceData, Contributor } from "@/lib/types";
import {
  generateTrack,
  getPointOnTrack,
  getTrackTangent,
  type TrackData,
} from "@/lib/track-generator";

interface RaceTrackProps {
  raceData: RaceData;
  targetPositions: Record<string, number>;
  seed: string;
  resetKey?: number;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  currentFrame?: number;
  totalFrames?: number;
}

const TRACK_WIDTH = 56;
const AVATAR_RADIUS = 16;
const LANE_SPREAD = 0.55;

// How fast display positions catch up to targets.
const LERP_SPEED = 4;

// Dynamic top-10 constants
const MAX_VISIBLE = 10;
const OPACITY_LERP_SPEED = 3;
const LANE_LERP_SPEED = 3;
const OPACITY_THRESHOLD = 0.02;

const imageCache = new Map<string, HTMLImageElement>();

function getImage(url: string): HTMLImageElement | null {
  if (!url) return null;
  const cached = imageCache.get(url);
  if (cached) return cached;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  imageCache.set(url, img);
  return img;
}

function traceTrackPath(ctx: CanvasRenderingContext2D, track: TrackData) {
  const pts = track.points;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Parchment base
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, w, h);

  // Subtle dot grid — technical drawing feel
  ctx.fillStyle = "rgba(180, 168, 146, 0.14)";
  for (let x = 0; x < w; x += 16) {
    for (let y = 0; y < h; y += 16) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawTrackSurface(ctx: CanvasRenderingContext2D, track: TrackData) {
  // Grass/terrain surrounding the track
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#dde4ce";
  ctx.lineWidth = TRACK_WIDTH + 28;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Track border/outline
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#c4b89a";
  ctx.lineWidth = TRACK_WIDTH + 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Track surface (asphalt)
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#2a2520";
  ctx.lineWidth = TRACK_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Center dashed line
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#4a4540";
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Start/finish line — racing red
  const startP = getPointOnTrack(track, 0);
  const { tx, ty } = getTrackTangent(track, 0);
  const nx = -ty;
  const ny = tx;
  const halfW = TRACK_WIDTH / 2;

  ctx.beginPath();
  ctx.moveTo(startP.x + nx * halfW, startP.y + ny * halfW);
  ctx.lineTo(startP.x - nx * halfW, startP.y - ny * halfW);
  ctx.strokeStyle = "#c62828";
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRacer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  contributor: Contributor,
  rank: number
) {
  const img = getImage(contributor.avatarUrl);
  const r = AVATAR_RADIUS;

  // Shadow
  ctx.beginPath();
  ctx.arc(x, y + 2, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(42, 37, 32, 0.25)";
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (img?.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  } else {
    const hue = (rank * 137.5) % 360;
    ctx.fillStyle = `hsl(${hue}, 40%, 42%)`;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${r}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(contributor.login[0].toUpperCase(), x, y);
  }
  ctx.restore();

  // Medal ring
  ctx.beginPath();
  ctx.arc(x, y, r + 1, 0, Math.PI * 2);
  ctx.strokeStyle =
    rank === 0 ? "#b8860b" : rank === 1 ? "#71706e" : rank === 2 ? "#8b6914" : "#a09890";
  ctx.lineWidth = rank < 3 ? 2.5 : 1.5;
  ctx.stroke();

  // Username label with outline for readability
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.strokeStyle = "#f5f0e8";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.strokeText(contributor.login, x, y + r + 4);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillText(contributor.login, x, y + r + 4);
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  repoName: string,
  frame: number,
  total: number
) {
  const pad = 14;
  const progress = total > 1 ? frame / (total - 1) : 0;

  // ── Top-left: branding + repo name ──
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // "GITRACERS" in racing red
  ctx.fillStyle = "#c62828";
  ctx.font = "bold 10px sans-serif";
  ctx.fillText("GITRACERS", pad, pad);

  // repo name
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(repoName, pad, pad + 14);

  // ── Top-right: commit counter ──
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#8b8178";
  ctx.font = "11px sans-serif";
  ctx.fillText(`${frame + 1} / ${total} commits`, w - pad, pad);

  // Percentage
  ctx.fillStyle = "#c62828";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(`${Math.round(progress * 100)}%`, w - pad, pad + 15);

  // ── Bottom: progress bar ──
  const barH = 3;
  const barY = h - pad;
  const barW = w - pad * 2;

  // Track
  ctx.fillStyle = "rgba(180, 170, 150, 0.25)";
  ctx.fillRect(pad, barY, barW, barH);

  // Fill
  ctx.fillStyle = "#c62828";
  ctx.fillRect(pad, barY, barW * progress, barH);
}

export function RaceTrack({ raceData, targetPositions, seed, resetKey, onCanvasReady, currentFrame, totalFrames }: RaceTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<TrackData | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Smooth display positions that lerp toward targets
  const displayPositions = useRef<Record<string, number>>({});
  const targetRef = useRef(targetPositions);
  targetRef.current = targetPositions;

  // Frame info ref — updated every render, read in rAF loop
  const frameInfoRef = useRef({ frame: 0, total: 0 });
  frameInfoRef.current.frame = currentFrame ?? 0;
  frameInfoRef.current.total = totalFrames ?? 0;

  // Dynamic top-10 refs
  const displayOpacities = useRef<Record<string, number>>({});
  const displayLanes = useRef<Record<string, number>>({});

  // Snap display positions to targets on reset so racers jump back to start
  useEffect(() => {
    const snapped: Record<string, number> = {};
    for (const login of Object.keys(targetRef.current)) {
      snapped[login] = targetRef.current[login] ?? 0;
    }
    displayPositions.current = snapped;
    displayOpacities.current = {};
    displayLanes.current = {};
    lastTimeRef.current = 0;
  }, [resetKey]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, track: TrackData) => {
      drawBackground(ctx, w, h);

      if (raceData.frames.length === 0) return;

      drawTrackSurface(ctx, track);

      const opacities = displayOpacities.current;
      const lanes = displayLanes.current;
      const positions = displayPositions.current;
      const { contributorMap } = raceData;

      // Collect visible racers (opacity above threshold)
      const visible: { login: string; opacity: number; pos: number; lane: number; contributor: Contributor }[] = [];
      for (const login of Object.keys(opacities)) {
        const opacity = opacities[login];
        if (opacity < OPACITY_THRESHOLD) continue;
        const contributor = contributorMap[login];
        if (!contributor) continue;
        visible.push({
          login,
          opacity,
          pos: positions[login] ?? 0,
          lane: lanes[login] ?? 0,
          contributor,
        });
      }

      // Sort by position ascending (back-to-front for overlap — leaders drawn last, on top)
      visible.sort((a, b) => a.pos - b.pos);

      // Compute dynamic rank from position for border colors
      const ranked = [...visible].sort((a, b) => b.pos - a.pos || a.login.localeCompare(b.login));
      const rankMap = new Map<string, number>();
      for (let i = 0; i < ranked.length; i++) {
        rankMap.set(ranked[i].login, i);
      }

      const visibleCount = visible.length;

      // Draw each racer
      for (const racer of visible) {
        const p = getPointOnTrack(track, racer.pos);
        const { tx, ty } = getTrackTangent(track, racer.pos);
        const nx = -ty;
        const ny = tx;

        const laneOffset =
          visibleCount > 1
            ? ((racer.lane / (Math.max(visibleCount, 2) - 1)) * 2 - 1) * (TRACK_WIDTH / 2) * LANE_SPREAD
            : 0;

        const rank = rankMap.get(racer.login) ?? 0;

        ctx.save();
        ctx.globalAlpha = racer.opacity;
        drawRacer(ctx, p.x + nx * laneOffset, p.y + ny * laneOffset, racer.contributor, rank);
        ctx.restore();
      }

      // HUD overlay — drawn last so it's always on top
      const { frame, total } = frameInfoRef.current;
      if (total > 0) {
        drawHUD(ctx, w, h, seed, frame, total);
      }
    },
    [raceData, seed]
  );

  // Main animation loop: lerp display positions toward targets, then redraw
  const animate = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Delta time in seconds
      const dt =
        lastTimeRef.current === 0
          ? 0.016
          : Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      // Smooth lerp: exponential ease toward target
      const factor = 1 - Math.exp(-LERP_SPEED * dt);
      const opacityFactor = 1 - Math.exp(-OPACITY_LERP_SPEED * dt);
      const laneFactor = 1 - Math.exp(-LANE_LERP_SPEED * dt);
      const targets = targetRef.current;

      // Lerp positions
      for (const login of Object.keys(targets)) {
        const current = displayPositions.current[login] ?? 0;
        const target = targets[login] ?? 0;
        displayPositions.current[login] = current + (target - current) * factor;
      }

      // Compute current top 10 by sorting targets descending
      const sorted = Object.entries(targets)
        .sort(([aLogin, aPos], [bLogin, bPos]) => bPos - aPos || aLogin.localeCompare(bLogin));
      const top10 = new Set(sorted.slice(0, MAX_VISIBLE).map(([login]) => login));

      // Lerp opacities
      for (const login of Object.keys(targets)) {
        const targetOpacity = top10.has(login) ? 1 : 0;
        const current = displayOpacities.current[login] ?? 0;
        displayOpacities.current[login] = current + (targetOpacity - current) * opacityFactor;
      }

      // Compute target lanes based on rank among top 10
      const top10Array = sorted.slice(0, MAX_VISIBLE).map(([login]) => login);
      for (const login of Object.keys(targets)) {
        const rankIdx = top10Array.indexOf(login);
        if (rankIdx !== -1) {
          const targetLane = rankIdx;
          const currentLane = displayLanes.current[login] ?? rankIdx;
          displayLanes.current[login] = currentLane + (targetLane - currentLane) * laneFactor;
        }
      }

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      if (!trackRef.current || sizeRef.current.w !== w || sizeRef.current.h !== h) {
        trackRef.current = generateTrack(seed, w / 2, h / 2, w, h);
        sizeRef.current = { w, h };
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      draw(ctx, w, h, trackRef.current);
      ctx.restore();

      rafRef.current = requestAnimationFrame(animate);
    },
    [draw, seed]
  );

  // Start animation loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  // Resize canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Expose canvas element to parent for video export
  useEffect(() => {
    onCanvasReady?.(canvasRef.current);
    return () => onCanvasReady?.(null);
  }, [onCanvasReady]);

  return (
    <div ref={containerRef} className="aspect-[16/9] w-full overflow-hidden border-2 border-ink/15">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
