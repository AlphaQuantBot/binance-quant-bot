import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Bot, 
  Cpu, 
  Radar, 
  BarChart3, 
  ShieldCheck, 
  Bell, 
  Lock, 
  Volume2, 
  VolumeX, 
  TrendingUp,
  Wallet,
  Download,
  Terminal,
  Flame,
  RefreshCw
} from 'lucide-react';
import { UserSecuritySettings } from '../types/crypto';
import { formatUSDT } from '../utils/cryptoMath';

interface TopHeaderProps {
  activeTab: 'terminal' | 'bots' | 'alpha-radar' | 'ai-predict' | 'gem-radar' | 'backtest' | 'security';
  setActiveTab: (tab: 'terminal' | 'bots' | 'alpha-radar' | 'ai-predict' | 'gem-radar' | 'backtest' | 'security') => void;
  settings: UserSecuritySettings;
  onToggleMode: () => void;
  onToggleSound: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  onLockApp: () => void;
  runningBotsCount: number;
  lastTradeAgoSec?: number;
  engineTickCount?: number;
  onOpenQuickConnect?: () => void;
  onRefreshBalance?: () => void;
  isRefreshingBalance?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  onToggleMode,
  onToggleSound,
  onOpenNotifications,
  unreadNotificationsCount,
  onLockApp,
  runningBotsCount,
  lastTradeAgoSec,
  engineTickCount,
  onOpenQuickConnect,
  onRefreshBalance,
  isRefreshingBalance
}) => {
  const [binanceHealth, setBinanceHealth] = useState<{
    status: 'ONLINE' | 'OFFLINE';
    latencyMs: number;
    gateway: string;
    activePairsCount: number;
  }>({
    status: 'OFFLINE',
    latencyMs: 0,
    gateway: 'api-gcp.binance.com',
    activePairsCount: 0
  });

  useEffect(() => {
    let isMounted = true;
    const checkPing = async () => {
      try {
        const res = await fetch('/api/binance/ping');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && isMounted) {
            setBinanceHealth({
              status: data.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
              latencyMs: 0,
              gateway: data.gateway || 'api-gcp.binance.com',
              activePairsCount: data.activePairsCount || 0
            });
          }
        }
      } catch { if (isMounted) setBinanceHealth(prev => ({ ...prev, status: 'OFFLINE', activePairsCount: 0 })); }
    };
    checkPing();
    const interval = setInterval(checkPing, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-[#080d17]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 py-2.5">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('terminal')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1px] shadow-sm shadow-emerald-500/10">
              <div className="w-full h-full bg-[#080d17] rounded-[7px] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                ALFAQUANT
                <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  BINANCE SPOT API v3
                </span>
              </span>
            </div>
          </button>

          <div 
            onClick={() => onOpenQuickConnect ? onOpenQuickConnect() : setActiveTab('security')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b1120] border border-emerald-500/40 text-[11px] font-mono text-slate-300 hover:border-emerald-400 cursor-pointer transition-colors shadow-sm shadow-emerald-500/10"
            title="Piyasa verisinin güncelliği terminal uyarısında gösterilir.."
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400">Borsa:</span>
            <span className="text-amber-400 font-bold">
              {settings.exchange === 'BINANCE_TR' ? 'Binance TR' : 'Binance Global'}
            </span>
            {settings.binanceApiKey && settings.binanceSecretKey ? (
              <span className="text-emerald-400 text-[10px] bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
                {binanceHealth.status === 'ONLINE' ? 'PİYASA VERİSİ GÜNCEL' : 'PİYASA VERİSİ YOK'}
              </span>
            ) : (
              <span className="text-emerald-400 text-[10px] bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                {binanceHealth.status === 'ONLINE' ? 'PİYASA VERİSİ GÜNCEL' : 'PİYASA VERİSİ YOK'}
              </span>
            )}
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'terminal' 
                ? 'bg-slate-800/90 text-emerald-400 font-semibold shadow-sm shadow-black/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => setActiveTab('bots')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'bots' 
                ? 'bg-slate-800/90 text-emerald-400 font-semibold shadow-sm shadow-black/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Bot Motoru</span>
            {runningBotsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Dahi Hacker & Alpha Radar Tab */}
          <button
            onClick={() => setActiveTab('alpha-radar')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'alpha-radar' 
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm shadow-emerald-500/20' 
                : 'text-slate-300 hover:text-emerald-300 hover:bg-slate-800/40'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>AI Araştırma Radarı</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded font-bold">MODEL</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-predict')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'ai-predict' 
                ? 'bg-slate-800/90 text-cyan-400 font-semibold shadow-sm shadow-black/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>AI Tahmin & Optimize</span>
          </button>

          <button
            onClick={() => setActiveTab('gem-radar')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'gem-radar' 
                ? 'bg-slate-800/90 text-amber-400 font-semibold shadow-sm shadow-black/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Radar className="w-4 h-4 text-amber-400" />
            <span>Erken Token Radarı</span>
          </button>

          <button
            onClick={() => setActiveTab('backtest')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'backtest' 
                ? 'bg-slate-800/90 text-emerald-400 font-semibold shadow-sm shadow-black/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Strateji Testi</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'security' 
                ? 'bg-slate-800/90 text-emerald-400 font-semibold shadow-sm shadow-black/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Güvenlik & API</span>
          </button>
        </nav>

        {/* Zone 3: Actions & Status */}
        <div className="flex items-center gap-2.5">
          {/* Autonomous Alpha Mode Badge */}
          <button
            onClick={() => setActiveTab('alpha-radar')}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:border-emerald-400 transition-colors shadow-sm"
            title="Otonom İnisiyatif Modu: AI Araştırma Radarı sayfasına gitmek için tıklayın"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Otonom İnisiyatif:</span>
            <span className="text-emerald-400 font-bold underline decoration-dotted">BEKLEMEDE</span>
          </button>

          {/* Autonomous Max-Profit Engine Indicator */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md bg-[#0a0f1d] border border-emerald-500/30 text-slate-300 shadow-sm shadow-emerald-500/10"
            title="Canlı emir yürütme kapalı; piyasa verisi durumunu terminal uyarısından kontrol edin."
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Otonom Max-Kâr:</span>
            <span className="text-emerald-400 font-bold">BEKLEMEDE</span>
            {typeof lastTradeAgoSec === 'number' && (
              <span className="text-slate-400 text-[11px] border-l border-slate-700 pl-1.5 ml-0.5 tabular-nums">
                {lastTradeAgoSec}s önce
              </span>
            )}
          </div>

          {/* Mode switch */}
          <button
            onClick={onToggleMode}
            className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              settings.tradingMode === 'LIVE_API'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="İşlem Modunu Değiştir (Sanal Paper / Canlı Binance API)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${settings.tradingMode === 'LIVE_API' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {settings.tradingMode === 'LIVE_API' ? 'CANLI EMİR KAPALI' : 'SİMÜLASYON (TEST)'}
          </button>

          {/* Primary Balance Counter */}
          <div 
            onClick={() => onOpenQuickConnect ? onOpenQuickConnect() : setActiveTab('security')}
            className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-mono cursor-pointer transition-colors ${
              settings.tradingMode === 'LIVE_API'
                ? 'bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
            title={settings.tradingMode === 'LIVE_API' 
              ? `Binance Canlı Cüzdan Özeti:\n• Toplam Spot Portföy Değeri: $${(settings.liveSpotBalanceUsdt || 0).toFixed(2)} USDT\n• Kullanılabilir Nakit: $${(settings.availableCashUsdt || 0).toFixed(2)} USDT\n• Pozisyondaki Altcoinler: $${Math.max(0, (settings.liveSpotBalanceUsdt || 0) - (settings.availableCashUsdt || 0) - (settings.bnbBudget?.bnbUsdValue || 0)).toFixed(2)} USDT\n• BNB Komisyon Kalkanı: $${(settings.bnbBudget?.bnbUsdValue || 0).toFixed(2)}`
              : "Sanal Kasa Bakiyesi"
            }
          >
            <Wallet className={`w-3.5 h-3.5 ${settings.tradingMode === 'LIVE_API' ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-slate-400">
              {settings.tradingMode === 'LIVE_API' ? 'Toplam Kasa:' : 'Sanal Kasa:'}
            </span>
            <span className={`font-semibold tabular-nums ${settings.tradingMode === 'LIVE_API' ? 'text-emerald-400' : 'text-amber-300'}`}>
              {settings.tradingMode === 'LIVE_API'
                ? (settings.exchange === 'BINANCE_TR' && settings.liveSpotBalanceTry !== undefined && settings.liveSpotBalanceTry > 0
                    ? `${settings.liveSpotBalanceTry.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`
                    : formatUSDT(typeof settings.liveSpotBalanceUsdt === 'number' ? settings.liveSpotBalanceUsdt : 0)
                  )
                : formatUSDT(settings.simulatedBalanceUsdt)
              }
            </span>
            {settings.tradingMode === 'LIVE_API' && settings.exchange !== 'BINANCE_TR' && (
              <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20 font-bold">
                USDT
              </span>
            )}
            {settings.tradingMode === 'LIVE_API' && typeof settings.availableCashUsdt === 'number' && (
              <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                <span className="text-slate-500 text-[10px]">Nakit:</span>
                <strong className="text-emerald-400">${settings.availableCashUsdt.toFixed(2)}</strong>
              </span>
            )}
            {settings.tradingMode === 'LIVE_API' && Array.isArray(settings.spotBalances) && settings.spotBalances.some(b => b.asset !== 'USDT' && b.asset !== 'TRY' && b.estimatedUsd >= 1.0) && (
              <span className="hidden lg:inline text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                {settings.spotBalances.filter(b => b.asset !== 'USDT' && b.asset !== 'TRY' && b.estimatedUsd >= 1.0).map(b => b.asset).join(', ')} Pozisyonda
              </span>
            )}
            {onRefreshBalance && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshBalance();
                }}
                disabled={isRefreshingBalance}
                className="p-0.5 hover:text-emerald-300 transition-colors ml-0.5"
                title="Binance Kasasını Şimdi Senkronize Et"
              >
                <RefreshCw className={`w-3 h-3 text-emerald-400 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {/* BNB Commission Shield Live Indicator */}
          {settings.tradingMode === 'LIVE_API' && (
            <div 
              onClick={() => setActiveTab('security')}
              className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md border cursor-pointer transition-all ${
                settings.bnbBudget?.discountActive 
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-amber-500/50'
              }`}
              title="Binance %25 BNB Komisyon İndirimi: Spot işlemlerde 0.10% yerine 0.075% kesilir."
            >
              <span className={`w-2 h-2 rounded-full ${settings.bnbBudget?.discountActive ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="font-bold text-amber-400">BNB Kalkanı:</span>
              <span>{settings.bnbBudget?.discountActive ? '%25 İndirimli (0.075%)' : 'Standart (0.10%)'}</span>
              {settings.bnbBudget?.bnbUsdValue !== undefined && settings.bnbBudget.bnbUsdValue > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30">
                  ${settings.bnbBudget.bnbUsdValue.toFixed(2)}
                </span>
              )}
            </div>
          )}

          {/* Secondary Binance Vault Pill when in PAPER Mode so user always sees Binance sync */}
          {settings.tradingMode === 'PAPER' && settings.binanceApiKey && (
            <div
              onClick={() => onOpenQuickConnect ? onOpenQuickConnect() : setActiveTab('security')}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono cursor-pointer transition-colors bg-emerald-950/30 border-emerald-500/30 hover:border-emerald-400"
              title={`Bağlı Binance Kasası: ${formatUSDT(settings.liveSpotBalanceUsdt)}. Canlı moda geçmek için tıklayın.`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Binance:</span>
              <span className="font-semibold text-emerald-400 tabular-nums">
                {formatUSDT(typeof settings.liveSpotBalanceUsdt === 'number' ? settings.liveSpotBalanceUsdt : 0)}
              </span>
              {onRefreshBalance && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefreshBalance();
                  }}
                  disabled={isRefreshingBalance}
                  className="p-0.5 hover:text-emerald-300 transition-colors ml-0.5"
                  title="Binance Kasasını Senkronize Et"
                >
                  <RefreshCw className={`w-3 h-3 text-emerald-400 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors"
            title={settings.soundEnabled ? 'Sesleri Kapat' : 'Sesleri Aç'}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors relative"
            title="Bildirimler & Alarmlar"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#080d17]" />
            )}
          </button>

          {/* 2FA Lock Button */}
          {settings.is2FAEnabled && (
            <button
              onClick={onLockApp}
              className="p-1.5 text-amber-400 hover:text-amber-300 rounded-md hover:bg-amber-500/10 transition-colors"
              title="Terminali 2FA ile Kilitle"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          {/* Download Project Button */}
          <a
            href="/api/download-project"
            download="binance_kripto_botu_projesi.tar.gz"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            title="Tüm Projeyi Bilgisayarına İndir (.tar.gz)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Projeyi İndir</span>
          </a>

          {/* User Trader Avatar */}
          <div 
            onClick={() => setActiveTab('security')} 
            className="w-7 h-7 rounded-full overflow-hidden border border-slate-700 cursor-pointer hover:border-emerald-400 transition-colors ml-1 bg-slate-800 shrink-0"
            title="Profil ve Güvenlik Ayarları"
          >
            <img 
              src="/src/assets/images/trader_avatar_pro_1790500053964.jpg" 
              alt="Trader Profil"
              className="w-full h-full object-cover"
              onError={(e) => {
                // styled SVG fallback
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>

      {/* Mobile Navigation Sub-Bar */}
      <div className="flex md:hidden items-center justify-around gap-1 pt-2 border-t border-slate-800/60 mt-2 text-xs">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`py-1 px-2 rounded ${activeTab === 'terminal' ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}
        >
          Terminal
        </button>
        <button
          onClick={() => setActiveTab('bots')}
          className={`py-1 px-2 rounded ${activeTab === 'bots' ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}
        >
          Botlar ({runningBotsCount})
        </button>
        <button
          onClick={() => setActiveTab('ai-predict')}
          className={`py-1 px-2 rounded ${activeTab === 'ai-predict' ? 'text-cyan-400 font-medium' : 'text-slate-400'}`}
        >
          AI Tahmin
        </button>
        <button
          onClick={() => setActiveTab('gem-radar')}
          className={`py-1 px-2 rounded ${activeTab === 'gem-radar' ? 'text-amber-400 font-medium' : 'text-slate-400'}`}
        >
          Radar
        </button>
        <button
          onClick={() => setActiveTab('backtest')}
          className={`py-1 px-2 rounded ${activeTab === 'backtest' ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}
        >
          Test
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`py-1 px-2 rounded ${activeTab === 'security' ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}
        >
          Ayarlar
        </button>
      </div>
    </header>
  );
};

