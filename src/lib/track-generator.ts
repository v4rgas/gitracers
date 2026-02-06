/** Seeded PRNG (mulberry32) */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

interface Point {
  x: number;
  y: number;
}

/** Cross product of vectors OA and OB */
function cross(O: Point, A: Point, B: Point): number {
  return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
}

/** Convex hull using Andrew's monotone chain */
function convexHull(points: Point[]): Point[] {
  const pts = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  if (pts.length <= 1) return pts;

  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angle(a: Point, b: Point, c: Point): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (mag === 0) return Math.PI;
  return Math.acos(Math.max(-1, Math.min(1, dot / mag)));
}

/** Displace midpoints between hull points */
function addMidpoints(hull: Point[], rand: () => number, displacement: number): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < hull.length; i++) {
    const curr = hull[i];
    const next = hull[(i + 1) % hull.length];
    result.push(curr);

    const mx = (curr.x + next.x) / 2;
    const my = (curr.y + next.y) / 2;
    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const nx = -dy / len;
      const ny = dx / len;
      const d = (rand() - 0.5) * 2 * displacement;
      result.push({ x: mx + nx * d, y: my + ny * d });
    }
  }
  return result;
}

/** Push apart points that are too close or create too sharp angles */
function pushApart(points: Point[], minDist: number, minAngle: number, iterations: number): Point[] {
  const pts = points.map((p) => ({ ...p }));

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      const d = dist(pts[i], pts[j]);
      if (d < minDist) {
        const mx = (pts[i].x + pts[j].x) / 2;
        const my = (pts[i].y + pts[j].y) / 2;
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        const len = Math.hypot(dx, dy) || 1;
        const half = minDist / 2;
        pts[i] = { x: mx - (dx / len) * half, y: my - (dy / len) * half };
        pts[j] = { x: mx + (dx / len) * half, y: my + (dy / len) * half };
      }
    }

    for (let i = 0; i < pts.length; i++) {
      const prev = pts[(i - 1 + pts.length) % pts.length];
      const curr = pts[i];
      const next = pts[(i + 1) % pts.length];
      const a = angle(prev, curr, next);
      if (a < minAngle) {
        const mx = (prev.x + next.x) / 2;
        const my = (prev.y + next.y) / 2;
        const dx = curr.x - mx;
        const dy = curr.y - my;
        const len = Math.hypot(dx, dy) || 1;
        const push = 5;
        pts[i] = { x: curr.x + (dx / len) * push, y: curr.y + (dy / len) * push };
      }
    }
  }

  return pts;
}

/** Catmull-Rom spline interpolation (closed loop) */
function catmullRom(points: Point[], samplesPerSegment: number): Point[] {
  const result: Point[] = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    for (let j = 0; j < samplesPerSegment; j++) {
      const t = j / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;

      result.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }

  return result;
}

export interface TrackData {
  points: Point[];
  totalLength: number;
  cumLengths: number[];
}

/**
 * Generate a procedural racetrack.
 * Random points → convex hull → midpoint displacement → push apart → spline.
 */
export function generateTrack(
  seed: string,
  cx: number,
  cy: number,
  w: number,
  h: number
): TrackData {
  const rand = mulberry32(hashString(seed));

  // 1. Generate random points in an elliptical region
  const numPoints = 8 + Math.floor(rand() * 5); // 8-12
  const rawPoints: Point[] = [];
  const rx = w * 0.35;
  const ry = h * 0.35;

  for (let i = 0; i < numPoints; i++) {
    const a = (i / numPoints) * Math.PI * 2;
    const rFactor = 0.5 + rand() * 0.5;
    rawPoints.push({
      x: cx + Math.cos(a) * rx * rFactor,
      y: cy + Math.sin(a) * ry * rFactor,
    });
  }

  // 2. Convex hull
  let hull = convexHull(rawPoints);
  if (hull.length < 3) hull = rawPoints.slice(0, 3);

  // 3. Add displaced midpoints
  const displacement = Math.min(w, h) * 0.12;
  let trackPoints = addMidpoints(hull, rand, displacement);

  // 4. Push apart
  const minDist = Math.min(w, h) * 0.08;
  trackPoints = pushApart(trackPoints, minDist, Math.PI / 6, 5);

  // 5. Spline interpolation
  const splinePoints = catmullRom(trackPoints, 60);

  // Compute cumulative arc lengths
  const cumLengths: number[] = [0];
  let totalLength = 0;
  for (let i = 1; i < splinePoints.length; i++) {
    totalLength += dist(splinePoints[i - 1], splinePoints[i]);
    cumLengths.push(totalLength);
  }
  totalLength += dist(splinePoints[splinePoints.length - 1], splinePoints[0]);

  return { points: splinePoints, totalLength, cumLengths };
}

/** Get (x, y) on the track at parameter t (0–1 = one full lap). */
export function getPointOnTrack(track: TrackData, t: number): Point {
  const tt = ((t % 1) + 1) % 1;
  const targetLen = tt * track.totalLength;
  const pts = track.points;

  let lo = 0;
  let hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (track.cumLengths[mid] < targetLen) lo = mid + 1;
    else hi = mid;
  }

  const i = Math.max(0, lo - 1);
  const j = (i + 1) % pts.length;
  const segStart = track.cumLengths[i];
  const segLen = dist(pts[i], pts[j]);
  const frac = segLen > 0 ? (targetLen - segStart) / segLen : 0;

  return {
    x: pts[i].x + (pts[j].x - pts[i].x) * frac,
    y: pts[i].y + (pts[j].y - pts[i].y) * frac,
  };
}

/** Get the tangent direction at t (normalized). */
export function getTrackTangent(track: TrackData, t: number): { tx: number; ty: number } {
  const epsilon = 0.0005;
  const a = getPointOnTrack(track, t - epsilon);
  const b = getPointOnTrack(track, t + epsilon);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { tx: dx / len, ty: dy / len };
}
