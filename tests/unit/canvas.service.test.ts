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

describe("canvas.service — generateSpeedometer", () => {
  it("returns a valid data URI base64 string", async () => {
    const result = await generateSpeedometer(makeAnalysis(), WALLET);
    expect(result).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/);
  });

  it("base64 decodes to valid bytes", async () => {
    const result = await generateSpeedometer(makeAnalysis(), WALLET);
    const b64 = result.replace("data:image/png;base64,", "");
    const buf = Buffer.from(b64, "base64");
    expect(buf.length).toBeGreaterThan(100);
  });

  it("PNG magic bytes present (0x89504E47)", async () => {
    const result = await generateSpeedometer(makeAnalysis(), WALLET);
    const b64 = result.replace("data:image/png;base64,", "");
    const buf = Buffer.from(b64, "base64");
    // PNG signature: 137 80 78 71 (0x89 0x50 0x4E 0x47)
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });

  it("does not crash with avg_hold_seconds=0", async () => {
    const result = await generateSpeedometer(
      makeAnalysis({ avg_hold_seconds: 0, fastest_jeet: 0, total_trades_analyzed: 0 }),
      WALLET
    );
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("does not crash with avg_hold_seconds=999999", async () => {
    const result = await generateSpeedometer(
      makeAnalysis({ avg_hold_seconds: 999999, fastest_jeet: 999999 }),
      WALLET
    );
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("does not crash with fastest_jeet=0 (edge case for no trades)", async () => {
    const result = await generateSpeedometer(
      makeAnalysis({ fastest_jeet: 0 }),
      WALLET
    );
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("completes in < 3s", async () => {
    const start = Date.now();
    await generateSpeedometer(makeAnalysis(), WALLET);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });
});
