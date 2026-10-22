import type {runDecisionMonitor} from './scopedDecisionMonitor';
export type MonitorSummary=Awaited<ReturnType<typeof runDecisionMonitor>>;
export type MonitorChild={cycle:number;sessionId:string;status:string|null;summary:{state:string;stopCode?:string|null;requestedCycles:number;completedCycles:number;executionAuthorized:boolean;ordersSubmitted:number;automaticTradingEnabled:boolean}};
export function validateMonitorChildren(children:readonly MonitorChild[],requested:number,final=false){
 if(!Number.isInteger(requested)||requested<1||requested>120||children.length>requested)throw Error('DECISION_WATCH_HISTORY_INVALID');
 const ids=new Set<string>();
 for(let i=0;i<children.length;i++){
  const c=children[i],s=c.summary;
  if(c.cycle!==i+1||ids.has(c.sessionId)||s.requestedCycles!==1||s.executionAuthorized!==false||s.ordersSubmitted!==0||s.automaticTradingEnabled!==false)throw Error('DECISION_WATCH_HISTORY_INVALID');
  ids.add(c.sessionId);
  if(c.status===null){if(final||i!==children.length-1)throw Error('DECISION_WATCH_HISTORY_INVALID');continue;}
  if((c.status==='OBSERVED'&&(s.state!=='COMPLETED'||s.completedCycles!==1))||
   (c.status==='UNAVAILABLE'&&(s.state!=='STOPPED'||s.completedCycles!==0||!['STALE_REFERENCE_PRICE','STREAM_REFERENCE_TIMEOUT'].includes(s.stopCode??'')))||
   (c.status==='STOPPED'&&s.state!=='STOPPED')||(c.status==='INTERRUPTED'&&s.state!=='INTERRUPTED')||
   !['OBSERVED','UNAVAILABLE','STOPPED','INTERRUPTED'].includes(c.status)||
   (i<children.length-1&&!['OBSERVED','UNAVAILABLE'].includes(c.status)))throw Error('DECISION_WATCH_HISTORY_INVALID');
 }
}
export function validateMonitorSummary(summary:MonitorSummary,children:readonly MonitorChild[],requested:number){
 validateMonitorChildren(children,requested,true);
 const observed=children.filter(c=>c.status==='OBSERVED').length,unavailable=children.filter(c=>c.status==='UNAVAILABLE').length,last=children.at(-1);
 if(summary.requestedCycles!==requested||summary.recordedCycles!==children.length||summary.observedCycles!==observed||summary.unavailableCycles!==unavailable||
  JSON.stringify(summary.childSessionIds)!==JSON.stringify(children.map(c=>c.sessionId))||summary.executionAuthorized!==false||summary.ordersSubmitted!==0||
  summary.automaticTradingEnabled!==false||summary.profitabilityAssessed!==false||summary.persistedCycles!==true||
  summary.schedule!=='SERIAL_MINIMUM_60_SECONDS_BETWEEN_ATTEMPT_STARTS')throw Error('DECISION_WATCH_HISTORY_INVALID');
 if(summary.state==='COMPLETED'||summary.state==='COMPLETED_WITH_UNAVAILABLE_CYCLES'){
  if(children.length!==requested||observed+unavailable!==requested||summary.stopCode!==null||
   summary.state!==(unavailable?'COMPLETED_WITH_UNAVAILABLE_CYCLES':'COMPLETED'))throw Error('DECISION_WATCH_HISTORY_INVALID');
 }else if(summary.state==='STOPPED'){
  if(last?.status!=='STOPPED'||summary.stopCode!==last.summary.stopCode)throw Error('DECISION_WATCH_HISTORY_INVALID');
 }else if(summary.state==='INTERRUPTED'){
  if(summary.stopCode!=='OPERATOR_INTERRUPTED')throw Error('DECISION_WATCH_HISTORY_INVALID');
 }else throw Error('DECISION_WATCH_HISTORY_INVALID');
}
