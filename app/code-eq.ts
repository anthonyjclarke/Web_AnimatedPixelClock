// Code EQ by Nikolay Miroshnichenko (NickoScope), browser port under MIT.
// https://github.com/NickoScope/AnimatedPixelClock/commit/85c9be92a5b33b17c126ab63db6bc2ae7c9cc331
// Reference: src/viz/wow/wow_matrix.cpp and tools/audiofx/effects_matrix.py.
import {Framebuffer} from './framebuffer';
import {classicFont} from './gfx-font';
import type {ReactiveAudioFrame} from './audio-analysis';
const COLS=21,ROWS=8,CHARSET='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$+-*/=%#&<>@';
function color565(v:number){const r=(v>>11)&31,g=(v>>5)&63,b=v&31;return '#'+[(r<<3)|(r>>2),(g<<2)|(g>>4),(b<<3)|(b>>2)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function rgb565(r:number,g:number,b:number){return color565(((r&248)<<8)|((g&252)<<3)|(b>>3));}
const fade=(pct:number)=>Array.from({length:32},(_,i)=>color565((Math.floor(58*(i+1)*pct/3200)<<5)|Math.floor(8*(i+1)*pct/3200)));
const bright=fade(100),dim=fade(45),headColor=rgb565(216,235,216),peakColor=rgb565(120,200,140);
class XorShift32 {
  private value=2463534242;
  next(){let x=this.value;x^=x<<13;x^=x>>>17;x^=x<<5;this.value=x>>>0;return this.value;}
  uniform(a:number,b:number){return a+(b-a)*this.next()/4294967296;}
}
type Column={active:boolean;head:number;speed:number;trail:number;respawn:number};
export class CodeEq {
  private rng=new XorShift32();
  private chars:string[][]; private stack:string[][];private cols:Column[];
  private glitch=0;private glitchRow=0;private audio:ReactiveAudioFrame|null=null;
  constructor(){
    this.chars=Array.from({length:COLS},()=>Array.from({length:ROWS},()=>this.char()));
    this.cols=Array.from({length:COLS},()=>({active:false,head:0,speed:0,trail:3,respawn:this.rng.uniform(0,1.5)}));
    this.stack=Array.from({length:COLS},()=>Array.from({length:ROWS},()=>this.char()));
  }
  private char(){return CHARSET[this.rng.next()%CHARSET.length];}
  update(audio:ReactiveAudioFrame,beatEnabled=true){this.audio=audio;if(audio.beat&&beatEnabled){this.glitch=.1;this.glitchRow=this.rng.next()%ROWS;}}
  draw(cv:Framebuffer,dt:number){
    if(!this.audio)return;
    dt=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
    const f=this.audio;this.glitch=Math.max(0,this.glitch-dt);
    const chance=Math.trunc(1.2*dt*1000);
    for(let c=0;c<COLS;c++){
      const col=this.cols[c];
      if(!col.active){col.respawn-=dt;if(col.respawn<=0){col.active=true;col.head=0;col.speed=3*this.rng.uniform(.7,1.3);col.trail=3+this.rng.next()%5;col.respawn=0;}continue;}
      const previous=Math.floor(col.head);col.head+=col.speed*(1+2*f.bass)*dt;const h=Math.floor(col.head);
      for(let r=Math.max(0,previous+1);r<=Math.min(h,ROWS-1);r++)this.chars[c][r]=this.char();
      if(h-col.trail>=ROWS){col.active=false;col.respawn=this.rng.uniform(1,3.5);continue;}
      for(let k=1;k<=col.trail;k++){const r=h-k;if(r>=0&&r<ROWS&&this.rng.next()%1000<chance)this.chars[c][r]=this.char();}
    }
    for(let c=0;c<COLS;c++){
      const col=this.cols[c];if(!col.active)continue;const h=Math.floor(col.head);
      for(let k=0;k<=col.trail;k++){const r=h-k;if(r<0||r>=ROWS)continue;const a=Math.max(0,1-(col.head-r)/(col.trail+1));this.glyph(cv,1+c*6,r*8,this.chars[c][r],k===0?dim[31]:dim[Math.min(31,Math.trunc(a*31))]);}
    }
    const stackChance=Math.trunc(1.2*(2+8*f.treble)*dt*1000);
    for(let c=0;c<COLS;c++){
      const x=1+c*6,lo=Math.floor(c*32/COLS),hi=Math.max(lo+1,Math.floor((c+1)*32/COLS));
      let level=f.level[lo];for(let b=lo+1;b<hi;b++)level=Math.max(level,f.level[b]);
      const height=Math.floor(level*ROWS+.5);
      for(let i=0;i<height;i++){
        const r=ROWS-1-i;if(this.rng.next()%1000<stackChance)this.stack[c][r]=this.char();
        cv.rect(x,r*8,6,8,'#000000');this.glyph(cv,x,r*8,this.stack[c][r],i===height-1?headColor:bright[Math.min(31,12+Math.floor(i*19/Math.max(1,height-1)))]);
      }
      const pk=Math.floor(f.peak[lo]*ROWS+.5);
      if(height<pk&&pk<=ROWS){const r=ROWS-pk;cv.rect(x,r*8,6,8,'#000000');this.glyph(cv,x,r*8,this.stack[c][r],peakColor);}
    }
    if(this.glitch>0)for(let c=0;c<COLS;c++){const x=1+c*6,y=this.glitchRow*8;cv.rect(x,y,6,8,'#000000');const ch=this.char(),color=this.rng.next()%3?headColor:bright[20];this.glyph(cv,x,y,ch,color);}
  }
  private glyph(cv:Framebuffer,x:number,y:number,ch:string,color:string){classicFont[ch]?.forEach((bits,xx)=>{for(let yy=0;yy<8;yy++)if(bits&(1<<yy))cv.pixel(x+xx,y+yy,color);});}
}
