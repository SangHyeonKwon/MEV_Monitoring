# Flash Loan Arbitrage Scanner

플래시론 차익거래 스캐너 - Ethereum Mainnet

## 개요

Flash Loan Arbitrage Scanner는 이더리움 메인넷의 여러 DEX 간 가격 차이를 실시간으로 스캔하여 수익성 있는 차익거래 기회를 탐지하는 시스템입니다. 플래시론을 활용하여 초기 자본 없이 차익거래를 실행할 수 있습니다.

## 주요 기능

### 차익거래 전략

- **1inch Aggregator**: 1inch를 메인으로 사용하여 최적 가격 탐색
- **플래시론 활용**: Aave V3 플래시론으로 초기 자본 없이 거래
- **멀티 소스 모니터링**: 1inch, ParaSwap, Uniswap V3 비교
- **실시간 가격 스캔**: 5초마다 가격 차이 탐지
- **수익성 계산**: 가스비를 포함한 실제 순수익 계산
- **원자적 거래**: 단일 트랜잭션으로 모든 작업 수행

### 지원 네트워크

- **Ethereum Mainnet** (Chain ID: 1) 전용

### 지원 소스

**Aggregators (주요):**
- 1inch - 메인 aggregator
- ParaSwap - 백업 aggregator

**Direct DEX:**
- Uniswap V3
- Uniswap V2
- Sushiswap

### 플래시론 프로바이더

- Aave V3 (기본)
- Uniswap V3
- Balancer

## 시작하기

### 필수 요구사항

- Node.js 20 이상
- npm 또는 yarn
- Alchemy API 키 ([alchemy.com](https://www.alchemy.com/)에서 발급)

### 설치

```bash
npm install
```

### 환경 변수 설정 (필수)

`.env.local` 파일을 생성하고 Alchemy RPC URL을 설정하세요:

```bash
cp .env.example .env.local
```

`.env.local` 파일 수정:
```env
NEXT_PUBLIC_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 열어 애플리케이션을 확인하세요.

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 사용 방법

1. **Alchemy API 키 설정**: `.env.local` 파일에 API 키 입력
2. **스캐너 시작**: "시작" 버튼 클릭
3. **기회 탐지**: 차익거래 기회가 발견되면 오른쪽 패널에 표시
4. **거래 실행**: "실행" 버튼으로 차익거래 트랜잭션 전송

## 설정

### 기본 설정

- **최소 수익**: $50 USD
- **최대 가스 가격**: 50 Gwei
- **거래 금액**: 1 ETH (플래시론)
- **스캔 주기**: 5초

### 주요 토큰

시스템은 다음 토큰 쌍을 모니터링합니다:
- WETH/USDC
- WETH/USDT
- WETH/DAI
- WBTC/WETH

## 프로젝트 구조

```
monitor_dex/
├── app/                    # Next.js 앱 라우터
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 메인 페이지
├── components/            # React 컴포넌트
│   └── monitors/         # 차익거래 관련 컴포넌트
│       ├── ArbitrageControl.tsx   # 제어 패널
│       └── OpportunityList.tsx    # 기회 리스트
├── lib/                   # 핵심 로직
│   ├── config.ts         # 설정 파일 (DEX 주소 등)
│   ├── hooks/            # React 훅
│   │   └── useArbitrage.ts  # 차익거래 상태 관리
│   └── utils/            # 유틸리티 함수
└── types/                # TypeScript 타입 정의
    └── monitor.ts        # 차익거래 타입
```

## 기술 스택

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Web3**: viem, wagmi
- **RPC Provider**: Alchemy
- **Build Tool**: Turbopack

## Vercel 배포

### 배포 방법

1. **GitHub에 푸시**
```bash
git add .
git commit -m "Initial commit"
git push
```

2. **Vercel 연결**
- [vercel.com](https://vercel.com) 방문 및 가입
- "Import Project" 클릭
- GitHub 레포지토리 선택
- 자동으로 Next.js 감지됨

3. **환경변수 설정**
- Vercel Dashboard → Project Settings → Environment Variables
- 다음 환경변수 추가:
  ```
  NEXT_PUBLIC_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
  ```

4. **Deploy!**
- 2-3분 안에 배포 완료
- `https://your-project.vercel.app` 에서 접속 가능

### 자동 배포
- `main` 브랜치에 푸시하면 자동으로 재배포됨
- Pull Request마다 미리보기 URL 생성

## 검증 가이드

실제 차익거래 기회가 수익이 났을지 검증하는 방법은 [`VERIFICATION_GUIDE.md`](./VERIFICATION_GUIDE.md)를 참고하세요.

## 주의사항

⚠️ **면책 조항**
- 이 프로젝트는 교육 목적으로 제작되었습니다
- 실제 자금을 사용하기 전에 충분한 테스트가 필요합니다
- 스마트 컨트랙트 실행 시 가스비가 발생합니다
- 차익거래는 실패할 수 있으며 손실이 발생할 수 있습니다
- **절대로 개인키를 GitHub에 커밋하지 마세요**

## 라이센스

MIT
