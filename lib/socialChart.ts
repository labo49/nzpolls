import sharp from "sharp";
import { actualPolls, latestPollOfPolls } from "./pollOfPolls";
import { PARTIES } from "./parties";
import type { Poll } from "./types";

const WIDTH = 1200;
const HEIGHT = 630;
const CX = 340;
const CY = 340;
const RADIUS = 220;

interface Slice {
  code: string;
  name: string;
  color: string;
  value: number;
  startDeg: number;
  endDeg: number;
}

// Relative luminance (WCAG formula) decides whether a slice's direct label
// should be black or white text -- brand colors span both ends (ACT's
// yellow needs black, National's blue needs white).
function pickLabelColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? "#111111" : "#FFFFFF";
}

// theta measured in degrees clockwise from 12 o'clock.
function pointOnCircle(cx: number, cy: number, r: number, theta: number): { x: number; y: number } {
  const rad = (theta * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

function describeSlice(startDeg: number, endDeg: number): string {
  const p1 = pointOnCircle(CX, CY, RADIUS, startDeg);
  const p2 = pointOnCircle(CX, CY, RADIUS, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CX},${CY} L ${p1.x.toFixed(2)},${p1.y.toFixed(2)} A ${RADIUS},${RADIUS} 0 ${largeArc},1 ${p2.x.toFixed(2)},${p2.y.toFixed(2)} Z`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Builds a party-vote-share pie chart from the poll-of-polls aggregate of
 * the 5 most recent surveys -- the same "Last 5" recency filter the
 * dashboard offers, applied here as a fixed snapshot for social posts
 * rather than an interactive control.
 */
export function buildLast5PollsChartSvg(polls: Poll[]): { svg: string; altText: string; pollCount: number } | null {
  const last5 = actualPolls(polls)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (last5.length === 0) return null;

  const point = latestPollOfPolls(last5);
  if (!point) return null;

  // Fixed party order (never re-sorted by value) so color always maps to
  // the same entity across every post in the series.
  let cursor = 0;
  const slices: Slice[] = [];
  for (const party of PARTIES) {
    const value = point.results[party.code];
    if (value === undefined || value <= 0) continue;
    const sweep = (value / 100) * 360;
    slices.push({
      code: party.code,
      name: party.name,
      color: party.color.light,
      value,
      startDeg: cursor,
      endDeg: cursor + sweep,
    });
    cursor += sweep;
  }
  if (slices.length === 0) return null;

  const oldestDate = last5[0].date;
  const newestDate = last5[last5.length - 1].date;
  const dateRange = oldestDate === newestDate ? formatDate(newestDate) : `${formatDate(oldestDate)} – ${formatDate(newestDate)}`;
  const subtitle = `${dateRange} · ${point.pollCount} polls`;

  const sliceMarkup = slices
    .map((s) => {
      const path = `<path d="${describeSlice(s.startDeg, s.endDeg)}" fill="${s.color}" stroke="#FFFFFF" stroke-width="3" />`;
      const sweep = s.endDeg - s.startDeg;
      // Direct labels only fit on slices wide enough to hold text -- the
      // legend covers every slice regardless, so small ones are never
      // color-only.
      if (sweep < 14) return path;
      const mid = pointOnCircle(CX, CY, RADIUS * 0.62, (s.startDeg + s.endDeg) / 2);
      const labelColor = pickLabelColor(s.color);
      return `${path}<text x="${mid.x.toFixed(2)}" y="${mid.y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="${labelColor}">${s.value}%</text>`;
    })
    .join("\n    ");

  const legendX = CX + RADIUS + 110;
  const legendMarkup = slices
    .map((s, i) => {
      const y = 210 + i * 46;
      return `
    <rect x="${legendX}" y="${y}" width="22" height="22" rx="4" fill="${s.color}" />
    <text x="${legendX + 34}" y="${y + 16}" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#1A1A1A">${escapeXml(s.name)}</text>
    <text x="${WIDTH - 40}" y="${y + 16}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#1A1A1A">${s.value}%</text>`;
    })
    .join("");

  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#FFFFFF" />
    <text x="60" y="70" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" fill="#111111">NZ Poll of Polls</text>
    <text x="60" y="104" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#555555">Last 5 polls · ${escapeXml(subtitle)}</text>
    ${sliceMarkup}
    ${legendMarkup}
    <text x="60" y="${HEIGHT - 30}" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#888888">nzpolls.vercel.app</text>
  </svg>`;

  const altText = `Pie chart: party vote share averaged over the last ${point.pollCount} polls (${subtitle}) -- ${slices
    .map((s) => `${s.name} ${s.value}%`)
    .join(", ")}.`;

  return { svg, altText, pollCount: point.pollCount };
}

export async function buildLast5PollsChartPng(
  polls: Poll[]
): Promise<{ png: Buffer; altText: string } | null> {
  const built = buildLast5PollsChartSvg(polls);
  if (!built) return null;
  const png = await sharp(Buffer.from(built.svg)).png().toBuffer();
  return { png, altText: built.altText };
}
