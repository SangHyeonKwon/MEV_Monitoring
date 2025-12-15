/**
 * Client-side wrapper for DEX price fetching
 * Calls server-side API to avoid CORS issues
 */

import { Address } from "viem";
import { DexProtocol } from "@/types/monitor";

export interface DexQuote {
  dex: DexProtocol | string;
  price: number;
  source: string;
  pairAddress?: string;
}

/**
 * Get quotes from multiple DEXes via server-side API
 */
export async function getMultiDexQuotes(
  token0: Address,
  token1: Address,
  token0Decimals: number,
  token1Decimals: number
): Promise<DexQuote[]> {
  try {
    const response = await fetch("/api/prices/multi-dex", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token0,
        token1,
        decimals0: token0Decimals,
        decimals1: token1Decimals,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.quotes || [];
  } catch (error) {
    console.error("Failed to fetch multi-dex quotes:", error);
    return [];
  }
}

/**
 * Find best arbitrage opportunity from multiple quotes
 */
export function findBestArbitrage(quotes: DexQuote[]): {
  buyFrom: DexQuote;
  sellTo: DexQuote;
  priceDiff: number;
} | null {
  if (quotes.length < 2) {
    return null;
  }

  let bestSpread = 0;
  let bestBuy: DexQuote | null = null;
  let bestSell: DexQuote | null = null;

  for (let i = 0; i < quotes.length; i++) {
    for (let j = 0; j < quotes.length; j++) {
      if (i === j) continue;

      const buyPrice = quotes[i].price;
      const sellPrice = quotes[j].price;
      const spread = ((sellPrice - buyPrice) / buyPrice) * 100;

      if (spread > bestSpread && spread <= 50) {
        bestSpread = spread;
        bestBuy = quotes[i];
        bestSell = quotes[j];
      }
    }
  }

  if (!bestBuy || !bestSell || bestSpread < 0.1) {
    return null;
  }

  return {
    buyFrom: bestBuy,
    sellTo: bestSell,
    priceDiff: bestSpread,
  };
}
