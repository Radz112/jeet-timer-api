import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../../src/config/env", () => ({
  env: {
    HELIUS_API_KEY: "test-key",
    CREATOR_WALLET_ADDRESS: "CreatorWalletAddr11111111111111111",
    PAY_TO_ADDRESS: "PayToAddr111111111111111111111111111",
    PORT: 0,
  },
}));

// Import app after mocking env so it doesn't fail-fast on missing vars
import app from "../../src/index";

const BASE = "/api/v1/solana/jeet-timer";
const VALID_WALLET = "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp";

describe("GET /api/v1/solana/jeet-timer", () => {
  it("returns 200", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
  });

  it("returns JSON content-type", async () => {
    const res = await request(app).get(BASE);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("returns required metadata fields", async () => {
    const res = await request(app).get(BASE);
    expect(res.body.name).toBe("Jeet Timer");
    expect(res.body.version).toBe("1.0.0");
    expect(res.body.pricing).toBe("$0.01 per call");
    expect(res.body.pay_to_address).toBe("PayToAddr111111111111111111111111111");
    expect(res.body.endpoint).toBe("POST /api/v1/solana/jeet-timer");
  });

  it("returns request_schema with expected shape", async () => {
    const res = await request(app).get(BASE);
    expect(res.body.request_schema).toEqual({
      body: { wallet: "string (Solana base58 address)" },
    });
  });

  it("returns response_fields array", async () => {
    const res = await request(app).get(BASE);
    expect(Array.isArray(res.body.response_fields)).toBe(true);
    expect(res.body.response_fields).toContain("wallet");
    expect(res.body.response_fields).toContain("jeet_level");
    expect(res.body.response_fields).toContain("trade_pairs");
    expect(res.body.response_fields).toContain("creator_wallet");
  });
});

describe("POST /api/v1/solana/jeet-timer", () => {
  // ── Valid requests ──

  it("returns 200 with valid nested body", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });
    expect(res.status).toBe(200);
  });

  it("returns JSON content-type", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("returns status=success with data object", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });
    expect(res.body.status).toBe("success");
    expect(res.body.data).toBeDefined();
  });

  it("echoes back the wallet address", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });
    expect(res.body.data.wallet).toBe(VALID_WALLET);
  });

  it("includes creator_wallet from env", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });
    expect(res.body.data.creator_wallet).toBe("CreatorWalletAddr11111111111111111");
  });

  it("includes all expected response fields", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });
    const data = res.body.data;
    expect(data).toHaveProperty("wallet");
    expect(data).toHaveProperty("avg_hold_seconds");
    expect(data).toHaveProperty("avg_hold_time");
    expect(data).toHaveProperty("jeet_level");
    expect(data).toHaveProperty("fastest_jeet");
    expect(data).toHaveProperty("fastest_exit");
    expect(data).toHaveProperty("total_trades_analyzed");
    expect(data).toHaveProperty("unmatched_buys");
    expect(data).toHaveProperty("image_base64");
    expect(data).toHaveProperty("creator_wallet");
    expect(data).toHaveProperty("trade_pairs");
  });

  it("trade_pairs is an array", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });
    expect(Array.isArray(res.body.data.trade_pairs)).toBe(true);
  });

  // ── Invalid requests ──

  it("returns 400 for flat body (missing nested body key)", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ wallet: VALID_WALLET });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.message).toBe("Invalid request format");
  });

  it("returns 400 for missing wallet in nested body", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ body: {} });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.message).toBe("Invalid wallet address");
  });

  it("returns 400 for invalid wallet address", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: "not-a-valid-address!" } });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.message).toBe("Invalid wallet address");
  });

  it("returns 400 for empty body", async () => {
    const res = await request(app)
      .post(BASE)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.message).toBe("Invalid request format");
  });

  it("returns 400 with errors field on validation failure", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ body: {} });
    expect(res.body.errors).toBeDefined();
  });

  it("returns 400 for null wallet", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: null } });
    expect(res.status).toBe(400);
  });

  it("returns 400 for numeric wallet", async () => {
    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: 12345 } });
    expect(res.status).toBe(400);
  });
});
