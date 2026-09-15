import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {importTS} from '../load-module.mjs';
const {Snake}=await importTS(new URL('../../app/snake.ts',import.meta.url));
const {digits}=await importTS(new URL('../../app/renderer.ts',import.meta.url));
let frames=0;
for(const speed of [5,12,30])for(const length of [4,12])for(const border of [0,1])for(const date of [0,1]){
 let rng=1;const game=new Snake(()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},{snakeSpeed:speed,snakeLength:length,snakeWallBorder:!!border,snakeShowDate:!!date});
 const rows=execFileSync('/private/tmp/snake-reference/snake',[speed,length,border,date].map(String),{encoding:'utf8',maxBuffer:8000000}).trim().split('\n');
 rows.forEach((row,i)=>{game.tick('23:59','00:00',40,i<100?55:56,digits);const actual=[['roam','eat','leave'].indexOf(game.phase),game.displayed,game.dx,game.dy,game.targetLength,game.food.x,game.food.y,+game.food.active,game.body.length,...game.body.flatMap(p=>[p.x,p.y]),game.pellets.length,...game.pellets.flatMap(p=>[p.x,p.y,+p.active])].join(' ');assert.equal(actual,row,`scenario ${speed}/${length}/${border}/${date} tick ${i}`);frames++;});
}
const result={scenarios:24,frames,stateDifferences:0,scope:'Native phases, displayed digits, direction, target length, food, body and digit pellets; bounce/display stubbed'};writeFileSync(new URL('../../reports/snake-reference-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
