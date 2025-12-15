"use client";

import { useArbitrage } from "@/lib/hooks/useArbitrage";
import ArbitrageControl from "@/components/monitors/ArbitrageControl";
import OpportunityList from "@/components/monitors/OpportunityList";
import { BlockchainScanner } from "@/components/monitors/BlockchainScanner";

export default function Home() {
  const {
    state,
    startScanning,
    stopScanning,
    updateSettings,
    setChainId,
    clearOpportunities,
    executeArbitrage,
  } = useArbitrage();

  return (
    <div className="h-screen overflow-hidden animated-gradient flex flex-col">
      <main className="flex-1 flex flex-col max-w-full px-8 py-6 overflow-hidden">
        {/* Header - Professional Monitoring Style */}
        <div className="mb-6 flex-shrink-0">
          <div className="glass-strong rounded-2xl px-6 py-4 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between">
              {/* Left: Logo & Title */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    Arbitrage Monitor
                  </h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Real-time DEX Price Monitoring System
                  </p>
                </div>
              </div>

              {/* Right: Status & Metrics */}
              <div className="flex items-center gap-4">
                {/* System Status */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-300">
                    {state.isScanning ? "Scanning" : "Ready"}
                  </span>
                </div>

                {/* Live Metrics Preview */}
                {(state.gasPrice || state.ethPrice) && (
                  <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    {state.gasPrice && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">Gas:</span>
                        <span className="text-xs font-semibold text-white">
                          {state.gasPrice.maxFeeGwei.toFixed(0)} Gwei
                        </span>
                      </div>
                    )}
                    {state.ethPrice && (
                      <>
                        <div className="w-px h-4 bg-gray-600"></div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400">ETH:</span>
                          <span className="text-xs font-semibold text-white">
                            ${state.ethPrice.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Network Badge */}
                <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs font-medium text-gray-300">
                    {state.chainId === 1 ? "Mainnet" : "Sepolia"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Blockchain Scanning Animation */}
        <div className="mb-4 flex-shrink-0">
          <div className="glass-strong rounded-xl px-4 py-2 border border-white/10">
            <BlockchainScanner
              isScanning={state.isScanning}
              scannedCount={state.stats.totalScanned}
              totalPairs={0}
            />
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          <ArbitrageControl
            state={state}
            onStart={startScanning}
            onStop={stopScanning}
            onUpdateSettings={updateSettings}
            onSetChainId={setChainId}
          />
          <OpportunityList
            opportunities={state.opportunities}
            logs={state.logs}
            onClear={clearOpportunities}
            onExecute={executeArbitrage}
          />
        </div>
      </main>
    </div>
  );
}
