// Simulation time never depends on the displayed clock or timezone.
export class PlaybackClock {
  seconds=0;
  private previous:number|null=null;
  advance(timestamp:number,running:boolean){
    if(!Number.isFinite(timestamp))return this.seconds;
    if(this.previous!==null&&running)this.seconds+=Math.min(.1,Math.max(0,timestamp-this.previous)/1000);
    this.previous=timestamp;
    return this.seconds;
  }
  reset(){this.seconds=0;this.previous=null;}
}
export class FixedStepClock {
  private previous:number|null=null;
  private remainder=0;
  advance(seconds:number,running:boolean,tick:()=>void){
    if(!Number.isFinite(seconds))return;
    if(this.previous!==null&&running)this.remainder+=Math.min(.1,Math.max(0,seconds-this.previous))*1000;
    this.previous=seconds;
    // The epsilon prevents a mathematically exact tick being lost to FP noise.
    while(this.remainder+1e-8>=16){tick();this.remainder=Math.max(0,this.remainder-16);}
  }
}
export class CachedWallTime {
  private last:number|null=null;
  read(candidate:Date|null|undefined):Date|null{
    const value=candidate?.getTime();
    if(value!==undefined&&Number.isFinite(value))this.last=value;
    return this.last===null?null:new Date(this.last);
  }
}
