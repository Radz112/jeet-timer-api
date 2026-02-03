import { createCanvas } from "@napi-rs/canvas";
import type { JeetAnalysis } from "../types";
import { getJeetLevel, formatHoldTime } from "../utils/jeet-levels";

const WIDTH = 800;
const HEIGHT = 600;
const CENTER_X = WIDTH / 2;
const CENTER_Y = 320;
const RADIUS = 200;
const LOG_86400 = Math.log(86400);

const ZONES: { startAngle: number; endAngle: number; color: string }[] = [
  { startAngle: Math.PI,                            endAngle: Math.PI * (1 - 72 / 180),  color: "#ff3b3b" },
  { startAngle: Math.PI * (1 - 72 / 180),           endAngle: Math.PI * (1 - 126 / 180), color: "#ffc107" },
  { startAngle: Math.PI * (1 - 126 / 180),          endAngle: 0,                          color: "#4caf50" },
];

function calcNeedleAngle(avgSeconds: number): number {
  const clamped = Math.max(1, Math.min(avgSeconds, 86400));
  return Math.PI * (1 - Math.log(clamped) / LOG_86400);
}

export async function generateSpeedometer(
  analysis: JeetAnalysis,
  wallet: string
): Promise<string> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0f0f1a";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("JEET-O-METER", CENTER_X, 50);

  // Gauge arcs
  ctx.lineWidth = 30;
  for (const zone of ZONES) {
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, RADIUS, zone.endAngle, zone.startAngle);
    ctx.strokeStyle = zone.color;
    ctx.stroke();
  }

  // Zone labels
  ctx.font = "bold 14px sans-serif";
  const labels: [string, string, number][] = [
    ["JEET", "#ff3b3b", -170],
    ["TRADER", "#ffc107", 0],
    ["DIAMOND", "#4caf50", 170],
  ];
  for (const [text, color, offset] of labels) {
    ctx.fillStyle = color;
    ctx.fillText(text, CENTER_X + offset, CENTER_Y - RADIUS - 20);
  }

  // Needle
  const angle = calcNeedleAngle(analysis.avg_hold_seconds);
  const len = RADIUS - 40;
  ctx.beginPath();
  ctx.moveTo(CENTER_X, CENTER_Y);
  ctx.lineTo(CENTER_X + len * Math.cos(angle), CENTER_Y - len * Math.sin(angle));
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Stats
  const jeetLevel = getJeetLevel(analysis.avg_hold_seconds);

  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${jeetLevel.emoji} ${jeetLevel.level}`, CENTER_X, CENTER_Y + 60);

  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#cccccc";
  ctx.fillText(`Avg Hold: ${formatHoldTime(analysis.avg_hold_seconds)}`, CENTER_X, CENTER_Y + 100);
  ctx.fillText(`Fastest Exit: ${formatHoldTime(analysis.fastest_jeet)}`, CENTER_X, CENTER_Y + 130);
  ctx.fillText(`Trades: ${analysis.total_trades_analyzed}`, CENTER_X, CENTER_Y + 160);

  // Jeet certificate badge
  if (analysis.avg_hold_seconds > 0 && analysis.avg_hold_seconds < 60) {
    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = "#ff3b3b";
    ctx.fillText("OFFICIAL JEET CERTIFICATE", CENTER_X, CENTER_Y + 200);
  }

  // Truncated wallet
  const truncated = wallet.length > 8
    ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
    : wallet;
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#888888";
  ctx.fillText(truncated, CENTER_X, HEIGHT - 20);

  const buffer = canvas.toBuffer("image/png");
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
