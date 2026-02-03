import { describe, it, expect } from "vitest";
import {
  solanaAddressSchema,
  apix402JeetTimerSchema,
} from "../../src/utils/validators";

describe("solanaAddressSchema", () => {
  it("accepts a valid Solana address", () => {
    const result = solanaAddressSchema.safeParse(
      "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp"
    );
    expect(result.success).toBe(true);
  });

  it("accepts another valid address (system program)", () => {
    const result = solanaAddressSchema.safeParse(
      "11111111111111111111111111111111"
    );
    expect(result.success).toBe(true);
  });

  it("rejects an empty string", () => {
    const result = solanaAddressSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects an address that is too short", () => {
    const result = solanaAddressSchema.safeParse("abc123");
    expect(result.success).toBe(false);
  });

  it("rejects an address with invalid base58 characters (0, O, I, l)", () => {
    const result = solanaAddressSchema.safeParse(
      "0OIl1111111111111111111111111111"
    );
    expect(result.success).toBe(false);
  });

  it("rejects a non-string value", () => {
    const result = solanaAddressSchema.safeParse(12345);
    expect(result.success).toBe(false);
  });
});

describe("apix402JeetTimerSchema", () => {
  it("accepts valid nested APIX402 body", () => {
    const result = apix402JeetTimerSchema.safeParse({
      body: { wallet: "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.wallet).toBe(
        "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp"
      );
    }
  });

  it("rejects flat body (missing nested body key)", () => {
    const result = apix402JeetTimerSchema.safeParse({
      wallet: "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp",
    });
    expect(result.success).toBe(false);
  });

  it("rejects nested body with missing wallet", () => {
    const result = apix402JeetTimerSchema.safeParse({
      body: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects nested body with invalid wallet", () => {
    const result = apix402JeetTimerSchema.safeParse({
      body: { wallet: "not-a-valid-address!" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = apix402JeetTimerSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
