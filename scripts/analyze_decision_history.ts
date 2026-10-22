import 'dotenv/config';
import path from 'node:path';
import {readDecisionWatchHistory,readDecisionWatchHistoryByIds,validateDecisionSessionIds} from '../src/server/decisionWatchJournal';
import {analyzeDecisionHistory} from '../src/server/decisionHistoryAnalysis';
try{
 const args=process.argv.slice(2),argument=args[0]??'5';
 const selected=argument==='ids';
 let ids:string[]=[];
 if(selected){if(args.length!==2)throw Error('DECISION_ANALYSIS_INVALID');ids=args[1].split(',');validateDecisionSessionIds(ids);}
 else if(args.length>1||!/^[1-9][0-9]?$/.test(argument)||Number(argument)>20)throw Error('DECISION_ANALYSIS_INVALID');
 const scoped=path.resolve(process.env.APP_TESTNET_SCOPED_JOURNAL??'.testnet_scoped/sandbox.sqlite');
 const file=path.join(path.dirname(scoped),'decision-watch.sqlite');
 const rows=selected?readDecisionWatchHistoryByIds(file,ids):readDecisionWatchHistory(file,Number(argument),undefined,true);
 console.log(JSON.stringify({...analyzeDecisionHistory(rows,selected?'EXPLICIT_IDS':'RECENT'),
  ...(selected?{selection:'EXPLICIT_IDS',selectedSessionIds:ids,allSelectedSessionsFound:true}:{requestedSessionLimit:Number(argument)})},null,2));
}catch(error){
 const allowed=['DECISION_ANALYSIS_INVALID','DECISION_ANALYSIS_SIGNAL_CONFLICT','DECISION_WATCH_HISTORY_INVALID','DECISION_WATCH_HISTORY_MISSING'];
 const code=error instanceof Error&&allowed.includes(error.message)?error.message:'DECISION_ANALYSIS_UNCONFIRMED';
 console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_DECISION_ANALYSIS',code,
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2));process.exitCode=1;
}
