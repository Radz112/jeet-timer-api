import { createCanvas } from "@napi-rs/canvas";
import type { JeetAnalysis } from "../types";
import { getJeetLevel, formatHoldTime } from "../utils/jeet-levels";

const WIDTH = 800;
const HEIGHT = 600;
const BG_COLOR = "#0f0f1a";

// Gauge geometry
const CENTER_X = WIDTH / 2;
const CENTER_Y = 320;
const RADIUS = 200;

// Zone arcs (0° = left, 180° = right on a flipped semi-circle)
// We draw from π to 0 (left to right)
const ZONES: { startAngle: number; endAngle: number; color: string; label: string }[] = [
  { startAngle: Math.PI, endAngle: Math.PI - (72 / 180) * Math.PI, color: "#ff3b3b", label: "JEET" },
  { startAngle: Math.PI - (72 / 180) * Math.PI, endAngle: Math.PI - (126 / 180) * Math.PI, color: "#ffc107", label: "TRADER" },
  { startAngle: Math.PI - (126 / 180) * Math.PI, endAngle: 0, color: "#4caf50", label: "DIAMOND" },
];

function calcNeedleAngle(avgSeconds: number): number {
  const clamped = Math.max(1, Math.min(avgSeconds, 86400));
  const ratio = (Math.log(clamped) - Math.log(1)) / (Math.log(86400) - Math.log(1));
  // Map ratio 0→π (left/jeet) to 1→0 (right/diamond)
  return Math.PI * (1 - ratio);
}

export async function generateSpeedometer(
  analysis: JeetAnalysis,
  wallet: string
): Promise<string> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("JEET-O-METER", CENTER_X, 50);

  // Draw gauge arcs
  ctx.lineWidth = 30;
  for (const zone of ZONES) {
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, RADIUS, zone.endAngle, zone.startAngle);
    ctx.strokeStyle = zone.color;
    ctx.stroke();
  }

  // Draw zone labels
  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = "#ff3b3b";
  ctx.fillText("JEET", CENTER_X - 170, CENTER_Y - RADIUS - 20);
  ctx.fillStyle = "#ffc107";
  ctx.fillText("TRADER", CENTER_X, CENTER_Y - RADIUS - 20);
  ctx.fillStyle = "#4caf50";
  ctx.fillText("DIAMOND", CENTER_X + 170, CENTER_Y - RADIUS - 20);

  // Draw needle
  const needleAngle = calcNeedleAngle(analysis.avg_hold_seconds);
  const needleLength = RADIUS - 40;
  const needleX = CENTER_X + needleLength * Math.cos(needleAngle);
  const needleY = CENTER_Y - needleLength * Math.sin(needleAngle);

  ctx.beginPath();
  ctx.moveTo(CENTER_X, CENTER_Y);
  ctx.lineTo(needleX, needleY);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Stats below gauge
  const jeetLevel = getJeetLevel(analysis.avg_hold_seconds);
  const avgFormatted = formatHoldTime(analysis.avg_hold_seconds);
  const fastestFormatted = formatHoldTime(analysis.fastest_jeet);

  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(`${jeetLevel.emoji} ${jeetLevel.level}`, CENTER_X, CENTER_Y + 60);

  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#cccccc";
  ctx.fillText(`Avg Hold: ${avgFormatted}`, CENTER_X, CENTER_Y + 100);
  ctx.fillText(`Fastest Exit: ${fastestFormatted}`, CENTER_X, CENTER_Y + 130);
  ctx.fillText(`Trades: ${analysis.total_trades_analyzed}`, CENTER_X, CENTER_Y + 160);

  // Jeet certificate badge if avg < 60s
  if (analysis.avg_hold_seconds < 60 && analysis.avg_hold_seconds > 0) {
    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = "#ff3b3b";
    ctx.fillText("OFFICIAL JEET CERTIFICATE", CENTER_X, CENTER_Y + 200);
  }

  // Truncated wallet at bottom
  const truncated = wallet.length > 8
    ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
    : wallet;
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#888888";
  ctx.fillText(truncated, CENTER_X, HEIGHT - 20);

  // Encode to PNG base64
  const buffer = canvas.toBuffer("image/png");
  const base64 = buffer.toString("base64");
  return `data:image/png;base64,${base64}`;
}
