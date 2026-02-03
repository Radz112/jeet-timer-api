export interface TradePair {
  mint: string;
  buyTimestamp: number;
  sellTimestamp: number;
  holdSeconds: number;
  buySignature: string;
  sellSignature: string;
}

export interface JeetAnalysis {
  trade_pairs: TradePair[];
  avg_hold_seconds: number;
  fastest_jeet: number;
  total_trades_analyzed: number;
  unmatched_buys: number;
}

// ── Helius Enhanced Transaction API types ──

export interface TokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

export interface InnerSwap {
  tokenInputs: TokenTransfer[];
  tokenOutputs: TokenTransfer[];
  programInfo: {
    source: string;
    account: string;
    programName: string;
    instructionName: string;
  };
}

export interface SwapEvent {
  nativeInput?: { account: string; amount: string };
  nativeOutput?: { account: string; amount: string };
  tokenInputs: { userAccount: string; tokenAccount: string; mint: string; rawTokenAmount: { tokenAmount: string; decimals: number } }[];
  tokenOutputs: { userAccount: string; tokenAccount: string; mint: string; rawTokenAmount: { tokenAmount: string; decimals: number } }[];
  tokenFees: unknown[];
  nativeFees: unknown[];
  innerSwaps: InnerSwap[];
}

export interface EnhancedTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  description: string;
  tokenTransfers: TokenTransfer[];
  events: {
    swap?: SwapEvent;
    [key: string]: unknown;
  };
}
