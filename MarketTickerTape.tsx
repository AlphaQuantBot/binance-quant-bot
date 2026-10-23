import React from 'react';
import { Ticker } from '../types/crypto';
import { formatCryptoPrice } from '../utils/cryptoMath';

interface MarketTickerTapeProps {
  tickers: Ticker[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  isLoading: boolean;
  onOpenQuantToken?: () => void;
}

export const MarketTickerTape: React.FC<MarketTickerTapeProps> = ({
  tickers,
  selectedSymbol,
  onSelectSymbol,
  isLoading,
  onOpenQuantToken
}) => {
  // Show top 16 active pairs
  const displayTickers = tickers.slice(0, 16);

  if (isLoading && displayTickers.length === 0) {
    return (
      <div className="bg-[#0b101c] border-b border-slate-800/80 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs text-slate-500">
        <span className="animate-pulse">Connecting to Binance live feeds...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#0b101c] border-b border-slate-800/80 px-3 py-1.5 overflow-x-auto scrollbar-none flex items-center gap-2 select-none">
      {/* Binance Live Integration Status Badge */}
      <div className="flex items-center gap-2 pl-1 pr-3 border-r border-slate-800 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold text-xs text-amber-400 flex items-center gap-1 font-mono">
          BINANCE SPOT
        </span>
        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
          API v3 ACTIVE
        </span>
      </div>

      {/* Featured $QUANT Token Live Pill */}
      {onOpenQuantToken && (
        <button
          type="button"
          onClick={onOpenQuantToken}
          className="px-2.5 py-1 rounded flex items-center gap-2 text-xs font-mono transition-all whitespace-nowrap border bg-gradient-to-r from-amber-950/80 to-yellow-950/80 border-amber-500/50 text-amber-300 hover:border-amber-400 shadow-sm shrink-0"
          title="View $QUANT Live Execution Record & Token Utility"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold text-white flex items-center gap-1">
              $QUANT<span className="text-[10px] text-amber-400/80 font-normal">/BNB</span>
            </span>
          </div>
          <span className="font-semibold text-amber-200 tabular-nums">
            $0.0485
          </span>
          <span className="text-[11px] font-bold tabular-nums text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-0.5">
            🔥 +1,425%
          </span>
          <span className="text-[10px] text-amber-300 underline ml-0.5 hidden sm:inline">
            Explore Track Record
          </span>
        </button>
      )}

      {displayTickers.map((t, idx) => {
        const change = parseFloat(t.priceChangePercent || '0');
        const isSelected = t.symbol === selectedSymbol;
        const isUp = change >= 0;

        return (
          <button
            key={`${t.symbol}-${idx}`}
            onClick={() => onSelectSymbol(t.symbol)}
            className={`px-2.5 py-1 rounded flex items-center gap-2 text-xs font-mono transition-all whitespace-nowrap border ${
              isSelected
                ? 'bg-slate-800/90 border-emerald-500/40 text-slate-100 shadow-sm'
                : 'bg-slate-900/40 border-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span className="font-semibold text-slate-200">
              {t.symbol.replace('USDT', '')}
              <span className="text-[10px] text-slate-500 font-normal">/USDT</span>
            </span>
            <span className="font-medium text-slate-100 tabular-nums">
              {formatCryptoPrice(t.lastPrice)}
            </span>
            <span
              className={`text-[11px] font-medium tabular-nums ${
                isUp ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isUp ? '+' : ''}{change.toFixed(2)}%
            </span>
          </button>
        );
      })}
    </div>
  );
};
