import React, { useState, useEffect } from 'react';
import { 
  Radar, 
  Search, 
  ShieldCheck, 
  Flame, 
  ExternalLink, 
  Bell, 
  Sparkles, 
  TrendingUp, 
  Lock, 
  Coins, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { EarlyGem } from '../types/crypto';
import { formatCryptoPrice, formatUSDT, formatVolume } from '../utils/cryptoMath';

interface EarlyGemRadarProps {
  onSimulateGemBuy: (gem: EarlyGem, amountUsdt: number) => void;
  onSetGemAlert: (gem: EarlyGem) => void;
}

export const EarlyGemRadar: React.FC<EarlyGemRadarProps> = ({
  onSimulateGemBuy,
  onSetGemAlert,
}) => {
  const [gems, setGems] = useState<EarlyGem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [alertSetIds, setAlertSetIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchGems();
  }, []);

  const fetchGems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gems/radar');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setGems(data.data);
      }
    } catch (err) {
      console.error('Failed to load early gems:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const networks = ['all', 'Solana', 'Base', 'Sui', 'Ethereum', 'Arbitrum'];

  const filteredGems = gems.filter((gem) => {
    const matchesNet = selectedNetwork === 'all' || gem.network.toLowerCase() === selectedNetwork.toLowerCase();
    const matchesSearch = gem.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          gem.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesNet && matchesSearch;
  });

  const handleAlertClick = (gem: EarlyGem) => {
    onSetGemAlert(gem);
    setAlertSetIds(prev => ({ ...prev, [gem.id]: true }));
  };

  return (
    <div className="space-y-4">
      <p role="status" className="rounded border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-200">ÖRNEK VERİ • Bu liste canlı DEX taraması değildir. Olasılık, hacim ve güvenlik değerleri doğrulanmamış gösterim verileridir.</p>
      {/* Top Banner */}
      <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-400 p-[1px]">
            <div className="w-full h-full bg-[#080d17] rounded-[7px] flex items-center justify-center">
              <Radar className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white font-sans">
                Erken Aşama Gem & Pre-Binance Token Radarı
              </h2>
              <span className="text-[10px] font-mono bg-amber-950/60 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                Örnek Radar Listesi
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Arayüz gösterimi için hazırlanmış örnek token kartları. Canlı tarama ve alarm hizmeti bağlı değildir.
            </p>
          </div>
        </div>

        {/* Search & Network Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Network tabs */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded border border-slate-800 text-xs font-mono">
            {networks.map((net) => (
              <button
                key={net}
                onClick={() => setSelectedNetwork(net)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedNetwork === net
                    ? 'bg-slate-700 text-amber-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {net === 'all' ? 'Tüm Ağlar' : net}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Token ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded pl-8 pr-3 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-36 font-sans"
            />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-500 font-sans">
            On-chain DEX havuzları ve balina hareketleri taranıyor...
          </div>
        ) : filteredGems.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 font-sans">
            Arama kriterine uygun erken aşama token bulunamadı.
          </div>
        ) : (
          filteredGems.map((gem) => {
            const isAlertActive = alertSetIds[gem.id];

            return (
              <div
                key={gem.id}
                className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4 flex flex-col justify-between hover:border-amber-500/30 transition-all shadow-sm group"
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-100 font-sans">{gem.name}</span>
                        <span className="font-mono text-xs text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold">
                          ${gem.symbol}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {gem.network} Ağı · {gem.dex}
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-white tabular-nums">
                        {formatCryptoPrice(gem.currentPrice)}
                      </div>
                      <span className={`text-[11px] font-bold tabular-nums ${gem.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {gem.change24h >= 0 ? '+' : ''}{gem.change24h.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Binance Listing Probability Meter */}
                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 my-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 flex items-center gap-1 font-sans">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Binance Listeleme İhtimali:
                      </span>
                      <span className="font-bold text-amber-400 tabular-nums">%{gem.listingProbability}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-700"
                        style={{ width: `${gem.listingProbability}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                      <span>Beklenen Listeleme Sıçraması:</span>
                      <span className="text-emerald-400 font-bold">{gem.predictedBinanceMultiplier}</span>
                    </div>
                  </div>

                  {/* Metrics Table */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2.5">
                    <div className="p-2 bg-slate-900/40 rounded border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">24s DEX Hacmi</span>
                      <span className="font-semibold text-slate-200 tabular-nums">
                        {formatUSDT(gem.volume24h)}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-900/40 rounded border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">Kilitli Havuz Likiditesi</span>
                      <span className="font-semibold text-slate-200 tabular-nums flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-emerald-400" />
                        {formatUSDT(gem.liquidity)} (%{gem.liquidityLockedPercent})
                      </span>
                    </div>
                    <div className="p-2 bg-slate-900/40 rounded border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">Güvenlik Denetimi</span>
                      <span className="font-semibold text-emerald-400 text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        {gem.auditStatus}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-900/40 rounded border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">Honeypot Riski</span>
                      <span className="font-semibold text-emerald-400 text-[11px]">
                        {gem.honeypotRisk} (Örnek)
                      </span>
                    </div>
                  </div>

                  {/* Catalyst Note */}
                  <div className="p-2.5 bg-amber-950/20 border border-amber-500/20 rounded text-xs text-amber-200/90 font-sans leading-snug my-2">
                    <strong className="text-amber-400 font-semibold block mb-0.5">Tespit Edilen Katalizör:</strong>
                    {gem.catalyst}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between gap-2 mt-1">
                  <button
                    disabled title="Canlı alarm hizmeti bağlı değil"
                    className={`px-3 py-1.5 rounded text-xs font-sans flex items-center gap-1.5 transition-colors ${
                      isAlertActive 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isAlertActive ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Alarm Aktif
                      </>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5" /> Listeleme Alarmı Kur
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onSimulateGemBuy(gem, 200)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center gap-1.5 transition-colors font-sans"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    $200 Simüle Alım Yap
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

