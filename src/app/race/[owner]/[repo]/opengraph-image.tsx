import { ImageResponse } from "next/og";
import {
  generateTrack,
  getPointOnTrack,
  getTrackTangent,
} from "@/lib/track-generator";

export const runtime = "nodejs";
export const alt = "GitRacers Race Track";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TW = 28; // wider track for 1200px OG canvas

function buildTrackSvg(seed: string, w: number, h: number): string {
  const track = generateTrack(seed, w / 2, h / 2, w, h);
  const d =
    track.points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`
      )
      .join(" ") + " Z";

  // Start/finish line
  const startP = getPointOnTrack(track, 0);
  const tang = getTrackTangent(track, 0);
  const nx = -tang.ty;
  const ny = tang.tx;
  const sfH = TW / 2 + 8;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`,
    `<rect width="${w}" height="${h}" fill="#ebe5d8"/>`,
    `<defs>`,
    `<pattern id="h1" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`,
    `<line x1="0" y1="0" x2="0" y2="6" stroke="rgba(160,148,126,0.12)" stroke-width="0.5"/>`,
    `</pattern>`,
    `<pattern id="h2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">`,
    `<line x1="0" y1="0" x2="0" y2="6" stroke="rgba(160,148,126,0.07)" stroke-width="0.5"/>`,
    `</pattern>`,
    `</defs>`,
    `<rect width="${w}" height="${h}" fill="url(#h1)"/>`,
    `<rect width="${w}" height="${h}" fill="url(#h2)"/>`,
    // Terrain zones
    `<path d="${d}" fill="none" stroke="rgba(210,200,175,0.3)" stroke-width="${TW + 60}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="${d}" fill="none" stroke="#d3dcc6" stroke-width="${TW + 40}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="${d}" fill="none" stroke="#c8d4b8" stroke-width="${TW + 22}" stroke-linecap="round" stroke-linejoin="round"/>`,
    // Interior grass fill
    `<path d="${d}" fill="#d0dac2" stroke="none"/>`,
    // Track surface
    `<path d="${d}" fill="none" stroke="#c4b89a" stroke-width="${TW + 8}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="${d}" fill="none" stroke="#e0d8c8" stroke-width="${TW + 3}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="${d}" fill="none" stroke="#2a2520" stroke-width="${TW}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="${d}" fill="none" stroke="#4a4540" stroke-width="1.5" stroke-dasharray="12 12"/>`,
    // Start/finish red line
    `<line x1="${(startP.x + nx * sfH).toFixed(1)}" y1="${(startP.y + ny * sfH).toFixed(1)}" x2="${(startP.x - nx * sfH).toFixed(1)}" y2="${(startP.y - ny * sfH).toFixed(1)}" stroke="#c62828" stroke-width="3"/>`,
    // Double border frame
    `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="none" stroke="rgba(140,128,108,0.2)" stroke-width="1.5"/>`,
    `<rect x="7" y="7" width="${w - 14}" height="${h - 14}" fill="none" stroke="rgba(140,128,108,0.08)" stroke-width="1"/>`,
    `</svg>`,
  ].join("\n");
}

/** Fetch a Google Font as TTF by using an older UA string. */
async function loadGoogleFont(
  family: string,
  weight: number,
  italic = false
): Promise<ArrayBuffer> {
  const ital = italic ? 1 : 0;
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:ital,wght@${ital},${weight}`,
    {
      headers: {
        // Old IE UA → Google returns truetype format (Satori needs TTF/OTF/WOFF)
        "User-Agent":
          "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
      },
    }
  ).then((r) => r.text());

  const url = css.match(/url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error(`Font URL not found for ${family}`);
  return fetch(url).then((r) => r.arrayBuffer());
}

export default async function Image({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const seed = `${owner}/${repo}`;

  // Build SVG track as base64 data URI
  const svg = buildTrackSvg(seed, size.width, size.height);
  const bgUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  // Load fonts
  const [playfairFont, barlowFont] = await Promise.all([
    loadGoogleFont("Playfair Display", 900, true),
    loadGoogleFont("Barlow Condensed", 700),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "#ebe5d8",
        }}
      >
        {/* Track SVG background */}
        <img
          src={bgUri}
          width={size.width}
          height={size.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        />

        {/* Newspaper-style text card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "28px 52px",
            background: "rgba(250, 247, 242, 0.92)",
            border: "3px solid #1a1a1a",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "20px 48px",
              border: "1px solid rgba(26, 26, 26, 0.5)",
            }}
          >
            <span
              style={{
                fontFamily: "Barlow Condensed",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.3em",
                color: "#1a1a1a",
              }}
            >
              * THE GRAND GIT RACES *
            </span>
            <div
              style={{
                width: "100%",
                height: 1,
                background: "rgba(26, 26, 26, 0.15)",
                margin: "14px 0",
              }}
            />
            <span
              style={{
                fontFamily: "Playfair Display",
                fontSize: 72,
                fontWeight: 900,
                fontStyle: "italic",
                color: "#c62828",
                lineHeight: 1.1,
                maxWidth: 800,
                textAlign: "center",
              }}
            >
              {repo}
            </span>
            <span
              style={{
                fontFamily: "Barlow Condensed",
                fontSize: 24,
                fontWeight: 700,
                color: "#8b8178",
                marginTop: 10,
                letterSpacing: "0.1em",
              }}
            >
              {owner}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Playfair Display",
          data: playfairFont,
          style: "italic" as const,
          weight: 900 as const,
        },
        {
          name: "Barlow Condensed",
          data: barlowFont,
          style: "normal" as const,
          weight: 700 as const,
        },
      ],
    }
  );
}
