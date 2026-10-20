import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBalances} from '../src/server/accountSnapshot';
test('Unicode balances preserve exact identities and all free/locked amounts',()=>{
 const balances=normalizeBalances([{asset:'这是测试币',free:'100.10',locked:'2'},{asset:'456',free:'0',locked:'0'},{asset:'USDT',free:'1',locked:'0'}]);
 assert.equal(balances.length,3);
 assert.deepEqual(balances.find(b=>b.asset==='这是测试币'),{asset:'这是测试币',free:'100.1',locked:'2'});
 assert.ok(balances.some(b=>b.asset==='456'));
});
test('Unicode balance support retains identity, duplicate and decimal validation',()=>{
 for(const asset of ['', ' USDT', 'USDT\n', '币/USDT', '币\u200b', '币\u202e', '币'.repeat(25)])assert.throws(()=>normalizeBalances([{asset,free:'1',locked:'0'}]),/INVALID_BALANCE_ASSET/);
 assert.throws(()=>normalizeBalances([{asset:'这是测试币',free:'1',locked:'0'},{asset:'这是测试币',free:'0',locked:'0'}]),/INVALID_BALANCE_ASSET/);
 for(const free of [-1,'-1',1])assert.throws(()=>normalizeBalances([{asset:'这是测试币',free,locked:'0'}]));
});
