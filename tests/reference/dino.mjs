import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {importTS} from '../load-module.mjs';
const {Dino,dinoDefaults}=await importTS(new URL('../../app/dino.ts',import.meta.url));
let ticks=0,maxError=0;
for(const speed of [5,12,30])for(const freq of [0,1,2])for(const date of [false,true]){
 let rng=1;const g=new Dino(()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},{...dinoDefaults,dinoSpeed:speed,dinoCactusFreq:freq,dinoShowDate:date});g.displayed='23:59';
 const lines=execFileSync(process.argv[2]||'/private/tmp/dino-reference/dino',[String(speed),String(freq),String(+date)],{encoding:'utf8',maxBuffer:8e6}).trim().split('\n');
 lines.forEach((line,i)=>{g.tick('23:59','00:00',40,i<100?55:56);const p=g.ptero,actual=[['idle','enter','carry','drop'].indexOf(g.phase),g.displayed,g.jumpY,g.jumpVY,+g.airborne,g.legFrame,g.ground,+p.active,p.x,p.y,p.wing,g.current,...g.cacti.flatMap(c=>[+c.active,c.x,+c.tall]),...g.clouds.flatMap(c=>[c.x,c.y]),...g.offsets.flatMap((v,j)=>[v,g.velocities[j]]),...g.dust.flatMap(d=>[+d.active,d.x,d.y,d.vx,d.vy,d.life])],expected=line.split(' ');actual.forEach((v,j)=>{const message=`${speed}/${freq}/${date} tick ${i} field ${j}`;if(j===1)assert.equal(v,expected[j],message);else if([0,4,5,7,10,11,12,14,15,17,18,20,22,24].includes(j)||(j>=35&&(j-35)%6===0))assert.equal(v,Number(expected[j]),message);else{const error=Math.abs(v-Number(expected[j]));maxError=Math.max(maxError,error);assert.ok(error<.002,`${message}: ${error}`);}});ticks++;});
}
const result={ticks,maxError,scenarios:18,scope:'Original C++ update and shared bounce equations vs web: phases, digits, jump, legs, ground, pterodactyl, cacti, clouds, digit offsets/velocities, all dust state. Speeds 5/12/30, frequencies 0/1/2, date off/on. Full framebuffer not compared.'};writeFileSync(new URL('../../reports/dino-reference-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
