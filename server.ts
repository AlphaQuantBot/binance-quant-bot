import { LiveTickerFeed, createMarketDataRouter } from './src/server/marketData';
import { createOperatorAuth } from './src/server/operatorAuth';
import { createCredentialVault, credentialStatus } from './src/server/credentialVault';
import { liveExecutionGuard, exchangeCooldownResponse } from './src/server/executionSafety';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const credentialVault = createCredentialVault(path.join(__dirname, '.server_credentials.enc'), process.env.APP_CREDENTIALS_KEY);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '16kb' }));
app.use('/api', createOperatorAuth({ passwordHash: process.env.APP_AUTH_PASSWORD_HASH, appUrl: process.env.APP_URL, production: process.env.NODE_ENV === 'production' }));

app.post(['/api/binance/order', '/api/binance/close-spot-position', '/api/binance/create-bnb-budget'], liveExecutionGuard);

let lastBalanceCache: { time: number; apiKey: string; exchange: string; data: any } | null = null;
let activeServerCredentials: { apiKey: string; secretKey: string; exchange: string; updatedAt: number; liveBalance?: number; availableCash?: number } | null = null;

// Real-time market cache populated by 24/7 WebSocket stream (0 REST weight)
let cachedTickersMap = new Map<string, any>();
let cachedTickers: any[] = [];
let lastTickersFetch = 0;
const liveTickerFeed = new LiveTickerFeed();
let websocketConnected = false;

// Secrets are encrypted on disk and never returned to the browser.
function getActiveCredentials() {
  try { activeServerCredentials = credentialVault.load(); }
  catch { activeServerCredentials = null; }
  return activeServerCredentials;
}
getActiveCredentials();
let symbolLotStepCache: Record<string, number> = {
  'BTCUSDT': 5,
  'ETHUSDT': 4,
  'SOLUSDT': 3,
  'BNBUSDT': 3,
  'DOGEUSDT': 0,
  'AVAXUSDT': 2,
  'LINKUSDT': 2,
  'NEARUSDT': 1,
  'SUIUSDT': 1,
  'PEPEUSDT': 0,
  'RENDERUSDT': 2,
  'INJUSDT': 2,
  'ARBUSDT': 1,
  'TIAUSDT': 1,
  'FETUSDT': 1,
  'APTUSDT': 2,
  'OPUSDT': 1,
  'KASUSDT': 0,
  'TAOUSDT': 3,
  'SEIUSDT': 1,
  'OGNUSDT': 0,
  'RLCUSDT': 1,
  'SOL_TRY': 3,
  'SUI_TRY': 1,
  'BTC_TRY': 5,
  'ETH_TRY': 4,
  'AVAX_TRY': 2,
  'PEPE_TRY': 0,
  'DOGE_TRY': 0,
  'FET_TRY': 1,
  'NEAR_TRY': 1,
  'LINK_TRY': 2,
  'TAO_TRY': 3,
  'USDT_TRY': 2
};

// Turkish translation for Binance API error codes so users get clear diagnostics
function translateBinanceError(code?: number, originalMsg?: string): string {
  if (code === -2015) {
    return 'Binance Anahtar / Borsa Uyuşmazlığı (Hata -2015): Girilen anahtar Binance TR anahtarı olabilir ve Binance Global üzerinde geçerli değildir (veya IP kısıtlamasına takılmıştır). FLUX, SOL, BTC gibi 750+ paritede canlı işlem için lütfen Binance Global (binance.com) API anahtarınızı tanımlayın.';
  }
  if (code === -2014) {
    return 'API Anahtarı formatı geçersiz. Lütfen anahtarınızı kopyalarken başında veya sonunda boşluk kalmadığından emin olun.';
  }
  if (code === -2010) {
    return 'Yetersiz bakiye: Hesabınızda emri gerçekleştirecek miktarda serbest USDT veya kripto varlık bulunmuyor.';
  }
  if (code === -1013) {
    return 'Emir miktarı borsa asgari işlem limitinin (MIN_NOTIONAL / LOT_SIZE) altında. Canlı işlem tutarı en az 10-15 USDT olmalıdır.';
  }
  if (code === -1102) {
    return 'Eksik veya geçersiz parametre: Borsa satış emirlerinde coin miktarını (quantity) şart koşmaktadır.';
  }
  if (code === -1021) {
    return 'Sunucu zaman damgası senkronizasyonu hatası (recvWindow).';
  }
  if (code === -1003 || (originalMsg && originalMsg.includes('banned until'))) {
    const match = originalMsg?.match(/until\s+(\d+)/);
    const secs = match ? Math.max(1, Math.round((parseInt(match[1], 10) - Date.now()) / 1000)) : 60;
    return `Borsa istek limiti (Rate Limit): Borsa IP geçici güvenlik bekleme süresinde (Kalan süre: ~${secs} saniye). Lütfen bekleyin, süre dolunca otomatik bağlanacaktır.`;
  }
  return originalMsg || 'Borsa emri reddetti.';
}

// Floor quantity to exact symbol stepSize decimals so it never rounds UP (preventing balance overspend or LOT_SIZE reject)
function floorLotQuantity(sym: string, rawQty: number): string {
  const cleanSym = sym.toUpperCase().replace('_', '');
  const decimals = symbolLotStepCache[cleanSym] !== undefined 
    ? symbolLotStepCache[cleanSym] 
    : (symbolLotStepCache[sym] !== undefined ? symbolLotStepCache[sym] : 2);
  const factor = Math.pow(10, decimals);
  // Slightly shrink by 0.998 to guarantee cash balance covers slippage and trading fees
  const safeQty = rawQty * 0.998;
  const floored = Math.floor(safeQty * factor) / factor;
  return floored.toFixed(decimals);
}

// Global IP rate limit cooldown tracker (dynamic, defaults to 0 when clear)
let ipBannedUntil = 0;

// Persistent known cost basis tracker for spot holdings to protect against selling at a loss
const COST_BASIS_FILE = './.cost_basis.json';
function loadCostBasis(): Record<string, number> {
  const defaults: Record<string, number> = {
    'ARPA': 0.01306,
    'AI': 0.02300,
    'ERA': 0.09530,
    'NIGHT': 0.05152,
    'OGN': 0.03716,
    'RLC': 1.15,
    'BNB': 685.0
  };
  try {
    if (fs.existsSync(COST_BASIS_FILE)) {
      const saved = JSON.parse(fs.readFileSync(COST_BASIS_FILE, 'utf8'));
      return { ...defaults, ...saved };
    }
  } catch {}
  return defaults;
}

const knownCostBasisCache: Record<string, number> = loadCostBasis();

function saveCostBasis() {
  try {
    fs.writeFileSync(COST_BASIS_FILE, JSON.stringify(knownCostBasisCache, null, 2), 'utf8');
  } catch {}
}

const defaultGlobalBaseUrls = [
  'https://api-gcp.binance.com',
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api.binance.me'
];

// Helper for Binance signed requests
function signBinanceQuery(queryString: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
}

// Helper to find the cost basis / last buy price of a coin
async function getLastBuyTradePrice(symbol: string, apiKey: string, secretKey: string): Promise<number | null> {
  const cleanSym = symbol.toUpperCase();
  const baseCoin = cleanSym.replace(/USDT$|TRY$/g, '');
  if (knownCostBasisCache[baseCoin] && knownCostBasisCache[baseCoin] > 0) {
    return knownCostBasisCache[baseCoin];
  }
  try {
    const timestamp = Date.now();
    const query = `symbol=${cleanSym}&timestamp=${timestamp}&recvWindow=10000`;
    const sig = signBinanceQuery(query, secretKey);
    for (const host of defaultGlobalBaseUrls) {
      try {
        const res = await fetch(`${host}/api/v3/myTrades?${query}&signature=${sig}`, {
          headers: { 'X-MBX-APIKEY': apiKey },
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const trades: any = await res.json();
          if (Array.isArray(trades) && trades.length > 0) {
            const buys = trades.filter((t: any) => t.isBuyer);
            if (buys.length > 0) {
              const lastBuy = buys[buys.length - 1];
              const p = parseFloat(lastBuy.price);
              if (p > 0) {
                knownCostBasisCache[baseCoin] = p;
                saveCostBasis();
                return p;
              }
            }
          }
        }
      } catch {}
    }
  } catch {}
  return knownCostBasisCache[baseCoin] || null;
}

// Helper to query available free balance of a given asset on Binance Global
async function getFreeAssetBalance(assetName: string, apiKey: string, secretKey: string, hosts: string[] = defaultGlobalBaseUrls): Promise<number | null> {
  const q = `timestamp=${Date.now()}&recvWindow=10000`;
  const sig = signBinanceQuery(q, secretKey);
  for (const h of hosts) {
    try {
      const resp = await fetch(`${h}/api/v3/account?${q}&signature=${sig}`, {
        headers: { 'X-MBX-APIKEY': apiKey },
        signal: AbortSignal.timeout(4000)
      });
      if (resp.ok) {
        const accData = await resp.json();
        if (Array.isArray(accData.balances)) {
          const item = accData.balances.find((b: any) => b.asset === assetName);
          if (item) return parseFloat(item.free) || 0;
        }
      }
    } catch {}
  }
  return null;
}

// 0.0 Get Binance TR Supported Symbols
app.get('/api/binance/symbols', async (_req: Request, res: Response) => {
  try {
    for (const host of ['https://www.binance.tr', 'https://trbinance.com']) {
      try {
        const r = await fetch(`${host}/open/v1/common/symbols`);
        const d: any = await r.json();
        if (d && d.data && Array.isArray(d.data.list)) {
          const syms = d.data.list.map((s: any) => s.symbol);
          return res.json({ success: true, count: syms.length, symbols: syms });
        }
      } catch {}
    }
    return res.status(500).json({ success: false, error: 'Could not fetch symbols' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// 0.08 Server-side API Credentials State (Preserves credentials across tab reloads)
app.get('/api/binance/config', (_req: Request, res: Response) => {
  try { return res.json(credentialStatus(credentialVault.load(), credentialVault.configured)); }
  catch { return res.status(503).json({ success: false, code: 'VAULT_UNAVAILABLE' }); }
});

app.post('/api/binance/config', (req: Request, res: Response) => {
  const { apiKey, secretKey, exchange } = req.body;
  if (!credentialVault.configured) return res.status(503).json({ success: false, code: 'VAULT_NOT_CONFIGURED' });
  try {
    if (!apiKey && !secretKey) {
      credentialVault.clear(); activeServerCredentials = null; lastBalanceCache = null;
      return res.json({ success: true, configured: false });
    }
    if (typeof apiKey !== 'string' || typeof secretKey !== 'string' || !apiKey.trim() || !secretKey.trim() || apiKey.length > 512 || secretKey.length > 512 || !['BINANCE', 'BINANCE_TR'].includes(exchange || 'BINANCE')) {
      return res.status(400).json({ success: false, code: 'INVALID_CREDENTIAL_INPUT' });
    }
    const next = { apiKey: apiKey.trim(), secretKey: secretKey.trim(), exchange: exchange || 'BINANCE', updatedAt: Date.now() };
    credentialVault.save(next); activeServerCredentials = next; lastBalanceCache = null;
    return res.json(credentialStatus(next, true));
  } catch { return res.status(503).json({ success: false, code: 'VAULT_UNAVAILABLE' }); }
});

// 0.09 Manual & Bot Vault Cash Synchronizer
app.post('/api/binance/sync-vault-cash', (req: Request, res: Response) => {
  const { availableCash, liveBalance } = req.body;
  const creds = getActiveCredentials();
  if (creds) {
    if (typeof availableCash === 'number' && availableCash >= 0) {
      creds.availableCash = availableCash;
    }
    if (typeof liveBalance === 'number' && liveBalance > 0) {
      creds.liveBalance = liveBalance;
    }
    try {
      credentialVault.save(creds);
    } catch {}
    lastBalanceCache = null;
    return res.json({ success: true, availableCash: creds.availableCash, liveBalance: creds.liveBalance });
  }
  return res.status(400).json({ success: false, error: 'Kayıtlı oturum bulunamadı' });
});

// 0. Live Binance & Binance TR Account Balance & Connection Test Endpoint
app.post('/api/binance/account', async (req: Request, res: Response) => {
  const creds = getActiveCredentials();
  let { apiKey, secretKey, exchange } = req.body;
  if ((!apiKey || !secretKey) && creds) {
    apiKey = creds.apiKey;
    secretKey = creds.secretKey;
    exchange = exchange || creds.exchange;
  }
  if (!apiKey || !secretKey) {
    return res.status(400).json({ success: false, message: 'API Key ve Secret Key gereklidir.' });
  }

  // Use cached balance if requested within last 15 seconds to prevent rate limiting
  const now = Date.now();
  const reqExchange = exchange || 'BINANCE';
  if (lastBalanceCache && lastBalanceCache.apiKey === apiKey && lastBalanceCache.exchange === reqExchange && (now - lastBalanceCache.time < 15000)) {
    return res.json(lastBalanceCache.data);
  }

  // If Binance IP rate limit cooldown is active, return verified dollar vault response without hammering borsa
  if (now < ipBannedUntil) {
    return res.status(503).json(exchangeCooldownResponse(ipBannedUntil, now));
  }

  const isBinanceTR = exchange === 'BINANCE_TR';
  const globalHosts = [
    'https://api.binance.com',
    'https://api-gcp.binance.com',
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api.binance.me'
  ];

  try {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}&recvWindow=10000`;
    const signature = signBinanceQuery(query, secretKey);

    let rawBalances: any[] = [];
    let canTrade = true;
    let rawDebugSample = '';
    let identifiedExchange = isBinanceTR ? 'BINANCE_TR' : 'BINANCE';

    if (isBinanceTR) {
      // 1. Try Binance TR endpoints
      const queryAsset = async (assetName: string) => {
        const q = `asset=${assetName}&timestamp=${Date.now()}&recvWindow=10000`;
        const sig = signBinanceQuery(q, secretKey);
        const headers = {
          'X-MBX-APIKEY': apiKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        };

        for (const host of ['https://www.binance.tr', 'https://trbinance.com']) {
          try {
            const resp = await fetch(`${host}/open/v1/account/spot/asset?${q}&signature=${sig}`, {
              method: 'GET',
              headers,
              signal: AbortSignal.timeout(4000)
            });
            const txt = await resp.text();
            let j: any = {};
            try { j = JSON.parse(txt); } catch {}
            if (txt && txt.length > 5 && (j.code === 0 || j.data)) {
              return { text: txt, json: j };
            }
          } catch {}
        }
        return { text: '', json: {} };
      };

      const [usdtRes, tryRes, btcRes] = await Promise.all([
        queryAsset('USDT'),
        queryAsset('TRY'),
        queryAsset('BTC')
      ]);

      const parseAssetData = (res: any, name: string) => {
        const d = res.json?.data || res.json;
        if (d && (d.free !== undefined || d.freeAmount !== undefined || d.locked !== undefined)) {
          return {
            asset: name,
            free: parseFloat(d.free || d.freeAmount || '0') || 0,
            locked: parseFloat(d.locked || d.lockedAmount || '0') || 0
          };
        }
        return null;
      };

      const parsedUsdt = parseAssetData(usdtRes, 'USDT');
      const parsedTry = parseAssetData(tryRes, 'TRY');
      const parsedBtc = parseAssetData(btcRes, 'BTC');

      if (parsedUsdt) rawBalances.push(parsedUsdt);
      if (parsedTry) rawBalances.push(parsedTry);
      if (parsedBtc) rawBalances.push(parsedBtc);

      // If Binance TR was blocked (e.g. CloudFront 429) or empty, seamlessly test Binance Global hosts!
      if (rawBalances.length === 0) {
        for (const gHost of globalHosts) {
          try {
            const gResp = await fetch(`${gHost}/api/v3/account?${query}&signature=${signature}`, {
              method: 'GET',
              headers: {
                'X-MBX-APIKEY': apiKey,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json'
              },
              signal: AbortSignal.timeout(5000)
            });
            const gText = await gResp.text();
            let gJson: any = {};
            try { gJson = JSON.parse(gText); } catch {}
            if (gResp.ok && gJson && Array.isArray(gJson.balances)) {
              rawBalances = gJson.balances;
              canTrade = !!gJson.canTrade;
              rawDebugSample = 'Binance Global bağlantısı başarılı: ' + gText.slice(0, 100);
              identifiedExchange = 'BINANCE';
              break;
            }
          } catch {}
        }
      }
    } else {
      // Binance Global (/api/v3/account) with resilient failover
      let successFetch = false;
      for (const gHost of globalHosts) {
        try {
          const response = await fetch(`${gHost}/api/v3/account?${query}&signature=${signature}`, {
            method: 'GET',
            headers: {
              'X-MBX-APIKEY': apiKey,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
          });
          const rawText = await response.text();
          rawDebugSample = rawText.slice(0, 300);
          let data: any = {};
          try { data = JSON.parse(rawText); } catch {}
          if (response.ok && Array.isArray(data.balances)) {
            canTrade = !!data.canTrade;
            rawBalances = data.balances;
            successFetch = true;
            break;
          } else if (data.msg) {
            if (response.status === 418 || data.code === -1003) {
              ipBannedUntil = Date.now() + 60000;
              return res.status(503).json(exchangeCooldownResponse(ipBannedUntil));
            }
            return res.status(400).json({
              success: false,
              error: translateBinanceError(data.code, data.msg),
              code: data.code
            });
          }
        } catch {}
      }

      if (!successFetch && rawBalances.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Binance sunucularına bağlanılamadı veya API anahtarı geçersiz. Lütfen anahtarınızı ve Spot Al-Sat izinlerinizi kontrol edin.'
        });
      }
    }

    const balances = rawBalances.map((b: any) => ({
      asset: (b.asset || b.assetName || b.coin || b.currency || '').toUpperCase(),
      free: parseFloat(b.free || b.freeAmount || b.available || b.availableAmount || '0'),
      locked: parseFloat(b.locked || b.lockedAmount || b.freeze || b.freezeAmount || '0')
    })).filter((b: any) => b.free > 0 || b.locked > 0);
    
    // Calculate BNB discount status
    const bnbAsset = balances.find((b: any) => b.asset === 'BNB');
    const freeBnb = bnbAsset ? (typeof bnbAsset.free === 'number' ? bnbAsset.free : parseFloat(bnbAsset.free) || 0) : 0;
    const bnbPair = cachedTickersMap.get('BNBUSDT') || cachedTickers.find(t => t.symbol === 'BNBUSDT');
    const bnbPrice = bnbPair ? (parseFloat(bnbPair.lastPrice) || 685.2) : 685.2;
    const bnbUsdValue = parseFloat((freeBnb * bnbPrice).toFixed(2));
    const bnbDiscountActive = bnbUsdValue >= 0.50; // Holding >= $0.50 BNB activates 25% fee discount
    const roundTripFeeRate = bnbDiscountActive ? 0.0015 : 0.0020;
    const roundTripFeePercent = bnbDiscountActive ? 0.15 : 0.20;

    // Detailed balances with estimated USD values and trade cost basis for each coin (0 REST weight)
    const detailedBalances = balances.map((b: any) => {
      let estimatedUsd = 0;
      let currentPrice = 0;
      let entryPrice: number | undefined = undefined;
      const tot = b.free + b.locked;
      const sym = `${b.asset}USDT`;
      const pair = cachedTickersMap.get(sym) || cachedTickers.find(t => t.symbol === sym);
      if (pair) {
        currentPrice = parseFloat(pair.lastPrice) || 0;
      }

      if (b.asset === 'USDT' || b.asset === 'USD' || ['USDC', 'FDUSD', 'BUSD'].includes(b.asset)) {
        estimatedUsd = tot;
        currentPrice = 1.0;
        entryPrice = 1.0;
      } else if (currentPrice > 0) {
        estimatedUsd = tot * currentPrice;
        entryPrice = knownCostBasisCache[b.asset] || (b.entryPrice ? b.entryPrice : undefined);
      } else {
        // Resilient fallback pricing for known wallet coins
        if (knownCostBasisCache[b.asset]) {
          currentPrice = knownCostBasisCache[b.asset];
          estimatedUsd = tot * currentPrice;
          entryPrice = knownCostBasisCache[b.asset];
        } else if (b.asset === 'BNB') {
          currentPrice = bnbPrice;
          estimatedUsd = tot * currentPrice;
          entryPrice = knownCostBasisCache['BNB'] || 680;
        }
      }

      let unrealizedPnl: number | undefined = undefined;
      let unrealizedPnlPercent: number | undefined = undefined;
      let netPnl: number | undefined = undefined;
      let netPnlPercent: number | undefined = undefined;

      if (entryPrice && entryPrice > 0 && currentPrice > 0 && b.asset !== 'USDT') {
        unrealizedPnl = parseFloat(((currentPrice - entryPrice) * b.free).toFixed(2));
        unrealizedPnlPercent = parseFloat((((currentPrice - entryPrice) / entryPrice) * 100).toFixed(2));
        const roundTripFee = parseFloat((b.free * currentPrice * roundTripFeeRate).toFixed(4));
        netPnl = parseFloat((unrealizedPnl - roundTripFee).toFixed(2));
        netPnlPercent = parseFloat((unrealizedPnlPercent - roundTripFeePercent).toFixed(2));
      }

      return {
        ...b,
        symbol: sym,
        currentPrice: currentPrice > 0 ? currentPrice : undefined,
        entryPrice,
        unrealizedPnl,
        unrealizedPnlPercent,
        netPnl,
        netPnlPercent,
        estimatedUsd: Math.round(estimatedUsd * 100) / 100
      };
    });

    // Look for USDT or TRY
    const usdtAsset = balances.find((b: any) => b.asset === 'USDT');
    const tryAsset = balances.find((b: any) => b.asset === 'TRY');
    const usdtFree = usdtAsset ? usdtAsset.free : 0;
    const freeTry = tryAsset ? tryAsset.free : 0;

    // Calculate total estimated spot portfolio value directly from all detailed balances
    const calculatedTotalUsd = detailedBalances.reduce((sum: number, b: any) => sum + (b.estimatedUsd || 0), 0);
    const openPositionsUsd = detailedBalances
      .filter((b: any) => b.asset !== 'USDT' && b.asset !== 'TRY' && b.asset !== 'BNB')
      .reduce((sum: number, b: any) => sum + (b.estimatedUsd || 0), 0);
    const roundedTotalUsd = calculatedTotalUsd > 0 ? Math.round(calculatedTotalUsd * 100) / 100 : (usdtFree > 0 ? usdtFree : 0);

    const resultPayload = {
      success: true,
      canTrade,
      totalSpotVaultUsdt: roundedTotalUsd,
      liveSpotBalanceUsdt: roundedTotalUsd, // Primary total Binance vault
      freeUsdt: roundedTotalUsd, // Ensures vault matches total portfolio balance
      availableCashUsdt: usdtFree, // Pure liquid USDT cash
      openPositionsUsdt: Math.round(openPositionsUsd * 100) / 100,
      bnbVaultUsdt: bnbUsdValue,
      freeTry,
      isBinanceTR: identifiedExchange === 'BINANCE_TR',
      exchange: identifiedExchange,
      rawDebugSample,
      bnbBudget: {
        freeBnb,
        bnbPrice,
        bnbUsdValue,
        discountActive: bnbDiscountActive,
        discountRate: '0.075%',
        standardRate: '0.10%',
        estimatedTradesRemaining: Math.max(0, Math.floor(bnbUsdValue / 0.035)),
        totalSavedUsdt: Math.round((freeBnb * bnbPrice * 0.25) * 100) / 100
      },
      balances: detailedBalances
    };

    if (activeServerCredentials && activeServerCredentials.apiKey === apiKey) {
      activeServerCredentials.liveBalance = roundedTotalUsd;
      activeServerCredentials.availableCash = usdtFree;
      try {
        credentialVault.save(activeServerCredentials);
      } catch {}
    }

    lastBalanceCache = {
      time: Date.now(),
      apiKey,
      exchange: reqExchange,
      data: resultPayload
    };

    return res.json(resultPayload);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Borsa sunucularına erişilemedi.'
    });
  }
});

// 0.1 Live Binance & Binance TR Order Execution Endpoint with Multi-Route Redundancy
// Live mutation routes are registered once above with liveExecutionGuard.
// Unsafe legacy submit/retry/accounting handlers were removed.
// The durable execution engine is not connected to real credentials yet.

app.get('/api/binance/ip-status', (_req: Request, res: Response) => {
  const isBanned = Date.now() < ipBannedUntil;
  const remainingSec = isBanned ? Math.max(1, Math.round((ipBannedUntil - Date.now()) / 1000)) : 0;
  return res.json({
    success: true,
    isBanned,
    remainingSec,
    cachedTickersCount: cachedTickers.length,
    marketDataFresh: liveTickerFeed.snapshot().data.length > 0,
    websocketOnline: websocketConnected
  });
});

// Initialize Gemini Client
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
}) : null;

// Default top pairs watchlist
const DEFAULT_TOP_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT',
  'AVAXUSDT', 'LINKUSDT', 'NEARUSDT', 'SUIUSDT', 'PEPEUSDT',
  'RENDERUSDT', 'INJUSDT', 'ARBUSDT', 'TIAUSDT', 'FETUSDT',
  'APTUSDT', 'OPUSDT', 'KASUSDT', 'TAOUSDT', 'SEIUSDT', 'OGNUSDT'
];

// 24/7 Live Binance WebSocket Ticker Stream (Zero REST Rate-Limit Weight)
function startBinanceWebSocketStream() {
  try {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
    ws.onopen = () => { websocketConnected = true; };
    ws.onmessage = async (event) => {
      try {
        let text = '';
        if (typeof event.data === 'string') {
          text = event.data;
        } else if (event.data && typeof (event.data as any).text === 'function') {
          text = await (event.data as any).text();
        } else if (Buffer.isBuffer(event.data)) {
          text = (event.data as Buffer).toString('utf8');
        }
        if (!text) return;
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          const usdtList = data
            .filter((t: any) => t.s && t.s.endsWith('USDT'))
            .map((t: any) => {
              const open = parseFloat(t.o) || 1;
              const close = parseFloat(t.c) || 1;
              const chg = (((close - open) / open) * 100).toFixed(2);
              return {
                symbol: t.s,
                lastPrice: t.c,
                priceChangePercent: chg,
                highPrice: t.h,
                lowPrice: t.l,
                volume: t.v,
                quoteVolume: t.q,
              };
            });
          if (usdtList.length > 0) {
            liveTickerFeed.update(usdtList);
            for (const item of usdtList) {
              cachedTickersMap.set(item.symbol, item);
            }
            cachedTickers = Array.from(cachedTickersMap.values());
            lastTickersFetch = Date.now();
          }
        }
      } catch {}
    };
    ws.onerror = () => { websocketConnected = false; };
    ws.onclose = () => {
      websocketConnected = false;
      setTimeout(startBinanceWebSocketStream, 4000);
    };
  } catch {}
}
startBinanceWebSocketStream();

// Pre-seed all live Binance token prices so every single wallet coin is accurately valued immediately
async function seedAllBinancePrices() {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr', { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const allPrices = await res.json();
      if (Array.isArray(allPrices)) {
        liveTickerFeed.update(allPrices);
        for (const p of allPrices) {
          if (p.symbol && p.lastPrice) {
            const existing = cachedTickersMap.get(p.symbol);
            if (existing) {
              existing.lastPrice = p.lastPrice;
            } else {
              cachedTickersMap.set(p.symbol, {
                symbol: p.symbol,
                lastPrice: p.lastPrice,
                priceChangePercent: p.priceChangePercent,
                highPrice: p.highPrice,
                lowPrice: p.lowPrice,
                volume: p.volume,
                quoteVolume: p.quoteVolume
              });
            }
          }
        }
        cachedTickers = Array.from(cachedTickersMap.values());
      }
    }
  } catch {}
}
seedAllBinancePrices();
setInterval(seedAllBinancePrices, 60000);

// Market data never fabricates prices when upstream is unavailable.
app.use('/api/binance', createMarketDataRouter(liveTickerFeed, async (symbol, interval, limit) => {
  if (Date.now() < ipBannedUntil) throw new Error('Exchange cooldown');
  for (const host of ['https://api-gcp.binance.com', 'https://api.binance.com']) {
    try {
      const response = await fetch(`${host}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, { signal: AbortSignal.timeout(3500) });
      if (response.ok) return await response.json();
    } catch {}
  }
  throw new Error('Market data unavailable');
}));

// 3. Early Gem Radar (Pre-Binance / Listing candidates scanner)
app.get('/api/gems/radar', (_req: Request, res: Response) => {
  const earlyGems = [
    {
      id: 'gem-1',
      symbol: 'AURA',
      name: 'Aura Protocol',
      network: 'Solana',
      dex: 'Raydium',
      currentPrice: 0.0428,
      change24h: 34.6,
      volume24h: 2450000,
      liquidity: 1850000,
      liquidityLockedPercent: 100,
      holdersCount: 14200,
      listingProbability: 88, // %
      auditStatus: 'Passed (CertiK)',
      honeypotRisk: 'Zero',
      aiCatalystScore: 92,
      predictedBinanceMultiplier: '3.5x - 5.0x',
      catalyst: 'Tier-1 exchange deposit addresses detected on-chain & massive whale accumulation.',
      tags: ['AI Agent', 'Solana Ecosystem', 'High Liquidity']
    },
    {
      id: 'gem-2',
      symbol: 'NEURAL',
      name: 'NeuralChain ZK',
      network: 'Base',
      dex: 'Aerodrome',
      currentPrice: 1.15,
      change24h: 52.1,
      volume24h: 6800000,
      liquidity: 3200000,
      liquidityLockedPercent: 98,
      holdersCount: 22800,
      listingProbability: 94,
      auditStatus: 'Passed (OpenZeppelin)',
      honeypotRisk: 'Zero',
      aiCatalystScore: 95,
      predictedBinanceMultiplier: '4.0x - 8.2x',
      catalyst: 'Binance Labs seed incubator portfolio asset, GitHub code commits up 400% this week.',
      tags: ['ZK-Rollup', 'DePIN', 'Binance Labs Portfolio']
    },
    {
      id: 'gem-3',
      symbol: 'VORTEX',
      name: 'Vortex DEX',
      network: 'Sui',
      dex: 'Cetus',
      currentPrice: 0.185,
      change24h: 21.4,
      volume24h: 1750000,
      liquidity: 980000,
      liquidityLockedPercent: 95,
      holdersCount: 8900,
      listingProbability: 79,
      auditStatus: 'Passed (Kudelski)',
      honeypotRisk: 'Zero',
      aiCatalystScore: 84,
      predictedBinanceMultiplier: '2.5x - 4.2x',
      catalyst: 'Sui Foundation official grant winner; volume surge preceding major testnet upgrade.',
      tags: ['DEX', 'Sui Ecosystem', 'High APR']
    },
    {
      id: 'gem-4',
      symbol: 'HYPER',
      name: 'HyperDrive AI',
      network: 'Ethereum',
      dex: 'Uniswap v3',
      currentPrice: 0.089,
      change24h: -4.2,
      volume24h: 1200000,
      liquidity: 1450000,
      liquidityLockedPercent: 100,
      holdersCount: 11400,
      listingProbability: 82,
      auditStatus: 'Passed (Hacken)',
      honeypotRisk: 'Zero',
      aiCatalystScore: 88,
      predictedBinanceMultiplier: '3.0x - 6.0x',
      catalyst: 'Dip-buying zone before roadmap announcement; top 10 wallets holding 45% of circulating supply locked.',
      tags: ['GPU Compute', 'AI Infrastructure', 'Zero Tax']
    },
    {
      id: 'gem-5',
      symbol: 'QUANTUM',
      name: 'Quantum Security Mesh',
      network: 'Arbitrum',
      dex: 'Camelot',
      currentPrice: 0.342,
      change24h: 41.8,
      volume24h: 3100000,
      liquidity: 2100000,
      liquidityLockedPercent: 97,
      holdersCount: 16500,
      listingProbability: 86,
      auditStatus: 'Passed (Halborn)',
      honeypotRisk: 'Zero',
      aiCatalystScore: 89,
      predictedBinanceMultiplier: '3.2x - 5.8x',
      catalyst: 'Post-quantum cryptographic smart contract layer, massive testnet volume surge.',
      tags: ['Security', 'Layer 2', 'Whale Inflows']
    }
  ];

  res.json({ success: true, count: earlyGems.length, data: earlyGems, provenance: { source: 'DEMO', verified: false } });
});

// 4. Gemini AI Market Predictor Endpoint
app.post('/api/ai/predict', async (req: Request, res: Response) => {
  const { symbol, currentPrice, priceChange24h, high24h, low24h, volume24h, indicators, timeframe } = req.body;

  const symbolSafe = symbol || 'BTCUSDT';
  const priceSafe = currentPrice || 94000;

  const prompt = `Sen profesyonel ve son derece karlı bir Binance Kripto Para Alım-Satım Botunun Kıdemli Kantitatif Analiz Motorusun.
Aşağıdaki gerçek zamanlı piyasa verilerini ve teknik göstergeleri inceleyerek Türk yatırımcı için en yüksek doğruluklu fiyat tahminleme ve alım-satım kararını üret.

Sembol: ${symbolSafe}
Zaman Dilimi: ${timeframe || '15m'}
Mevcut Fiyat: ${priceSafe} USDT
24s Değişim: %${priceChange24h || 0}
24s En Yüksek: ${high24h || priceSafe * 1.03} USDT
24s En Düşük: ${low24h || priceSafe * 0.97} USDT
24s Hacim: ${volume24h || 'N/A'} USDT
Teknik Göstergeler:
- RSI (14): ${indicators?.rsi ?? 'N/A'}
- MACD Durumu: ${indicators?.macd || 'N/A'}
- Bollinger Bandı Konumu: ${indicators?.bbPosition || 'N/A'}
- Trend Yönü: ${indicators?.trend || 'Yukarı'}
- Emir Defteri Alıcı/Satıcı Baskısı: %${indicators?.orderBookBias ?? 'N/A'} Alıcı Baskısı

Aşağıdaki JSON şemasında yanıt ver:
{
  "signal": "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL",
  "confidenceScore": number (50 - 99 arası yüzde),
  "targetPriceShortTerm": number (kısa vade kar alma hedefi),
  "targetPriceMidTerm": number (orta vade kar alma hedefi),
  "stopLossPrice": number (risk yönetimi için kesin stop loss),
  "suggestedTakeProfitPercent": number (yüzde cinsinden örn: 4.8),
  "suggestedStopLossPercent": number (yüzde cinsinden örn: 1.8),
  "riskRewardRatio": string (örn: "1:2.8"),
  "marketRegime": "Trending Bull" | "Range-Bound" | "High Volatility" | "Bearish Distribution",
  "recommendedPositionSizePercent": number (kasa riskine göre önerilen portföy payı %1-%25),
  "summaryAnalysis": string (kısa ve net Türkçe açıklama),
  "keySupport": number,
  "keyResistance": number,
  "actionSteps": string[] (botun otomatik yapması gereken 3 somut adım)
}`;

  try {
    const response = await ai!.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2, // Low temperature for consistent quantitative financial reasoning
      },
    });

    const responseText = response.text || '{}';
    const parsedData = JSON.parse(responseText.trim());
    return res.json({ success: true, symbol: symbolSafe, result: parsedData, provenance: { source: 'GEMINI_MODEL', verified: false } });
  } catch {
    return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', result: null });
  }
});

// 5. Gemini AI Strategy Optimizer
app.post('/api/ai/optimize-strategy', async (req: Request, res: Response) => {
  const { botStrategy, riskProfile, currentWinRate, totalTrades, maxDrawdown } = req.body;

  const prompt = `Bir otomatik kripto alım satım botu optimizasyon mimarısın.
Kullanıcı strateji parametreleri:
- Strateji Tipi: ${botStrategy || 'Grid & Scalping Hybrid'}
- Risk Profili: ${riskProfile || 'Dengeli/Büyüme'}
- Mevcut Başarı Oranı (Win Rate): %${currentWinRate || 68}
- Toplam İşlem: ${totalTrades || 45}
- Maksimum Drawdown: %${maxDrawdown || 4.2}

Binance piyasasındaki son likidite ve volatilite yapısına göre botun kârlılığını maksimize edecek, zararları minimize edecek optimize edilmiş bot ayarlarını JSON olarak üret:
{
  "strategyName": string,
  "recommendedTrailingStop": number (yüzde),
  "recommendedTakeProfit": number (yüzde),
  "recommendedLeverage": number (1-10x, spot ise 1x),
  "dcaMultiplier": number (örn: 1.5),
  "maxOpenPositions": number,
  "cooldownMinutesBetweenTrades": number,
  "expectedProfitIncreasePercent": string (örn: "+18.5% net kâr artışı"),
  "riskAssessment": string (Türkçe açıklama),
  "rules": string[]
}`;

  try {
    const response = await ai!.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json({ success: true, result: parsed, provenance: { source: 'GEMINI_MODEL', verified: false } });
  } catch {
    return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', result: null });
  }
});

let cachedAlphaResult: any = null;
let lastAlphaScanTime = 0;

// 6. Dahi Hacker & Alpha Token Haber / Balina İstihbarat Radarı
app.get('/api/ai/alpha-scanner', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (cachedAlphaResult && now - lastAlphaScanTime < 45000) {
    return res.json({ success: true, data: cachedAlphaResult, cached: true, timestamp: lastAlphaScanTime, provenance: { source: 'GEMINI_MODEL', verified: false } });
  }

  const prompt = `Sen elit seviyede bir gün içi (day trading / intraday scalper) algoritmik trader ve blockchain istihbarat hacker'ısın.
Amacımız: Uzun vadeli beklemek DEĞİL; gün içinde hızlı al-sat yaparak, Binance komisyonlarını (alış %0.10 + satış %0.10 = %0.20 toplam) düşerek NET kâr ile nakde dönmek ve sermayeyi gün içinde hızla döndürmektir.
Binance'de en yüksek gün içi oynaklığa (volatiliteye) ve anlık balina likidite akışına sahip coinleri (örn: SOLUSDT, SUIUSDT, PEPEUSDT, BTCUSDT, AVAXUSDT, NEARUSDT, DOGEUSDT, LINKUSDT, FETUSDT) tara.
Gün içi scalp hedefleri (%1.2 ile %4.8 arası brüt) ve Binance komisyonları sonrası kesin pozitif NET kârı hedefle.

Her bir fırsat için:
1. symbol: Coin çifti (örn: SOLUSDT, SUIUSDT, PEPEUSDT, BTCUSDT, AVAXUSDT vb.)
2. tokenName: Token adı
3. alphaHeadline: Gün içi fiyatı sıçratan sıcak haber/sızıntı veya balina giriş sinyali
4. source: İstihbarat kaynağı (örn: "Balina Hacim Sızıntısı", "Binance Spot Emir Anomalisi", "DEX Hacim Patlaması", "X/Twitter Alpha Momentumu")
5. sentimentScore: 78-99 arası yüksek bullish puanı
6. tradeAction: "HIZLI_SCALP_AL" | "GÜN_İÇİ_MOMENTUM" | "KIRILIM_TAKİBİ"
7. expectedReturnPercent: Gün içi net kâr hedefi (örn: "+%2.6 Net (+%2.8 Brüt)", "+%3.4 Net (+%3.6 Brüt)")
8. rationale: Gün içi al-sat mantığı ve komisyon sonrası net getiri gerekçesi
9. recommendedStopLoss: Sıkı gün içi risk koruması (%1.0 - %1.8 arası)
10. priority: "CRITICAL_ALPHA" | "HIGH_YIELD" | "WHALE_ACCUMULATION"

Şu JSON şemasında yanıt ver:
{
  "scannerStatus": "MODEL_GENERATED_UNVERIFIED",
  "globalMarketMood": "GÜN_İÇİ_SCALP_MOMENTUMU",
  "hackerAnalysis": "Gün içi al-sat likiditesi, Binance komisyonları ve balina girişlerinin kısa vadeli kâr analizi (Türkçe)",
  "opportunities": [
    {
      "symbol": string,
      "tokenName": string,
      "alphaHeadline": string,
      "source": string,
      "sentimentScore": number,
      "tradeAction": string,
      "expectedReturnPercent": string,
      "rationale": string,
      "recommendedStopLoss": number,
      "priority": string
    }
  ]
}`;

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', data: null });
    }

    const aiPromise = ai!.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 3500));
    const response: any = await Promise.race([aiPromise, timeoutPromise]);

    const parsed = JSON.parse(response.text?.trim() || '{}');
    if (parsed && Array.isArray(parsed.opportunities) && parsed.opportunities.length > 0) {
      cachedAlphaResult = parsed;
      lastAlphaScanTime = now;
      return res.json({ success: true, data: parsed, timestamp: now, provenance: { source: 'GEMINI_MODEL', verified: false } });
    }

    return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', data: null });
  } catch {
    return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', data: null });
  }
});

// Direct Project Zip Download Endpoint
app.get('/api/download-project', (_req: Request, res: Response) => {
  const filePath = path.resolve(__dirname, 'public', 'binance_bot_project.tar.gz');
  res.download(filePath, 'binance_kripto_botu_projesi.tar.gz', (err) => {
    if (err) {
      console.error('Download error:', err);
      res.status(500).send('Dosya indirilemedi.');
    }
  });
});

// Ensure any unhandled /api/* request ALWAYS returns JSON, never HTML
app.all('/api/*', (_req: Request, res: Response) => {
  return res.status(404).json({ success: false, error: 'API endpoint bulunamadı' });
});

// Setup Vite in Dev or Static in Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Crypto Trading Bot server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

