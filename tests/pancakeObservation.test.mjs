import {test} from 'node:test';
import assert from 'node:assert/strict';
import {consolidateObservation,receivedStatus} from '../pancakeObservation.mjs';
const address='0x'+'a'.repeat(40);
test('joins by normalized address and retains conflicting source values',()=>{
 const data=consolidateObservation({pool:{tokenAddress:address,quantPriceUsd:1},radar:[{address:address.toUpperCase().replace('0X','0x'),currentPriceUsd:2}],listings:[{address,currentPriceUsd:3}]});
 assert.equal(data.rows.length,1);assert.equal(data.rows[0].records.length,3);
 assert.deepEqual(data.rows[0].records.map(r=>r.parameters.quantPriceUsd??r.parameters.currentPriceUsd),[1,2,3]);
});
test('same symbol does not merge different contracts; bad addresses are not invented',()=>{
 const result=consolidateObservation({radar:[{address,symbol:'X'},{address:'0x'+'b'.repeat(40),symbol:'X'},{symbol:'X'}]});
 assert.equal(result.rows.length,2);assert.equal(result.unmatchedRecords.length,1);
});
test('zero and false are preserved; input is not mutated and security is not fabricated',()=>{
 const input={address,currentPriceUsd:0,isHoneypot:false};
 const result=consolidateObservation({radar:[input]});result.rows[0].records[0].parameters.currentPriceUsd=5;
 assert.equal(input.currentPriceUsd,0);assert.equal(result.rows[0].records[0].parameters.isHoneypot,false);
 assert.equal(result.rows[0].records[0].parameters.safetyScore,undefined);
});
test('missing, failed, old and received snapshots have distinct statuses',()=>{
 assert.equal(receivedStatus(undefined,100),'HENÜZ ALINMADI');
 assert.match(receivedStatus({at:1,error:true},100),/BAŞARISIZ/);
 assert.equal(receivedStatus({at:1,error:false},61002),'ESKİ OKUMA');
 assert.equal(receivedStatus({at:100,error:false},99),'ESKİ OKUMA');
 assert.equal(receivedStatus({at:1,error:false},100),'ALINDI');
});
