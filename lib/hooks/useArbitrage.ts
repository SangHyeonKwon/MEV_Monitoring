"use client";

import { useState, useEffect, useCallback } from "react";
import { ArbitrageState, ArbitrageSettings, ArbitrageOpportunity, ScanLog, LogLevel, ChainId } from "@/types/monitor";
import { DEFAULT_ARBITRAGE_CONFIG, DEFAULT_ARBITRAGE_SETTINGS, NETWORKS, getDefaultWatchedTokens } from "@/lib/config";
import { getCurrentGasPrice } from "@/lib/utils/gas-price";
import { getEthPriceCached } from "@/lib/utils/eth-price";
import { scanAllWETHPairs } from "@/lib/utils/weth-arbitrage-scanner";

/**
 * 차익거래 상태 관리 훅
 */
export function useArbitrage() {
  const [state, setState] = useState<ArbitrageState>({
    isScanning: false,
    chainId: 1, // Default to Mainnet
    lastUpdate: Date.now(),
    opportunities: [],
    scanResults: [],
    config: DEFAULT_ARBITRAGE_CONFIG,
    settings: {
      ...DEFAULT_ARBITRAGE_SETTINGS,
      watchedTokens: getDefaultWatchedTokens(1), // Use Mainnet tokens
    },
    logs: [],
    gasPrice: null,
    ethPrice: null,
    stats: {
      totalScanned: 0,
      opportunitiesFound: 0,
      totalProfit: 0,
    },
  });

  const addLog = useCallback((level: LogLevel, message: string) => {
    const log: ScanLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      level,
      message,
    };
    setState((prev) => ({
      ...prev,
      logs: [log, ...prev.logs].slice(0, 100), // Keep last 100 logs
    }));
  }, []);

  const startScanning = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isScanning: true,
      lastUpdate: Date.now(),
    }));
    addLog("info", "Scanner started");

    // Fetch initial gas price
    try {
      const gasData = await getCurrentGasPrice();
      setState((prev) => ({
        ...prev,
        gasPrice: {
          baseFeeGwei: gasData.baseFeeGwei,
          priorityFeeGwei: gasData.priorityFeeGwei,
          maxFeeGwei: gasData.maxFeeGwei,
          timestamp: gasData.timestamp,
        },
      }));
      addLog("info", `Current gas: ${gasData.maxFeeGwei.toFixed(1)} Gwei (base: ${gasData.baseFeeGwei.toFixed(1)} + priority: ${gasData.priorityFeeGwei.toFixed(1)})`);
    } catch (error) {
      addLog("error", `Failed to fetch gas price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Fetch initial ETH price
    try {
      const ethPrice = await getEthPriceCached(state.chainId);
      setState((prev) => ({
        ...prev,
        ethPrice,
      }));
      addLog("info", `ETH price: $${ethPrice.toFixed(2)} (Chainlink)`);
    } catch (error) {
      addLog("error", `Failed to fetch ETH price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [addLog, state.chainId]);

  const stopScanning = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isScanning: false,
    }));
    addLog("warning", "Scanner stopped");
  }, [addLog]);

  const updateSettings = useCallback((settings: ArbitrageSettings) => {
    setState((prev) => ({
      ...prev,
      settings,
    }));
  }, []);

  const setChainId = useCallback((chainId: ChainId) => {
    if (state.isScanning) {
      addLog("warning", "Please stop scanning before changing network");
      return;
    }
    setState((prev) => ({
      ...prev,
      chainId,
      opportunities: [], // Clear opportunities when switching networks
      scanResults: [], // Clear scan results when switching networks
      gasPrice: null,
      ethPrice: null,
      settings: {
        ...prev.settings,
        watchedTokens: getDefaultWatchedTokens(chainId), // Update tokens for new network
      },
    }));
    const networkName = chainId === 1 ? "Ethereum Mainnet" : "Sepolia Testnet";
    addLog("info", `Switched to ${networkName}`);
  }, [state.isScanning, addLog]);

  const addOpportunity = useCallback((opportunity: ArbitrageOpportunity) => {
    setState((prev) => ({
      ...prev,
      opportunities: [opportunity, ...prev.opportunities].slice(0, 50), // 최근 50개만 유지
      lastUpdate: Date.now(),
      stats: {
        ...prev.stats,
        opportunitiesFound: prev.stats.opportunitiesFound + 1,
      },
    }));
    addLog("success", `Found opportunity: ${opportunity.tokenPair} (+${opportunity.priceDiff.toFixed(2)}%)`);
  }, [addLog]);

  const clearOpportunities = useCallback(() => {
    setState((prev) => ({
      ...prev,
      opportunities: [],
    }));
    addLog("info", "Cleared all opportunities");
  }, [addLog]);

  const executeArbitrage = useCallback(async (opportunityId: string) => {
    const opportunity = state.opportunities.find(o => o.id === opportunityId);
    if (!opportunity) return;

    addLog("info", `Executing arbitrage for ${opportunity.tokenPair}...`);

    // Set status to executing
    setState((prev) => ({
      ...prev,
      opportunities: prev.opportunities.map((opp) =>
        opp.id === opportunityId ? { ...opp, status: "executing" as const } : opp
      ),
    }));

    // TODO: 실제 차익거래 실행 로직 구현 필요
    // 현재는 시뮬레이션: 2-5초 후 70% 성공, 30% 실패
    const executionTime = 2000 + Math.random() * 3000; // 2-5 seconds
    const willSucceed = Math.random() > 0.3; // 70% success rate

    setTimeout(() => {
      if (willSucceed) {
        setState((prev) => ({
          ...prev,
          opportunities: prev.opportunities.map((opp) =>
            opp.id === opportunityId ? { ...opp, status: "success" as const } : opp
          ),
          stats: {
            ...prev.stats,
            totalProfit: prev.stats.totalProfit + (prev.opportunities.find(o => o.id === opportunityId)?.netProfit || 0),
          },
        }));
        addLog("success", `✅ Executed successfully! Profit: $${opportunity.netProfit.toFixed(2)}`);
      } else {
        const failReasons = [
          "Insufficient liquidity",
          "Price slippage too high",
          "Transaction reverted",
          "Gas price spike",
          "Opportunity expired"
        ];
        const reason = failReasons[Math.floor(Math.random() * failReasons.length)];

        setState((prev) => ({
          ...prev,
          opportunities: prev.opportunities.map((opp) =>
            opp.id === opportunityId ? { ...opp, status: "failed" as const } : opp
          ),
        }));
        addLog("error", `❌ Execution failed: ${reason}`);
      }
    }, executionTime);
  }, [state.opportunities, addLog]);

  // 스캐닝 루프 - Real price fetching
  useEffect(() => {
    if (!state.isScanning) return;

    let scanCount = 0;

    const scanForOpportunities = async () => {
      setState((prev) => ({
        ...prev,
        lastUpdate: Date.now(),
        stats: {
          ...prev.stats,
          totalScanned: prev.stats.totalScanned + 1,
        },
      }));

      scanCount++;

      try {
        addLog("info", `🔍 Scanning high-liquidity WETH pairs...`);

        // Get ETH price from Chainlink
        let ethPriceUsd = 3500; // Fallback
        try {
          ethPriceUsd = await getEthPriceCached(state.chainId);
        } catch (error) {
          addLog("warning", "Failed to fetch ETH price, using fallback $3500");
        }

        // Scan all high-liquidity WETH pairs (WETH/USDC, WETH/USDT, etc.)
        const results = await scanAllWETHPairs(
          state.chainId,
          state.settings.tradeAmount, // WETH amount (e.g., 1 ETH)
          state.gasPrice,
          ethPriceUsd
        );

        // Store all scan results with fresh array reference
        setState((prev) => ({
          ...prev,
          scanResults: [...results], // Create new array to trigger re-render
          lastUpdate: Date.now(), // Force update
        }));

        // Count scanned pairs
        const scannedCount = results.filter((r) => r.scanned).length;

        // Log the latest pair being displayed
        if (results.length > 0) {
          const latestResult = results[results.length - 1];
          const latestPrice = latestResult.debug?.wethToTokenQuotes[0]?.price || 0;
          addLog("info", `📊 Scanned ${scannedCount} pairs | Latest: ${latestResult.pairSymbol} @ $${latestPrice.toFixed(2)}`);
        } else {
          addLog("info", `📊 Scanned ${scannedCount} WETH pairs (${results.length} total results)`);
        }

        // Process results
        let foundCount = 0;
        for (const result of results) {
          // Log debug info for each pair
          if (result.debug) {
            const d = result.debug;
            addLog(
              "info",
              `🔍 ${result.pairSymbol}: Found ${d.quotesCount} quotes (${d.wethToTokenQuotes.length} WETH→Token, ${d.tokenToWethQuotes.length} Token→WETH) | Best spread: ${d.bestSpread.toFixed(4)}%`
            );

            // Log individual DEX prices
            if (d.wethToTokenQuotes.length > 0) {
              const prices = d.wethToTokenQuotes
                .map((q) => `${q.dex}: $${q.price.toFixed(2)}`)
                .join(", ");
              addLog("info", `  Buy (WETH→Token): ${prices}`);
            }
            if (d.tokenToWethQuotes.length > 0) {
              const prices = d.tokenToWethQuotes
                .map((q) => `${q.dex}: $${(1 / q.price).toFixed(2)}`) // Invert to USD
                .join(", ");
              addLog("info", `  Sell (Token→WETH): ${prices}`);
            }
          }

          if (result.opportunity) {
            addOpportunity(result.opportunity);
            foundCount++;

            const opp = result.opportunity;
            addLog(
              "success",
              `✅ ${result.pairSymbol}: ${opp.buyFrom.dex.toUpperCase()} ($${opp.buyFrom.price.toFixed(4)}) → ${opp.sellTo.dex.toUpperCase()} ($${opp.sellTo.price.toFixed(4)}) | Net: $${opp.netProfit.toFixed(2)}`
            );

            // Detailed verification log
            addLog(
              "info",
              `📊 Details: Gross: $${opp.estimatedProfit.toFixed(2)} - Gas: $${opp.estimatedGasCost.toFixed(2)} - FL Fee: $${(1 * ethPriceUsd * 0.0005).toFixed(2)} = Net: $${opp.netProfit.toFixed(2)}`
            );

            addLog(
              "info",
              `🔗 Verify: Buy @ ${opp.buyFrom.dex} pair ${opp.buyFrom.pairAddress.slice(0, 10)}... | Sell @ ${opp.sellTo.dex} pair ${opp.sellTo.pairAddress.slice(0, 10)}...`
            );
          } else if (result.error) {
            addLog("error", `❌ ${result.pairSymbol}: ${result.error}`);
          }
        }

        if (foundCount === 0) {
          addLog("info", `No profitable opportunities (min profit: $${state.settings.minProfitUsd})`);
        } else {
          addLog("warning", `🔥 Found ${foundCount} profitable opportunities!`);
        }
      } catch (error) {
        addLog("error", `Scan error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Update gas price every 3 scans (~15 seconds with 5s interval)
      if (scanCount % 3 === 0) {
        // Update gas price
        try {
          const gasData = await getCurrentGasPrice();
          setState((prev) => ({
            ...prev,
            gasPrice: {
              baseFeeGwei: gasData.baseFeeGwei,
              priorityFeeGwei: gasData.priorityFeeGwei,
              maxFeeGwei: gasData.maxFeeGwei,
              timestamp: gasData.timestamp,
            },
          }));

          if (gasData.maxFeeGwei > state.settings.maxGasPrice) {
            addLog("warning", `⛽ Gas ${gasData.maxFeeGwei.toFixed(1)} Gwei exceeds max ${state.settings.maxGasPrice} Gwei`);
          } else {
            addLog("info", `⛽ Gas: ${gasData.maxFeeGwei.toFixed(1)} Gwei`);
          }
        } catch (error) {
          addLog("error", `Failed to update gas price: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Update ETH price
        try {
          const ethPrice = await getEthPriceCached(state.chainId);
          setState((prev) => ({
            ...prev,
            ethPrice,
          }));
          addLog("info", `💎 ETH: $${ethPrice.toFixed(2)}`);
        } catch (error) {
          addLog("error", `Failed to update ETH price: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };

    const interval = setInterval(() => {
      scanForOpportunities();
    }, state.config.refreshInterval);

    return () => clearInterval(interval);
  }, [state.isScanning, state.config.refreshInterval, state.chainId, state.settings.tradeAmount, state.settings.watchedTokens, state.settings.maxGasPrice, state.gasPrice, addLog, addOpportunity]);

  return {
    state,
    startScanning,
    stopScanning,
    updateSettings,
    setChainId,
    addOpportunity,
    clearOpportunities,
    executeArbitrage,
  };
}
