import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importTS} from './load-module.mjs';
const {Snake,snakeDefaults,normalizeSnake}=await importTS(new URL('../app/snake.ts',import.meta.url));
const {digits,renderClockFrame,resetClock}=await importTS(new URL('../app/renderer.ts',import.meta.url));
const seeded=()=>{let n=1;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};};
test('Snake settings validate saved values and geometry resets safely',()=>{
 assert.deepEqual(normalizeSnake(JSON.parse(JSON.stringify(snakeDefaults))),snakeDefaults);assert.equal(normalizeSnake({snakeSpeed:Infinity,snakeLength:99,snakeShowDate:'yes'}).snakeSpeed,12);assert.equal(normalizeSnake({snakeLength:99}).snakeLength,12);
 const g=new Snake(seeded());g.displayed='12:34';g.configure({...snakeDefaults,snakeWallBorder:true,snakeShowDate:true,snakeLength:12});assert.equal(g.body.length,12);assert.deepEqual(g.bounds,[1,30,4,14]);assert.equal(g.timeY,16);assert.ok(g.body.every(p=>p.y===14));
});
test('Snake follows cardinal grid steps inside its configured arena',()=>{
 for(const border of [false,true]){const g=new Snake(seeded(),{snakeWallBorder:border,snakeShowDate:true});let prior=g.body[0];for(let i=0;i<3000;i++){g.tick('12:34','12:35',100,20,digits);const h=g.body[0],distance=Math.abs(h.x-prior.x)+Math.abs(h.y-prior.y);assert.ok(distance<=1);const [a,b,c,d]=g.bounds;assert.ok(h.x>=a&&h.x<=b&&h.y>=c&&h.y<=d);assert.equal(g.onDigit(h.x,h.y),false);prior=h;}}
});
test('Snake eats digit pellets, vacates the digit and completes a midnight rebuild',()=>{
 const g=new Snake(seeded(),{snakeSpeed:30});const phases=new Set();let eaten=false;
 for(let i=0;i<3500;i++){g.tick('23:59','00:00',100,56,digits);phases.add(g.phase);if(g.pellets.some(p=>!p.active))eaten=true;}
 assert.equal(g.displayed,'00:00');assert.equal(g.phase,'roam');assert.ok(phases.has('eat')&&phases.has('leave'));assert.ok(eaten);
});
test('Snake renderer pauses exactly and replay starts the real digit sequence',()=>{
 const c={},o={style:'Snake',hour24:true,date:true,blink:false,color:'#64e6ac',zone:'UTC',motion:true,brightness:100,glow:false};const date=new Date('2026-09-13T12:34:20Z');
 const frame=(t,options=o)=>renderClockFrame(c,options,t,date).pixels.slice();frame(0);for(let i=1;i<=30;i++)frame(i/60);const paused=frame(.5,{...o,motion:false});assert.deepEqual(frame(1,{...o,motion:false}),paused);assert.notDeepEqual(frame(1.2),paused);
 resetClock(c,true);frame(0);const replay=frame(.02);resetClock(c);const settled=frame(0);assert.notDeepEqual(replay,settled);
});
test('Snake speed changes preserve the body; date and border edits remain renderable during replay',()=>{
 const g=new Snake(seeded());for(let i=0;i<100;i++)g.tick('12:34','12:35',100,20,digits);const body=JSON.stringify(g.body);g.configure({...g.settings,snakeSpeed:30});assert.equal(JSON.stringify(g.body),body);assert.equal(g.interval,50);
 const c={},o={style:'Snake',hour24:false,date:true,blink:false,color:'#64e6ac',zone:'UTC',motion:true,brightness:100,glow:false};resetClock(c,true);renderClockFrame(c,o,0,new Date());renderClockFrame(c,o,.02,new Date());const f=renderClockFrame(c,{...o,snake:{...snakeDefaults,snakeShowDate:true,snakeWallBorder:true}},.04,new Date());assert.ok(f.pixels.some(p=>p===0xffffff));
});
