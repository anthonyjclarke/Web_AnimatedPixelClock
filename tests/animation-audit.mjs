// Renderer smoke checks and transition probes; not an ESP32 emulator or visual parity test.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {importTS} from './load-module.mjs';
const {renderClockFrame,styles}=await importTS(new URL('../app/renderer.ts',import.meta.url));
const opts={brightness:85,hour24:true,date:false,blink:false,glow:false,zone:'UTC',color:'#123456',motion:true};
function draw(style,t,date,extra={}){
 const frame=renderClockFrame({},{...opts,style,...extra},t,new Date(date));
 assert.equal(frame.pixels.length,8192);assert.ok(frame.pixels.some(p=>p!==0x0b1014));
 return JSON.stringify(Array.from(frame.pixels,(p,i)=>p===0x123456?i:-1).filter(i=>i>=0));
}
const samples=[0,.1,.5,1,3,10,30,55,56,57,59,60,120,3600];
const dates=['2026-09-09T12:34:55Z','2026-09-09T12:34:56Z','2026-09-09T12:35:00Z','2026-09-09T23:59:59Z','2026-09-10T00:00:00Z'];
const results=[];
for(const style of styles.filter(s=>s!=='Tetris')){
 let frames=0;
 for(const t of samples)for(const date of dates)for(const hour24 of [true,false]){draw(style,t,date,{hour24,date:true});frames++;}
 const before=draw(style,55,'2026-09-09T12:34:55Z');
 const trigger=draw(style,56,'2026-09-09T12:34:56Z');
 const later=draw(style,59,'2026-09-09T12:34:59Z');
 results.push({style,frames,finiteDrawingPassed:true,digitsUnchangedAt56And59:before===trigger&&trigger===later});
}
const result={method:'Mock Canvas drawing checks; source review required for fidelity. Unchanged digits at 56 are only a parity failure for firmware modes triggered at 56.',totalFrames:results.reduce((n,r)=>n+r.frames,0),results};
writeFileSync(new URL('../reports/animation-audit-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
