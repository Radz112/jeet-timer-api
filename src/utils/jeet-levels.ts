export interface JeetLevel {
  level: string;
  emoji: string;
  zone: "red" | "yellow" | "green";
}

const TIERS: { maxSeconds: number; level: string; emoji: string; zone: "red" | "yellow" | "green" }[] = [
  { maxSeconds: 30,    level: "Atomic Jeet",     emoji: "⚡",  zone: "red" },
  { maxSeconds: 60,    level: "Grandmaster Jeet", emoji: "🏎️", zone: "red" },
  { maxSeconds: 300,   level: "Speed Demon",     emoji: "💨",  zone: "red" },
  { maxSeconds: 900,   level: "Quick Flip",      emoji: "🔄",  zone: "yellow" },
  { maxSeconds: 3600,  level: "Swing Trader",    emoji: "📊",  zone: "yellow" },
  { maxSeconds: 86400, level: "Patient Player",  emoji: "⏳",  zone: "green" },
];

export function getJeetLevel(avgSeconds: number): JeetLevel {
  for (const tier of TIERS) {
    if (avgSeconds < tier.maxSeconds) {
      return { level: tier.level, emoji: tier.emoji, zone: tier.zone };
    }
  }
  return { level: "Diamond Hands", emoji: "💎", zone: "green" };
}

export function formatHoldTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  seconds = Math.floor(seconds);

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  // minutes only
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
}
