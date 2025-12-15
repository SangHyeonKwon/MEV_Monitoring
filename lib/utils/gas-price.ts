import { createPublicClient, http, formatGwei } from "viem";
import { mainnet } from "viem/chains";
import { ETH_RPC_URL } from "@/lib/config";

// Create viem public client
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(ETH_RPC_URL),
});

export interface GasPriceData {
  baseFee: bigint; // Base fee in wei (EIP-1559)
  priorityFee: bigint; // Priority fee in wei
  maxFeePerGas: bigint; // Max fee (baseFee + priorityFee)
  gasPrice: bigint; // Legacy gas price (for non-EIP-1559)
  baseFeeGwei: number; // Base fee in Gwei
  priorityFeeGwei: number; // Priority fee in Gwei
  maxFeeGwei: number; // Max fee in Gwei
  gasPriceGwei: number; // Legacy gas price in Gwei
  timestamp: number;
}

/**
 * Get current gas prices from Ethereum mainnet
 * Uses EIP-1559 fee estimation
 */
export async function getCurrentGasPrice(): Promise<GasPriceData> {
  try {
    // Get current block to get base fee
    const block = await publicClient.getBlock({
      blockTag: "latest",
    });

    const baseFee = block.baseFeePerGas || 0n;

    // Get recommended priority fee
    // This is the tip to incentivize miners/validators
    const priorityFee = await publicClient.estimateMaxPriorityFeePerGas();

    // Calculate max fee per gas (EIP-1559)
    // Formula: maxFeePerGas = (baseFee * 2) + priorityFee
    // We use 2x baseFee to account for potential base fee increases
    const maxFeePerGas = baseFee * 2n + priorityFee;

    // Get legacy gas price (for comparison)
    const gasPrice = await publicClient.getGasPrice();

    return {
      baseFee,
      priorityFee,
      maxFeePerGas,
      gasPrice,
      baseFeeGwei: Number(formatGwei(baseFee)),
      priorityFeeGwei: Number(formatGwei(priorityFee)),
      maxFeeGwei: Number(formatGwei(maxFeePerGas)),
      gasPriceGwei: Number(formatGwei(gasPrice)),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error fetching gas price:", error);
    throw error;
  }
}

/**
 * Calculate gas cost in USD
 * @param gasUnits - Estimated gas units for the transaction
 * @param gasPriceGwei - Gas price in Gwei
 * @param ethPriceUsd - ETH price in USD
 * @returns Gas cost in USD
 */
export function calculateGasCostUSD(
  gasUnits: number,
  gasPriceGwei: number,
  ethPriceUsd: number
): number {
  // 1 Gwei = 0.000000001 ETH
  const gasCostEth = (gasUnits * gasPriceGwei) / 1_000_000_000;
  const gasCostUsd = gasCostEth * ethPriceUsd;
  return gasCostUsd;
}

/**
 * Estimate gas units for flash loan arbitrage
 * This is a conservative estimate based on typical transactions
 */
export const ARBITRAGE_GAS_ESTIMATES = {
  // Flash loan from Aave V3
  flashLoanBase: 100_000,

  // Single DEX swap (Uniswap V2)
  uniswapV2Swap: 100_000,

  // Single DEX swap (Uniswap V3)
  uniswapV3Swap: 150_000,

  // Repay flash loan
  repayFlashLoan: 50_000,

  // Total for simple arbitrage (flash loan + 2 swaps + repay)
  // Uniswap V2 -> Uniswap V2
  simpleArbitrageV2: 350_000,

  // Uniswap V3 -> Uniswap V2
  simpleArbitrageV3: 400_000,

  // Complex arbitrage with multiple hops
  complexArbitrage: 500_000,
} as const;

/**
 * Get estimated gas units for a specific arbitrage route
 */
export function getEstimatedGasUnits(
  buyDex: string,
  sellDex: string
): number {
  const isV3 = buyDex.includes("v3") || sellDex.includes("v3");

  if (isV3) {
    return ARBITRAGE_GAS_ESTIMATES.simpleArbitrageV3;
  }

  return ARBITRAGE_GAS_ESTIMATES.simpleArbitrageV2;
}

/**
 * Check if gas price is within acceptable range
 */
export function isGasPriceAcceptable(
  currentGasPriceGwei: number,
  maxGasPriceGwei: number
): boolean {
  return currentGasPriceGwei <= maxGasPriceGwei;
}
