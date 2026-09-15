import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importTS} from './load-module.mjs';
const {Framebuffer,FramePresenter}=await importTS(new URL('../app/framebuffer.ts',import.meta.url));
const {PlaybackClock,FixedStepClock,CachedWallTime}=await importTS(new URL('../app/frame-time.ts',import.meta.url));
const {renderClockFrame,styles}=await importTS(new URL('../app/renderer.ts',import.meta.url));
const options={style:'Tetris',brightness:85,hour24:true,date:true,blink:false,glow:true,zone:'UTC',color:'#64e6ac',motion:true};
const date=new Date('2026-09-09T12:34:20Z');
test('framebuffer clips pixels without wrapping to another row',()=>{
 const f=new Framebuffer();f.clear('#000000');f.rect(-1,-1,3,3,'#fff');f.pixel(128,0,'#f00');f.pixel(-1,2,'#f00');
 assert.equal(f.pixels.filter(p=>p===0xffffff).length,4);assert.ok(!f.pixels.includes(0xff0000));
});
test('presentation writes only a completed frame; failed staging leaves visible pixels intact',()=>{
 let staged=0,presented=0,fail=false;const context={fillRect(){if(fail)throw Error('staging failed');staged++;}};
 const surface={width:0,height:0,getContext:()=>context};
 const visible={save(){},restore(){},setTransform(){},drawImage(){assert.equal(staged,8193);presented++;}};
 const target={width:1024,height:512,getContext:()=>visible};const presenter=new FramePresenter(()=>surface);
 const frame=new Framebuffer();frame.clear();presenter.present(target,frame);assert.equal(presented,1);
 fail=true;assert.throws(()=>presenter.present(target,frame));assert.equal(presented,1);
});
test('simulation cadence is independent of refresh rate and pauses do not catch up',()=>{
 for(const rate of [30,60,120]){const clock=new FixedStepClock();let ticks=0;for(let i=0;i<=rate*10;i++)clock.advance(i/rate,true,()=>ticks++);assert.equal(ticks,625);}
 const clock=new PlaybackClock();clock.advance(0,true);clock.advance(1000,true);assert.equal(clock.seconds,.1);clock.advance(50000,false);clock.advance(50016,true);assert.equal(clock.seconds,.116);
 const cache=new CachedWallTime();assert.equal(cache.read(null),null);assert.equal(+cache.read(date),+date);assert.equal(+cache.read(new Date(NaN)),+date);
});
for(const style of styles)test(`${style}: complete frames, cached time, pause, and time-source changes`,()=>{
 const owner={};const opts={...options,style};
 assert.equal(renderClockFrame(owner,opts,0,null),null);
 let frame;for(let i=0;i<=60;i++)frame=renderClockFrame(owner,opts,i/60,date);
 assert.equal(frame.pixels.length,8192);assert.ok(frame.pixels.some(p=>p!==0x0b1014));
 assert.deepEqual(renderClockFrame(owner,opts,1,null).pixels,frame.pixels);
 assert.deepEqual(renderClockFrame(owner,{...opts,motion:false},1,new Date(+date+3600000)).pixels,frame.pixels);
 const other=renderClockFrame(owner,{...opts,zone:'Asia/Tokyo'},1,date);
 assert.ok(other.pixels.some(p=>p!==0x0b1014));
 const resumed=renderClockFrame(owner,opts,1.016,new Date(+date-3600000));assert.ok(resumed.pixels.some(p=>p!==0x0b1014));
});
test('time resynchronization clears obsolete digits while preserving the Tetris well',async()=>{
 const {Tetris}=await importTS(new URL('../app/tetris.ts',import.meta.url));const game=new Tetris();
 game.board[4][3]=2;game.queue=[{index:4,value:'9'}];game.resyncTime('01:02',42);
 assert.equal(game.board[4][3],2);assert.equal(game.displayed,'01:02');assert.deepEqual(game.queue,[]);
});
