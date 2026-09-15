import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MarioClock,PacmanClock,eatingPaths,gfxFont} from '../app/character-clocks.ts';
const tickUntil=(clock,predicate,max=10000)=>{for(let i=0;i<max;i++){clock.tick();if(predicate())return i;}assert.fail('Animation failed to finish');};
test('Mario waits off-screen and starts only at second 56',()=>{
 const m=new MarioClock();m.updateTime('12:34','12:35',100,55);for(let i=0;i<500;i++)m.tick();assert.equal(m.phase,'idle');assert.equal(m.x,-15);
 m.updateTime('12:34','12:35',100,56);assert.deepEqual(m.queue,[{index:4,value:'5'}]);assert.equal(m.phase,'walking');
 tickUntil(m,()=>m.phase==='jumping');assert.equal(m.x,98);assert.equal(m.displayed,'12:34');
 tickUntil(m,()=>m.hit);assert.equal(m.displayed,'12:35');assert.ok(m.jump<0);assert.equal(m.velocities[4],-3.5);
 tickUntil(m,()=>m.phase==='idle');m.updateTime('12:34','12:35',100,59);assert.equal(m.displayed,'12:35');
});
for(const Clock of [MarioClock,PacmanClock])test(`${Clock.name} rebuilds midnight digits sequentially and returns to idle`,()=>{
 const c=new Clock(()=>.5);c.updateTime('23:59','00:00',100,56);assert.deepEqual(c.queue.map(t=>t.index),[0,1,3,4]);
 let previous=c.displayed;const changed=[];
 for(let i=0;i<10000;i++){c.tick();if(c.displayed!==previous){const positions=[0,1,3,4].filter(j=>previous[j]!==c.displayed[j]);assert.equal(positions.length,1);changed.push(positions[0]);previous=c.displayed;}}
 assert.deepEqual(changed,[0,1,3,4]);assert.equal(c.displayed,'00:00');assert.equal(c.queue.length,0);assert.ok(['patrol','idle'].includes(c.phase));
 c.updateTime('00:00','00:01',101,0);assert.equal(c.displayed,'00:00');
});
test('Pac-Man patrol reverses at bounds and eats/regenerates floor pellets',()=>{
 let seed=1;const p=new PacmanClock(()=>((seed=Math.imul(seed,1664525)+1013904223)>>>0)/2**32);p.updateTime('12:34','12:35',100,20);
 let left=false,right=false,eaten=false;const original=p.pellets;
 for(let i=0;i<1500;i++){p.tick();assert.ok(p.x>=10&&p.x<=118);assert.equal(p.y,56);if(p.x===10)left=true;if(p.x===118)right=true;if(p.pellets.some(x=>!x.active))eaten=true;}
 assert.ok(left&&right&&eaten);assert.notEqual(p.pellets,original);
});
test('Pac-Man consumes each old glyph and defers replacement until returning to patrol',()=>{
 for(let digit=0;digit<10;digit++){
  const p=new PacmanClock(()=>.5);const live='12:3'+digit,next='12:3'+(digit+1)%10;p.updateTime(live,next,100,56);
  tickUntil(p,()=>p.phase==='eating');assert.equal(p.displayed,live);assert.equal(p.eaten.size,1);
  const [col,row]=eatingPaths[digit][0];assert.equal(p.x,103+col*5);assert.equal(p.y,16+row*5);
  tickUntil(p,()=>p.phase==='returning');assert.equal(p.displayed,live);assert.ok(p.eaten.size>5);
  tickUntil(p,()=>p.phase==='patrol');assert.equal(p.displayed,next);assert.equal(p.y,56);assert.equal(p.eaten.size,0);
 }
});
test('replay queues all four slots without changing the time',()=>{
 for(const Clock of [MarioClock,PacmanClock]){const c=new Clock();c.updateTime('12:34','12:35',100,20,true);assert.deepEqual(c.queue.map(t=>t.index),[0,1,3,4]);tickUntil(c,()=>!c.queue.length);assert.equal(c.displayed,'12:34');}
});
test('vendored pellet paths match the ESP32 source when available',()=>{
 const path=new URL('../../AnimatedPixelClock/src/clocks/clock_pacman.cpp',import.meta.url);
 let source;try{source=readFileSync(path,'utf8');}catch{return;}
 source=source.split('static const PathStep eatingPaths')[1].split('// ========== Pac-Man Clock Implementation')[0].replace(/\/\/[^\n]*/g,'');
 const expected=[];let current=[];for(const match of source.matchAll(/\{(\d+),(\d+)\}/g)){if(match[1]==='255'){expected.push(current);current=[];}else current.push([+match[1],+match[2]]);}
 assert.deepEqual(eatingPaths,expected);assert.equal(gfxFont['0'].length,5);
});
// Exercise the actual drawing adapter, including state retained per canvas.
const {drawCharacterClock,resetCharacters}=await import('../app/character-clocks.ts');
const glyphs=[[14,17,17,17,17,17,14],[4,12,4,4,4,4,14],[14,17,1,2,4,8,31],[14,17,1,6,1,17,14],[2,6,10,18,31,2,2],[31,16,30,1,1,17,14],[6,8,16,22,17,17,14],[31,1,2,4,8,8,8],[14,17,17,14,17,17,14],[14,17,17,15,1,2,12]];
for(const style of ['Mario','Pac-Man'])test(`${style} renderer preserves pause state and draws transition frames with valid pixels`,()=>{
 const canvas={};const options={zone:'UTC',hour24:true,motion:true,color:'#123456',date:true,blink:false};
 function draw(t,extra={}){const result=[];drawCharacterClock(canvas,style,t,'12:34','12:35',new Date('2026-09-09T12:34:56Z'),{...options,...extra},glyphs,(x,y,w,h,color)=>{assert.ok([x,y,w,h].every(Number.isFinite));assert.ok(w>0&&h>0);result.push([x,y,w,h,color]);});return result;}
 let snapshot;for(let i=0;i<=60;i++)snapshot=draw(i/60);
 assert.deepEqual(draw(1,{motion:false}),snapshot);assert.deepEqual(draw(1,{motion:false}),snapshot);
 assert.notDeepEqual(draw(1.1),snapshot);
 for(let i=67;i<1800;i++)draw(i/60);
 resetCharacters(canvas,true);const replay=draw(0);assert.ok(replay.length>0);
});
