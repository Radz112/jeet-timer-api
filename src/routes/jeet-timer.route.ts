import { Router, Request, Response } from "express";
import { apix402JeetTimerSchema } from "../utils/validators";
import { env } from "../config/env";
import { fetchSwapHistory } from "../services/helius.service";
import { analyzeHoldTimes } from "../services/history.service";
import { generateSpeedometer } from "../services/canvas.service";
import { getJeetLevel, formatHoldTime } from "../utils/jeet-levels";

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

router.post("/", async (req: Request, res: Response) => {
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

  try {
    const transactions = await fetchSwapHistory(wallet);
    const analysis = analyzeHoldTimes(transactions);
    const jeetLevel = getJeetLevel(analysis.avg_hold_seconds);
    const image = await generateSpeedometer(analysis, wallet);

    res.json({
      status: "success",
      data: {
        wallet,
        avg_hold_seconds: analysis.avg_hold_seconds,
        avg_hold_time: formatHoldTime(analysis.avg_hold_seconds),
        jeet_level: `${jeetLevel.emoji} ${jeetLevel.level}`,
        fastest_jeet: analysis.fastest_jeet,
        fastest_exit: formatHoldTime(analysis.fastest_jeet),
        total_trades_analyzed: analysis.total_trades_analyzed,
        unmatched_buys: analysis.unmatched_buys,
        image_base64: image,
        creator_wallet: env.PAY_TO_ADDRESS,
        trade_pairs: analysis.trade_pairs,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Jeet Timer error for ${wallet}:`, message);
    res.status(502).json({
      status: "error",
      message: `Failed to analyze wallet: ${message}`,
    });
  }
});

export default router;
