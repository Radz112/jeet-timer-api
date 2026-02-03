import { describe, it, expect } from "vitest";
import { analyzeHoldTimes } from "../../src/services/history.service";
import {
  scenario1_simplePair,
  scenario2_fifoMatching,
  scenario3_twoMints,
  scenario4_unmatchedBuy,
  scenario5_onlyBuys,
  scenario6_empty,
  scenario7_stablesOnly,
  scenario8_mixedStablesAndReal,
} from "../fixtures/helius-fixtures";

describe("history.service — analyzeHoldTimes", () => {
  it("scenario 1: single BUY→SELL pair", () => {
    const result = analyzeHoldTimes(scenario1_simplePair);
    expect(result.total_trades_analyzed).toBe(1);
    expect(result.trade_pairs).toHaveLength(1);
    expect(result.trade_pairs[0]!.holdSeconds).toBe(60);
    expect(result.avg_hold_seconds).toBe(60);
    expect(result.fastest_jeet).toBe(60);
    expect(result.unmatched_buys).toBe(0);
  });

  it("scenario 2: FIFO matching — two pairs same mint", () => {
    const result = analyzeHoldTimes(scenario2_fifoMatching);
    expect(result.total_trades_analyzed).toBe(2);
    expect(result.trade_pairs).toHaveLength(2);
    // FIFO: buy@1000→sell@1030=30s, buy@1100→sell@1200=100s
    const holds = result.trade_pairs.map((p) => p.holdSeconds).sort((a, b) => a - b);
    expect(holds).toEqual([30, 100]);
    expect(result.avg_hold_seconds).toBe(65);
    expect(result.fastest_jeet).toBe(30);
    expect(result.unmatched_buys).toBe(0);
  });

  it("scenario 3: two different mints — independent pairing", () => {
    const result = analyzeHoldTimes(scenario3_twoMints);
    expect(result.total_trades_analyzed).toBe(2);
    const holds = result.trade_pairs.map((p) => p.holdSeconds).sort((a, b) => a - b);
    expect(holds).toEqual([10, 50]);
    expect(result.avg_hold_seconds).toBe(30);
    expect(result.fastest_jeet).toBe(10);
  });

  it("scenario 4: unmatched buy — one pair + one leftover", () => {
    const result = analyzeHoldTimes(scenario4_unmatchedBuy);
    expect(result.total_trades_analyzed).toBe(1);
    expect(result.trade_pairs[0]!.holdSeconds).toBe(60);
    expect(result.unmatched_buys).toBe(1);
  });

  it("scenario 5: only buys — no pairs", () => {
    const result = analyzeHoldTimes(scenario5_onlyBuys);
    expect(result.total_trades_analyzed).toBe(0);
    expect(result.trade_pairs).toHaveLength(0);
    expect(result.unmatched_buys).toBe(2);
    expect(result.avg_hold_seconds).toBe(0);
    expect(result.fastest_jeet).toBe(0);
  });

  it("scenario 6: empty transactions", () => {
    const result = analyzeHoldTimes(scenario6_empty);
    expect(result.total_trades_analyzed).toBe(0);
    expect(result.trade_pairs).toHaveLength(0);
    expect(result.unmatched_buys).toBe(0);
    expect(result.avg_hold_seconds).toBe(0);
    expect(result.fastest_jeet).toBe(0);
  });

  it("scenario 7: stables-only swaps — all ignored", () => {
    const result = analyzeHoldTimes(scenario7_stablesOnly);
    expect(result.total_trades_analyzed).toBe(0);
    expect(result.trade_pairs).toHaveLength(0);
    expect(result.unmatched_buys).toBe(0);
  });

  it("scenario 8: mixed stables + real trades — only real counted", () => {
    const result = analyzeHoldTimes(scenario8_mixedStablesAndReal);
    expect(result.total_trades_analyzed).toBe(1);
    expect(result.trade_pairs[0]!.holdSeconds).toBe(5);
    expect(result.fastest_jeet).toBe(5);
  });

  it("populates buySignature and sellSignature", () => {
    const result = analyzeHoldTimes(scenario1_simplePair);
    expect(result.trade_pairs[0]!.buySignature).toBe("buy1");
    expect(result.trade_pairs[0]!.sellSignature).toBe("sell1");
  });
});
