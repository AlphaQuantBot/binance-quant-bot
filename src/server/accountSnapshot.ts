import { decimal, units } from './exactDecimal';
import type { Record as OrderRecord } from './orderExecution';
export type Balance = { asset: string; free: string; locked: string };
export type OpenOrder = { clientOrderId:string; orderId:string; symbol:string; side:'BUY'|'SELL'; status:string; quantity:string; executedQty:string };
export type AccountSnapshot = {
  environment:'BINANCE_TESTNET'; accountId:string; startedAt:number; observedAt:number;
  canTrade:boolean; balances:Balance[]; openOrders:OpenOrder[];
};
// Exchange balance identifiers may contain Unicode letters (Spot Testnet includes 这是测试币).
// Preserve exact identities; keep bounded length and reject whitespace/control characters.
// This read-only parser does not expand the execution symbol allowlist.
const assetPattern = /^[\p{L}\p{N}][\p{L}\p{N}\p{M}]{0,23}$/u;
export function normalizeBalances(rows: unknown): Balance[] {
  if (!Array.isArray(rows)) throw Error('INVALID_BALANCES');
  const seen = new Set<string>();
  return rows.map(r => {
    if (!r || typeof r.asset !== 'string' || !assetPattern.test(r.asset) || seen.has(r.asset)) throw Error('INVALID_BALANCE_ASSET');
    seen.add(r.asset);
    return {asset:r.asset, free:decimal(units(r.free)), locked:decimal(units(r.locked))};
  }).sort((a,b) => a.asset.localeCompare(b.asset));
}
export function validateAccountSnapshot(snapshot: AccountSnapshot, accountId: string, now: number) {
  if (!snapshot || snapshot.environment !== 'BINANCE_TESTNET' || snapshot.accountId !== accountId || typeof snapshot.canTrade !== 'boolean') throw Error('ACCOUNT_SNAPSHOT_MISMATCH');
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(snapshot.startedAt) || !Number.isSafeInteger(snapshot.observedAt) || snapshot.startedAt <= 0 || snapshot.startedAt > snapshot.observedAt || snapshot.observedAt > now || now - snapshot.startedAt > 30000 || snapshot.observedAt - snapshot.startedAt > 10000) throw Error('ACCOUNT_SNAPSHOT_STALE');
  normalizeBalances(snapshot.balances);
  if (!Array.isArray(snapshot.openOrders)) throw Error('INVALID_OPEN_ORDERS');
  const ids = new Set<string>(), clients = new Set<string>();
  for (const o of snapshot.openOrders) {
    if (!o || typeof o.clientOrderId !== 'string' || !/^[A-Za-z0-9_.:\/-]{1,80}$/.test(o.clientOrderId) || typeof o.orderId !== 'string' || !/^\d{1,30}$/.test(o.orderId) || !/^[A-Z0-9]{5,24}$/.test(o.symbol) || !['BUY','SELL'].includes(o.side) || !['NEW','PARTIALLY_FILLED','PENDING_NEW','PENDING_CANCEL'].includes(o.status)) throw Error('INVALID_OPEN_ORDER');
    const id = o.symbol + ':' + o.orderId;
    if (ids.has(id) || clients.has(o.clientOrderId)) throw Error('DUPLICATE_OPEN_ORDER');
    ids.add(id); clients.add(o.clientOrderId);
    if (units(o.quantity) <= 0n || units(o.executedQty) >= units(o.quantity) || (o.status === 'NEW' && units(o.executedQty) !== 0n) || (o.status === 'PARTIALLY_FILLED' && units(o.executedQty) === 0n)) throw Error('INVALID_OPEN_ORDER_TOTALS');
  }
}
/** Compare identities and quantities, never guess that an external/manual order belongs to a bot. */
export function accountDiscrepancies(snapshot: AccountSnapshot, rows: OrderRecord[]): string[] {
  const problems: string[] = [];
  if (!snapshot.canTrade) problems.push('ACCOUNT_TRADING_DISABLED');
  if (rows.some(r => r.accountId !== snapshot.accountId)) problems.push('JOURNAL_ACCOUNT_MISMATCH');
  for (const r of rows) {
    const c = r.confirmation;
    if(r.cancelState&&r.cancelState!=='RESOLVED')problems.push('CANCELLATION_UNRESOLVED:'+r.requestId);
    if (['SUBMITTING','UNKNOWN'].includes(r.status) || !c) { problems.push('ORDER_UNRESOLVED:' + r.requestId); continue; }
    if (units(c.executedQty) > 0n && !c.settlement) problems.push('TRADE_SETTLEMENT_MISSING:' + r.requestId);
    const open = snapshot.openOrders.find(o => o.clientOrderId === r.clientOrderId);
    const active = ['NEW','PARTIALLY_FILLED'].includes(r.status);
    if (active && !open) problems.push('LOCAL_ORDER_NOT_OPEN:' + r.requestId);
    if (!active && open) problems.push('TERMINAL_ORDER_STILL_OPEN:' + r.requestId);
    if (open && (open.orderId !== c.orderId || open.symbol !== r.symbol || open.side !== r.side || open.status !== r.status || units(open.quantity) !== units(r.quantity) || units(open.executedQty) !== units(c.executedQty))) problems.push('OPEN_ORDER_MISMATCH:' + r.requestId);
  }
  for (const o of snapshot.openOrders) if (!rows.some(r => r.clientOrderId === o.clientOrderId)) problems.push('EXTERNAL_OPEN_ORDER:' + o.symbol + ':' + o.orderId);
  return problems;
}
