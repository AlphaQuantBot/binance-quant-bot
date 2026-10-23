import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createObservationApi} from '../src/observation/api.ts';

test('observation API rejects all mutation methods and legacy execution routes',async()=>{
  const app=express();
  app.use('/api',createObservationApi(async()=>({source:'test',scope:'test',fetchedAt:1,cached:false,upstreamEventTimeKnown:false,pairs:[]})));
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',()=>resolve()));
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const base='http://127.0.0.1:'+address.port+'/api';
  try {
    for(const method of ['POST','PUT','PATCH','DELETE']) {
      const response=await fetch(base+'/pancakeswap/record-buyback',{method});
      assert.equal(response.status,405);
      assert.equal((await response.json()).executionEnabled,false);
    }
    assert.equal((await fetch(base+'/binance/config')).status,404);
    assert.equal((await fetch(base+'/market')).status,400);
    const health=await (await fetch(base+'/health')).json();
    assert.equal(health.executionEnabled,false);assert.equal(health.providerHealth,'NOT_PROBED');
    const market=await fetch(base+'/market?q=TEST');assert.equal(market.status,200);
    assert.equal(market.headers.get('cache-control'),'no-store');
  } finally {server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
