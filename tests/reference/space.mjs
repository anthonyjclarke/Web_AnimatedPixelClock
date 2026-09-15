import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {importTS} from '../load-module.mjs';
const {Space,spacePhases,drawSpaceSprite}=await importTS(new URL('../../app/space.ts',import.meta.url));
const {Framebuffer}=await importTS(new URL('../../app/framebuffer.ts',import.meta.url));
let frames=0,maxError=0;
for(const patrol of [2,5,15])for(const attack of [10,40])for(const laser of [20,80])for(const gravity of [3,10]){
 let rng=1;const game=new Space(()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},{spacePatrolSpeed:patrol,spaceAttackSpeed:attack,spaceLaserSpeed:laser,spaceExplosionGravity:gravity});
 const rows=execFileSync('/private/tmp/space-reference/space',[patrol,attack,laser,gravity].map(String),{encoding:'utf8',maxBuffer:12000000}).trim().split('\n');
 rows.forEach((row,i)=>{game.tick('23:59','00:00',40,i<100?55:56);const e=row.split(' ');const actual=[spacePhases.indexOf(game.phase),game.displayed,game.x,game.frame,game.direction,game.current,game.explosionTimer,+game.laser.active,game.laser.x,game.laser.length,...game.fragments.flatMap(p=>[+p.active,p.x,p.y,p.vx,p.vy])];actual.forEach((v,j)=>{const context=`${patrol}/${attack}/${laser}/${gravity} tick ${i} field ${j}`;if(j===1)assert.equal(v,e[j],context);else if([0,3,4,5,6,7].includes(j)||j>=10&&(j-10)%5===0)assert.equal(v,Number(e[j]),context);else{const delta=Math.abs(v-Number(e[j]));maxError=Math.max(maxError,delta);assert.ok(delta<.002,`${context}: ${delta}`);}});frames++;});
}
let spriteFrames=0;for(const type of [0,1])for(const phase of [0,1])for(const x of [-13,-5,64,130,141])for(const y of [-11,0,56,74,75]){const frame=new Framebuffer();frame.clear('#000000');drawSpaceSprite(frame,x,y,phase,type);const native=execFileSync('/private/tmp/space-reference/space',['sprite',x,y,phase,type].map(String));for(let i=0;i<8192;i++)assert.equal(frame.pixels[i],native.readUInt32LE(i*4));spriteFrames++;}
const result={frames,scenarios:24,maxPositionError:maxError,spriteFrames,spritePixelDifferences:0,scope:'Native animation state/fragment trajectories and character rasterization; full scene parity not claimed'};writeFileSync(new URL('../../reports/space-reference-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
