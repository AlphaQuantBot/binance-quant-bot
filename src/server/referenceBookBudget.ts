/** Per-process read-only preparation estimate. Final freshness checks remain authoritative. */
export class ReferenceBookBudget{
 private samples:number[]=[];
 record(elapsedMs:number){
  if(!Number.isFinite(elapsedMs)||elapsedMs<0||elapsedMs>Number.MAX_SAFE_INTEGER)return;
  this.samples.push(elapsedMs);if(this.samples.length>8)this.samples.shift();
 }
 reserveMs(){
  return this.samples.length?Math.min(1999,Math.max(500,Math.ceil(Math.max(...this.samples))+250)):1000;
 }
 diagnostics(){return {sampleCount:this.samples.length,maxObservedBookReadMs:this.samples.length?Math.max(...this.samples):null,nextReserveMs:this.reserveMs(),marginMs:250};}
}
