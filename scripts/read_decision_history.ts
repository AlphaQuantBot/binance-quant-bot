import 'dotenv/config';
import path from 'node:path';
import {readDecisionWatchHistory} from '../src/server/decisionWatchJournal';
try{
 const argument=process.argv[2]??'5';
 if(process.argv.length>3)throw Error('DECISION_WATCH_HISTORY_INVALID');
 const isLimit=/^[1-9][0-9]?$/.test(argument);
 const scoped=path.resolve(process.env.APP_TESTNET_SCOPED_JOURNAL??'.testnet_scoped/sandbox.sqlite');
 const rows=readDecisionWatchHistory(path.join(path.dirname(scoped),'decision-watch.sqlite'),isLimit?Number(argument):5,isLimit?undefined:argument);
 console.log(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_DECISION_HISTORY',sessions:rows,
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2));
}catch(error){
 const allowed=['DECISION_WATCH_HISTORY_INVALID','DECISION_WATCH_HISTORY_MISSING'];
 const code=error instanceof Error&&allowed.includes(error.message)?error.message:'DECISION_WATCH_HISTORY_UNCONFIRMED';
 console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_DECISION_HISTORY',code,
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2));process.exitCode=1;
}
