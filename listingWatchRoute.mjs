import {createListingCollector} from './listingWatch.mjs';
export function installOfficialListingWatch(app,{collect=createListingCollector()}={}) {
 app.all('/api/pancakeswap/listing-watch',async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({code:'LISTING_WATCH_READ_ONLY'});
  try {
   const report=await collect();
   return res.status(report.sourceState==='UNAVAILABLE'?503:200).json(report);
  }catch{return res.status(503).json({code:'LISTING_WATCH_UNAVAILABLE',executionEnabled:false});}
 });
}
