# Flash Loan Arbitrage Scanner

Real-time flash loan arbitrage scanner for Ethereum Mainnet. Detects profitable cross-DEX price discrepancies and executes atomic arbitrage trades using flash loans — no upfront capital required.

## Features

- **1inch Aggregator** — Primary price source for optimal routing
- **Flash Loan Execution** — Aave V3 flash loans for zero-capital trades
- **Multi-Source Monitoring** — Compares prices across 1inch, ParaSwap, and Uniswap V3
- **Real-Time Scanning** — Polls for price discrepancies every 5 seconds
- **Profitability Calculation** — Accounts for gas costs to compute net profit
- **Atomic Transactions** — All operations execute in a single transaction

## Supported Sources

**Aggregators:**
- 1inch (primary)
- ParaSwap (backup)

**Direct DEX:**
- Uniswap V3 / V2
- SushiSwap

**Flash Loan Providers:**
- Aave V3 (default)
- Uniswap V3
- Balancer

## Monitored Pairs

- WETH / USDC
- WETH / USDT
- WETH / DAI
- WBTC / WETH

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Web3 | viem, wagmi |
| RPC | Alchemy |
| Build | Turbopack |

## Getting Started

### Prerequisites

- Node.js 20+
- Alchemy API key ([alchemy.com](https://www.alchemy.com/))

### Installation

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Usage

1. Set your Alchemy API key in `.env.local`
2. Click **Start** to begin scanning
3. Detected opportunities appear in the right panel
4. Click **Execute** to send the arbitrage transaction

### Default Settings

| Setting | Value |
|---------|-------|
| Min Profit | $50 USD |
| Max Gas Price | 50 Gwei |
| Trade Amount | 1 ETH (flash loan) |
| Scan Interval | 5 seconds |

## Project Structure

```
├── app/                        # Next.js App Router
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── monitors/
│       ├── ArbitrageControl.tsx  # Control panel
│       └── OpportunityList.tsx   # Opportunity list
├── lib/
│   ├── config.ts               # DEX addresses & settings
│   ├── hooks/
│   │   └── useArbitrage.ts     # Arbitrage state management
│   └── utils/                  # Utility functions
└── types/
    └── monitor.ts              # TypeScript type definitions
```

## Verification

See [`VERIFICATION_GUIDE.md`](./VERIFICATION_GUIDE.md) for how to verify whether a detected opportunity would have been profitable.

## Disclaimer

This project is built for **educational purposes only**.

- Thorough testing is required before using real funds
- Gas fees apply when executing smart contract transactions
- Arbitrage trades can fail and result in losses
- **Never commit private keys to GitHub**

## License

MIT
