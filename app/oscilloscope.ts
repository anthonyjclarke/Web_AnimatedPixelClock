import {Framebuffer,rgb} from './framebuffer';
export type ScopeOptions={grid:boolean;fill:boolean;flat:boolean;trail:number;gain:number;gridColor:string;traceColor:string;peakColor:string};
export const scopeDefaults:ScopeOptions={grid:true,fill:false,flat:false,trail:3,gain:100,gridColor:'#00ff00',traceColor:'#ffff00',peakColor:'#ff0000'};
export const roundAway=(n:number)=>n<0?-Math.round(-n):Math.round(n);
export function rgb565(r:number,g:number,b:number){
 const rr=Math.max(0,Math.min(255,Math.trunc(r)))>>3,gg=Math.max(0,Math.min(255,Math.trunc(g)))>>2,bb=Math.max(0,Math.min(255,Math.trunc(b)))>>3;
 return `rgb(${(rr<<3)|(rr>>2)},${(gg<<2)|(gg>>4)},${(bb<<3)|(bb>>2)})`;
}
function unpack(value:string){const c=rgb(value);return [Math.trunc(((c>>19)&31)*255/31),Math.trunc(((c>>10)&63)*255/63),Math.trunc(((c>>3)&31)*255/31)];}
// Adafruit GFX line tie-breaking, including steep lines and reverse endpoints.
export function gfxLine(frame:Framebuffer,x0:number,y0:number,x1:number,y1:number,color:string){
 const steep=Math.abs(y1-y0)>Math.abs(x1-x0);
 if(steep){[x0,y0]=[y0,x0];[x1,y1]=[y1,x1];}if(x0>x1){[x0,x1]=[x1,x0];[y0,y1]=[y1,y0];}
 const dx=x1-x0,dy=Math.abs(y1-y0),step=y0<y1?1:-1;let error=Math.trunc(dx/2);
 for(;x0<=x1;x0++){if(steep)frame.pixel(y0,x0,color);else frame.pixel(x0,y0,color);error-=dy;if(error<0){y0+=step;error+=dx;}}
}
const f=Math.fround;
// Port of src/viz/oscilloscope.cpp. History advances only on waveform serials.
export class Oscilloscope {
 private history=Array.from({length:4},()=>new Uint8Array(128));
 private used=[false,false,false,false];
 private previous=new Uint8Array(128);
 private head=0;private serial=0;private ever=false;
 get trailCount(){return this.used.filter(Boolean).length;}
 draw(frame:Framebuffer,wave:Uint8Array|null,serial:number,stale:boolean,reset:boolean,clock:boolean,o:ScopeOptions){
  if(reset||!wave||stale){this.used.fill(false);this.head=0;this.serial=serial;this.ever=false;}
  const cy=clock?36.5:31.5,half=clock?26.5:31.5,top=clock?10:0,centre=roundAway(cy);
  const grid=unpack(o.gridColor),trace=unpack(o.traceColor),peak=unpack(o.peakColor);
  if(o.grid){
   const dim=rgb565(...grid.map(v=>Math.trunc(v/5)) as [number,number,number]),axis=rgb565(...grid.map(v=>Math.trunc(v/3)) as [number,number,number]);
   for(let x=16;x<128;x+=16)for(let y=top;y<=63;y+=2)frame.pixel(x,y,dim);
   for(let step=-2;step<=2;step++)if(step)for(let x=0;x<128;x+=2)frame.pixel(x,centre+roundAway(f(step*half/2.5)),dim);
   frame.rect(0,centre,128,1,axis);for(let x=4;x<128;x+=4){frame.pixel(x,centre-1,axis);frame.pixel(x,centre+1,axis);}
  }
  if(!wave||stale)return;
  const depth=o.trail>4?3:Math.max(0,Math.trunc(o.trail));
  if(serial!==this.serial||!this.ever){
   if(this.ever&&depth>0){this.head=(this.head+3)%4;this.history[this.head].set(this.previous);this.used[this.head]=true;}
   this.previous.set(wave);this.serial=serial;this.ever=true;
  }
  const draw=(samples:Uint8Array,light:number)=>{
   let previousY=0;
   for(let x=0;x<128;x++){
    const deflect=Math.max(-1,Math.min(1,f(f((samples[x]-128)/128)*f(o.gain/100))));
    const y=roundAway(f(cy-f(deflect*half))),hot=o.flat?0:Math.abs(deflect);
    const mixed=trace.map((v,i)=>f(v+f((peak[i]-v)*hot)));
    const color=rgb565(...mixed.map(v=>Math.trunc(f(v*light))) as [number,number,number]);
    if(o.fill)gfxLine(frame,x,centre,x,y,rgb565(...mixed.map(v=>Math.trunc(f(f(v*light)*f(.45)))) as [number,number,number]));
    if(x)gfxLine(frame,x-1,previousY,x,y,color);else frame.pixel(x,y,color);previousY=y;
   }
  };
  for(let age=depth-1;age>=0;age--){const slot=(this.head+age)%4;if(this.used[slot])draw(this.history[slot],f(f(.38)-f(age*f(.10))));}
  draw(wave,1);
 }
}
