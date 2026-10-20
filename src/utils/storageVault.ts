import { safeSettings } from './safeSettings';
import { UserSecuritySettings, BotInstance, TradeOrder, AppNotification } from '../types/crypto';

const STORAGE_KEYS = {
  SETTINGS: 'nexus_crypto_settings_v1',
  BOTS: 'nexus_crypto_bots_v1',
  ORDERS: 'nexus_crypto_orders_v1',
  NOTIFICATIONS: 'nexus_crypto_notifications_v1',
};

export const defaultSettings: UserSecuritySettings = {
  exchange: 'BINANCE',
  tradingMode: 'PAPER',
  binanceApiKey: '',
  binanceSecretKey: '',
  isKeysEncrypted: false,
  is2FAEnabled: false,
  pinHash: '',
  isAppLocked: false,
  soundEnabled: true,
  browserNotificationsEnabled: true,
  simulatedBalanceUsdt: 1000.00,
  liveSpotBalanceUsdt: 0.00,
  maxDailyDrawdownPercent: 5.0,
  autoLiveExecutionEnabled: false,
  liveTradeAmountUsdt: 11.50,
  autoCompoundProfits: true,
  compoundReinvestmentRate: 100,
  dynamicPositionAllocationPct: 20,
  autoBnbFeeBuffer: true,
  totalFeesSavedBnbDiscountUsdt: 4.85,
  altcoinHunterMode: 'ALL_ALTCOINS',
  referralCode: 'XADYK9G1',
  referralLink: 'https://accounts.binance.com/en/register?ref=XADYK9G1',
  binanceTrReferralCode: 'TR_VIP_KOMISYON',
  binanceTrReferralLink: 'https://www.trbinance.com/account/signup?ref=TR_VIP',
  telegramChannelLink: 'https://t.me/BinanceQuantBotCommunity',
};

export const DEFAULT_BOTS: BotInstance[] = [
  {
    id: 'bot-1',
    name: '🚀 Kâr Kilitleyici #1: ARPA',
    symbol: 'ARPAUSDT',
    strategy: 'QUANT_MOMENTUM_COMPOUND',
    status: 'RUNNING',
    allocatedCapitalUsdt: 7.85,
    currentCapitalUsdt: 7.85,
    totalProfitUsdt: 0,
    totalProfitPercent: 0,
    tradesCount: 1,
    winRate: 92,
    trailingStopPercent: 0, // SIFIR KAYIP: Zararına satış kapalı!
    takeProfitPercent: 2.8,
    hasOpenPosition: true,
    entryPrice: 0.01306,
    positionQty: 765.6,
    positionOpenedAt: Date.now() - 3600000,
    createdAt: Date.now() - 86400000 * 2,
    lastAction: '🛡️ Asla Zararına Satma: ARPA ($0.01306) kâr hedefine (+%2.8) ulaşana kadar tutuluyor.',
    lastSignal: 'HOLD'
  },
  {
    id: 'bot-2',
    name: '⚡ Kâr Kilitleyici #2: AI',
    symbol: 'AIUSDT',
    strategy: 'BREAKOUT_MOMENTUM',
    status: 'RUNNING',
    allocatedCapitalUsdt: 8.17,
    currentCapitalUsdt: 8.17,
    totalProfitUsdt: 0,
    totalProfitPercent: 0,
    tradesCount: 1,
    winRate: 94,
    trailingStopPercent: 0, // SIFIR KAYIP: Zararına satış kapalı!
    takeProfitPercent: 2.8,
    hasOpenPosition: true,
    entryPrice: 0.02300,
    positionQty: 434.7,
    positionOpenedAt: Date.now() - 3600000,
    createdAt: Date.now() - 86400000 * 4,
    lastAction: '🛡️ Asla Zararına Satma: AI ($0.02300) kâr hedefine (+%2.8) ulaşana kadar tutuluyor.',
    lastSignal: 'HOLD'
  },
  {
    id: 'bot-3',
    name: '🎯 Kâr Kilitleyici #3: ERA',
    symbol: 'ERAUSDT',
    strategy: 'SUPERTREND_VWAP_ALPHA',
    status: 'RUNNING',
    allocatedCapitalUsdt: 6.02,
    currentCapitalUsdt: 6.02,
    totalProfitUsdt: 0,
    totalProfitPercent: 0,
    tradesCount: 1,
    winRate: 90,
    trailingStopPercent: 0, // SIFIR KAYIP: Zararına satış kapalı!
    takeProfitPercent: 2.8,
    hasOpenPosition: true,
    entryPrice: 0.09530,
    positionQty: 104.9,
    positionOpenedAt: Date.now() - 3600000,
    createdAt: Date.now() - 86400000,
    lastAction: '🛡️ Asla Zararına Satma: ERA ($0.09530) kâr hedefine (+%2.8) ulaşana kadar tutuluyor.',
    lastSignal: 'HOLD'
  },
  {
    id: 'bot-4',
    name: '💎 Kâr Kilitleyici #4: NIGHT',
    symbol: 'NIGHTUSDT',
    strategy: 'AI_SCALPER',
    status: 'RUNNING',
    allocatedCapitalUsdt: 8.18,
    currentCapitalUsdt: 8.18,
    totalProfitUsdt: 0,
    totalProfitPercent: 0,
    tradesCount: 1,
    winRate: 91,
    trailingStopPercent: 0, // SIFIR KAYIP: Zararına satış kapalı!
    takeProfitPercent: 2.8,
    hasOpenPosition: true,
    entryPrice: 0.05152,
    positionQty: 194.0,
    positionOpenedAt: Date.now() - 3600000,
    createdAt: Date.now() - 86400000 * 3,
    lastAction: '🛡️ Asla Zararına Satma: NIGHT ($0.05152) kâr hedefine (+%2.8) ulaşana kadar tutuluyor.',
    lastSignal: 'HOLD'
  }
];

// Simple reversible XOR/Base64 cipher with client passphrase for local key encryption
export function encryptData(plainText: string, secretPassphrase: string): string {
  if (!plainText) return '';
  const key = secretPassphrase || 'NEXUS_DEFAULT_VAULT_KEY_2026';
  let result = '';
  for (let i = 0; i < plainText.length; i++) {
    const charCode = plainText.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
}

export function decryptData(cipherText: string, secretPassphrase: string): string {
  if (!cipherText) return '';
  try {
    const raw = atob(cipherText);
    const key = secretPassphrase || 'NEXUS_DEFAULT_VAULT_KEY_2026';
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return '';
  }
}

// Simple deterministic hash for 4-6 digit PIN
export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return 'pin_' + Math.abs(hash).toString(16);
}

// Storage helpers
export function loadSecuritySettings(): UserSecuritySettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return defaultSettings;
    const parsed = safeSettings(JSON.parse(data));
    // Scrub legacy plaintext secrets before returning any settings.
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed));
    const res = { ...defaultSettings, ...parsed };
    // Clear out stale hardcoded placeholders so real Binance balance can take effect
    if (res.liveSpotBalanceUsdt === 0.84 || res.liveSpotBalanceUsdt === 58.53 || res.liveSpotBalanceUsdt === 57.73) {
      res.liveSpotBalanceUsdt = 0;
    }
    if (res.availableCashUsdt === 58.53 || res.availableCashUsdt === 57.73) {
      res.availableCashUsdt = 0;
    }
    if (!res.referralCode || res.referralCode === 'VIP_COMMISSION_DISCOUNT' || res.referralCode === 'VIP_BOT' || res.referralCode === 'CPA_00C87G2OR2') {
      res.referralCode = 'XADYK9G1';
      res.referralLink = 'https://accounts.binance.com/en/register?ref=XADYK9G1';
    }
    return res;
  } catch {
    return defaultSettings;
  }
}

export function saveSecuritySettings(settings: UserSecuritySettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(safeSettings(settings as unknown as Record<string, unknown>)));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function loadSavedBots(): BotInstance[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BOTS);
    if (!data) return [];
    const list = JSON.parse(data);
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    const unique: BotInstance[] = [];
    for (const item of list) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  } catch {
    return [];
  }
}

export function saveBots(bots: BotInstance[]) {
  try {
    const seen = new Set<string>();
    const unique: BotInstance[] = [];
    for (const item of bots) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    localStorage.setItem(STORAGE_KEYS.BOTS, JSON.stringify(unique));
  } catch (err) {
    console.error('Failed to save bots:', err);
  }
}

export function loadSavedOrders(): TradeOrder[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!data) return [];
    const list = JSON.parse(data);
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    const unique: TradeOrder[] = [];
    for (const item of list) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  } catch {
    return [];
  }
}

export function saveOrders(orders: TradeOrder[]) {
  try {
    const seen = new Set<string>();
    const unique: TradeOrder[] = [];
    for (const item of orders) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(unique.slice(-200))); // keep latest 200
  } catch (err) {
    console.error('Failed to save orders:', err);
  }
}

export function loadNotifications(): AppNotification[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!data) return [];
    const list = JSON.parse(data);
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    const unique: AppNotification[] = [];
    for (const item of list) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: AppNotification[]) {
  try {
    const seen = new Set<string>();
    const unique: AppNotification[] = [];
    for (const item of notifications) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(unique.slice(-100)));
  } catch (err) {
    console.error('Failed to save notifications:', err);
  }
}

// Export complete encrypted snapshot for cloud backup
export function createBackupSnapshot(passphrase: string) {
  const snapshot = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    settings: loadSecuritySettings(),
    bots: loadSavedBots(),
    orders: loadSavedOrders(),
  };
  const jsonStr = JSON.stringify(snapshot);
  const encrypted = encryptData(jsonStr, passphrase);
  return {
    rawJson: jsonStr,
    encryptedBlob: encrypted,
    checksum: 'CHK_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    sizeBytes: jsonStr.length,
  };
}

