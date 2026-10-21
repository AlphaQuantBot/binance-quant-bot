/** Allowlist persisted preferences so credentials and future secret fields cannot enter storage. */
const allowed = new Set([
  'exchange', 'language', 'tradingMode', 'is2FAEnabled', 'pinHash', 'isAppLocked',
  'soundEnabled', 'browserNotificationsEnabled', 'simulatedBalanceUsdt', 'liveSpotBalanceUsdt',
  'liveSpotBalanceTry', 'availableCashUsdt', 'maxDailyDrawdownPercent', 'liveTradeAmountUsdt',
  'autoCompoundProfits', 'compoundReinvestmentRate', 'dynamicPositionAllocationPct',
  'autoBnbFeeBuffer', 'totalFeesSavedBnbDiscountUsdt', 'altcoinHunterMode', 'referralCode',
  'referralLink', 'binanceTrReferralCode', 'binanceTrReferralLink', 'telegramChannelLink',
]);
export function safeSettings(value: Record<string, unknown>) {
  const safe = Object.fromEntries(Object.entries(value).filter(([key]) => allowed.has(key)));
  return { ...safe, binanceApiKey: '', binanceSecretKey: '', isKeysEncrypted: false, autoLiveExecutionEnabled: false };
}
