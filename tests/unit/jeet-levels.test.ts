import { describe, it, expect } from "vitest";
import { getJeetLevel, formatHoldTime } from "../../src/utils/jeet-levels";

describe("getJeetLevel", () => {
  // ── Each tier boundary ──

  it("< 30s → Atomic Jeet (red)", () => {
    expect(getJeetLevel(0)).toEqual({ level: "Atomic Jeet", emoji: "⚡", zone: "red" });
    expect(getJeetLevel(29)).toEqual({ level: "Atomic Jeet", emoji: "⚡", zone: "red" });
    expect(getJeetLevel(29.999)).toEqual({ level: "Atomic Jeet", emoji: "⚡", zone: "red" });
  });

  it("exact boundary 30 → Grandmaster Jeet (not Atomic)", () => {
    expect(getJeetLevel(30)).toEqual({ level: "Grandmaster Jeet", emoji: "🏎️", zone: "red" });
  });

  it("30-59s → Grandmaster Jeet (red)", () => {
    expect(getJeetLevel(30)).toEqual({ level: "Grandmaster Jeet", emoji: "🏎️", zone: "red" });
    expect(getJeetLevel(59)).toEqual({ level: "Grandmaster Jeet", emoji: "🏎️", zone: "red" });
  });

  it("exact boundary 60 → Speed Demon (not Grandmaster)", () => {
    expect(getJeetLevel(60)).toEqual({ level: "Speed Demon", emoji: "💨", zone: "red" });
  });

  it("60-299s → Speed Demon (red)", () => {
    expect(getJeetLevel(60)).toEqual({ level: "Speed Demon", emoji: "💨", zone: "red" });
    expect(getJeetLevel(299)).toEqual({ level: "Speed Demon", emoji: "💨", zone: "red" });
  });

  it("exact boundary 300 → Quick Flip (not Speed Demon)", () => {
    expect(getJeetLevel(300)).toEqual({ level: "Quick Flip", emoji: "🔄", zone: "yellow" });
  });

  it("300-899s → Quick Flip (yellow)", () => {
    expect(getJeetLevel(300)).toEqual({ level: "Quick Flip", emoji: "🔄", zone: "yellow" });
    expect(getJeetLevel(899)).toEqual({ level: "Quick Flip", emoji: "🔄", zone: "yellow" });
  });

  it("exact boundary 900 → Swing Trader (not Quick Flip)", () => {
    expect(getJeetLevel(900)).toEqual({ level: "Swing Trader", emoji: "📊", zone: "yellow" });
  });

  it("900-3599s → Swing Trader (yellow)", () => {
    expect(getJeetLevel(900)).toEqual({ level: "Swing Trader", emoji: "📊", zone: "yellow" });
    expect(getJeetLevel(3599)).toEqual({ level: "Swing Trader", emoji: "📊", zone: "yellow" });
  });

  it("exact boundary 3600 → Patient Player (not Swing Trader)", () => {
    expect(getJeetLevel(3600)).toEqual({ level: "Patient Player", emoji: "⏳", zone: "green" });
  });

  it("3600-86399s → Patient Player (green)", () => {
    expect(getJeetLevel(3600)).toEqual({ level: "Patient Player", emoji: "⏳", zone: "green" });
    expect(getJeetLevel(86399)).toEqual({ level: "Patient Player", emoji: "⏳", zone: "green" });
  });

  it("exact boundary 86400 → Diamond Hands (not Patient Player)", () => {
    expect(getJeetLevel(86400)).toEqual({ level: "Diamond Hands", emoji: "💎", zone: "green" });
  });

  it(">= 86400s → Diamond Hands (green)", () => {
    expect(getJeetLevel(86400)).toEqual({ level: "Diamond Hands", emoji: "💎", zone: "green" });
    expect(getJeetLevel(999999)).toEqual({ level: "Diamond Hands", emoji: "💎", zone: "green" });
  });

  // ── Edge values ──

  it("handles fractional seconds", () => {
    expect(getJeetLevel(29.5)).toEqual({ level: "Atomic Jeet", emoji: "⚡", zone: "red" });
    expect(getJeetLevel(59.9)).toEqual({ level: "Grandmaster Jeet", emoji: "🏎️", zone: "red" });
  });

  it("handles negative input (falls into Atomic Jeet)", () => {
    expect(getJeetLevel(-1)).toEqual({ level: "Atomic Jeet", emoji: "⚡", zone: "red" });
  });

  it("handles very large values", () => {
    expect(getJeetLevel(1_000_000_000)).toEqual({ level: "Diamond Hands", emoji: "💎", zone: "green" });
  });

  it("returns a plain JeetLevel object (no extra properties)", () => {
    const result = getJeetLevel(15);
    expect(Object.keys(result).sort()).toEqual(["emoji", "level", "zone"]);
  });
});

describe("formatHoldTime", () => {
  // ── Seconds range ──

  it("0 → '0 seconds' (plural)", () => {
    expect(formatHoldTime(0)).toBe("0 seconds");
  });

  it("1 → '1 second' (singular)", () => {
    expect(formatHoldTime(1)).toBe("1 second");
  });

  it("42 → '42 seconds'", () => {
    expect(formatHoldTime(42)).toBe("42 seconds");
  });

  it("59 → '59 seconds' (just below minutes)", () => {
    expect(formatHoldTime(59)).toBe("59 seconds");
  });

  // ── Minutes range ──

  it("60 → '1m' (exact minute, no seconds shown)", () => {
    expect(formatHoldTime(60)).toBe("1m");
  });

  it("90 → '1m 30s'", () => {
    expect(formatHoldTime(90)).toBe("1m 30s");
  });

  it("120 → '2m'", () => {
    expect(formatHoldTime(120)).toBe("2m");
  });

  it("3599 → '59m 59s' (just below hours)", () => {
    expect(formatHoldTime(3599)).toBe("59m 59s");
  });

  // ── Hours range ──

  it("3600 → '1h' (exact hour)", () => {
    expect(formatHoldTime(3600)).toBe("1h");
  });

  it("3661 → '1h 1m' (drops remaining seconds)", () => {
    expect(formatHoldTime(3661)).toBe("1h 1m");
  });

  it("7200 → '2h'", () => {
    expect(formatHoldTime(7200)).toBe("2h");
  });

  it("86399 → '23h 59m' (just below days)", () => {
    expect(formatHoldTime(86399)).toBe("23h 59m");
  });

  // ── Days range ──

  it("86400 → '1d'", () => {
    expect(formatHoldTime(86400)).toBe("1d");
  });

  it("90000 → '1d 1h'", () => {
    expect(formatHoldTime(90000)).toBe("1d 1h");
  });

  it("172800 → '2d'", () => {
    expect(formatHoldTime(172800)).toBe("2d");
  });

  // ── Edge cases ──

  it("negative input treated as 0", () => {
    expect(formatHoldTime(-5)).toBe("0 seconds");
    expect(formatHoldTime(-100)).toBe("0 seconds");
  });

  it("fractional seconds are floored", () => {
    expect(formatHoldTime(0.9)).toBe("0 seconds");
    expect(formatHoldTime(1.9)).toBe("1 second");
    expect(formatHoldTime(59.99)).toBe("59 seconds");
    expect(formatHoldTime(60.5)).toBe("1m");
    expect(formatHoldTime(90.7)).toBe("1m 30s");
  });
});
