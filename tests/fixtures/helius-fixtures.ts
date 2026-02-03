import type { EnhancedTransaction } from "../../src/types";

const WALLET = "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp";
const MINT_A = "MintAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const MINT_B = "MintBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const WSOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

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

// Scenario 1: Single BUY then SELL of same mint — simple pair
// BUY MintA at t=1000 (output=MintA, input=USDC)
// SELL MintA at t=1060 (input=MintA, output=USDC)
// Expected: 1 pair, holdSeconds=60
export const scenario1_simplePair: EnhancedTransaction[] = [
  makeTx("buy1", 1000, [USDC], [MINT_A]),
  makeTx("sell1", 1060, [MINT_A], [USDC]),
];

// Scenario 2: Multiple pairs same mint — FIFO matching
// BUY MintA at t=1000, BUY MintA at t=1100, SELL MintA at t=1030, SELL MintA at t=1200
// After sort: buy@1000, sell@1030, buy@1100, sell@1200
// FIFO: pair(buy@1000, sell@1030)=30s, pair(buy@1100, sell@1200)=100s
// Expected: 2 pairs, avg=65, fastest=30
export const scenario2_fifoMatching: EnhancedTransaction[] = [
  makeTx("buy1", 1000, [USDC], [MINT_A]),
  makeTx("buy2", 1100, [USDC], [MINT_A]),
  makeTx("sell1", 1030, [MINT_A], [USDC]),
  makeTx("sell2", 1200, [MINT_A], [USDC]),
];

// Scenario 3: Two different mints — independent pairing
// BUY MintA at t=1000, SELL MintA at t=1010 (10s)
// BUY MintB at t=1000, SELL MintB at t=1050 (50s)
// Expected: 2 pairs, avg=30, fastest=10
export const scenario3_twoMints: EnhancedTransaction[] = [
  makeTx("buyA", 1000, [USDC], [MINT_A]),
  makeTx("buyB", 1000, [USDC], [MINT_B]),
  makeTx("sellA", 1010, [MINT_A], [USDC]),
  makeTx("sellB", 1050, [MINT_B], [USDC]),
];

// Scenario 4: Unmatched buy — no sell for one buy
// BUY MintA at t=1000, BUY MintA at t=1100, SELL MintA at t=1060
// FIFO: pair(buy@1000, sell@1060)=60s, buy@1100 unmatched
// Expected: 1 pair, 1 unmatched buy
export const scenario4_unmatchedBuy: EnhancedTransaction[] = [
  makeTx("buy1", 1000, [USDC], [MINT_A]),
  makeTx("buy2", 1100, [USDC], [MINT_A]),
  makeTx("sell1", 1060, [MINT_A], [USDC]),
];

// Scenario 5: Only buys — no sells at all
// Expected: 0 pairs, 2 unmatched buys
export const scenario5_onlyBuys: EnhancedTransaction[] = [
  makeTx("buy1", 1000, [USDC], [MINT_A]),
  makeTx("buy2", 1100, [USDC], [MINT_A]),
];

// Scenario 6: Empty array
// Expected: 0 pairs, 0 unmatched, avg=0, fastest=0
export const scenario6_empty: EnhancedTransaction[] = [];

// Scenario 7: Stables-only swaps should be ignored (USDC→USDT, wSOL→USDC)
// All inputs and outputs are stables — no real token trades
// Expected: 0 pairs
export const scenario7_stablesOnly: EnhancedTransaction[] = [
  makeTx("swap1", 1000, [USDC], [USDT]),
  makeTx("swap2", 1100, [WSOL], [USDC]),
];

// Scenario 8: Mixed — some stable swaps + real token trades
// Stable swap at t=900 (ignore), BUY MintA at t=1000, SELL MintA at t=1005 (5s)
// Expected: 1 pair, holdSeconds=5
export const scenario8_mixedStablesAndReal: EnhancedTransaction[] = [
  makeTx("stableSwap", 900, [USDC], [USDT]),
  makeTx("buy1", 1000, [USDC], [MINT_A]),
  makeTx("sell1", 1005, [MINT_A], [USDC]),
];
