import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountAuditDiagnostic} from '../src/server/accountAuditDiagnostic';
test('account audit diagnoses storage and known validation failures without private details',()=>{
 const e=Object.assign(new Error('EPERM private/path secretKey'),{code:'EPERM',path:'private/path'});
 assert.equal(accountAuditDiagnostic(e,'REFRESH').code,'LOCAL_STORAGE_EPERM');
 assert.equal(accountAuditDiagnostic(new Error('INVALID_CAPITAL_JOURNAL'),'INITIALIZE').code,'INVALID_CAPITAL_JOURNAL');
 const r=accountAuditDiagnostic(new Error('secretKey balance 12345'),'CLOSE');assert.equal(r.code,'ACCOUNT_AUDIT_UNCONFIRMED');
 assert.equal(r.tradingEnabled,false);assert.equal(JSON.stringify([r,accountAuditDiagnostic(e,'REFRESH')]).includes('secretKey'),false);
 assert.equal(accountAuditDiagnostic({message:'INVALID_JOURNAL',code:'EPERM'},'REFRESH').code,'ACCOUNT_AUDIT_UNCONFIRMED');
});
