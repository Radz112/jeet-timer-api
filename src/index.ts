import express, { Request, Response, NextFunction } from "express";
import { env } from "./config/env";
import jeetTimerRoute from "./routes/jeet-timer.route";

const app = express();

app.use(express.json({ limit: "1kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1/solana/jeet-timer", jeetTimerRoute);

// Global error handler — always returns JSON
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
});

// Only start listening when this file is run directly, not when imported for tests
if (process.env["NODE_ENV"] !== "test") {
  app.listen(env.PORT, () => {
    console.log(`Jeet Timer API running on port ${env.PORT}`);
  });
}

export default app;
