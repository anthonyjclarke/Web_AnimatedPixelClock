import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {importTS} from '../load-module.mjs';
const {Asteroids,asteroidsDefaults}=await importTS(new URL('../../app/asteroids.ts',import.meta.url));
const {digits}=await importTS(new URL('../../app/renderer.ts',import.meta.url));
let maxError=0,ticks=0;
for(const transparent of [false,true])for(const date of [false,true]){
let rng=1;const g=new Asteroids(()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},{...asteroidsDefaults,asteroidsTransparent:transparent,asteroidsShowDate:date});g.displayed='23:59';
const lines=execFileSync(process.argv[2]||'/private/tmp/asteroids-reference/asteroids',[String(+transparent),String(+date)],{encoding:'utf8'}).trim().split('\n');
lines.forEach((line,i)=>{g.tick('23:59','00:00',40,i<100?55:56,digits);const actual=[['idle','aim','fire','shatter'].indexOf(g.phase),g.displayed,g.ship.x,g.ship.y,g.ship.vx,g.ship.vy,g.ship.heading,+g.thrusting,g.current,+g.bullet.active,...g.rocks.flatMap(r=>[+r.active,+r.big,r.x,r.y])];const expected=line.split(' ');actual.forEach((value,j)=>{if(j===1)assert.equal(value,expected[j]);else if(j===0||j===7||j===8||j===9||(j>=10&&(j-10)%4<2))assert.equal(value,Number(expected[j]),`state ${transparent}/${date} tick ${i} field ${j}`);else{const error=Math.abs(value-Number(expected[j]));maxError=Math.max(maxError,error);assert.ok(error<.02,`position ${transparent}/${date} tick ${i} field ${j}: ${error}`);}});ticks++;});}
const result={ticks,maxError,scope:'Phase, displayed digits, ship position/velocity/heading/thrust, current digit, bullet active flag, rock active/size/position. Default speeds, all date/transparency combinations; host native float versus JavaScript double; 0.02 tolerance. Bounce, full frames and other settings not native-compared.'};
writeFileSync(new URL('../../reports/asteroids-reference-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
