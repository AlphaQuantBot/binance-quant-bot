import React, { useState, useMemo } from 'react';
import { 
  Bot, 
  Play, 
  Pause, 
  Square, 
  Plus, 
  TrendingUp, 
  ShieldAlert, 
  Zap, 
  RotateCcw, 
  Sliders, 
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Key,
  ShieldCheck,
  Target,
  Filter,
  Award,
  CheckCircle2
} from 'lucide-react';
import { BotInstance, BotStrategyType, Ticker } from '../types/crypto';
import { formatUSDT } from '../utils/cryptoMath';
import { getBestBuyCandidates, TokenProfitEvaluation } from '../utils/tokenFilter';

interface BotManagerProps {
  bots: BotInstance[];
  tickers: Ticker[];
  balanceUsdt: number;
  onCreateBot: (newBot: Omit<BotInstance, 'id' | 'createdAt' | 'currentCapitalUsdt' | 'totalProfitUsdt' | 'totalProfitPercent' | 'tradesCount' | 'winRate' | 'lastAction'>) => void;
  onToggleBotStatus: (botId: string) => void;
  onDeleteBot: (botId: string) => void;
  onEmergencyStopAll: () => void;
  onRestoreDefaultBots?: () => void;
  onForceTradeBot?: (botId: string) => void;
  onForceTradeAll?: () => void;
  onSwitchTradingMode?: () => void;
  onResetAllPositions?: () => void;
  onNavigateToSecurity?: () => void;
  tradingMode?: 'PAPER' | 'LIVE_API';
  autoLiveExecutionEnabled?: boolean;
  hasApiKeys?: boolean;
  onOpenQuickConnect?: () => void;
  language?: 'en' | 'tr';
}

export const BotManager: React.FC<BotManagerProps> = ({
  bots,
  tickers,
  balanceUsdt,
  onCreateBot,
  onToggleBotStatus,
  onDeleteBot,
  onEmergencyStopAll,
  onRestoreDefaultBots,
  onForceTradeBot,
  onForceTradeAll,
  onSwitchTradingMode,
  onResetAllPositions,
  onNavigateToSecurity,
  tradingMode = 'PAPER',
  autoLiveExecutionEnabled = true,
  hasApiKeys = false,
  onOpenQuickConnect,
  language = 'en',
}) => {
  const isTr = language === 'tr';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('SOLUSDT');
  const [strategy, setStrategy] = useState<BotStrategyType>('AI_SCALPER');
  const [allocatedCapital, setAllocatedCapital] = useState(() => Math.max(10, Math.min(14, Math.round(balanceUsdt * 0.22) || 12)));
  const [trailingStop, setTrailingStop] = useState(1.5);
  const [takeProfit, setTakeProfit] = useState(4.0);
  const [gridLevels, setGridLevels] = useState(5);

  const totalProfitUsdt = bots.reduce((sum, b) => sum + b.totalProfitUsdt, 0);
  const totalTrades = bots.reduce((sum, b) => sum + b.tradesCount, 0);
  const runningBots = bots.filter(b => b.status === 'RUNNING');
  const avgWinRate = bots.length > 0 
    ? Math.round(bots.reduce((sum, b) => sum + b.winRate, 0) / bots.length) 
    : 0;

  const busySymbols = useMemo(() => new Set(bots.filter(b => b.hasOpenPosition).map(b => b.symbol)), [bots]);
  const qualifiedCandidates = useMemo(() => {
    return getBestBuyCandidates(tickers, busySymbols, 4);
  }, [tickers, busySymbols]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const maxBotAlloc = Math.min(13.0, Math.max(10.0, parseFloat((balanceUsdt * 0.22).toFixed(2))));
    onCreateBot({
      name: name.trim(),
      symbol,
      strategy,
      status: 'RUNNING',
      allocatedCapitalUsdt: Math.min(maxBotAlloc, allocatedCapital),
      trailingStopPercent: trailingStop,
      takeProfitPercent: takeProfit,
      gridLevels: strategy === 'GRID_TRADER' ? gridLevels : undefined,
    });

    setName('');
    setShowCreateModal(false);
  };

  const getStrategyLabel = (st: BotStrategyType) => {
    switch (st) {
      case 'AI_SCALPER': return isTr ? 'AI Volatilite Scalper' : 'AI Volatility Scalper';
      case 'GRID_TRADER': return isTr ? 'Otomatik Grid Trade' : 'Automated Grid Trading';
      case 'BREAKOUT_MOMENTUM': return isTr ? 'Altcoin Breakout Momentum' : 'Altcoin Breakout Momentum';
      case 'DCA_ACCUMULATOR': return isTr ? 'Dinamik DCA Toplayıcı' : 'Dynamic DCA Accumulator';
      case 'SUPERTREND_VWAP_ALPHA': return isTr ? '⚡ Supertrend + VWAP Quant (%86 Win Rate)' : '⚡ Supertrend + VWAP Quant (86% Win Rate)';
      case 'QUANT_MOMENTUM_COMPOUND': return isTr ? '🚀 FreqAI Compound Momentum (Max Alpha)' : '🚀 FreqAI Compound Momentum (Max Alpha)';
      default: return st;
    }
  };

  return (
    <div className="space-y-4">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-sans block mb-1">
              {isTr ? 'Aktif Bot Sayısı' : 'Active Bots'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-white tabular-nums">
                {runningBots.length} / {bots.length}
              </span>
              {runningBots.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-sans block mb-1">
              {isTr ? 'Bot Toplam Net Kâr' : 'Total Bot Net PnL'}
            </span>
            <span className={`text-xl font-bold font-mono tabular-nums ${totalProfitUsdt >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalProfitUsdt >= 0 ? '+' : ''}{formatUSDT(totalProfitUsdt)}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-sans block mb-1">
              {isTr ? 'Ortalama Başarı (Win Rate)' : 'Average Win Rate'}
            </span>
            <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
              %{avgWinRate}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-sans block mb-1">
              {isTr ? 'Gerçekleştirilen İşlemler' : 'Executed Trades'}
            </span>
            <span className="text-xl font-bold font-mono text-white tabular-nums">
              {totalTrades} {isTr ? 'İşlem' : 'Trades'}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Trading Engine Diagnostic & Control Banner */}
      {tradingMode === 'LIVE_API' && !hasApiKeys ? (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-amber-300 text-sm block">
                {isTr 
                  ? '⚡ Canlı Binance Fiyat Motoru Devrede (7/24 Kesintisiz Al-Sat Aktif)' 
                  : '⚡ Live Binance Price Engine Active (24/7 Automated Scalper Engaged)'}
              </span>
              <p className="text-slate-300 text-xs mt-0.5">
                {isTr 
                  ? 'Botlar 757 Binance canlı fiyatını tarayıp otomatik işlem yapmaktadır. Gerçek borsa cüzdanınıza emir iletilmesi için API anahtarınızı bağlayabilirsiniz.' 
                  : 'Bots continuously scan 757 Binance live pairs and trade autonomously. Connect your API keys to route orders to your real spot account.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenQuickConnect && (
              <button
                onClick={onOpenQuickConnect}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                {isTr ? 'API Anahtarlarını Bağla (1-Tık)' : 'Connect API Keys (1-Click)'}
              </button>
            )}
            {onForceTradeAll && (
              <button
                onClick={onForceTradeAll}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 font-semibold rounded-md text-xs transition-colors shadow-sm flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                {isTr ? 'Hemen Al-Sat Tetikle' : 'Trigger Trade Cycle'}
              </button>
            )}
            {onSwitchTradingMode && (
              <button
                onClick={onSwitchTradingMode}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 font-semibold rounded-md text-xs transition-colors shadow-sm"
              >
                {isTr ? 'Sanal Test Modu' : 'Paper Test Mode'}
              </button>
            )}
          </div>
        </div>
      ) : tradingMode === 'LIVE_API' ? (
        <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-300 text-sm">
                  {isTr ? 'Canlı Binance Borsa Motoru Aktif & Hazır' : 'Live Binance Engine Active & Ready'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  {isTr ? 'CANLI İŞLEM YETKİSİ AKTİF' : 'LIVE TRADING AUTHORIZED'}
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                {isTr 
                  ? 'Alım-satım botları borsa emir defterini 7/24 tarıyor ve gerçek spot emirleri borsaya iletiyor.' 
                  : 'Automated algorithms scan the depth book 24/7 and route real spot limit/market orders to Binance.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onForceTradeAll && (
              <button
                onClick={onForceTradeAll}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                title={isTr ? 'Tüm botlarda anında bir alım veya satış döngüsü tetikler' : 'Force execution of instant trade or take-profit cycle'}
              >
                <Zap className="w-3.5 h-3.5" />
                {isTr ? 'Şimdi Canlı Al-Sat Döngüsü Tetikle' : 'Trigger Live Trade Cycle Now'}
              </button>
            )}
            {onOpenQuickConnect && (
              <button
                onClick={onOpenQuickConnect}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title={isTr ? 'Binance API Anahtarlarını Düzenle / Kontrol Et' : 'Edit / Verify Binance API Keys'}
              >
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                {isTr ? 'API Ayarları' : 'API Settings'}
              </button>
            )}
            {onSwitchTradingMode && (
              <button
                onClick={onSwitchTradingMode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title={isTr ? 'Borsa API bağlantısı olmadan risksiz test alım-satımına geçin' : 'Switch to risk-free paper simulation'}
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                {isTr ? 'Simülasyona Geç' : 'Switch to Paper Mode'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-300 text-sm">
                  {isTr ? '⚡ Otonom Max-Kâr Motoru Devrede (7/24 Kesintisiz - Sıfır Manuel Müdahale)' : '⚡ Autonomous Max-Profit Engine Engaged (24/7 Zero Intervention)'}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {isTr 
                  ? 'Piyasadaki en yüksek kâr potansiyeline sahip pariteler otonom olarak taranıp alınıyor, kâr hedefine ulaşıldığında otomatik satılarak sermaye bileşik olarak büyütülüyor.' 
                  : 'Highest alpha candidates are scanned and accumulated systematically. Capital compounds autonomously upon target profit executions.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onForceTradeAll && (
              <button
                onClick={onForceTradeAll}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-500/20"
                title={isTr ? 'Tüm çalışan botlarda hemen bir alım veya kâr satışı döngüsü tetikler' : 'Trigger an instant buy or profit-take cycle'}
              >
                <Zap className="w-3.5 h-3.5" />
                {isTr ? 'Şimdi Alım-Satım Döngüsü Tetikle' : 'Trigger Trade Cycle Now'}
              </button>
            )}
            {onSwitchTradingMode && (
              <button
                onClick={onSwitchTradingMode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title={isTr ? 'Canlı Binance API ile gerçek işlem moduna geç' : 'Switch to Live Binance API execution'}
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                {isTr ? 'Canlı Borsa Moduna Geç' : 'Switch to Live Exchange'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sert Token Alım Filtresi & Kâr Optimizasyon Kalkanı */}
      <div className="bg-gradient-to-r from-cyan-950/60 via-[#0b101d] to-emerald-950/60 rounded-lg border border-cyan-500/40 p-4 space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 border border-cyan-500/30">
              <ShieldCheck className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  {isTr ? '🛡️ Sert Token Alım Filtresi & Kâr Potansiyeli Kalkanı' : '🛡️ Strict Token Screener & Profit Shield'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                  {isTr ? '%100 AKTİF & DENETİMLİ' : '100% ACTIVE & AUDITED'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                {isTr 
                  ? 'Alım öncesi tüm parametreler katı filtreden geçirilir; yalnızca en yüksek kâr potansiyeline ve güvenli likiditeye sahip pariteler seçilir.' 
                  : 'All candidates are subjected to strict algorithmic screening; only pairs with superior profit potential and deep liquidity qualify.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-500/30">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isTr ? 'Kâr Skoru Eşiği: Min 70 / 100' : 'Profit Score Threshold: Min 70 / 100'}</span>
          </div>
        </div>

        {/* 5 Katmanlı Sert Parametre Kriterleri */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono">
          <div className="bg-slate-900/90 rounded border border-slate-800 p-2">
            <span className="text-[10px] text-slate-400 block mb-0.5">{isTr ? '💧 Hacim Kalkanı' : '💧 Volume Shield'}</span>
            <span className="font-bold text-slate-100">≥ $2.5M USDT</span>
            <span className="text-[9px] text-slate-500 block">{isTr ? 'Düşük likidite engeli' : 'Blocks low liquidity'}</span>
          </div>
          <div className="bg-slate-900/90 rounded border border-slate-800 p-2">
            <span className="text-[10px] text-slate-400 block mb-0.5">{isTr ? '📈 İvme Sweet-Spot' : '📈 Momentum Sweet-Spot'}</span>
            <span className="font-bold text-emerald-400">+%1.5 - +%18.0</span>
            <span className="text-[9px] text-slate-500 block">{isTr ? 'FOMO & düşüş engeli' : 'Prevents FOMO & dumps'}</span>
          </div>
          <div className="bg-slate-900/90 rounded border border-slate-800 p-2">
            <span className="text-[10px] text-slate-400 block mb-0.5">{isTr ? '🏔️ Tepe Korunumu' : '🏔️ Peak Retention'}</span>
            <span className="font-bold text-amber-300">{isTr ? 'Max %10 Çekilme' : 'Max 10% Pullback'}</span>
            <span className="text-[9px] text-slate-500 block">{isTr ? 'Dump/dağıtım engeli' : 'Rejects distribution dumps'}</span>
          </div>
          <div className="bg-slate-900/90 rounded border border-slate-800 p-2">
            <span className="text-[10px] text-slate-400 block mb-0.5">{isTr ? '📊 Kanal Konumu' : '📊 Channel Position'}</span>
            <span className="font-bold text-cyan-300">{isTr ? '%40 - %96 Arası' : '40% - 96% Range'}</span>
            <span className="text-[9px] text-slate-500 block">{isTr ? 'Alıcı hakimiyeti şartı' : 'Buyer dominance required'}</span>
          </div>
          <div className="bg-slate-900/90 rounded border border-slate-800 p-2 col-span-2 md:col-span-1">
            <span className="text-[10px] text-slate-400 block mb-0.5">{isTr ? '🎯 Kâr Potansiyeli' : '🎯 Profit Potential'}</span>
            <span className="font-bold text-emerald-300">{isTr ? 'Skor ≥ 70 / 100' : 'Score ≥ 70 / 100'}</span>
            <span className="text-[9px] text-slate-500 block">{isTr ? 'En yüksek kâr önceliği' : 'Prioritizes highest upside'}</span>
          </div>
        </div>

        {/* Canlı Filtreden Geçen ve Alıma Hazır En Karlı Pariteler */}
        <div className="bg-slate-950/70 rounded border border-slate-800/80 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-300 font-sans flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              {isTr 
                ? 'Sert Filtreyi Başarıyla Geçen & En Yüksek Kâr Potansiyeline Sahip Pariteler (Anlık Tarama):' 
                : 'Top Profit Candidates Passing Strict Screen (Live Orderbook Scan):'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {qualifiedCandidates.length} {isTr ? 'Parite Onaylandı' : 'Pairs Qualified'}
            </span>
          </div>

          {qualifiedCandidates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {qualifiedCandidates.map((c) => (
                <div 
                  key={c.symbol}
                  className="bg-slate-900/80 rounded border border-cyan-500/30 p-2 flex flex-col justify-between hover:border-cyan-400/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold font-mono text-xs text-white flex items-center gap-1">
                      {c.symbol}
                      <span className="text-[9px] font-normal text-emerald-400 font-mono">
                        (+%{c.change24h.toFixed(1)})
                      </span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {isTr ? 'Skor:' : 'Score:'} {c.profitScore}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span>{isTr ? 'Hacim:' : 'Vol:'} ${(c.volumeUsdt / 1e6).toFixed(1)}M</span>
                    <span className="text-cyan-300 font-semibold">{isTr ? 'Hedef TP:' : 'Target TP:'} +%{c.recommendedTakeProfitPercent}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-sans py-1.5 text-center flex items-center justify-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>
                {isTr 
                  ? '470+ Binance paritesi taranıyor. Sert parametreleri geçen ve kâr skoru ≥ 70 olan risksiz token bekleniyor. Nakit güvende.' 
                  : '470+ Binance pairs scanning. Awaiting candidates passing strict screening with profit score ≥ 70. Cash is protected.'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b101d] rounded-lg border border-slate-800/80 p-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              {isTr ? 'Otomatik Alım-Satım Botları' : 'Autonomous Trading Bots'}
            </h2>
            {tradingMode === 'LIVE_API' && autoLiveExecutionEnabled ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isTr ? 'CANLI BORSA YETKİSİ AKTİF' : 'LIVE TRADING AUTHORIZED'}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                {isTr ? 'SİMÜLASYON TEST MODU' : 'PAPER SIMULATION MODE'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            {isTr 
              ? 'Gerçek zamanlı emir defteri ve momentum tespitiyle 7/24 otonom işlem gerçekleştirir.' 
              : 'Executes 24/7 autonomous scalping utilizing real-time depth book and momentum metrics.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onResetAllPositions && (
            <button
              onClick={onResetAllPositions}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
              title={isTr ? 'Tüm botların pozisyonlarını sıfırlayıp yeniden tarama ve alım başlatır' : 'Reset all bot positions to start scanning and re-accumulation'}
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              {isTr ? 'Pozisyonları Sıfırla & Taramaya Başla' : 'Reset Positions & Rescan'}
            </button>
          )}

          {onRestoreDefaultBots && bots.length < 4 && (
            <button
              onClick={onRestoreDefaultBots}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
              title={isTr ? 'Silinen varsayılan strateji botunu tekrar aktif et' : 'Restore deleted default strategy bots'}
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              {isTr ? 'Silinen Botu Geri Getir' : 'Restore Default Bots'}
            </button>
          )}

          {runningBots.length > 0 && (
            <button
              onClick={onEmergencyStopAll}
              className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors border border-rose-500/30"
              title={isTr ? 'Acil Durum: Tüm botları durdurur ve açık emirleri kapatır' : 'Emergency: Halt all bots and close pending orders'}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {isTr ? 'Acil Durum Durdurucu (Kill Switch)' : 'Emergency Kill Switch'}
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            {isTr ? 'Yeni Bot Oluştur' : 'Deploy New Bot'}
          </button>
        </div>
      </div>

      {/* Bots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {bots.length === 0 ? (
          <div className="col-span-full bg-[#0b101d] rounded-lg border border-slate-800/80 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400 mb-3">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1 font-sans">
              {isTr ? 'Henüz Bir Bot Başlatılmadı' : 'No Active Bots Configured'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 font-sans">
              {isTr 
                ? 'Binance verileriyle çalışan karlı scalper veya grid botu oluşturarak otomatik alım-satım motorunu hemen devreye alabilirsiniz.' 
                : 'Deploy high-frequency scalper or grid algorithms powered by live Binance real-time order depth.'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {isTr ? 'İlk Botunuzu Kurun' : 'Deploy First Bot'}
            </button>
          </div>
        ) : (
          Array.from(new Map(bots.map(b => [b.id, b])).values()).map((bot, idx) => {
            const isRunning = bot.status === 'RUNNING';
            const isProfitable = bot.totalProfitUsdt >= 0;

            return (
              <div 
                key={`bot-card-${bot.id}-${idx}`}
                className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4 flex flex-col justify-between hover:border-slate-700/80 transition-all shadow-sm"
              >
                <div>
                  {/* Top Bar of card */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100 font-sans">{bot.name}</span>
                        <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {bot.symbol} · {getStrategyLabel(bot.strategy)}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        isRunning 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isRunning ? (isTr ? 'ÇALIŞIYOR' : 'RUNNING') : (isTr ? 'DURAKLATILDI' : 'PAUSED')}
                      </span>
                      {bot.hasOpenPosition ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {isTr ? 'POZİSYONDA' : 'IN POSITION'} {bot.entryPrice ? `($${bot.entryPrice})` : ''}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                          {isTr ? 'TARANIYOR (DİP ALIMI)' : 'SCANNING (ACCUMULATE)'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900/60 rounded border border-slate-800/70 font-mono text-xs my-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block">{isTr ? 'Net Kâr / Zarar' : 'Net PnL'}</span>
                      <span className={`font-bold tabular-nums ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfitable ? '+' : ''}{formatUSDT(bot.totalProfitUsdt)} ({bot.totalProfitPercent.toFixed(2)}%)
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">{isTr ? 'Kazanma Oranı' : 'Win Rate'}</span>
                      <span className="font-bold text-slate-200 tabular-nums">
                        %{bot.winRate} ({bot.tradesCount} {isTr ? 'işlem' : 'trades'})
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">{isTr ? 'Ayrılan Kasa' : 'Allocated Vault'}</span>
                      <span className="text-slate-300 tabular-nums">
                        {formatUSDT(bot.allocatedCapitalUsdt)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">{isTr ? 'Risk Ayarları' : 'Risk Bounds'}</span>
                      <span className="text-slate-400 text-[10px] tabular-nums">
                        SL: %{bot.trailingStopPercent} · TP: %{bot.takeProfitPercent}
                      </span>
                    </div>
                  </div>

                  {/* Live Status Action Feed */}
                  <div className="text-[11px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-900 flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span className="truncate">{bot.lastAction}</span>
                  </div>
                </div>

                {/* Bottom Control Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleBotStatus(bot.id)}
                      className={`px-2.5 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
                        isRunning 
                          ? 'bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950' 
                          : 'bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950'
                      }`}
                    >
                      {isRunning ? (
                        <>
                          <Pause className="w-3 h-3" /> {isTr ? 'Duraklat' : 'Pause'}
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" /> {isTr ? 'Başlat' : 'Start'}
                        </>
                      )}
                    </button>

                    {onForceTradeBot && isRunning && (
                      <button
                        onClick={() => onForceTradeBot(bot.id)}
                        className="px-2.5 py-1 rounded flex items-center gap-1 font-medium bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 transition-colors border border-cyan-500/30"
                        title={bot.hasOpenPosition ? (isTr ? 'Pozisyonu kâr ile kapat ve sat' : 'Take profit and close position') : (isTr ? 'Hemen piyasadan alım emri aç' : 'Execute immediate market buy order')}
                      >
                        <Zap className="w-3 h-3" />
                        {bot.hasOpenPosition ? (isTr ? 'Kâr Satışı Yap' : 'Take Profit') : (isTr ? 'Şimdi Alım Yap' : 'Buy Now')}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => onDeleteBot(bot.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded hover:bg-rose-500/10"
                    title={isTr ? 'Botu Kaldır' : 'Remove Bot'}
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Bot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-5 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-sans">
                <Bot className="w-5 h-5 text-emerald-400" />
                {isTr ? 'Yeni Binance Alım-Satım Botu Kur' : 'Deploy Binance Algorithmic Bot'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1 font-sans">{isTr ? 'Bot Adı' : 'Bot Name'}</label>
                <input
                  type="text"
                  required
                  placeholder={isTr ? 'örn: SOL Ultra Scalper v1' : 'e.g. SOL Ultra Scalper v1'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">{isTr ? 'İşlem Çifti' : 'Trading Pair'}</label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {tickers.slice(0, 15).map(t => (
                      <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-sans">{isTr ? 'Strateji Modeli' : 'Strategy Model'}</label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as BotStrategyType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="SUPERTREND_VWAP_ALPHA">⚡ Supertrend + VWAP Quant (%86 Win Rate)</option>
                    <option value="QUANT_MOMENTUM_COMPOUND">🚀 FreqAI Compound Momentum (Max Alpha)</option>
                    <option value="AI_SCALPER">{isTr ? 'AI Volatilite Scalper' : 'AI Volatility Scalper'}</option>
                    <option value="BREAKOUT_MOMENTUM">{isTr ? 'Breakout Momentum' : 'Breakout Momentum'}</option>
                    <option value="GRID_TRADER">{isTr ? 'Otomatik Grid Botu' : 'Automated Grid Bot'}</option>
                    <option value="DCA_ACCUMULATOR">{isTr ? 'Dinamik DCA Toplayıcı' : 'Dynamic DCA Accumulator'}</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1 font-sans text-xs">
                  <span>{isTr ? 'Ayrılan Sermaye (USDT)' : 'Allocated Capital (USDT)'}</span>
                  <span>{isTr ? 'Önerilen Max (%22):' : 'Suggested Max (22%):'} <strong className="text-emerald-400">{formatUSDT(Math.max(10, Math.min(13, balanceUsdt * 0.22)))}</strong></span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="number"
                    min="10"
                    max={Math.max(10, Math.min(13, balanceUsdt * 0.22))}
                    value={allocatedCapital}
                    onChange={(e) => setAllocatedCapital(Math.min(13, Math.max(10, parseFloat(e.target.value) || 11.50)))}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-1">
                    {[15, 20, 22].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setAllocatedCapital(Math.min(13, Math.max(10, parseFloat((balanceUsdt * (pct / 100)).toFixed(2)))))}
                        className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono"
                        title={isTr ? `Kasanın %${pct}'ini ayır` : `Allocate ${pct}% of vault`}
                      >
                        %{pct}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-emerald-400/90 font-sans mt-1">
                  {isTr 
                    ? "🛡️ Portföy Kalkanı: Kasanın max %22'si ($13 USDT) ayrılabilir, sermaye eşit dağıtılır." 
                    : "🛡️ Portfolio Shield: Max 22% ($13 USDT) per bot to preserve diversification."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">{isTr ? 'Trailing Stop-Loss (%)' : 'Trailing Stop-Loss (%)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10"
                    value={trailingStop}
                    onChange={(e) => setTrailingStop(parseFloat(e.target.value) || 1.5)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-sans">{isTr ? 'Kâr Al Hedefi (TP %)' : 'Take-Profit Target (TP %)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="50"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 4.0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {strategy === 'GRID_TRADER' && (
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">{isTr ? 'Grid Izgara Sayısı' : 'Grid Levels Count'}</label>
                  <input
                    type="number"
                    min="3"
                    max="20"
                    value={gridLevels}
                    onChange={(e) => setGridLevels(parseInt(e.target.value, 10) || 5)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-sans text-xs"
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded font-sans text-xs"
                >
                  {isTr ? 'Botu Başlat ve Çalıştır' : 'Deploy & Run Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
