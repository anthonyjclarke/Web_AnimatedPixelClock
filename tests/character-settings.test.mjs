import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MarioClock,PacmanClock,drawMarioSprite} from '../app/character-clocks.ts';
import {marioDefaults,pacmanDefaults,normalizeMario,normalizePacman} from '../app/character-settings.ts';
test('character preferences validate types/ranges and survive storage serialization',()=>{
 assert.deepEqual(normalizeMario(JSON.parse(JSON.stringify(marioDefaults))),marioDefaults);assert.deepEqual(normalizePacman(JSON.parse(JSON.stringify(pacmanDefaults))),pacmanDefaults);
 assert.equal(normalizeMario({marioEncounterFreq:3}).marioEncounterFreq,3);assert.equal(normalizeMario({marioWalkSpeed:999}).marioWalkSpeed,35);assert.equal(normalizePacman({pacmanPelletCount:-1}).pacmanPelletCount,0);assert.equal(normalizePacman({pacmanBounceEnabled:'false'}).pacmanBounceEnabled,true);
});
test('pellet changes regenerate immediately, zero disables pellets, even spacing matches firmware',()=>{
 const c=new PacmanClock(()=>.5);c.configure({pacmanPelletCount:4,pacmanPelletRandomSpacing:false});assert.deepEqual(c.pellets.map(p=>p.x),[34,53,72,91]);
 c.configure({pacmanPelletCount:20,pacmanPelletRandomSpacing:false});assert.equal(c.pellets.length,20);
 c.configure({pacmanPelletCount:0});for(let n=0;n<100;n++)c.tick();assert.deepEqual(c.pellets,[]);
});
test('bounce settings affect physics and disabling Pac-Man bounce clears offsets',()=>{
 const c=new MarioClock();c.configure({marioBounceHeight:50,marioBounceSpeed:15});c.triggerBounce(0);assert.equal(c.velocities[0],-5);c.bounce();assert.ok(c.velocities[0]>-5);
 const p=new PacmanClock();p.triggerBounce(0);p.bounce();p.configure({pacmanBounceEnabled:false});assert.equal(p.offsets[0],0);p.triggerBounce(0);assert.equal(p.velocities[0],0);
});
test('smooth walking renders four distinct native strides',()=>{
 const frames=[];for(let frame=0;frame<4;frame++){const pixels=[];drawMarioSprite({x:40,jump:0,phase:'walking',facingRight:true,frame,settings:{...marioDefaults,marioSmoothAnimation:true}},(...args)=>pixels.push(args));frames.push(JSON.stringify(pixels));}assert.equal(new Set(frames).size,4);
});
test('all six idle encounter variations finish, with minute changes taking priority',()=>{
 for(const roll of [.10,.20,.44,.50,.55,.80]){let first=true,rng=1;const c=new MarioClock(()=>{if(first){first=false;return roll;}rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;});c.configure({marioIdleEncounters:true});c.encounters.start();for(let n=0;n<2000&&c.phase!=='idle';n++)c.tick();assert.equal(c.phase,'idle',String(roll));
 c.encounters.start();c.updateTime('12:34','12:35',100,56);assert.equal(c.phase,'walking');assert.equal(c.queue[0].value,'5');}
});
test('frequency controls schedule encounters; disabling them preserves a minute transition',()=>{
 const c=new MarioClock(()=>.5);c.configure({marioIdleEncounters:true,marioEncounterFreq:3});c.updateTime('12:34','12:35',100,10);for(let n=0;n<219;n++)c.tick();assert.ok(c.phase.startsWith('encounter'));
 c.updateTime('12:34','12:35',100,56);c.configure({marioIdleEncounters:false});assert.equal(c.phase,'walking');assert.ok(c.queue.length);
});
