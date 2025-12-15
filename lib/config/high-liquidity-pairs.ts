/**
 * High Liquidity Trading Pairs for WETH-based Arbitrage
 *
 * These pairs are selected based on:
 * - High TVL (Total Value Locked)
 * - Deep liquidity (low slippage)
 * - Active trading volume
 * - Multiple DEX availability
 */

import { DexProtocol } from "@/types/monitor";
import { TOKENS_MAINNET, TOKENS_SEPOLIA, DEX_ROUTERS_MAINNET, DEX_ROUTERS_SEPOLIA } from "@/lib/config";

export interface HighLiquidityPair {
  token: {
    address: string;
    symbol: string;
    decimals: number;
  };
  dexes: {
    protocol: DexProtocol;
    router: string;
    fee?: number; // For V3 (3000 = 0.3%, 500 = 0.05%, 10000 = 1%)
  }[];
  minLiquidity: number; // Minimum liquidity in USD to consider
}

/**
 * Ethereum Mainnet High Liquidity Pairs
 * All paired with WETH for 2-hop arbitrage: WETH → Token → WETH
 */
export const MAINNET_HIGH_LIQUIDITY_PAIRS: HighLiquidityPair[] = [
  // WETH/USDC - Highest liquidity stablecoin pair
  {
    token: {
      address: TOKENS_MAINNET.USDC.address,
      symbol: "USDC",
      decimals: 6,
    },
    dexes: [
      {
        protocol: DexProtocol.UNISWAP_V2,
        router: DEX_ROUTERS_MAINNET[DexProtocol.UNISWAP_V2],
      },
      {
        protocol: DexProtocol.UNISWAP_V3,
        router: DEX_ROUTERS_MAINNET[DexProtocol.UNISWAP_V3],
        fee: 3000, // 0.3% pool
      },
      {
        protocol: DexProtocol.UNISWAP_V3,
        router: DEX_ROUTERS_MAINNET[DexProtocol.UNISWAP_V3],
        fee: 500, // 0.05% pool (ultra low fee, high volume)
      },
      {
        protocol: DexProtocol.SUSHISWAP,
        router: DEX_ROUTERS_MAINNET[DexProtocol.SUSHISWAP],
      },
    ],
    minLiquidity: 50_000_000, // $50M minimum
  },

  // WETH/USDT - Second highest stablecoin pair
  {
    token: {
      address: TOKENS_MAINNET.USDT.address,
      symbol: "USDT",
      decimals: 6,
    },
    dexes: [
      {
        protocol: DexProtocol.UNISWAP_V2,
        router: DEX_ROUTERS_MAINNET[DexProtocol.UNISWAP_V2],
      },
      {
        protocol: DexProtocol.UNISWAP_V3,
        router: DEX_ROUTERS_MAINNET[DexProtocol.UNISWAP_V3],
        fee: 3000,
      },
      {
        protocol: DexProtocol.SUSHISWAP,
        router: DEX_ROUTERS_MAINNET[DexProtocol.SUSHISWAP],
      },
    ],
    minLiquidity: 30_000_000, // $30M minimum
  },

  // WETH/DAI - Large decentralized stablecoin
  {
    token: {
      address: TOKENS_MAINNET.DAI.address,
      symbol: "DAI",
      decimals: 18,
    },
    dexes: [
      {
        protocol: DexProtocol.UNISWAP_V2,
        router: DEX_ROUTERS_MAINNET[DexProtocol.UNISWAP_V2],
      },
      {
        protocol: DexProtocol.UNISWAP_V3,
        router: DEX_ROUTERS_MAINNET[DexProtocol.UNISWAP_V3],
        fee: 3000,
      },
      {
        protocol: DexProtocol.SUSHISWAP,
        router: DEX_ROUTERS_MAINNET[DexProtocol.SUSHISWAP],
      },
    ],
    minLiquidity: 20_000_000, // $20M minimum
  },

  // WETH/WBTC - Major crypto pair
  {
    token: {
      address: TOKENS_MAINNET.WBTC.address,
      symbol: "WBTC",
      decimals: 8,
    },
    dexes: [
      {
        protocol: DexProtocol.UNISWAP_V2,
        router: DEX_ROUTERS_MAINNET[DexProtocol.UNISWAP_V2],
      },
      {
        protocol: DexProtocol.UNISWAP_V3,
        router: DEX_ROUTERS_MAINNET[DexProtocol.UNISWAP_V3],
        fee: 3000,
      },
      {
        protocol: DexProtocol.SUSHISWAP,
        router: DEX_ROUTERS_MAINNET[DexProtocol.SUSHISWAP],
      },
    ],
    minLiquidity: 15_000_000, // $15M minimum
  },
];

/**
 * Sepolia Testnet Pairs (Limited liquidity)
 */
export const SEPOLIA_HIGH_LIQUIDITY_PAIRS: HighLiquidityPair[] = [
  {
    token: {
      address: TOKENS_SEPOLIA.USDC.address,
      symbol: "USDC",
      decimals: 6,
    },
    dexes: [
      {
        protocol: DexProtocol.UNISWAP_V2,
        router: DEX_ROUTERS_SEPOLIA[DexProtocol.UNISWAP_V2],
      },
      {
        protocol: DexProtocol.UNISWAP_V3,
        router: DEX_ROUTERS_SEPOLIA[DexProtocol.UNISWAP_V3],
        fee: 3000,
      },
    ],
    minLiquidity: 1000, // Very low for testnet
  },
  {
    token: {
      address: TOKENS_SEPOLIA.DAI.address,
      symbol: "DAI",
      decimals: 18,
    },
    dexes: [
      {
        protocol: DexProtocol.UNISWAP_V2,
        router: DEX_ROUTERS_SEPOLIA[DexProtocol.UNISWAP_V2],
      },
      {
        protocol: DexProtocol.UNISWAP_V3,
        router: DEX_ROUTERS_SEPOLIA[DexProtocol.UNISWAP_V3],
        fee: 3000,
      },
    ],
    minLiquidity: 1000,
  },
];

/**
 * Get high liquidity pairs for specific chain
 */
export function getHighLiquidityPairs(chainId: number): HighLiquidityPair[] {
  return chainId === 1 ? MAINNET_HIGH_LIQUIDITY_PAIRS : SEPOLIA_HIGH_LIQUIDITY_PAIRS;
}

/**
 * WETH address by chain
 */
export function getWETHAddress(chainId: number): string {
  return chainId === 1 ? TOKENS_MAINNET.WETH.address : TOKENS_SEPOLIA.WETH.address;
}

/**
 * Trading strategy configuration
 */
export const ARBITRAGE_STRATEGY = {
  // Always start and end with WETH
  baseToken: "WETH",

  // Scan only these high-volume pairs
  scanInterval: 3000, // 3 seconds

  // Minimum profit thresholds
  minProfitUsd: 10, // $10 minimum profit (for testing, increase later)
  minSpreadPercent: 0.1, // 0.1% minimum spread

  // Risk management
  maxSlippagePercent: 1, // 1% max slippage
  maxGasGwei: 100, // Don't execute if gas > 100 Gwei

  // Flash loan
  flashLoanFeePercent: 0.05, // Aave V3 = 0.05%
};
