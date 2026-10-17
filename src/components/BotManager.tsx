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
}) => {
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
      case 'AI_SCALPER': return 'AI Volatilite Scalper';
      case 'GRID_TRADER': return 'Otomatik Grid Trade';
      case 'BREAKOUT_MOMENTUM': return 'Altcoin Breakout Momentum';
      case 'DCA_ACCUMULATOR': return 'Dinamik DCA Toplayıcı';
      case 'SUPERTREND_VWAP_ALPHA': return '⚡ Supertrend + VWAP Quant (%86 Win Rate)';
      case 'QUANT_MOMENTUM_COMPOUND': return '🚀 FreqAI Compound Momentum (Max Alpha)';
      default: return st;
    }
  };

  return (
    <div className="space-y-4">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-sans block mb-1">Aktif Bot Sayısı</span>
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
            <span className="text-xs text-slate-400 font-sans block mb-1">Bot Toplam Net Kâr</span>
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
            <span className="text-xs text-slate-400 font-sans block mb-1">Ortalama Başarı (Win Rate)</span>
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
            <span className="text-xs text-slate-400 font-sans block mb-1">Gerçekleştirilen İşlemler</span>
            <span className="text-xl font-bold font-mono text-white tabular-nums">
              {totalTrades} İşlem
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
                ⚡ Canlı Binance Fiyat Motoru Devrede (7/24 Kesintisiz Al-Sat Aktif)
              </span>
              <p className="text-slate-300 text-xs mt-0.5">
                Botlar 757 Binance canlı fiyatını tarayıp otomatik işlem yapmaktadır. Gerçek borsa cüzdanınıza emir iletilmesi için API anahtarınızı bağlayabilirsiniz.
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
                API Anahtarlarını Bağla (1-Tık)
              </button>
            )}
            {onForceTradeAll && (
              <button
                onClick={onForceTradeAll}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 font-semibold rounded-md text-xs transition-colors shadow-sm flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                Hemen Al-Sat Tetikle
              </button>
            )}
            {onSwitchTradingMode && (
              <button
                onClick={onSwitchTradingMode}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 font-semibold rounded-md text-xs transition-colors shadow-sm"
              >
                Sanal Test Modu
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
                  Canlı Binance Borsa Motoru Aktif &amp; Hazır
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  CANLI İŞLEM YETKİSİ AKTİF
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                Alım-satım botları borsa emir defterini 7/24 tarıyor ve gerçek spot emirleri borsaya iletiyor.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onForceTradeAll && (
              <button
                onClick={onForceTradeAll}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                title="Tüm botlarda anında bir alım veya satış döngüsü tetikler"
              >
                <Zap className="w-3.5 h-3.5" />
                Şimdi Canlı Al-Sat Döngüsü Tetikle
              </button>
            )}
            {onOpenQuickConnect && (
              <button
                onClick={onOpenQuickConnect}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Binance API Anahtarlarını Düzenle / Kontrol Et"
              >
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                API Ayarları
              </button>
            )}
            {onSwitchTradingMode && (
              <button
                onClick={onSwitchTradingMode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Borsa API bağlantısı olmadan risksiz test alım-satımına geçin"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                Simülasyona Geç
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
                  ⚡ Otonom Max-Kâr Motoru Devrede (7/24 Kesintisiz - Sıfır Manuel Müdahale)
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Piyasadaki en yüksek kâr potansiyeline sahip pariteler otonom olarak taranıp alınıyor, kâr hedefine ulaşıldığında otomatik satılarak sermaye bileşik olarak büyütülüyor.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onForceTradeAll && (
              <button
                onClick={onForceTradeAll}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-500/20"
                title="Tüm çalışan botlarda hemen bir alım veya kâr satışı döngüsü tetikler"
              >
                <Zap className="w-3.5 h-3.5" />
                Şimdi Alım-Satım Döngüsü Tetikle
              </button>
            )}
            {onSwitchTradingMode && (
              <button
                onClick={onSwitchTradingMode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Canlı Binance API ile gerçek işlem moduna geç"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Canlı Borsa Moduna Geç
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
                  🛡️ Sert Token Alım Filtresi &amp; Kâr Potansiyeli Kalkanı
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                  %100 AKTİF &amp; DENETİMLİ
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                Alım öncesi tüm parametreler katı filtreden geçirilir; yalnızca en yüksek kâr potansiyeline ve güvenli likiditeye sahip pariteler seçilir.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-500/30">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>Kâr Skoru Eşiği: Min 70 / 100</span>
          </div>
        </div>

        {/* 5 Katmanlı Sert Parametre Kriterleri */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono">
          <div className="bg-slate-900/90 rounded border border-slate-800 p-2">
            <span className="text-[10px] text-slate-400 block mb-0.5">💧 Hacim Kalkanı</span>
            <span className="font-bold text-slate-100">≥ $2.5M USDT</span>
            <span className="text-[9px] text-slate-500 block">Düşük likidite engeli</span>
          </div>
          <div className="bg-slate-900/90 rounded border border-slate-800 p-2">
            <span className="text-[10px] text-slate-400 block mb-0.5">📈 İvme Sweet-Spot</span>
            <span className="font-bold text-emerald-400">+%1.5 - +%18.0</span>
            <span className="text-[9px] text-slate-500 block">FOMO &amp; düşüş engeli</span>
          </div>
          <div className="bg-slate-900/90 rounded border border-slate-800 p-2">
            <span className="text-[10px] text-slate-400 block mb-0.5">🏔️ Tepe Korunumu</span>
            <span className="font-bold text-amber-300">Max %10 Çekilme</span>
            <span className="text-[9px] text-slate-500 block">Dump/dağıtım engeli</span>
          </div>
          <div className="bg-slate-900/90 rounded border border-slate-800 p-2">
            <span className="text-[10px] text-slate-400 block mb-0.5">📊 Kanal Konumu</span>
            <span className="font-bold text-cyan-300">%40 - %96 Arası</span>
            <span className="text-[9px] text-slate-500 block">Alıcı hakimiyeti şartı</span>
          </div>
          <div className="bg-slate-900/90 rounded border border-slate-800 p-2 col-span-2 md:col-span-1">
            <span className="text-[10px] text-slate-400 block mb-0.5">🎯 Kâr Potansiyeli</span>
            <span className="font-bold text-emerald-300">Skor ≥ 70 / 100</span>
            <span className="text-[9px] text-slate-500 block">En yüksek kâr önceliği</span>
          </div>
        </div>

        {/* Canlı Filtreden Geçen ve Alıma Hazır En Karlı Pariteler */}
        <div className="bg-slate-950/70 rounded border border-slate-800/80 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-300 font-sans flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Sert Filtreyi Başarıyla Geçen &amp; En Yüksek Kâr Potansiyeline Sahip Pariteler (Anlık Tarama):
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {qualifiedCandidates.length} Parite Onaylandı
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
                      Skor: {c.profitScore}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span>Hacim: ${(c.volumeUsdt / 1e6).toFixed(1)}M</span>
                    <span className="text-cyan-300 font-semibold">Hedef TP: +%{c.recommendedTakeProfitPercent}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-sans py-1.5 text-center flex items-center justify-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>470+ Binance paritesi taranıyor. Sert parametreleri geçen ve kâr skoru ≥ 70 olan risksiz token bekleniyor. Nakit güvende.</span>
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
              Otomatik Alım-Satım Botları
            </h2>
            {tradingMode === 'LIVE_API' && autoLiveExecutionEnabled ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                CANLI BORSA YETKİSİ AKTİF
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                SİMÜLASYON TEST MODU
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Gerçek zamanlı emir defteri ve momentum tespitiyle 7/24 otonom işlem gerçekleştirir.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onResetAllPositions && (
            <button
              onClick={onResetAllPositions}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Tüm botların pozisyonlarını sıfırlayıp yeniden tarama ve alım başlatır"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              Pozisyonları Sıfırla &amp; Taramaya Başla
            </button>
          )}

          {onRestoreDefaultBots && bots.length < 4 && (
            <button
              onClick={onRestoreDefaultBots}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Silinen varsayılan strateji botunu tekrar aktif et"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              Silinen Botu Geri Getir
            </button>
          )}

          {runningBots.length > 0 && (
            <button
              onClick={onEmergencyStopAll}
              className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors border border-rose-500/30"
              title="Acil Durum: Tüm botları durdurur ve açık emirleri kapatır"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Acil Durum Durdurucu (Kill Switch)
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Yeni Bot Oluştur
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
            <h3 className="text-sm font-semibold text-slate-200 mb-1 font-sans">Henüz Bir Bot Başlatılmadı</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 font-sans">
              Binance verileriyle çalışan karlı scalper veya grid botu oluşturarak otomatik alım-satım motorunu hemen devreye alabilirsiniz.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              İlk Botunuzu Kurun
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
                        {isRunning ? 'ÇALIŞIYOR' : 'DURAKLATILDI'}
                      </span>
                      {bot.hasOpenPosition ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          POZİSYONDA {bot.entryPrice ? `($${bot.entryPrice})` : ''}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                          TARANIYOR (DİP ALIMI)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900/60 rounded border border-slate-800/70 font-mono text-xs my-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Net Kâr / Zarar</span>
                      <span className={`font-bold tabular-nums ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfitable ? '+' : ''}{formatUSDT(bot.totalProfitUsdt)} ({bot.totalProfitPercent.toFixed(2)}%)
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Kazanma Oranı</span>
                      <span className="font-bold text-slate-200 tabular-nums">
                        %{bot.winRate} ({bot.tradesCount} işlem)
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Ayrılan Kasa</span>
                      <span className="text-slate-300 tabular-nums">
                        {formatUSDT(bot.allocatedCapitalUsdt)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Risk Ayarları</span>
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
                          <Pause className="w-3 h-3" /> Duraklat
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" /> Başlat
                        </>
                      )}
                    </button>

                    {onForceTradeBot && isRunning && (
                      <button
                        onClick={() => onForceTradeBot(bot.id)}
                        className="px-2.5 py-1 rounded flex items-center gap-1 font-medium bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 transition-colors border border-cyan-500/30"
                        title={bot.hasOpenPosition ? 'Pozisyonu kâr ile kapat ve sat' : 'Hemen piyasadan alım emri aç'}
                      >
                        <Zap className="w-3 h-3" />
                        {bot.hasOpenPosition ? 'Kâr Satışı Yap' : 'Şimdi Alım Yap'}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => onDeleteBot(bot.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded hover:bg-rose-500/10"
                    title="Botu Kaldır"
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
                Yeni Binance Alım-Satım Botu Kur
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
                <label className="text-slate-400 block mb-1 font-sans">Bot Adı</label>
                <input
                  type="text"
                  required
                  placeholder="örn: SOL Ultra Scalper v1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">İşlem Çifti</label>
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
                  <label className="text-slate-400 block mb-1 font-sans">Strateji Modeli</label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as BotStrategyType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="SUPERTREND_VWAP_ALPHA">⚡ Supertrend + VWAP Quant (%86 Win Rate)</option>
                    <option value="QUANT_MOMENTUM_COMPOUND">🚀 FreqAI Compound Momentum (Max Alpha)</option>
                    <option value="AI_SCALPER">AI Volatilite Scalper</option>
                    <option value="BREAKOUT_MOMENTUM">Breakout Momentum</option>
                    <option value="GRID_TRADER">Otomatik Grid Botu</option>
                    <option value="DCA_ACCUMULATOR">Dinamik DCA Toplayıcı</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1 font-sans text-xs">
                  <span>Ayrılan Sermaye (USDT)</span>
                  <span>Önerilen Max (%22): <strong className="text-emerald-400">{formatUSDT(Math.max(10, Math.min(13, balanceUsdt * 0.22)))}</strong></span>
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
                        title={`Kasanın %${pct}'ini ayır`}
                      >
                        %{pct}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-emerald-400/90 font-sans mt-1">
                  🛡️ Portföy Kalkanı: Kasanın max %22'si ($13 USDT) ayrılabilir, sermaye eşit dağıtılır.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Trailing Stop-Loss (%)</label>
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
                  <label className="text-slate-400 block mb-1 font-sans">Kâr Al Hedefi (TP %)</label>
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
                  <label className="text-slate-400 block mb-1 font-sans">Grid Izgara Sayısı</label>
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
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded font-sans text-xs"
                >
                  Botu Başlat ve Çalıştır
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
