import { createHash, createHmac } from 'node:crypto';
import type { Adapter, Intent, Confirmation, Status } from './orderExecution';
import { units } from './exactDecimal';
import { settleTrades, type ExecutionTrade } from './tradeSettlement';
const HOST = 'https://testnet.binance.vision';
const STATUSES = new Set(['NEW','PARTIALLY_FILLED','FILLED','CANCELED','REJECTED','EXPIRED','EXPIRED_IN_MATCH']);
function id(value: unknown): string {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === 'string' && /^(0|[1-9]\d{0,29})$/.test(value)) return value;
  throw Error('UNSAFE_EXCHANGE_ID');
}
function object(value: unknown): any {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('INVALID_EXCHANGE_RESPONSE');
  return value;
}
function normalize(raw: unknown, intent: Intent, clientOrderId: string): Confirmation {
  const r = object(raw);
  if (r.symbol !== intent.symbol || r.side !== intent.side || r.clientOrderId !== clientOrderId || !STATUSES.has(r.status) || units(r.origQty) !== units(intent.quantity)) throw Error('ORDER_IDENTITY_MISMATCH');
  const updateTime = r.updateTime ?? r.transactTime;
  if (!Number.isSafeInteger(updateTime) || updateTime < 0) throw Error('INVALID_EXCHANGE_TIME');
  const executed = units(r.executedQty), quote = units(r.cummulativeQuoteQty), requested = units(intent.quantity);
  if (executed > requested || (executed === 0n) !== (quote === 0n) || (['NEW','REJECTED'].includes(r.status) && executed !== 0n) || (r.status === 'FILLED' && executed !== requested) || (r.status === 'PARTIALLY_FILLED' && (executed <= 0n || executed >= requested))) throw Error('INVALID_EXCHANGE_TOTALS');
  return { clientOrderId, symbol:r.symbol, side:r.side, status:r.status as Status, orderId:id(r.orderId), executedQty:r.executedQty, quoteQty:r.cummulativeQuoteQty, updateTime };
}
export function testnetAccountId(apiKey: string) { return 'testnet_' + createHash('sha256').update(apiKey).digest('hex').slice(0,24); }
/** Not registered with the app. Only testnet, one HTTP attempt, no redirects or alternate hosts. */
export function createBinanceTestnetAdapter(options: {
  apiKey: string; secretKey: string; fetcher?: typeof fetch; now?: () => number;
}): Adapter {
  const { apiKey, secretKey } = options;
  if (!/^[A-Za-z0-9]{8,256}$/.test(apiKey) || !/^[A-Za-z0-9]{8,256}$/.test(secretKey)) throw Error('INVALID_TESTNET_CREDENTIALS');
  const fetcher = options.fetcher ?? fetch, now = options.now ?? Date.now;
  const accountId = testnetAccountId(apiKey);
  let blockedUntil = 0;
  function validateIntent(i: Intent, clientId: string) {
    if (i.accountId !== accountId) throw Error('TESTNET_ACCOUNT_MISMATCH');
    if (!/^[A-Z0-9]{5,24}$/.test(i.symbol) || !['BUY','SELL'].includes(i.side) || !/^aq_[a-f0-9]{32}$/.test(clientId) || units(i.quantity) <= 0n) throw Error('INVALID_ORDER_REQUEST');
  }
  async function request(method: 'GET'|'POST', endpoint: string, params: {[key:string]:string}, allowMissing = false): Promise<any> {
    const timestamp = now();
    if (timestamp < blockedUntil) throw Error('EXCHANGE_COOLDOWN');
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw Error('INVALID_CLOCK');
    const query = new URLSearchParams({...params, timestamp:String(timestamp), recvWindow:'5000'}).toString();
    const signed = query + '&signature=' + createHmac('sha256', secretKey).update(query).digest('hex');
    let response: Response;
    try {
      response = await fetcher(HOST + endpoint + (method === 'GET' ? '?' + signed : ''), {
        method, redirect:'error', signal:AbortSignal.timeout(12000),
        headers:{'X-MBX-APIKEY':apiKey, ...(method === 'POST' ? {'Content-Type':'application/x-www-form-urlencoded'} : {})},
        ...(method === 'POST' ? {body:signed} : {}),
      });
    } catch { throw Error('EXCHANGE_TRANSPORT_UNKNOWN'); }
    if (response.status === 429 || response.status === 418) {
      const retryAfter = Number(response.headers.get('retry-after') ?? '60');
      const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(86400, retryAfter) : 60;
      blockedUntil = timestamp + seconds * 1000;
      throw Error('EXCHANGE_COOLDOWN');
    }
    let body: any;
    try { body = await response.json(); } catch { throw Error('EXCHANGE_RESPONSE_UNKNOWN'); }
    // -2013 is only an absent order on the read query; never a reason to send again.
    if (allowMissing && response.status === 400 && body?.code === -2013) return null;
    if (!response.ok || (typeof body?.code === 'number' && body.code < 0)) throw Error('EXCHANGE_REQUEST_UNCONFIRMED');
    return body;
  }
  return {
    async submit(intent, clientId) {
      validateIntent(intent, clientId);
      const raw = await request('POST', '/api/v3/order', {symbol:intent.symbol, side:intent.side, type:'MARKET', quantity:intent.quantity, newClientOrderId:clientId, newOrderRespType:'FULL'});
      // An ACK or FULL response without complete validated totals stays UNKNOWN in the journal.
      return normalize(raw, intent, clientId);
    },
    async query(intent, clientId) {
      validateIntent(intent, clientId);
      const raw = await request('GET', '/api/v3/order', {symbol:intent.symbol, origClientOrderId:clientId}, true);
      if (raw === null) return null;
      const order = normalize(raw, intent, clientId);
      const trades: ExecutionTrade[] = [];
      if (units(order.executedQty) > 0n) {
        let cursor = '0', complete = false;
        for (let page = 0; page < 10; page++) {
          const rows = await request('GET', '/api/v3/myTrades', {symbol:intent.symbol, orderId:order.orderId, fromId:cursor, limit:'1000'});
          if (!Array.isArray(rows) || rows.length > 1000) throw Error('INVALID_TRADES_RESPONSE');
          let last = BigInt(cursor) - 1n;
          for (const item of rows) {
            const t = object(item), tradeId = id(t.id);
            if (BigInt(tradeId) < BigInt(cursor) || typeof t.isBuyer !== 'boolean') throw Error('INVALID_TRADE_CURSOR');
            if (BigInt(tradeId) > last) last = BigInt(tradeId);
            trades.push({tradeId, orderId:id(t.orderId), symbol:t.symbol, side:t.isBuyer ? 'BUY':'SELL', quantity:t.qty, quoteQuantity:t.quoteQty, commission:t.commission, commissionAsset:t.commissionAsset});
          }
          if (rows.length < 1000) { complete = true; break; }
          if (last < BigInt(cursor)) throw Error('TRADE_PAGINATION_STALLED');
          cursor = String(last + 1n);
        }
        if (!complete) throw Error('TRADE_PAGE_LIMIT_REACHED');
      }
      // An incomplete/out-of-sync trade list cannot supply invented zero fees.
      order.settlement = settleTrades(order, trades);
      return order;
    },
  };
}
