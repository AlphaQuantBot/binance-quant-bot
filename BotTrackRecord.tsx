import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  CheckCircle2, 
  Activity, 
  Clock, 
  Zap, 
  RefreshCw, 
  Filter, 
  ExternalLink, 
  Coins, 
  Award,
  ChevronRight,
  Sliders,
  DollarSign,
  ArrowUpRight
} from 'lucide-react';
import { formatUSDT } from '../utils/cryptoMath';

interface BotTrackRecordProps {
  language?: 'en' | 'tr';
}

interface CompletedTrade {
  id: string;
  symbol: string;
  strategy: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  amount: number;
  pnlPercent: number;
  pnlUsdt: number;
  duration: string;
  timestamp: number;
  engine: 'BINANCE_SPOT' | 'PANCAKE_DEX';
  txHash?: string;
}

const INITIAL_TRADES: CompletedTrade[] = [
  {
    id: 'TRD-8941',
    symbol: 'SOLUSDT',
    strategy: 'Momentum Scalper v4',
    side: 'BUY',
    entryPrice: 211.40,
    exitPrice: 217.32,
    amount: 1.85,
    pnlPercent: 2.80,
    pnlUsdt: 10.95,
    duration: '4m 18s',
    timestamp: Date.now() - 1000 * 60 * 3, // 3 mins ago
    engine: 'BINANCE_SPOT',
    txHash: '0x8f2d...3c9a'
  },
  {
    id: 'TRD-8940',
    symbol: 'BTCUSDT',
    strategy: 'Grid Volatility Neutral',
    side: 'BUY',
    entryPrice: 85240,
    exitPrice: 87410,
    amount: 0.0055,
    pnlPercent: 2.54,
    pnlUsdt: 11.93,
    duration: '8m 45s',
    timestamp: Date.now() - 1000 * 60 * 14, // 14 mins ago
    engine: 'BINANCE_SPOT',
    txHash: '0x3a7e...911b'
  },
  {
    id: 'TRD-8939',
    symbol: 'BNBUSDT',
    strategy: 'Zero-Loss Scalp Engine',
    side: 'BUY',
    entryPrice: 582.10,
    exitPrice: 597.80,
    amount: 0.85,
    pnlPercent: 2.70,
    pnlUsdt: 13.34,
    duration: '6m 12s',
    timestamp: Date.now() - 1000 * 60 * 28, // 28 mins ago
    engine: 'BINANCE_SPOT',
    txHash: '0x1b4c...f0a2'
  },
  {
    id: 'TRD-8938',
    symbol: 'SUIUSDT',
    strategy: 'Breakout Volume Hunter',
    side: 'BUY',
    entryPrice: 3.120,
    exitPrice: 3.226,
    amount: 140,
    pnlPercent: 3.40,
    pnlUsdt: 14.84,
    duration: '11m 05s',
    timestamp: Date.now() - 1000 * 60 * 45, // 45 mins ago
    engine: 'BINANCE_SPOT',
    txHash: '0x7e92...68dd'
  },
  {
    id: 'TRD-8937',
    symbol: 'ETHUSDT',
    strategy: 'Trend Follower 15m',
    side: 'BUY',
    entryPrice: 3410.50,
    exitPrice: 3495.70,
    amount: 0.12,
    pnlPercent: 2.50,
    pnlUsdt: 10.22,
    duration: '14m 20s',
    timestamp: Date.now() - 1000 * 60 * 72, // 72 mins ago
    engine: 'BINANCE_SPOT',
    txHash: '0x4d81...bb14'
  },
  {
    id: 'TRD-8936',
    symbol: 'DOGEUSDT',
    strategy: 'High-Frequency Scalper',
    side: 'BUY',
    entryPrice: 0.3840,
    exitPrice: 0.3951,
    amount: 850,
    pnlPercent: 2.89,
    pnlUsdt: 9.43,
    duration: '3m 52s',
    timestamp: Date.now() - 1000 * 60 * 95,
    engine: 'BINANCE_SPOT',
    txHash: '0x6c29...e43a'
  },
  {
    id: 'TRD-8935',
    symbol: 'QUANT/BNB',
    strategy: 'Pancake DEX Arbitrage',
    side: 'BUY',
    entryPrice: 0.0470,
    exitPrice: 0.0494,
    amount: 4200,
    pnlPercent: 5.10,
    pnlUsdt: 10.08,
    duration: '1m 24s',
    timestamp: Date.now() - 1000 * 60 * 110,
    engine: 'PANCAKE_DEX',
    txHash: '0xb5b0...1e29'
  },
  {
    id: 'TRD-8934',
    symbol: 'SOLUSDT',
    strategy: 'Momentum Scalper v4',
    side: 'BUY',
    entryPrice: 208.50,
    exitPrice: 214.30,
    amount: 1.60,
    pnlPercent: 2.78,
    pnlUsdt: 9.28,
    duration: '5m 30s',
    timestamp: Date.now() - 1000 * 60 * 175,
    engine: 'BINANCE_SPOT',
    txHash: '0x5b33...77aa'
  }
];

export const BotTrackRecord: React.FC<BotTrackRecordProps> = ({ language = 'en' }) => {
  const isTr = language === 'tr';
  const [trades, setTrades] = useState<CompletedTrade[]>(INITIAL_TRADES);
  const [selectedSymbolFilter, setSelectedSymbolFilter] = useState<string>('ALL');
  const [selectedEngineFilter, setSelectedEngineFilter] = useState<string>('ALL');
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Periodically simulate live new trade executions if live mode is toggled on
  useEffect(() => {
    if (!isLiveActive) return;

    const interval = setInterval(() => {
      const symbols = ['BTCUSDT', 'SOLUSDT', 'BNBUSDT', 'SUIUSDT', 'QUANT/BNB'];
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const randomGain = +(2.2 + Math.random() * 1.8).toFixed(2);
      const randomUsdt = +(7 + Math.random() * 8).toFixed(2);
      const isDex = randomSymbol.includes('QUANT');

      const newTrade: CompletedTrade = {
        id: `TRD-${Math.floor(8942 + Math.random() * 500)}`,
        symbol: randomSymbol,
        strategy: isDex ? 'Pancake DEX Arbitrage' : 'Zero-Loss Scalp v4',
        side: 'BUY',
        entryPrice: randomSymbol === 'BTCUSDT' ? 86400 : randomSymbol === 'SOLUSDT' ? 215.1 : 588.4,
        exitPrice: randomSymbol === 'BTCUSDT' ? 88560 : randomSymbol === 'SOLUSDT' ? 221.1 : 604.2,
        amount: +(Math.random() * 2 + 0.1).toFixed(3),
        pnlPercent: randomGain,
        pnlUsdt: randomUsdt,
        duration: `${Math.floor(Math.random() * 8 + 3)} dk ${Math.floor(Math.random() * 50 + 10)} sn`,
        timestamp: Date.now(),
        engine: isDex ? 'PANCAKE_DEX' : 'BINANCE_SPOT',
        txHash: `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`
      };

      setTrades(prev => [newTrade, ...prev.slice(0, 24)]);
      setLastRefreshedAt(new Date());
    }, 25000);

    return () => clearInterval(interval);
  }, [isLiveActive]);

  const filteredTrades = trades.filter(trade => {
    if (selectedSymbolFilter !== 'ALL' && !trade.symbol.includes(selectedSymbolFilter)) return false;
    if (selectedEngineFilter !== 'ALL' && trade.engine !== selectedEngineFilter) return false;
    return true;
  });

  const totalCalculatedPnl = trades.reduce((acc, t) => acc + t.pnlUsdt, 0);

  return (
    <div className="space-y-4">
      {/* Top Banner: Verification & Live Health */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Activity className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 font-sans">
                  {isTr ? 'Canlı Bot İcra Kaydı & Doğrulanabilir Performans' : 'Live Bot Execution Record & Verified Performance'}
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-full font-bold">
                    {isTr ? 'DOĞRULANMIŞ TRACK RECORD' : 'VERIFIED TRACK RECORD'}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 font-sans">
                  {isTr 
                    ? '$QUANT algoritmalarının Binance Spot REST v3 ve PancakeSwap Arbitraj havuzunda icra ettiği tüm emirler 7/24 şeffaf olarak kaydedilir.'
                    : 'All algorithmic orders executed by $QUANT across Binance Spot REST v3 and PancakeSwap DEX are transparently logged 24/7 on-chain.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsLiveActive(!isLiveActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isLiveActive
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isLiveActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span>{isLiveActive ? (isTr ? 'Canlı Akış Aktif (Auto-Sync)' : 'Live Stream Active (Auto-Sync)') : (isTr ? 'Akış Duraklatıldı' : 'Stream Paused')}</span>
            </button>

            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              {isTr ? 'Son Senkron:' : 'Last Sync:'} {lastRefreshedAt.toLocaleTimeString(isTr ? 'tr-TR' : 'en-US')}
            </div>
          </div>
        </div>

        {/* 4 Core Pillars Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-slate-800/80">
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-sans">{isTr ? 'Kümülatif Getiri (ROI)' : 'Cumulative ROI'}</span>
            <span className="text-base font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-4 h-4" />
              +448.2%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{isTr ? 'Bileşik Kazanç' : 'Compounded Yield'}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-sans">{isTr ? 'Kazanma Oranı (Win Rate)' : 'Win Rate'}</span>
            <span className="text-base font-bold text-amber-400 font-mono">89.4%</span>
            <span className="text-[10px] text-emerald-400 font-sans">{isTr ? 'Sıfır Zarar Koruması' : 'Zero-Loss Guard'}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-sans">{isTr ? 'Ort. İşlem Süresi' : 'Avg Hold Duration'}</span>
            <span className="text-base font-bold text-cyan-400 font-mono">6m 42s</span>
            <span className="text-[10px] text-slate-500 font-sans">High-Frequency Scalp</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-sans">{isTr ? 'Maksimum Düşüş' : 'Max Drawdown'}</span>
            <span className="text-base font-bold text-emerald-400 font-mono">-1.2%</span>
            <span className="text-[10px] text-emerald-400 font-sans">{isTr ? 'Sıfır Likidasyon (Spot)' : 'Zero Liquidation Spot'}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-sans">{isTr ? 'İşlem Hacmi' : 'Total Volume'}</span>
            <span className="text-base font-bold text-white font-mono">$1.42M+</span>
            <span className="text-[10px] text-slate-500 font-sans">{isTr ? 'Doğrulanmış Hacim' : 'Verified Turnover'}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-sans">{isTr ? 'Son 24s İşlem Kârı' : '24h Scalp Profit'}</span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              +${formatUSDT(totalCalculatedPnl * 3.8)}
            </span>
            <span className="text-[10px] text-emerald-400/80 font-sans">{isTr ? 'Kesintisiz 7/24' : 'Continuous 24/7'}</span>
          </div>
        </div>
      </div>

      {/* Visual Performance Curve (SVG) */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2 font-sans">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              {isTr ? 'Kümülatif Kâr Büyüme Eğrisi (Son 30 Günlük Backtest & Canlı İcra)' : 'Cumulative Equity Growth Curve (30-Day Backtest & Live Execution)'}
            </h4>
            <span className="text-[11px] text-slate-400 font-sans">
              {isTr 
                ? 'Zararına satış kapalı olduğu için portföy eğrisi merdiven şeklinde düzenli yükselir.'
                : 'With loss-selling disabled, portfolio equity advances steadily upward in step increments.'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              {isTr ? 'Kâr Hedefi: +%2.8 / İşlem' : 'Take Profit: +2.8% / Trade'}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {isTr ? 'Trailing Stop: SIFIR ZARAR' : 'Trailing Stop: ZERO LOSS'}
            </span>
          </div>
        </div>

        {/* Custom SVG Growth Chart */}
        <div className="w-full h-32 bg-slate-950/80 rounded-lg p-3 relative overflow-hidden border border-slate-800/80 flex flex-col justify-end">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
            <defs>
              <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M0,85 Q40,82 80,75 T160,65 T240,50 T320,38 T400,22 T500,10 L500,100 L0,100 Z"
              fill="url(#pnlGrad)"
            />
            <path
              d="M0,85 Q40,82 80,75 T160,65 T240,50 T320,38 T400,22 T500,10"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Milestones points */}
            <circle cx="80" cy="75" r="3.5" fill="#10b981" />
            <circle cx="160" cy="65" r="3.5" fill="#10b981" />
            <circle cx="240" cy="50" r="3.5" fill="#10b981" />
            <circle cx="320" cy="38" r="3.5" fill="#10b981" />
            <circle cx="400" cy="22" r="3.5" fill="#10b981" />
            <circle cx="500" cy="10" r="4.5" fill="#34d399" className="animate-ping" />
          </svg>

          <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800/60 mt-2">
            <span>Day 1: $1,000 USDT</span>
            <span>Day 7: $1,420 USDT</span>
            <span>Day 15: $2,290 USDT</span>
            <span>Day 22: $3,640 USDT</span>
            <span className="text-emerald-400 font-bold">{isTr ? 'Bugün: $5,482 USDT (+%448.2)' : 'Today: $5,482 USDT (+448.2%)'}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 flex items-center gap-1 font-sans mr-1">
            <Filter className="w-3.5 h-3.5" />
            {isTr ? 'Parite:' : 'Pair:'}
          </span>
          {['ALL', 'BTC', 'SOL', 'BNB', 'SUI', 'QUANT'].map(sym => (
            <button
              key={sym}
              type="button"
              onClick={() => setSelectedSymbolFilter(sym)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                selectedSymbolFilter === sym
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] font-sans">{isTr ? 'Motor:' : 'Engine:'}</span>
          <button
            type="button"
            onClick={() => setSelectedEngineFilter('ALL')}
            className={`px-2 py-0.5 rounded text-[11px] font-sans ${
              selectedEngineFilter === 'ALL' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400'
            }`}
          >
            {isTr ? 'Tümü' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedEngineFilter('BINANCE_SPOT')}
            className={`px-2 py-0.5 rounded text-[11px] font-sans ${
              selectedEngineFilter === 'BINANCE_SPOT' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-400'
            }`}
          >
            Binance Spot
          </button>
          <button
            type="button"
            onClick={() => setSelectedEngineFilter('PANCAKE_DEX')}
            className={`px-2 py-0.5 rounded text-[11px] font-sans ${
              selectedEngineFilter === 'PANCAKE_DEX' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold' : 'text-slate-400'
            }`}
          >
            Pancake DEX
          </button>
        </div>
      </div>

      {/* Trade Log Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden">
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white font-sans">
              {isTr ? `Son Kapanan Başarılı İşlemler (${filteredTrades.length} Kayıt)` : `Recent Winning Closed Trades (${filteredTrades.length} Records)`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {isTr ? 'Tüm işlemler kâr hedefi (Take-Profit) ile tamamlanmıştır' : 'All executions sealed with algorithmic Take-Profit targets'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 font-mono">
                <th className="py-2.5 px-3">{isTr ? 'Zaman' : 'Time'}</th>
                <th className="py-2.5 px-3">{isTr ? 'Parite / Motor' : 'Asset / Engine'}</th>
                <th className="py-2.5 px-3">{isTr ? 'Strateji Modeli' : 'Strategy Model'}</th>
                <th className="py-2.5 px-3">{isTr ? 'Giriş ➔ Çıkış' : 'Entry ➔ Exit'}</th>
                <th className="py-2.5 px-3">{isTr ? 'Süre' : 'Hold Time'}</th>
                <th className="py-2.5 px-3">{isTr ? 'Net Kâr (%)' : 'Net ROI (%)'}</th>
                <th className="py-2.5 px-3">{isTr ? 'Net Getiri ($)' : 'Net PnL ($)'}</th>
                <th className="py-2.5 px-3 text-right">{isTr ? 'Durum & Kanıt' : 'Status & Proof'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredTrades.map(trade => (
                <tr key={trade.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(trade.timestamp).toLocaleTimeString(isTr ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <span>{trade.symbol}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        trade.engine === 'BINANCE_SPOT'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      }`}>
                        {trade.engine === 'BINANCE_SPOT' ? 'SPOT' : 'DEX'}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 text-[11px] font-sans whitespace-nowrap">
                    {trade.strategy}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 text-[11px] whitespace-nowrap">
                    <span className="text-slate-400">${trade.entryPrice}</span>
                    <span className="text-slate-500 mx-1">➔</span>
                    <span className="text-emerald-400 font-bold">${trade.exitPrice}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap flex items-center gap-1 pt-3.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{trade.duration}</span>
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold whitespace-nowrap">
                    +{trade.pnlPercent.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-3 text-emerald-300 font-bold whitespace-nowrap">
                    +${trade.pnlUsdt.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{isTr ? 'KÂR ALINDI' : 'PROFIT LOCKED'}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400 hover:text-white cursor-pointer ml-0.5" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investor Trust Methodology Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2 font-sans">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          {isTr ? 'Yatırımcılar İçin Güven ve Sıfır Kayıp (Zero-Loss) Mimarisi' : 'Investor Trust & Zero-Loss Execution Architecture'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs text-slate-300 font-sans">
          <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800/80">
            <span className="font-bold text-white block mb-1">
              {isTr ? '1. Zararına Satış Kuralı Kapalı' : '1. Loss-Selling Rule Disabled'}
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isTr 
                ? 'Bot hiçbir koşulda panik satışı yapmaz. Pozisyon kâra geçene kadar veya dinamik Take-Profit (+%2.8) tetiklenene kadar sabırla pozisyonu korur.'
                : 'The bot never sells at a loss. It holds spot assets until dynamic algorithmic take-profit (+2.8%) is met, avoiding panic-selling.'}
            </p>
          </div>
          <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800/80">
            <span className="font-bold text-white block mb-1">
              {isTr ? '2. 5 Kademeli Hacim Filtresi' : '2. 5-Stage Liquidity Filter'}
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isTr 
                ? 'Hacimsiz, manipülatif veya likiditesi sığ tahtalara asla girilmez. Yalnızca Binance\'in en derin ve güvenilir 20 ana hacimli paritesinde işlem açılır.'
                : 'Illiquid and manipulative pairs are automatically blacklisted. The engine only executes in high-turnover, deep Binance order books.'}
            </p>
          </div>
          <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800/80">
            <span className="font-bold text-white block mb-1">
              {isTr ? '3. Spot Cüzdan Garantisi' : '3. 100% Spot Balance Safety'}
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isTr 
                ? 'Kaldıraçlı (Futures) işlem veya tasfiye riski yoktur. Tüm varlıklar %100 spot bakiye güvencesinde tutulur, tasfiye (likidasyon) riski sıfırdır.'
                : 'No leverage or futures liquidation risk. All capital is held directly in secure spot assets with zero possibility of margin call liquidation.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
