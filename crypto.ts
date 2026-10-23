export interface Ticker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET' | 'STOP_LOSS_LIMIT';
export type OrderStatus = 'FILLED' | 'PENDING' | 'CANCELLED';

export interface TradeOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  amount: number;
  totalUsdt: number;
  status: OrderStatus;
  pnl?: number;
  pnlPercent?: number;
  binanceFeeUsdt?: number;
  netPnl?: number;
  netPnlPercent?: number;
  timestamp: number;
  executionSource: 'BOT' | 'MANUAL' | 'AI_TRIGGER';
  botName?: string;
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

export type BotStrategyType = 
  | 'AI_SCALPER' 
  | 'GRID_TRADER' 
  | 'BREAKOUT_MOMENTUM' 
  | 'DCA_ACCUMULATOR'
  | 'SUPERTREND_VWAP_ALPHA'
  | 'QUANT_MOMENTUM_COMPOUND'
  | 'AI_MICRO_REVERSION';
export type BotStatus = 'RUNNING' | 'PAUSED' | 'STOPPED';

export interface BotInstance {
  id: string;
  name: string;
  symbol: string;
  strategy: BotStrategyType;
  status: BotStatus;
  allocatedCapitalUsdt: number;
  currentCapitalUsdt: number;
  totalProfitUsdt: number;
  totalProfitPercent: number;
  tradesCount: number;
  winRate: number;
  trailingStopPercent: number;
  takeProfitPercent: number;
  gridLevels?: number;
  dcaSteps?: number;
  entryPrice?: number;
  highestPriceSinceEntry?: number;
  hasOpenPosition?: boolean;
  positionQty?: number;
  positionOpenedAt?: number;
  createdAt: number;
  lastAction: string;
  lastSignal?: string;
}

export interface EarlyGem {
  id: string;
  symbol: string;
  name: string;
  network: string;
  dex: string;
  currentPrice: number;
  change24h: number;
  volume24h: number;
  liquidity: number;
  liquidityLockedPercent: number;
  holdersCount: number;
  listingProbability: number; // 0 - 100
  auditStatus: string;
  honeypotRisk: string;
  aiCatalystScore: number;
  predictedBinanceMultiplier: string;
  catalyst: string;
  tags: string[];
}

export interface AIPredictionResult {
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  confidenceScore: number;
  targetPriceShortTerm: number;
  targetPriceMidTerm: number;
  stopLossPrice: number;
  suggestedTakeProfitPercent: number;
  suggestedStopLossPercent: number;
  riskRewardRatio: string;
  marketRegime: string;
  recommendedPositionSizePercent: number;
  summaryAnalysis: string;
  keySupport: number;
  keyResistance: number;
  actionSteps: string[];
}

export interface StrategyOptimizationResult {
  strategyName: string;
  recommendedTrailingStop: number;
  recommendedTakeProfit: number;
  recommendedLeverage: number;
  dcaMultiplier: number;
  maxOpenPositions: number;
  cooldownMinutesBetweenTrades: number;
  expectedProfitIncreasePercent: string;
  riskAssessment: string;
  rules: string[];
}

export interface AppNotification {
  id: string;
  type: 'TRADE_BUY' | 'TRADE_SELL' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'AI_SIGNAL' | 'GEM_RADAR' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  symbol?: string;
}

export interface BacktestResult {
  symbol: string;
  strategy: string;
  period: string;
  initialBalance: number;
  finalBalance: number;
  netProfit: number;
  netProfitPercent: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  trades: Array<{
    entryTime: number;
    exitTime: number;
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    exitPrice: number;
    profit: number;
    profitPercent: number;
  }>;
}

export interface BnbCommissionBudget {
  freeBnb: number;
  bnbPrice: number;
  bnbUsdValue: number;
  discountActive: boolean;
  discountRate: string; // "0.075%"
  standardRate: string; // "0.10%"
  estimatedTradesRemaining: number;
  totalSavedUsdt: number;
}

export interface SpotWalletBalance {
  asset: string;
  free: number;
  locked: number;
  estimatedUsd: number;
  symbol?: string;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnl?: number;
  unrealizedPnlPercent?: number;
  netPnl?: number;
  netPnlPercent?: number;
}

export interface UserSecuritySettings {
  exchange: 'BINANCE' | 'BINANCE_TR' | 'BYBIT' | 'OKX' | 'COINBASE';
  tradingMode: 'PAPER' | 'LIVE_API';
  binanceApiKey: string;
  binanceSecretKey: string;
  isKeysEncrypted: boolean;
  is2FAEnabled: boolean;
  pinHash: string; // 4 or 6 digit pin
  isAppLocked: boolean;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  simulatedBalanceUsdt: number;
  liveSpotBalanceUsdt?: number;
  availableCashUsdt?: number;
  liveSpotBalanceTry?: number;
  maxDailyDrawdownPercent: number;
  autoLiveExecutionEnabled?: boolean;
  liveTradeAmountUsdt?: number;
  spotBalances?: SpotWalletBalance[];
  autoCompoundProfits?: boolean;
  compoundReinvestmentRate?: number;
  dynamicPositionAllocationPct?: number;
  autoBnbFeeBuffer?: boolean;
  bnbBudget?: BnbCommissionBudget;
  totalFeesSavedBnbDiscountUsdt?: number;
  altcoinHunterMode?: 'ALL_ALTCOINS' | 'MAJOR_ONLY';
  referralCode?: string;
  referralLink?: string;
  binanceTrReferralCode?: string;
  binanceTrReferralLink?: string;
  telegramChannelLink?: string;
  language?: 'en' | 'tr';
}

export interface AlphaOpportunity {
  symbol: string;
  tokenName: string;
  alphaHeadline: string;
  source: string;
  sentimentScore: number;
  tradeAction: string;
  expectedReturnPercent: string;
  rationale: string;
  recommendedStopLoss: number;
  priority: 'CRITICAL_ALPHA' | 'HIGH_YIELD' | 'WHALE_ACCUMULATION';
}

export interface AlphaScannerResponse {
  scannerStatus: string;
  globalMarketMood: string;
  hackerAnalysis: string;
  opportunities: AlphaOpportunity[];
}

export interface StrategyLogItem {
  id: string;
  timestamp: number;
  botName: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'GRID_STEP' | 'SCAN';
  message: string;
  pnl?: number;
  pnlPercent?: number;
}

export interface UpcomingListingToken {
  id: string;
  name: string;
  symbol: string;
  address: string; // Exact BEP-20 address
  pairAddress?: string;
  targetExchanges: Array<{
    name: 'Binance' | 'Bybit' | 'OKX' | 'KuCoin' | 'Gate.io' | 'Coinbase' | 'Bitget';
    tier: 'Tier 1' | 'Tier 2';
    listingStage: string;
    expectedDate: string;
    countdownDays: number;
    badgeColor: string;
  }>;
  currentPriceUsd: number;
  currentPriceBnb: number;
  priceChange24h: number;
  projectedCeilingMultiplier: string;
  projectedCeilingGainPercent: string;
  safetyScore: number;
  securityProtocol: {
    passedAllChecks: boolean;
    honeypotRisk: 'SIFIR_RISK' | 'TEMIZ';
    honeypotSimulated: boolean;
    buyTaxPercent: number;
    sellTaxPercent: number;
    liquidityLockedPercent: number;
    lockPlatform: string;
    lockExpiryDate?: string;
    isOwnershipRenounced: boolean;
    hasMintFunction: boolean;
    auditAgency: 'CertiK' | 'PeckShield' | 'Hacken' | 'Halborn' | 'OpenZeppelin';
    auditReportUrl?: string;
    contractVerifiedOnBscScan: boolean;
  };
  catalystSummary: string;
  whaleAccumulationUsd: number;
  liquidityBnb: number;
  liquidityUsd: number;
  marketCapUsd: number;
  holdersCount: number;
  tags: string[];
  isCustomUserAdded?: boolean;
  createdAt?: number;
}
