import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {importTS} from '../load-module.mjs';
const {createMarioEncounters}=await importTS(new URL('../../app/mario-encounters.ts',import.meta.url));
const {marioDefaults}=await importTS(new URL('../../app/character-settings.ts',import.meta.url));
let maxError=0,frames=0;
for(const roll of [10,20,44,50,55,80])for(const speed of [0,1,2])for(const walk of [15,35])for(const seed of [1,999]){
 let first=true,rng=seed;const random=()=>{if(first){first=false;return roll/100;}rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 const host={settings:{...marioDefaults,marioEncounterSpeed:speed,marioWalkSpeed:walk},x:-15,jump:0,velocity:0,facingRight:true,frame:0,phase:'idle',offsets:[0,0,0,0,0],triggerBounce:()=>{}};
 const e=createMarioEncounters(host,random);e.start();
 const rows=execFileSync((process.argv[2]??'/private/tmp/encounter-reference')+'/encounters',[roll,speed,walk,seed].map(String),{encoding:'utf8'}).trim().split('\n');
 rows.forEach((row,i)=>{if(host.phase!=='idle')e.step((i+1)*16,0,false);const [phase,x,y,count]=row.split(' ').map(Number);const context=`${roll}/${speed}/${walk} tick ${i}`;assert.equal(['idle','encounterWalking','encounterJumping','encounterShooting','encounterSquash','encounterReturning'].indexOf(host.phase),phase,context);assert.equal(e.count,count,context);const delta=Math.max(Math.abs(host.x-x),Math.abs(host.jump-y));maxError=Math.max(maxError,delta);assert.ok(delta<.01,`${context}: ${delta}`);frames++;});
}
const results={frames,scenarios:72,maxPositionError:maxError,nativeBounceStubbed:true};writeFileSync(new URL('../../reports/encounter-reference-results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');console.log(results);
