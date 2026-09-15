import {Oscilloscope,scopeDefaults,type ScopeOptions} from './oscilloscope';
import {Starfield} from './starfield';
import {AudioFrameStore,type EffectId} from './audio-frame';
import {Framebuffer} from './framebuffer';
import {CachedWallTime} from './frame-time';
import {gfxFont} from './character-clocks';
import {timeParts,type Options} from './renderer';
export type VizOptions={effect:EffectId;low:string;mid:string;peak:string;showClock:boolean;scope:ScopeOptions};
export const vizDefaults:VizOptions={effect:0,low:'#00ff00',mid:'#ffff00',peak:'#ff0000',showClock:true,scope:scopeDefaults};
// Quantize through the firmware RGB565 conversion before drawing RGB pixels.
const color=(r:number,g:number,b:number)=>{
  const rr=Math.trunc(r)&248,gg=Math.trunc(g)&252,bb=Math.trunc(b)&248;
  return `rgb(${rr|(rr>>5)},${gg|(gg>>6)},${bb|(bb>>5)})`;
};
const labelFont:Record<string,number[]>={N:[127,4,8,16,127],O:[62,65,65,65,62],A:[126,17,17,17,126],U:[63,64,64,64,63],D:[127,65,65,34,28],I:[0,65,127,65,0],W:[63,64,56,64,63],V:[31,32,64,32,31],E:[127,73,73,73,65]};
function text(frame:Framebuffer,s:string,x:number,y:number){
  [...s].forEach((ch,index)=>(gfxFont[ch]??labelFont[ch])?.forEach((column,xx)=>{for(let yy=0;yy<8;yy++)if(column&(1<<yy))frame.pixel(x+index*6+xx,y+yy,'#ffffff');}));
}
// Firmware effect IDs are explicit; ID 4 is intentionally absent.
export class Visualizer {
  private scope=new Oscilloscope();
 private stars=new Starfield();
 private heights=new Float64Array(32);
  private peaks=new Float64Array(32);
  private velocities=new Float64Array(32);
  private history=Array.from({length:26},()=>new Uint8Array(32));
  private head=0;
  private rowAt=0;
  private previous:number|null=null;
  private style:EffectId|null=null;
  private wall=new CachedWallTime();
  render(store:AudioFrameStore,now:number,o:VizOptions,clock:Options,date:Date|null){
    const frame=new Framebuffer();frame.clear('#000000');
    const reset=o.effect!==this.style||this.previous===null||now-this.previous>250;
    if(reset){this.history.forEach(row=>row.fill(0));this.head=0;this.rowAt=now-40;this.style=o.effect;}
    const dt=Math.min(.1,Math.max(0,(now-(this.previous??now))/1000));this.previous=now;
    const stale=store.stale(now),smooth=o.effect===0?.35:1-Math.exp(-26*dt);
    for(let i=0;i<32;i++){
      const target=stale?0:store.frame!.bands[i]*56/255;
      this.heights[i]+=(target-this.heights[i])*smooth;
      if(this.heights[i]>=this.peaks[i]){this.peaks[i]=this.heights[i];this.velocities[i]=0;}
      else{this.velocities[i]+=60*dt;this.peaks[i]=Math.max(0,this.peaks[i]-this.velocities[i]*dt);}
      if(o.effect===0){
        const h=Math.trunc(this.heights[i]),x=i*4;
        frame.rect(x,64-Math.min(h,28),3,Math.min(h,28),o.low);
        if(h>28)frame.rect(x,64-Math.min(h,45),3,Math.min(h,45)-28,o.mid);
        if(h>45)frame.rect(x,64-h,3,h-45,o.peak);
        if(this.peaks[i]>1)frame.rect(x,63-Math.trunc(this.peaks[i]),3,1,o.peak);
      }
    }
    if(o.effect===1){
      const horizon=o.showClock?36:32;if(o.showClock)frame.rect(0,horizon,128,1,color(45,12,70));
      for(let i=0;i<32;i++){
        const h=Math.trunc(this.heights[i]*24/56),peak=Math.trunc(this.peaks[i]*24/56);
        for(let y=1;y<=h;y++){
          if(y%3===0)continue;const mix=Math.trunc(y*255/24);
          frame.rect(i*4,horizon-y,3,1,color(40+Math.trunc(mix*215/255),235-Math.trunc(mix*185/255),255));
          frame.rect(i*4,horizon+y,3,1,color(100+Math.trunc(mix*100/255),20+Math.trunc(mix*30/255),160));
        }
        if(peak>1){frame.rect(i*4,horizon-peak,3,1,color(210,255,255));frame.rect(i*4,horizon+peak,3,1,color(255,100,210));}
      }
    }
    if(o.effect===2){
      const steps=Math.min(26,Math.floor((now-this.rowAt)/40));
      if(steps>0){this.rowAt=now-(now-this.rowAt)%40;for(let s=0;s<steps;s++){
        this.head=(this.head+25)%26;for(let i=0;i<32;i++)this.history[this.head][i]=stale?0:this.heights[i]*255/56;
      }}
      if(o.showClock)frame.rect(0,10,128,1,color(0,65,34));
      for(let row=0;row<26;row++)for(let i=0;i<32;i++){
        const level=this.history[(this.head+row)%26][i];if(level<5)continue;
        const [r,g,b]=level<128?[0,level*2,Math.trunc(level/2)]:level<208?[(level-128)*2,255,64+level-128]:[255,225-(level-208),80-(level-208)];
        const fade=255-row*7,top=o.showClock?12:0,y=top+Math.trunc(row*(64-top)/26),next=top+Math.trunc((row+1)*(64-top)/26);
        frame.rect(i*4,y,3,next-y,color(Math.trunc(r*fade/255),Math.trunc(g*fade/255),Math.trunc(b*fade/255)));
      }
    }
    if(o.effect===3){
      const bass=this.heights.slice(0,6).reduce((a,b)=>a+b,0)/(6*56),treble=this.heights.slice(24).reduce((a,b)=>a+b,0)/(8*56),phase=(now%60000)*6.2831853/3000;
      for(let i=0;i<32;i++){
        const level=this.heights[i]/56,side=(i-15.5)/15.5,center=7.5+side*side*3.5+Math.sin(i*.28-phase)*(1+bass*2.5),reach=1+level*6+bass*2;
        for(let row=0;row<16;row++){
          const distance=Math.abs(row-center),glow=Math.max(0,1-distance/reach),rim=Math.max(0,1-Math.abs(distance-reach)*1.4),light=Math.min(1,glow*(.2+level*.65)+rim*bass*.4);
          const r=12+Math.trunc(light*210),g=2+Math.trunc(light*24)+Math.trunc(glow*glow*treble*160),b=24+Math.trunc(light*200),x=i*4+1,y=row*4+1;
          frame.rect(x-1,y,4,1,color(Math.trunc(r/4),Math.trunc(g/4),Math.trunc(b/4)));frame.rect(x,y-1,1,4,color(Math.trunc(r/4),Math.trunc(g/4),Math.trunc(b/4)));frame.rect(x,y,2,2,color(r,g,b));
        }
      }
    }
    if(o.effect===6){this.scope.draw(frame,store.frame?.waveform??null,store.frame?.waveSerial??0,stale,reset,o.showClock,o.scope);if(!stale&&!store.frame?.waveform)text(frame,'NO WAVE',43,28);}
    if(o.effect===5)this.stars.draw(frame,Float64Array.from(this.heights,v=>v/56),store.frame?.bands??new Uint8Array(32),store.frame?.serial??0,dt,reset,o.showClock);
    if(stale)text(frame,'NO AUDIO',40,28);
    const wall=this.wall.read(date);
    if(o.showClock&&wall){frame.rect(94,0,34,10,'#000000');const parts=timeParts(wall,clock);text(frame,clock.blink&&wall.getMilliseconds()>=500?parts.text.replace(':',' '):parts.text,97,1);}
    return frame;
  }
}
