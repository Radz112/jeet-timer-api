import { env } from "../config/env";
import type { EnhancedTransaction } from "../types";

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 10_000;

const ERROR_MESSAGES: Record<number, string> = {
  400: "Helius API bad request: invalid wallet address or parameters",
  401: "Helius API unauthorized: invalid API key",
  403: "Helius API forbidden: access denied",
};

export async function fetchSwapHistory(
  wallet: string
): Promise<EnhancedTransaction[]> {
  const url = `https://api-mainnet.helius-rpc.com/v0/addresses/${wallet}/transactions?api-key=${env.HELIUS_API_KEY}&type=SWAP&limit=50`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Helius API request timed out after ${FETCH_TIMEOUT_MS}ms`);
      }
      throw new Error(
        `Helius API network error: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) {
        throw new Error("Helius API rate limited: max retries exceeded");
      }
      await new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** attempt));
      continue;
    }

    const knownError = ERROR_MESSAGES[response.status];
    if (knownError) throw new Error(knownError);

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as EnhancedTransaction[];
  }

  throw new Error("Helius API rate limited: max retries exceeded");
}
