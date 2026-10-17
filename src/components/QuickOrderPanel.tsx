import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Target, 
  Zap, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import { Ticker } from '../types/crypto';
import { formatCryptoPrice, formatUSDT } from '../utils/cryptoMath';
import { evaluateTokenStrict, getBestBuyCandidates } from '../utils/tokenFilter';

interface QuickOrderPanelProps {
  currentPrice: number;
  symbol: string;
  balanceUsdt: number;
  totalVaultUsdt?: number;
  tickers?: Ticker[];
  onSelectSymbol?: (sym: string) => void;
  onExecuteTrade: (params: {
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET';
    price: number;
    amount: number;
    totalUsdt: number;
    stopLossPercent?: number;
    takeProfitPercent?: number;
  }) => void;
}

export const QuickOrderPanel: React.FC<QuickOrderPanelProps> = ({
  currentPrice,
  symbol,
  balanceUsdt,
  totalVaultUsdt,
  tickers,
  onSelectSymbol,
  onExecuteTrade,
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('MARKET');
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice.toString());
  const maxSafeSingleTrade = Math.max(10, Math.min(13, parseFloat((balanceUsdt * 0.22).toFixed(2))));
  const safeDefaultTrade = Math.max(10, Math.min(maxSafeSingleTrade, 12));
  const [usdtAmount, setUsdtAmount] = useState<string>(() => safeDefaultTrade.toString());
  const [useStopLoss, setUseStopLoss] = useState<boolean>(true);
  const [stopLossPercent, setStopLossPercent] = useState<number>(2.0);
  const [useTakeProfit, setUseTakeProfit] = useState<boolean>(true);
  const [takeProfitPercent, setTakeProfitPercent] = useState<number>(4.5);

  const baseSymbol = symbol.replace('USDT', '');
  const executionPrice = orderType === 'MARKET' ? currentPrice : (parseFloat(limitPrice) || currentPrice);

  const currentTicker = useMemo(() => tickers?.find(t => t.symbol === symbol), [tickers, symbol]);
  const tokenEvaluation = useMemo(() => {
    if (!currentTicker) return null;
    return evaluateTokenStrict(currentTicker);
  }, [currentTicker]);

  const bestCandidate = useMemo(() => {
    if (!tickers || tickers.length === 0) return null;
    const candidates = getBestBuyCandidates(tickers, undefined, 1);
    return candidates[0] || null;
  }, [tickers]);

  const clampedUsdt = side === 'BUY' && parseFloat(usdtAmount) > maxSafeSingleTrade
    ? maxSafeSingleTrade
    : (parseFloat(usdtAmount) || 0);
  const amountCrypto = executionPrice > 0 ? clampedUsdt / executionPrice : 0;

  const handlePercentageSelect = (pct: number) => {
    const val = (balanceUsdt * pct) / 100;
    const safeVal = Math.min(maxSafeSingleTrade, Math.max(10, val));
    setUsdtAmount(safeVal.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let total = parseFloat(usdtAmount);
    if (!total || total <= 0) return;

    // Sert Portföy Koruma Kalkanı: Tek tokene max %22 (max $13 USDT)
    if (side === 'BUY' && total > maxSafeSingleTrade) {
      total = maxSafeSingleTrade;
      setUsdtAmount(maxSafeSingleTrade.toFixed(2));
    }

    onExecuteTrade({
      side,
      type: orderType,
      price: executionPrice,
      amount: amountCrypto,
      totalUsdt: total,
      stopLossPercent: useStopLoss ? stopLossPercent : undefined,
      takeProfitPercent: useTakeProfit ? takeProfitPercent : undefined,
    });
  };

  return (
    <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-3 text-xs font-mono select-none flex flex-col justify-between">
      <div>
        {/* Buy / Sell Tabs */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-900/80 rounded border border-slate-800 mb-3">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors ${
              side === 'BUY'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            ALIM (BUY)
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors ${
              side === 'SELL'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            SATIM (SELL)
          </button>
        </div>

        {/* Sert Token Alım Filtresi Değerlendirmesi */}
        {side === 'BUY' && (
          <div className="mb-2.5">
            {tokenEvaluation && tokenEvaluation.passedStrictFilter ? (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded p-2 text-[10px] text-emerald-200 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Sert Filtre Onaylı</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    Kâr Skoru: {tokenEvaluation.profitScore}/100
                  </span>
                  <span className="text-cyan-300">
                    TP: +%{tokenEvaluation.recommendedTakeProfitPercent}
                  </span>
                </div>
              </div>
            ) : tokenEvaluation && !tokenEvaluation.passedStrictFilter ? (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded p-2 text-[10px] text-amber-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Sert Alım Filtresi Uyarısı:</span>
                </div>
                <p className="text-slate-300 font-sans leading-tight">
                  {tokenEvaluation.rejectionReason}
                </p>
                {bestCandidate && onSelectSymbol && bestCandidate.symbol !== symbol && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSymbol(bestCandidate.symbol);
                      if (bestCandidate.recommendedTakeProfitPercent) {
                        setTakeProfitPercent(bestCandidate.recommendedTakeProfitPercent);
                      }
                    }}
                    className="w-full mt-1 bg-cyan-900/60 hover:bg-cyan-800/80 text-cyan-200 border border-cyan-500/40 rounded py-1 px-2 font-mono text-[10px] flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>🎯 En Yüksek Kâr Potansiyeline Geç: {bestCandidate.symbol} (Skor: {bestCandidate.profitScore})</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Order Type Toggle */}
        <div className="flex items-center justify-between text-slate-400 mb-2 font-sans">
          <span>Emir Türü:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOrderType('MARKET')}
              className={`px-2 py-0.5 rounded text-xs font-mono ${
                orderType === 'MARKET' ? 'bg-slate-700 text-slate-100 font-bold' : 'hover:text-slate-200'
              }`}
            >
              Piyasa (Market)
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderType('LIMIT');
                setLimitPrice(currentPrice.toString());
              }}
              className={`px-2 py-0.5 rounded text-xs font-mono ${
                orderType === 'LIMIT' ? 'bg-slate-700 text-slate-100 font-bold' : 'hover:text-slate-200'
              }`}
            >
              Limit
            </button>
          </div>
        </div>

        {/* Limit Price Input */}
        {orderType === 'LIMIT' && (
          <div className="mb-2">
            <label className="text-slate-400 text-[10px] block mb-1">Limit Fiyat (USDT)</label>
            <input
              type="number"
              step="any"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 tabular-nums focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}

        {/* USDT Amount Input */}
        <div className="mb-2">
          <div className="flex justify-between items-center text-slate-400 text-[10px] mb-1">
            <span>Tutar (USDT)</span>
            <span>
              Kullanılabilir: <strong className="text-emerald-400">{formatUSDT(balanceUsdt)}</strong>
              {totalVaultUsdt !== undefined && totalVaultUsdt > balanceUsdt && (
                <span className="text-slate-500 ml-1">(Toplam Kasa: {formatUSDT(totalVaultUsdt)})</span>
              )}
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={usdtAmount}
              onChange={(e) => setUsdtAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 tabular-nums focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-2.5 top-1.5 text-slate-500 text-[10px]">USDT</span>
          </div>
        </div>

        {/* Quick Percentage Chips - Intraday Risk Management (Max %25 per token) */}
        <div className="grid grid-cols-4 gap-1 mb-2">
          {[10, 15, 20, 25].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handlePercentageSelect(pct)}
              className="py-1 bg-slate-800/80 hover:bg-slate-700 rounded text-[10px] text-slate-300 font-mono transition-colors"
              title={`Kasanın %${pct}'ini ayır (Gün içi scalping koruması)`}
            >
              %{pct}
            </button>
          ))}
        </div>

        {parseFloat(usdtAmount) > balanceUsdt * 0.25 && balanceUsdt > 20 && (
          <div className="mb-2 p-1.5 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-300 flex items-center gap-1.5 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
            <span>Risk Uyarısı: Kasanın %25'inden fazlasını tek tokene bağlamak sermayeyi kilitler.</span>
          </div>
        )}

        {/* Automated Risk Management Controls */}
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80 space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={useStopLoss}
                onChange={(e) => setUseStopLoss(e.target.checked)}
                className="rounded border-slate-700 text-rose-500 focus:ring-0"
              />
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>Dinamik Stop-Loss</span>
            </label>
            {useStopLoss && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500">%</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="15"
                  value={stopLossPercent}
                  onChange={(e) => setStopLossPercent(parseFloat(e.target.value) || 2.0)}
                  className="w-12 bg-slate-800 text-center rounded py-0.5 text-slate-200 border border-slate-700 tabular-nums"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={useTakeProfit}
                onChange={(e) => setUseTakeProfit(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0"
              />
              <Target className="w-3 h-3 text-emerald-400" />
              <span>Kâr Al (Take Profit)</span>
            </label>
            {useTakeProfit && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500">%</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="50"
                  value={takeProfitPercent}
                  onChange={(e) => setTakeProfitPercent(parseFloat(e.target.value) || 4.5)}
                  className="w-12 bg-slate-800 text-center rounded py-0.5 text-slate-200 border border-slate-700 tabular-nums"
                />
              </div>
            )}
          </div>
        </div>

        {/* Calculation summary */}
        <div className="text-[11px] text-slate-400 space-y-1 mb-3 bg-slate-900/30 p-2 rounded">
          <div className="flex justify-between">
            <span>Alınacak Miktar:</span>
            <span className="text-slate-200 tabular-nums">{amountCrypto.toFixed(4)} {baseSymbol}</span>
          </div>
          {useStopLoss && (
            <div className="flex justify-between text-rose-400/90">
              <span>Stop Tetikleme:</span>
              <span className="tabular-nums">
                {formatCryptoPrice(executionPrice * (side === 'BUY' ? (1 - stopLossPercent / 100) : (1 + stopLossPercent / 100)))}
              </span>
            </div>
          )}
          {useTakeProfit && (
            <div className="flex justify-between text-emerald-400/90">
              <span>Kâr Hedefi:</span>
              <span className="tabular-nums">
                {formatCryptoPrice(executionPrice * (side === 'BUY' ? (1 + takeProfitPercent / 100) : (1 - takeProfitPercent / 100)))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Execution Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        className={`w-full py-2.5 rounded font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-md ${
          side === 'BUY'
            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/10'
            : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/10'
        }`}
      >
        <Zap className="w-3.5 h-3.5" />
        {side === 'BUY' ? `${baseSymbol} SATIN AL` : `${baseSymbol} SAT`}
      </button>
    </div>
  );
};
