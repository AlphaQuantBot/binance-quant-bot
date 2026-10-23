import { Candle } from '../types/crypto';

// Relative Strength Index (RSI) calculation
export function calculateRSI(candles: Candle[], period: number = 14): number {
  if (candles.length <= period) return 50.0;

  let gains = 0;
  let losses = 0;

  for (let i = candles.length - period; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return parseFloat(rsi.toFixed(2));
}

// Exponential Moving Average (EMA)
export function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  let prevEma = prices[0];
  emaArray.push(prevEma);

  for (let i = 1; i < prices.length; i++) {
    const currentEma = prices[i] * k + prevEma * (1 - k);
    emaArray.push(currentEma);
    prevEma = currentEma;
  }
  return emaArray;
}

// Bollinger Bands (20 period, 2 std dev)
export function calculateBollingerBands(candles: Candle[], period: number = 20): { upper: number; middle: number; lower: number } {
  if (candles.length < period) {
    const last = candles[candles.length - 1]?.close || 100;
    return { upper: last * 1.02, middle: last, lower: last * 0.98 };
  }

  const slice = candles.slice(-period);
  const sum = slice.reduce((acc, c) => acc + c.close, 0);
  const mean = sum / period;

  const squaredDiffs = slice.map(c => Math.pow(c.close - mean, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: parseFloat((mean + stdDev * 2).toFixed(4)),
    middle: parseFloat(mean.toFixed(4)),
    lower: parseFloat((mean - stdDev * 2).toFixed(4)),
  };
}

// Format numbers for crypto prices cleanly
export function formatCryptoPrice(price: number | string): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0.00';
  if (num >= 1000) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (num >= 1) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  } else if (num >= 0.0001) {
    return num.toFixed(6);
  } else {
    return num.toFixed(8);
  }
}

// Format currency in USDT
export function formatUSDT(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  const cleanNum = Number(amount);
  if (isNaN(cleanNum)) return '$0.00';
  return '$' + cleanNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format large volumes with K, M, B
export function formatVolume(volume: number | string): string {
  const val = typeof volume === 'string' ? parseFloat(volume) : volume;
  if (isNaN(val)) return '0';
  if (val >= 1_000_000_000) {
    return (val / 1_000_000_000).toFixed(2) + 'B';
  }
  if (val >= 1_000_000) {
    return (val / 1_000_000).toFixed(2) + 'M';
  }
  if (val >= 1_000) {
    return (val / 1_000).toFixed(1) + 'K';
  }
  return val.toFixed(0);
}

// Binance Standard Spot Trading Fee Rates
export const BINANCE_SPOT_MAKER_TAKER_FEE = 0.0010; // 0.10% per trade
export const BINANCE_SPOT_ROUNDTRIP_FEE = 0.0020;   // 0.20% (Buy + Sell combined)

// Calculate Binance commission for a trade amount in USDT
export function calculateBinanceFee(amountUsdt: number, feeRate: number = BINANCE_SPOT_MAKER_TAKER_FEE): number {
  return parseFloat((amountUsdt * feeRate).toFixed(4));
}

// Calculate Net Scalp Profit after deducting Binance round-trip commissions
export function calculateNetScalpProfit(
  entryPrice: number,
  exitPrice: number,
  capitalUsdt: number,
  feeRate: number = BINANCE_SPOT_MAKER_TAKER_FEE
): {
  grossPnlUsdt: number;
  grossPnlPercent: number;
  binanceFeeUsdt: number;
  netPnlUsdt: number;
  netPnlPercent: number;
  isNetProfitable: boolean;
} {
  if (entryPrice <= 0 || capitalUsdt <= 0) {
    return {
      grossPnlUsdt: 0,
      grossPnlPercent: 0,
      binanceFeeUsdt: 0,
      netPnlUsdt: 0,
      netPnlPercent: 0,
      isNetProfitable: false,
    };
  }

  const rawPnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
  const grossPnlUsdt = (capitalUsdt * rawPnlPercent) / 100;

  // Buy fee (0.10% of entry capital) + Sell fee (0.10% of returned capital)
  const buyFee = capitalUsdt * feeRate;
  const sellCapital = Math.max(0, capitalUsdt + grossPnlUsdt);
  const sellFee = sellCapital * feeRate;
  const binanceFeeUsdt = buyFee + sellFee;

  const netPnlUsdt = grossPnlUsdt - binanceFeeUsdt;
  const netPnlPercent = (netPnlUsdt / capitalUsdt) * 100;

  return {
    grossPnlUsdt: parseFloat(grossPnlUsdt.toFixed(2)),
    grossPnlPercent: parseFloat(rawPnlPercent.toFixed(2)),
    binanceFeeUsdt: parseFloat(binanceFeeUsdt.toFixed(4)),
    netPnlUsdt: parseFloat(netPnlUsdt.toFixed(2)),
    netPnlPercent: parseFloat(netPnlPercent.toFixed(2)),
    isNetProfitable: netPnlUsdt > 0,
  };
}
