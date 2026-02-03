import type { EnhancedTransaction, JeetAnalysis, TradePair } from "../types";

const STABLES = new Set([
  "So11111111111111111111111111111111111111112",   // wSOL
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",  // USDT
]);

interface MintEvent {
  type: "BUY" | "SELL";
  timestamp: number;
  signature: string;
}

export function analyzeHoldTimes(
  transactions: EnhancedTransaction[]
): JeetAnalysis {
  const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

  // Group buy/sell events by mint in a single pass
  const byMint = new Map<string, MintEvent[]>();

  for (const tx of sorted) {
    const swap = tx.events?.swap;
    if (!swap) continue;

    for (const output of swap.tokenOutputs) {
      if (!STABLES.has(output.mint)) {
        const list = byMint.get(output.mint) ?? [];
        list.push({ type: "BUY", timestamp: tx.timestamp, signature: tx.signature });
        byMint.set(output.mint, list);
      }
    }

    for (const input of swap.tokenInputs) {
      if (!STABLES.has(input.mint)) {
        const list = byMint.get(input.mint) ?? [];
        list.push({ type: "SELL", timestamp: tx.timestamp, signature: tx.signature });
        byMint.set(input.mint, list);
      }
    }
  }

  // FIFO pair matching per mint
  const tradePairs: TradePair[] = [];
  let unmatchedBuys = 0;

  for (const [mint, events] of byMint) {
    const buys = events.filter((e) => e.type === "BUY");
    const sells = events.filter((e) => e.type === "SELL");

    let sellIdx = 0;
    for (const buy of buys) {
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

  const total = tradePairs.length;
  const avgHold = total > 0
    ? tradePairs.reduce((sum, p) => sum + p.holdSeconds, 0) / total
    : 0;
  const fastest = total > 0
    ? Math.min(...tradePairs.map((p) => p.holdSeconds))
    : 0;

  return {
    trade_pairs: tradePairs,
    avg_hold_seconds: avgHold,
    fastest_jeet: fastest,
    total_trades_analyzed: total,
    unmatched_buys: unmatchedBuys,
  };
}
