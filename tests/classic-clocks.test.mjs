import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importTS} from './load-module.mjs';
const {renderClockFrame}=await importTS(new URL('../app/renderer.ts',import.meta.url));
const {classicDate,calendarParts,normalizeDateFormat}=await importTS(new URL('../app/classic-clocks.ts',import.meta.url));
const options={style:'Standard',hour24:true,date:true,blink:false,color:'#64e6ac',zone:'UTC',motion:true,brightness:100,glow:false};
test('classic calendar uses selected timezone for date and weekday at midnight',()=>{
 const d=new Date('2026-09-13T23:30:00Z');assert.equal(classicDate(d,'Australia/Sydney',0),'14/09/2026');assert.equal(calendarParts(d,'Australia/Sydney').weekday,'Monday');assert.equal(calendarParts(d,'UTC').weekday,'Sunday');
 assert.deepEqual([0,1,2,3].map(f=>classicDate(d,'UTC',f)),['13/09/2026','09/13/2026','2026-09-13','13.09.2026']);assert.equal(normalizeDateFormat('3'),0);assert.equal(normalizeDateFormat(99),0);
});
test('Standard removes synthetic seconds and preserves original time/date/weekday bands',()=>{
 const date=new Date('2026-09-13T12:34:01Z');const a=renderClockFrame({},options,0,date).pixels;const b=renderClockFrame({},options,0,new Date(+date+1000)).pixels;assert.deepEqual(a,b);
 assert.ok(a.slice(8*128,29*128).some(p=>p===0x64e6ac));assert.ok(a.slice(38*128,46*128).some(p=>p===0xffffff));assert.ok(a.slice(52*128,60*128).some(p=>p===0xffffff));
 const hidden=renderClockFrame({},{...options,date:false},0,date).pixels;assert.ok(hidden.slice(38*128).every(p=>p===0));
});
test('Large keeps AM/PM at the bottom when date is hidden',()=>{
 const p=renderClockFrame({},{...options,style:'Large',hour24:false,date:false},0,new Date('2026-09-13T00:05:00Z')).pixels;
 assert.ok(p.slice(4*128,36*128).some(v=>v===0x64e6ac));assert.ok(p.slice(54*128).some(v=>v===0xffffff));
 for(let y=54;y<64;y++)assert.ok(p.slice(y*128,y*128+110).every(v=>v===0));
});
