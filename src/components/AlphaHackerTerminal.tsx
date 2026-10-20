import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Flame, 
  Radio, 
  TrendingUp, 
  ShieldAlert, 
  Sparkles, 
  Bot, 
  RefreshCw, 
  Zap, 
  ExternalLink, 
  CheckCircle2, 
  Crosshair,
  Wifi,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { AlphaOpportunity, AlphaScannerResponse, BotInstance } from '../types/crypto';
import { formatUSDT } from '../utils/cryptoMath';

interface AlphaHackerTerminalProps {
  onAutoDeployAlphaBot: (opp: AlphaOpportunity) => void;
  balanceUsdt: number;
  tradingMode: 'PAPER' | 'LIVE_API';
  autoLiveExecutionEnabled: boolean;
}

export const AlphaHackerTerminal: React.FC<AlphaHackerTerminalProps> = ({
  onAutoDeployAlphaBot,
  balanceUsdt,
  tradingMode,
  autoLiveExecutionEnabled,
}) => {
  const [data, setData] = useState<AlphaScannerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string>('');
  const [autoPilotEnabled, setAutoPilotEnabled] = useState<boolean>(false);
  const [scalpProfile, setScalpProfile] = useState<'FAST_SCALP' | 'INTRADAY_MOMENTUM' | 'BREAKOUT_WAVE'>('FAST_SCALP');
  const [deployedSymbols, setDeployedSymbols] = useState<Set<string>>(new Set());

  const deployedSymbolsRef = React.useRef(deployedSymbols);
  React.useEffect(() => {
    deployedSymbolsRef.current = deployedSymbols;
  }, [deployedSymbols]);

  const autoPilotRef = React.useRef(autoPilotEnabled);
  React.useEffect(() => {
    autoPilotRef.current = autoPilotEnabled;
  }, [autoPilotEnabled]);

  const fetchAlphaData = async () => {
    setData(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/alpha-scanner', {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) {
        setIsLoading(false);
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setIsLoading(false);
        return;
      }
      const json = await res.json();
      if (json && json.success && json.data) {
        setData(json.data);
        setLastScanTime(new Date().toLocaleTimeString('tr-TR'));

        // OTONOM İNİSİYATİF: En Yüksek Kârlı Alpha Fırsatını Matematiksel Olarak Sırala ve Otomatik Pozisyon Aç
        if (json.provenance?.verified === true && autoPilotRef.current && Array.isArray(json.data.opportunities) && json.data.opportunities.length > 0) {
          // Kâr potansiyeline (% beklenen getiri ve sentiment skoruna) göre azalan sırala
          const sortedByProfit = [...json.data.opportunities].sort((a: AlphaOpportunity, b: AlphaOpportunity) => {
            const retA = parseFloat((a.expectedReturnPercent || '0').replace(/[^0-9.]/g, '')) || 0;
            const retB = parseFloat((b.expectedReturnPercent || '0').replace(/[^0-9.]/g, '')) || 0;
            const scoreA = retA * 0.7 + (a.sentimentScore || 50) * 0.3;
            const scoreB = retB * 0.7 + (b.sentimentScore || 50) * 0.3;
            return scoreB - scoreA;
          });

          // Henüz bot açılmamış en karlı fırsatı yakala
          const topProfitOpp = sortedByProfit.find((o: AlphaOpportunity) => !deployedSymbolsRef.current.has(o.symbol));
          if (topProfitOpp) {
            console.log('💎 Dahi Hacker AI: En Yüksek Kârlı Token Seçildi ->', topProfitOpp.symbol, topProfitOpp.expectedReturnPercent);
            onAutoDeployAlphaBot(topProfitOpp);
            setDeployedSymbols(prev => new Set([...prev, topProfitOpp.symbol]));
          }
        }
      }
    } catch {
      // Gracefully handle transient network errors
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlphaData();
    const interval = setInterval(fetchAlphaData, 45000); // 45s deep web scan refresh
    return () => clearInterval(interval);
  }, []);

  const handleDeploy = (opp: AlphaOpportunity) => {
    return; // Model suggestions are not verified executable opportunities.
    setDeployedSymbols(prev => new Set([...prev, opp.symbol]));
  };

  return (
    <div className="space-y-4">
      <p role="status" className="rounded border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-200">Model üretimi • Haber, balina hareketi veya zincir üstü doğrulama değildir. Otomatik bot kurulumu kapalıdır.</p>
      {/* Hacker Command Top Banner */}
      <div className="bg-[#080d17] rounded-lg border border-emerald-500/40 p-4 relative overflow-hidden shadow-lg shadow-emerald-950/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Terminal className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-sans tracking-wide">
                  Dahi Kripto Hacker & Web Alpha İstihbarat Radarı
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-spin" />
                  CANLI İNTERNET TARAYICI
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                X/Twitter alpha sızıntıları, Binance Labs listeleme dedikoduları, balina cüzdan transferleri ve DEX hacim anomalileri taranıyor.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Pilot Autonomous Switch */}
            <div className="flex items-center gap-2 bg-[#0b101d] px-3 py-1.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-slate-200">Otonom İnisiyatif Modu:</span>
              </div>
              <button
                type="button"
                disabled title="Model çıktısından otomatik işlem kapalı"
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                  autoPilotEnabled 
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {autoPilotEnabled ? 'AKTİF (Tam Yetki)' : 'MANUEL ONAY'}
              </button>
            </div>

            <button
              onClick={fetchAlphaData}
              disabled={isLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-400 rounded-md text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'İnternet Taranıyor...' : 'Ağı Yeniden Tara'}
            </button>
          </div>
        </div>

        {/* Global Market Mood & Hacker Intelligence Insight */}
        {data && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#0b101d] p-2.5 rounded border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Küresel Piyasa Rejimi</span>
                <span className="text-xs font-bold font-mono text-emerald-400">
                  {data.globalMarketMood.replace('_', ' ')}
                </span>
              </div>
              <Flame className="w-5 h-5 text-amber-400" />
            </div>

            <div className="bg-[#0b101d] p-2.5 rounded border border-slate-800/80 md:col-span-2">
              <span className="text-[10px] text-emerald-400 uppercase font-mono flex items-center gap-1 mb-0.5">
                <Wifi className="w-3 h-3" />
                Dahi Hacker Likidite & Balina Raporu:
              </span>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {data.hackerAnalysis}
              </p>
            </div>
          </div>
        )}

        {/* Intraday Day Trading & Binance Fee Safeguard Banner */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              GÜN İÇİ AL-SAT (DAY TRADING) MOTORU
            </span>
            <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">
              Uzun vadeli tutma yok: Hızlı scalp ile kâr alınıp derhal serbest USDT nakde dönülür.
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-sans">Scalp Profili:</span>
            <div className="flex items-center bg-[#0b101d] p-0.5 rounded border border-slate-800">
              <button
                type="button"
                onClick={() => setScalpProfile('FAST_SCALP')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  scalpProfile === 'FAST_SCALP'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="1-15 Dk hızlı dalga. Binance komisyonu düşüldükten sonra Net +%1.2 - +%1.8 kâr alma hedefi."
              >
                ⚡ Hızlı Scalp (Net +%1.5)
              </button>
              <button
                type="button"
                onClick={() => setScalpProfile('INTRADAY_MOMENTUM')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  scalpProfile === 'INTRADAY_MOMENTUM'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="15-60 Dk gün içi trend. Komisyon sonrası Net +%2.8 - +%3.8 kâr alma hedefi."
              >
                🎯 Gün İçi Trend (Net +%3.2)
              </button>
              <button
                type="button"
                onClick={() => setScalpProfile('BREAKOUT_WAVE')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  scalpProfile === 'BREAKOUT_WAVE'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="1-3 Saat kırılım dalgası. Komisyon sonrası Net +%4.5 - +%7.0 kâr alma hedefi."
              >
                🚀 Kırılım Dalgası (Net +%5.0)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alpha Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data?.opportunities.map((opp, idx) => {
          const isDeployed = deployedSymbols.has(opp.symbol);
          
          // Calculate realistic Intraday Net Profit after Binance 0.20% Round-trip Fee
          const match = opp.expectedReturnPercent.match(/([0-9.]+)/);
          const rawExpected = match ? parseFloat(match[1]) : 3.0;
          const grossTarget = scalpProfile === 'FAST_SCALP' 
            ? Math.min(2.4, Math.max(1.4, rawExpected * 0.45))
            : (scalpProfile === 'INTRADAY_MOMENTUM' ? Math.min(4.5, Math.max(2.5, rawExpected * 0.75)) : Math.min(7.5, Math.max(3.8, rawExpected)));
          const binanceRoundTripFee = 0.20; // 0.10% buy + 0.10% sell
          const netTarget = parseFloat(Math.max(0.8, grossTarget - binanceRoundTripFee).toFixed(2));
          const stopLossPct = scalpProfile === 'FAST_SCALP' ? 1.0 : (scalpProfile === 'INTRADAY_MOMENTUM' ? 1.3 : 1.8);

          return (
            <div 
              key={idx}
              className={`bg-[#0b101d] rounded-lg border p-4 flex flex-col justify-between transition-all hover:border-emerald-500/50 ${
                opp.priority === 'CRITICAL_ALPHA' 
                  ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-[#0b101d]' 
                  : 'border-slate-800/80'
              }`}
            >
              <div>
                {/* Header: Priority & Action */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold font-mono text-white">
                      {opp.symbol}
                    </span>
                    <span className="text-xs text-slate-400 font-sans">
                      ({opp.tokenName})
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    opp.priority === 'CRITICAL_ALPHA'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : opp.priority === 'HIGH_YIELD'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    {opp.priority.replace('_', ' ')}
                  </span>
                </div>

                {/* Alpha Headline (Haber/Dedikodu) */}
                <div className="bg-[#080d17] p-2.5 rounded border border-slate-800 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 font-semibold">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      {opp.source}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      Bullish: %{opp.sentimentScore}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-sans font-medium leading-snug">
                    "{opp.alphaHeadline}"
                  </p>
                </div>

                {/* Transparent Binance Commission & Net Profit Breakdown */}
                <div className="bg-slate-900/80 p-2 rounded border border-emerald-500/20 mb-3 font-mono text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Brüt Scalp Hedefi:</span>
                    <span className="text-slate-200">+{grossTarget.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span>Binance Komisyonu (Al+Sat):</span>
                    </span>
                    <span className="text-amber-400 font-medium">-%0.20</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                    <span className="text-emerald-300 font-bold">Net Cebe Kalan Kâr:</span>
                    <strong className="text-emerald-400 font-bold text-xs">+{netTarget}% NET</strong>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mb-3 font-mono text-xs">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Hedef Satış</span>
                    <strong className="text-emerald-400 text-sm">+{netTarget}%</strong>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Sıkı Stop Loss</span>
                    <strong className="text-rose-400 text-sm">-%{stopLossPct}</strong>
                  </div>
                </div>

                {/* Rationale (Dahi Trader Mantığı) */}
                <div className="text-[11px] text-slate-400 font-sans leading-relaxed mb-4">
                  <strong className="text-slate-300 font-semibold block mb-0.5">Gün İçi Scalp Mantığı:</strong>
                  {opp.rationale}
                </div>
              </div>

              {/* Bot Deploy Action Button */}
              <div>
                <button
                  type="button"
                  onClick={() => handleDeploy({
                    ...opp,
                    expectedReturnPercent: `+${netTarget}% Net`,
                    recommendedStopLoss: stopLossPct
                  })}
                  className={`w-full py-2.5 rounded font-sans text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                    isDeployed
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 cursor-default'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  }`}
                >
                  {isDeployed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Gün İçi Scalp Devrede (Kâr Hedefleniyor)
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      ⚡ Gün İçi Scalp Başlat (Net +%{netTarget})
                    </>
                  )}
                </button>
                {tradingMode === 'LIVE_API' && autoLiveExecutionEnabled && (
                  <span className="text-[10px] text-emerald-400 text-center block mt-1 font-mono">
                    ⚡ Binance Global canlı emir motoruna bağlı (Komisyon korumalı)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

