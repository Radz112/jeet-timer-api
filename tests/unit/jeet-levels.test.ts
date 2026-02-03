import { describe, it, expect } from "vitest";
import { getJeetLevel, formatHoldTime } from "../../src/utils/jeet-levels";

describe("getJeetLevel", () => {
  it("< 30s → Atomic Jeet (red)", () => {
    expect(getJeetLevel(0)).toEqual({ level: "Atomic Jeet", emoji: "⚡", zone: "red" });
    expect(getJeetLevel(29)).toEqual({ level: "Atomic Jeet", emoji: "⚡", zone: "red" });
  });

  it("30-59s → Grandmaster Jeet (red)", () => {
    expect(getJeetLevel(30)).toEqual({ level: "Grandmaster Jeet", emoji: "🏎️", zone: "red" });
    expect(getJeetLevel(59)).toEqual({ level: "Grandmaster Jeet", emoji: "🏎️", zone: "red" });
  });

  it("60-299s → Speed Demon (red)", () => {
    expect(getJeetLevel(60)).toEqual({ level: "Speed Demon", emoji: "💨", zone: "red" });
    expect(getJeetLevel(299)).toEqual({ level: "Speed Demon", emoji: "💨", zone: "red" });
  });

  it("300-899s → Quick Flip (yellow)", () => {
    expect(getJeetLevel(300)).toEqual({ level: "Quick Flip", emoji: "🔄", zone: "yellow" });
    expect(getJeetLevel(899)).toEqual({ level: "Quick Flip", emoji: "🔄", zone: "yellow" });
  });

  it("900-3599s → Swing Trader (yellow)", () => {
    expect(getJeetLevel(900)).toEqual({ level: "Swing Trader", emoji: "📊", zone: "yellow" });
    expect(getJeetLevel(3599)).toEqual({ level: "Swing Trader", emoji: "📊", zone: "yellow" });
  });

  it("3600-86399s → Patient Player (green)", () => {
    expect(getJeetLevel(3600)).toEqual({ level: "Patient Player", emoji: "⏳", zone: "green" });
    expect(getJeetLevel(86399)).toEqual({ level: "Patient Player", emoji: "⏳", zone: "green" });
  });

  it(">= 86400s → Diamond Hands (green)", () => {
    expect(getJeetLevel(86400)).toEqual({ level: "Diamond Hands", emoji: "💎", zone: "green" });
    expect(getJeetLevel(999999)).toEqual({ level: "Diamond Hands", emoji: "💎", zone: "green" });
  });
});

describe("formatHoldTime", () => {
  it("formats seconds < 60", () => {
    expect(formatHoldTime(0)).toBe("0 seconds");
    expect(formatHoldTime(1)).toBe("1 second");
    expect(formatHoldTime(42)).toBe("42 seconds");
    expect(formatHoldTime(59)).toBe("59 seconds");
  });

  it("formats minutes + seconds", () => {
    expect(formatHoldTime(60)).toBe("1m");
    expect(formatHoldTime(90)).toBe("1m 30s");
    expect(formatHoldTime(120)).toBe("2m");
    expect(formatHoldTime(299)).toBe("4m 59s");
  });

  it("formats hours + minutes", () => {
    expect(formatHoldTime(3600)).toBe("1h");
    expect(formatHoldTime(3661)).toBe("1h 1m");
    expect(formatHoldTime(7200)).toBe("2h");
  });

  it("formats days + hours", () => {
    expect(formatHoldTime(86400)).toBe("1d");
    expect(formatHoldTime(90000)).toBe("1d 1h");
    expect(formatHoldTime(172800)).toBe("2d");
  });

  it("handles negative input as 0", () => {
    expect(formatHoldTime(-5)).toBe("0 seconds");
  });
});
