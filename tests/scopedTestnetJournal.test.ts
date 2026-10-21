import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ScopedTestnetJournal} from '../src/server/scopedTestnetJournal';
import {settleTrades} from '../src/server/tradeSettlement';
import {rulesFixture} from './fixtures/trading';
import type {AccountSnapshot} from '../src/server/accountSnapshot';
import type {Intent,Confirmation} from '../src/server/orderExecution';
const accountId='testnet_'+'a'.repeat(24);
const snapshot=(BTC='10',USDT='1000'):AccountSnapshot=>({environment:'BINANCE_TESTNET',accountId,startedAt:1000,observedAt:1001,canTrade:true,openOrders:[],balances:[{asset:'BTC',free:BTC,locked:'0'},{asset:'USDT',free:USDT,locked:'0'},{asset:'这是测试币',free:'10000',locked:'0'}]});
const intent=(id='sandbox_buy_001',side:'BUY'|'SELL'='BUY',quantity='0.2'):Intent=>({requestId:id,accountId,symbol:'BTCUSDT',side,quantity,limitPrice:'100'});
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-scope-')),file=path.join(dir,'state.sqlite');const j=new ScopedTestnetJournal(file,accountId,()=>1002);return {dir,file,j,close(){this.j.close();fs.rmSync(dir,{recursive:true,force:true});}};}
function fill(entry:ReturnType<ScopedTestnetJournal['prepare']>['entry'],patch:Partial<Confirmation>={}){
 const c:Confirmation={clientOrderId:entry.clientOrderId,symbol:'BTCUSDT',side:entry.intent.side,status:'FILLED',orderId:entry.intent.side==='BUY'?'1':'2',executedQty:entry.intent.quantity,quoteQty:entry.intent.side==='BUY'?'20':'10',updateTime:1002,...patch};
 c.settlement=settleTrades(c,[{tradeId:c.orderId,orderId:c.orderId,symbol:c.symbol,side:c.side,quantity:c.executedQty,quoteQuantity:c.quoteQty,commission:'0.1',commissionAsset:'USDT'}]);return c;
}
test('allocation binds to account, survives reopen, excludes preexisting BTC and never resets baseline',()=>{const f=fixture();try{
 assert.equal(f.j.initialize(snapshot()).created,true);let r=f.j.audit(snapshot(),rulesFixture());assert.equal(r.allocatedCashUSDT,'100');assert.equal(r.ownedBTC,'0');assert.equal(r.scopedEquityUSDT,'100');assert.equal(r.tradingEnabled,false);assert.equal(r.dailyRiskAuthorized,false);
 f.j.close();f.j=new ScopedTestnetJournal(f.file,accountId,()=>1002);assert.equal(f.j.initialize(snapshot()).created,false);r=f.j.audit(snapshot(),rulesFixture());assert.equal(r.halted,false);
 assert.throws(()=>new ScopedTestnetJournal(f.file,'testnet_'+'b'.repeat(24),()=>1002),/STATE_INVALID/);
 assert.equal(f.j.initialize(snapshot('11')).created,false);assert.equal(f.j.audit(snapshot('11'),rulesFixture()).halted,true);
 }finally{f.close();}});
test('initialization requires actually free capital and no open orders; failures are atomic',()=>{const f=fixture();try{
 const s=snapshot('10','99');s.balances[1].locked='1000';assert.throws(()=>f.j.initialize(s),/CAPITAL_UNAVAILABLE/);assert.throws(()=>f.j.audit(snapshot(),rulesFixture()),/NOT_INITIALIZED/);
 const open=snapshot();open.openOrders=[{clientOrderId:'external',orderId:'8',symbol:'BTCUSDT',side:'BUY',status:'NEW',quantity:'1',executedQty:'0'}];assert.throws(()=>f.j.initialize(open),/INITIAL_ACCOUNT_BLOCKED/);assert.equal(f.j.initialize(snapshot()).created,true);
 }finally{f.close();}});
test('intent reservation is durable and idempotent, and a null recovery query never authorizes resend',async()=>{const f=fixture();try{
 f.j.initialize(snapshot());const first=f.j.prepare(intent(),'0.1');assert.equal(first.created,true);assert.equal(f.j.audit(snapshot(),rulesFixture()).availableCashUSDT,'79.9');
 f.j.close();f.j=new ScopedTestnetJournal(f.file,accountId,()=>1002);const repeated=f.j.prepare(intent(),'0.1');assert.equal(repeated.created,false);assert.equal(repeated.entry.clientOrderId,first.entry.clientOrderId);
 let queries=0;const r=await f.j.reconcile(async(i,id)=>{queries++;assert.equal(id,first.entry.clientOrderId);return null;});assert.equal(queries,1);assert.equal(r.unresolved,1);
 assert.throws(()=>f.j.prepare(intent('sandbox_buy_002'),'0'),/RECONCILIATION_REQUIRED/);assert.throws(()=>f.j.prepare({...intent(),quantity:'0.1'},'0.1'),/IDEMPOTENCY_CONFLICT/);
 }finally{f.close();}});
test('confirmed native fees and owned BTC affect only scoped equity, without duplicate application',async()=>{const f=fixture();try{
 f.j.initialize(snapshot());const e=f.j.prepare(intent(),'0.1').entry;const c=fill(e);f.j.confirm(e.intent.requestId,c);f.j.confirm(e.intent.requestId,c);
 let r=f.j.audit(snapshot('10.2','979.9'),rulesFixture());assert.equal(r.allocatedCashUSDT,'79.9');assert.equal(r.ownedBTC,'0.2');assert.equal(r.lossUSDT,'0.1');assert.equal(r.unresolvedOrders,0);
 const sell=f.j.prepare(intent('sandbox_sell_001','SELL','0.1'),'0').entry;f.j.confirm(sell.intent.requestId,fill(sell));r=f.j.audit(snapshot('10.1','989.8'),rulesFixture());assert.equal(r.scopedEquityUSDT,'99.8');assert.equal(r.lossUSDT,'0.2');
 const result=await f.j.reconcile(async()=>{throw Error('must not reapply terminal fills');});assert.equal(result.queried,0);
 }finally{f.close();}});
test('BTC commission reduces only experiment-owned BTC; unrelated fee assets stay unresolved',()=>{const f=fixture();try{
 f.j.initialize(snapshot());const e=f.j.prepare(intent(),'0.1').entry,c=fill(e);c.settlement=settleTrades(c,[{tradeId:'1',orderId:'1',symbol:'BTCUSDT',side:'BUY',quantity:'0.2',quoteQuantity:'20',commission:'0.001',commissionAsset:'BTC'}]);f.j.confirm(e.intent.requestId,c);
 const r=f.j.audit(snapshot('10.199','980'),rulesFixture());assert.equal(r.ownedBTC,'0.199');assert.equal(r.scopedEquityUSDT,'99.9');
 const sell=f.j.prepare(intent('sandbox_sell_001','SELL','0.1'),'0').entry,bad=fill(sell);bad.settlement=settleTrades(bad,[{tradeId:'2',orderId:'2',symbol:'BTCUSDT',side:'SELL',quantity:'0.1',quoteQuantity:'10',commission:'0.1',commissionAsset:'BNB'}]);assert.throws(()=>f.j.confirm(sell.intent.requestId,bad),/FEE_ASSET_UNSUPPORTED/);assert.equal(f.j.audit(snapshot('10.199','980'),rulesFixture()).unresolvedOrders,1);
 }finally{f.close();}});
test('partial fills remain unresolved; regression and missing fee evidence never release capital',()=>{const f=fixture();try{
 f.j.initialize(snapshot());const e=f.j.prepare(intent(),'0.1').entry;const partial=fill(e,{status:'PARTIALLY_FILLED',executedQty:'0.1',quoteQty:'10'});f.j.confirm(e.intent.requestId,partial);assert.equal(f.j.audit(snapshot('10.1','989.9'),rulesFixture()).unresolvedOrders,1);
 const missing={...partial,settlement:undefined};assert.throws(()=>f.j.confirm(e.intent.requestId,missing),/FEES_UNCONFIRMED/);assert.throws(()=>f.j.confirm(e.intent.requestId,{...partial,executedQty:'0.05'}));assert.throws(()=>f.j.prepare(intent('sandbox_buy_002'),'0'),/RECONCILIATION_REQUIRED/);
 }finally{f.close();}});
test('loss latch survives restart and improved prices; unowned BTC can never be sold',()=>{const f=fixture();try{
 f.j.initialize(snapshot());assert.throws(()=>f.j.prepare(intent('sandbox_sell_001','SELL','0.1'),'0'),/CAPITAL_UNAVAILABLE/);
 const e=f.j.prepare(intent(),'0.1').entry;f.j.confirm(e.intent.requestId,fill(e));const c=rulesFixture();c.quote.bid='1';c.quote.ask='1';assert.ok(f.j.audit(snapshot('10.2','979.9'),c).haltReasons.includes('SCOPED_LOSS_LIMIT_REACHED'));
 f.j.close();f.j=new ScopedTestnetJournal(f.file,accountId,()=>1002);assert.equal(f.j.audit(snapshot('10.2','979.9'),rulesFixture()).halted,true);assert.throws(()=>f.j.prepare(intent('sandbox_buy_002'),'0'),/HALTED/);
 }finally{f.close();}});
test('external balance changes and manual halt persist; changed non-scope test assets do not rebase equity',()=>{const f=fixture();try{
 f.j.initialize(snapshot());const outside=snapshot();outside.balances[2].free='999';assert.equal(f.j.audit(outside,rulesFixture()).halted,false);
 assert.ok(f.j.audit(snapshot('10','1001'),rulesFixture()).haltReasons.includes('SCOPED_BALANCE_CHANGED'));f.j.halt();f.j.close();f.j=new ScopedTestnetJournal(f.file,accountId,()=>1002);const r=f.j.audit(snapshot(),rulesFixture());assert.equal(r.halted,true);assert.ok(r.haltReasons.includes('OPERATOR_HALT'));
 }finally{f.close();}});
test('two connections cannot reserve concurrently from a stale in-memory budget',()=>{const f=fixture();let second:ScopedTestnetJournal|undefined;try{
 f.j.initialize(snapshot());second=new ScopedTestnetJournal(f.file,accountId,()=>1002);f.j.prepare(intent(),'0');assert.throws(()=>second!.prepare(intent('sandbox_buy_002'),'0'),/RECONCILIATION_REQUIRED/);
 }finally{second?.close();f.close();}});
test('SQLite write failure never returns successful initialization',()=>{const f=fixture();try{
 (f.j as any).db.exec('PRAGMA query_only=ON');assert.throws(()=>f.j.initialize(snapshot()));(f.j as any).db.exec('PRAGMA query_only=OFF');assert.throws(()=>f.j.audit(snapshot(),rulesFixture()),/NOT_INITIALIZED/);assert.equal(f.j.initialize(snapshot()).created,true);
 }finally{f.close();}});
test('committed pending intent survives abrupt process termination and remains query-only',()=>{const f=fixture();try{
 f.j.close();const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',`import {ScopedTestnetJournal} from './src/server/scopedTestnetJournal.ts';const j=new ScopedTestnetJournal(${JSON.stringify(f.file)},${JSON.stringify(accountId)},()=>1002);j.initialize(${JSON.stringify(snapshot())});j.prepare(${JSON.stringify(intent())},'0.1');process.platform==='win32'?process.exit(86):process.kill(process.pid,'SIGKILL');`],{cwd:process.cwd(),encoding:'utf8'});
 if(process.platform==='win32')assert.equal(child.status,86);else assert.equal(child.signal,'SIGKILL');f.j=new ScopedTestnetJournal(f.file,accountId,()=>1002);const r=f.j.audit(snapshot(),rulesFixture());assert.equal(r.unresolvedOrders,1);assert.equal(r.availableCashUSDT,'79.9');assert.equal(f.j.prepare(intent(),'0.1').created,false);
 }finally{f.close();}});


test('read-only query recovery applies confirmed fills once after reopening, without submit capability',async()=>{const f=fixture();try{
 f.j.initialize(snapshot());const e=f.j.prepare(intent(),'0.1').entry;f.j.close();f.j=new ScopedTestnetJournal(f.file,accountId,()=>1002);
 let queries=0;const r=await f.j.reconcile(async(i,id)=>{queries++;assert.equal(id,e.clientOrderId);assert.equal(i.requestId,e.intent.requestId);return fill(e);});
 assert.equal(queries,1);assert.equal(r.unresolved,0);assert.equal(f.j.audit(snapshot('10.2','979.9'),rulesFixture()).allocatedCashUSDT,'79.9');
 assert.equal((await f.j.reconcile(async()=>{throw Error('no pending order');})).queried,0);
 }finally{f.close();}});
test('disabled accounts and external open orders are persistently blocked',()=>{const f=fixture();try{
 f.j.initialize(snapshot());const s=snapshot();s.canTrade=false;s.openOrders=[{clientOrderId:'external',orderId:'9',symbol:'BTCUSDT',side:'BUY',status:'NEW',quantity:'1',executedQty:'0'}];
 const r=f.j.audit(s,rulesFixture());assert.ok(r.haltReasons.includes('SCOPED_ACCOUNT_TRADING_DISABLED'));assert.ok(r.haltReasons.includes('SCOPED_EXTERNAL_OPEN_ORDER'));assert.throws(()=>f.j.prepare(intent(),'0'),/HALTED/);
 }finally{f.close();}});


test('persisted experiment limits cannot silently change across restart',()=>{const f=fixture();try{
 f.j.initialize(snapshot());const db=(f.j as any).db;const s=JSON.parse(db.prepare('SELECT payload FROM scoped_state WHERE id=1').get().payload);s.limits.capitalUSDT='101';db.prepare('UPDATE scoped_state SET payload=? WHERE id=1').run(JSON.stringify(s));assert.throws(()=>f.j.audit(snapshot(),rulesFixture()),/SCOPED_STATE_INVALID/);
 f.j.close();assert.throws(()=>new ScopedTestnetJournal(f.file,accountId,()=>1002),/SCOPED_STATE_INVALID/);
 }finally{f.close();}});
