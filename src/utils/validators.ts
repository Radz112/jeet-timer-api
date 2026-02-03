import { z } from "zod";

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const solanaAddressSchema = z
  .string()
  .regex(BASE58_REGEX, "Invalid Solana address: must be 32-44 base58 characters");

export const apix402JeetTimerSchema = z.object({
  body: z.object({
    wallet: solanaAddressSchema,
  }),
});

export type APIX402JeetTimerBody = z.infer<typeof apix402JeetTimerSchema>;
