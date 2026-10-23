import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {blobHash,integrateObservation,manifest} from '../scripts/integrate-observation-panel.mjs';

function fixture() {
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'alfaquant-integration-'));
  const targetRoot=path.join(base,'working'),payloadRoot=path.join(base,'payload');
  fs.mkdirSync(path.join(targetRoot,'src/components'),{recursive:true});
  fs.mkdirSync(payloadRoot);
  fs.writeFileSync(path.join(targetRoot,'src/components/A.tsx'),'original\r\n');
  fs.writeFileSync(path.join(payloadRoot,'A.tsx'),'updated\n');
  fs.writeFileSync(path.join(payloadRoot,'B.mjs'),'helper\n');
  const entries=[
    {source:'A.tsx',target:'src/components/A.tsx',before:blobHash('original\n'),after:blobHash('updated\n')},
    {source:'B.mjs',target:'src/components/B.mjs',before:null,after:blobHash('helper\n')}
  ];
  return {base,targetRoot,payloadRoot,entries};
}
test('check mode validates every file and writes nothing',()=>{
  const f=fixture();
  try {
    const result=integrateObservation(f);
    assert.equal(result.mode,'CHECK');assert.equal(result.backupDirectory,null);
    assert.equal(fs.readFileSync(path.join(f.targetRoot,'src/components/A.tsx'),'utf8'),'original\r\n');
    assert.equal(fs.existsSync(path.join(f.targetRoot,'src/components/B.mjs')),false);
    assert.equal(fs.readdirSync(f.targetRoot).length,1);
  } finally {fs.rmSync(f.base,{recursive:true,force:true});}
});
test('apply preserves originals in backup and a second apply is a no-op',()=>{
  const f=fixture();
  try {
    const result=integrateObservation({...f,apply:true});
    assert.equal(fs.readFileSync(path.join(result.backupDirectory,'src/components/A.tsx'),'utf8'),'original\r\n');
    assert.equal(fs.readFileSync(path.join(f.targetRoot,'src/components/B.mjs'),'utf8'),'helper\n');
    const second=integrateObservation({...f,apply:true});
    assert.ok(second.files.every(x=>x.status==='ALREADY_APPLIED'));
    assert.equal(second.backupDirectory,null);
  } finally {fs.rmSync(f.base,{recursive:true,force:true});}
});
test('a conflict in any file aborts before modifying the first file',()=>{
  const f=fixture();
  try {
    fs.writeFileSync(path.join(f.targetRoot,'src/components/B.mjs'),'independent user edits');
    assert.throws(()=>integrateObservation({...f,apply:true}),/VERSION_MISMATCH/);
    assert.equal(fs.readFileSync(path.join(f.targetRoot,'src/components/A.tsx'),'utf8'),'original\r\n');
    assert.equal(fs.readdirSync(f.targetRoot).length,1);
  } finally {fs.rmSync(f.base,{recursive:true,force:true});}
});
test('modified payload and symbolic-link destinations are rejected',()=>{
  const f=fixture();
  try {
    fs.writeFileSync(path.join(f.payloadRoot,'B.mjs'),'modified');
    assert.throws(()=>integrateObservation(f),/PAYLOAD_CHANGED/);
    fs.writeFileSync(path.join(f.payloadRoot,'B.mjs'),'helper\n');
    fs.symlinkSync(path.join(f.payloadRoot,'B.mjs'),path.join(f.targetRoot,'src/components/B.mjs'));
    assert.throws(()=>integrateObservation(f),/SYMLINK_REJECTED/);
  } finally {fs.rmSync(f.base,{recursive:true,force:true});}
});
test('manifest hashes match the four reviewed source payloads',()=>{
  for(const entry of manifest) {
    const text=fs.readFileSync(new URL('../'+entry.source,import.meta.url),'utf8');
    assert.equal(blobHash(text),entry.after,entry.source);
  }
});
