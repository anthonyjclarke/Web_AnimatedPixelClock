import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {importTS} from '../load-module.mjs';
const {renderClockFrame}=await importTS(new URL('../../app/renderer.ts',import.meta.url));
let frames=0;
for(const large of [0,1])for(const hour24 of [0,1])for(const dateFormat of [0,1,2,3])for(const colon of [0,1])for(let day=0;day<7;day++)for(const hour of [0,12,23]){
 const date=new Date(Date.UTC(2026,8,13+day,hour,5,0,colon?0:750));const options={style:large?'Large':'Standard',hour24:!!hour24,dateFormat,date:true,blink:true,color:'#64e6ac',zone:'UTC',motion:true,brightness:100,glow:false};
 const actual=renderClockFrame({},options,0,date).pixels;const bytes=execFileSync('/private/tmp/classic-reference/classic',[large,hour24,dateFormat,colon,day,hour].map(String));for(let i=0;i<8192;i++)assert.equal(actual[i],bytes.readUInt32LE(i*4),`frame ${frames} pixel ${i}`);frames++;
}
const result={frames,pixels:frames*8192,differences:0,scope:'Native Standard/Large display functions, host GFX text rasterization, Wi-Fi connected, valid time'};writeFileSync(new URL('../../reports/classic-reference-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
