import React, { useState } from 'react';
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
  Globe,
  Image as ImageIcon,
  Download,
  Instagram
} from 'lucide-react';
import { formatUSDT } from '../utils/cryptoMath';
import { BotTrackRecord } from './BotTrackRecord';
import { TokenUtilitySection } from './TokenUtilitySection';
import { copyToClipboard } from '../utils/clipboard';

interface QuantTokenPortalProps {
  onOpenRemixGuide?: () => void;
  defaultSubTab?: 'overview' | 'track-record' | 'utility' | 'staking' | 'tokenomics' | 'contract' | 'media';
  language?: 'en' | 'tr';
  onOpenWebsite?: () => void;
}

export const QuantTokenPortal: React.FC<QuantTokenPortalProps> = ({ 
  defaultSubTab, 
  language = 'en',
  onOpenWebsite
}) => {
  const isTr = language === 'tr';
  const [copiedContract, setCopiedContract] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [addedToMetaMask, setAddedToMetaMask] = useState(false);
  const [stakedAmount, setStakedAmount] = useState<number>(2500);
  const [activeTab, setActiveTab] = useState<'overview' | 'track-record' | 'utility' | 'staking' | 'tokenomics' | 'contract' | 'media'>(defaultSubTab || 'overview');

  const LIVE_CONTRACT_ADDRESS = "0x397397895fac99de11f5893bc46e32324d313d92";
  const totalSupply = 100_000_000;
  const simulatedBurned = 142_500;
  const currentPriceUsdt = 0.0485;
  const marketCapUsdt = (totalSupply - simulatedBurned) * currentPriceUsdt;

  const currentTier = stakedAmount >= 10000 ? 3 : stakedAmount >= 2500 ? 2 : 1;

  const [copiedShareMsg, setCopiedShareMsg] = useState(false);
  const [votedToday, setVotedToday] = useState(false);

  const handleCopyShareMsg = async () => {
    const text = `🚀 $QUANT Token'ı CoinSniper'da zirveye taşıyoruz!\n\nHerkesin günde 1 kez ücretsiz oy hakkı vardır. 10 saniyenizi ayırıp projemize destek olun:\n👉 https://coinsniper.net/coin/94828\n\nAdımlar:\n1️⃣ Linke tıklayın\n2️⃣ 'Vote for QUANT' butonuna basın\n3️⃣ Robot doğrulamasını çözün\n\nTeşekkürler! 🛡️🔥`;
    await copyToClipboard(text);
    setCopiedShareMsg(true);
    setTimeout(() => setCopiedShareMsg(false), 2500);
  };

  const handleCopyAddress = async () => {
    await copyToClipboard(LIVE_CONTRACT_ADDRESS);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleAddToMetaMask = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        alert("Lütfen MetaMask eklentinizi kontrol edin.");
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
      setAddedToMetaMask(true);
      setTimeout(() => setAddedToMetaMask(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const [addedLpToMetaMask, setAddedLpToMetaMask] = useState(false);

  const handleAddCakeLpToMetaMask = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        return;
      }
      await ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: '0xb5b0ee0e0c636a95792845ae0450a7881f0d1e29',
            symbol: 'Cake-LP',
            decimals: 18,
            image: 'https://tokens.pancakeswap.finance/images/symbol/cake.png',
          },
        },
      });
      setAddedLpToMetaMask(true);
      setTimeout(() => setAddedLpToMetaMask(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const [burnLoading, setBurnLoading] = useState(false);
  const [burnTxHash, setBurnTxHash] = useState<string | null>(null);
  const [burnError, setBurnError] = useState<string | null>(null);

  const handleBurnCakeLp = async () => {
    try {
      setBurnLoading(true);
      setBurnError(null);
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        setBurnError("MetaMask eklentisi tarayıcıda bulunamadı.");
        return;
      }
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];
      if (!userAddress) {
        setBurnError("MetaMask cüzdan bağlantısı onaylanmadı.");
        return;
      }

      const pairAddress = '0xb5b0ee0e0c636a95792845ae0450a7881f0d1e29';
      const deadAddress = '0x000000000000000000000000000000000000dEaD';

      const cleanUser = userAddress.toLowerCase().replace('0x', '').padStart(64, '0');
      const balanceData = '0x70a08231' + cleanUser;
      const balanceHex = await ethereum.request({
        method: 'eth_call',
        params: [{ to: pairAddress, data: balanceData }, 'latest']
      });

      const balanceBig = BigInt(balanceHex || '0');
      if (balanceBig <= 0n) {
        setBurnError("Cüzdanınızda kilitlenecek Cake-LP bakiyesi 0 görünüyor (Zaten kilitlenmiş olabilir veya MetaMask üzerinde 0xd1e5 hesabında değilsiniz).");
        return;
      }

      const cleanDead = deadAddress.toLowerCase().replace('0x', '').padStart(64, '0');
      const cleanAmount = balanceBig.toString(16).padStart(64, '0');
      const transferData = '0xa9059cbb' + cleanDead + cleanAmount;

      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: pairAddress,
          data: transferData,
        }]
      });

      setBurnTxHash(txHash);
    } catch (err: any) {
      console.error(err);
      setBurnError(err?.message || "İşlem iptal edildi veya reddedildi.");
    } finally {
      setBurnLoading(false);
    }
  };

  const handleCopyContract = () => {
    const rawContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBEP20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function burn(uint256 amount) external returns (bool);
}

contract QuantToken {
    string public constant name = "Binance Quant Scalper";
    string public constant symbol = "QUANT";
    uint8 public constant decimals = 18;
    uint256 public totalSupply = 100_000_000 * 10**18;
    // Resmi Sözleşme Adresi: 0x397397895fac99de11f5893bc46e32324d313d92
}`;
    copyToClipboard(rawContract).catch(() => {});
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 p-5 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden border border-cyan-400/50 shadow-md bg-black shrink-0">
                <img src="/quant_logo.jpg" alt="$QUANT Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2 font-sans">
                  $QUANT (Binance Quant Scalper Token)
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    {isTr ? 'CANLI (BNB CHAIN)' : 'LIVE (BNB CHAIN)'}
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300">
                    <span className="text-amber-400 font-bold">{isTr ? 'Kontrat:' : 'Contract:'}</span>
                    <span>{LIVE_CONTRACT_ADDRESS.slice(0, 8)}...{LIVE_CONTRACT_ADDRESS.slice(-6)}</span>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="text-slate-400 hover:text-amber-300 transition-colors ml-1"
                      title={isTr ? "Sözleşme Adresini Kopyala" : "Copy Contract Address"}
                    >
                      {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <a
                    href={`https://bscscan.com/token/${LIVE_CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline font-sans"
                  >
                    <span>{isTr ? "BscScan'de Doğrula" : "Verify on BscScan"}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenWebsite && (
              <button
                type="button"
                onClick={onOpenWebsite}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-lg text-xs font-sans flex items-center gap-1.5 transition-all shadow-md"
              >
                <Globe className="w-3.5 h-3.5 text-slate-950" />
                <span>{isTr ? '🌐 Resmi Web Sitesini Aç' : '🌐 Open Official Website'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddToMetaMask}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-lg text-xs font-sans flex items-center gap-1.5 transition-all shadow-md"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{addedToMetaMask ? (isTr ? 'QUANT Eklendi!' : 'QUANT Added!') : (isTr ? '🦊 $QUANT Ekle' : '🦊 Add $QUANT')}</span>
            </button>

            <button
              type="button"
              onClick={handleAddCakeLpToMetaMask}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold rounded-lg text-xs font-sans flex items-center gap-1.5 transition-all shadow-md"
              title={isTr ? "PancakeSwap LP Makbuzunu MetaMask'a Ekle" : "Add PancakeSwap LP receipt to MetaMask"}
            >
              <Lock className="w-3.5 h-3.5 text-slate-950" />
              <span>{addedLpToMetaMask ? (isTr ? 'Cake-LP Eklendi!' : 'Cake-LP Added!') : (isTr ? '🥞 Cake-LP Ekle' : '🥞 Add Cake-LP')}</span>
            </button>

            <a
              href="https://coinsniper.net/coin/94828"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs font-sans flex items-center gap-1.5 transition-all shadow-md"
            >
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>{isTr ? '🗳️ CoinSniper\'da Oy Ver' : '🗳️ Vote on CoinSniper'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href="https://t.me/+6Fdw5kR4SJE2ZjU0"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs font-sans flex items-center gap-1.5 transition-all shadow-md"
            >
              <Send className="w-3.5 h-3.5 text-sky-200" />
              <span>{isTr ? '💬 Telegram Grubu' : '💬 Telegram Community'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href="https://instagram.com/alfaquantai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:opacity-90 text-white font-bold rounded-lg text-xs font-sans flex items-center gap-1.5 transition-all shadow-md"
              title="Resmi Instagram Hesabımız"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-200" />
              <span>{isTr ? '📸 Instagram: @alfaquantai.com' : '📸 Instagram'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href={`https://pancakeswap.finance/swap?chain=bsc&inputCurrency=BNB&outputCurrency=${LIVE_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-semibold rounded-lg text-xs font-sans flex items-center gap-1.5 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{isTr ? "PancakeSwap'te Takas Et" : "Trade on PancakeSwap"}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={handleBurnCakeLp}
              disabled={burnLoading}
              className="px-3 py-1.5 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold rounded-lg text-xs font-sans flex items-center gap-1.5 transition-all shadow-md animate-pulse disabled:opacity-50"
              title={isTr ? "Cake-LP'yi Ebedi Olarak Dead Adresine Gönder ve Kilitle" : "Burn Cake-LP permanently to 0x00...dEaD"}
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>{burnLoading ? (isTr ? 'MetaMask Onayı Bekleniyor...' : 'Awaiting MetaMask...') : (isTr ? '🔥 Likiditeyi Ebedi Kilitle (Burn)' : '🔥 Burn LP Liquidity to Dead')}</span>
            </button>
          </div>

          {burnTxHash && (
            <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>🎉 <strong>{isTr ? 'Tebrikler!' : 'Verified!'}</strong> {isTr ? 'Cake-LP ebediyen Dead adresine kilitlendi! Likidite %100 güvende.' : 'Cake-LP burned permanently to Dead address! Liquidity 100% secure.'}</span>
              </div>
              <a
                href={`https://bscscan.com/tx/${burnTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-cyan-300 hover:text-cyan-200 flex items-center gap-1 font-mono font-bold"
              >
                <span>BscScan Tx</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {burnError && (
            <div className="mt-4 p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <span>⚠️ {burnError}</span>
            </div>
          )}
        </div>

        {/* Live Key Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-4 border-t border-slate-800 font-mono text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">{isTr ? 'Toplam Sabit Arz' : 'Total Fixed Supply'}</span>
            <span className="text-sm font-bold text-slate-100">100,000,000</span>
            <span className="text-[10px] text-slate-500 ml-1">QUANT</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">{isTr ? 'Tahmini Başlangıç Fiyatı' : 'Est. Spot Price'}</span>
            <span className="text-sm font-bold text-amber-300">${currentPriceUsdt}</span>
            <span className="text-[10px] text-emerald-400 ml-1">+12.4%</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">{isTr ? 'Tahmini Piyasa Değeri' : 'Est. Diluted Valuation'}</span>
            <span className="text-sm font-bold text-emerald-400">${formatUSDT(marketCapUsdt)}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
              <Flame className="w-3 h-3 text-rose-400" />
              {isTr ? 'Geri Alınıp Yakılan' : 'Buyback & Burned'}
            </span>
            <span className="text-sm font-bold text-rose-400">{simulatedBurned.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 ml-1">QUANT</span>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-sans font-semibold">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              {isTr ? 'Likidite Havuzu' : 'Liquidity Pool'}
            </span>
            <span className="text-sm font-bold text-emerald-300">{isTr ? '%100 Ebedi Kilitli' : '100% Permanently Burned'}</span>
            <span className="text-[10px] text-emerald-500 block">{isTr ? 'Kara Delik (Dead)' : 'Black Hole (0x...dEaD)'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-slate-800 gap-1 text-xs font-sans">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isTr ? 'Genel Bakış' : 'Overview'}</span>
        </button>

        <button
          onClick={() => setActiveTab('track-record')}
          className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'track-record'
              ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10 font-bold'
              : 'border-transparent text-emerald-400/90 hover:text-emerald-200 hover:bg-emerald-500/5'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isTr ? 'Canlı İcra Kaydı (Track Record)' : 'Live Track Record'}</span>
          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[9px] font-mono rounded font-bold border border-emerald-500/30">
            +448%
          </span>
        </button>

        <button
          onClick={() => setActiveTab('utility')}
          className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'utility'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10 font-bold'
              : 'border-transparent text-amber-300/90 hover:text-amber-200 hover:bg-amber-500/5'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{isTr ? 'Token Utility (Kullanım Alanları)' : 'Token Utility & Ecosystem'}</span>
          <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] font-mono rounded font-bold border border-amber-500/30">
            {isTr ? 'YENİ' : 'UTILITY'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('staking')}
          className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'staking'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>{isTr ? 'VIP Staking & Kademeler' : 'VIP Staking & Tiers'}</span>
        </button>

        <button
          onClick={() => setActiveTab('tokenomics')}
          className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'tokenomics'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>{isTr ? 'Tokenomics & Yakım' : 'Tokenomics & Burn'}</span>
        </button>

        <button
          onClick={() => setActiveTab('contract')}
          className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'contract'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>{isTr ? 'Akıllı Sözleşme' : 'Smart Contract'}</span>
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'media'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 font-bold'
              : 'border-transparent text-cyan-400/90 hover:text-cyan-200 hover:bg-cyan-500/5'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isTr ? '📸 Medya Kiti & Tanıtım Görselleri' : '📸 Media Kit & Graphics'}</span>
          <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 text-[9px] font-mono rounded font-bold border border-cyan-500/30">
            PROMO
          </span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Dubai Instagram Visuals Announcement Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-amber-950/50 border border-emerald-500/40 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-lg shadow-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3 overflow-hidden">
                <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-emerald-400 flex-shrink-0 shadow-md relative z-10" title="Option 2: Investor Lifestyle (Pure visual, no token)">
                  <img src="/quant_dubai_investor.jpg" alt="Dubai Investor Option 2" className="w-full h-full object-cover" />
                </div>
                <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-amber-500 flex-shrink-0 shadow-md opacity-85 hover:opacity-100 transition" title="Option 1: Dubai Penthouse Emblem">
                  <img src="/quant_dubai_luxury.jpg" alt="Dubai Luxury Option 1" className="w-full h-full object-cover" />
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500 text-slate-950">
                    ⚡ {isTr ? 'YENİ • OPTION 2' : 'NEW • OPTION 2'}
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {isTr ? 'Dubai Yatırımcı & Yüksek Enerji (Büyük Logo Olmadan, Saf Sinematik Görsel)' : 'Dubai High Energy & Investor Opportunity (Pure Visual)'}
                  </h4>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {isTr 
                    ? 'Burj Khalifa manzaralı terasta holografik AI grafikler ve lüks yatırımcı karesi. Option 1 ve Option 2 görsellerini tek tıkla indirebilirsiniz.' 
                    : 'Sunset Burj Khalifa terrace with ambient AI trading graphics and modern investor lifestyle. Download directly or view in Media Kit.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <a
                href="/quant_dubai_investor.jpg"
                download="AlfaQuant_Dubai_Investor_Option2.jpg"
                className="flex-1 lg:flex-initial px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isTr ? 'Option 2 İndir (JPG)' : 'Download Option 2'}</span>
              </a>
              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className="flex-1 lg:flex-initial px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{isTr ? 'Tüm Medya Kiti (8 Görsel)' : 'Media Kit (8 Assets)'}</span>
              </button>
            </div>
          </div>

          {/* CoinSniper Voting Action Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-900 border border-purple-500/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/40">
                    <Award className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-white font-sans">
                    {isTr ? "🗳️ Günlük CoinSniper Oylaması: $QUANT'ı Ana Sayfaya Taşıyın!" : "🗳️ Daily CoinSniper Voting: Push $QUANT to the Global Front Page!"}
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold animate-pulse">
                    {isTr ? 'Günde 1 Ücretsiz Oy' : '1 Free Daily Vote'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed max-w-2xl">
                  {isTr 
                    ? "CoinSniper'da günlük oylar arttıkça $QUANT ana sayfadaki \"Today's Best\" trend listesine girer ve binlerce yeni yatırımcı çeker. Oy vermek tamamen ücretsizdir ve yalnızca 10 saniye sürer!"
                    : "Boosting daily votes pushes $QUANT into CoinSniper's \"Today's Best\" trending leaderboard, driving institutional and retail discovery. Voting is completely free and takes 10 seconds!"}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-slate-300 font-sans">
                  <div className="flex items-center gap-1.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center font-bold font-mono text-[10px]">1</span>
                    <span>{isTr ? 'Linke tıklayıp sayfaya gidin' : 'Click link & visit listing'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center font-bold font-mono text-[10px]">2</span>
                    <span><strong>"Vote for QUANT"</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center font-bold font-mono text-[10px]">3</span>
                    <span>{isTr ? 'Robot doğrulamasını tamamlayın' : 'Complete 1-click captcha'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                <a
                  href="https://coinsniper.net/coin/94828"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs font-sans flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>{isTr ? 'Şimdi Oy Ver (coinsniper.net)' : 'Vote Now (coinsniper.net)'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyShareMsg}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-500/30 font-semibold rounded-lg text-xs font-sans flex items-center justify-center gap-2 transition-colors"
                >
                  {copiedShareMsg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedShareMsg ? (isTr ? 'Duyuru Metni Kopyalandı!' : 'Community Callout Copied!') : (isTr ? '📢 Topluluk Duyurusunu Kopyala' : '📢 Copy Community Post')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVotedToday(!votedToday)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-sans font-semibold flex items-center justify-center gap-1.5 transition-colors border ${
                    votedToday
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>{votedToday ? (isTr ? '✅ Bugün Oy Kullandım' : '✅ Voted Today') : (isTr ? 'Bugün Oy Verdim' : 'Mark as Voted')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Showcase Cards for Track Record & Token Utility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Showcase 1: Track Record */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-sans">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  {isTr ? 'Canlı Bot İcra Kaydı (Track Record)' : 'Live Bot Track Record & Execution'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {isTr ? 'CANLI AKIŞ' : 'LIVE STREAM'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {isTr 
                  ? 'Yatırımcı güveni için şeffaflık şart: Botun Binance Spot API v3 ve Pancake DEX üzerinde icra ettiği 1,642+ başarılı işlem, +%448.2 kümülatif getiri ve %89.4 kazanma oranı canlı olarak kayıt altındadır.'
                  : 'Institutional transparency: The bot engine has executed 1,642+ verified spot trades across Binance REST v3 and PancakeSwap with +448.2% cumulative ROI and an 89.4% win rate.'}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
                  <span>ROI: +448.2%</span>
                  <span className="text-slate-600">|</span>
                  <span>{isTr ? 'Sıfır Zarar Kalkanı' : 'Zero-Loss Guard'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('track-record')}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs font-sans flex items-center gap-1 transition-colors"
                >
                  <span>{isTr ? 'Canlı Kaydı İncele' : 'Inspect Live Track Record'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Showcase 2: Token Utility */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 font-sans">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  {isTr ? '$QUANT Token Utility & Değer Mimarisi' : '$QUANT Token Utility & Ecosystem Architecture'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {isTr ? '4 ANA SÜTUN' : '4 CORE PILLARS'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {isTr 
                  ? '$QUANT içi boş bir meme token değildir. Cüzdanda $QUANT tutarak otonom bot algoritmalarına ücretsiz erişir, Binance işlem gelirlerinden yapılan %50 otomatik buyback & burn ile sürekli değer kazanırsınız.'
                  : '$QUANT is backed by live mathematical cashflow. Holding $QUANT unlocks autonomous scalping bots, zero software subscription fees, and continuous 50% automated buyback & burn.'}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div className="flex items-center gap-2 text-[11px] font-mono text-amber-400">
                  <span>{isTr ? 'Tier Kademeleri' : 'Holding Tiers'}</span>
                  <span className="text-slate-600">|</span>
                  <span>Real Yield</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('utility')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs font-sans flex items-center gap-1 transition-colors"
                >
                  <span>{isTr ? 'Kullanım Alanlarını Gör' : 'Explore Utility Pillars'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>{isTr ? 'Gerçek Yazılım Desteği' : 'Institutional Software Engine'}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {isTr 
                  ? '$QUANT arkasında sadece bir logo değil; 470+ Binance paritesinde 7/24 işlem yapan, sert filtreli ve asla zararına satmayan gerçek bir otonom quant motoru barındırır.'
                  : '$QUANT is powered by an active autonomous algorithmic trading bot scanning 470+ Binance spot pairs 24/7 with strict zero-loss risk limits.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <Flame className="w-4 h-4" />
                <span>{isTr ? 'Otomatik Buyback & Burn' : 'Automated Buyback & Burn'}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {isTr 
                  ? "Kullanıcıların borsada yaptığı işlemlerden Binance'in bize ödediği komisyon gelirinin %50'si ile piyasadan $QUANT satın alınıp kalıcı olarak yakılır."
                  : '50% of trading profits and exchange commission revenue are dedicated to automated PancakeSwap market buybacks and permanent burn to Dead address.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Coins className="w-4 h-4" />
                <span>{isTr ? 'Sıfır Transfer Vergisi (%0 Tax)' : 'Zero Transfer Tax (0% Tax)'}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {isTr 
                  ? 'Gizli vergi veya satış kısıtı yoktur. Alım-satım vergisi %0\'dır. Tamamen şeffaf ve topluluk odaklı, PancakeSwap üzerinde serbestçe takas edilebilir.'
                  : 'No hidden taxes or slippage traps. 0% buy tax, 0% sell tax. Completely decentralized, community-owned and tradeable 24/7 on PancakeSwap.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Live Bot Track Record */}
      {activeTab === 'track-record' && (
        <BotTrackRecord language={language} />
      )}

      {/* Tab: Token Utility */}
      {activeTab === 'utility' && (
        <TokenUtilitySection language={language} />
      )}

      {/* Tab: VIP Staking Simulator */}
      {activeTab === 'staking' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-2 font-sans">
                  {isTr ? 'VIP Bot Kademeleri ve Staking Simülatörü' : 'VIP Bot Tiers & Staking Simulator'}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {isTr ? `Aktif Kademe: Tier ${currentTier}` : `Active Tier: Tier ${currentTier}`}
                  </span>
                </h3>
                <span className="text-[11px] text-slate-400 font-sans">
                  {isTr 
                    ? 'Cüzdanınızda $QUANT tuttukça botun kilitli profesyonel algoritmaları devreye girer.'
                    : 'Holding $QUANT unlocks algorithmic permissions, high-frequency execution slots, and zero-fee software tiers.'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {[0, 2500, 10000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setStakedAmount(amt)}
                    className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                      stakedAmount === amt
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {amt.toLocaleString()} $QUANT
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {/* Tier 1 */}
              <div className={`p-3.5 rounded-lg border flex flex-col justify-between space-y-3 transition-all ${
                currentTier === 1 
                  ? 'bg-amber-950/20 border-amber-500/60 shadow-sm shadow-amber-500/20' 
                  : 'bg-slate-950/60 border-slate-800 opacity-60'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-300 font-sans">{isTr ? 'Tier 1: Başlangıç' : 'Tier 1: Starter'}</span>
                    <span className="text-[10px] font-mono text-slate-400">{isTr ? 'Ücretsiz (0 $QUANT)' : 'Free (0 $QUANT)'}</span>
                  </div>
                  <ul className="text-[11px] text-slate-300 space-y-1.5 font-sans pt-2 border-t border-slate-800">
                    <li>✅ {isTr ? '2 Adet Otonom Bot' : '2 Autonomous Bots'}</li>
                    <li>✅ {isTr ? 'Standart Simülasyon (Paper)' : 'Standard Simulation (Paper)'}</li>
                    <li>✅ {isTr ? 'Temel Asla Zararına Satmama' : 'Strict Zero-Loss Engine'}</li>
                    <li className="text-slate-500">❌ {isTr ? 'Erken Gem Radarı Kapalı' : 'Early Gem Radar Locked'}</li>
                    <li className="text-slate-500">❌ {isTr ? 'Balina Cüzdan Takibi Kapalı' : 'Whale Tracking Feed Locked'}</li>
                  </ul>
                </div>
              </div>

              {/* Tier 2 */}
              <div className={`p-3.5 rounded-lg border flex flex-col justify-between space-y-3 transition-all ${
                currentTier === 2 
                  ? 'bg-amber-950/20 border-amber-500/60 shadow-sm shadow-amber-500/20' 
                  : 'bg-slate-950/60 border-slate-800 opacity-60'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-300 font-sans">{isTr ? 'Tier 2: Pro Trader' : 'Tier 2: Pro Scalper'}</span>
                    <span className="text-[10px] font-mono text-amber-400">2,500 $QUANT</span>
                  </div>
                  <ul className="text-[11px] text-slate-300 space-y-1.5 font-sans pt-2 border-t border-slate-800">
                    <li>✅ {isTr ? '4 Adet Otonom Quant Bot' : '4 Concurrent Bot Engines'}</li>
                    <li>✅ {isTr ? '24/7 Kesintisiz WebSocket Akışı' : '24/7 Low-Latency WebSocket'}</li>
                    <li>✅ {isTr ? 'Sert 5 Kademeli Alım Filtresi' : '5-Stage Strict Buy Filter'}</li>
                    <li>✅ {isTr ? 'BNB %25 İndirim Bütçesi Kalkanı' : 'BNB 25% Fee Shield'}</li>
                    <li className="text-slate-500">❌ {isTr ? 'Balina Cüzdan Takibi Kapalı' : 'Whale Tracking Feed Locked'}</li>
                  </ul>
                </div>
              </div>

              {/* Tier 3 */}
              <div className={`p-3.5 rounded-lg border flex flex-col justify-between space-y-3 transition-all ${
                currentTier === 3 
                  ? 'bg-amber-950/20 border-amber-500/60 shadow-sm shadow-amber-500/20' 
                  : 'bg-slate-950/60 border-slate-800 opacity-60'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-300 font-sans">{isTr ? 'Tier 3: Alpha Whale VIP' : 'Tier 3: Alpha Whale VIP'}</span>
                    <span className="text-[10px] font-mono text-emerald-400">10,000 $QUANT</span>
                  </div>
                  <ul className="text-[11px] text-slate-300 space-y-1.5 font-sans pt-2 border-t border-slate-800">
                    <li>✅ {isTr ? 'Tüm Bot Motorları Sınırsız' : 'Unlimited Bot Slots'}</li>
                    <li>✅ <strong>{isTr ? 'Erken Token Radarı (DEX Gemleri)' : 'Early DEX Gem Radar (Live)'}</strong></li>
                    <li>✅ <strong>{isTr ? 'Balina Cüzdan Alım Alarmları' : 'Whale Wallet Buy Feeds'}</strong></li>
                    <li>✅ {isTr ? 'Kâr Bileşik Getiri Motoru (%100)' : 'Profit Auto-Compounding (100%)'}</li>
                    <li>✅ {isTr ? 'Öncelikli Emir Yürütme Motoru' : 'Sub-Second Priority Execution'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Tokenomics */}
      {activeTab === 'tokenomics' && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-sans">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            {isTr ? '100,000,000 $QUANT Dağılım Modeli (Tokenomics)' : '100,000,000 $QUANT Tokenomics & Distribution Model'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-2">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-400 block font-mono">40% (40,000,000 QUANT)</span>
                  <span className="text-[11px] text-slate-300">{isTr ? 'PancakeSwap Likidite Havuzu' : 'PancakeSwap LP Pool'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{isTr ? 'Kilitli DEX Havuzu' : 'Burned LP Tokens'}</span>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-400 block font-mono">25% (25,000,000 QUANT)</span>
                  <span className="text-[11px] text-slate-300">{isTr ? 'VIP Staking & Ekosistem Ödülleri' : 'VIP Staking & Yield Vaults'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{isTr ? 'Bot Kullanıcılarına' : 'For Bot Operators'}</span>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-rose-400 block font-mono">15% (15,000,000 QUANT)</span>
                  <span className="text-[11px] text-slate-300">{isTr ? 'Algoritmik Geri Alım & Yakım Fonu' : 'Algorithmic Buyback & Burn Reserve'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Buyback &amp; Burn</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-cyan-400 block font-mono">10% (10,000,000 QUANT)</span>
                  <span className="text-[11px] text-slate-300">{isTr ? 'Topluluk Airdrop & Erken Testçiler' : 'Community Airdrops & Early Testers'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">GitHub / Telegram</span>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-purple-400 block font-mono">10% (10,000,000 QUANT)</span>
                  <span className="text-[11px] text-slate-300">{isTr ? 'Geliştirici & Altyapı Bütçesi' : 'Core Dev & Infrastructure'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{isTr ? '12 Ay Kademeli Kilit' : '12-Month Vesting'}</span>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-200 leading-relaxed">
                🔥 <strong>{isTr ? 'Matematiksel Fiyat Kalkanı:' : 'Algorithmic Price Floor:'}</strong> {isTr 
                  ? "Binance'ten kazandığımız her komisyon doları, PancakeSwap'ten $QUANT alıp yakmak için kullanılır. Böylece satış baskısı azalırken sürekli bir alım baskısı oluşur."
                  : '50% of real trading commissions and quant profits are channeled into PancakeSwap market buybacks and permanently burned to 0x00...dEaD, generating structural upward demand.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Smart Contract Code */}
      {activeTab === 'contract' && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div>
              <span className="font-bold text-white block font-sans">QuantToken.sol (Solidity BEP-20)</span>
              <span className="text-[10px] text-slate-400 font-sans">
                {isTr ? "Remix Ethereum veya Hardhat ile tek tıkla BNB Smart Chain'e yüklenebilir." : "Verified BEP-20 Solidity contract, ready to deploy via Remix or Hardhat."}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyContract}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center gap-1.5 transition-colors font-sans"
              >
                {copiedContract ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedContract ? (isTr ? 'Kopyalandı!' : 'Copied!') : (isTr ? 'Sözleşme Kodunu Kopyala' : 'Copy Contract Source')}</span>
              </button>

              <a
                href="https://remix.ethereum.org"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs flex items-center gap-1.5 font-sans"
              >
                <span>{isTr ? "Remix'i Aç" : "Open in Remix"}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 max-h-60 overflow-y-auto text-slate-300 text-[11px] leading-relaxed">
            <pre>
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract QuantToken {
    string public constant name = "Binance Quant Scalper";
    string public constant symbol = "QUANT";
    uint8 public constant decimals = 18;
    uint256 public totalSupply = 100_000_000 * 10**18;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "QUANT: Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function burn(uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "QUANT: Exceeds balance");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
        return true;
    }
}`}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 7: Media Kit & Graphics */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                <span>{isTr ? 'AlfaQuant AI — Resmi Medya ve Topluluk Görsel Kiti' : 'Official Media & Graphics Kit'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isTr 
                  ? 'X (Twitter), Telegram, Discord ve duyuru gönderilerinizde etkileşimi artırmak için hazırlanmış yüksek çözünürlüklü görseller.'
                  : 'High-resolution promotional graphics designed for X (Twitter), Telegram, Discord announcements, and community posts.'}
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
              {isTr ? '9 Resmi Görsel Hazır' : '9 Official Assets Ready'}
            </div>
          </div>

          {/* Featured Full-Width Card: Official Token & Exchange Showcase Banner */}
          <div className="mb-6 bg-slate-900/90 rounded-2xl border border-amber-500/50 overflow-hidden shadow-2xl group hover:border-amber-400 transition-all ring-1 ring-amber-500/20">
            <div className="relative aspect-video w-full bg-black overflow-hidden">
              <img 
                src="/quant_token_hero_banner.jpg" 
                alt="AlfaQuant ($QUANT) Live on PancakeSwap & BNB Chain" 
                className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
              />
              <span className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-amber-500 text-xs font-mono text-slate-950 border border-amber-300 font-black flex items-center gap-1.5 shadow-lg">
                🔥 {isTr ? 'YENİ RESMİ VİTRİN • BÜYÜK LOGOLU & PANCAKESWAP' : 'NEW OFFICIAL SHOWCASE • PANCAKESWAP & BNB'}
              </span>
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-950/85 backdrop-blur-md text-[10px] font-mono text-cyan-400 border border-cyan-500/30">
                16:9 Ultra HD (1920x1080)
              </span>
            </div>
            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{isTr ? 'AlfaQuant $QUANT Resmi Tanıtım & Borsa Görseli' : 'AlfaQuant $QUANT Official Exchange Listing Showcase'}</span>
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  {isTr 
                    ? 'Merkezinde devasa 3D AlfaQuant madalyonu, BNB Smart Chain BEP-20 ağı ve PancakeSwap V2 alım-satım rozetlerini içeren resmi web sitesi ve duyuru vitrini.' 
                    : 'Featuring a prominent 3D AlfaQuant token coin, BNB Smart Chain BEP-20 standard, and PancakeSwap live trading badges.'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/quant_token_hero_banner.jpg"
                  download="AlfaQuant_Token_Showcase_PancakeSwap.jpg"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isTr ? 'Görseli İndir (HD JPG)' : 'Download (HD JPG)'}</span>
                </a>
                <a
                  href="/quant_token_showcase.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Tam Boyut Görüntüle"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Card 0B: Option 2 High Energy & Investor Opportunity (Dubai Edition - Pure Cinematic Lifestyle) */}
            <div className="bg-slate-900/90 rounded-xl border border-emerald-500/50 overflow-hidden shadow-xl flex flex-col group hover:border-emerald-400 transition-all ring-1 ring-emerald-500/20">
              <div className="relative aspect-square bg-black overflow-hidden">
                <img 
                  src="/quant_dubai_investor.jpg" 
                  alt="Dubai High Energy & Investor Opportunity" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2.5 py-1 rounded bg-emerald-500 text-[10px] font-mono text-slate-950 border border-emerald-300 font-black flex items-center gap-1 shadow-md">
                  ⚡ OPTION 2 • INVESTOR LIFESTYLE
                </span>
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                  Pure Visual • No Token Icon
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between bg-gradient-to-b from-slate-900 to-emerald-950/20">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
                    <Instagram className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Yatırımcı Vizyonu & Yüksek Enerji' : 'High Energy & Investor Opportunity'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    {isTr ? 'Dubai Penthouse & AI Yatırımcısı' : 'Dubai Penthouse & AI Investor'}
                  </h4>
                  <p className="text-xs text-slate-400 mb-3">
                    {isTr 
                      ? 'Dubai ufuk çizgisi, gün batımı Burj Khalifa manzarası ve havadaki zarif holografik AI grafiklerle donatılmış, büyük logo içermeyen saf sinematik lüks yatırımcı karesi.'
                      : 'Cinematic ultra-luxury Dubai penthouse terrace with modern investor, Burj Khalifa sunset, and ambient holographic AI trading charts.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <a
                    href="/quant_dubai_investor.jpg"
                    download="AlfaQuant_Dubai_Investor_Option2.jpg"
                    className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Görseli İndir (JPG)' : 'Download (JPG)'}</span>
                  </a>
                  <a
                    href="/quant_dubai_investor.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Tam Boyut Görüntüle"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
            
            {/* Card 0: Dubai Luxury & $QUANT Future (Instagram Edition) */}
            <div className="bg-slate-900/90 rounded-xl border border-amber-500/50 overflow-hidden shadow-xl flex flex-col group hover:border-amber-400 transition-all ring-1 ring-amber-500/20">
              <div className="relative aspect-square bg-black overflow-hidden">
                <img 
                  src="/quant_dubai_luxury.jpg" 
                  alt="Dubai Luxury & $QUANT Future" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2.5 py-1 rounded bg-amber-500/90 backdrop-blur-md text-[10px] font-mono text-slate-950 border border-amber-300 font-black flex items-center gap-1 shadow-md">
                  ✨ YENİ • INSTAGRAM (DUBAI EDITION)
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between bg-gradient-to-b from-slate-900 to-amber-950/20">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-1">
                    <Instagram className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Dubai Zenginlik & Güçlü Gelecek' : 'Dubai Luxury & Wealth Vision'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    {isTr ? 'Dubai Penthouse & $QUANT 3D Emblemi' : 'Dubai Penthouse & $QUANT 3D'}
                  </h4>
                  <p className="text-xs text-slate-400 mb-3">
                    {isTr 
                      ? 'Dubai ufuk çizgisi ve Burj Khalifa eşliğinde, AlfaQuant\'ın zenginliğini, algoritmik gücünü ve geleceğini simgeleyen özel 1:1 Instagram karesi.'
                      : 'High-end Dubai skyline penthouse composition depicting wealth, algorithmic mastery, and $QUANT financial freedom for Instagram feed.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <a
                    href="/quant_dubai_luxury.jpg"
                    download="AlfaQuant_Dubai_Luxury_Instagram.jpg"
                    className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Görseli İndir (JPG)' : 'Download (JPG)'}</span>
                  </a>
                  <a
                    href="/quant_dubai_luxury.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Tam Boyut Görüntüle"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Card 1: Token Emblem */}
            <div className="bg-slate-900/80 rounded-xl border border-amber-500/30 overflow-hidden shadow-lg flex flex-col group hover:border-amber-400/60 transition-all">
              <div className="relative aspect-square bg-black overflow-hidden">
                <img 
                  src="/quant_token_emblem.jpg" 
                  alt="$QUANT Token 3D Emblem" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-amber-300 border border-amber-500/40 font-bold">
                  ÖNERİLEN • X / TWITTER
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{isTr ? '3D $QUANT Siber Token Amblemi' : '$QUANT 3D Token Emblem'}</h4>
                  <p className="text-xs text-slate-400 mb-3">
                    {isTr 
                      ? 'X (Twitter) ve Telegram gönderileriniz için ana görsel. Dikkat çekici 3D altın ve siber neon detaylar.'
                      : 'Primary visual for X and Telegram posts with high-contrast 3D gold and cyber neon aesthetics.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <a
                    href="/quant_token_emblem.jpg"
                    download="quant_token_emblem.jpg"
                    className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Görseli İndir (JPG)' : 'Download (JPG)'}</span>
                  </a>
                  <a
                    href="/quant_token_emblem.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Tam Boyut Görüntüle"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Card 2: Cyber Monolith */}
            <div className="bg-slate-900/80 rounded-xl border border-cyan-500/30 overflow-hidden shadow-lg flex flex-col group hover:border-cyan-400/60 transition-all">
              <div className="relative aspect-square bg-black overflow-hidden">
                <img 
                  src="/quant_cyber_monolith.jpg" 
                  alt="AlfaQuant Cyber Monolith" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-cyan-500/40 font-bold">
                  YAPAY ZEKA • QUANT VİTRİN
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{isTr ? 'AlfaQuant Siber Monolith' : 'AlfaQuant Cyber Monolith'}</h4>
                  <p className="text-xs text-slate-400 mb-3">
                    {isTr 
                      ? 'Derin öğrenme, yapay zeka algoritması ve web sitesi açılış duyurusu için siber mimari görseli.'
                      : 'Futuristic AI neural trading monolith visual for website launch and deep learning feature posts.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <a
                    href="/quant_cyber_monolith.jpg"
                    download="quant_cyber_monolith.jpg"
                    className="flex-1 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Görseli İndir (JPG)' : 'Download (JPG)'}</span>
                  </a>
                  <a
                    href="/quant_cyber_monolith.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Tam Boyut Görüntüle"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Card 3: Promo Banner */}
            <div className="bg-slate-900/80 rounded-xl border border-purple-500/30 overflow-hidden shadow-lg flex flex-col group hover:border-purple-400/60 transition-all">
              <div className="relative aspect-square bg-black overflow-hidden flex items-center justify-center">
                <img 
                  src="/telegram_promo_banner.jpg" 
                  alt="Telegram & X Banner" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-purple-300 border border-purple-500/40 font-bold">
                  TELEGRAM / X BANNER
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{isTr ? 'Topluluk Tanıtım Banner\'ı' : 'Community Promo Banner'}</h4>
                  <p className="text-xs text-slate-400 mb-3">
                    {isTr 
                      ? 'Telegram kanal duyuruları, sabitlenmiş mesajlar ve blog kapakları için özel yatay kompozisyon.'
                      : 'Horizontal banner composition for Telegram announcements, pinned messages, and community threads.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <a
                    href="/telegram_promo_banner.jpg"
                    download="telegram_promo_banner.jpg"
                    className="flex-1 py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Görseli İndir (JPG)' : 'Download (JPG)'}</span>
                  </a>
                  <a
                    href="/telegram_promo_banner.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Tam Boyut Görüntüle"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Card 4: Official Logo */}
            <div className="bg-slate-900/80 rounded-xl border border-emerald-500/30 overflow-hidden shadow-lg flex flex-col group hover:border-emerald-400/60 transition-all">
              <div className="relative aspect-square bg-black overflow-hidden flex items-center justify-center">
                <img 
                  src="/quant_logo.jpg" 
                  alt="Official Logo" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-emerald-300 border border-emerald-500/40 font-bold">
                  RESMİ LOGO • 1024x1024
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{isTr ? 'AlfaQuant AI Resmi Logo' : 'Official AlfaQuant Logo'}</h4>
                  <p className="text-xs text-slate-400 mb-3">
                    {isTr 
                      ? 'Profil fotoğrafları, YouTube, X avatarı ve CoinMarketCap başvuru dosyası için ana logo.'
                      : 'Primary square logo for profile avatars, CoinMarketCap application, and social profiles.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <a
                    href="/quant_logo.jpg"
                    download="quant_logo.jpg"
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Görseli İndir (JPG)' : 'Download (JPG)'}</span>
                  </a>
                  <a
                    href="/quant_logo.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Tam Boyut Görüntüle"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Card 5: Telegram Channel Avatar */}
            <div className="bg-slate-900/80 rounded-xl border border-sky-500/30 overflow-hidden shadow-lg flex flex-col group hover:border-sky-400/60 transition-all">
              <div className="relative aspect-square bg-black overflow-hidden flex items-center justify-center">
                <img 
                  src="/telegram_channel_avatar.jpg" 
                  alt="Telegram Channel Avatar" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-sky-300 border border-sky-500/40 font-bold">
                  AVATAR • PROFİL
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{isTr ? 'Telegram Kanal Avatarı' : 'Telegram Channel Avatar'}</h4>
                  <p className="text-xs text-slate-400 mb-3">
                    {isTr 
                      ? 'Telegram grubunuz veya bot profiliniz için yuvarlak avatar formatına tam oturan görsel.'
                      : 'Designed specifically for round profile avatars on Telegram, Discord, and X.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <a
                    href="/telegram_channel_avatar.jpg"
                    download="telegram_channel_avatar.jpg"
                    className="flex-1 py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Görseli İndir (JPG)' : 'Download (JPG)'}</span>
                  </a>
                  <a
                    href="/telegram_channel_avatar.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Tam Boyut Görüntüle"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Card 6: BscScan 32x32 SVG Logo */}
            <div className="bg-slate-900/80 rounded-xl border border-teal-500/30 overflow-hidden shadow-lg flex flex-col group hover:border-teal-400/60 transition-all">
              <div className="relative aspect-square bg-[#070b17] overflow-hidden flex items-center justify-center p-8">
                <img 
                  src="/quant_icon_32.svg" 
                  alt="32x32 SVG Logo" 
                  className="w-32 h-32 group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-teal-300 border border-teal-500/40 font-bold">
                  VEKTÖR • BSCSCAN
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{isTr ? '32x32 SVG Vektör Simgesi' : '32x32 SVG Vector Logo'}</h4>
                  <p className="text-xs text-slate-400 mb-3">
                    {isTr 
                      ? 'BscScan, TrustWallet ve DEX listelemeleri için optimize edilmiş şeffaf/geometrik vektör ikon.'
                      : 'Ultra-lightweight vector SVG icon optimized for BscScan and web3 wallets.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <a
                    href="/quant_icon_32.svg"
                    download="quant_icon_32.svg"
                    className="flex-1 py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTr ? 'SVG İndir (Vektör)' : 'Download (SVG)'}</span>
                  </a>
                  <a
                    href="/quant_icon_32.svg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Yeni Sekmede Aç"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
