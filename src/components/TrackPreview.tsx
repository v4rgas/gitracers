"use client";

import { useEffect, useRef } from "react";
import {
  generateTrack,
  getPointOnTrack,
  getTrackTangent,
  type TrackData,
} from "@/lib/track-generator";

const TRACK_WIDTH = 16;

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
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(180, 168, 146, 0.14)";
  for (let x = 0; x < w; x += 16) {
    for (let y = 0; y < h; y += 16) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawTrackSurface(ctx: CanvasRenderingContext2D, track: TrackData) {
  // Grass/terrain
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#dde4ce";
  ctx.lineWidth = TRACK_WIDTH + 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Track border
  traceTrackPath(ctx, track);
  ctx.strokeStyle = "#c4b89a";
  ctx.lineWidth = TRACK_WIDTH + 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Asphalt
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

  // Start/finish line
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

function paint(canvas: HTMLCanvasElement, seed: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  if (w === 0 || h === 0) return;

  const track = generateTrack(seed, w / 2, h / 2, w, h);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);
  drawBackground(ctx, w, h);
  drawTrackSurface(ctx, track);
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
