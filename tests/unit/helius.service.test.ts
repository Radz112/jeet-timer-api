import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock env before importing the service
vi.mock("../../src/config/env", () => ({
  env: {
    HELIUS_API_KEY: "test-api-key",
    CREATOR_WALLET_ADDRESS: "TestCreatorWallet",
    PAY_TO_ADDRESS: "TestPayTo",
    PORT: 3000,
  },
}));

import { fetchSwapHistory } from "../../src/services/helius.service";
import type { EnhancedTransaction } from "../../src/types";

const WALLET = "DstRVJCPsgZHLnW6mFcasHPdemYvFVbdm3LFZNv3Egrp";
const EXPECTED_URL = `https://api-mainnet.helius-rpc.com/v0/addresses/${WALLET}/transactions?api-key=test-api-key&type=SWAP&limit=50`;

function makeMockTx(overrides?: Partial<EnhancedTransaction>): EnhancedTransaction {
  return {
    signature: "sig123",
    timestamp: 1700000000,
    type: "SWAP",
    source: "RAYDIUM",
    fee: 5000,
    feePayer: WALLET,
    description: "swapped tokens",
    tokenTransfers: [],
    events: {},
    ...overrides,
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("helius.service — fetchSwapHistory", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("constructs the correct URL with type=SWAP&limit=50", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse([]));

    await fetchSwapHistory(WALLET);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0]![0];
    expect(calledUrl).toBe(EXPECTED_URL);
  });

  it("returns parsed transactions on success", async () => {
    const txs = [makeMockTx(), makeMockTx({ signature: "sig456" })];
    fetchSpy.mockResolvedValueOnce(jsonResponse(txs));

    const result = await fetchSwapHistory(WALLET);

    expect(result).toHaveLength(2);
    expect(result[0]!.signature).toBe("sig123");
    expect(result[1]!.signature).toBe("sig456");
  });

  it("returns empty array when no swaps found", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse([]));

    const result = await fetchSwapHistory(WALLET);

    expect(result).toEqual([]);
  });

  it("retries on 429 then succeeds", async () => {
    const txs = [makeMockTx()];
    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(jsonResponse(txs));

    const result = await fetchSwapHistory(WALLET);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
  });

  it("throws after max retries on repeated 429", async () => {
    fetchSpy
      .mockResolvedValue(new Response(null, { status: 429 }));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API rate limited: max retries exceeded"
    );

    // initial + 2 retries = 3 calls
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("throws on 400 bad request", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 400 }));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API bad request"
    );
  });

  it("throws on 401 unauthorized", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API unauthorized"
    );
  });

  it("throws on 403 forbidden", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 403 }));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API forbidden"
    );
  });

  it("throws on network error", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed"));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API network error: fetch failed"
    );
  });
});
