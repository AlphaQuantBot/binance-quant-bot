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
test('HOLD is WAIT and sell crossing with flat experiment never sells external account BTC',()=>{
 assert.equal(decideScopedSignal(signal(),audit(),evidence(),now).assessment,'WAIT');
 const r=decideScopedSignal(signal('SELL_CROSS'),audit(),evidence(),now);
 assert.equal(r.candidate,'NONE');assert.ok(r.reasonCodes.includes('NO_EXPERIMENT_BTC_TO_SELL'));assert.equal(r.executionAuthorized,false);
});
test('buy candidate stays non-executable and retains completed experiment one-shot blocker',()=>{
 const r=decideScopedSignal(signal('BUY_CROSS'),audit(),evidence(),now);
 assert.equal(r.candidate,'BUY');assert.equal(r.assessment,'CANDIDATE_ONLY');
 assert.ok(r.executionBlockers.includes('EXPERIMENT_BUY_ONCE_ALREADY_USED'));
 assert.ok(r.executionBlockers.includes('FULL_ACCOUNT_DAILY_RISK_NOT_AUTHORIZED'));
 assert.ok(r.executionBlockers.includes('ORDER_RULES_AND_FEES_NOT_VALIDATED'));
 assert.equal(r.executionAuthorized,false);assert.equal(r.ordersSubmitted,0);
});
test('owned scoped BTC permits only an observation SELL candidate, never an executable intent',()=>{
 const a=audit();a.ownedBTC='0.0003';
 const r=decideScopedSignal(signal('SELL_CROSS'),a,evidence(),now);assert.equal(r.candidate,'SELL');assert.ok(r.executionBlockers.includes('EXPERIMENT_SELL_ONCE_ALREADY_USED'));
 assert.equal('intent' in r,false);assert.equal(r.automaticTradingEnabled,false);
 assert.ok(decideScopedSignal(signal('BUY_CROSS'),a,evidence(),now).reasonCodes.includes('EXPERIMENT_POSITION_ALREADY_OPEN'));
});
test('halt, mismatch, unresolved order and exact loss-limit equality all block candidates',()=>{
 for(const patch of [{halted:true},{haltReasons:['OPERATOR_HALT']},{accountConsistent:false},{unresolvedOrders:1},{lossUSDT:'5'}]){
  const r=decideScopedSignal(signal('BUY_CROSS'),{...audit(),...patch},evidence(),now);
  assert.equal(r.assessment,'BLOCKED');assert.equal(r.candidate,'NONE');assert.equal(r.executionAuthorized,false);
 }
});
test('old/future signal or audit evidence blocks without refreshing timestamps',()=>{
 for(const time of [59879999,60059999]){const s=signal('BUY_CROSS');s.candleCloseTime=time;assert.equal(decideScopedSignal(s,audit(),evidence(),now).assessment,'BLOCKED');}
 for(const time of [now-5001,now+1])assert.ok(decideScopedSignal(signal(),audit(),{...evidence(),auditObservedAt:time},now).reasonCodes.includes('ACCOUNT_AUDIT_STALE_OR_FUTURE'));
});
test('wrong account, source, symbol, scope and altered limits cannot yield candidates',()=>{
 assert.equal(decideScopedSignal(signal(),audit(),{...evidence(),expectedAccountId:'testnet_'+'b'.repeat(24)},now).assessment,'BLOCKED');
 for(const patch of [{source:'FAKE'},{symbol:'ETHUSDT'},{inputHash:'bad'},{closedCandlesOnly:false},{ema20:NaN}])assert.equal(decideScopedSignal({...signal('BUY_CROSS'),...patch},audit(),evidence(),now).assessment,'BLOCKED');
 assert.equal(decideScopedSignal(signal(),{...audit(),scope:'WHOLE_ACCOUNT'},evidence(),now).assessment,'BLOCKED');
 const a=audit();a.limits={...a.limits,maxOrderUSDT:'250' as any};assert.equal(decideScopedSignal(signal(),a,evidence(),now).assessment,'BLOCKED');
});
test('invalid or overcommitted amounts are blocked; insufficient scoped cash cannot yield buy candidate',()=>{
 for(const amount of ['-1','NaN']){const r=decideScopedSignal(signal('BUY_CROSS'),{...audit(),availableCashUSDT:amount},evidence(),now);assert.equal(r.assessment,'BLOCKED');}
 assert.equal(decideScopedSignal(signal('BUY_CROSS'),{...audit(),availableCashUSDT:'101'},evidence(),now).assessment,'BLOCKED');
 const r=decideScopedSignal(signal('BUY_CROSS'),{...audit(),availableCashUSDT:'24.999999999999999999'},evidence(),now);assert.equal(r.candidate,'NONE');assert.ok(r.reasonCodes.includes('SCOPED_CASH_BELOW_PROPOSED_ORDER_CAP'));
});
test('operator command exposes no submit/cancel, loop, allocation reset or order-test capability',()=>{
 const source=fs.readFileSync(new URL('../scripts/observe_scoped_decision.ts',import.meta.url),'utf8')+fs.readFileSync(new URL('../src/server/scopedDecisionObservation.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\.(submit|cancel|initialize|prepare|prepareFirstBuy|prepareFirstSell|beginFirstBuySend|beginFirstSellSend|validateTestOrder)\s*\(/);
 assert.doesNotMatch(source,/setInterval|setTimeout|while\s*\(/);
 assert.match(source,/if\(!fs.existsSync\(file\)\)throw Error\('SCOPED_NOT_INITIALIZED'\)/);
});
