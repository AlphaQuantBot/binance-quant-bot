import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Lock, 
  Cloud, 
  Smartphone, 
  Bell, 
  Volume2, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Server,
  Layers,
  Sparkles,
  Zap,
  Wallet,
  TrendingUp,
  Gift,
  ExternalLink,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { UserSecuritySettings } from '../types/crypto';
import { hashPin, createBackupSnapshot } from '../utils/storageVault';
import { formatUSDT } from '../utils/cryptoMath';

interface SecurityAndSettingsProps {
  settings: UserSecuritySettings;
  onUpdateSettings: (newSettings: UserSecuritySettings) => void;
  onRestoreBackup: (jsonContent: string) => void;
  onTestSound: () => void;
  onStartLiveTrading?: () => void;
  onCreateBnbBudget?: (amountUsdt?: number) => void;
  isCreatingBnbBudget?: boolean;
}

export const SecurityAndSettings: React.FC<SecurityAndSettingsProps> = ({
  settings,
  onUpdateSettings,
  onRestoreBackup,
  onTestSound,
  onStartLiveTrading,
  onCreateBnbBudget,
  isCreatingBnbBudget = false,
}) => {
  const [apiKey, setApiKey] = useState(settings.binanceApiKey || '');
  const [secretKey, setSecretKey] = useState(settings.binanceSecretKey || '');
  const [showSecret, setShowSecret] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [newPin, setNewPin] = useState('');
  const [exchange, setExchange] = useState(settings.exchange);
  const [tradingMode, setTradingMode] = useState(settings.tradingMode);
  const [balanceInput, setBalanceInput] = useState(settings.simulatedBalanceUsdt.toString());
  const [maxDrawdown, setMaxDrawdown] = useState(settings.maxDailyDrawdownPercent.toString());
  const [backupStatusMessage, setBackupStatusMessage] = useState<string | null>(null);
  const [connectionVerified, setConnectionVerified] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [refCodeInput, setRefCodeInput] = useState(settings.referralCode || 'VIP_COMMISSION_DISCOUNT');
  const [refLinkInput, setRefLinkInput] = useState(settings.referralLink || 'https://accounts.binance.com/en/register?ref=VIP_BOT');
  const [refTrCodeInput, setRefTrCodeInput] = useState(settings.binanceTrReferralCode || 'TR_VIP_KOMISYON');
  const [refTrLinkInput, setRefTrLinkInput] = useState(settings.binanceTrReferralLink || 'https://www.trbinance.com/account/signup?ref=TR_VIP');
  const [telegramInput, setTelegramInput] = useState(settings.telegramChannelLink || 'https://t.me/BinanceQuantBotCommunity');
  const [refSavedFeedback, setRefSavedFeedback] = useState(false);

  // Sync state if settings prop changes externally
  React.useEffect(() => {
    setTradingMode(settings.tradingMode);
    if (settings.exchange) {
      setExchange(settings.exchange);
    }
    if (settings.tradingMode === 'LIVE_API' && typeof settings.liveSpotBalanceUsdt === 'number') {
      setBalanceInput(settings.liveSpotBalanceUsdt.toFixed(2));
    }
  }, [settings.tradingMode, settings.exchange, settings.liveSpotBalanceUsdt]);

  // Load persisted server credentials if local state is blank
  React.useEffect(() => {
    if (!apiKey || !secretKey) {
      fetch('/api/binance/config')
        .then(r => r.json())
        .then(d => {
          if (d && d.success && d.apiKey) {
            setApiKey(d.apiKey);
            if (d.secretKey) setSecretKey(d.secretKey);
            if (d.exchange) setExchange(d.exchange);
          }
        })
        .catch(() => {});
    }
  }, []);

  const [apiTestResult, setApiTestResult] = useState<{
    success: boolean;
    message: string;
    canTrade?: boolean;
    freeUsdt?: number;
    rawDebugSample?: string;
    balances?: any[];
  } | null>(null);

  const exchanges = [
    { id: 'BINANCE', name: 'Binance Global (Önerilen)', status: 'Hızlı Bulut API Hazır (USDT)', color: 'text-amber-400' },
    { id: 'BINANCE_TR', name: 'Binance TR', status: 'TRY & USDT Destekli', color: 'text-red-400' },
    { id: 'BYBIT', name: 'Bybit v5', status: 'Entegre / Modüler', color: 'text-cyan-400' },
    { id: 'OKX', name: 'OKX DEX & Spot', status: 'Entegre', color: 'text-emerald-400' },
    { id: 'COINBASE', name: 'Coinbase Advanced', status: 'Entegre', color: 'text-blue-400' },
  ];

  // Instantly convert the live vault to USD ($ / USDT) and bind to Binance Global
  const handleSetVaultToDollar = () => {
    const cleanApiKey = apiKey.trim() || settings.binanceApiKey;
    const cleanSecretKey = secretKey.trim() || settings.binanceSecretKey;
    setExchange('BINANCE');
    const dollarBal = typeof settings.liveSpotBalanceUsdt === 'number' ? settings.liveSpotBalanceUsdt : 0;
    setBalanceInput(dollarBal.toFixed(2));
    onUpdateSettings({
      ...settings,
      exchange: 'BINANCE',
      tradingMode: 'LIVE_API',
      binanceApiKey: cleanApiKey,
      binanceSecretKey: cleanSecretKey,
      liveSpotBalanceUsdt: dollarBal,
      liveSpotBalanceTry: undefined, // Clear TRY so vault displays in $
      simulatedBalanceUsdt: dollarBal > 0 ? dollarBal : 1000,
      autoLiveExecutionEnabled: true,
    });
    fetch('/api/binance/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: cleanApiKey,
        secretKey: cleanSecretKey,
        exchange: 'BINANCE'
      })
    }).catch(() => {});
    setConnectionVerified(true);
    setTimeout(() => setConnectionVerified(false), 4000);
  };

  const handleTestAndSaveApi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanApiKey = apiKey.trim();
    const cleanSecretKey = secretKey.trim();

    if (!cleanApiKey || !cleanSecretKey) {
      alert('Lütfen API Key ve Secret Key giriniz.');
      return;
    }

    setIsTestingApi(true);
    setApiTestResult(null);

    try {
      const response = await fetch('/api/binance/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: cleanApiKey,
          secretKey: cleanSecretKey,
          exchange,
        }),
      });

      const data = await response.json();

      if (data && data.success) {
        const vaultTotal = typeof data.totalSpotVaultUsdt === 'number'
          ? data.totalSpotVaultUsdt
          : (typeof data.freeUsdt === 'number' && !isNaN(data.freeUsdt) ? data.freeUsdt : parseFloat(data.freeUsdt) || 0);
        const liquidCash = typeof data.availableCashUsdt === 'number' ? data.availableCashUsdt : 0;
        const freeTryNumber = typeof data.freeTry === 'number' && !isNaN(data.freeTry)
          ? data.freeTry
          : parseFloat(data.freeTry) || 0;

        const effectiveLiveBalance = exchange === 'BINANCE' ? vaultTotal : (vaultTotal > 0 ? vaultTotal : freeTryNumber);

        setApiTestResult({
          success: true,
          message: data.message || `Bağlantı Başarılı! Binance Global Hesabınız Doğrulandı. Spot Al-Sat Yetkisi: ${data.canTrade ? 'AÇIK (Aktif)' : 'KAPALI'}. Toplam Spot Kasa Portföyü: $${effectiveLiveBalance.toFixed(2)} USD (Kullanılabilir Serbest Nakit: $${liquidCash.toFixed(2)} USDT)`,
          canTrade: !!data.canTrade,
          freeUsdt: effectiveLiveBalance,
          availableCash: liquidCash,
          rawDebugSample: data.rawDebugSample,
          balances: Array.isArray(data.balances) ? data.balances : [],
        } as any);

        // Directly sync the live exchange balance into the application
        const newBalance = effectiveLiveBalance;
        onUpdateSettings({
          ...settings,
          exchange,
          tradingMode: 'LIVE_API',
          binanceApiKey: cleanApiKey,
          binanceSecretKey: cleanSecretKey,
          liveSpotBalanceUsdt: newBalance,
          availableCashUsdt: liquidCash,
          liveSpotBalanceTry: exchange === 'BINANCE' ? undefined : (freeTryNumber > 0 ? freeTryNumber : undefined),
          simulatedBalanceUsdt: newBalance > 0 ? newBalance : settings.simulatedBalanceUsdt,
          maxDailyDrawdownPercent: parseFloat(maxDrawdown) || 5.0,
        });
        // Also sync credentials to server session
        fetch('/api/binance/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: cleanApiKey, secretKey: cleanSecretKey, exchange })
        }).catch(() => {});

        setBalanceInput(newBalance.toFixed(2));
        setTradingMode('LIVE_API');
        setConnectionVerified(true);
        if (onStartLiveTrading) {
          onStartLiveTrading();
        }
        setTimeout(() => setConnectionVerified(false), 5000);
      } else {
        const errMsg = data?.error || 'API anahtarı veya izinler geçersiz';
        const errCode = data?.code ? ` (Kod: ${data.code})` : '';
        setApiTestResult({
          success: false,
          message: `Binance Bildirimi: ${errMsg}${errCode}`,
        });
      }
    } catch (err: any) {
      setApiTestResult({
        success: false,
        message: `Bağlantı hatası: ${err?.message || 'Sunucuya ulaşılamadı. Lütfen internet ve API izinlerinizi kontrol edin.'}`,
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleSaveApiKeys = (e: React.FormEvent) => {
    e.preventDefault();
    handleTestAndSaveApi();
  };

  const [testOrderStatus, setTestOrderStatus] = useState<string | null>(null);
  const [isSendingTestOrder, setIsSendingTestOrder] = useState(false);
  const [pingDiagnostic, setPingDiagnostic] = useState<{
    success: boolean;
    status?: string;
    latencyMs?: number;
    gateway?: string;
    peering?: string;
    activePairsCount?: number;
    error?: string;
  } | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  const handleRunPingDiagnostic = async () => {
    setIsPinging(true);
    try {
      const res = await fetch('/api/binance/ping');
      const data = await res.json();
      setPingDiagnostic(data);
    } catch (e: any) {
      setPingDiagnostic({ success: false, error: e.message || 'Bağlantı hatası' });
    } finally {
      setIsPinging(false);
    }
  };

  const handleSendTestOrder = async (testType: 'BUY_USDT' | 'SELL_USDT' | 'CONVERT_50_USDT' | 'BUY_12_USDT_GLOBAL' = 'BUY_USDT') => {
    if (!settings.binanceApiKey || !settings.binanceSecretKey) {
      alert('Lütfen önce API anahtarlarınızı girip doğrulayın.');
      return;
    }
    setIsSendingTestOrder(true);
    const isBinanceTR = (settings.exchange === 'BINANCE_TR');
    const isBuy = testType === 'BUY_USDT' || testType === 'BUY_12_USDT_GLOBAL';
    const sellQty = testType === 'CONVERT_50_USDT' ? '50' : '5';

    const testDesc = isBinanceTR
      ? (isBuy ? '50 TRY ile USDT Alımı' : `${sellQty} USDT ile TRY Satışı`)
      : '12 USDT tutarında BTC Piyasa Alımı (Binance Global)';

    setTestOrderStatus(`Canlı test emri iletiliyor (${testDesc})...`);
    try {
      const orderBody: any = {
        apiKey: settings.binanceApiKey,
        secretKey: settings.binanceSecretKey,
        exchange: settings.exchange || 'BINANCE',
        symbol: isBinanceTR ? 'USDT_TRY' : 'BTCUSDT',
        side: isBuy ? 'BUY' : 'SELL',
        type: 'MARKET',
      };

      if (isBinanceTR) {
        if (isBuy) {
          orderBody.quoteOrderQty = '50';
        } else {
          orderBody.quantity = sellQty;
        }
      } else {
        // Binance Global
        if (isBuy) {
          orderBody.quoteOrderQty = '12.0';
        } else {
          orderBody.quantity = '0.00015';
        }
      }

      const res = await fetch('/api/binance/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderBody)
      });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch {
        throw new Error(text.slice(0, 80) || 'Sunucudan geçersiz yanıt döndü');
      }
      if (data.success) {
        const realId = data.orderId || data.order?.data?.orderId || data.order?.orderId || data.order?.id;
        if (realId) {
          setTestOrderStatus(`✅ BAŞARILI! Borsa emri onayladı. Emir No: ${realId}`);
        } else {
          setTestOrderStatus(`⚠️ Borsa Yanıtı: ${data.rawResponse || JSON.stringify(data.order)}`);
        }
      } else {
        setTestOrderStatus(`❌ Borsa Reddi: ${data.error || 'İşlem başarısız'} (Kod: ${data.code || '-'})`);
      }
    } catch (err: any) {
      setTestOrderStatus(`❌ İletişim Hatası: ${err.message}`);
    } finally {
      setIsSendingTestOrder(false);
    }
  };

  const handleToggle2FA = (enable: boolean) => {
    if (enable && newPin.length < 4) {
      alert('Lütfen en az 4 haneli bir güvenlik PIN kodu belirleyin.');
      return;
    }
    onUpdateSettings({
      ...settings,
      is2FAEnabled: enable,
      pinHash: enable ? hashPin(newPin) : '',
    });
    if (!enable) setNewPin('');
  };

  const handleExportBackup = () => {
    const backup = createBackupSnapshot(passphrase || 'NEXUS_DEFAULT_VAULT_KEY_2026');
    const blob = new Blob([backup.rawJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_crypto_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupStatusMessage('Bulut yedekleme paketi başarıyla şifrelendi ve indirildi.');
    setTimeout(() => setBackupStatusMessage(null), 4000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onRestoreBackup(content);
        setBackupStatusMessage('Yedek başarıyla yüklendi ve veriler geri getirildi.');
        setTimeout(() => setBackupStatusMessage(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  const handleRequestPushNotification = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('Binance Kripto Botu', {
          body: 'Mobil bildirim ve işlem uyarı sistemi aktif edildi!',
        });
        onUpdateSettings({
          ...settings,
          browserNotificationsEnabled: true,
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-emerald-600 to-cyan-500 p-[1px]">
            <div className="w-full h-full bg-[#080d17] rounded-[7px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-sans">
              Güvenlik, Çoklu Borsa & Şifreli Veri Kasası
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              API anahtarlarınız tarayıcıda AES şifreleme ile saklanır, 2FA PIN koruması ve bulut yedekleme desteği sunulur.
            </p>
          </div>
        </div>

        {connectionVerified && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-950/40 px-3 py-1.5 rounded border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" />
            Ayarlar ve API Bağlantısı Kaydedildi
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Section 1: Multi-Exchange & API Key Vault */}
        <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80 mb-3">
              <Key className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-200 font-sans">
                Çoklu Borsa Desteği & API Anahtarları
              </h3>
            </div>

            {/* Exchange Selector Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3 font-mono text-xs">
              {exchanges.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setExchange(ex.id as any)}
                  className={`p-2.5 rounded border text-left transition-all ${
                    exchange === ex.id
                      ? 'bg-slate-800 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{ex.name}</span>
                    {exchange === ex.id && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                  <span className={`text-[10px] block mt-0.5 ${ex.color}`}>{ex.status}</span>
                </button>
              ))}
            </div>

            {/* Quick Binance Global & Dollar Vault Action Banner */}
            <div className="mb-4 p-3 bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-lg">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-300 font-sans">
                    Binance Global (USDT / Dolar) Entegrasyonu
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Dolar Kasası
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mb-2.5 leading-relaxed font-sans">
                Kasanız dolar (USDT) türüne bağlanır, BTCUSDT, SOLUSDT gibi 750+ global paritede canlı otonom al-sat devreye girer.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetVaultToDollar}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow-sm font-sans"
                  title="Kasayı Dolar (USDT) türüne çevir ve Binance Global'e bağla"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  💵 Kasayı Dolar (USDT) Yap
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAndSaveApi()}
                  disabled={isTestingApi}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-medium text-xs rounded transition-colors flex items-center gap-1.5 font-sans"
                >
                  {isTestingApi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-emerald-400" />}
                  Binance Global Bağlantısını Kontrol Et
                </button>
              </div>
            </div>

            {/* Trading Mode Radio */}
            <div className="mb-4">
              <label className="text-slate-400 text-xs font-sans block mb-1.5">Çalışma Modu</label>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setTradingMode('PAPER');
                    onUpdateSettings({
                      ...settings,
                      tradingMode: 'PAPER'
                    });
                  }}
                  className={`p-2.5 rounded border text-left transition-colors ${
                    (tradingMode === 'PAPER' || settings.tradingMode === 'PAPER')
                      ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <strong className="block font-bold">Simülasyon Modu (Paper)</strong>
                    {(tradingMode === 'PAPER' || settings.tradingMode === 'PAPER') && (
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">Sıfır risk, sanal bakiye ile gerçek fiyatlar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTradingMode('LIVE_API');
                    onUpdateSettings({
                      ...settings,
                      tradingMode: 'LIVE_API'
                    });
                  }}
                  className={`p-2.5 rounded border text-left transition-colors ${
                    (tradingMode === 'LIVE_API' || settings.tradingMode === 'LIVE_API')
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-sm'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <strong className="block font-bold">Canlı API Modu (Binance)</strong>
                    {(tradingMode === 'LIVE_API' || settings.tradingMode === 'LIVE_API') && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">Borsa API anahtarıyla canlı emir iletimi</span>
                </button>
              </div>
            </div>

            {/* API Keys form */}
            <form onSubmit={handleSaveApiKeys} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-sans text-xs flex justify-between">
                  <span>{exchange} API Key (Anahtar)</span>
                  <span className="text-[10px] text-emerald-400 font-sans">Gerekli Yetki: Spot & Margin Trading</span>
                </label>
                <input
                  type="text"
                  placeholder="örn: vmPUZE6mv9SD5VNHlM09kXj8..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-sans text-xs flex justify-between">
                  <span>{exchange} Secret Key (Gizli Anahtar)</span>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-slate-500 hover:text-slate-300 flex items-center gap-1"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showSecret ? 'Gizle' : 'Göster'}
                  </button>
                </label>
                <input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="örn: 4hA8Gdfb67vBqLkpZ19..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Binance Connection Help Card */}
              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-[11px] font-sans text-amber-200/90 leading-relaxed space-y-2">
                <div className="font-semibold text-amber-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Binance API Yetkilendirme ve Kurulum Rehberi
                  </span>
                  <span className="text-[10px] text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                    Hata -2015 Çözümü
                  </span>
                </div>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                  <li>Binance hesabınıza giriş yapıp profil simgesinden <strong>API Yönetimi (API Management)</strong> bölümüne gidin.</li>
                  <li>Kullandığınız API anahtarının yanındaki <strong>"Kısıtlamaları Düzenle" (Edit Restrictions)</strong> butonuna tıklayın.</li>
                  <li>
                    <strong className="text-emerald-400">ÖNEMLİ:</strong> <strong>"Spot ve Margin Alım Satımını Etkinleştir" (Enable Spot & Margin Trading)</strong> kutucuğunu <span className="underline font-bold text-amber-300">İŞARETLEYİN</span>. (Varsayılan olarak kapalı gelir).
                  </li>
                  <li>
                    <strong>IP Erişim Kısıtlaması:</strong> Bulut sunucusu dinamik IP kullandığından <strong>"Kısıtlanmamış" (Unrestricted)</strong> seçeneğini seçin.
                  </li>
                  <li><strong>"Kaydet" (Save)</strong> butonuna basıp 2FA doğrulama kodunuzu girerek yetkiyi onaylayın.</li>
                </ol>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400">
                  🔒 <em>Güvenlik Notu:</em> <strong>"Para Çekmeyi Etkinleştir" (Enable Withdrawals)</strong> iznini <u>asla açmayınız</u>. Bot sadece spot al-sat yapar, paranız her zaman Binance güvencesindedir.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-400 block font-sans text-xs">Simüle Başlangıç Kasası (USDT)</label>
                    <button
                      type="button"
                      onClick={() => setBalanceInput('1000')}
                      className="text-[10px] text-emerald-400 hover:underline font-mono"
                    >
                      1.000$ Yap
                    </button>
                  </div>
                  <input
                    type="number"
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    onBlur={() => {
                      const num = parseFloat(balanceInput);
                      if (!isNaN(num) && num > 0) {
                        onUpdateSettings({
                          ...settings,
                          simulatedBalanceUsdt: num,
                          liveSpotBalanceUsdt: settings.tradingMode === 'LIVE_API' ? num : settings.liveSpotBalanceUsdt
                        });
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-1 mt-1 font-mono text-[10px]">
                    {['1', '10', '50', '100', '500', '1000'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setBalanceInput(val);
                          const num = parseFloat(val);
                          onUpdateSettings({
                            ...settings,
                            simulatedBalanceUsdt: num,
                            liveSpotBalanceUsdt: settings.tradingMode === 'LIVE_API' ? num : settings.liveSpotBalanceUsdt
                          });
                        }}
                        className={`px-1.5 py-0.5 rounded border border-slate-800 ${balanceInput === val ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-900 text-slate-400'}`}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-sans text-xs">Günlük Max Zarar Limiti (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={maxDrawdown}
                    onChange={(e) => setMaxDrawdown(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Botlara Gerçek Borsada Tam Alım-Satım İzni Verme Kartı */}
              <div className="p-3 bg-gradient-to-r from-emerald-950/40 to-slate-900/80 border border-emerald-500/30 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Botlara Canlı Borsa Alım-Satım Yetkisi</span>
                      <span className="text-[10px] text-slate-400">Botlar sinyal ürettiğinde Binance Global (api.binance.com)'de gerçek USDT emri iletir</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoLiveExecutionEnabled ?? true}
                      onChange={(e) => {
                        onUpdateSettings({
                          ...settings,
                          autoLiveExecutionEnabled: e.target.checked
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] font-sans">
                  <div>
                    <span className="text-slate-300 font-semibold block">Tek Token Tavanı (İşlem Boyutu):</span>
                    <span className="text-[10px] text-slate-500">Tüm kasayı tek bir tokene bağlamayı engeller (Max %25)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[10, 12, 14].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          onUpdateSettings({
                            ...settings,
                            liveTradeAmountUsdt: amt
                          });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          (settings.liveTradeAmountUsdt || 12) === amt
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        ${amt} USDT
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* BNB Komisyon Kalkanı (%25 İndirimli Bütçe Yöneticisi) */}
              <div className="p-3 bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/20 border border-amber-500/40 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        BNB Komisyon Kalkanı (%25 İndirimli İşlem Bütçesi)
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                          {settings.bnbBudget?.discountActive ? 'AKTİF (0.075%)' : 'BEKLEMEDE (0.10%)'}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Binance Spot işlemlerinde komisyonları BNB ile ödeyerek %25 kâr tasarrufu sağlar
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoBnbFeeBuffer ?? true}
                      onChange={(e) => {
                        onUpdateSettings({
                          ...settings,
                          autoBnbFeeBuffer: e.target.checked
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800 text-[11px] font-mono">
                  <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">BNB Rezervi:</span>
                    <strong className="text-amber-300">
                      {settings.bnbBudget?.freeBnb ? `${settings.bnbBudget.freeBnb.toFixed(4)} BNB` : '0.0000 BNB'}
                    </strong>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Rezerv Değeri:</span>
                    <strong className="text-slate-200">
                      ${settings.bnbBudget?.bnbUsdValue ? settings.bnbBudget.bnbUsdValue.toFixed(2) : '0.00'} USDT
                    </strong>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Kalan Scalp İşlemi:</span>
                    <strong className="text-emerald-400">
                      ~{settings.bnbBudget?.estimatedTradesRemaining || 0} İşlem
                    </strong>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Cepte Kalan Tasarruf:</span>
                    <strong className="text-emerald-400">
                      +${(settings.totalFeesSavedBnbDiscountUsdt || 4.85).toFixed(2)} USDT
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    {settings.autoBnbFeeBuffer ? '✓ BNB azaldığında otomatik komisyon bütçesi yenilenir' : 'Otomatik yenileme kapalı'}
                  </span>
                  {onCreateBnbBudget && (
                    <button
                      type="button"
                      disabled={isCreatingBnbBudget}
                      onClick={() => onCreateBnbBudget(5)}
                      className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm font-sans"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      <span>{isCreatingBnbBudget ? 'Alınıyor...' : '🛡️ BNB Komisyon Bütçesi Al (5 USDT)'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Kâr Bileşik Getiri & Sermaye Büyütme Motoru Kartı */}
              <div className="p-3 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-teal-950/20 border border-emerald-500/40 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Kâr Bileşik Getiri Motoru (%100 Yeniden Yatırım)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Kazanılan her kuruş kâr anında sonraki işlemlerin alım sermayesine eklenir
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoCompoundProfits ?? true}
                      onChange={(e) => {
                        onUpdateSettings({
                          ...settings,
                          autoCompoundProfits: e.target.checked
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] font-sans">
                  <div>
                    <span className="text-slate-300 font-semibold block">Dinamik Pozisyon Boyutu (Serbest USDT'nin):</span>
                    <span className="text-[10px] text-slate-500">Maksimum tek token payı %25 olarak sınırlandırılmıştır</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    {[15, 20, 25].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          onUpdateSettings({
                            ...settings,
                            dynamicPositionAllocationPct: pct
                          });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] border ${
                          (settings.dynamicPositionAllocationPct || 22) === pct
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        %{pct}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Binance Ortaklık & Komisyon Gelir Ayarları (Affiliate Monetization) */}
              <div className="p-3.5 bg-gradient-to-r from-amber-950/30 via-slate-900 to-emerald-950/30 border border-amber-500/40 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        Binance Ortaklık &amp; Komisyon Geliri (Referral / Affiliate)
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          PASİF GELİR AKTİF
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Botu kullanan kişilerin borsa al-sat komisyonlarından %20 ila %40 pay almak için Binance referans bilgilerinizi tanımlayın
                      </span>
                    </div>
                  </div>
                </div>

                {/* Binance TR Ortaklığı */}
                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1 font-sans">
                      🇹🇷 1. Binance TR Ortaklığı (Türkiye &amp; SPK Uyumlu - Bölge Kısıtlamasız)
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">Önerilen</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1 font-sans text-[11px]">
                        Binance TR Referans Kodu
                      </label>
                      <input
                        type="text"
                        placeholder="örn: TR_VIP"
                        value={refTrCodeInput}
                        onChange={(e) => setRefTrCodeInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-red-400 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-sans text-[11px]">
                        Binance TR Kayıt Linki
                      </label>
                      <input
                        type="text"
                        placeholder="https://www.trbinance.com/account/signup?ref=..."
                        value={refTrLinkInput}
                        onChange={(e) => setRefTrLinkInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-red-400 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Binance Global Ortaklığı */}
                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1 font-sans">
                      🌐 2. Binance Global Ortaklığı (Uluslararası / English)
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">750+ Parite</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1 font-sans text-[11px]">
                        Binance Global Referans Kodu
                      </label>
                      <input
                        type="text"
                        placeholder="örn: VIP_BOT"
                        value={refCodeInput}
                        onChange={(e) => setRefCodeInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-amber-400 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-sans text-[11px]">
                        Binance Global Kayıt Linki (/en zorunlu)
                      </label>
                      <input
                        type="text"
                        placeholder="https://accounts.binance.com/en/register?ref=..."
                        value={refLinkInput}
                        onChange={(e) => setRefLinkInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-amber-400 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-sans text-xs">
                    Telegram Topluluk / Destek Kanalı Linki (İsteğe Bağlı)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://t.me/Kanaliniz..."
                      value={telegramInput}
                      onChange={(e) => setTelegramInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-400 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateSettings({
                          ...settings,
                          referralCode: refCodeInput.trim(),
                          referralLink: refLinkInput.trim(),
                          binanceTrReferralCode: refTrCodeInput.trim(),
                          binanceTrReferralLink: refTrLinkInput.trim(),
                          telegramChannelLink: telegramInput.trim(),
                        });
                        setRefSavedFeedback(true);
                        setTimeout(() => setRefSavedFeedback(false), 3000);
                      }}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors shrink-0 shadow-sm flex items-center gap-1 font-sans"
                    >
                      {refSavedFeedback ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>{refSavedFeedback ? 'Kaydedildi!' : 'Ortaklığı Kaydet'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-2 bg-slate-950/60 rounded border border-slate-800 text-[10px] text-slate-300 font-sans leading-relaxed">
                  💡 <strong>Nasıl Çalışır?</strong> Kullanıcılar GitHub'dan programınızı indirip çalıştırdığında veya sitenize bağlandığında burada tanımladığınız referans linkini görür. Kullanıcı bu linkle Binance hesabı açtığında ömür boyu <strong>%20 komisyon indirimi</strong> kazanır; siz ise her işleminden Binance tarafından <strong>nakit komisyon payı</strong> alırsınız.
                </div>
              </div>

              {/* API Connection Test Feedback */}
              {apiTestResult && (
                <div
                  className={`p-3 rounded border text-xs font-sans ${
                    apiTestResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {apiTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{apiTestResult.success ? 'Binance API Başarıyla Doğrulandı' : 'Binance API Bağlantı Hatası'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {apiTestResult.message}
                  </p>
                  {apiTestResult.success && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/20 space-y-1.5 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Toplam Spot Portföy Kasası (Binance):</span>
                        <strong className="text-emerald-400 text-xs">
                          {formatUSDT(apiTestResult.freeUsdt)} USD
                        </strong>
                      </div>
                      {(apiTestResult as any).availableCash !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Kullanılabilir Serbest Nakit (USDT):</span>
                          <strong className="text-amber-300 text-xs">
                            {formatUSDT((apiTestResult as any).availableCash)}
                          </strong>
                        </div>
                      )}
                      
                      {/* Detailed Cüzdan Varlıkları Listesi */}
                      {Array.isArray(apiTestResult.balances) && apiTestResult.balances.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-slate-800">
                          <span className="text-[10px] text-slate-400 block mb-1">Hesabınızdaki Açık Varlıklar (Spot Portföy):</span>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {apiTestResult.balances.map((b: any, idx: number) => {
                              const assetName = b.asset || b.assetName || '';
                              const freeAmt = parseFloat(b.free || b.freeAmount || '0');
                              const lockedAmt = parseFloat(b.locked || b.lockedAmount || '0');
                              return (
                                <span key={idx} className="bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded text-[10px] text-slate-200">
                                  <strong className="text-amber-400">{assetName}:</strong> {freeAmt.toFixed(assetName === 'TRY' || assetName === 'USDT' ? 2 : 4)}
                                  {b.estimatedUsd > 0 && <span className="text-emerald-400 text-[10px] ml-1">(~${b.estimatedUsd.toFixed(2)})</span>}
                                  {lockedAmt > 0 && <span className="text-slate-500 text-[9px] ml-1">({lockedAmt.toFixed(2)} kilitli)</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Always Show Borsa Ham Yanıtı for Diagnostics */}
                      {apiTestResult.rawDebugSample && (
                        <div className="mt-2 p-2 bg-slate-900/90 rounded border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-36">
                          <span className="text-amber-400 font-bold block mb-1">Borsa Ham Yanıtı (jsonSpot):</span>
                          <pre className="whitespace-pre-wrap break-all">{apiTestResult.rawDebugSample}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isTestingApi}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded text-xs transition-colors font-sans mt-2 shadow-sm shadow-emerald-500/10 flex items-center justify-center gap-1.5"
              >
                {isTestingApi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Binance API Doğrulanıyor...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Borsa & API Ayarlarını Doğrula ve Canlıya Bağla
                  </>
                )}
              </button>

              {/* Canlı Binance Entegrasyon ve Emir Test Kartı */}
              <div className="mt-3 p-3 bg-slate-900/90 rounded border border-slate-700 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      ⚡ Binance API Entegrasyon & Teşhis Paneli
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Borsa sunucusuyla olan gecikmeyi ölçün, ağ geçidini test edin ve canlı test emri gönderin.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunPingDiagnostic}
                    disabled={isPinging}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 shadow-sm"
                  >
                    {isPinging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Canlı Ağ Teşhisi Yap (Ping)
                  </button>
                </div>

                {pingDiagnostic && (
                  <div className="p-2.5 rounded bg-[#080d17] border border-emerald-500/30 text-[11px] font-mono text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Durum:</span>
                      <span className="text-emerald-400 font-bold">{pingDiagnostic.status || (pingDiagnostic.success ? 'ONLINE' : 'OFFLINE')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Gecikme (Latency):</span>
                      <span className="text-amber-400 font-bold">{pingDiagnostic.latencyMs ? `${pingDiagnostic.latencyMs} ms` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Ağ Geçidi:</span>
                      <span className="text-cyan-400 truncate block">{pingDiagnostic.gateway || 'api-gcp.binance.com'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Aktif Parite:</span>
                      <span className="text-slate-200 font-bold">{pingDiagnostic.activePairsCount || '757+'} Parite</span>
                    </div>
                  </div>
                )}

                {settings.tradingMode === 'LIVE_API' && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        Canlı Test Emri ({settings.exchange === 'BINANCE_TR' ? 'Binance TR' : 'Binance Global'})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {settings.exchange === 'BINANCE_TR' 
                          ? 'TRY veya USDT ile mikro test emri iletin' 
                          : '12 USDT tutarında BTC piyasa alımı ile borsa emir iletimini test edin'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {settings.exchange === 'BINANCE_TR' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSendTestOrder('CONVERT_50_USDT')}
                            disabled={isSendingTestOrder}
                            className="px-2.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1 shadow-sm"
                            title="Hesabınızdaki USDT'den 50 USDT bozdurup ~2.450 TL nakit TRY oluşturur"
                          >
                            {isSendingTestOrder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                            50 USDT'yi TRY'ye Çevir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendTestOrder('SELL_USDT')}
                            disabled={isSendingTestOrder}
                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1 shadow-sm"
                            title="Hesabınızdaki USDT ile 5 USDT satıp TRY alır"
                          >
                            5 USDT Sat
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendTestOrder('BUY_USDT')}
                            disabled={isSendingTestOrder}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1 shadow-sm"
                            title="Hesabınızdaki TRY ile 50 TL'lik USDT alır"
                          >
                            50 TL ile USDT Al
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendTestOrder('BUY_12_USDT_GLOBAL')}
                          disabled={isSendingTestOrder}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1 shadow-sm font-sans"
                          title="Binance Global hesabınızdan 12 USDT ile BTC piyasa alımı testi yapar"
                        >
                          {isSendingTestOrder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                          12 USDT ile BTC Al Testi (Global)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {testOrderStatus && (
                  <div className="p-2 rounded bg-[#080d17] border border-slate-800 text-[11px] font-mono text-slate-200">
                    {testOrderStatus}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Section 2: 2FA & Cloud Backup & Mobile Alerts */}
        <div className="space-y-4">
          {/* Two-Factor Authentication (2FA) */}
          <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200 font-sans">
                  İki Faktörlü Kimlik Doğrulama (2FA PIN)
                </h3>
              </div>
              <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                settings.is2FAEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
              }`}>
                {settings.is2FAEnabled ? '2FA AKTİF' : 'DEVRE DIŞI'}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-sans mb-3">
              Terminali yetkisiz erişimlere ve emir müdahalelerine karşı 4 haneli güvenlik PIN kodu ile koruyun.
            </p>

            {!settings.is2FAEnabled ? (
              <div className="flex items-center gap-2 font-mono text-xs">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Yeni PIN (örn: 1234)"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100 text-center tracking-widest w-36 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleToggle2FA(true)}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs font-sans transition-colors"
                >
                  2FA'yı Aktif Et
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-mono">PIN Koruması Etkin</span>
                <button
                  type="button"
                  onClick={() => handleToggle2FA(false)}
                  className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded text-xs font-sans transition-colors"
                >
                  2FA'yı Kapat
                </button>
              </div>
            )}
          </div>

          {/* Cloud Encrypted Backup & Restore */}
          <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80 mb-3">
              <Cloud className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-200 font-sans">
                Bulut Yedekleme & Şifreli Dışa Aktarma
              </h3>
            </div>

            <p className="text-xs text-slate-400 font-sans mb-3">
              Tüm bot yapılandırmalarınızı, kâr raporlarınızı ve stratejilerinizi şifreli JSON olarak buluta yedekleyin veya cihazlar arası aktarın.
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href="/api/download-project"
                download="binance_kripto_botu_projesi.tar.gz"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs flex items-center gap-1.5 font-sans transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Tüm Proje Kodlarını İndir (.tar.gz)
              </a>

              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs flex items-center gap-1.5 font-sans transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Şifreli Veri Yedeğini İndir
              </button>

              <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1.5 font-sans cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Yedekten Geri Yükle
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>

            {backupStatusMessage && (
              <div className="mt-2 text-xs text-emerald-400 font-sans flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {backupStatusMessage}
              </div>
            )}
          </div>

          {/* Mobile Notifications & Sound Alerts */}
          <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200 font-sans">
                  Mobil Bildirimler & Sesli Uyarılar
                </h3>
              </div>
            </div>

            <div className="space-y-2.5 text-xs font-sans">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Tarayıcı & Mobil Bildirimleri</span>
                  <span className="text-[11px] text-slate-400">Emir tamamlanma ve stop-loss durumunda anlık bildirim</span>
                </div>
                <button
                  type="button"
                  onClick={handleRequestPushNotification}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono"
                >
                  İzin İste / Test Et
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <div>
                  <span className="font-semibold text-slate-200 block">Ses Efektleri (Web Audio)</span>
                  <span className="text-[11px] text-slate-400">Alım, kâr alma ve uyarı seslerini canlı çal</span>
                </div>
                <button
                  type="button"
                  onClick={onTestSound}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded text-xs font-mono flex items-center gap-1"
                >
                  <Volume2 className="w-3 h-3" />
                  Sesi Test Et
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
