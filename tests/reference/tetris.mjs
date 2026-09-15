import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {importTS} from '../load-module.mjs';
const {Tetris}=await importTS(new URL('../../app/tetris.ts',import.meta.url));
let maxError=0,frames=0;
for(const small of [0,1])for(const smooth of [0,1])for(const speed of [5,12,30]){
 let rng=1;const g=new Tetris(()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},{tetrisSmallClock:!!small,tetrisSmoothGame:!!smooth,tetrisFallSpeed:speed});
 const rows=execFileSync((process.argv[2]??'/private/tmp/tetris-reference')+'/tetris',[String(small),String(smooth),String(speed)],{encoding:'utf8',maxBuffer:8000000}).trim().split('\n');
 rows.forEach((line,i)=>{g.tick();const expected=line.split(' ').map(Number);const actual=[['delay','moving','clearing'].indexOf(g.phase),g.piece,g.rotation,g.destination,g.row,g.drawRotation,g.column,g.y,...g.board.map(row=>row.reduce((mask,v,x)=>v<0?mask:(mask|2**x)>>>0,0))];
 actual.forEach((v,j)=>{const delta=Math.abs(v-expected[j]);if(j===6||j===7){maxError=Math.max(maxError,delta);assert.ok(delta<.005,`position ${small}/${smooth}/${speed} frame ${i} field ${j}: ${v} vs ${expected[j]}`);}else assert.equal(v,expected[j],`state ${small}/${smooth}/${speed} frame ${i} field ${j}`);});frames++;});
}
const result={frames,scenarios:12,maxPositionError:maxError,scope:'Native gameplay state and occupied rows; not full pixel parity'};writeFileSync(new URL('../../reports/tetris-reference-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
const {digits}=await importTS(new URL('../../app/renderer.ts',import.meta.url));
let digitFrames=0;
for(const style of [0,1])for(const speed of [5,12,30])for(const order of [0,1])for(const datePos of [0,1]){
 let rng=1;const g=new Tetris(()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},{tetrisAnimStyle:style,tetrisFallSpeed:speed,tetrisDotSpeed:speed,tetrisDotOrder:order,tetrisIdleTumble:false,tetrisDatePosition:datePos});g.sync('12:34','12:35',0,56,digits);
 const rows=execFileSync((process.argv[2]??'/private/tmp/tetris-reference')+'/digits',[style,speed,order,datePos].map(String),{encoding:'utf8',maxBuffer:8000000}).trim().split('\n');
 rows.forEach((line,i)=>{g.tickDigits(digits);const e=line.split(' ').map(Number);assert.equal(g.queue[0]?.index??-1,e[0],`digit ${style}/${speed}/${order}/${datePos} tick ${i}`);if(g.queue.length){if(style===0){assert.equal(g.slab,e[1]);assert.ok(Math.abs(g.slabOffset-e[2])<.005);}else{assert.equal(g.dots.length,e[3]);g.dots.forEach((d,k)=>{assert.equal(d.delay,e[4+k*2]);assert.ok(Math.abs(d.y-e[5+k*2])<.005);});}}digitFrames++;});
}
result.digitFrames=digitFrames;result.digitScenarios=24;writeFileSync(new URL('../../reports/tetris-reference-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log({digitFrames});
