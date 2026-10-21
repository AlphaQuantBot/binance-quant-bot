import {commitSnapshotMirror,readSnapshot,snapshotExists} from './durableSnapshot';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export type MonitorConfig={symbols:string[];startTime:number;intervalMs:number;settlementLagMs:number;windowMs:number;maxWindowsPerCycle:number};
type Scope={symbol:string;startTime:number;endTime:number};
type RecoveryResult=Scope&{accountId:string;state:string;accountGapClosed:false;dailyRiskAuthorized:false};
type Cursor={symbol:string;nextTime:number;active?:Scope};
export function validateMonitorConfig(c:MonitorConfig){
 if(!c||!Array.isArray(c.symbols)||!c.symbols.length||c.symbols.length>10||new Set(c.symbols).size!==c.symbols.length||c.symbols.some(s=>typeof s!=='string'||!/^[A-Z0-9]{5,24}$/.test(s))||!Number.isSafeInteger(c.startTime)||c.startTime<=0||!Number.isInteger(c.intervalMs)||c.intervalMs<30000||c.intervalMs>60000||!Number.isSafeInteger(c.settlementLagMs)||c.settlementLagMs<30000||c.settlementLagMs>3600000||!Number.isSafeInteger(c.windowMs)||c.windowMs<1000||c.windowMs>900000||!Number.isInteger(c.maxWindowsPerCycle)||c.maxWindowsPerCycle<1||c.maxWindowsPerCycle>2)throw Error('INVALID_MONITOR_CONFIG');
}
/** Durable bounded read scheduler only. Cursors record symbol enumeration, never account-gap closure. */
export class RecoveryMonitor{
 private config:MonitorConfig;private cursors:Cursor[];private turn=0;private lastTick=0;private fd:number;private busy=false;private closed=false;private released=false;
 constructor(private file:string,private accountId:string,config:MonitorConfig,private recover:(s:Scope)=>Promise<RecoveryResult>,private now=Date.now){
  validateMonitorConfig(config);if(!/^testnet_[a-f0-9]{24}$/.test(accountId))throw Error('INVALID_MONITOR_ACCOUNT');this.config={symbols:[...config.symbols].sort(),startTime:config.startTime,intervalMs:config.intervalMs,settlementLagMs:config.settlementLagMs,windowMs:config.windowMs,maxWindowsPerCycle:config.maxWindowsPerCycle};
  this.cursors=this.config.symbols.map(symbol=>({symbol,nextTime:config.startTime}));
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});this.fd=fs.openSync(file+'.lock','wx',0o600);
  try{if(snapshotExists(file)){const d=readSnapshot(file);if(d.version!==1||d.accountId!==accountId||JSON.stringify(d.config)!==JSON.stringify(this.config)||!Array.isArray(d.cursors)||d.cursors.length!==this.cursors.length||!Number.isInteger(d.turn)||d.turn<0||d.turn>=this.cursors.length||!Number.isSafeInteger(d.lastTick)||d.lastTick<0)throw Error('INVALID_MONITOR_STATE');
   this.cursors=d.cursors.map((c:Cursor,i:number)=>{if(c.symbol!==this.config.symbols[i]||!Number.isSafeInteger(c.nextTime)||c.nextTime<this.config.startTime)throw Error('INVALID_MONITOR_CURSOR');if(c.active&&(c.active.symbol!==c.symbol||c.active.startTime!==c.nextTime||!Number.isSafeInteger(c.active.endTime)||c.active.endTime<c.nextTime||c.active.endTime-c.nextTime>=this.config.windowMs))throw Error('INVALID_MONITOR_ACTIVE_SCOPE');return structuredClone(c);});this.turn=d.turn;this.lastTick=d.lastTick;
  }}catch(e){fs.closeSync(this.fd);fs.unlinkSync(file+'.lock');throw e;}
 }
 private persist(){const tmp=this.file+'.'+randomUUID()+'.tmp';let fd:number|undefined;try{fd=fs.openSync(tmp,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({version:1,accountId:this.accountId,config:this.config,cursors:this.cursors,turn:this.turn,lastTick:this.lastTick}));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;commitSnapshotMirror(tmp,this.file);}catch(e){this.closed=true;throw e;}finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
 async tick(maxWork=this.config.maxWindowsPerCycle){
  if(!Number.isInteger(maxWork)||maxWork<0||maxWork>this.config.maxWindowsPerCycle)throw Error('INVALID_MONITOR_CYCLE_BUDGET');
  if(this.closed)throw Error('MONITOR_CLOSED');if(this.busy)throw Error('MONITOR_BUSY');const startedAt=this.now();if(!Number.isSafeInteger(startedAt)||startedAt<this.lastTick||startedAt<this.config.startTime)throw Error('MONITOR_CLOCK_REGRESSED');
  this.busy=true;this.lastTick=startedAt;
  try{
   this.persist();const cutoff=startedAt-this.config.settlementLagMs;const events:Array<Scope&{state:string}>=[];let visited=0;
   while(visited<this.cursors.length&&events.length<maxWork){
    const c=this.cursors[this.turn];visited++;this.turn=(this.turn+1)%this.cursors.length;
    if(!c.active&&c.nextTime>cutoff)continue;
    if(!c.active)c.active={symbol:c.symbol,startTime:c.nextTime,endTime:Math.min(cutoff,c.nextTime+this.config.windowMs-1)};
    const scope=structuredClone(c.active);this.persist(); // Active interval must survive a crash before any read.
    let result:RecoveryResult|undefined;try{result=await this.recover(scope);}catch{/* Retain exact active scope for next poll/restart. */}
    const valid=result&&result.accountId===this.accountId&&result.symbol===scope.symbol&&result.startTime===scope.startTime&&result.endTime===scope.endTime&&result.accountGapClosed===false&&result.dailyRiskAuthorized===false;
    const state=valid&&result?result.state:'READ_UNCONFIRMED';
    const stable=state==='STABLE_SYMBOL_WINDOW';
    events.push({...scope,state:stable?'ENUMERATED':state});
    if(stable){c.nextTime=scope.endTime+1;delete c.active;}
    this.persist();
   }
   this.persist();return {environment:'BINANCE_TESTNET',accountId:this.accountId,startedAt,events,cursors:structuredClone(this.cursors),configuredSymbolsOnly:true,accountGapClosed:false,dailyRiskAuthorized:false};
  }finally{this.busy=false;}
 }
 close(){if(this.busy)throw Error('MONITOR_BUSY');if(this.released)return;this.closed=true;fs.closeSync(this.fd);fs.unlinkSync(this.file+'.lock');this.released=true;}
}
