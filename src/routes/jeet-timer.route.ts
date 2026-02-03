import { Router, Request, Response } from "express";
import { apix402JeetTimerSchema } from "../utils/validators";
import { env } from "../config/env";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Jeet Timer",
    description:
      "Analyzes a Solana wallet's trade history to determine how quickly they sell (jeet) their tokens. Returns hold-time stats, jeet classification, and a speedometer image.",
    version: "1.0.0",
    pricing: "$0.01 per call",
    pay_to_address: env.PAY_TO_ADDRESS,
    endpoint: "POST /api/v1/solana/jeet-timer",
    request_schema: {
      body: {
        wallet: "string (Solana base58 address)",
      },
    },
    response_fields: [
      "wallet",
      "avg_hold_seconds",
      "avg_hold_time",
      "jeet_level",
      "fastest_jeet",
      "fastest_exit",
      "total_trades_analyzed",
      "unmatched_buys",
      "image_base64",
      "creator_wallet",
      "trade_pairs",
    ],
  });
});

router.post("/", (req: Request, res: Response) => {
  const parsed = apix402JeetTimerSchema.safeParse(req.body);

  if (!parsed.success) {
    const hasBody =
      req.body && typeof req.body === "object" && "body" in req.body;
    res.status(400).json({
      status: "error",
      message: hasBody ? "Invalid wallet address" : "Invalid request format",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { wallet } = parsed.data.body;

  // Stub mock response — will be replaced in Phase 2+
  res.json({
    status: "success",
    data: {
      wallet,
      avg_hold_seconds: 260,
      avg_hold_time: "4m 20s",
      jeet_level: "Speed Jeet",
      fastest_jeet: 12,
      fastest_exit: "12s",
      total_trades_analyzed: 1,
      unmatched_buys: 0,
      image_base64: "",
      creator_wallet: env.CREATOR_WALLET_ADDRESS,
      trade_pairs: [
        {
          mint: "So11111111111111111111111111111111111111112",
          buyTimestamp: 1700000000,
          sellTimestamp: 1700000260,
          holdSeconds: 260,
          buySignature: "mock_buy_sig",
          sellSignature: "mock_sell_sig",
        },
      ],
    },
  });
});

export default router;
