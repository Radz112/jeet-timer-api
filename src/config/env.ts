import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  HELIUS_API_KEY: z.string().min(1, "HELIUS_API_KEY is required"),
  PAY_TO_ADDRESS: z.string().min(1, "PAY_TO_ADDRESS is required"),
  PORT: z
    .string()
    .default("3000")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
