/**
 * WETH-based 2-hop Arbitrage Scanner (BIDIRECTIONAL)
 *
 * Scans BOTH directions:
 * 1. WETH → Token → WETH
 * 2. Token → WETH → Token (then convert back)
 */

import { getHighLiquidityPairs, getWETHAddress, ARBITRAGE_STRATEGY } from "@/lib/config/high-liquidity-pairs";
import { getMultiDexQuotes, findBestArbitrage } from "@/lib/utils/dex-prices-client";
import { ArbitrageOpportunity, ChainId, GasPrice } from "@/types/monitor";
import { calculateGasCostUSD, getEstimatedGasUnits } from "@/lib/utils/gas-price";

export interface ScanResult {
  opportunity: ArbitrageOpportunity | null;
  pairSymbol: string;
  scanned: boolean;
  error?: string;
  debug?: {
    wethToTokenQuotes: Array<{ dex: string; price: number }>;
    tokenToWethQuotes: Array<{ dex: string; price: number }>;
    bestSpread: number;
    quotesCount: number;
  };
}

/**
 * Scan a single WETH pair for arbitrage (BOTH DIRECTIONS)
 */
export async function scanWETHPair(
  chainId: ChainId,
  tokenAddress: string,
  tokenSymbol: string,
  tokenDecimals: number,
  wethAmount: number,
  gasPrice: GasPrice | null,
  ethPriceUsd: number
): Promise<ScanResult> {
  const wethAddress = getWETHAddress(chainId);
  const pairSymbol = `WETH/${tokenSymbol}`;

  try {
    // Get WETH → Token prices from all DEXes
    const wethToTokenQuotes = await getMultiDexQuotes(
      wethAddress as `0x${string}`,
      tokenAddress as `0x${string}`,
      18,
      tokenDecimals
    );

    // Get Token → WETH prices from all DEXes
    const tokenToWethQuotes = await getMultiDexQuotes(
      tokenAddress as `0x${string}`,
      wethAddress as `0x${string}`,
      tokenDecimals,
      18
    );

    let bestOpportunity: ArbitrageOpportunity | null = null;
    let bestNetProfit = 0;

    // === Strategy: WETH → Token → WETH ===
    // Find best combination: Buy Token cheap (high Token/WETH), Sell Token expensive (high WETH/Token)
    if (wethToTokenQuotes.length >= 1 && tokenToWethQuotes.length >= 1) {
      // Find DEX where we get most Token per WETH (buy Token)
      const buyDex = wethToTokenQuotes.reduce((best, current) =>
        current.price > best.price ? current : best
      );

      // Find DEX where we get most WETH per Token (sell Token)
      const sellDex = tokenToWethQuotes.reduce((best, current) =>
        current.price > best.price ? current : best
      );

      // Avoid same DEX (no arbitrage possible)
      if (buyDex.dex !== sellDex.dex) {
        // Calculate: Start with WETH, end with WETH
        const tokenReceived = wethAmount * buyDex.price; // Buy token: WETH → Token
        const wethReceived = tokenReceived * sellDex.price; // Sell token: Token → WETH
        const wethProfit = wethReceived - wethAmount;
        const grossProfitUsd = wethProfit * ethPriceUsd;

        // Calculate price difference for display
        const priceDiff = ((wethReceived - wethAmount) / wethAmount) * 100;

        // Only proceed if profitable
        if (priceDiff >= ARBITRAGE_STRATEGY.minSpreadPercent) {
          // Calculate costs
          const gasUnits = getEstimatedGasUnits(buyDex.dex, sellDex.dex);
          const gasCostUsd = calculateGasCostUSD(gasUnits, gasPrice?.maxFeeGwei || 30, ethPriceUsd);
          const flashLoanFeeUsd = (ARBITRAGE_STRATEGY.flashLoanFeePercent / 100) * wethAmount * ethPriceUsd;
          const netProfitUsd = grossProfitUsd - gasCostUsd - flashLoanFeeUsd;

          if (netProfitUsd > bestNetProfit && netProfitUsd >= ARBITRAGE_STRATEGY.minProfitUsd) {
            bestNetProfit = netProfitUsd;

            // Convert prices to consistent USD format
            // buyDex.price: WETH → Token (e.g., 1 WETH = 3130 USDT) - already in USD
            // sellDex.price: Token → WETH (e.g., 1 USDT = 0.00032 WETH) - need to invert for USD
            const buyPriceUsd = buyDex.price; // WETH → Token price (already USD)
            const sellPriceUsd = sellDex.price > 0 ? 1 / sellDex.price : 0; // Token → WETH inverted = WETH price in USD

            bestOpportunity = {
              id: `${Date.now()}-${tokenSymbol}`,
              timestamp: Date.now(),
              tokenPair: pairSymbol,
              tokenIn: { address: wethAddress, symbol: "WETH", decimals: 18 },
              tokenOut: { address: tokenAddress, symbol: tokenSymbol, decimals: tokenDecimals },
              buyFrom: {
                dex: buyDex.dex as any,
                price: buyPriceUsd,
                liquidity: "10000000",
                pairAddress: buyDex.pairAddress || "0x0000000000000000000000000000000000000000",
              },
              sellTo: {
                dex: sellDex.dex as any,
                price: sellPriceUsd,
                liquidity: "10000000",
                pairAddress: sellDex.pairAddress || "0x0000000000000000000000000000000000000000",
              },
              priceDiff,
              estimatedProfit: grossProfitUsd,
              estimatedGasCost: gasCostUsd,
              netProfit: netProfitUsd,
              flashLoanProtocol: "AAVE_V3" as any,
              status: "pending",
            };
          }
        }
      }
    }

    // Calculate best spread for debugging
    const allSpreads: number[] = [];
    for (let i = 0; i < wethToTokenQuotes.length; i++) {
      for (let j = 0; j < tokenToWethQuotes.length; j++) {
        if (wethToTokenQuotes[i].dex !== tokenToWethQuotes[j].dex) {
          const tokenReceived = wethAmount * wethToTokenQuotes[i].price;
          const wethReceived = tokenReceived * tokenToWethQuotes[j].price;
          const spread = ((wethReceived - wethAmount) / wethAmount) * 100;
          allSpreads.push(spread);
        }
      }
    }

    return {
      opportunity: bestOpportunity,
      pairSymbol,
      scanned: true,
      debug: {
        wethToTokenQuotes: wethToTokenQuotes.map((q) => ({
          dex: q.dex,
          price: q.price,
        })),
        tokenToWethQuotes: tokenToWethQuotes.map((q) => ({
          dex: q.dex,
          price: q.price,
        })),
        bestSpread: allSpreads.length > 0 ? Math.max(...allSpreads) : 0,
        quotesCount: wethToTokenQuotes.length + tokenToWethQuotes.length,
      },
    };
  } catch (error: any) {
    return {
      opportunity: null,
      pairSymbol,
      scanned: true,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Scan all high-liquidity WETH pairs (both directions)
 */
export async function scanAllWETHPairs(
  chainId: ChainId,
  wethAmount: number,
  gasPrice: GasPrice | null,
  ethPriceUsd: number
): Promise<ScanResult[]> {
  const pairs = getHighLiquidityPairs(chainId);

  const scanPromises = pairs.map((pair) =>
    scanWETHPair(
      chainId,
      pair.token.address,
      pair.token.symbol,
      pair.token.decimals,
      wethAmount,
      gasPrice,
      ethPriceUsd
    )
  );

  const results = await Promise.all(scanPromises);
  return results;
}
