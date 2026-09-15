import {Framebuffer} from './framebuffer';
import {rgb565,gfxLine} from './oscilloscope';
type Star={x:number;y:number;z:number};
// Port of src/viz/starfield.cpp; injected RNG makes reference checks repeatable.
export class Starfield {
 readonly stars:Star[]=Array.from({length:96},()=>({x:0,y:0,z:1}));
 drive=0;boost=0;cooldown=0;phase=0;fluxAverage=0;packetAge=0;bursts=0;
 private previousBass=new Float64Array(8);private seenPacket=0;private baseline=new Float64Array(32);
 constructor(private random:(min:number,max:number)=>number=(min,max)=>min+Math.floor(Math.random()*(max-min))){}
 private spawn(star:Star){star.x=this.random(-1000,1001)/1000;star.y=this.random(-1000,1001)/1000;if(Math.abs(star.x)+Math.abs(star.y)<.08)star.x=.12;star.z=this.random(650,1001)/1000;}
 draw(frame:Framebuffer,levels:ArrayLike<number>,raw:Uint8Array,serial:number,dt:number,reset:boolean,clock:boolean){
  let bass=0,mids=0;for(let i=0;i<8;i++)bass+=levels[i]/8;for(let i=8;i<24;i++)mids+=levels[i]/16;
  if(reset){
   for(const star of this.stars){this.spawn(star);star.z=this.random(100,1001)/1000;}
   for(let i=0;i<8;i++)this.previousBass[i]=raw[i]/255;
   this.seenPacket=serial;this.fluxAverage=this.packetAge=0;this.drive=bass;this.boost=this.cooldown=this.phase=0;
   for(let i=0;i<32;i++)this.baseline[i]=levels[i];
  }
  this.cooldown=Math.max(0,this.cooldown-dt);this.boost*=Math.exp(-dt*12);this.packetAge+=dt;
  if(serial!==this.seenPacket){
   let flux=0,rawBass=0,oldBass=0;
   for(let i=0;i<8;i++){const value=raw[i]/255;flux+=Math.max(0,value-this.previousBass[i])/8;rawBass+=value/8;oldBass+=this.previousBass[i]/8;this.previousBass[i]=value;}
   const threshold=Math.max(.035,this.fluxAverage*1.8);
   if(this.packetAge<.25&&rawBass>.12&&rawBass>oldBass+.025&&flux>threshold&&this.cooldown<=0){this.boost=Math.min(1,.4+(flux-threshold)*4);this.cooldown=.16;this.bursts++;}
   if(this.packetAge>=.25)this.fluxAverage=0;else this.fluxAverage+=(flux-this.fluxAverage)*(1-Math.exp(-this.packetAge*2));
   this.packetAge=0;this.seenPacket=serial;
  }
  this.drive+=(bass-this.drive)*(1-Math.exp(-dt*6));this.phase=(this.phase+dt*.22)%6.2831853;
  const cx=63.5+Math.sin(this.phase)*(2+mids*4),cy=(clock?36:31.5)+Math.cos(this.phase*2)*2,speed=.18+this.drive*.65+this.boost*1.60;
  const accents=new Float64Array(32);for(let i=0;i<32;i++){this.baseline[i]+=(levels[i]-this.baseline[i])*(1-Math.exp(-dt*3));accents[i]=Math.min(1,Math.max(0,levels[i]-this.baseline[i])*3);}
  for(let i=0;i<96;i++){
   const star=this.stars[i];star.z-=speed*dt;if(star.z<=.06){this.spawn(star);continue;}
   const px=cx+star.x/star.z*44,py=cy+star.y/star.z*26;if(px<0||px>=128||py<0||py>=64){this.spawn(star);continue;}
   const level=levels[i%32],depth=1-star.z,accent=accents[i%32],light=Math.min(1,.16+depth*.36+level*.28+accent*.10+this.boost*.15);
   const [r,g,b]=(i%32<10?[190,110,255]:i%32<24?[100,220,255]:[255,215,145]).map(v=>Math.trunc(v*light));
   const dx=px-cx,dy=py-cy,distance=Math.hypot(dx,dy),length=Math.min(2+depth*1.5+level*1.5+accent+this.boost*12,distance*.8),fraction=distance>.001?length/distance:0;
   const tx=px-dx*fraction,ty=py-dy*fraction,x=Math.trunc(px),y=Math.trunc(py),mx=Math.trunc((tx+px)*.5),my=Math.trunc((ty+py)*.5);
   gfxLine(frame,Math.trunc(tx),Math.trunc(ty),mx,my,rgb565(Math.trunc(r/4),Math.trunc(g/4),Math.trunc(b/4)));
   gfxLine(frame,mx,my,x,y,rgb565(Math.trunc(r/2),Math.trunc(g/2),Math.trunc(b/2)));
   const white=.5+this.boost*.4;frame.pixel(x,y,rgb565(r+Math.trunc((255-r)*white),g+Math.trunc((255-g)*white),b+Math.trunc((255-b)*white)));
   if(depth>.60&&level>.70)for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]])frame.pixel(x+ox,y+oy,rgb565(Math.trunc(r/3),Math.trunc(g/3),Math.trunc(b/3)));
  }
 }
}
