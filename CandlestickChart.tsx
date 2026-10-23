import React, { useRef, useState, useMemo } from 'react';
import { Candle, TradeOrder } from '../types/crypto';
import { calculateEMA, formatCryptoPrice, formatVolume } from '../utils/cryptoMath';

interface CandlestickChartProps {
  candles: Candle[];
  symbol: string;
  interval: string;
  onIntervalChange: (interval: string) => void;
  recentOrders?: TradeOrder[];
  language?: 'en' | 'tr';
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  symbol,
  interval,
  onIntervalChange,
  recentOrders = [],
  language = 'en',
}) => {
  const isTr = language === 'tr';
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const intervals = ['1m', '5m', '15m', '1h', '4h', '1d'];

  // Calculations for scale
  const { minPrice, maxPrice, maxVolume, ema20, ema50 } = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { minPrice: 0, maxPrice: 100, maxVolume: 100, ema20: [], ema50: [] };
    }

    const prices = candles.map(c => c.close);
    const lows = candles.map(c => c.low);
    const highs = candles.map(c => c.high);
    const volumes = candles.map(c => c.volume);

    const minP = Math.min(...lows);
    const maxP = Math.max(...highs);
    const padding = (maxP - minP) * 0.05 || maxP * 0.01;

    const e20 = calculateEMA(prices, 20);
    const e50 = calculateEMA(prices, 50);

    return {
      minPrice: Math.max(0, minP - padding),
      maxPrice: maxP + padding,
      maxVolume: Math.max(...volumes, 1),
      ema20: e20,
      ema50: e50,
    };
  }, [candles]);

  const activeCandle = hoverIndex !== null && candles[hoverIndex] ? candles[hoverIndex] : candles[candles.length - 1];

  // Price to Y coordinate percentage
  const getY = (val: number) => {
    if (maxPrice === minPrice) return 50;
    return ((maxPrice - val) / (maxPrice - minPrice)) * 75; // chart occupies top 75%
  };

  // Volume to Y coordinate percentage
  const getVolY = (vol: number) => {
    const volHeight = (vol / maxVolume) * 22; // bottom 22%
    return 100 - volHeight;
  };

  return (
    <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-3 flex flex-col h-full select-none">
      {/* Chart Top Controls & Active OHLC Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white font-mono">{symbol}</span>
            <span className="text-xs text-slate-400 font-sans">Binance Spot</span>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded border border-slate-800">
            {intervals.map((int) => (
              <button
                key={int}
                onClick={() => onIntervalChange(int)}
                className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                  interval === int
                    ? 'bg-slate-700 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {int}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-amber-400 inline-block" /> EMA20
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-cyan-400 inline-block" /> EMA50
            </span>
          </div>
        </div>

        {/* OHLCV readout */}
        {activeCandle && (
          <div className="flex items-center gap-2.5 text-xs font-mono tabular-nums text-slate-400">
            <span>{isTr ? 'A:' : 'O:'} <strong className="text-slate-200">{formatCryptoPrice(activeCandle.open)}</strong></span>
            <span>{isTr ? 'Y:' : 'H:'} <strong className="text-emerald-400">{formatCryptoPrice(activeCandle.high)}</strong></span>
            <span>{isTr ? 'D:' : 'L:'} <strong className="text-rose-400">{formatCryptoPrice(activeCandle.low)}</strong></span>
            <span>{isTr ? 'K:' : 'C:'} <strong className={activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}>
              {formatCryptoPrice(activeCandle.close)}
            </strong></span>
            <span className="hidden xl:inline">{isTr ? 'Hacim:' : 'Vol:'} <strong className="text-slate-300">{formatVolume(activeCandle.volume)}</strong></span>
          </div>
        )}
      </div>

      {/* SVG Canvas Area */}
      <div 
        ref={containerRef}
        className="relative flex-1 w-full min-h-[340px] mt-2 overflow-hidden cursor-crosshair"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg 
          className="w-full h-full"
          preserveAspectRatio="none"
          viewBox={`0 0 ${Math.max(candles.length * 10, 100)} 100`}
        >
          <defs>
            <linearGradient id="volGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="volRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="20" x2="1000" y2="20" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="3 3" />
          <line x1="0" y1="40" x2="1000" y2="40" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="3 3" />
          <line x1="0" y1="60" x2="1000" y2="60" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="3 3" />
          <line x1="0" y1="75" x2="1000" y2="75" stroke="#334155" strokeWidth="0.4" />

          {/* Render Volume Bars */}
          {candles.map((c, i) => {
            const x = i * 10 + 2;
            const isUp = c.close >= c.open;
            const y = getVolY(c.volume);
            const height = Math.max(0.5, 100 - y);
            return (
              <rect
                key={`vol-${i}`}
                x={x}
                y={y}
                width={6}
                height={height}
                fill={isUp ? 'url(#volGreen)' : 'url(#volRed)'}
              />
            );
          })}

          {/* Render Candlesticks */}
          {candles.map((c, i) => {
            const x = i * 10 + 2;
            const isUp = c.close >= c.open;
            const candleColor = isUp ? '#10b981' : '#f43f5e';
            const topBody = Math.min(getY(c.open), getY(c.close));
            const bottomBody = Math.max(getY(c.open), getY(c.close));
            const bodyHeight = Math.max(0.6, bottomBody - topBody);
            const highY = getY(c.high);
            const lowY = getY(c.low);

            return (
              <g 
                key={`candle-${i}`} 
                onMouseEnter={() => setHoverIndex(i)}
                className="transition-opacity hover:opacity-80"
              >
                {/* Wick line */}
                <line
                  x1={x + 3}
                  y1={highY}
                  x2={x + 3}
                  y2={lowY}
                  stroke={candleColor}
                  strokeWidth="0.9"
                />
                {/* Body rect */}
                <rect
                  x={x}
                  y={topBody}
                  width="6"
                  height={bodyHeight}
                  fill={candleColor}
                  rx="0.5"
                />
              </g>
            );
          })}

          {/* Render EMA 20 line (Amber) */}
          {ema20.length > 1 && (
            <polyline
              fill="none"
              stroke="#fbbf24"
              strokeWidth="0.8"
              points={ema20.map((val, idx) => `${idx * 10 + 5},${getY(val)}`).join(' ')}
            />
          )}

          {/* Render EMA 50 line (Cyan) */}
          {ema50.length > 1 && (
            <polyline
              fill="none"
              stroke="#22d3ee"
              strokeWidth="0.8"
              points={ema50.map((val, idx) => `${idx * 10 + 5},${getY(val)}`).join(' ')}
            />
          )}

          {/* Buy/Sell markers from trade execution */}
          {Array.from(new Map(recentOrders.filter(o => o.symbol === symbol).map(o => [o.id, o])).values()).map((order, idx) => {
            const candleIdx = candles.length - 1; // latest position for current order visual
            const x = candleIdx * 10 + 5;
            const y = getY(order.price);
            const isBuy = order.side === 'BUY';

            return (
              <g key={`marker-${order.id}-${idx}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill={isBuy ? '#10b981' : '#f43f5e'}
                  stroke="#ffffff"
                  strokeWidth="0.8"
                />
                <text
                  x={x}
                  y={isBuy ? y + 8 : y - 5}
                  fontSize="4"
                  fill={isBuy ? '#34d399' : '#fb7185'}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {isBuy ? (isTr ? 'ALIM' : 'BUY') : (isTr ? 'SATIM' : 'SELL')}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Right price scale legend */}
        <div className="absolute right-1 top-2 bottom-6 flex flex-col justify-between text-[10px] font-mono tabular-nums text-slate-500 pointer-events-none">
          <span>{formatCryptoPrice(maxPrice)}</span>
          <span>{formatCryptoPrice((maxPrice + minPrice) * 0.75 / 1)}</span>
          <span>{formatCryptoPrice((maxPrice + minPrice) / 2)}</span>
          <span>{formatCryptoPrice((maxPrice + minPrice) * 0.25 / 1)}</span>
          <span>{formatCryptoPrice(minPrice)}</span>
        </div>
      </div>
    </div>
  );
};
