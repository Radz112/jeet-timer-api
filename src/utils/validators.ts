import { z } from "zod";

export const solanaAddressSchema = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana address: must be 32-44 base58 characters");

export const apix402JeetTimerSchema = z.object({
  body: z.object({
    wallet: solanaAddressSchema,
  }),
});
