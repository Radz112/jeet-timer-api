import { describe, it, expect } from "vitest";
import { generateSpeedometer } from "../../src/services/canvas.service";
import type { JeetAnalysis } from "../../src/types";

function makeAnalysis(overrides?: Partial<JeetAnalysis>): JeetAnalysis {
  return {
    trade_pairs: [],
    avg_hold_seconds: 120,
    fastest_jeet: 10,
    total_trades_analyzed: 5,
    unmatched_buys: 1,
    ...overrides,
  };
}

const WALLET = "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp";

function decodePng(dataUri: string): Buffer {
  return Buffer.from(dataUri.replace("data:image/png;base64,", ""), "base64");
}

describe("canvas.service — generateSpeedometer", () => {
  // ── Valid output format ──

  it("returns a valid data URI base64 string", async () => {
    const result = await generateSpeedometer(makeAnalysis(), WALLET);
    expect(result).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/);
  });

  it("base64 decodes to > 100 bytes", async () => {
    const buf = decodePng(await generateSpeedometer(makeAnalysis(), WALLET));
    expect(buf.length).toBeGreaterThan(100);
  });

  it("PNG magic bytes present (0x89504E47)", async () => {
    const buf = decodePng(await generateSpeedometer(makeAnalysis(), WALLET));
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });

  // ── Edge case inputs ──

  it("does not crash with avg_hold_seconds=0", async () => {
    const result = await generateSpeedometer(
      makeAnalysis({ avg_hold_seconds: 0, fastest_jeet: 0, total_trades_analyzed: 0 }),
      WALLET
    );
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("does not crash with avg_hold_seconds=999999 (beyond clamp)", async () => {
    const result = await generateSpeedometer(
      makeAnalysis({ avg_hold_seconds: 999999, fastest_jeet: 999999 }),
      WALLET
    );
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("does not crash with fastest_jeet=0", async () => {
    const result = await generateSpeedometer(
      makeAnalysis({ fastest_jeet: 0 }),
      WALLET
    );
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("does not crash with negative avg_hold_seconds", async () => {
    const result = await generateSpeedometer(
      makeAnalysis({ avg_hold_seconds: -10 }),
      WALLET
    );
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("handles short wallet string (< 8 chars)", async () => {
    const result = await generateSpeedometer(makeAnalysis(), "abc");
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("handles empty wallet string", async () => {
    const result = await generateSpeedometer(makeAnalysis(), "");
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  // ── Different jeet levels produce different images ──

  it("produces different image bytes for jeet vs diamond hands", async () => {
    const jeetImage = await generateSpeedometer(
      makeAnalysis({ avg_hold_seconds: 5 }),
      WALLET
    );
    const diamondImage = await generateSpeedometer(
      makeAnalysis({ avg_hold_seconds: 100000 }),
      WALLET
    );
    // Different needle positions + stats text = different bytes
    expect(jeetImage).not.toBe(diamondImage);
  });

  it("produces different image bytes for different trade counts", async () => {
    const img1 = await generateSpeedometer(
      makeAnalysis({ total_trades_analyzed: 1 }),
      WALLET
    );
    const img2 = await generateSpeedometer(
      makeAnalysis({ total_trades_analyzed: 999 }),
      WALLET
    );
    expect(img1).not.toBe(img2);
  });

  // ── Performance ──

  it("completes in < 3s", async () => {
    const start = Date.now();
    await generateSpeedometer(makeAnalysis(), WALLET);
    expect(Date.now() - start).toBeLessThan(3000);
  });
});
