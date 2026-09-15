import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importTS} from './load-module.mjs';
const {Space,spaceDefaults,normalizeSpace}=await importTS(new URL('../app/space.ts',import.meta.url));
const {renderClockFrame,resetClock}=await importTS(new URL('../app/renderer.ts',import.meta.url));
const seed=()=>{let n=1;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};};
test('Space defaults use ship and settings normalize safely across storage',()=>{
 assert.deepEqual(normalizeSpace(JSON.parse(JSON.stringify(spaceDefaults))),spaceDefaults);assert.equal(spaceDefaults.spaceCharacterType,1);const bad=normalizeSpace({spaceCharacterType:9,spacePatrolSpeed:NaN,spaceAttackSpeed:999,spaceLaserSpeed:22,spaceExplosionGravity:'3'});assert.deepEqual(bad,{spaceCharacterType:1,spacePatrolSpeed:5,spaceAttackSpeed:40,spaceLaserSpeed:20,spaceExplosionGravity:5});
});
test('Space patrol reverses at bounds without shooting before second 56',()=>{
 const g=new Space(seed());let reversed=false;for(let i=0;i<2000;i++){g.tick('12:34','12:35',100,20);assert.ok(g.x>=20&&g.x<=108);assert.equal(g.phase,'patrol');assert.equal(g.laser.active,false);if(g.direction<0)reversed=true;}assert.ok(reversed);
});
test('Space swaps a digit on impact, scatters its debris and returns to patrol',()=>{
 const g=new Space(seed());const phases=new Set();let fired=false,hit=false;for(let i=0;i<2400;i++){g.tick('23:59','00:00',100,56);phases.add(g.phase);if(g.laser.active){fired=true;assert.ok(g.laser.y-g.laser.length>40);}if(g.fragments.some(p=>p.active))hit=true;}
 assert.ok(fired&&hit);assert.equal(g.displayed,'00:00');assert.equal(g.phase,'patrol');assert.ok(['sliding','shooting','exploding','next','returning'].every(p=>phases.has(p)));assert.ok(g.fragments.every(p=>!p.active));
});
test('Space appearance/speed changes preserve attack state and replay clears old debris',()=>{
 const g=new Space(seed());for(let i=0;i<60;i++)g.tick('12:34','12:35',100,56);const state=[g.phase,g.x,g.current,g.displayed];g.configure({...spaceDefaults,spaceCharacterType:0,spaceLaserSpeed:80});assert.deepEqual([g.phase,g.x,g.current,g.displayed],state);g.tick('12:34','12:35',100,20,true);assert.equal(g.queue.length,4);assert.equal(g.current,0);assert.ok(g.fragments.every(p=>!p.active));
});
test('Space renderer freezes on pause and exposes both native character shapes',()=>{
 const c={},date=new Date('2026-09-13T12:34:20Z'),o={style:'Space Invaders',hour24:true,date:true,blink:false,color:'#64e6ac',zone:'UTC',motion:true,brightness:100,glow:false};const draw=(t,options=o)=>renderClockFrame(c,options,t,date).pixels.slice();draw(0);for(let i=1;i<30;i++)draw(i/60);const paused=draw(.5,{...o,motion:false});assert.deepEqual(draw(1,{...o,motion:false}),paused);assert.notDeepEqual(draw(1,{...o,motion:false,space:{...spaceDefaults,spaceCharacterType:0}}),paused);resetClock(c,true);draw(0);assert.ok(draw(.05).some(p=>p===0x00ff00));
});
