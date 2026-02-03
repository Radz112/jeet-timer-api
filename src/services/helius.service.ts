import { env } from "../config/env";
import type { EnhancedTransaction } from "../types";

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 10000;

function buildUrl(wallet: string): string {
  return `https://api-mainnet.helius-rpc.com/v0/addresses/${wallet}/transactions?api-key=${env.HELIUS_API_KEY}&type=SWAP&limit=50`;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSwapHistory(
  wallet: string
): Promise<EnhancedTransaction[]> {
  const url = buildUrl(wallet);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Helius API request timed out after ${FETCH_TIMEOUT_MS}ms`);
      }
      throw new Error(
        `Helius API network error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (response.status === 429) {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error("Helius API rate limited: max retries exceeded");
    }

    if (response.status === 400) {
      throw new Error("Helius API bad request: invalid wallet address or parameters");
    }
    if (response.status === 401) {
      throw new Error("Helius API unauthorized: invalid API key");
    }
    if (response.status === 403) {
      throw new Error("Helius API forbidden: access denied");
    }

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as EnhancedTransaction[];
    return data;
  }

  // Unreachable, but satisfies TypeScript
  throw new Error("Helius API: unexpected retry loop exit");
}
