"use client";

import { useEffect, useRef } from "react";
import {
  generateTrack,
  getPointOnTrack,
  getTrackTangent,
  type TrackData,
} from "@/lib/track-generator";

const BASE_TRACK_WIDTH = 16;
const REFERENCE_WIDTH = 500;

/** Local seeded PRNG for decorations */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
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

/* ── Layer 1: Paper background with engraving crosshatch ── */
function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
  scale: number
) {
  ctx.fillStyle = "#ebe5d8";
  ctx.fillRect(0, 0, w, h);

  // Diagonal hatching (NW → SE)
  const sp = 5 * scale;
  ctx.strokeStyle = "rgba(160, 148, 126, 0.09)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let d = -h; d < w + h; d += sp) {
    ctx.moveTo(d, 0);
    ctx.lineTo(d - h, h);
  }
  ctx.stroke();

  // Counter-diagonal (NE → SW)
  ctx.strokeStyle = "rgba(160, 148, 126, 0.055)";
  ctx.beginPath();
  for (let d = -h; d < w + h; d += sp) {
    ctx.moveTo(d, 0);
    ctx.lineTo(d + h, h);
  }
  ctx.stroke();

  // Topographic contour arcs
  ctx.strokeStyle = "rgba(160, 148, 126, 0.04)";
  ctx.lineWidth = 0.5;
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < 8; i++) {
    const r = (25 + i * 22 + rand() * 20) * scale;
    ctx.beginPath();
    ctx.arc(
      cx + (rand() - 0.5) * w * 0.35,
      cy + (rand() - 0.5) * h * 0.35,
      r,
      rand() * Math.PI * 2,
      rand() * Math.PI * 2 + Math.PI * (0.8 + rand())
    );
    ctx.stroke();
  }
}

/* ── Layers 2-4: Terrain zones around & inside track ── */
function drawTerrainZones(ctx: CanvasRenderingContext2D, track: TrackData, scale: number) {
  const trackWidth = BASE_TRACK_WIDTH * scale;

  // Wide outer terrain / runoff
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "rgba(210, 200, 175, 0.3)";
  ctx.lineWidth = trackWidth + 50 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Outer grass band
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#d3dcc6";
  ctx.lineWidth = trackWidth + 30 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Inner grass band (darker)
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#c8d4b8";
  ctx.lineWidth = trackWidth + 16 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Fill track interior with grass
  traceTrackPath(ctx, track);
  ctx.fillStyle = "#d0dac2";
  ctx.fill();
}

/* ── Layer 5: Grass stipple texture ── */
function drawGrassStipple(
  ctx: CanvasRenderingContext2D,
  track: TrackData,
  rand: () => number,
  scale: number
) {
  const trackWidth = BASE_TRACK_WIDTH * scale;
  ctx.save();
  ctx.lineWidth = 0.5;

  const steps = 150;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const p = getPointOnTrack(track, t);
    const { tx, ty } = getTrackTangent(track, t);
    const nx = -ty;
    const ny = tx;

    for (let j = 0; j < 4; j++) {
      const side = rand() > 0.5 ? 1 : -1;
      const dist = trackWidth / 2 + 5 * scale + rand() * 20 * scale;
      const sx = p.x + nx * dist * side + (rand() - 0.5) * 4 * scale;
      const sy = p.y + ny * dist * side + (rand() - 0.5) * 4 * scale;
      const len = (1 + rand() * 2.5) * scale;

      ctx.strokeStyle = `rgba(110, 130, 90, ${0.1 + rand() * 0.1})`;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (rand() - 0.5) * len, sy - len);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ── Layers 6-8: Track surface ── */
function drawTrackSurface(ctx: CanvasRenderingContext2D, track: TrackData, scale: number) {
  const trackWidth = BASE_TRACK_WIDTH * scale;

  // Gravel/border
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#c4b89a";
  ctx.lineWidth = trackWidth + 6 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Track edge (white line)
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#e0d8c8";
  ctx.lineWidth = trackWidth + 2 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Asphalt
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
}

/* ── Kerbs at high-curvature points ── */
function drawKerbs(ctx: CanvasRenderingContext2D, track: TrackData, scale: number) {
  const trackWidth = BASE_TRACK_WIDTH * scale;
  ctx.save();
  const samples = 120;
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const dt = 2 / samples;
    const pPrev = getPointOnTrack(track, t - dt);
    const pCurr = getPointOnTrack(track, t);
    const pNext = getPointOnTrack(track, t + dt);

    const dx1 = pCurr.x - pPrev.x;
    const dy1 = pCurr.y - pPrev.y;
    const dx2 = pNext.x - pCurr.x;
    const dy2 = pNext.y - pCurr.y;
    const curvature = Math.abs(dx1 * dy2 - dy1 * dx2);

    if (curvature > 3.5) {
      const { tx, ty } = getTrackTangent(track, t);
      const nx = -ty;
      const ny = tx;
      const edge = trackWidth / 2 + 1 * scale;
      const kLen = 2.5 * scale;

      ctx.strokeStyle =
        i % 2 === 0
          ? "rgba(198, 40, 40, 0.5)"
          : "rgba(240, 235, 225, 0.6)";
      ctx.lineWidth = 1.5 * scale;

      ctx.beginPath();
      ctx.moveTo(pCurr.x + nx * edge, pCurr.y + ny * edge);
      ctx.lineTo(
        pCurr.x + nx * (edge + kLen),
        pCurr.y + ny * (edge + kLen)
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pCurr.x - nx * edge, pCurr.y - ny * edge);
      ctx.lineTo(
        pCurr.x - nx * (edge + kLen),
        pCurr.y - ny * (edge + kLen)
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ── Start/finish line ── */
function drawStartFinish(ctx: CanvasRenderingContext2D, track: TrackData, scale: number) {
  const trackWidth = BASE_TRACK_WIDTH * scale;
  const startP = getPointOnTrack(track, 0);
  const { tx, ty } = getTrackTangent(track, 0);
  const nx = -ty;
  const ny = tx;
  const halfW = trackWidth / 2;

  // Checker stripe
  ctx.beginPath();
  ctx.moveTo(startP.x + nx * halfW, startP.y + ny * halfW);
  ctx.lineTo(startP.x - nx * halfW, startP.y - ny * halfW);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3 * scale;
  ctx.setLineDash([3 * scale, 3 * scale]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Red accent line outside track
  ctx.beginPath();
  ctx.moveTo(
    startP.x + nx * (halfW + 5 * scale),
    startP.y + ny * (halfW + 5 * scale)
  );
  ctx.lineTo(
    startP.x - nx * (halfW + 5 * scale),
    startP.y - ny * (halfW + 5 * scale)
  );
  ctx.strokeStyle = "#c62828";
  ctx.lineWidth = 2 * scale;
  ctx.stroke();
}

/* ── Corner labels (T1, T2, …) ── */
function drawCornerLabels(
  ctx: CanvasRenderingContext2D,
  track: TrackData,
  w: number,
  h: number,
  scale: number
) {
  const trackWidth = BASE_TRACK_WIDTH * scale;
  const corners: {
    t: number;
    x: number;
    y: number;
    nx: number;
    ny: number;
  }[] = [];
  const samples = 100;

  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const dt = 3 / samples;
    const pPrev = getPointOnTrack(track, t - dt);
    const pCurr = getPointOnTrack(track, t);
    const pNext = getPointOnTrack(track, t + dt);

    const dx1 = pCurr.x - pPrev.x;
    const dy1 = pCurr.y - pPrev.y;
    const dx2 = pNext.x - pCurr.x;
    const dy2 = pNext.y - pCurr.y;
    const curvature = Math.abs(dx1 * dy2 - dy1 * dx2);

    if (curvature > 8) {
      const tooClose = corners.some((c) => {
        const diff = Math.abs(c.t - t);
        return diff < 0.1 || diff > 0.9;
      });
      if (!tooClose) {
        const { tx, ty } = getTrackTangent(track, t);
        corners.push({ t, x: pCurr.x, y: pCurr.y, nx: -ty, ny: tx });
      }
    }
  }

  ctx.save();
  ctx.font = `bold ${Math.round(7 * scale)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(140, 128, 108, 0.45)";

  corners.slice(0, 8).forEach((c, i) => {
    const labelDist = trackWidth / 2 + 22 * scale;
    let lx = c.x + c.nx * labelDist;
    let ly = c.y + c.ny * labelDist;

    // Flip to opposite side if label would clip the canvas edge
    const margin = 14 * scale;
    if (lx < margin || lx > w - margin || ly < margin || ly > h - margin) {
      lx = c.x - c.nx * labelDist;
      ly = c.y - c.ny * labelDist;
    }

    ctx.fillText(`T${i + 1}`, lx, ly);
  });
  ctx.restore();
}

/* ── Compass rose ── */
function drawCompass(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) {
  const offset = 20 * scale;
  const cx = w - offset;
  const cy = h - offset;
  const r = 7 * scale;

  ctx.save();
  ctx.strokeStyle = "rgba(140, 128, 108, 0.35)";
  ctx.fillStyle = "rgba(140, 128, 108, 0.35)";
  ctx.lineWidth = 0.5;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // N arrow
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 1 * scale);
  ctx.lineTo(cx - 2 * scale, cy - 1 * scale);
  ctx.lineTo(cx + 2 * scale, cy - 1 * scale);
  ctx.closePath();
  ctx.fill();

  // Cross lines
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 2 * scale);
  ctx.lineTo(cx, cy + r - 2 * scale);
  ctx.moveTo(cx - r + 2 * scale, cy);
  ctx.lineTo(cx + r - 2 * scale, cy);
  ctx.stroke();

  ctx.font = `bold ${Math.round(5 * scale)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("N", cx, cy - r - 1 * scale);
  ctx.restore();
}

/* ── Border frame (technical illustration feel) ── */
function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) {
  ctx.save();
  const o1 = 3 * scale;
  const o2 = 5 * scale;
  ctx.strokeStyle = "rgba(140, 128, 108, 0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(o1, o1, w - o1 * 2, h - o1 * 2);
  ctx.strokeStyle = "rgba(140, 128, 108, 0.08)";
  ctx.strokeRect(o2, o2, w - o2 * 2, h - o2 * 2);
  ctx.restore();
}

/* ══════════════════════════════════════════ */

function paint(canvas: HTMLCanvasElement, seed: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  if (w === 0 || h === 0) return;

  const scale = Math.min(1, Math.max(0.5, w / REFERENCE_WIDTH));
  const track = generateTrack(seed, w / 2, h / 2, w, h);
  const rand = mulberry32(hashStr(seed) + 12345);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);

  drawBackground(ctx, w, h, rand, scale);
  drawTerrainZones(ctx, track, scale);
  drawGrassStipple(ctx, track, rand, scale);
  drawTrackSurface(ctx, track, scale);
  drawKerbs(ctx, track, scale);
  drawStartFinish(ctx, track, scale);
  drawCornerLabels(ctx, track, w, h, scale);
  drawCompass(ctx, w, h, scale);
  drawFrame(ctx, w, h, scale);

  ctx.restore();
}

interface TrackPreviewProps {
  seed: string;
}

export function TrackPreview({ seed }: TrackPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function resize() {
      const { width, height } = container!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      paint(canvas!, seed);
    }

    const observer = new ResizeObserver(() => resize());
    observer.observe(container);

    return () => observer.disconnect();
  }, [seed]);

  return (
    <div ref={containerRef} className="aspect-[16/9] w-full overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
