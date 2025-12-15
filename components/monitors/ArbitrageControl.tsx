"use client";

import { ArbitrageState, ArbitrageSettings, FlashLoanProtocol } from "@/types/monitor";
import { formatUSD } from "@/lib/utils/format";

import { ChainId } from "@/types/monitor";

interface ArbitrageControlProps {
  state: ArbitrageState;
  onStart: () => void;
  onStop: () => void;
  onUpdateSettings: (settings: ArbitrageSettings) => void;
  onSetChainId: (chainId: ChainId) => void;
}

const FLASH_LOAN_LABELS: Record<FlashLoanProtocol, string> = {
  [FlashLoanProtocol.AAVE_V3]: "Aave V3",
  [FlashLoanProtocol.UNISWAP_V3]: "Uniswap V3",
  [FlashLoanProtocol.BALANCER]: "Balancer",
};

export default function ArbitrageControl({
  state,
  onStart,
  onStop,
  onUpdateSettings,
  onSetChainId,
}: ArbitrageControlProps) {

  return (
    <div className="h-full glass-strong rounded-3xl shadow-2xl p-5 flex flex-col">
      {/* Header with Network Switcher and Start/Stop Button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Scanner Control</h2>
          {/* Network Switcher */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onSetChainId(1)}
              disabled={state.isScanning}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                state.chainId === 1
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              } ${state.isScanning ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Mainnet
            </button>
            <button
              onClick={() => onSetChainId(11155111)}
              disabled={state.isScanning}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                state.chainId === 11155111
                  ? "bg-orange-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              } ${state.isScanning ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Sepolia
            </button>
          </div>
        </div>
        <button
          onClick={state.isScanning ? onStop : onStart}
          className={`relative px-6 py-2.5 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
            state.isScanning
              ? "gradient-warning text-white shadow-lg shadow-red-900/50"
              : "gradient-success text-white shadow-lg shadow-green-900/50"
          }`}
        >
          <span className="relative z-10">{state.isScanning ? "Stop" : "Start"}</span>
          {state.isScanning && (
            <span className="absolute inset-0 rounded-xl animate-pulse bg-red-900/30"></span>
          )}
        </button>
      </div>

      {/* Status Indicator */}
      <div className={`glass-strong rounded-xl p-3 border mb-4 ${
        state.isScanning
          ? "border-green-600/50 pulse-glow"
          : "border-white/5"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            state.isScanning ? "bg-green-500 animate-pulse" : "bg-gray-600"
          }`}></div>
          <span className="font-bold text-white text-sm">
            {state.isScanning ? "🔍 Scanning..." : "⏸️ Idle"}
          </span>
        </div>
      </div>

      {/* Price Indicators - Gas and ETH */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Gas Price */}
        {state.gasPrice && (
          <div className={`glass-strong rounded-xl p-3 border ${
            state.gasPrice.maxFeeGwei > state.settings.maxGasPrice
              ? "border-red-600/50"
              : "border-blue-600/30"
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">⛽</span>
              <div className="flex-1">
                <p className="text-xs text-gray-400 font-medium">Gas</p>
                <p className="text-sm font-bold text-white">
                  {state.gasPrice.maxFeeGwei.toFixed(1)} Gwei
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ETH Price */}
        {state.ethPrice && (
          <div className="glass-strong rounded-xl p-3 border border-purple-600/30">
            <div className="flex items-center gap-2">
              <span className="text-lg">💎</span>
              <div className="flex-1">
                <p className="text-xs text-gray-400 font-medium">ETH/USD</p>
                <p className="text-sm font-bold text-white">
                  ${state.ethPrice.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="glass rounded-lg p-2.5 text-center border border-emerald-900/50">
          <p className="text-xs text-emerald-400 font-medium">Scanned</p>
          <p className="text-base font-bold text-white">{state.stats.totalScanned}</p>
        </div>
        <div className="glass rounded-lg p-2.5 text-center border border-gray-700/50">
          <p className="text-xs text-gray-300 font-medium">Found</p>
          <p className="text-base font-bold text-white">{state.stats.opportunitiesFound}</p>
        </div>
        <div className="glass rounded-lg p-2.5 text-center border border-yellow-900/50">
          <p className="text-xs text-yellow-400 font-medium">Profit</p>
          <p className="text-base font-bold text-white">{formatUSD(state.stats.totalProfit)}</p>
        </div>
      </div>

      {/* Active Arbitrage Routes - Flow Diagram */}
      <div className="glass rounded-xl p-4 border border-white/5 flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🔄</span>
            <span>Current Route</span>
          </h3>
          {state.scanResults.length > 0 && (
            <span className="text-xs text-gray-400">
              Scan #{state.stats.totalScanned}
            </span>
          )}
        </div>

        {state.scanResults.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-8">
            {state.isScanning ? "Scanning for opportunities..." : "No routes scanned yet"}
          </div>
        ) : (
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 max-h-[600px]">
            {(() => {
              // Rotate through scan results based on scan count
              const resultIndex = (state.stats.totalScanned - 1) % state.scanResults.length;
              const result = state.scanResults[resultIndex];
              if (!result) return null;

              const opp = result.opportunity;
              const isProfitable = opp && opp.netProfit > 0;

              // If no opportunity, create a placeholder with debug data
              const displayData = opp || {
                tokenPair: result.pairSymbol,
                buyFrom: result.debug?.wethToTokenQuotes[0] ? {
                  dex: result.debug.wethToTokenQuotes[0].dex,
                  price: result.debug.wethToTokenQuotes[0].price, // WETH → Token (already USD)
                } : null,
                sellTo: result.debug?.tokenToWethQuotes[0] ? {
                  dex: result.debug.tokenToWethQuotes[0].dex,
                  price: result.debug.tokenToWethQuotes[0].price > 0
                    ? 1 / result.debug.tokenToWethQuotes[0].price // Token → WETH inverted to USD
                    : 0,
                } : null,
                netProfit: 0,
                priceDiff: result.debug?.bestSpread || 0,
                flashLoanProtocol: state.settings.flashLoanProtocol,
                status: "pending" as const,
              };

              return (
                <div
                  key={`${result.pairSymbol}-${state.stats.totalScanned}-${state.lastUpdate}`}
                  className={`glass-strong rounded-lg p-3 border transition-all ${
                    isProfitable
                      ? "border-green-500/40 hover:border-green-500/60 bg-green-900/10"
                      : "border-gray-700/30 hover:border-gray-600/40"
                  }`}
                >
                {/* Header: Pair + Status */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-lg font-bold ${isProfitable ? "text-green-300" : "text-gray-400"}`}>
                    {displayData.tokenPair}
                  </span>
                  {isProfitable ? (
                    <span className={`text-xs px-3 py-1 rounded-lg font-bold ${
                      opp?.status === "success" ? "bg-green-900/50 text-green-300" :
                      opp?.status === "failed" ? "bg-red-900/50 text-red-300" :
                      opp?.status === "executing" ? "bg-yellow-900/50 text-yellow-300 animate-pulse" :
                      "bg-green-900/50 text-green-300"
                    }`}>
                      {opp?.status === "pending" ? "PROFITABLE" : opp?.status.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-lg font-bold bg-gray-800/50 text-gray-500">
                      NO PROFIT
                    </span>
                  )}
                </div>

                {/* Horizontal Flow Diagram */}
                <div className="flex items-center gap-2">
                  {/* Step 1: Flash Loan */}
                  <div className={`flex-1 rounded-xl px-3 py-4 shadow-lg ${
                    isProfitable
                      ? "bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-2 border-purple-500/60"
                      : "bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-2 border-gray-700/40"
                  }`}>
                    <div className="flex flex-col items-center text-center gap-2">
                      <span className="text-3xl">💰</span>
                      <div className={`text-[10px] font-semibold ${isProfitable ? "text-purple-300" : "text-gray-500"}`}>
                        FLASH LOAN
                      </div>
                      <div className={`text-xs font-bold ${isProfitable ? "text-white" : "text-gray-400"}`}>
                        {FLASH_LOAN_LABELS[displayData.flashLoanProtocol]}
                      </div>
                    </div>
                  </div>

                  {/* Arrow Right */}
                  <div className={`text-3xl ${isProfitable ? "text-cyan-400" : "text-gray-600"}`}>→</div>

                  {/* Step 2: Buy */}
                  {displayData.buyFrom && (
                    <>
                      <div className={`flex-1 rounded-xl px-3 py-4 shadow-lg ${
                        isProfitable
                          ? "bg-gradient-to-br from-green-900/50 to-green-800/30 border-2 border-green-500/60"
                          : "bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-2 border-gray-700/40"
                      }`}>
                        <div className="flex flex-col items-center text-center gap-2">
                          <span className="text-3xl">📥</span>
                          <div className={`text-[10px] font-semibold ${isProfitable ? "text-green-300" : "text-gray-500"}`}>
                            BUY FROM
                          </div>
                          <div className={`text-xs font-bold ${isProfitable ? "text-white" : "text-gray-400"}`}>
                            {displayData.buyFrom.dex.toUpperCase()}
                          </div>
                          <div className={`text-xs font-bold ${isProfitable ? "text-green-300" : "text-gray-500"}`}>
                            ${displayData.buyFrom.price.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Arrow Right */}
                      <div className={`text-3xl ${isProfitable ? "text-cyan-400" : "text-gray-600"}`}>→</div>
                    </>
                  )}

                  {/* Step 3: Sell */}
                  {displayData.sellTo && (
                    <>
                      <div className={`flex-1 rounded-xl px-3 py-4 shadow-lg ${
                        isProfitable
                          ? "bg-gradient-to-br from-red-900/50 to-red-800/30 border-2 border-red-500/60"
                          : "bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-2 border-gray-700/40"
                      }`}>
                        <div className="flex flex-col items-center text-center gap-2">
                          <span className="text-3xl">📤</span>
                          <div className={`text-[10px] font-semibold ${isProfitable ? "text-red-300" : "text-gray-500"}`}>
                            SELL TO
                          </div>
                          <div className={`text-xs font-bold ${isProfitable ? "text-white" : "text-gray-400"}`}>
                            {displayData.sellTo.dex.toUpperCase()}
                          </div>
                          <div className={`text-xs font-bold ${isProfitable ? "text-red-300" : "text-gray-500"}`}>
                            ${displayData.sellTo.price.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Arrow Right */}
                      <div className={`text-3xl ${isProfitable ? "text-cyan-400" : "text-gray-600"}`}>→</div>
                    </>
                  )}

                  {/* Step 4: Profit */}
                  <div className={`flex-1 rounded-xl px-3 py-4 shadow-lg border-2 ${
                    isProfitable
                      ? "bg-gradient-to-r from-green-900/50 to-emerald-900/40 border-green-500/60"
                      : "bg-gradient-to-r from-gray-900/50 to-gray-800/40 border-gray-700/50"
                  }`}>
                    <div className="flex flex-col items-center text-center gap-2">
                      <span className="text-3xl">{isProfitable ? "💰" : "📊"}</span>
                      <div className="text-[10px] text-gray-300 font-semibold">
                        {isProfitable ? "NET PROFIT" : "SPREAD"}
                      </div>
                      <div className={`text-sm font-bold ${
                        isProfitable ? "text-green-400" : "text-gray-400"
                      }`}>
                        {isProfitable
                          ? `${displayData.netProfit > 0 ? "+" : ""}${formatUSD(displayData.netProfit)}`
                          : `${displayData.priceDiff > 0 ? "+" : ""}${displayData.priceDiff.toFixed(4)}%`
                        }
                      </div>
                      <div className={`text-[10px] font-bold ${isProfitable ? "text-cyan-300" : "text-gray-500"}`}>
                        Spread: {displayData.priceDiff > 0 ? "+" : ""}{displayData.priceDiff.toFixed(4)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )})()}
          </div>
        )}
      </div>
    </div>
  );
}
