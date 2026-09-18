// Adapted from NickoScope/AnimatedPixelClock, commit 85c9be92 (MIT).
// https://github.com/NickoScope/AnimatedPixelClock/blob/85c9be92a5b33b17c126ab63db6bc2ae7c9cc331/src/viz/wow/viz_frame.cpp
export interface ReactiveAudioFrame {
  level:Float64Array; peak:Float64Array;
  bass:number; mid:number; treble:number; beat:boolean; strength:number;
}
/** Packet-rate analysis; do not feed the same packet once per display frame. */
export class AudioFrameDeriver {
  private previous=new Float64Array(10);
  private havePrevious=false;
  private fluxHistory=new Float64Array(25);
  private bassHistory=new Float64Array(25);
  private length=0; private position=0; private previousFlux=0; private sinceBeat=1;
  private level=new Float64Array(32); private peak=new Float64Array(32);
  private hold=new Float64Array(32); private velocity=new Float64Array(32);
  feed(bands:Uint8Array,dt:number):ReactiveAudioFrame {
    if(bands.length!==32)throw new Error('Expected 32 audio bands');
    dt=Number.isFinite(dt)?Math.max(.01,Math.min(.1,dt)):.01;
    const gated=bands.every(b=>b===0);let bassDb=0,flux=0;
    for(let i=0;i<10;i++){
      const x=bands[i]*38/255;bassDb+=x;
      if(this.havePrevious&&!gated)flux+=Math.max(0,x-this.previous[i]);
      this.previous[i]=x;
    }
    bassDb/=10;flux/=10;this.havePrevious=true;
    let mean=0,sd=0,bassAverage=0;
    for(let i=0;i<this.length;i++){mean+=this.fluxHistory[i];bassAverage+=this.bassHistory[i];}
    if(this.length){mean/=this.length;bassAverage/=this.length;for(let i=0;i<this.length;i++)sd+=(this.fluxHistory[i]-mean)**2;sd=Math.sqrt(sd/this.length);}
    const threshold=Math.max(3,mean+2.5*sd);this.sinceBeat+=dt;
    const beat=!gated&&flux>=threshold&&flux>this.previousFlux&&this.sinceBeat>=.16&&(!this.length||bassDb-bassAverage>=3);
    this.fluxHistory[this.position]=flux;this.bassHistory[this.position]=bassDb;
    this.position=(this.position+1)%25;this.length=Math.min(25,this.length+1);this.previousFlux=flux;
    if(beat)this.sinceBeat=0;
    const attack=1-Math.exp(-dt/.012),release=1-Math.exp(-dt/.2);
    let bass=0,mid=0,treble=0;
    for(let i=0;i<32;i++){
      const target=bands[i]/255;
      this.level[i]+=(target-this.level[i])*(target>this.level[i]?attack:release);
      if(this.level[i]>=this.peak[i]){this.peak[i]=this.level[i];this.hold[i]=.35;this.velocity[i]=0;}
      else if(this.hold[i]>0)this.hold[i]-=dt;
      else{this.velocity[i]+=2.5*dt;this.peak[i]=Math.max(this.level[i],this.peak[i]-this.velocity[i]*dt);}
      if(i<8)bass+=this.level[i];else if(i<24)mid+=this.level[i];else treble+=this.level[i];
    }
    return {level:this.level.slice(),peak:this.peak.slice(),bass:bass/8,mid:mid/16,treble:treble/8,beat,strength:beat?Math.min(1,(flux-threshold)/Math.max(threshold,1e-3)):0};
  }
}
