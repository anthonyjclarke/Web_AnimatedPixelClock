import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {importTS} from '../load-module.mjs';
const {Bomberman}=await importTS(new URL('../../app/bomberman.ts',import.meta.url));let rng=1,maxError=0;const g=new Bomberman(()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;});
const lines=execFileSync('/private/tmp/bomberman-reference/bomberman',[],{encoding:'utf8',maxBuffer:8e6}).trim().split('\n');
lines.forEach((line,i)=>{g.tick(i<100?'23:59':'00:00');const a=[['patrol','approach','fuse','blast','build','collect'].indexOf(g.phase),g.heroX,g.heroY,g.heroNode,g.bombNode,g.activeDigit,g.facing,g.route.length,g.routeIndex,...g.crates,g.bonus,g.fuseDuration,...g.shown.flatMap((v,j)=>[v,g.flames.lengths[j],g.flames.digits[j],g.flames.boxes[j]])],b=line.split(' ').map(Number);a.forEach((v,j)=>{if(j===1||j===2){const error=Math.abs(v-b[j]);maxError=Math.max(maxError,error);assert.ok(error<.002,`${i}/${j}: ${error}`);}else assert.equal(v,b[j],`${i}/${j}`);});});
const result={ticks:lines.length,maxError,scope:'Native complete update through display wrapper, drawing stubbed. Phases, hero motion/node, bomb/digit/facing, route counts, crates/bonus/fuse and shown/flame state. Seed 1.'};writeFileSync(new URL('../../reports/bomberman-reference-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
