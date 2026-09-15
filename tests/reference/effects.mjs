import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {importTS} from '../load-module.mjs';
const {Framebuffer}=await importTS(new URL('../../app/framebuffer.ts',import.meta.url));
const {Oscilloscope,scopeDefaults}=await importTS(new URL('../../app/oscilloscope.ts',import.meta.url));
const {Starfield}=await importTS(new URL('../../app/starfield.ts',import.meta.url));
const directory=process.argv[2]||'/private/tmp/effect-reference';
let scopeFrames=0,differingPixels=0;
for(const clock of [0,1])for(const gain of [50,100,200])for(const trail of [0,1,2,3,4])for(const fill of [0,1])for(const flat of [0,1]){
 const data=execFileSync(directory+'/oscilloscope',[clock,gain,trail,fill,flat].map(String));const scope=new Oscilloscope();
 for(let n=0;n<6;n++){
  const frame=new Framebuffer();scope.draw(frame,Uint8Array.from({length:128},(_,i)=>n===0?128:i*(n*2+1)%256),n+1,false,n===0,!!clock,{...scopeDefaults,gain,trail,fill:!!fill,flat:!!flat});
  for(let i=0;i<8192;i++){const c=frame.pixels[i],packed=((c>>8)&0xf800)|((c>>5)&0x7e0)|((c>>3)&31);if(packed!==data.readUInt16LE((n*8192+i)*2))differingPixels++;}scopeFrames++;
 }
}
let seed=1;const stars=new Starfield((lo,hi)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return lo+seed%(hi-lo);});
const rows=execFileSync(directory+'/starfield',{encoding:'utf8'}).trim().split('\n').map(row=>row.trim().split(/\s+/).map(Number));
let maxStateError=0;
rows.forEach((expected,n)=>{
 const raw=new Uint8Array(32).fill(n<10?0:n<70?200:n<110?20:240);stars.draw(new Framebuffer(),Float32Array.from(raw,v=>v/255),raw,Math.floor(n/3)+1,Math.fround(1/60),n===0,false);
 const actual=[stars.drive,stars.boost,stars.cooldown,stars.phase,...stars.stars.flatMap(s=>[s.x,s.y,s.z])];actual.forEach((v,i)=>maxStateError=Math.max(maxStateError,Math.abs(v-expected[i])));
});
console.log(JSON.stringify({scopeFrames,differingPixels,starFrames:rows.length,maxStateError},null,2));assert.equal(differingPixels,0);assert.ok(maxStateError<.001);
