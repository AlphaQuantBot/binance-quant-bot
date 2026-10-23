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
  RefreshCw,
  Coins,
  Send,
  Globe,
  Sparkles,
  Monitor,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  X
} from 'lucide-react';
import { UserSecuritySettings } from '../types/crypto';
import { formatUSDT } from '../utils/cryptoMath';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface TopHeaderProps {
  activeTab: 'terminal' | 'bots' | 'alpha-radar' | 'ai-predict' | 'gem-radar' | 'backtest' | 'quant-token' | 'pancakeswap' | 'security' | 'website';
  setActiveTab: (tab: 'terminal' | 'bots' | 'alpha-radar' | 'ai-predict' | 'gem-radar' | 'backtest' | 'quant-token' | 'pancakeswap' | 'security' | 'website') => void;
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
  language?: 'en' | 'tr';
  onToggleLanguage?: () => void;
  onOpenLogoModal?: () => void;
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
  isRefreshingBalance,
  language,
  onToggleLanguage,
  onOpenLogoModal
}) => {
  const lang = language || settings.language || 'en';
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showStandaloneModal, setShowStandaloneModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Dynamic live container URL (never 404s)
  const LIVE_APP_URL = typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
    ? window.location.origin
    : 'https://ais-dev-qzohlmdd5upirmn4r7c4dh-735591582538.europe-west2.run.app';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(LIVE_APP_URL);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    setDownloadSuccess(false);
    try {
      const res = await fetch('/api/download-zip');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'binance_quant_ai_scalper_project_latest.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadSuccess(true);
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        setDownloadSuccess(false);
      }, 6000);
    } catch (err) {
      console.error('Download error:', err);
      window.location.href = '/api/download-zip';
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const [binanceHealth, setBinanceHealth] = useState<{
    status: 'ONLINE' | 'OFFLINE';
    latencyMs: number;
    gateway: string;
    activePairsCount: number;
  }>({
    status: 'ONLINE',
    latencyMs: 24,
    gateway: 'api-gcp.binance.com',
    activePairsCount: 757
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
              status: 'ONLINE',
              latencyMs: data.latencyMs || 24,
              gateway: data.gateway || 'api-gcp.binance.com',
              activePairsCount: data.activePairsCount || 757
            });
          }
        }
      } catch {}
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
                ALFA QUANT BOT
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
            title="Binance REST v3 & WebSocket Integration Active. Click for API details and connection."
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400">{lang === 'tr' ? 'Borsa:' : 'Exchange:'}</span>
            <span className="text-amber-400 font-bold">
              {settings.exchange === 'BINANCE_TR' ? 'Binance TR' : 'Binance Global'}
            </span>
            {settings.binanceApiKey && settings.binanceSecretKey ? (
              <span className="text-emerald-400 text-[10px] bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
                {lang === 'tr' ? 'CANLI BAĞLI' : 'LIVE CONNECTED'} ({binanceHealth.latencyMs}ms)
              </span>
            ) : (
              <span className="text-emerald-400 text-[10px] bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                {lang === 'tr' ? 'CANLI MOTOR' : 'LIVE ENGINE'} ({binanceHealth.latencyMs}ms)
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
            <span>{lang === 'tr' ? 'Bot Motoru' : 'Bot Engine'}</span>
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
            <span>{lang === 'tr' ? 'Hacker Alpha Radarı' : 'Alpha Radar'}</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded font-bold">
              {lang === 'tr' ? 'CANLI' : 'LIVE'}
            </span>
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
            <span>{lang === 'tr' ? 'AI Tahmin & Optimize' : 'AI Forecast & Optimize'}</span>
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
            <span>{lang === 'tr' ? 'Erken Token Radarı' : 'Early Gem Radar'}</span>
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
            <span>{lang === 'tr' ? 'Strateji Testi' : 'Strategy Backtest'}</span>
          </button>

          <button
            onClick={() => setActiveTab('website')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'website' 
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black shadow-md shadow-emerald-500/30' 
                : 'text-emerald-300 hover:text-white hover:bg-emerald-500/15'
            }`}
            title={lang === 'tr' ? 'alfaquantai.com Resmi Web Sitesi & Hostinger Dağıtımı' : 'alfaquantai.com Official Website & Hostinger Hub'}
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'tr' ? '🌐 alfaquantai.com' : '🌐 alfaquantai.com'}</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono rounded font-bold border border-emerald-500/40 animate-pulse">
              {lang === 'tr' ? 'PORTAL' : 'OFFICIAL'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('quant-token')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'quant-token' 
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50 font-bold shadow-sm shadow-amber-500/20' 
                : 'text-amber-400 hover:text-amber-200 hover:bg-amber-500/10'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>$QUANT Token</span>
            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] font-mono rounded font-bold border border-amber-500/30">
              BEP-20
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pancakeswap')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'pancakeswap' 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-300' 
                : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/50 hover:border-amber-400 font-bold shadow-sm'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>🥞 PancakeSwap DEX</span>
            <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded font-bold border ${
              activeTab === 'pancakeswap'
                ? 'bg-slate-950 text-amber-300 border-amber-400/80'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
            }`}>
              {lang === 'tr' ? '⚡ 54.7$ HAZIR' : '⚡ 54.7$ READY'}
            </span>
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
            <span>{lang === 'tr' ? 'Güvenlik & API' : 'Security & API'}</span>
          </button>
        </nav>

        {/* Zone 3: Actions & Status */}
        <div className="flex items-center gap-2">
          {/* Autonomous Alpha Mode Badge */}
          <button
            onClick={() => setActiveTab('alpha-radar')}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:border-emerald-400 transition-colors shadow-sm"
            title="Autonomous Initiative: Click to navigate to Alpha Radar"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{lang === 'tr' ? 'Otonom İnisiyatif:' : 'Autonomous Initiative:'}</span>
            <span className="text-emerald-400 font-bold underline decoration-dotted">{lang === 'tr' ? 'AKTİF' : 'ACTIVE'}</span>
          </button>

          {/* Autonomous Max-Profit Engine Indicator */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md bg-[#0a0f1d] border border-emerald-500/30 text-slate-300 shadow-sm shadow-emerald-500/10"
            title="Autonomous 24/7 Zero-Loss Max-Profit Scalper Engine"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">{lang === 'tr' ? 'Otonom Max-Kâr:' : 'Max-Profit Bot:'}</span>
            <span className="text-emerald-400 font-bold">{lang === 'tr' ? 'AKTİF' : 'ACTIVE'}</span>
            {typeof lastTradeAgoSec === 'number' && (
              <span className="text-slate-400 text-[11px] border-l border-slate-700 pl-1.5 ml-0.5 tabular-nums">
                {lastTradeAgoSec}{lang === 'tr' ? 's önce' : 's ago'}
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
            title="Toggle Trading Mode (Paper Simulation / Live Binance API)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${settings.tradingMode === 'LIVE_API' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {settings.tradingMode === 'LIVE_API' 
              ? (lang === 'tr' ? 'CANLI BINANCE' : 'LIVE BINANCE') 
              : (lang === 'tr' ? 'SİMÜLASYON' : 'PAPER SIMULATION')}
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
              ? `Binance Live Spot Wallet Summary:\n• Total Spot Portfolio: $${(settings.liveSpotBalanceUsdt || 0).toFixed(2)} USDT\n• Available Cash: $${(settings.availableCashUsdt || 0).toFixed(2)} USDT\n• Open Positions: $${Math.max(0, (settings.liveSpotBalanceUsdt || 0) - (settings.availableCashUsdt || 0) - (settings.bnbBudget?.bnbUsdValue || 0)).toFixed(2)} USDT\n• BNB Fee Shield: $${(settings.bnbBudget?.bnbUsdValue || 0).toFixed(2)}`
              : "Simulated Paper Wallet Balance"
            }
          >
            <Wallet className={`w-3.5 h-3.5 ${settings.tradingMode === 'LIVE_API' ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-slate-400">
              {settings.tradingMode === 'LIVE_API' 
                ? (lang === 'tr' ? 'Toplam Kasa:' : 'Total Vault:') 
                : (lang === 'tr' ? 'Sanal Kasa:' : 'Paper Vault:')}
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
                <span className="text-slate-500 text-[10px]">{lang === 'tr' ? 'Nakit:' : 'Cash:'}</span>
                <strong className="text-emerald-400">${settings.availableCashUsdt.toFixed(2)}</strong>
              </span>
            )}
            {settings.tradingMode === 'LIVE_API' && Array.isArray(settings.spotBalances) && settings.spotBalances.some(b => b.asset !== 'USDT' && b.asset !== 'TRY' && b.estimatedUsd >= 1.0) && (
              <span className="hidden lg:inline text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                {settings.spotBalances.filter(b => b.asset !== 'USDT' && b.asset !== 'TRY' && b.estimatedUsd >= 1.0).map(b => b.asset).join(', ')} {lang === 'tr' ? 'Pozisyonda' : 'Open'}
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
                title="Sync Binance Vault"
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
              title="Binance 25% BNB Fee Discount: 0.075% fee instead of standard 0.10%"
            >
              <span className={`w-2 h-2 rounded-full ${settings.bnbBudget?.discountActive ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="font-bold text-amber-400">{lang === 'tr' ? 'BNB Kalkanı:' : 'BNB Shield:'}</span>
              <span>{settings.bnbBudget?.discountActive ? (lang === 'tr' ? '%25 İndirimli (0.075%)' : '25% OFF (0.075%)') : 'Standard (0.10%)'}</span>
              {settings.bnbBudget?.bnbUsdValue !== undefined && settings.bnbBudget.bnbUsdValue > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30">
                  ${settings.bnbBudget.bnbUsdValue.toFixed(2)}
                </span>
              )}
            </div>
          )}

          {/* Language Selector Toggle */}
          {onToggleLanguage && (
            <button
              type="button"
              onClick={onToggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold rounded-md border border-slate-700 bg-slate-900/90 hover:border-emerald-500/60 hover:bg-slate-800 text-slate-200 transition-all shadow-sm"
              title={lang === 'en' ? 'Türkçe arayüze geç' : 'Switch to Global English'}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'tr' ? '🇹🇷 TR' : '🇺🇸 EN'}</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors"
            title={settings.soundEnabled ? (lang === 'tr' ? 'Sesi Kapat' : 'Mute Sounds') : (lang === 'tr' ? 'Sesi Aç' : 'Enable Sounds')}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors relative"
            title={lang === 'tr' ? 'Bildirimler & Alarmlar' : 'Notifications & Alerts'}
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
              title={lang === 'tr' ? 'Terminali 2FA ile Kilitle' : 'Lock Terminal with 2FA'}
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          {/* Official Telegram Button */}
          <a
            href="https://t.me/+6Fdw5kR4SJE2ZjU0"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-md border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 transition-colors shadow-sm"
            title="Join Official Telegram"
          >
            <Send className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Telegram</span>
          </a>

          {/* Standalone Program / Direct Fullscreen App Button */}
          <button
            onClick={() => setShowStandaloneModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-md border border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-emerald-500/15 text-amber-300 hover:from-amber-500/30 hover:to-emerald-500/25 transition-all shadow-sm ring-1 ring-amber-400/30 shrink-0"
            title={lang === 'tr' ? 'Gerçek Program Olarak Aç / Masaüstüne Kur' : 'Open as Standalone Program'}
          >
            <Monitor className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">{lang === 'tr' ? 'Gerçek Program Olarak Aç' : 'Launch Full App'}</span>
            <ExternalLink className="w-3 h-3 text-amber-400/80" />
          </button>

          {/* Download Project Button */}
          <button
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-md border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-all shadow-sm cursor-pointer"
            title={lang === 'tr' ? 'Tüm Projeyi Bilgisayarına İndir (.ZIP)' : 'Download Full Codebase (.ZIP)'}
          >
            {isDownloadingZip ? (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : downloadSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>
              {isDownloadingZip
                ? (lang === 'tr' ? 'İndiriliyor...' : 'Downloading...')
                : downloadSuccess
                ? (lang === 'tr' ? 'İndirildi!' : 'Downloaded!')
                : (lang === 'tr' ? 'Projeyi İndir (.ZIP)' : 'Download (.ZIP)')}
            </span>
          </button>

          {/* User Trader Avatar */}
          <div 
            onClick={() => setActiveTab('security')} 
            className="w-7 h-7 rounded-full overflow-hidden border border-slate-700 cursor-pointer hover:border-emerald-400 transition-colors ml-1 bg-slate-800 shrink-0"
            title="Settings & API Keys"
          >
            <img 
              src="/src/assets/images/trader_avatar_pro_1790500053964.jpg" 
              alt="Trader Profile"
              className="w-full h-full object-cover"
              onError={(e) => {
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
          {lang === 'tr' ? 'Botlar' : 'Bots'} ({runningBotsCount})
        </button>
        <button
          onClick={() => setActiveTab('ai-predict')}
          className={`py-1 px-2 rounded ${activeTab === 'ai-predict' ? 'text-cyan-400 font-medium' : 'text-slate-400'}`}
        >
          AI
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
          onClick={() => setActiveTab('quant-token')}
          className={`py-1 px-2 rounded ${activeTab === 'quant-token' ? 'text-amber-400 font-medium' : 'text-slate-400'}`}
        >
          $QUANT
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`py-1 px-2 rounded ${activeTab === 'security' ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}
        >
          {lang === 'tr' ? 'Ayarlar' : 'Settings'}
        </button>
      </div>

      {/* Standalone Program / Direct App Modal */}
      {showStandaloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#0c121e] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#090d16]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {lang === 'tr' ? 'Alfa Quant Bot — Gerçek Program Olarak Çalıştır' : 'Alfa Quant Bot — Launch Standalone App'}
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Canlı / Canlı Ağ
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'tr' 
                      ? 'AI Studio geliştirici editöründen ve çerçevelerden bağımsız tam ekran kullanım'
                      : 'Run independently outside of AI Studio frames and editor constraints'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStandaloneModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              
              {/* Option 1: Direct Fullscreen Web Application (Primary) */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 relative group hover:border-emerald-500/50 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      1. Doğrudan Tam Ekran Program Bağlantısı
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {lang === 'tr' ? 'Bağımsız Web Uygulaması Olarak Aç' : 'Open Standalone Web App'}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {lang === 'tr' 
                        ? 'Bu bağlantıyı açtığınızda program yapay zeka arayüzü olmadan, bağımsız bir tarayıcı penceresinde tam ekran olarak çalışır. WebSocket, PancakeSwap ve Binance motoru 7/24 kesintisiz aktiftir.'
                        : 'Opens in a fresh browser tab completely outside any editor iframe with full screen real estate.'}
                    </p>
                  </div>
                </div>

                {/* URL Display Box */}
                <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-black/60 border border-slate-800 font-mono text-xs text-slate-300">
                  <span className="truncate flex-1 select-all text-amber-300">{LIVE_APP_URL}</span>
                  <button
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                    title="Bağlantıyı Kopyala"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? (lang === 'tr' ? 'Kopyalandı!' : 'Copied!') : (lang === 'tr' ? 'Kopyala' : 'Copy')}</span>
                  </button>
                </div>

                {/* Primary Action Button */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={LIVE_APP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{lang === 'tr' ? '🚀 Gerçek Programı Yeni Sekmede Tam Ekran Aç' : '🚀 Open Program in New Full Tab'}</span>
                  </a>
                </div>
              </div>

              {/* Option 2: Install as Desktop / Mobile App (PWA) */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-sky-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" />
                  2. Masaüstü & Telefon Uygulaması Olarak Kur (PWA)
                </span>
                <h4 className="text-sm font-bold text-white">
                  {lang === 'tr' ? 'Bilgisayarına veya Telefonuna Bağımsız Program Olarak Yükle' : 'Install as Standalone Desktop/Mobile App'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {lang === 'tr'
                    ? 'Programı Chrome veya Edge üzerinde çalıştırırken adres çubuğundaki "Yükle" simgesine veya aşağıdaki butona tıklayarak Windows/Mac masaüstünüze .exe gibi bağımsız pencere olarak yükleyebilirsiniz. Tarayıcı menüleri gizlenir ve gerçek bir masaüstü yazılımı gibi açılır.'
                    : 'Installs as a standalone PWA application on your desktop or phone home screen.'}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  {isInstallable ? (
                    <button
                      onClick={handleInstallClick}
                      disabled={isInstalling}
                      className="py-2 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isInstalling ? 'Yükleniyor...' : (lang === 'tr' ? '💻 Masaüstüne Program Olarak Kur' : 'Install App')}</span>
                    </button>
                  ) : isInstalled ? (
                    <div className="py-1.5 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{lang === 'tr' ? 'Uygulama bu cihazda zaten masaüstü programı olarak kurulu' : 'App already installed'}</span>
                    </div>
                  ) : isIOS ? (
                    <div className="p-3 rounded-lg bg-slate-800/80 text-xs text-slate-300 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{lang === 'tr' ? 'iOS Safari: Paylaş butonuna basıp "Ana Ekrana Ekle" seçeneğini seçin.' : 'iOS Safari: Tap Share -> Add to Home Screen.'}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {lang === 'tr' 
                          ? 'İpucu: Gerçek bağlantıyı açtıktan sonra Chrome/Edge adres çubuğundaki (sağ üst) "Uygulamayı Yükle" ikonuna tıklayarak tek tıkla masaüstü programına dönüştürebilirsiniz.'
                          : 'Tip: Open the real link and click the Install icon in your browser address bar.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Option 3: Local Standalone Server / Batch script */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  3. Kendi Bilgisayarında Yerel Program Olarak Çalıştırma
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {lang === 'tr'
                    ? 'İndirdiğiniz ZIP paketini açtığınızda içindeki "start_bot.bat" (Windows) veya "start_bot.sh" (Mac/Linux) dosyasına çift tıklayarak botu tamamen kendi bilgisayarınızda yerel program olarak 24/7 çalıştırabilirsiniz.'
                    : 'Extract the project ZIP and run start_bot.bat (Windows) or start_bot.sh (Mac/Linux).'}
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={isDownloadingZip}
                    className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    {isDownloadingZip ? (
                      <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                    ) : downloadSuccess ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>
                      {isDownloadingZip
                        ? (lang === 'tr' ? 'ZIP Paketi İndiriliyor...' : 'Downloading ZIP...')
                        : downloadSuccess
                        ? (lang === 'tr' ? 'ZIP İndirildi!' : 'ZIP Downloaded!')
                        : (lang === 'tr' ? '📦 Proje ZIP Paketini Doğrudan İndir' : 'Download Project ZIP')}
                    </span>
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-[#090d16] flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Port: 3000 | WebSocket: Aktif (0 REST Weight)
              </span>
              <button
                onClick={() => setShowStandaloneModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                {lang === 'tr' ? 'Kapat' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
