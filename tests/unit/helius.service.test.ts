import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
const EXPECTED_URL = `https://api-mainnet.helius-rpc.com/v0/addresses/${encodeURIComponent(WALLET)}/transactions?api-key=${encodeURIComponent("test-api-key")}&type=SWAP&limit=50`;

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

  // ── URL construction ──

  it("constructs the correct URL with type=SWAP&limit=50", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse([]));
    await fetchSwapHistory(WALLET);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]![0]).toBe(EXPECTED_URL);
  });

  it("embeds the wallet address in the URL path", async () => {
    const otherWallet = "11111111111111111111111111111111";
    fetchSpy.mockResolvedValueOnce(jsonResponse([]));
    await fetchSwapHistory(otherWallet);
    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain(`/addresses/${otherWallet}/`);
  });

  it("passes an AbortSignal for timeout", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse([]));
    await fetchSwapHistory(WALLET);
    const options = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  // ── Success responses ──

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

  it("preserves all transaction fields through parsing", async () => {
    const tx = makeMockTx({
      signature: "fullTx",
      timestamp: 1700000500,
      source: "JUPITER",
      fee: 10000,
    });
    fetchSpy.mockResolvedValueOnce(jsonResponse([tx]));

    const result = await fetchSwapHistory(WALLET);
    expect(result[0]).toEqual(tx);
  });

  // ── 429 retry behavior ──

  it("retries once on 429 then succeeds", async () => {
    const txs = [makeMockTx()];
    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(jsonResponse(txs));

    const result = await fetchSwapHistory(WALLET);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
  });

  it("retries twice on 429 then succeeds on third attempt", async () => {
    const txs = [makeMockTx()];
    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(jsonResponse(txs));

    const result = await fetchSwapHistory(WALLET);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(1);
  });

  it("throws after max retries (3x 429)", async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 429 }));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API rate limited: max retries exceeded"
    );
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  // ── HTTP error status codes ──

  it("throws on 400 without retrying", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 400 }));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API bad request: invalid wallet address or parameters"
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws on 401 without retrying", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API unauthorized: invalid API key"
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws on 403 without retrying", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 403 }));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API forbidden: access denied"
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws on unknown error status (500)", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(null, { status: 500, statusText: "Internal Server Error" })
    );

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API error: 500 Internal Server Error"
    );
  });

  it("throws on 502 Bad Gateway", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(null, { status: 502, statusText: "Bad Gateway" })
    );

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API error: 502 Bad Gateway"
    );
  });

  // ── Network / fetch errors ──

  it("throws on network error (TypeError)", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed"));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API network error: fetch failed"
    );
  });

  it("throws on non-Error rejection with descriptive message", async () => {
    fetchSpy.mockRejectedValueOnce("string error");

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API network error: string error"
    );
  });

  it("does not retry on network errors (only retries 429)", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("DNS failure"));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // ── Response validation ──

  it("throws when Helius returns a non-array response", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ error: "not an array" }));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API returned unexpected data"
    );
  });

  it("throws when Helius returns array with missing required fields", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse([{ signature: "sig1" }]));

    await expect(fetchSwapHistory(WALLET)).rejects.toThrow(
      "Helius API returned unexpected data"
    );
  });

  it("accepts transactions with extra fields (passthrough)", async () => {
    const tx = {
      ...makeMockTx(),
      extraField: "should not cause validation error",
    };
    fetchSpy.mockResolvedValueOnce(jsonResponse([tx]));

    const result = await fetchSwapHistory(WALLET);
    expect(result).toHaveLength(1);
  });
});
