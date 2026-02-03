import type { EnhancedTransaction, JeetAnalysis, TradePair } from "../types";

const STABLES = new Set([
  "So11111111111111111111111111111111111111112",   // wSOL
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",  // USDT
]);

interface MintEvent {
  mint: string;
  type: "BUY" | "SELL";
  timestamp: number;
  signature: string;
}

export function analyzeHoldTimes(
  transactions: EnhancedTransaction[]
): JeetAnalysis {
  // Sort ascending by timestamp
  const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

  // Extract buy/sell events per mint
  const events: MintEvent[] = [];

  for (const tx of sorted) {
    const swap = tx.events?.swap;
    if (!swap) continue;

    // tokenOutputs = tokens the user RECEIVED → BUY signals
    for (const output of swap.tokenOutputs) {
      if (!STABLES.has(output.mint)) {
        events.push({
          mint: output.mint,
          type: "BUY",
          timestamp: tx.timestamp,
          signature: tx.signature,
        });
      }
    }

    // tokenInputs = tokens the user SENT → SELL signals
    for (const input of swap.tokenInputs) {
      if (!STABLES.has(input.mint)) {
        events.push({
          mint: input.mint,
          type: "SELL",
          timestamp: tx.timestamp,
          signature: tx.signature,
        });
      }
    }
  }

  // Group by mint
  const byMint = new Map<string, MintEvent[]>();
  for (const evt of events) {
    const list = byMint.get(evt.mint) || [];
    list.push(evt);
    byMint.set(evt.mint, list);
  }

  // FIFO pair matching per mint
  const tradePairs: TradePair[] = [];
  let unmatchedBuys = 0;

  for (const [mint, mintEvents] of byMint) {
    const buys = mintEvents.filter((e) => e.type === "BUY");
    const sells = mintEvents.filter((e) => e.type === "SELL");

    let sellIdx = 0;
    for (const buy of buys) {
      // Find the next sell that occurs at or after the buy
      while (sellIdx < sells.length && sells[sellIdx]!.timestamp < buy.timestamp) {
        sellIdx++;
      }
      if (sellIdx < sells.length) {
        const sell = sells[sellIdx]!;
        tradePairs.push({
          mint,
          buyTimestamp: buy.timestamp,
          sellTimestamp: sell.timestamp,
          holdSeconds: sell.timestamp - buy.timestamp,
          buySignature: buy.signature,
          sellSignature: sell.signature,
        });
        sellIdx++;
      } else {
        unmatchedBuys++;
      }
    }
  }

  const totalPairs = tradePairs.length;

  if (totalPairs === 0) {
    return {
      trade_pairs: [],
      avg_hold_seconds: 0,
      fastest_jeet: 0,
      total_trades_analyzed: 0,
      unmatched_buys: unmatchedBuys,
    };
  }

  const avgHoldSeconds =
    tradePairs.reduce((sum, p) => sum + p.holdSeconds, 0) / totalPairs;
  const fastestJeet = Math.min(...tradePairs.map((p) => p.holdSeconds));

  return {
    trade_pairs: tradePairs,
    avg_hold_seconds: avgHoldSeconds,
    fastest_jeet: fastestJeet,
    total_trades_analyzed: totalPairs,
    unmatched_buys: unmatchedBuys,
  };
}
