import React, { useState } from 'react';
import { 
  Coins, 
  Flame, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Lock, 
  Zap, 
  ExternalLink, 
  Copy, 
  Check, 
  Award, 
  CheckCircle2, 
  Vote, 
  Cpu, 
  Users,
  Wallet,
  ArrowRight,
  PieChart
} from 'lucide-react';
import { formatUSDT } from '../utils/cryptoMath';
import { copyToClipboard } from '../utils/clipboard';

interface TokenUtilitySectionProps {
  language?: 'en' | 'tr';
}

export const TokenUtilitySection: React.FC<TokenUtilitySectionProps> = ({ language = 'en' }) => {
  const isTr = language === 'tr';
  const [quantBalance, setQuantBalance] = useState<number>(5000);
  const [copiedContract, setCopiedContract] = useState<boolean>(false);

  const LIVE_CONTRACT_ADDRESS = "0x397397895fac99de11f5893bc46e32324d313d92";
  const CAKE_LP_PAIR = "0xb5b0ee0e0c636a95792845ae0450a7881f0d1e29";
  const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

  // Tier calculation based on balance
  const currentTier = quantBalance >= 50000 ? 4 : quantBalance >= 10000 ? 3 : quantBalance >= 2500 ? 2 : quantBalance >= 1000 ? 1 : 0;

  const handleCopyContract = async () => {
    await copyToClipboard(LIVE_CONTRACT_ADDRESS);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Value Proposition Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/60 border border-amber-500/40 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Coins className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 font-sans">
                  {isTr ? '$QUANT Token Utility & Değer Mimarisi' : '$QUANT Token Utility & Ecosystem Architecture'}
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold">
                    {isTr ? 'GERÇEK FAYDA & NAKİT AKIŞI' : 'REAL UTILITY & REVENUE SHARE'}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 font-sans max-w-2xl">
                  {isTr 
                    ? '$QUANT, boş vaatler yerine çalışan yüksek frekanslı ticaret botunun motor gücünü temsil eder. Token sahipleri bot erişimi, geri alım yakımları ve gerçek getiri paylaşımlarından yararlanır.'
                    : '$QUANT powers the institutional algorithmic trading engine. Token holders unlock bot tiers, profit-driven automated buyback & burn, and real yield distributions.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://pancakeswap.finance/swap?chain=bsc&inputCurrency=BNB&outputCurrency=${LIVE_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-lg text-xs font-sans flex items-center gap-2 shadow-md transition-all"
            >
              <TrendingUp className="w-4 h-4 text-slate-950" />
              <span>{isTr ? "PancakeSwap'te Satın Al" : 'Buy on PancakeSwap'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={handleCopyContract}
              className="px-3 py-2 bg-slate-950/80 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              {copiedContract ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedContract ? (isTr ? 'Kopyalandı!' : 'Copied!') : `${LIVE_CONTRACT_ADDRESS.slice(0, 6)}...${LIVE_CONTRACT_ADDRESS.slice(-4)}`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Tier & Benefits Calculator */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2 font-sans">
              <Zap className="w-4 h-4 text-amber-400" />
              {isTr ? 'İnteraktif Kademe & Ayrıcalık Simülatörü' : 'Interactive Holding Tier & Benefits Calculator'}
            </h4>
            <span className="text-[11px] text-slate-400 font-sans">
              {isTr 
                ? 'Cüzdanınızda tuttuğunuz veya tutmayı planladığınız $QUANT miktarını seçin; kilidi açılan özellikleri görün:'
                : 'Select or input your $QUANT balance to preview unlocked algorithmic privileges and automated bot access:'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[0, 1000, 2500, 10000, 50000].map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => setQuantBalance(amt)}
                className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                  quantBalance === amt
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {amt === 0 ? '0' : `${(amt / 1000).toLocaleString()}k`} $QUANT
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Tier Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">{isTr ? 'Aktif Kademeniz' : 'Current Tier'}</span>
            <span className="text-base font-bold text-amber-400 flex items-center gap-1.5 font-sans">
              <Award className="w-4 h-4 text-amber-400" />
              {currentTier === 0 
                ? (isTr ? 'Misafir (Ücretsiz)' : 'Guest (Free)') 
                : currentTier === 1 
                ? (isTr ? 'Tier 1: Temel Scalper' : 'Tier 1: Basic Scalper') 
                : currentTier === 2 
                ? (isTr ? 'Tier 2: Pro Trader' : 'Tier 2: Pro Trader') 
                : currentTier === 3 
                ? (isTr ? 'Tier 3: Alpha Whale' : 'Tier 3: Alpha Whale') 
                : (isTr ? 'Tier 4: Kurumsal Node' : 'Tier 4: Institutional Node')}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {isTr ? 'Bakiye:' : 'Holdings:'} {quantBalance.toLocaleString()} $QUANT
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">{isTr ? 'Otonom Bot Kapasitesi' : 'Autonomous Bot Slots'}</span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              {currentTier === 0 ? '1 Bot' : currentTier === 1 ? '2 Bots' : currentTier === 2 ? '4 Bots' : currentTier === 3 ? '8 Bots (Unlimited)' : 'Unlimited + Dedicated Node'}
            </span>
            <span className="text-[11px] text-slate-500 font-sans">{isTr ? 'Eşzamanlı Binance Motoru' : 'Concurrent Binance Engines'}</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">{isTr ? 'Erken Radar & Balina Takibi' : 'Early Gem & Whale Radar'}</span>
            <span className="text-base font-bold font-mono">
              {currentTier >= 3 ? (
                <span className="text-emerald-400 flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-4 h-4" /> {isTr ? 'KİLİT AÇIK (Canlı)' : 'UNLOCKED (Live)'}
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1 font-sans">
                  <Lock className="w-3.5 h-3.5" /> {isTr ? '10k $QUANT Gerekli' : 'Requires 10k $QUANT'}
                </span>
              )}
            </span>
            <span className="text-[11px] text-slate-500 font-sans">{isTr ? 'DEX Gem Sinyalleri' : 'DEX Gem Signals'}</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">{isTr ? 'Aylık Tahmini Geri Alım Payı' : 'Est. Monthly Buyback Value'}</span>
            <span className="text-base font-bold text-cyan-400 font-mono">
              {quantBalance === 0 ? '$0 / mo' : `~$${formatUSDT((quantBalance / 1000) * 8.4)} / mo`}
            </span>
            <span className="text-[10px] text-emerald-400 font-sans">{isTr ? 'Gerçek İşlem Hacminden' : 'From Real Trading Yield'}</span>
          </div>
        </div>

        {/* Unlocked Features Checklist */}
        <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
          <span className="text-xs font-bold text-emerald-300 block mb-2 font-sans">
            {isTr ? '🚀 Seçilen Bakiye ile Cüzdanınızın Sahip Olduğu Güçler:' : '🚀 Privileges Unlocked with Selected Holding Balance:'}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs font-sans text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isTr ? 'Sıfır Kayıp (Zararına Satış Yapmama) Kalkanı' : 'Zero-Loss (Never Panic-Sell) Execution Guard'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isTr ? '%0 Alım/Satım Transfer Vergisi' : '0% Transfer Tax (Zero Buy/Sell Fee)'}</span>
            </div>
            <div className={`flex items-center gap-2 ${currentTier >= 1 ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
              <CheckCircle2 className={`w-4 h-4 ${currentTier >= 1 ? 'text-emerald-400' : 'text-slate-600'} shrink-0`} />
              <span>{isTr ? 'Otomatik Take-Profit (+%2.8) Kâr Kilidi' : 'Automated Take-Profit (+2.8%) Target Lock'}</span>
            </div>
            <div className={`flex items-center gap-2 ${currentTier >= 2 ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
              <CheckCircle2 className={`w-4 h-4 ${currentTier >= 2 ? 'text-emerald-400' : 'text-slate-600'} shrink-0`} />
              <span>{isTr ? '24/7 Kesintisiz WebSocket & Hızlı Arbitraj' : '24/7 Low-Latency WebSocket Arbitrage'}</span>
            </div>
            <div className={`flex items-center gap-2 ${currentTier >= 3 ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
              <CheckCircle2 className={`w-4 h-4 ${currentTier >= 3 ? 'text-emerald-400' : 'text-slate-600'} shrink-0`} />
              <span>{isTr ? 'DEX Erken Gem Radarı & Balina Cüzdan Alarmları' : 'DEX Early Gem Radar & Whale Feed'}</span>
            </div>
            <div className={`flex items-center gap-2 ${currentTier >= 4 ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
              <CheckCircle2 className={`w-4 h-4 ${currentTier >= 4 ? 'text-emerald-400' : 'text-slate-600'} shrink-0`} />
              <span>{isTr ? 'Özel Low-Latency Node & VIP Webhook' : 'Dedicated Sub-Second Node & VIP Signals'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Pillars of $QUANT Utility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Pillar 1 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white font-sans">
                {isTr ? '1. Token-Gated Bot Algoritmaları & Otomasyon' : '1. Token-Gated Bot Access & VIP Signals'}
              </h4>
              <span className="text-[11px] text-slate-400 font-sans">{isTr ? 'Yazılım Erişimi' : 'Autonomous Trading Engine'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {isTr
              ? 'Geleneksel botlar ayda yüzlerce dolar abonelik ücreti talep eder. $QUANT modelinde ise abonelik ücreti ödemezsiniz; tek yapmanız gereken cüzdanınızda $QUANT tutmaktır. Tokenlarınızı satmadığınız sürece tüm profesyonel bot motoru emrinizdedir.'
              : 'Traditional quant tools charge hundreds of dollars in monthly subscriptions. With $QUANT, there are no subscriptions. Simply hold $QUANT in your Web3 wallet to unlock the full institutional scalping engine and sub-second webhook triggers.'}
          </p>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-amber-300 font-mono">
            {isTr ? '💎 Cüzdanda $QUANT Tut = Ömür Boyu Ücretsiz Algoritmik Ticaret' : '💎 Hold $QUANT in Wallet = Lifetime Algorithmic Trading Access'}
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white font-sans">
                {isTr ? '2. Otomatik Buyback & Burn (Sürekli Alım Baskısı)' : '2. Automated PancakeSwap Buyback & Burn'}
              </h4>
              <span className="text-[11px] text-slate-400 font-sans">{isTr ? 'Matematiksel Fiyat Desteği' : 'Deflationary Price Floor'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {isTr 
              ? 'Botun Binance spot işlemlerinden ve PancakeSwap arbitrajından ürettiği gelirlerin %50\'si ile piyasadan $QUANT satın alınır ve doğrudan 0x...dEaD adresine gönderilerek ebediyen yakılır. Dolaşımdaki arz azalırken fiyata kalıcı taban oluşturulur.'
              : 'A dedicated portion of trading profits generated across running bot instances is continuously used to market-buy $QUANT on PancakeSwap and permanently transfer it to 0x00...dEaD. Circulating supply shrinks while establishing a constant algorithmic buy-side bid.'}
          </p>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-rose-300 font-mono">
            {isTr ? '🔥 Gelir Kazandıkça Al ve Yak = Dolaşımda Azalan Arz' : '🔥 Bot Profits Buy & Burn = Ever-Decreasing Circulating Supply'}
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white font-sans">
                {isTr ? '3. Real Yield & Staking Ödülleri' : '3. Real Yield & Staking Vault (USDT / BNB)'}
              </h4>
              <span className="text-[11px] text-slate-400 font-sans">{isTr ? 'Enflasyonsuz Gerçek Getiri' : 'Pure Trading Profit Sharing'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {isTr 
              ? 'Piyasadaki içi boş tokenların aksine, $QUANT staker\'larına karşılıksız yeni token basıp enflasyon yaratmaz. Ödüller tamamen botun borsalardan kazandığı gerçek nakit kârlardan (USDT ve BNB) dağıtılır.'
              : 'Unlike inflationary reward tokens, $QUANT never mints unbacked tokens. Staking yield is 100% funded by real trading profits harvested on Binance Spot and DEX liquidity pairs in USDT and BNB.'}
          </p>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-emerald-300 font-mono">
            {isTr ? '💰 Gerçek Kâr Payı Dağıtımı (Enflasyonsuz Sürdürülebilir Verim)' : '💰 Real Yield Dividends in USDT & BNB (Zero Inflation)'}
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white font-sans">
                {isTr ? '4. DAO Yönetişimi & Yeni Parite Oylaması' : '4. DAO Strategy & Asset Governance'}
              </h4>
              <span className="text-[11px] text-slate-400 font-sans">{isTr ? 'Topluluk Kontrolü' : 'Decentralized Direction'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {isTr 
              ? 'Botun radarına eklenecek yeni kripto paralar (Örn. SUI, PEPE, TIA), risk çarpanları ve Take-Profit hedefleri $QUANT sahiplerinin oylarıyla belirlenir. 1 $QUANT = 1 Oy hakkı tanır.'
              : 'Token holders vote on which altcoins enter the autonomous scalping matrix (e.g., SUI, PEPE, TIA), risk tolerances, and newly developed AI models. 1 $QUANT = 1 Governance Vote.'}
          </p>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-purple-300 font-mono">
            {isTr ? '🗳️ Topluluk Yönetimi: Stratejileri Birlikte Belirleyin' : '🗳️ Community Governance: Decide Scalping Pairs Together'}
          </div>
        </div>
      </div>

      {/* Security & Audit Proof Box */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-3 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h4 className="text-xs font-bold text-white">
              {isTr ? 'Doğrulanmış Güvenlik ve Likidite Kilidi (100% Rug-Proof)' : 'On-Chain Security & Liquidity Proof (100% Rug-Proof)'}
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
            {isTr ? 'GÜVENLİK PUANI: 100/100' : 'SECURITY SCORE: 100/100'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-300">
          <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-300 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> {isTr ? 'Likidite %100 Kilitli' : '100% Liquidity Burned'}
            </span>
            <p className="text-[11px] text-slate-400">
              {isTr 
                ? `PancakeSwap Cake-LP makbuzları ebediyen Dead (${DEAD_ADDRESS.slice(0, 8)}...) adresine kilitlenmiştir. Kimse likiditeyi çekemez.`
                : `100% of Cake-LP tokens have been burned permanently to 0x00...dEaD (${DEAD_ADDRESS.slice(0, 8)}...). Rug-pull is mathematically impossible.`}
            </p>
          </div>

          <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" /> {isTr ? '%0 Alım-Satım Vergisi' : '0% Buy/Sell Tax'}
            </span>
            <p className="text-[11px] text-slate-400">
              {isTr 
                ? 'Gizli vergi veya satış engeli yoktur. Alırken %0, satarken %0 vergi kesilir; yatırımcının cebinden 1 kuruş bile kesilmez.'
                : 'No hidden taxes or blacklist functions. 0% tax on buy, 0% on sell. Investors retain 100% of their traded capital.'}
            </p>
          </div>

          <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-cyan-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> {isTr ? 'Mint Fonksiyonu Yok' : 'Ownership Renounced / No Mint'}
            </span>
            <p className="text-[11px] text-slate-400">
              {isTr 
                ? 'Toplam arz 100,000,000 ile sınırlıdır. Geliştirici veya başkası tarafından sonradan tek bir yeni token bile basılamaz.'
                : 'Contract ownership is renounced. Total circulating supply is permanently capped at 100,000,000 with zero minting function.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>{isTr ? 'Sözleşme Adresi:' : 'Verified BEP-20 Contract:'}</span>
            <code className="bg-slate-900 px-2 py-0.5 rounded text-amber-300 font-mono text-[10px]">
              {LIVE_CONTRACT_ADDRESS}
            </code>
          </div>
          <a
            href={`https://bscscan.com/token/${LIVE_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline font-mono"
          >
            <span>{isTr ? 'BscScan Doğrulama Sayfası' : 'BscScan Explorer Verification'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
