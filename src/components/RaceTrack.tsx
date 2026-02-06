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
  targetPositionsRef: { current: Record<string, number> };
  seed: string;
  resetKey?: number;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  currentFrame?: number;
  totalFrames?: number;
}

const BASE_TRACK_WIDTH = 56;
const BASE_AVATAR_RADIUS = 16;
const LANE_SPREAD = 0.55;
const REFERENCE_WIDTH = 800;

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

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) {
  // Parchment base
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, w, h);

  // Subtle dot grid — technical drawing feel
  const gridSpacing = 16 * scale;
  ctx.fillStyle = "rgba(180, 168, 146, 0.14)";
  for (let x = 0; x < w; x += gridSpacing) {
    for (let y = 0; y < h; y += gridSpacing) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawTrackSurface(ctx: CanvasRenderingContext2D, track: TrackData, scale: number) {
  const trackWidth = BASE_TRACK_WIDTH * scale;

  // Grass/terrain surrounding the track
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#dde4ce";
  ctx.lineWidth = trackWidth + 28 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Track border/outline
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#c4b89a";
  ctx.lineWidth = trackWidth + 6 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Track surface (asphalt)
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#2a2520";
  ctx.lineWidth = trackWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Center dashed line
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#4a4540";
  ctx.lineWidth = 1;
  ctx.setLineDash([8 * scale, 8 * scale]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Start/finish line — racing red
  const startP = getPointOnTrack(track, 0);
  const { tx, ty } = getTrackTangent(track, 0);
  const nx = -ty;
  const ny = tx;
  const halfW = trackWidth / 2;

  ctx.beginPath();
  ctx.moveTo(startP.x + nx * halfW, startP.y + ny * halfW);
  ctx.lineTo(startP.x - nx * halfW, startP.y - ny * halfW);
  ctx.strokeStyle = "#c62828";
  ctx.lineWidth = 3 * scale;
  ctx.setLineDash([4 * scale, 4 * scale]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRacer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  contributor: Contributor,
  rank: number,
  scale: number
) {
  const img = getImage(contributor.avatarUrl);
  const r = BASE_AVATAR_RADIUS * scale;

  // Shadow
  ctx.beginPath();
  ctx.arc(x, y + 2 * scale, r + 2 * scale, 0, Math.PI * 2);
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
  ctx.arc(x, y, r + 1 * scale, 0, Math.PI * 2);
  ctx.strokeStyle =
    rank === 0 ? "#b8860b" : rank === 1 ? "#71706e" : rank === 2 ? "#8b6914" : "#a09890";
  ctx.lineWidth = (rank < 3 ? 2.5 : 1.5) * scale;
  ctx.stroke();

  // Username label with outline for readability
  const labelSize = Math.round(11 * scale);
  ctx.font = `bold ${labelSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.strokeStyle = "#f5f0e8";
  ctx.lineWidth = 3 * scale;
  ctx.lineJoin = "round";
  ctx.strokeText(contributor.login, x, y + r + 4 * scale);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillText(contributor.login, x, y + r + 4 * scale);
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  repoName: string,
  frame: number,
  total: number,
  scale: number
) {
  const pad = 14 * scale;
  const progress = total > 1 ? frame / (total - 1) : 0;

  // ── Top-left: branding + repo name ──
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // "GITRACERS" in racing red
  ctx.fillStyle = "#c62828";
  ctx.font = `bold ${Math.round(10 * scale)}px sans-serif`;
  ctx.fillText("GITRACERS", pad, pad);

  // repo name
  ctx.fillStyle = "#1a1a1a";
  ctx.font = `bold ${Math.round(13 * scale)}px sans-serif`;
  ctx.fillText(repoName, pad, pad + 14 * scale);

  // ── Top-right: commit counter ──
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#8b8178";
  ctx.font = `${Math.round(11 * scale)}px sans-serif`;
  ctx.fillText(`${frame + 1} / ${total} commits`, w - pad, pad);

  // Percentage
  ctx.fillStyle = "#c62828";
  ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
  ctx.fillText(`${Math.round(progress * 100)}%`, w - pad, pad + 15 * scale);

  // ── Bottom: progress bar ──
  const barH = 3 * scale;
  const barY = h - pad;
  const barW = w - pad * 2;

  // Track
  ctx.fillStyle = "rgba(180, 170, 150, 0.25)";
  ctx.fillRect(pad, barY, barW, barH);

  // Fill
  ctx.fillStyle = "#c62828";
  ctx.fillRect(pad, barY, barW * progress, barH);
}

export function RaceTrack({ raceData, targetPositionsRef, seed, resetKey, onCanvasReady, currentFrame, totalFrames }: RaceTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<TrackData | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Smooth display positions that lerp toward targets
  const displayPositions = useRef<Record<string, number>>({});

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
    for (const login of Object.keys(targetPositionsRef.current)) {
      snapped[login] = targetPositionsRef.current[login] ?? 0;
    }
    displayPositions.current = snapped;
    displayOpacities.current = {};
    displayLanes.current = {};
    lastTimeRef.current = 0;
  }, [resetKey]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, track: TrackData) => {
      const scale = Math.min(1, Math.max(0.45, w / REFERENCE_WIDTH));

      if (raceData.frames.length === 0) return;

      const trackWidth = BASE_TRACK_WIDTH * scale;
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
            ? ((racer.lane / (Math.max(visibleCount, 2) - 1)) * 2 - 1) * (trackWidth / 2) * LANE_SPREAD
            : 0;

        const rank = rankMap.get(racer.login) ?? 0;

        ctx.save();
        ctx.globalAlpha = racer.opacity;
        drawRacer(ctx, p.x + nx * laneOffset, p.y + ny * laneOffset, racer.contributor, rank, scale);
        ctx.restore();
      }

      // HUD overlay — drawn last so it's always on top
      const { frame, total } = frameInfoRef.current;
      if (total > 0) {
        drawHUD(ctx, w, h, seed, frame, total, scale);
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
      const targets = targetPositionsRef.current;

      // Lerp positions
      for (const login of Object.keys(targets)) {
        const current = displayPositions.current[login] ?? 0;
        const target = targets[login] ?? 0;
        displayPositions.current[login] = current + (target - current) * factor;
      }

      // Compute current top 10 by sorting targets descending
      const sorted = Object.entries(targets)
        .sort(([aLogin, aPos], [bLogin, bPos]) => bPos - aPos || aLogin.localeCompare(bLogin));
      const top10Map = new Map<string, number>();
      for (let i = 0; i < Math.min(MAX_VISIBLE, sorted.length); i++) {
        top10Map.set(sorted[i][0], i);
      }

      // Lerp opacities
      for (const login of Object.keys(targets)) {
        const targetOpacity = top10Map.has(login) ? 1 : 0;
        const current = displayOpacities.current[login] ?? 0;
        displayOpacities.current[login] = current + (targetOpacity - current) * opacityFactor;
      }

      // Lerp lanes using rank lookup map (O(1) instead of indexOf)
      for (const login of Object.keys(targets)) {
        const rankIdx = top10Map.get(login);
        if (rankIdx !== undefined) {
          const currentLane = displayLanes.current[login] ?? rankIdx;
          displayLanes.current[login] = currentLane + (rankIdx - currentLane) * laneFactor;
        }
      }

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      if (!trackRef.current || sizeRef.current.w !== w || sizeRef.current.h !== h) {
        trackRef.current = generateTrack(seed, w / 2, h / 2, w, h);
        sizeRef.current = { w, h };

        // Cache static layers (background + track) to offscreen canvas
        if (!bgCanvasRef.current) bgCanvasRef.current = document.createElement("canvas");
        bgCanvasRef.current.width = canvas.width;
        bgCanvasRef.current.height = canvas.height;
        const bgCtx = bgCanvasRef.current.getContext("2d")!;
        bgCtx.scale(dpr, dpr);
        const bgScale = Math.min(1, Math.max(0.45, w / REFERENCE_WIDTH));
        drawBackground(bgCtx, w, h, bgScale);
        drawTrackSurface(bgCtx, trackRef.current, bgScale);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (bgCanvasRef.current) {
        ctx.drawImage(bgCanvasRef.current, 0, 0);
      }
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
