import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {importTS} from '../load-module.mjs';
const {Tron}=await importTS(new URL('../../app/tron.ts',import.meta.url));
let rng=1,maxError=0;const g=new Tron(()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;});
const lines=execFileSync(process.argv[2]||'/private/tmp/tron-reference/tron',[],{encoding:'utf8',maxBuffer:8e6}).trim().split('\n');
lines.forEach((line,i)=>{g.tick(i<100?'23:59':'00:00');const actual=[['duel','erase','approach','trace','return'].indexOf(g.phase),g.activeDigit,g.builder,g.nextBuilder,g.buildX,g.buildY,g.buildDir,g.built,g.traceIndex,...g.shown,...g.bikes.flatMap(b=>[b.x,b.y,b.dir,b.trail.length,+b.dead,b.stepped,b.crashed])],expected=line.split(' ').map(Number);actual.forEach((v,j)=>{if(j===4||j===5){const error=Math.abs(v-expected[j]);maxError=Math.max(maxError,error);assert.ok(error<.002,`tick ${i} field ${j}: ${error}`);}else assert.equal(v,expected[j],`tick ${i} field ${j}`);});});
const result={ticks:lines.length,maxError,scope:'Native helpers: phases, active digit, builder selection, builder position/direction, built segments/trace index, shown digits and both bikes position/direction/trail count/death/step/crash timestamps. Seed 1, four-digit rollover and continued duel; full framebuffer not compared.'};writeFileSync(new URL('../../reports/tron-reference-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
