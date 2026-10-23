import express from 'express';
import {createMarketReader} from './market.mjs';

export function createObservationApi(read = createMarketReader()) {
  const api = express.Router();
  api.use((_req,res,next)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    next();
  });
  // No order, approval, wallet, balance, burn or custody handlers are registered.
  api.use((req,res,next)=>{
    if(req.method !== 'GET') return res.status(405).json({code:'OBSERVATION_ONLY',executionEnabled:false});
    next();
  });
  api.get('/health',(_req,res)=>res.json({
    mode:'OBSERVATION_ONLY',executionEnabled:false,
    providerHealth:'NOT_PROBED',capabilities:['POOL_RESEARCH','LOCAL_WATCHLIST','LOCAL_ALERTS']
  }));
  api.get('/market',async(req,res)=>{
    if(typeof req.query.q !== 'string' || !req.query.q.trim() || req.query.q.trim().length>80)
      return res.status(400).json({code:'QUERY_INVALID'});
    try {return res.json(await read(req.query.q));}
    catch(error) {
      const message=error instanceof Error?error.message:'';
      const code=['PROVIDER_RATE_LIMITED','PROVIDER_SCHEMA_INVALID','PROVIDER_BUSY'].includes(message)?message:'PROVIDER_UNAVAILABLE';
      return res.status(503).json({code,executionEnabled:false});
    }
  });
  api.use((_req,res)=>res.status(404).json({code:'OBSERVATION_ENDPOINT_NOT_FOUND'}));
  return api;
}
