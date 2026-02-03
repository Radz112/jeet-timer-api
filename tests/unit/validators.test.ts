import { describe, it, expect } from "vitest";
import {
  solanaAddressSchema,
  apix402JeetTimerSchema,
} from "../../src/utils/validators";

describe("solanaAddressSchema", () => {
  it("accepts a valid 44-char Solana address", () => {
    const result = solanaAddressSchema.safeParse(
      "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp"
    );
    expect(result.success).toBe(true);
  });

  it("accepts a 32-char address (minimum length)", () => {
    const result = solanaAddressSchema.safeParse(
      "11111111111111111111111111111111"
    );
    expect(result.success).toBe(true);
  });

  it("accepts a 44-char address (maximum length)", () => {
    // Token program ID is exactly 44 chars
    const result = solanaAddressSchema.safeParse(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    );
    expect(result.success).toBe(true);
  });

  it("rejects a 31-char address (one below minimum)", () => {
    const result = solanaAddressSchema.safeParse("1111111111111111111111111111111");
    expect(result.success).toBe(false);
  });

  it("rejects a 45-char address (one above maximum)", () => {
    const result = solanaAddressSchema.safeParse(
      "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3EgrpX"
    );
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(solanaAddressSchema.safeParse("").success).toBe(false);
  });

  it("rejects invalid base58 characters (0, O, I, l)", () => {
    expect(
      solanaAddressSchema.safeParse("0OIl1111111111111111111111111111").success
    ).toBe(false);
  });

  it("rejects a non-string value (number)", () => {
    expect(solanaAddressSchema.safeParse(12345).success).toBe(false);
  });

  it("rejects null", () => {
    expect(solanaAddressSchema.safeParse(null).success).toBe(false);
  });

  it("rejects undefined", () => {
    expect(solanaAddressSchema.safeParse(undefined).success).toBe(false);
  });

  it("rejects address with spaces", () => {
    expect(
      solanaAddressSchema.safeParse("DstRVJCPsgZH W6mFcasHPdemYvFVbdm3LFZNv").success
    ).toBe(false);
  });

  it("rejects address with special characters", () => {
    expect(
      solanaAddressSchema.safeParse("DstRVJCPsgZH+W6mFcasHPdemYvFVbdm3LFZ=v").success
    ).toBe(false);
  });
});

describe("apix402JeetTimerSchema", () => {
  it("accepts valid nested body and preserves wallet value", () => {
    const wallet = "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp";
    const result = apix402JeetTimerSchema.safeParse({
      body: { wallet },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.wallet).toBe(wallet);
    }
  });

  it("strips extra fields (Zod default passthrough)", () => {
    const result = apix402JeetTimerSchema.safeParse({
      body: { wallet: "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp", extra: "ignored" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects flat body (missing nested body key)", () => {
    expect(
      apix402JeetTimerSchema.safeParse({
        wallet: "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp",
      }).success
    ).toBe(false);
  });

  it("rejects nested body with missing wallet", () => {
    expect(apix402JeetTimerSchema.safeParse({ body: {} }).success).toBe(false);
  });

  it("rejects nested body with invalid wallet", () => {
    expect(
      apix402JeetTimerSchema.safeParse({ body: { wallet: "not-valid!" } }).success
    ).toBe(false);
  });

  it("rejects nested body with null wallet", () => {
    expect(
      apix402JeetTimerSchema.safeParse({ body: { wallet: null } }).success
    ).toBe(false);
  });

  it("rejects empty object", () => {
    expect(apix402JeetTimerSchema.safeParse({}).success).toBe(false);
  });

  it("rejects null input", () => {
    expect(apix402JeetTimerSchema.safeParse(null).success).toBe(false);
  });

  it("rejects string input", () => {
    expect(apix402JeetTimerSchema.safeParse("not an object").success).toBe(false);
  });

  it("rejects body as a string instead of object", () => {
    expect(apix402JeetTimerSchema.safeParse({ body: "string" }).success).toBe(false);
  });
});
