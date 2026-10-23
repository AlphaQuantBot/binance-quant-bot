import React, { useMemo } from 'react';
import { formatCryptoPrice } from '../utils/cryptoMath';

interface OrderBookProps {
  currentPrice: number;
  symbol: string;
  onPriceClick?: (price: number) => void;
  language?: 'en' | 'tr';
}

export const OrderBook: React.FC<OrderBookProps> = ({
  currentPrice,
  symbol,
  onPriceClick,
  language = 'en'
}) => {
  const isTr = language === 'tr';
  // Generate realistic order book levels around currentPrice
  const { asks, bids, buyerRatio } = useMemo(() => {
    if (!currentPrice || isNaN(currentPrice)) {
      return { asks: [], bids: [], buyerRatio: 52 };
    }

    const step = currentPrice * 0.0004;
    const generatedAsks = [];
    const generatedBids = [];

    let totalAskVol = 0;
    let totalBidVol = 0;

    for (let i = 8; i >= 1; i--) {
      const price = currentPrice + i * step;
      const amount = (Math.random() * 2.5 + 0.1) * (currentPrice > 1000 ? 0.3 : 15);
      totalAskVol += amount;
      generatedAsks.push({ price, amount, total: totalAskVol });
    }

    for (let i = 1; i <= 8; i++) {
      const price = currentPrice - i * step;
      const amount = (Math.random() * 2.8 + 0.1) * (currentPrice > 1000 ? 0.35 : 16);
      totalBidVol += amount;
      generatedBids.push({ price, amount, total: totalBidVol });
    }

    const ratio = Math.round((totalBidVol / (totalBidVol + totalAskVol)) * 100);

    return { asks: generatedAsks, bids: generatedBids, buyerRatio: Math.min(85, Math.max(15, ratio)) };
  }, [currentPrice]);

  const maxTotal = Math.max(
    asks[0]?.total || 1,
    bids[bids.length - 1]?.total || 1
  );

  return (
    <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-3 flex flex-col h-full text-xs font-mono select-none">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/70 mb-2">
        <span className="font-semibold text-slate-300 font-sans">{isTr ? 'Emir Defteri' : 'Order Book'}</span>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-emerald-400">%{buyerRatio} {isTr ? 'Alıcı' : 'Bids'}</span>
          <span className="text-slate-500">/</span>
          <span className="text-rose-400">%{100 - buyerRatio} {isTr ? 'Satıcı' : 'Asks'}</span>
        </div>
      </div>

      {/* Pressure Bar */}
      <div className="w-full h-1.5 bg-rose-950/60 rounded-full overflow-hidden flex mb-2">
        <div 
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${buyerRatio}%` }}
        />
      </div>

      {/* Headers */}
      <div className="grid grid-cols-3 text-slate-500 text-[10px] pb-1 px-1">
        <span>{isTr ? 'Fiyat(USDT)' : 'Price(USDT)'}</span>
        <span className="text-right">{isTr ? 'Miktar' : 'Size'}</span>
        <span className="text-right">{isTr ? 'Toplam' : 'Total'}</span>
      </div>

      {/* Asks (Sell orders - red) */}
      <div className="flex flex-col justify-end flex-1 space-y-0.5 overflow-hidden">
        {asks.map((ask, idx) => {
          const depthPercent = Math.min(100, (ask.total / maxTotal) * 100);
          return (
            <div
              key={`ask-${idx}`}
              onClick={() => onPriceClick && onPriceClick(ask.price)}
              className="relative grid grid-cols-3 px-1 py-0.5 cursor-pointer hover:bg-rose-500/10 transition-colors"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-rose-400 font-medium tabular-nums z-10">
                {formatCryptoPrice(ask.price)}
              </span>
              <span className="text-right text-slate-300 tabular-nums z-10">
                {ask.amount.toFixed(3)}
              </span>
              <span className="text-right text-slate-500 tabular-nums z-10">
                {ask.total.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mid Price readout */}
      <div className="py-2 my-1 border-y border-slate-800/80 flex items-center justify-between px-1 bg-slate-900/60">
        <span className="text-sm font-bold text-emerald-400 tabular-nums">
          {formatCryptoPrice(currentPrice)}
        </span>
        <span className="text-[10px] text-slate-400 font-sans">
          Spread: 0.01%
        </span>
      </div>

      {/* Bids (Buy orders - green) */}
      <div className="flex flex-col flex-1 space-y-0.5 overflow-hidden">
        {bids.map((bid, idx) => {
          const depthPercent = Math.min(100, (bid.total / maxTotal) * 100);
          return (
            <div
              key={`bid-${idx}`}
              onClick={() => onPriceClick && onPriceClick(bid.price)}
              className="relative grid grid-cols-3 px-1 py-0.5 cursor-pointer hover:bg-emerald-500/10 transition-colors"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-emerald-400 font-medium tabular-nums z-10">
                {formatCryptoPrice(bid.price)}
              </span>
              <span className="text-right text-slate-300 tabular-nums z-10">
                {bid.amount.toFixed(3)}
              </span>
              <span className="text-right text-slate-500 tabular-nums z-10">
                {bid.total.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
