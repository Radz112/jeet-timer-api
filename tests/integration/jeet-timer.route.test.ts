import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import type { EnhancedTransaction } from "../../src/types";

vi.mock("../../src/config/env", () => ({
  env: {
    HELIUS_API_KEY: "test-key",
    CREATOR_WALLET_ADDRESS: "CreatorWalletAddr11111111111111111",
    PAY_TO_ADDRESS: "PayToAddr111111111111111111111111111",
    PORT: 0,
  },
}));

import app from "../../src/index";

const BASE = "/api/v1/solana/jeet-timer";
const VALID_WALLET = "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp";
const MINT_A = "MintAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function makeTx(
  signature: string,
  timestamp: number,
  tokenInputMints: string[],
  tokenOutputMints: string[]
): EnhancedTransaction {
  return {
    signature,
    timestamp,
    type: "SWAP",
    source: "RAYDIUM",
    fee: 5000,
    feePayer: VALID_WALLET,
    description: "swapped tokens",
    tokenTransfers: [],
    events: {
      swap: {
        tokenInputs: tokenInputMints.map((mint) => ({
          userAccount: VALID_WALLET,
          tokenAccount: "acct",
          mint,
          rawTokenAmount: { tokenAmount: "1000000", decimals: 6 },
        })),
        tokenOutputs: tokenOutputMints.map((mint) => ({
          userAccount: VALID_WALLET,
          tokenAccount: "acct",
          mint,
          rawTokenAmount: { tokenAmount: "1000000", decimals: 6 },
        })),
        tokenFees: [],
        nativeFees: [],
        innerSwaps: [],
      },
    },
  };
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ── GET tests (no external deps) ──

describe("GET /api/v1/solana/jeet-timer", () => {
  it("returns 200 with JSON content-type", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("returns required APIX402 metadata fields", async () => {
    const res = await request(app).get(BASE);
    expect(res.body.name).toBe("Jeet Timer");
    expect(res.body.version).toBe("1.0.0");
    expect(res.body.pricing).toBe("$0.01 per call");
    expect(res.body.pay_to_address).toBe("PayToAddr111111111111111111111111111");
    expect(res.body.endpoint).toBe("POST /api/v1/solana/jeet-timer");
    expect(res.body.request_schema).toEqual({
      body: { wallet: "string (Solana base58 address)" },
    });
    expect(res.body.response_fields).toContain("wallet");
    expect(res.body.response_fields).toContain("trade_pairs");
  });
});

// ── POST validation tests (no external deps) ──

describe("POST /api/v1/solana/jeet-timer — validation", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for flat body — does NOT call Helius", async () => {
    const res = await request(app).post(BASE).send({ wallet: VALID_WALLET });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid request format");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for missing wallet — does NOT call Helius", async () => {
    const res = await request(app).post(BASE).send({ body: {} });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid wallet address");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid wallet address", async () => {
    const res = await request(app).post(BASE).send({ body: { wallet: "bad!" } });
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for empty body", async () => {
    const res = await request(app).post(BASE).send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 with errors field on validation failure", async () => {
    const res = await request(app).post(BASE).send({ body: {} });
    expect(res.body.errors).toBeDefined();
  });

  it("returns 400 for null wallet", async () => {
    const res = await request(app).post(BASE).send({ body: { wallet: null } });
    expect(res.status).toBe(400);
  });
});

// ── POST end-to-end with mocked Helius fetch ──

describe("POST /api/v1/solana/jeet-timer — full pipeline", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls Helius, analyzes trades, generates image — returns real computed data", async () => {
    // BUY MintA at t=1000, SELL MintA at t=1030 → holdSeconds=30
    const txs: EnhancedTransaction[] = [
      makeTx("buy1", 1000, [USDC], [MINT_A]),
      makeTx("sell1", 1030, [MINT_A], [USDC]),
    ];
    fetchSpy.mockResolvedValueOnce(jsonResponse(txs));

    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");

    const data = res.body.data;

    // Verify wallet echo
    expect(data.wallet).toBe(VALID_WALLET);

    // Verify computed analysis — NOT hardcoded
    expect(data.avg_hold_seconds).toBe(30);
    expect(data.avg_hold_time).toBe("30 seconds");
    expect(data.fastest_jeet).toBe(30);
    expect(data.fastest_exit).toBe("30 seconds");
    expect(data.total_trades_analyzed).toBe(1);
    expect(data.unmatched_buys).toBe(0);

    // Verify jeet level is computed from 30s avg
    expect(data.jeet_level).toContain("Grandmaster Jeet");

    // Verify image is real PNG base64, not empty string
    expect(data.image_base64).toMatch(/^data:image\/png;base64,.+/);
    const buf = Buffer.from(
      data.image_base64.replace("data:image/png;base64,", ""),
      "base64"
    );
    expect(buf[0]).toBe(0x89); // PNG magic byte

    // Verify creator_wallet from env
    expect(data.creator_wallet).toBe("CreatorWalletAddr11111111111111111");

    // Verify trade_pairs come from real analysis
    expect(data.trade_pairs).toHaveLength(1);
    expect(data.trade_pairs[0].holdSeconds).toBe(30);
    expect(data.trade_pairs[0].buySignature).toBe("buy1");
    expect(data.trade_pairs[0].sellSignature).toBe("sell1");
    expect(data.trade_pairs[0].mint).toBe(MINT_A);
  });

  it("returns correct data for wallet with no swaps", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse([]));

    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.avg_hold_seconds).toBe(0);
    expect(data.total_trades_analyzed).toBe(0);
    expect(data.trade_pairs).toHaveLength(0);
    expect(data.jeet_level).toContain("Atomic Jeet");
    expect(data.image_base64).toMatch(/^data:image\/png;base64,.+/);
  });

  it("returns correct data for multiple trades with different hold times", async () => {
    const txs: EnhancedTransaction[] = [
      makeTx("buy1", 1000, [USDC], [MINT_A]),
      makeTx("sell1", 1010, [MINT_A], [USDC]), // 10s
      makeTx("buy2", 2000, [USDC], [MINT_A]),
      makeTx("sell2", 2050, [MINT_A], [USDC]), // 50s
    ];
    fetchSpy.mockResolvedValueOnce(jsonResponse(txs));

    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });

    const data = res.body.data;
    expect(data.avg_hold_seconds).toBe(30); // (10+50)/2
    expect(data.fastest_jeet).toBe(10);
    expect(data.fastest_exit).toBe("10 seconds");
    expect(data.total_trades_analyzed).toBe(2);
    expect(data.trade_pairs).toHaveLength(2);
  });

  it("returns 502 when Helius API fails", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 401 }));

    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });

    expect(res.status).toBe(502);
    expect(res.body.status).toBe("error");
    expect(res.body.message).toContain("Helius API unauthorized");
  });

  it("returns 502 when Helius network fails", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed"));

    const res = await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });

    expect(res.status).toBe(502);
    expect(res.body.message).toContain("network error");
  });

  it("calls Helius with correct wallet in URL", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse([]));

    await request(app)
      .post(BASE)
      .send({ body: { wallet: VALID_WALLET } });

    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain(`/addresses/${VALID_WALLET}/`);
    expect(calledUrl).toContain("type=SWAP");
    expect(calledUrl).toContain("limit=50");
  });
});
