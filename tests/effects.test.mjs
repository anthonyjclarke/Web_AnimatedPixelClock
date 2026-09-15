import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importTS} from './load-module.mjs';
const {Framebuffer}=await importTS(new URL('../app/framebuffer.ts',import.meta.url));
const {Oscilloscope,scopeDefaults}=await importTS(new URL('../app/oscilloscope.ts',import.meta.url));
const {Starfield}=await importTS(new URL('../app/starfield.ts',import.meta.url));
const makeWave=n=>new Uint8Array(128).fill(n);
test('scope trails advance on new packets only and clear on stale, missing or reset input',()=>{
 for(const depth of [0,1,2,3,4]){
  const scope=new Oscilloscope(),o={...scopeDefaults,trail:depth};
  const draw=(serial,wave=makeWave(140),stale=false,reset=false)=>{const frame=new Framebuffer();scope.draw(frame,wave,serial,stale,reset,false,o);return frame.pixels;};
  draw(1);const once=draw(2,makeWave(160));assert.equal(scope.trailCount,depth===0?0:1);
  for(let i=0;i<120;i++)assert.deepEqual(draw(2,makeWave(160)),once);
  for(let i=3;i<=8;i++)draw(i);assert.equal(scope.trailCount,depth===0?0:4);
  draw(9,null);assert.equal(scope.trailCount,0);draw(10);draw(11);draw(12,makeWave(140),true);assert.equal(scope.trailCount,0);
  draw(13);draw(14);draw(15,makeWave(140),false,true);assert.equal(scope.trailCount,0);
 }
});
test('scope gain reaches exact boundary rows, with and without clock band',()=>{
 for(const clock of [false,true])for(const gain of [50,100,200]){
  const scope=new Oscilloscope(),o={...scopeDefaults,grid:false,gain};
  const frame=new Framebuffer();scope.draw(frame,Uint8Array.from({length:128},(_,i)=>i<64?0:255),1,false,true,clock,o);
  const rows=new Set(Array.from(frame.pixels,(p,i)=>p?Math.floor(i/128):-1).filter(y=>y>=0));
  assert.ok(Math.min(...rows)>=(clock?10:0));assert.ok(Math.max(...rows)<=63);
  if(gain===200){assert.equal(Math.min(...rows),clock?10:0);assert.equal(Math.max(...rows),63);}
 }
});
const makeStars=()=>{let seed=1;return new Starfield((lo,hi)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return lo+seed%(hi-lo);});};
test('starfield reacts once to a beat, never to repeated held packets, and rebaselines after gaps',()=>{
 const stars=makeStars(),frame=new Framebuffer();let serial=1;
 const draw=(value,dt=.04,reset=false,same=false)=>{const raw=new Uint8Array(32).fill(value);stars.draw(frame,Float32Array.from(raw,v=>v/255),raw,same?serial:++serial,dt,reset,false);};
 draw(0,.016,true);draw(240);assert.equal(stars.bursts,1);
 for(let i=0;i<60;i++)draw(240);assert.equal(stars.bursts,1);assert.ok(stars.boost<.001);
 draw(0);draw(240);assert.equal(stars.bursts,2);
 draw(0);for(let i=0;i<10;i++)draw(0,.04,false,true);draw(255);assert.equal(stars.bursts,2);
});
test('duplicate rendering at 30/60/120Hz does not multiply beat detection',()=>{
 for(const hz of [30,60,120]){
  const stars=makeStars();for(let frame=0;frame<hz*2;frame++){
   const time=frame/hz,packet=Math.floor(time*25),value=packet<5?0:220,raw=new Uint8Array(32).fill(value);
   stars.draw(new Framebuffer(),Float32Array.from(raw,v=>v/255),raw,packet+1,1/hz,frame===0,false);
  }assert.equal(stars.bursts,1);
 }
});
test('seeded star trajectories are repeatable and rendered frames remain nonempty',()=>{
 const a=makeStars(),b=makeStars();
 for(let i=0;i<300;i++){
  const raw=new Uint8Array(32).fill(i%100),levels=Float32Array.from(raw,v=>v/255),fa=new Framebuffer(),fb=new Framebuffer();
  a.draw(fa,levels,raw,i+1,1/60,i===0,false);b.draw(fb,levels,raw,i+1,1/60,i===0,false);
  assert.deepEqual(fa.pixels,fb.pixels);assert.ok(fa.pixels.some(Boolean));assert.equal(a.stars.length,96);
 }
});
