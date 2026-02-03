export interface JeetLevel {
  level: string;
  emoji: string;
  zone: "red" | "yellow" | "green";
}

const TIERS: (JeetLevel & { maxSeconds: number })[] = [
  { maxSeconds: 30,    level: "Atomic Jeet",      emoji: "⚡",  zone: "red" },
  { maxSeconds: 60,    level: "Grandmaster Jeet",  emoji: "🏎️", zone: "red" },
  { maxSeconds: 300,   level: "Speed Demon",       emoji: "💨",  zone: "red" },
  { maxSeconds: 900,   level: "Quick Flip",        emoji: "🔄",  zone: "yellow" },
  { maxSeconds: 3600,  level: "Swing Trader",      emoji: "📊",  zone: "yellow" },
  { maxSeconds: 86400, level: "Patient Player",    emoji: "⏳",  zone: "green" },
];

const DIAMOND_HANDS: JeetLevel = { level: "Diamond Hands", emoji: "💎", zone: "green" };

export function getJeetLevel(avgSeconds: number): JeetLevel {
  const tier = TIERS.find((t) => avgSeconds < t.maxSeconds);
  if (!tier) return DIAMOND_HANDS;
  return { level: tier.level, emoji: tier.emoji, zone: tier.zone };
}

export function formatHoldTime(seconds: number): string {
  seconds = Math.max(0, Math.floor(seconds));

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
}
