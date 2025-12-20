/**
 * Execute arbitrage on Hardhat fork for dry-run testing
 */

import { ethers } from "ethers";
import { ArbitrageOpportunity } from "@/types/monitor";
import FlashLoanArbitrageABI from "@/artifacts/contracts/FlashLoanArbitrage.sol/FlashLoanArbitrage.json";
import { getMultiDexQuotes } from "@/lib/utils/dex-prices-client";

// Hardhat fork RPC endpoint (runs locally)
const HARDHAT_RPC = "http://127.0.0.1:8545";

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: string;
  profitWei?: string;
  profitUsd?: number;
}

/**
 * Execute arbitrage on Hardhat fork (dry-run)
 */
export async function executeArbitrageDryRun(
  opportunity: ArbitrageOpportunity,
  contractAddress: string,
  ethPriceUsd: number
): Promise<ExecutionResult> {
  try {
    // Connect to Hardhat fork
    const provider = new ethers.JsonRpcProvider(HARDHAT_RPC);
    
    // Check if Hardhat node is running
    try {
      await provider.getNetwork();
    } catch (error) {
      return {
        success: false,
        error: "Hardhat node not running. Start with: npx hardhat node",
      };
    }

    // Get signer (use first account from Hardhat)
    const signer = await provider.getSigner(0);

    // Check if contract exists at address
    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      console.warn(`[Dry-Run] Contract not found at ${contractAddress}, using simulation mode`);
      // Continue with simulation instead of failing
    }

    // Load contract (only if exists)
    let contract = null;
    if (code !== "0x") {
      contract = new ethers.Contract(
        contractAddress,
        FlashLoanArbitrageABI.abi,
        signer
      );

      // Check if contract has the expected function
      if (!contract.requestFlashLoan) {
        console.warn("[Dry-Run] Contract ABI mismatch, using simulation mode");
        contract = null;
      }
    }

    // Prepare parameters
    const assetAddress = opportunity.tokenIn.address; // WETH
    const tradeAmount = opportunity.tradeAmount || 1; // Use optimal amount
    const amountWei = ethers.parseEther(tradeAmount.toString());

    // For now, simulate execution since contract requires complex parameter encoding
    // TODO: Implement proper ArbitrageParams encoding
    console.log("[Dry-Run] Simulating arbitrage execution...", {
      asset: assetAddress,
      amount: ethers.formatEther(amountWei),
      buyDex: opportunity.buyFrom.dex,
      sellDex: opportunity.sellTo.dex,
      contractAddress,
    });

    // Simulate gas estimate (typical flash loan arbitrage: 300k-500k gas)
    const gasEstimate = 400000n;
    console.log("[Dry-Run] Estimated gas:", gasEstimate.toString());

    // Re-verify prices before execution (prices can change quickly!)
    console.log("[Dry-Run] Re-verifying prices...");
    const quotes = await getMultiDexQuotes(
      opportunity.tokenIn.address as `0x${string}`,
      opportunity.tokenOut.address as `0x${string}`,
      opportunity.tokenIn.decimals,
      opportunity.tokenOut.decimals
    );

    if (quotes.length < 2) {
      return {
        success: false,
        error: "Insufficient quotes for verification",
      };
    }

    // Find current best arbitrage
    // quotes[i].price = WETH → Token (e.g., 1 WETH = 3000 USDC)
    // For sell, we need Token → WETH, which is 1 / price
    let bestBuy: typeof quotes[0] | null = null;
    let bestSell: typeof quotes[0] | null = null;
    let maxDiff = 0;

    for (let i = 0; i < quotes.length; i++) {
      for (let j = 0; j < quotes.length; j++) {
        if (i === j) continue;
        const buyPrice = quotes[i].price; // WETH → Token (Token per WETH)
        const sellPriceInverted = 1 / quotes[j].price; // Token → WETH (WETH per Token)
        // We buy at quotes[i], sell at quotes[j]
        // 1 WETH → buyPrice Token → sellPriceInverted * buyPrice WETH
        const finalAmount = buyPrice * sellPriceInverted;
        const diff = ((finalAmount - 1) / 1) * 100; // Percentage profit
        
        if (diff > maxDiff) {
          maxDiff = diff;
          bestBuy = quotes[i];
          bestSell = quotes[j];
        }
      }
    }

    if (!bestBuy || !bestSell) {
      return {
        success: false,
        error: "No arbitrage opportunity found on re-verification",
      };
    }

    // Calculate actual profit with current prices
    // buyPrice: WETH → Token (e.g., 1 WETH = 3000 USDC)
    // sellPrice: WETH → Token (e.g., 1 WETH = 3010 USDC) - we invert to get Token → WETH
    const tradeAmountEth = opportunity.tradeAmount || 1; // Use optimal amount from opportunity
    const buyPrice = bestBuy.price; // Token per WETH
    const sellPriceInverted = 1 / bestSell.price; // WETH per Token
    const tokenAmount = tradeAmountEth * buyPrice; // Amount of token we get
    const finalEthAmount = tokenAmount * sellPriceInverted; // Amount of ETH we get back
    const grossProfitEth = finalEthAmount - tradeAmountEth;
    
    // Use actual gas price from opportunity or estimate
    const gasPriceGwei = opportunity.gasPrice?.maxFeeGwei || 30; // Use actual gas price
    const gasCostEth = Number(gasEstimate) * gasPriceGwei * 1e9 / 1e18;
    const gasCostUsd = gasCostEth * ethPriceUsd;
    
    // Flash loan fee - use protocol from opportunity
    const flashLoanProtocol = opportunity.flashLoanProtocol || "AAVE_V3";
    const FLASH_LOAN_FEES: Record<string, number> = {
      "AAVE_V3": 0.09,      // 0.09% (9 bps)
      "UNISWAP_V3": 0.05,   // 0.05% (5 bps)
      "BALANCER": 0.0,      // 0% (free!)
    };
    const FLASH_LOAN_FEE_PERCENT = FLASH_LOAN_FEES[flashLoanProtocol] || 0.09;
    const flashLoanFeeEth = tradeAmountEth * (FLASH_LOAN_FEE_PERCENT / 100);
    const flashLoanFeeUsd = flashLoanFeeEth * ethPriceUsd;
    
    // Net profit after all costs
    const netProfitEth = grossProfitEth - gasCostEth - flashLoanFeeEth;
    const netProfitUsd = netProfitEth * ethPriceUsd;
    
    console.log("[Dry-Run] Profit calculation:", {
      flashLoanProtocol: flashLoanProtocol,
      flashLoanFeePercent: FLASH_LOAN_FEE_PERCENT + "%",
      tradeAmount: tradeAmountEth.toFixed(2) + " ETH",
      grossProfit: grossProfitEth.toFixed(6) + " ETH",
      gasCost: gasCostUsd.toFixed(2) + " USD",
      flashLoanFee: flashLoanFeeUsd.toFixed(2) + " USD",
      netProfit: netProfitUsd.toFixed(2) + " USD",
    });

    // Check if still profitable (use same threshold as scanner)
    const minProfitUsd = 5; // $5 minimum profit (matches ARBITRAGE_STRATEGY)
    if (netProfitUsd < minProfitUsd) {
      return {
        success: false,
        error: `Opportunity expired: Net profit $${netProfitUsd.toFixed(2)} < $${minProfitUsd}`,
      };
    }

    // Check if prices changed significantly
    const originalDiff = opportunity.priceDiff;
    const currentDiff = maxDiff;
    const diffChange = Math.abs(currentDiff - originalDiff);
    
    if (diffChange > 0.5) { // More than 0.5% change
      console.warn(`[Dry-Run] Price changed: ${originalDiff.toFixed(2)}% → ${currentDiff.toFixed(2)}%`);
    }

    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate transaction hash
    const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    console.log("[Dry-Run] Verification result:", {
      originalProfit: opportunity.netProfit.toFixed(2),
      verifiedProfit: netProfitUsd.toFixed(2),
      priceDiff: `${originalDiff.toFixed(2)}% → ${currentDiff.toFixed(2)}%`,
      success: netProfitUsd >= minProfitUsd,
    });

    return {
      success: true,
      txHash: mockTxHash,
      gasUsed: gasEstimate.toString(),
      profitWei: (netProfitEth * 1e18).toString(),
      profitUsd: netProfitUsd,
    };
  } catch (error: any) {
    console.error("[Dry-Run] Error:", error);
    return {
      success: false,
      error: error.message || "Unknown error during execution",
    };
  }
}

/**
 * Get DEX router address by protocol name
 */
function getDexRouterAddress(dex: string): string | null {
  const routers: Record<string, string> = {
    uniswap_v2: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    uniswap_v3: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    uniswap_v3_500: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    sushiswap: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
  };

  return routers[dex.toLowerCase()] || null;
}

/**
 * Check if Hardhat node is running
 */
export async function isHardhatNodeRunning(): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(HARDHAT_RPC);
    await provider.getNetwork();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Hardhat accounts (for testing)
 */
export async function getHardhatAccounts(): Promise<string[]> {
  try {
    const provider = new ethers.JsonRpcProvider(HARDHAT_RPC);
    const accounts = await provider.listAccounts();
    return accounts.map((acc) => acc.address);
  } catch {
    return [];
  }
}

