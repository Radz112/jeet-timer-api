import express, { Request, Response, NextFunction } from "express";
import { env } from "./config/env";
import jeetTimerRoute from "./routes/jeet-timer.route";

const app = express();

app.use(express.json());

app.use("/api/v1/solana/jeet-timer", jeetTimerRoute);

// Global error handler — always returns JSON
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
});

app.listen(env.PORT, () => {
  console.log(`Jeet Timer API running on port ${env.PORT}`);
});

export default app;
