import {normalizeValuationMarks,type ValuationMark} from './valuationMarks';
import {backfillTrades,type TradeHistoryWindow} from './tradeBackfill';
import {normalizeCommission,type CommissionSnapshot} from './commissionRates';
import { referenceForFilter, ReferencePriceFreshnessError, annotateReferenceFailure, annotateReferenceBookRead, annotateReferenceBookProgress, type PriceReference } from './priceReference';
import { validateTradeContext, type TradeContext } from './tradingRules';
import { normalizeBalances, validateAccountSnapshot, type AccountSnapshot, type OpenOrder } from './accountSnapshot';
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
  if(intent.limitPrice!==undefined&&(r.type!==(intent.stopPrice===undefined?'LIMIT':'STOP_LOSS_LIMIT')||r.timeInForce!==(intent.stopPrice===undefined?'IOC':'GTC')||units(r.price)!==units(intent.limitPrice)))throw Error('ORDER_LIMIT_MISMATCH');
  if(intent.stopPrice!==undefined&&(units(r.stopPrice)!==units(intent.stopPrice)||r.orderListId!==-1||r.trailingDelta!==undefined))throw Error('STOP_IDENTITY_MISMATCH');
  const updateTime = r.updateTime ?? r.transactTime;
  if (!Number.isSafeInteger(updateTime) || updateTime < 0) throw Error('INVALID_EXCHANGE_TIME');
  const executed = units(r.executedQty), quote = units(r.cummulativeQuoteQty), requested = units(intent.quantity);
  if (executed > requested || (executed === 0n) !== (quote === 0n) || (['NEW','REJECTED'].includes(r.status) && executed !== 0n) || (r.status === 'FILLED' && executed !== requested) || (r.status === 'PARTIALLY_FILLED' && (executed <= 0n || executed >= requested))) throw Error('INVALID_EXCHANGE_TOTALS');
  return { clientOrderId, symbol:r.symbol, side:r.side, status:r.status as Status, orderId:id(r.orderId), executedQty:r.executedQty, quoteQty:r.cummulativeQuoteQty, updateTime };
}
export function testnetAccountId(apiKey: string) { return 'testnet_' + createHash('sha256').update(apiKey).digest('hex').slice(0,24); }
/** Not registered with the app. Only testnet, one HTTP attempt, no redirects or alternate hosts. */
export function createBinanceTestnetAdapter(options: {
  apiKey: string; secretKey: string; fetcher?: typeof fetch; now?: () => number; referenceReader?:(symbol:string)=>Promise<PriceReference>; referenceSnapshot?:(symbol:string)=>PriceReference;onBookRead?:(elapsedMs:number)=>void;
}): Adapter & { validateTestOrder(intent:Intent,clientOrderId:string):Promise<void>; valuationMarks(assets:string[]):Promise<ValuationMark[]>; accountSnapshot(): Promise<AccountSnapshot>; tradeContext(symbol:string):Promise<TradeContext>; protectionOrder(symbol:string, orderId:string):Promise<unknown>; commissionRates(symbol:string):Promise<CommissionSnapshot>; tradeHistory(symbol:string,startTime:number,endTime:number):Promise<TradeHistoryWindow> } {
  if(options.referenceSnapshot&&!options.referenceReader)throw Error('STREAM_REFERENCE_CONFIGURATION_INVALID');
  const { apiKey, secretKey } = options;
  if (!/^[A-Za-z0-9]{8,256}$/.test(apiKey) || !/^[A-Za-z0-9]{8,256}$/.test(secretKey)) throw Error('INVALID_TESTNET_CREDENTIALS');
  const fetcher = options.fetcher ?? fetch, now = options.now ?? Date.now;
  const accountId = testnetAccountId(apiKey);
  let blockedUntil = 0;
  function validateIntent(i: Intent, clientId: string) {
    if(i.stopPrice!==undefined&&(i.side!=='SELL'||units(i.stopPrice)<=0n||!i.limitPrice||units(i.limitPrice)>units(i.stopPrice)))throw Error('INVALID_PROTECTIVE_STOP');
    if (i.accountId !== accountId) throw Error('TESTNET_ACCOUNT_MISMATCH');
    if (!/^[A-Z0-9]{5,24}$/.test(i.symbol) || !['BUY','SELL'].includes(i.side) || !/^aq_[a-f0-9]{32}$/.test(clientId) || units(i.quantity) <= 0n) throw Error('INVALID_ORDER_REQUEST');
  }
  async function request(method: 'GET'|'POST'|'DELETE', endpoint: string, params: {[key:string]:string}, allowMissing = false, signedRequest = true, missingReference = false): Promise<any> {
    const timestamp = now();
    if (timestamp < blockedUntil) throw Error('EXCHANGE_COOLDOWN');
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw Error('INVALID_CLOCK');
    const query = new URLSearchParams({...params, ...(signedRequest?{timestamp:String(timestamp),recvWindow:'5000'}:{})}).toString();
    const signed = signedRequest ? query + '&signature=' + createHmac('sha256', secretKey).update(query).digest('hex') : query;
    let response: Response;
    try {
      response = await fetcher(HOST + endpoint + (method !== 'POST' ? '?' + signed : ''), {
        method, redirect:'error', signal:AbortSignal.timeout(12000),
        headers:{...(signedRequest?{'X-MBX-APIKEY':apiKey}:{}), ...(method === 'POST' ? {'Content-Type':'application/x-www-form-urlencoded'} : {})},
        ...(method === 'POST' ? {body:signed} : {}),
      });
    } catch { throw Error('EXCHANGE_TRANSPORT_UNKNOWN'); }
    if(response.status===451)throw Error('EXCHANGE_LOCATION_RESTRICTED');
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
    if(missingReference&&response.status===400&&body?.code===-2043)return {symbol:params.symbol,referencePrice:null};
    if (!response.ok || (typeof body?.code === 'number' && body.code < 0)) throw Error('EXCHANGE_REQUEST_UNCONFIRMED');
    return body;
  }
  return {
    async tradeHistory(symbol,startTime,endTime){
      return backfillTrades(params=>request('GET','/api/v3/myTrades',params),accountId,symbol,startTime,endTime,now);
    },
    async valuationMarks(assets){
      if(!Array.isArray(assets)||assets.length>10000||new Set(assets).size!==assets.length)throw Error('INVALID_VALUATION_ASSETS');
      normalizeBalances(assets.map(asset=>({asset,free:'0',locked:'0'})));
      const info=await request('GET','/api/v3/exchangeInfo',{},false,false);
      const startedAt=now();
      const tickers=await request('GET','/api/v3/ticker/bookTicker',{},false,false);
      return normalizeValuationMarks(info,tickers,assets,startedAt,now());
    },
    async commissionRates(symbol) {
      if(!/^[A-Z0-9]{5,24}$/.test(symbol))throw Error('INVALID_SYMBOL');
      const startedAt=now();
      const raw=await request('GET','/api/v3/account/commission',{symbol});
      return normalizeCommission(raw,accountId,symbol,startedAt,now());
    },
    async protectionOrder(symbol, orderId) {
      if(!/^[A-Z0-9]{5,24}$/.test(symbol)||id(orderId)!==orderId)throw Error('INVALID_PROTECTION_TARGET');
      return request('GET','/api/v3/order',{symbol,orderId},true);
    },
    async tradeContext(symbol) {
      if(!/^[A-Z0-9]{5,24}$/.test(symbol))throw Error('INVALID_SYMBOL');
      const startedAt=now();
      const info=object(await request('GET','/api/v3/exchangeInfo',{symbol},false,false));
      if(!Array.isArray(info.symbols)||info.symbols.length!==1||info.symbols[0]?.symbol!==symbol)throw Error('INVALID_EXCHANGE_INFO');
      const r=object(info.symbols[0]);
      if(!Array.isArray(r.filters))throw Error('INVALID_EXCHANGE_INFO');
      const percent=r.filters.filter((f:any)=>['PERCENT_PRICE','PERCENT_PRICE_BY_SIDE'].includes(f?.filterType));
      const referencePromise=(async()=>{
      let reference:PriceReference|undefined;
      if(percent.length&&options.referenceReader){
        const streamed=await options.referenceReader(symbol).catch(error=>{throw annotateReferenceFailure(error,'INITIAL_STREAM_READ');});
        if(streamed.kind!=='REFERENCE_PRICE')throw Error('STREAM_REFERENCE_INVALID');
        return streamed;
      }
      if(percent.length){
        const observedAt=now();
        const raw=object(await request('GET','/api/v3/referencePrice',{symbol},false,false,true));
        if(raw.symbol!==symbol||!('referencePrice' in raw))throw Error('REFERENCE_SYMBOL_MISMATCH');
        if(raw.referencePrice!==null){reference={kind:'REFERENCE_PRICE',price:raw.referencePrice,observedAt,timestamp:raw.timestamp};}
        else{
          const windows=percent.map((f:any)=>f.avgPriceMins);
          if(windows.some((v:any)=>!Number.isSafeInteger(v)||v<0||v!==windows[0]))throw Error('REFERENCE_WINDOW_MISMATCH');
          const fallbackAt=now();
          if(windows[0]===0){
            const rows=await request('GET','/api/v3/trades',{symbol,limit:'1'},false,false);
            if(!Array.isArray(rows)||rows.length!==1)throw Error('LAST_TRADE_UNAVAILABLE');
            reference={kind:'LAST_TRADE',price:rows[0]?.price,timestamp:rows[0]?.time,observedAt:fallbackAt,absenceConfirmed:true};
          }else{
            const avg=object(await request('GET','/api/v3/avgPrice',{symbol},false,false));
            reference={kind:'AVERAGE_PRICE',price:avg.price,timestamp:avg.closeTime,observedAt:fallbackAt,avgPriceMins:avg.mins,absenceConfirmed:true};
          }
        }
      }
      return reference;
      })();
      // With a warmed stream, obtain its current event before requesting a fresh book.
      if(options.referenceReader)await referencePromise;
      const quoteAt=now(),bookStartedAt=performance.now();
      // Read independent reference and book concurrently, retaining original request timestamps.
      const [initialReference,book]=await Promise.all([referencePromise,request('GET','/api/v3/ticker/bookTicker',{symbol},false,false)]);
      const bookReadElapsedMs=performance.now()-bookStartedAt;
      options.onBookRead?.(bookReadElapsedMs);
      let reference=initialReference;
      // A supplied snapshot is synchronous: select the feed's latest real event
      // after the book read without another HTTP request, stream wait or fallback.
      if(percent.length&&options.referenceReader&&options.referenceSnapshot){
        let cached:PriceReference;
        try{cached=options.referenceSnapshot(symbol);}catch(error){throw annotateReferenceBookProgress(annotateReferenceBookRead(annotateReferenceFailure(error,'POST_BOOK_SNAPSHOT'),bookReadElapsedMs),initialReference,quoteAt);}
        if(cached.kind!=='REFERENCE_PRICE')throw Error('STREAM_REFERENCE_INVALID');
        if(reference&&(cached.timestamp<reference.timestamp||cached.timestamp===reference.timestamp&&cached.price!==reference.price))throw Error('STREAM_REFERENCE_REGRESSED');
        reference=cached;
      }
      const q=object(book);
      if(q.symbol!==symbol)throw Error('BOOK_SYMBOL_MISMATCH');
      const context:TradeContext={environment:'BINANCE_TESTNET',symbol,baseAsset:r.baseAsset,quoteAsset:r.quoteAsset,status:r.status,spotAllowed:r.isSpotTradingAllowed,orderTypes:r.orderTypes,filters:r.filters,exchangeFilters:info.exchangeFilters,...(reference?{reference}:{}),startedAt,quote:{bid:q.bidPrice,ask:q.askPrice,bidQty:q.bidQty,askQty:q.askQty,observedAt:quoteAt}};
      try{validateTradeContext(context,symbol,now());for(const filter of percent)referenceForFilter(reference,filter,now());}
      catch(error){
        if(options.referenceReader){annotateReferenceFailure(error,'CONTEXT_REFERENCE_VALIDATION');annotateReferenceBookRead(error,bookReadElapsedMs);annotateReferenceBookProgress(error,initialReference,quoteAt);}
        // Only a successful, valid but event-old reference gets one fresh read.
        // Never retry transport/HTTP errors, future timestamps or slow requests.
        if(options.referenceReader||!(error instanceof ReferencePriceFreshnessError)||reference?.kind!=='REFERENCE_PRICE'||error.timing.requestAgeMs===null||error.timing.requestAgeMs<0||error.timing.requestAgeMs>2000||error.timing.eventAgeMs===null||error.timing.eventAgeMs<=2000||units(reference.price)<=0n)throw error;
        const observedAt=now();
        const raw=object(await request('GET','/api/v3/referencePrice',{symbol},false,false));
        if(raw.symbol!==symbol||typeof raw.referencePrice!=='string'||units(raw.referencePrice)<=0n)throw Error('REFERENCE_REFRESH_UNCONFIRMED');
        reference={kind:'REFERENCE_PRICE',price:raw.referencePrice,observedAt,timestamp:raw.timestamp};
        context.reference=reference;
        for(const filter of percent)referenceForFilter(reference,filter,now());
        validateTradeContext(context,symbol,now());
      }
      return context;
    },
    async accountSnapshot() {
      const startedAt = now();
      async function readAccount() {
        const raw = object(await request('GET', '/api/v3/account', {omitZeroBalances:'false'}));
        if(typeof raw.canTrade!=='boolean')throw Error('ACCOUNT_CAN_TRADE_INVALID');
        if(raw.accountType!=='SPOT')throw Error('ACCOUNT_TYPE_UNSUPPORTED');
        if(!Array.isArray(raw.permissions))throw Error('ACCOUNT_PERMISSIONS_MISSING');
        if(!raw.permissions.includes('SPOT'))throw Error('ACCOUNT_SPOT_PERMISSION_MISSING');
        return {canTrade:raw.canTrade, balances:normalizeBalances(raw.balances)};
      }
      async function readOrders(): Promise<OpenOrder[]> {
        // No symbol filter: include manual and other-bot orders on the whole account.
        const raw = await request('GET', '/api/v3/openOrders', {});
        if (!Array.isArray(raw)) throw Error('INVALID_OPEN_ORDERS');
        return raw.map(r => {
          r = object(r);
          return {clientOrderId:r.clientOrderId, orderId:id(r.orderId), symbol:r.symbol, side:r.side, status:r.status, quantity:r.origQty, executedQty:r.executedQty};
        }).sort((a,b) => (a.symbol + ':' + a.orderId).localeCompare(b.symbol + ':' + b.orderId));
      }
      const firstAccount = await readAccount(), firstOrders = await readOrders();
      const lastAccount = await readAccount(), lastOrders = await readOrders();
      if (JSON.stringify(firstAccount) !== JSON.stringify(lastAccount) || JSON.stringify(firstOrders) !== JSON.stringify(lastOrders)) throw Error('ACCOUNT_CHANGED_DURING_READ');
      const snapshot: AccountSnapshot = {environment:'BINANCE_TESTNET',accountId,startedAt,observedAt:now(),...lastAccount,openOrders:lastOrders};
      validateAccountSnapshot(snapshot, accountId, now());
      return snapshot;
    },
    async validateTestOrder(intent,clientId){
      validateIntent(intent,clientId);
      if(intent.symbol!=='BTCUSDT'||intent.side!=='BUY'||intent.stopPrice!==undefined||!intent.limitPrice||units(intent.limitPrice)<=0n)throw Error('INVALID_SANDBOX_TEST_ORDER');
      const notional=(units(intent.quantity)*units(intent.limitPrice)+(10n**18n)-1n)/(10n**18n);
      if(notional>25n*(10n**18n))throw Error('SANDBOX_ORDER_CAP_EXCEEDED');
      const raw=object(await request('POST','/api/v3/order/test',{symbol:'BTCUSDT',side:'BUY',type:'LIMIT',timeInForce:'IOC',price:intent.limitPrice,quantity:intent.quantity,newClientOrderId:clientId}));
      if(Object.keys(raw).length)throw Error('ORDER_TEST_RESPONSE_UNCONFIRMED');
    },
    async submit(intent, clientId) {
      validateIntent(intent, clientId);
      if(!intent.limitPrice||units(intent.limitPrice)<=0n)throw Error('BOUNDED_LIMIT_REQUIRED');
      const raw = await request('POST', '/api/v3/order', {symbol:intent.symbol, side:intent.side, type:intent.stopPrice===undefined?'LIMIT':'STOP_LOSS_LIMIT',timeInForce:intent.stopPrice===undefined?'IOC':'GTC',...(intent.stopPrice===undefined?{}:{stopPrice:intent.stopPrice}),price:intent.limitPrice, quantity:intent.quantity, newClientOrderId:clientId, newOrderRespType:'FULL'});
      // An ACK or FULL response without complete validated totals stays UNKNOWN in the journal.
      return normalize(raw, intent, clientId);
    },
    async cancel(intent, clientId, orderId, cancelClientId) {
      validateIntent(intent,clientId);
      if(intent.stopPrice===undefined||id(orderId)!==orderId||!/^ac_[a-f0-9]{32}$/.test(cancelClientId))throw Error('INVALID_STOP_CANCEL');
      // Both IDs must identify the same retained order; no bulk cancellation.
      await request('DELETE','/api/v3/order',{symbol:intent.symbol,orderId,origClientOrderId:clientId,newClientOrderId:cancelClientId});
    },
    async query(intent, clientId, cancellation) {
      validateIntent(intent, clientId);
      if(cancellation&&(intent.stopPrice===undefined||id(cancellation.orderId)!==cancellation.orderId||!/^ac_[a-f0-9]{32}$/.test(cancellation.clientOrderId)))throw Error('INVALID_STOP_CANCEL');
      let raw = await request('GET', '/api/v3/order', cancellation?{symbol:intent.symbol,orderId:cancellation.orderId}:{symbol:intent.symbol, origClientOrderId:clientId}, true);
      if (raw === null) return null;
      if(cancellation){
        if(id(raw.orderId)!==cancellation.orderId)throw Error('ORDER_IDENTITY_MISMATCH');
        // Cancellation can rename the exchange client ID. Only the retained deterministic
        // alias on a terminal order is accepted, never an arbitrary exchange identity.
        if(raw.clientOrderId===cancellation.clientOrderId&&['CANCELED','FILLED','EXPIRED','EXPIRED_IN_MATCH','REJECTED'].includes(raw.status))raw={...raw,clientOrderId:clientId};
      }
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
