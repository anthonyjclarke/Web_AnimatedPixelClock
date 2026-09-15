import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {importTS} from '../load-module.mjs';
const {Matrix,matrixDefaults}=await importTS(new URL('../../app/matrix.ts',import.meta.url));
let ticks=0,maxError=0;
for(const speed of [5,12,30])for(const density of [0,1,2]){
 let rng=1;const g=new Matrix(()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},{...matrixDefaults,matrixRainSpeed:speed,matrixRainDensity:density});g.displayed='23:59';
 const lines=execFileSync(process.argv[2]||'/private/tmp/matrix-reference/matrix',[String(speed),String(density)],{encoding:'utf8',maxBuffer:16e6}).trim().split('\n');
 lines.forEach((line,i)=>{g.tick('23:59','00:00',40,i<100?55:56);const actual=[g.displayed,...g.decode.flatMap((d,j)=>[+d,g.timers[j],g.swaps[j],g.decodeChars[j].charCodeAt(0)]),...g.columns.flatMap((c,j)=>[+c.active,c.headRow,c.speed,c.trailLen,c.respawn,...g.chars[j].map(ch=>ch.charCodeAt(0))])],expected=line.split(' ');actual.forEach((v,j)=>{const message=`${speed}/${density} tick ${i} field ${j}`;if(j===0)assert.equal(v,expected[j],message);else if(j<21?((j-1)%4===0||(j-1)%4===3):([0,3,5,6,7,8,9,10,11,12].includes((j-21)%13)))assert.equal(v,Number(expected[j]),message);else{const error=Math.abs(v-Number(expected[j]));maxError=Math.max(maxError,error);assert.ok(error<.002,`${message}: ${error}`);}});ticks++;});
}
const result={ticks,maxError,scenarios:9,scope:'Original C++ update vs web: displayed time, all decode flags/timers/glyphs, every column active/head/speed/trail/respawn and all 168 rain glyphs. Speeds 5/12/30, densities 0/1/2. Full framebuffer not compared.'};writeFileSync(new URL('../../reports/matrix-reference-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
