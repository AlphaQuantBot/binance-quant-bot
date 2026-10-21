import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decideScopedSignal} from '../src/server/scopedSignalDecision';
import type {DecisionEvidence} from '../src/server/scopedSignalDecision';
import type {evaluateSignal} from '../src/server/testnetSignalObserver';
import type {ScopedTestnetJournal} from '../src/server/scopedTestnetJournal';
const now=60000001,accountId='testnet_'+'a'.repeat(24);
function signal(value:ReturnType<typeof evaluateSignal>['signal']='HOLD'):ReturnType<typeof evaluateSignal>{return {environment:'BINANCE_TESTNET',operation:'READ_ONLY_SIGNAL_OBSERVATION',strategy:'EMA20_50_CROSS_1M_V1',symbol:'BTCUSDT',interval:'1m',candleCount:120,candleCloseTime:59999999,close:100,ema20:100,ema50:100,signal:value,source:'BINANCE_TESTNET_REST',closedCandlesOnly:true,ordersSubmitted:0,automaticTradingEnabled:false,inputHash:'a'.repeat(64)};}
function audit():ReturnType<ScopedTestnetJournal['audit']>{return {environment:'BINANCE_TESTNET',operation:'SCOPED_CAPITAL_AUDIT',limits:{symbol:'BTCUSDT',capitalUSDT:'100',maxOrderUSDT:'25',lossLimitUSDT:'5'},allocatedCashUSDT:'100.007035',ownedBTC:'0',availableCashUSDT:'100.007035',scopedEquityUSDT:'100.007035',lossUSDT:'0',halted:false,haltReasons:[],unresolvedOrders:0,orderCount:2,accountConsistent:true,scope:'LOCAL_BTCUSDT_EXPERIMENT_ONLY',capitalTransferred:false,dailyRiskAuthorized:false,tradingEnabled:false,executionBlockers:['AUTOMATIC_TRADING_NOT_ENABLED']};}
const evidence=():DecisionEvidence=>({accountId,expectedAccountId:accountId,auditObservedAt:now-1,buyOnceUsed:true,sellOnceUsed:true});

import {reviewScopedSignalCandidate} from '../src/server/scopedSignalOrderReview';
import {rulesFixture} from './fixtures/trading';
import {normalizeCommission} from '../src/server/commissionRates';
function context(){const c=rulesFixture();c.startedAt=now-2;c.quote.observedAt=now-1;return c;}
function account(){return {environment:'BINANCE_TESTNET' as const,accountId,startedAt:now-2,observedAt:now-1,canTrade:true,openOrders:[],balances:[{asset:'BTC',free:'1',locked:'0'},{asset:'USDT',free:'10000.007035',locked:'0'}]};}
function commission(rate='0'){const z={maker:'0',taker:rate,buyer:'0',seller:'0'},zero={maker:'0',taker:'0',buyer:'0',seller:'0'};return normalizeCommission({symbol:'BTCUSDT',standardCommission:z,specialCommission:zero,taxCommission:zero,discount:{enabledForAccount:true,enabledForSymbol:true,discountAsset:null,discount:'0.25'}},accountId,'BTCUSDT',now-2,now-1);}
test('BUY candidate validates local bounded price, size and current fee without execution authority',()=>{
 const r=reviewScopedSignalCandidate(signal('BUY_CROSS'),audit(),evidence(),account(),context(),commission('0.001'),now);
 assert.equal(r.orderReview.state,'LOCAL_CHECKS_PASSED');
 const p=r.orderReview;if(!('quantity' in p))assert.fail('missing bounded observation');
 assert.equal(p.quantity,'0.25');assert.equal(p.limitPrice,'100');assert.equal(p.boundedNotionalUSDT,'25');assert.equal(p.undiscountedFeeEstimateUSDT,'0.025');
 assert.equal(p.discountApplied,false);assert.equal(p.capitalReserved,false);assert.equal(p.feeReservationAuthorized,false);
 assert.equal(r.executionAuthorized,false);assert.equal(r.ordersSubmitted,0);assert.equal(p.exchangeValidated,false);
 assert.ok(r.executionBlockers.includes('EXPERIMENT_BUY_ONCE_ALREADY_USED'));
 assert.ok(r.executionBlockers.includes('FEE_ASSET_RESERVATION_NOT_AUTHORIZED'));
 assert.equal(r.executionBlockers.includes('ORDER_RULES_AND_FEES_NOT_VALIDATED'),false);
});
test('HOLD or SELL while flat never manufactures a review or sells the account baseline BTC',()=>{
 for(const s of ['HOLD','SELL_CROSS'] as const){const r=reviewScopedSignalCandidate(signal(s),audit(),evidence(),account(),context(),commission(),now);assert.equal(r.orderReview.state,'NOT_APPLICABLE');assert.equal(r.candidate,'NONE');}
});
test('SELL local review uses only experiment BTC and retains zero-fee-only execution-policy boundary',()=>{
 const a=audit();a.ownedBTC='0.2';a.allocatedCashUSDT='80';a.availableCashUSDT='80';
 const r=reviewScopedSignalCandidate(signal('SELL_CROSS'),a,evidence(),account(),context(),commission(),now);
 const p=r.orderReview;if(!('quantity' in p))assert.fail('missing sell observation');assert.equal(p.quantity,'0.2');assert.equal(p.boundedNotionalUSDT,'20');assert.equal(p.undiscountedFeeEstimateUSDT,'0');
 const blocked=reviewScopedSignalCandidate(signal('SELL_CROSS'),a,evidence(),account(),context(),commission('0.001'),now);
 assert.equal(blocked.orderReview.code,'SCOPED_NONZERO_FEE_EXECUTION_UNSUPPORTED');assert.equal(blocked.candidate,'NONE');
});
test('BUY fee must fit scoped cash even when whole account has ample free USDT',()=>{
 const a=audit();a.availableCashUSDT='25';
 const r=reviewScopedSignalCandidate(signal('BUY_CROSS'),a,evidence(),account(),context(),commission('0.001'),now);
 assert.equal(r.orderReview.code,'SCOPED_PRINCIPAL_AND_FEE_EXCEED_AVAILABLE_CASH');assert.equal(r.assessment,'BLOCKED');assert.equal(r.candidate,'NONE');
});
test('actual account binding and fresh commission/quote timestamps remain required',()=>{
 const other={...account(),accountId:'testnet_'+'b'.repeat(24)};
 assert.equal(reviewScopedSignalCandidate(signal('BUY_CROSS'),audit(),evidence(),other,context(),commission(),now).orderReview.code,'ACCOUNT_SNAPSHOT_MISMATCH');
 const rates=commission();rates.startedAt=now-2001;
 assert.equal(reviewScopedSignalCandidate(signal('BUY_CROSS'),audit(),evidence(),account(),context(),rates,now).orderReview.code,'STALE_COMMISSION_RATES');
 const c=context();c.quote.observedAt=now-2001;c.startedAt=now-2002;
 assert.equal(reviewScopedSignalCandidate(signal('BUY_CROSS'),audit(),evidence(),account(),c,commission(),now).orderReview.code,'STALE_TRADE_CONTEXT');
});
test('exchange filters and native account MAX_POSITION are not bypassed for experiment candidates',()=>{
 const c=context();c.filters.push({filterType:'MAX_POSITION',maxPosition:'1.1'});
 assert.equal(reviewScopedSignalCandidate(signal('BUY_CROSS'),audit(),evidence(),account(),c,commission(),now).orderReview.code,'EXCHANGE_POSITION_LIMIT_EXCEEDED');
 const unknown=context();unknown.filters.push({filterType:'FUTURE_FILTER'});
 assert.equal(reviewScopedSignalCandidate(signal('BUY_CROSS'),audit(),evidence(),account(),unknown,commission(),now).orderReview.code,'UNSUPPORTED_SYMBOL_FILTER');
});
test('halt or newly stale signal overrides a previously plausible candidate before planning',()=>{
 const a=audit();a.halted=true;
 assert.equal(reviewScopedSignalCandidate(signal('BUY_CROSS'),a,evidence(),account(),context(),commission(),now).orderReview.state,'NOT_APPLICABLE');
 const s=signal('BUY_CROSS');s.candleCloseTime=59879999;
 assert.equal(reviewScopedSignalCandidate(s,audit(),evidence(),account(),context(),commission(),now).candidate,'NONE');
});
test('CLI still contains no submit/cancel/order-test, reservation or initialization call',()=>{
 const source=fs.readFileSync(new URL('../scripts/observe_scoped_decision.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\.(submit|cancel|validateTestOrder|prepare|prepareFirstBuy|prepareFirstSell|initialize)\s*\(/);
 assert.match(source,/decision.assessment==='CANDIDATE_ONLY'/);
});
