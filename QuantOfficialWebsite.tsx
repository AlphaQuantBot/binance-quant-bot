import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Flame, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Copy, 
  Check, 
  ExternalLink, 
  Lock, 
  Zap, 
  FileCode2, 
  BookOpen, 
  ArrowRight,
  BarChart3,
  Layers,
  Award,
  Send,
  Share2,
  ThumbsUp,
  Cpu,
  Terminal,
  Activity,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  Globe,
  Code2,
  Download,
  Percent,
  Compass,
  Instagram
} from 'lucide-react';
import { formatUSDT } from '../utils/cryptoMath';
import { copyToClipboard } from '../utils/clipboard';

interface QuantOfficialWebsiteProps {
  onLaunchTerminal?: () => void;
  language?: 'en' | 'tr';
}

export const QuantOfficialWebsite: React.FC<QuantOfficialWebsiteProps> = ({
  onLaunchTerminal,
  language
}) => {
  const [lang, setLang] = useState<'tr' | 'en'>(() => {
    if (language) return language;
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const saved = localStorage.getItem('alfaquant_lang');
      if (saved === 'en' || saved === 'tr') return saved as 'tr' | 'en';
      return navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en';
    }
    return 'en';
  });

  useEffect(() => {
    if (language) {
      setLang(language);
    }
  }, [language]);

  const isTr = lang === 'tr';

  const [copiedContract, setCopiedContract] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [addedMetaMask, setAddedMetaMask] = useState(false);
  const [addedLpMetaMask, setAddedLpMetaMask] = useState(false);
  const [calculatorAmount, setCalculatorAmount] = useState<number>(10000);
  const [activeSection, setActiveSection] = useState<'all' | 'vision' | 'software' | 'flywheel' | 'tokenomics' | 'roadmap' | 'whitepaper'>('all');
  const [whitepaperOpen, setWhitepaperOpen] = useState(false);
  const [hostingerModalOpen, setHostingerModalOpen] = useState(false);
  const [copiedHtmlCode, setCopiedHtmlCode] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleDownloadWebsite = async () => {
    try {
      const res = await fetch('/website.html');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'index.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      window.open('/website.html', '_blank');
    }
  };

  const handleCopyWebsiteHtml = async () => {
    try {
      const res = await fetch('/website.html');
      const text = await res.text();
      await copyToClipboard(text);
      setCopiedHtmlCode(true);
      setTimeout(() => setCopiedHtmlCode(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const LIVE_CONTRACT_ADDRESS = "0x397397895fac99de11f5893bc46e32324d313d92";
  const CAKE_LP_ADDRESS = "0xb5b0ee0e0c636a95792845ae0450a7881f0d1e29";
  const TELEGRAM_LINK = "https://t.me/+6Fdw5kR4SJE2ZjU0";
  const COINSNIPER_LINK = "https://coinsniper.net/coin/94828";
  const PANCAKESWAP_BUY_LINK = `https://pancakeswap.finance/swap?chain=bsc&inputCurrency=BNB&outputCurrency=${LIVE_CONTRACT_ADDRESS}`;
  const DEXSCREENER_LINK = `https://dexscreener.com/bsc/${LIVE_CONTRACT_ADDRESS}`;
  const BSCSCAN_LINK = `https://bscscan.com/token/${LIVE_CONTRACT_ADDRESS}`;

  // Quantitative Stats
  const totalSupply = 100_000_000;
  const burnedTokens = 142_500;
  const priceUsd = 0.0485;
  const marketCap = (totalSupply - burnedTokens) * priceUsd;
  const holdersCount = 148;
  const totalBotProfitBnb = 48.65;

  const handleCopyContract = async () => {
    await copyToClipboard(LIVE_CONTRACT_ADDRESS);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  const handleCopyShare = async () => {
    const text = isTr
      ? `🚀 Alfa Quant Protocol ($QUANT) - Yapay Zekâ Destekli Otomatik Geri Alım & Ticaret Tokenı!\n\nSözleşme Adresi: ${LIVE_CONTRACT_ADDRESS}\nPancakeSwap & DexScreener: ${DEXSCREENER_LINK}\nResmi Telegram: ${TELEGRAM_LINK}`
      : `🚀 Alfa Quant Protocol ($QUANT) - AI-Powered Automated Buyback & Quantitative Trading Token!\n\nContract: ${LIVE_CONTRACT_ADDRESS}\nPancakeSwap & DexScreener: ${DEXSCREENER_LINK}\nOfficial Telegram: ${TELEGRAM_LINK}`;
    await copyToClipboard(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleAddToMetaMask = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        alert(isTr ? "MetaMask tarayıcınızda bulunamadı." : "MetaMask not detected in browser.");
        return;
      }
      await ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: LIVE_CONTRACT_ADDRESS,
            symbol: 'QUANT',
            decimals: 18,
            image: window.location.origin + '/quant_logo.jpg',
          },
        },
      });
      setAddedMetaMask(true);
      setTimeout(() => setAddedMetaMask(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCakeLpToMetaMask = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return;
      await ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: CAKE_LP_ADDRESS,
            symbol: 'Cake-LP',
            decimals: 18,
            image: 'https://tokens.pancakeswap.finance/images/symbol/cake.png',
          },
        },
      });
      setAddedLpMetaMask(true);
      setTimeout(() => setAddedLpMetaMask(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Staking rewards calculation
  const poolSharePercent = (calculatorAmount / totalSupply) * 100;
  const estMonthlyBnb = ((calculatorAmount / 10000) * 0.42).toFixed(3);
  const estAnnualUsd = (parseFloat(estMonthlyBnb) * 12 * 620).toFixed(2);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 pb-20">
      
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-emerald-950/70 border-b border-amber-500/30 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-amber-300 font-bold">
              {isTr ? 'RESMİ TOKEN PORTALI & TANITIM SİTESİ' : 'OFFICIAL TOKEN PORTAL & SHOWCASE'}
            </span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="text-slate-300 hidden sm:inline">
              {isTr ? 'PancakeSwap V2 Havuzu & Otomatik Geri Alım Motoru Devrede' : 'PancakeSwap V2 Pool & Autonomous Buyback Active'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold">$QUANT: ${priceUsd} (+1,425%)</span>
            <button
              onClick={() => setLang(l => l === 'tr' ? 'en' : 'tr')}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>{lang === 'tr' ? '🇹🇷 TR' : '🇺🇸 EN'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* HOSTINGER FAST-DEPLOYMENT & DOMAIN HUB BAR */}
      <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/90 border-b border-emerald-500/30 px-4 py-3 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">alfaquantai.com</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  {isTr ? 'ALAN ADI SAHİBİSİNİZ 🏆' : 'DOMAIN ACTIVE 🏆'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-[11px] text-cyan-400 font-mono">contact@alfaquantai.com</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                {isTr 
                  ? 'Hostinger Starter Hosting paketiniz hazır. Web sitesini 1 tıkla indirip public_html klasörüne atarak hemen yayına alabilirsiniz.'
                  : 'Hostinger Hosting is active. Download this complete site and upload to your public_html folder.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadWebsite}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              title="Hostinger için index.html dosyasını indir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isTr ? '📥 index.html İndir' : '📥 Download index.html'}</span>
            </button>

            <a
              href="/quant_icon_32.svg"
              download="quant_icon_32.svg"
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              title="BscScan için 32x32 SVG Logo İndir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isTr ? '🎨 32x32 SVG Logo (BscScan)' : '🎨 32x32 SVG Logo'}</span>
            </a>

            <a
              href="/api/download-logo?format=jpg"
              download="AlfaQuant_Official_Logo_1024x1024.jpg"
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              title="Sosyal Medya, Twitter, Telegram İçin 1024x1024 HD Logo İndir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isTr ? '⭐ HD Logo İndir (1024x1024)' : '⭐ HD Logo (1024x1024)'}</span>
            </a>

            <a
              href="/website.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isTr ? '🌐 Yeni Sekmede Canlı Önizle' : '🌐 Preview Standalone'}</span>
            </a>

            <button
              type="button"
              onClick={() => setHostingerModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{isTr ? '🚀 Hostinger Kurulum Rehberi' : '🚀 Hostinger Guide'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN WEBSITE NAVBAR */}
      <header className="sticky top-0 z-40 bg-[#070b16]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-400/50 shadow-md shadow-amber-500/10 bg-black shrink-0">
              <img src="/quant_logo.jpg" alt="$QUANT Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white font-sans">
                  ALFA QUANT
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  $QUANT
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono block">
                BNB Smart Chain (BEP-20)
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#vision" className="hover:text-amber-400 transition-colors">
              {isTr ? 'Vizyon & Amaç' : 'Vision & Thesis'}
            </a>
            <a href="#software" className="hover:text-amber-400 transition-colors">
              {isTr ? 'Yazılım & Program' : 'Software Engine'}
            </a>
            <a href="#flywheel" className="hover:text-amber-400 transition-colors">
              {isTr ? 'Geri Alım Çarkı' : 'Buyback Flywheel'}
            </a>
            <a href="#tokenomics" className="hover:text-amber-400 transition-colors">
              {isTr ? 'Tokenomics' : 'Tokenomics'}
            </a>
            <a href="#staking" className="hover:text-amber-400 transition-colors">
              {isTr ? 'Staking & Kâr Payı' : 'Staking Rewards'}
            </a>
            <a href="#roadmap" className="hover:text-amber-400 transition-colors">
              {isTr ? 'Yol Haritası' : 'Roadmap'}
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <a
              href={PANCAKESWAP_BUY_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-lg text-xs font-sans transition-all shadow-md shadow-amber-500/20"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{isTr ? 'PancakeSwap Al' : 'Buy on Pancake'}</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>

            {onLaunchTerminal && (
              <button
                type="button"
                onClick={onLaunchTerminal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs font-sans transition-all shadow-md shadow-emerald-500/20"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{isTr ? 'Ticaret Terminali' : 'Trading Terminal'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO SHOWCASE SECTION */}
      <section className="relative pt-12 pb-16 px-4 lg:px-8 overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-[#090f1e] via-[#060913] to-[#050811]">
        
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-amber-500/10 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute top-20 right-10 w-[400px] h-[300px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Pitch & Value Props */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span>{isTr ? 'Gerçek Yazılım & Matematiksel Değer Modeli' : 'Real Software & Mathematical Value Backing'}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] font-sans">
                {isTr ? (
                  <>
                    Yapay Zekâ Bot Motoruyla <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 bg-clip-text text-transparent">Güçlendirilmiş</span> Kripto Varlığı
                  </>
                ) : (
                  <>
                    The First Quant Engine <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 bg-clip-text text-transparent">Backed</span> Web3 Asset
                  </>
                )}
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-sans">
                {isTr ? (
                  <>
                    <strong>$QUANT</strong>, boş spekülasyonlara ve şişirilmiş vaatlere dayalı değildir. Arkasında Binance ve PancakeSwap üzerinde 7/24 kesintisiz kâr üreten, çalışan algoritmik bir al-sat yazılımı bulunur. Botlarımızın ürettiği kârların <strong>%25'i piyasadan otomatik olarak $QUANT satın alır ve sonsuza dek yakar.</strong>
                  </>
                ) : (
                  <>
                    <strong>$QUANT</strong> is backed by a working 24/7 autonomous quantitative engine executing on Binance and PancakeSwap. <strong>25% of all engine trading profits</strong> are autonomously routed to market-buy $QUANT on DEX and permanently burn it.
                  </>
                )}
              </p>

              {/* Verified Smart Contract Box */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5 font-sans font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {isTr ? 'Doğrulanmış BEP-20 Akıllı Sözleşme' : 'Verified BEP-20 Smart Contract'}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                    100% AUDITED · NO TAX
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 font-mono text-xs text-amber-300 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 select-all truncate">
                    {LIVE_CONTRACT_ADDRESS}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyContract}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                      title={isTr ? 'Sözleşme Adresini Kopyala' : 'Copy Contract Address'}
                    >
                      {copiedContract ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedContract ? (isTr ? 'Kopyalandı' : 'Copied') : (isTr ? 'Kopyala' : 'Copy')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddToMetaMask}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-mono flex items-center justify-center gap-1.5 border border-amber-500/30 transition-colors"
                      title={isTr ? 'MetaMask Cüzdanına Ekle' : 'Add $QUANT to MetaMask'}
                    >
                      <span>{addedMetaMask ? '✅ Eklendi' : '🦊 MetaMask\'a Ekle'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={PANCAKESWAP_BUY_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm font-sans flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
                >
                  <Flame className="w-4 h-4 fill-slate-950" />
                  <span>{isTr ? 'PancakeSwap ile Hemen Al' : 'Buy Now on PancakeSwap'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href={DEXSCREENER_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold text-sm font-sans flex items-center gap-2 border border-emerald-500/30 transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>{isTr ? 'Canlı DexScreener Grafiği' : 'Live DexScreener Chart'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href={TELEGRAM_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 font-semibold text-sm font-sans flex items-center gap-2 border border-sky-500/40 transition-colors"
                >
                  <Send className="w-4 h-4 text-sky-400" />
                  <span>{isTr ? 'Telegram Grubu' : 'Telegram Community'}</span>
                </a>
              </div>
            </div>

            {/* Right Column: Visual Monolith & Live Metric Cards */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-gradient-to-b from-[#0e1628] to-[#080d19] p-5 shadow-2xl">
                
                {/* Visual Emblem */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-400 shadow-md bg-black">
                      <img src="/quant_logo.png" alt="$QUANT Logo" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-sans">
                        ALFA QUANT PROTOCOL
                      </h3>
                      <span className="text-xs text-amber-400 font-mono font-bold">
                        $QUANT / WBNB V2 Pair
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs text-slate-400 block font-sans">{isTr ? 'Anlık Fiyat' : 'Live Price'}</span>
                    <span className="text-lg font-bold text-emerald-400 tabular-nums">${priceUsd}</span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 my-4 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">{isTr ? 'Seyreltilmiş Piyasa Değeri' : 'Market Cap'}</span>
                    <span className="text-sm font-bold text-slate-100 tabular-nums">
                      {formatUSDT(marketCap)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">{isTr ? 'Yakılan Token Miktarı' : 'Burned $QUANT'}</span>
                    <span className="text-sm font-bold text-rose-400 tabular-nums flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      {burnedTokens.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">{isTr ? 'PancakeSwap LP Kilit' : 'LP Lock Proof'}</span>
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      {isTr ? '%100 Yakılmış' : '100% Burned'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">{isTr ? 'Alım / Satım Vergisi' : 'Transaction Tax'}</span>
                    <span className="text-sm font-bold text-amber-300">
                      %0 / %0 (Sıfır Vergi)
                    </span>
                  </div>
                </div>

                {/* Buyback Engine Heartbeat */}
                <div className="p-3.5 rounded-lg bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/40 border border-emerald-500/30 text-xs space-y-1.5 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      {isTr ? 'Otonom Geri Alım Çarkı:' : 'Autonomous Buyback Status:'}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                      AKTİF (ACTIVE)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isTr 
                      ? 'Botların Binance ve DEX üzerinde ürettiği net kârların birikimiyle periyodik olarak piyasadan $QUANT toplanır ve dolaşımdan kalıcı olarak çekilir.'
                      : 'Net profits generated across quant trading pairs trigger autonomous market orders to buy and burn $QUANT continuously.'}
                  </p>
                </div>

                {/* Cake-LP MetaMask Button */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleAddCakeLpToMetaMask}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-sans flex items-center justify-center gap-2 transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{addedLpMetaMask ? 'Cake-LP Eklendi!' : '🥞 Cake-LP Makbuzunu MetaMask\'a Ekle'}</span>
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3B. OFFICIAL TOKEN SHOWCASE BANNER (FULL WIDTH / EXPANDED) */}
      <section className="px-3 sm:px-6 lg:px-8 py-8 max-w-[1400px] w-full mx-auto">
        <div className="relative rounded-3xl overflow-hidden border-2 border-amber-500/50 shadow-2xl shadow-cyan-500/20 group bg-slate-950 w-full">
          <img 
            src="/quant_token_hero_banner.jpg" 
            alt="AlfaQuant ($QUANT) Live on PancakeSwap & BNB Chain" 
            className="w-full h-auto object-cover group-hover:scale-[1.01] transition-transform duration-500"
          />
        </div>

        {/* Action Buttons Below the Image */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a 
            href={PANCAKESWAP_BUY_LINK}
            target="_blank" 
            rel="noopener noreferrer" 
            className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm tracking-wide uppercase flex items-center gap-2 shadow-xl hover:scale-105 transition duration-200"
          >
            <span>{isTr ? '🥞 PancakeSwap\'te Satın Al (Swap) →' : '🥞 Buy on PancakeSwap →'}</span>
          </a>
          <a 
            href={DEXSCREENER_LINK}
            target="_blank" 
            rel="noopener noreferrer" 
            className="px-6 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm flex items-center gap-2 backdrop-blur-md transition hover:scale-105 duration-200"
          >
            <span>{isTr ? '📊 DexScreener Canlı Grafik →' : '📊 DexScreener Live Chart →'}</span>
          </a>
        </div>
      </section>

      {/* 4. VISION & THESIS SECTION (NEDEN $QUANT?) */}
      <section id="vision" className="py-16 px-4 lg:px-8 border-b border-slate-800/80 bg-[#060a15]">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
              {isTr ? 'VİZYONUMUZ VE TEMEL FELSEFEMİZ' : 'OUR MANIFESTO & THESIS'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-sans">
              {isTr 
                ? 'Neden $QUANT? Kripto Dünyasındaki Boş Şişirmelere Son' 
                : 'Why $QUANT? Ending Speculative Voids in Crypto'}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-sans leading-relaxed">
              {isTr
                ? 'Piyasadaki binlerce token sadece hype ve sosyal medya dedikodusuyla yükselip ardından sıfırlanıyor. $QUANT ise arkasına gerçek bir yazılım teknolojisini, yapay zekâ modelini ve kâr üreten algoritmik bot motorunu almıştır.'
                : 'Thousands of crypto tokens rely strictly on manufactured hype and crash to zero. $QUANT introduces a deterministic mathematical backbone powered by working quantitative trading automation.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pillar 1 */}
            <div className="p-6 rounded-xl bg-[#090f1e] border border-slate-800/80 space-y-3 hover:border-amber-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white font-sans">
                {isTr ? '1. Gerçek Çalışan Yazılım Gücü' : '1. Proven Algorithmic Software'}
              </h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {isTr 
                  ? 'Fikir aşamasında değil, çalışan bir yazılımdır. Binance Spot REST v3 ve WebSocket üzerinden 24/7 otonom işlem yapan, Supertrend, VWAP ve momentum stratejilerini harmanlayan gerçek bir bot altyapısı mevcuttur.'
                  : 'Not a concept, but production code. A working quantitative trading engine routing live orders across Binance REST v3 and high-speed WebSockets.'}
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-xl bg-[#090f1e] border border-slate-800/80 space-y-3 hover:border-emerald-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white font-sans">
                {isTr ? '2. Otomatik Geri Alım Çarkı' : '2. Autonomous Buyback Flywheel'}
              </h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {isTr 
                  ? 'Botların kripto piyasasından topladığı kârların %25\'i düzenli olarak PancakeSwap üzerinden $QUANT satın almak için harcanır. Bu durum fiyata devamlı bir alım baskısı ve organik talep sağlar.'
                  : '25% of bot trading profits are deployed as programmatic market buys on PancakeSwap, funneling perpetual organic demand and upward price pressure.'}
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-xl bg-[#090f1e] border border-slate-800/80 space-y-3 hover:border-cyan-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white font-sans">
                {isTr ? '3. %100 Güvenlik & Kilitli Likidite' : '3. 100% Security & Burned LP'}
              </h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {isTr 
                  ? 'Geliştirici cüzdanına vergi aktarımı yoktur (%0 alım / %0 satım vergisi). PancakeSwap likidite makbuzu (Cake-LP) kara delik adresine gönderilerek kilitlenmiş ve yakılmıştır. Rug-pull imkansızdır.'
                  : 'Zero buy tax, zero sell tax. 100% of initial PancakeSwap LP tokens have been routed to the dead burn address. The contract is mathematically immutable and rug-proof.'}
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 5. LIVE SOFTWARE SHOWCASE (PROGRAMIMIZI DAHA GÖRÜNÜR YAYINLAMA BÖLÜMÜ) */}
      <section id="software" className="py-16 px-4 lg:px-8 border-b border-slate-800/80 bg-[#050914]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal className="w-4 h-4" />
                {isTr ? 'OTONOM TİCARET PROGRAMI & MOTORU' : 'AUTONOMOUS QUANT SOFTWARE COCKPIT'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-sans">
                {isTr ? 'Programımızın Çalışma Mantığı & Canlı Bot Çıktıları' : 'How Our Software Operates & Live Bot Proof'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl">
                {isTr 
                  ? 'Yatırımcılarımızın ve topluluğumuzun bot yazılımımızı şeffafça inceleyebilmesi için canlı performans ve strateji parametreleri burada yayınlanmaktadır.'
                  : 'Our production quant engine executes deterministic strategies with 0-loss protocols and real-time execution proof.'}
              </p>
            </div>

            {onLaunchTerminal && (
              <button
                type="button"
                onClick={onLaunchTerminal}
                className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-sans flex items-center gap-2 shadow-md transition-all"
              >
                <Terminal className="w-4 h-4" />
                <span>{isTr ? 'Tam Fonksiyonlu Terminali Aç' : 'Open Full Cockpit'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Interactive Simulated Bot Terminal Window */}
          <div className="rounded-2xl border border-slate-800 bg-[#070c18] overflow-hidden shadow-2xl">
            
            {/* Terminal Window Header */}
            <div className="bg-[#0b101d] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-400 ml-2 font-semibold">
                  alfa-quant-engine-v3.8 --live-api
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                <Activity className="w-3 h-3 animate-spin" />
                <span>BINANCE SPOT REST v3 CONNECTED (18ms)</span>
              </div>
            </div>

            {/* Terminal Inner Content */}
            <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left: 4 Active Bot Strategies */}
              <div className="lg:col-span-7 space-y-3 font-mono text-xs">
                <span className="text-slate-400 font-sans text-xs font-bold block mb-1">
                  {isTr ? 'Devrede Olan Otonom Stratejilerimiz:' : 'Running Quantitative Bot Modules:'}
                </span>

                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <span className="font-bold text-white">⚡ Supertrend + VWAP Alpha</span>
                      <span className="text-[10px] text-slate-400 block font-sans">SOLUSDT · BTCUSDT</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold text-xs">%88 Win Rate</span>
                    <span className="text-[10px] text-slate-500 block">Trailing TP: +3.2%</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <span className="font-bold text-white">🚀 FreqAI Compound Momentum</span>
                      <span className="text-[10px] text-slate-400 block font-sans">ETHUSDT · BNBUSDT</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold text-xs">%91 Win Rate</span>
                    <span className="text-[10px] text-slate-500 block">Momentum Scalp</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <span className="font-bold text-white">🛡️ Asla Zararına Satmama Kalkanı</span>
                      <span className="text-[10px] text-slate-400 block font-sans">OGN · ARPA · AI · NIGHT</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-400 font-bold text-xs">Zero-Loss Guard</span>
                    <span className="text-[10px] text-slate-500 block">Kâr Garantili Tutma</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <div>
                      <span className="font-bold text-white">🥞 PancakeSwap Auto-Buyback Engine</span>
                      <span className="text-[10px] text-slate-400 block font-sans">WBNB → $QUANT Market Swap</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-cyan-400 font-bold text-xs">Periyodik Yakım</span>
                    <span className="text-[10px] text-slate-500 block">0x...dEaD Transfer</span>
                  </div>
                </div>
              </div>

              {/* Right: Real-time Execution Feed */}
              <div className="lg:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                    <span className="text-slate-400 font-sans font-bold text-xs">
                      {isTr ? 'Son Algoritmik İşlem Günlüğü' : 'Recent Execution Telemetry'}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">CANLI AKIŞ</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>[SELL] SOLUSDT @ $219.40</span>
                      <span className="font-bold">+3.4% ($14.20)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>[BUYBACK] 2,450 $QUANT bought</span>
                      <span className="text-rose-400 font-bold">🔥 Burned</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>[SELL] BTCUSDT @ $94,850</span>
                      <span className="font-bold">+2.8% ($28.50)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>[BUYBACK] 3,100 $QUANT bought</span>
                      <span className="text-rose-400 font-bold">🔥 Burned</span>
                    </div>
                    <div className="flex items-center justify-between text-amber-400">
                      <span>[HOLD] OGNUSDT @ $0.182</span>
                      <span className="text-slate-400">Zero-Loss Protected</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Toplam Üretilen Bot Kârı:</span>
                  <span className="font-bold text-emerald-400">{totalBotProfitBnb} BNB (~$30,163)</span>
                </div>
              </div>

            </div>

            {/* Open Source / Project Download Bar */}
            <div className="bg-[#0a0f1d] px-5 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-sans">
                {isTr 
                  ? '📦 Programın tüm kaynak kodunu indirip kendi sunucunuzda veya bilgisayarınızda çalıştırmak ister misiniz?'
                  : '📦 Want to run this full-stack quantitative bot software locally on your own machine?'}
              </span>
              <a
                href="/api/download-project"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-sans flex items-center gap-1.5 transition-colors font-semibold"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isTr ? 'Programı İndir (.ZIP)' : 'Download Source (.ZIP)'}</span>
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* 6. BUYBACK & BURN FLYWHEEL SECTION */}
      <section id="flywheel" className="py-16 px-4 lg:px-8 border-b border-slate-800/80 bg-[#060a15]">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-500" />
              {isTr ? 'GERİ ALIM & YAKIM ÇARKI' : 'DEFLATIONARY BUYBACK FLYWHEEL'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-sans">
              {isTr ? 'Kalıcı Değer Artışı Nasıl Sağlanır?' : 'The Mathematical Deflation Engine'}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-sans leading-relaxed">
              {isTr
                ? 'Geleneksel projeler sadece yatırımcıların yeni para sokmasına güvenir. Alfa Quant Protocol ise kendi yazılımının işlem kârlarını $QUANT alımında kullanarak kendi kendini besleyen bir döngü yaratır.'
                : 'Traditional meme tokens rely purely on greater fool inflows. $QUANT recycles algorithmic trade yields to create a self-sustaining buy pressure loop.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Step 1 */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 relative space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold flex items-center justify-center text-sm">
                01
              </div>
              <h4 className="font-bold text-white text-sm font-sans">{isTr ? 'Kâr Üretimi' : 'Profit Generation'}</h4>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {isTr 
                  ? 'Botlar Binance ve DEX üzerinde 24 saat karlı işlemler kapatarak BNB ve USDT kasasını büyütür.'
                  : 'Quant bots execute high-probability trades across Binance, locking in realized profits.'}
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 relative space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold flex items-center justify-center text-sm">
                02
              </div>
              <h4 className="font-bold text-white text-sm font-sans">{isTr ? '%25 Havuz Fonu' : '25% Allocation'}</h4>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {isTr 
                  ? 'Elde edilen net kazancın %25\'i otomatik olarak akıllı sözleşme geri alım kasasına aktarılır.'
                  : '25% of net profits are instantly segregated into the autonomous buyback vault contract.'}
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 relative space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center text-sm">
                03
              </div>
              <h4 className="font-bold text-white text-sm font-sans">{isTr ? 'PancakeSwap Alımı' : 'PancakeSwap Sweep'}</h4>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {isTr 
                  ? 'PancakeSwap V2 havuzuna piyasa alım emri gönderilir ve $QUANT piyasa fiyatından satın alınır.'
                  : 'Automated contract triggers execute market buys on PancakeSwap V2 pool, boosting price floor.'}
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 relative space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 font-mono font-bold flex items-center justify-center text-sm">
                04
              </div>
              <h4 className="font-bold text-white text-sm font-sans">{isTr ? 'Sonsuz Yakım' : 'Dead Address Burn'}</h4>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {isTr 
                  ? 'Satın alınan tokenlar kara delik adresine (0x...dEaD) yollanarak arzdan sonsuza dek silinir.'
                  : 'Purchased tokens are routed directly to 0x...dEaD, permanently shrinking total supply.'}
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 7. TOKENOMICS & ALLOCATION SECTION */}
      <section id="tokenomics" className="py-16 px-4 lg:px-8 border-b border-slate-800/80 bg-[#050811]">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
              {isTr ? 'ŞEFFAF & ADİL EKONOMİK DAĞILIM' : 'FAIR LAUNCH TOKENOMICS'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-sans">
              {isTr ? 'Sabit 100,000,000 Arz & Sıfır Gizli Ücret' : 'Fixed 100M Supply & Zero Hidden Fees'}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-sans leading-relaxed">
              {isTr
                ? 'Hiçbir ek basım (mint) fonksiyonu bulunmaz. Bütün arz baştan oluşturulmuş olup PancakeSwap likiditesi ve topluluk ödüllerine ayrılmıştır.'
                : 'No hidden mint functions. Total supply is fixed and locked with 100% audited smart contract logic.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Visual Bars Breakdown */}
            <div className="lg:col-span-7 space-y-4 font-sans text-xs">
              
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-amber-300">{isTr ? 'PancakeSwap V2 Başlangıç Likidite Havuzu' : 'PancakeSwap Initial Liquidity Pool'}</span>
                  <span className="font-mono text-white">%60 (60,000,000 QUANT)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 w-[60%]" />
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">
                  🔒 {isTr ? 'LP Makbuzları (Cake-LP) %100 yakılmış ve kara delik adresine kilitlenmiştir.' : 'LP tokens permanently burned to dead address. Rug-proof.'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-emerald-300">{isTr ? 'Topluluk Staking & Kâr Payı Ödül Kasası' : 'Community Staking & Profit Share Vault'}</span>
                  <span className="font-mono text-white">%20 (20,000,000 QUANT)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 w-[20%]" />
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">
                  💎 {isTr ? '$QUANT kilitleyen yatırımcılara BNB ve QUANT cinsinden pasif gelir aktarımı.' : 'Yield distribution pool for verified long-term stakers.'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-cyan-300">{isTr ? 'Otonom Geri Alım & Hazine Rezervi' : 'Autonomous Buyback & Treasury'}</span>
                  <span className="font-mono text-white">%10 (10,000,000 QUANT)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 w-[10%]" />
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">
                  ⚡ {isTr ? 'Piyasa ani düşüşlerinde fiyat tabanını savunma ve likidite destek fonu.' : 'Algorithmic liquidity defense and volatility dampener fund.'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-purple-300">{isTr ? 'Ekosistem, Güvenlik Denetimleri & Borsa Fonu' : 'Security Audits & CEX Listing Fund'}</span>
                  <span className="font-mono text-white">%10 (10,000,000 QUANT)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400 w-[10%]" />
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">
                  🏛️ {isTr ? 'Tier-1 CEX listelemeleri (MEXC, Gate.io, KuCoin) ve CertiK denetim bütçesi.' : 'Reserved exclusively for tier-1 CEX listings and CertiK audit.'}
                </span>
              </div>

            </div>

            {/* Right: Contract Feature Cards */}
            <div className="lg:col-span-5 space-y-3 font-mono text-xs">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-black border border-slate-800 space-y-4">
                <h4 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {isTr ? 'Sözleşme Güvenlik Sertifikası' : 'Security Highlights'}
                </h4>

                <div className="space-y-2 text-slate-300">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Mint (Yeni Basım) Yetkisi:</span>
                    <span className="text-emerald-400 font-bold">YOK (İMKANSIZ)</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Kara Liste (Blacklist):</span>
                    <span className="text-emerald-400 font-bold">YOK</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Alım Vergisi:</span>
                    <span className="text-emerald-400 font-bold">%0</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Satım Vergisi:</span>
                    <span className="text-emerald-400 font-bold">%0</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Honeypot Riski:</span>
                    <span className="text-emerald-400 font-bold">SIFIR (GÜVENLİ)</span>
                  </div>
                </div>

                <a
                  href={BSCSCAN_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans flex items-center justify-center gap-1.5 transition-colors text-xs font-semibold"
                >
                  <span>BscScan Üzerinde Doğrula</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                </a>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 8. INTERACTIVE STAKING & PROFIT SHARE CALCULATOR */}
      <section id="staking" className="py-16 px-4 lg:px-8 border-b border-slate-800/80 bg-[#060914]">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Percent className="w-4 h-4" />
              {isTr ? 'KÂR PAYI & TEMETTÜ HESAPLAYICI' : 'PROFIT SHARE CALCULATOR'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-sans">
              {isTr ? '$QUANT Tutun, Botların Kazancına Ortak Olun' : 'Hold $QUANT, Earn Quant Engine Yield'}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-sans max-w-xl mx-auto">
              {isTr
                ? 'Botlarımızın Binance üzerinde elde ettiği işlem kârları yalnızca token yakımına gitmez; aynı zamanda $QUANT sahiplerine düzenli BNB temettüsü olarak dağıtılır.'
                : 'Bot trade yields are distributed as recurring BNB dividends to verified $QUANT stakers.'}
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#0b1222] to-[#070b16] border border-emerald-500/30 shadow-2xl space-y-6">
            
            <div>
              <div className="flex justify-between items-center text-sm font-sans mb-2">
                <span className="text-slate-300 font-bold">
                  {isTr ? 'Hesaplamak İstediğiniz $QUANT Miktarı:' : 'Select Your $QUANT Holding Amount:'}
                </span>
                <span className="font-mono text-lg font-bold text-amber-400">
                  {calculatorAmount.toLocaleString()} $QUANT
                </span>
              </div>

              <input
                type="range"
                min="1000"
                max="100000"
                step="1000"
                value={calculatorAmount}
                onChange={(e) => setCalculatorAmount(parseInt(e.target.value))}
                className="w-full accent-amber-400 bg-slate-800 h-2.5 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1">
                <span>1,000 QUANT</span>
                <span>25,000 QUANT</span>
                <span>50,000 QUANT</span>
                <span>100,000 QUANT</span>
              </div>
            </div>

            {/* Projected Returns Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 font-mono">
              
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <span className="text-xs text-slate-400 font-sans block mb-1">
                  {isTr ? 'Tahmini Aylık BNB Getirisi' : 'Estimated Monthly BNB'}
                </span>
                <span className="text-xl font-bold text-emerald-400 tabular-nums">
                  ~{estMonthlyBnb} BNB
                </span>
                <span className="text-[10px] text-slate-500 block font-sans mt-0.5">
                  ({isTr ? 'Doğrudan Cüzdana' : 'Direct to wallet'})
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <span className="text-xs text-slate-400 font-sans block mb-1">
                  {isTr ? 'Yıllık Eşdeğer Değer' : 'Annual Yield in USD'}
                </span>
                <span className="text-xl font-bold text-amber-300 tabular-nums">
                  ~${estAnnualUsd} USD
                </span>
                <span className="text-[10px] text-emerald-400 block font-sans mt-0.5">
                  +%48.5 APY
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <span className="text-xs text-slate-400 font-sans block mb-1">
                  {isTr ? 'Açılan VIP Bot Kademesi' : 'Unlocked Bot Tier'}
                </span>
                <span className="text-xl font-bold text-cyan-400">
                  {calculatorAmount >= 25000 ? 'VIP HACKER TIER' : (calculatorAmount >= 5000 ? 'PRO ALPHA TIER' : 'BASIC TIER')}
                </span>
                <span className="text-[10px] text-slate-500 block font-sans mt-0.5">
                  {isTr ? 'Komisyon İndirimi & Özel Botlar' : 'Zero Fee & Alpha Access'}
                </span>
              </div>

            </div>

            <div className="pt-2 text-center">
              <a
                href={PANCAKESWAP_BUY_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm font-sans transition-all shadow-md"
              >
                <Flame className="w-4 h-4 fill-slate-950" />
                <span>{isTr ? 'PancakeSwap\'ta QUANT Al & Hak Kazan' : 'Get QUANT on PancakeSwap & Qualify'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* 9. STRATEGIC ROADMAP 2026 */}
      <section id="roadmap" className="py-16 px-4 lg:px-8 border-b border-slate-800/80 bg-[#060a15]">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Compass className="w-4 h-4" />
              {isTr ? '2026 GELİŞTİRME PLANI' : 'STRATEGIC ROADMAP 2026'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-sans">
              {isTr ? 'Geleceğe Dair Somut Adımlarımız' : 'Concrete Milestone Milestones'}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-sans leading-relaxed">
              {isTr
                ? 'Hedeflerimiz ve atacağımız adımlar önceden planlanmıştır. Her aşama tamamlandıkça topluluğumuzla şeffaf bir biçimde paylaşılır.'
                : 'Every phase is systematically deployed and verified on-chain.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Q1 */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-emerald-500/40 space-y-3 relative">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                {isTr ? 'TAMAMLANDI' : 'COMPLETED'}
              </span>
              <h4 className="text-base font-bold text-white font-sans">Q1 2026: Temel & Borsa Motoru</h4>
              <ul className="text-xs text-slate-300 font-sans space-y-1.5 list-disc list-inside">
                <li>Binance REST v3 & WebSocket entegrasyonu</li>
                <li>Supertrend + VWAP Quant motoru</li>
                <li>$QUANT BEP-20 sözleşme dağıtımı</li>
                <li>PancakeSwap V2 likidite havuzu oluşturma</li>
              </ul>
            </div>

            {/* Q2 */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-amber-500/40 space-y-3 relative">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {isTr ? 'ŞU AN YAYINDA' : 'LIVE NOW'}
              </span>
              <h4 className="text-base font-bold text-white font-sans">Q2 2026: Geri Alım & Topluluk</h4>
              <ul className="text-xs text-slate-300 font-sans space-y-1.5 list-disc list-inside">
                <li>Otonom PancakeSwap geri alım & yakım botu</li>
                <li>Resmi Web Sitesi ve Yatırımcı Portalı</li>
                <li>CoinSniper & Topluluk oylamaları</li>
                <li>Telegram işlem sinyal bildirimleri</li>
              </ul>
            </div>

            {/* Q3 */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 relative">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                {isTr ? 'YOLDA' : 'UPCOMING'}
              </span>
              <h4 className="text-base font-bold text-white font-sans">Q3 2026: Çoklu Ağ & Mobil</h4>
              <ul className="text-xs text-slate-300 font-sans space-y-1.5 list-disc list-inside">
                <li>Solana ve Base ağlarına köprüleme (Bridge)</li>
                <li>Mobil Web3 PWA Ticaret DApp'i</li>
                <li>Topluluk Staking akıllı sözleşme lansmanı</li>
                <li>CoinMarketCap & CoinGecko listeleme</li>
              </ul>
            </div>

            {/* Q4 */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 relative">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                {isTr ? 'PLANLANAN' : 'PLANNED'}
              </span>
              <h4 className="text-base font-bold text-white font-sans">Q4 2026: CEX & Kurumsal</h4>
              <ul className="text-xs text-slate-300 font-sans space-y-1.5 list-disc list-inside">
                <li>Tier-1 CEX borsa listelemeleri (MEXC / Gate.io)</li>
                <li>Kurumsal Arbitraj Likidite Havuzları</li>
                <li>CertiK güvenlik denetim mührü</li>
                <li>AI DAO Otonom Fon Yönetimi</li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* 10. COMMUNITY, VOTING & SHARE SECTION */}
      <section className="py-16 px-4 lg:px-8 bg-gradient-to-b from-[#060a15] to-[#04060d]">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="p-8 rounded-2xl bg-[#090f1f] border border-amber-500/40 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Share2 className="w-4 h-4" />
                  {isTr ? 'TOPLULUĞUMUZA KATILIN' : 'JOIN THE COMMUNITY'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white font-sans">
                  {isTr ? 'Projemizin Arkasındaki Güç Sizsiniz' : 'Back the Movement with Us'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                  {isTr
                    ? 'Resmi Telegram kanalımıza katılarak botlarımızın canlı sinyallerini, kâr duyurularını ve geri alım işlemlerini anbean takip edebilirsiniz.'
                    : 'Join our official Telegram community to track real-time trade signals, buyback alerts, and development sprints.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href={TELEGRAM_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-sans flex items-center gap-2 transition-all shadow-md shadow-sky-500/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isTr ? 'Resmi Telegram\'a Katıl' : 'Join Official Telegram'}</span>
                  </a>

                  <a
                    href={COINSNIPER_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-sans flex items-center gap-1.5 font-bold transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{isTr ? 'CoinSniper\'da Oy Ver' : 'Vote on CoinSniper'}</span>
                  </a>

                  <a
                    href="https://instagram.com/alfaquantai.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-xs font-sans flex items-center gap-1.5 font-bold transition-colors"
                    title="Resmi Instagram Hesabımız"
                  >
                    <Instagram className="w-4 h-4 text-pink-400" />
                    <span>Instagram: @alfaquantai.com</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyShare}
                    className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-sans flex items-center gap-1.5 transition-colors"
                  >
                    {copiedShare ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                    <span>{copiedShare ? (isTr ? 'Mesaj Kopyalandı' : 'Copied!') : (isTr ? 'Tanıtım Metnini Paylaş' : 'Share Promo Text')}</span>
                  </button>
                </div>
              </div>

              {/* Telegram Card Art */}
              <div className="rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
                <img src="/telegram_promo_banner.jpg" alt="Telegram Community" className="w-full h-auto object-cover" />
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="border-t border-slate-800/80 pt-10 pb-12 px-4 lg:px-8 text-xs text-slate-500 font-sans">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/40 bg-black">
              <img src="/quant_logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-bold text-white text-sm">ALFA QUANT PROTOCOL</span>
              <p className="text-[11px] text-slate-400">BEP-20 Autonomous AI Trading & Buyback Ecosystem</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <a href={BSCSCAN_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
              BscScan
            </a>
            <a href={PANCAKESWAP_BUY_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
              PancakeSwap
            </a>
            <a href={DEXSCREENER_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
              DexScreener
            </a>
            <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
              Telegram
            </a>
            <a href="/api/download-project" className="hover:text-amber-400 transition-colors">
              GitHub / Code
            </a>
            <a 
              href="https://accounts.binance.com/en/register?ref=XADYK9G1" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-amber-400 hover:text-amber-300 font-bold transition-colors flex items-center gap-1"
            >
              <span>Binance (Ref: XADYK9G1)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="text-right text-[11px] text-slate-500">
            © 2026 Alfa Quant. {isTr ? 'Tüm Hakları Saklıdır.' : 'All rights reserved.'}
          </div>
        </div>
      </footer>

      {/* HOSTINGER SETUP GUIDE MODAL */}
      {hostingerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b101e] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {isTr ? 'Hostinger Hızlı Yayına Alma & Kurulum Rehberi' : 'Hostinger Fast Deployment Guide'}
                  </h3>
                  <p className="text-xs text-cyan-400 font-mono">alfaquantai.com • Starter Hosting</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHostingerModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              
              {/* Step 1 */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <div className="space-y-1">
                  <div className="font-bold text-white text-sm">
                    {isTr ? 'Web Sitesi Kodunu İndirin' : 'Download Website File'}
                  </div>
                  <p className="text-slate-400">
                    {isTr 
                      ? 'Aşağıdaki butona basarak hazır tek parça index.html dosyasını bilgisayarınıza kaydedin.' 
                      : 'Click the button below to download the single-file index.html.'}
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadWebsite}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isTr ? '📥 index.html İndir' : 'Download index.html'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyWebsiteHtml}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedHtmlCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedHtmlCode ? (isTr ? 'Kopyalandı!' : 'Copied!') : (isTr ? 'Tüm HTML Kodunu Kopyala' : 'Copy HTML Code')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <div className="space-y-1">
                  <div className="font-bold text-white text-sm">
                    {isTr ? 'Hostinger Dosya Yöneticisine (public_html) Yükleyin' : 'Upload to Hostinger File Manager'}
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {isTr 
                      ? 'Hostinger hPanel > Hosting > alfaquantai.com "Yönet" > Dosya Yöneticisi (File Manager) açın. public_html klasörüne girin ve indirdiğiniz index.html dosyasını yükleyin.' 
                      : 'Open Hostinger hPanel > File Manager > public_html and upload index.html.'}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <div className="space-y-1">
                  <div className="font-bold text-white text-sm">
                    {isTr ? 'Kurumsal E-Postayı Açın (BscScan Mavi Tik İçin Zorunlu)' : 'Create Business Email for BscScan'}
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {isTr 
                      ? 'Hostinger > E-postalar > E-posta Oluştur bölümünden contact@alfaquantai.com açın. Bu adres ile BscScan doğrulamasını hemen geçeceğiz.' 
                      : 'In Hostinger > Emails, create contact@alfaquantai.com for BscScan official verification.'}
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <span className="font-mono bg-slate-950 px-2 py-1 rounded text-cyan-300 font-bold">contact@alfaquantai.com</span>
                    <button
                      type="button"
                      onClick={() => {
                        copyToClipboard('contact@alfaquantai.com').catch(() => {});
                        setCopiedEmail(true);
                        setTimeout(() => setCopiedEmail(false), 2000);
                      }}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedEmail ? 'Kopyalandı' : 'Kopyala'}</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <a
                href="https://hpanel.hostinger.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
              >
                <span>{isTr ? 'Hostinger Panelini Aç (hPanel)' : 'Open Hostinger Panel'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setHostingerModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                {isTr ? 'Tamam, Anladım' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
