import { describe, it, expect } from "vitest";
import { analyzeHoldTimes } from "../../src/services/history.service";
import type { EnhancedTransaction } from "../../src/types";
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

const WALLET = "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp";
const MINT_A = "MintAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function makeTx(
  signature: string,
  timestamp: number,
  tokenInputMints: string[],
  tokenOutputMints: string[]
): EnhancedTransaction {
  return {
    signature,
    timestamp,
    type: "SWAP",
    source: "RAYDIUM",
    fee: 5000,
    feePayer: WALLET,
    description: "swapped tokens",
    tokenTransfers: [],
    events: {
      swap: {
        tokenInputs: tokenInputMints.map((mint) => ({
          userAccount: WALLET,
          tokenAccount: "tokenAcct",
          mint,
          rawTokenAmount: { tokenAmount: "1000000", decimals: 6 },
        })),
        tokenOutputs: tokenOutputMints.map((mint) => ({
          userAccount: WALLET,
          tokenAccount: "tokenAcct",
          mint,
          rawTokenAmount: { tokenAmount: "1000000", decimals: 6 },
        })),
        tokenFees: [],
        nativeFees: [],
        innerSwaps: [],
      },
    },
  };
}

describe("history.service — analyzeHoldTimes", () => {
  // ── Fixture scenarios ──

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

  // ── Signature population ──

  it("populates buySignature and sellSignature correctly", () => {
    const result = analyzeHoldTimes(scenario1_simplePair);
    expect(result.trade_pairs[0]!.buySignature).toBe("buy1");
    expect(result.trade_pairs[0]!.sellSignature).toBe("sell1");
  });

  // ── Edge cases ──

  it("sorts reverse-chronological input correctly", () => {
    // Provide transactions in descending order — should still pair correctly
    const txs = [
      makeTx("sell1", 1060, [MINT_A], [USDC]),
      makeTx("buy1", 1000, [USDC], [MINT_A]),
    ];
    const result = analyzeHoldTimes(txs);
    expect(result.total_trades_analyzed).toBe(1);
    expect(result.trade_pairs[0]!.holdSeconds).toBe(60);
    expect(result.trade_pairs[0]!.buySignature).toBe("buy1");
    expect(result.trade_pairs[0]!.sellSignature).toBe("sell1");
  });

  it("handles instant jeet (buy and sell at same timestamp)", () => {
    const txs = [
      makeTx("buy1", 1000, [USDC], [MINT_A]),
      makeTx("sell1", 1000, [MINT_A], [USDC]),
    ];
    const result = analyzeHoldTimes(txs);
    expect(result.total_trades_analyzed).toBe(1);
    expect(result.trade_pairs[0]!.holdSeconds).toBe(0);
    expect(result.avg_hold_seconds).toBe(0);
    expect(result.fastest_jeet).toBe(0);
  });

  it("handles only sells (no buys) — zero pairs, zero unmatched", () => {
    const txs = [
      makeTx("sell1", 1000, [MINT_A], [USDC]),
      makeTx("sell2", 1100, [MINT_A], [USDC]),
    ];
    const result = analyzeHoldTimes(txs);
    expect(result.total_trades_analyzed).toBe(0);
    expect(result.trade_pairs).toHaveLength(0);
    // sells without buys are not counted as unmatched buys
    expect(result.unmatched_buys).toBe(0);
  });

  it("skips transactions with no events.swap", () => {
    const txWithoutSwap: EnhancedTransaction = {
      signature: "noSwap",
      timestamp: 1000,
      type: "TRANSFER",
      source: "SYSTEM",
      fee: 5000,
      feePayer: WALLET,
      description: "transfer",
      tokenTransfers: [],
      events: {},
    };
    const txs = [
      txWithoutSwap,
      makeTx("buy1", 1100, [USDC], [MINT_A]),
      makeTx("sell1", 1200, [MINT_A], [USDC]),
    ];
    const result = analyzeHoldTimes(txs);
    expect(result.total_trades_analyzed).toBe(1);
    expect(result.trade_pairs[0]!.holdSeconds).toBe(100);
  });

  it("does not mutate the input array", () => {
    const txs = [
      makeTx("sell1", 1060, [MINT_A], [USDC]),
      makeTx("buy1", 1000, [USDC], [MINT_A]),
    ];
    const originalOrder = txs.map((t) => t.signature);
    analyzeHoldTimes(txs);
    expect(txs.map((t) => t.signature)).toEqual(originalOrder);
  });

  it("FIFO skips sells that occur before the current buy", () => {
    // sell@900 happens before buy@1000 — should be skipped, not paired
    const txs = [
      makeTx("sell_early", 900, [MINT_A], [USDC]),
      makeTx("buy1", 1000, [USDC], [MINT_A]),
      makeTx("sell_late", 1050, [MINT_A], [USDC]),
    ];
    const result = analyzeHoldTimes(txs);
    expect(result.total_trades_analyzed).toBe(1);
    expect(result.trade_pairs[0]!.holdSeconds).toBe(50);
    expect(result.trade_pairs[0]!.sellSignature).toBe("sell_late");
  });

  it("handles many trades — avg is correct with fractional result", () => {
    const txs = [
      makeTx("buy1", 1000, [USDC], [MINT_A]),
      makeTx("sell1", 1010, [MINT_A], [USDC]), // 10s
      makeTx("buy2", 1100, [USDC], [MINT_A]),
      makeTx("sell2", 1120, [MINT_A], [USDC]), // 20s
      makeTx("buy3", 1200, [USDC], [MINT_A]),
      makeTx("sell3", 1230, [MINT_A], [USDC]), // 30s
    ];
    const result = analyzeHoldTimes(txs);
    expect(result.total_trades_analyzed).toBe(3);
    expect(result.avg_hold_seconds).toBe(20); // (10+20+30)/3
    expect(result.fastest_jeet).toBe(10);
  });

  it("populates mint field on each trade pair", () => {
    const result = analyzeHoldTimes(scenario3_twoMints);
    const mints = result.trade_pairs.map((p) => p.mint).sort();
    expect(mints).toEqual([
      "MintAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "MintBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    ]);
  });
});
