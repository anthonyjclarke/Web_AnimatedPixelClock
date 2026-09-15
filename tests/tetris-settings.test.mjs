import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importTS} from './load-module.mjs';
const {Tetris}=await importTS(new URL('../app/tetris.ts',import.meta.url));
const {tetrisDefaults,normalizeTetris}=await importTS(new URL('../app/tetris-settings.ts',import.meta.url));
const {digits,renderClockFrame}=await importTS(new URL('../app/renderer.ts',import.meta.url));
const options={style:'Tetris',brightness:85,hour24:true,date:true,blink:false,glow:false,zone:'UTC',color:'#64e6ac',motion:true};
test('Tetris validates persisted options and preserves defaults across JSON storage',()=>{
 assert.deepEqual(normalizeTetris(JSON.parse(JSON.stringify(tetrisDefaults))),tetrisDefaults);
 assert.deepEqual(normalizeTetris(null),tetrisDefaults);
 const value=normalizeTetris({tetrisFallSpeed:999,tetrisDotSpeed:NaN,tetrisSmallClock:'false',tetrisAnimStyle:-10});
 assert.equal(value.tetrisFallSpeed,30);assert.equal(value.tetrisDotSpeed,12);assert.equal(value.tetrisSmallClock,false);assert.equal(value.tetrisAnimStyle,0);
});
test('Tetris date follows native game override and top/bottom geometry',()=>{
 const g=new Tetris();assert.equal(g.dateShown,false);
 g.configure({...tetrisDefaults,tetrisIdleTumble:false,tetrisDatePosition:0});assert.equal(g.dateShown,true);assert.equal(g.timeY,28);
 g.sync('12:34','12:35',0,56,digits);assert.ok(g.dots.every(d=>d.y===14&&d.target>=28));
 g.configure({...g.settings,tetrisDatePosition:1});assert.equal(g.timeY,22);assert.equal(g.queue.length,0);
 const c={};const render=tetris=>renderClockFrame(c,{...options,tetris},0,new Date('2026-09-11T12:34:20Z')).pixels.slice();
 const withDate=render({...tetrisDefaults,tetrisIdleTumble:false});const without=render({...tetrisDefaults,tetrisIdleTumble:false,tetrisShowDate:false});
 assert.notDeepEqual(withDate.slice(56*128),without.slice(56*128));
});
test('small clock forces 13-row game, reads live time, and resets resized well',()=>{
 const g=new Tetris(()=>.5,{tetrisSmallClock:true,tetrisIdleTumble:false});assert.equal(g.rows,13);assert.equal(g.wellTop,12);assert.equal(g.gameOn,true);
 g.sync('12:34','12:35',0,56,digits,true);assert.equal(g.queue.length,0);
 for(let i=0;i<400;i++)g.tick();assert.ok(g.board.some(row=>row.some(c=>c>=0)));
 g.configure(tetrisDefaults);assert.equal(g.board.length,5);assert.ok(g.board.every(row=>row.every(c=>c===-1)));
});
test('slabs rebuild all digits sequentially at both speed bounds, fragments expire, bounce can be disabled',()=>{
 for(const speed of [5,30]){const g=new Tetris(()=>.5,{tetrisAnimStyle:0,tetrisFallSpeed:speed,tetrisDigitBounce:false,tetrisIdleTumble:false});
 g.sync('23:59','00:00',0,56,digits);const seen=new Set();
 for(let i=0;i<1600;i++){seen.add(g.slab);g.tickDigits(digits);}
 assert.equal(g.displayed,'00:00');assert.equal(g.queue.length,0);assert.equal(g.fragments.length,0);assert.ok(seen.has(1)&&seen.has(2));assert.ok(g.velocities.every(v=>v===0));}
});
test('random dots retain every target and change release order; speed changes duration',()=>{
 const make=(speed,order)=>{const g=new Tetris(()=>.3,{tetrisDotSpeed:speed,tetrisDotOrder:order});g.sync('12:34','12:35',0,56,digits);return g;};
 const normal=make(12,0),random=make(12,1);assert.deepEqual(normal.dots.map(d=>[d.x,d.target]),random.dots.map(d=>[d.x,d.target]));assert.notDeepEqual(normal.dots.map(d=>d.delay),random.dots.map(d=>d.delay));
 const duration=g=>{let n=0;while(g.queue.length&&n<3000){g.tickDigits(digits);n++;}return n;};assert.ok(duration(make(30,0))<duration(make(5,0)));
});
test('block-game disable pauses it and solid digits add pixels without resetting gameplay',()=>{
 const g=new Tetris(()=>.5);for(let i=0;i<100;i++)g.tick();g.configure({...g.settings,tetrisIdleTumble:false});const y=g.y;for(let i=0;i<100;i++)g.tick();assert.equal(g.y,y);
 const c={},date=new Date('2026-09-11T12:34:20Z');const count=tetris=>Array.from(renderClockFrame(c,{...options,tetris},0,date).pixels).filter(p=>p===0x64e6ac).length;
 assert.ok(count({...tetrisDefaults,tetrisBlockStyle:1})>count(tetrisDefaults));
});
