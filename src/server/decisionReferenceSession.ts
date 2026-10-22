import {ReferenceBookBudget} from './referenceBookBudget';
import {TestnetReferenceStream} from './testnetReferenceStream';
import type {ReferenceClockEvidence} from './referenceClock';
/** Lazy, one-connection lifetime. A failed connection can never be replaced here. */
export class DecisionReferenceSession{
 readonly bookBudget=new ReferenceBookBudget();
 private stream?:TestnetReferenceStream;private closed=false;
 constructor(private create:(clock:()=>ReferenceClockEvidence)=>TestnetReferenceStream=
  clock=>new TestnetReferenceStream('BTCUSDT',Date.now,undefined,clock)){}
 get(clock:()=>ReferenceClockEvidence){
  if(this.closed)throw Error('STREAM_REFERENCE_CLOSED');
  if(!this.stream)this.stream=this.create(clock);
  else this.stream.setReferenceClock(clock);
  return this.stream;
 }
 close(){if(this.closed)return;this.closed=true;this.stream?.close();}
}
