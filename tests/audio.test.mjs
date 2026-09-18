import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {importTS} from './load-module.mjs';
const {AudioFrameStore,encodeAudio,effects}=await importTS(new URL('../app/audio-frame.ts',import.meta.url));
const {AudioSpectrum,demoBlock}=await importTS(new URL('../app/audio-spectrum.ts',import.meta.url));
const {Visualizer,vizDefaults}=await importTS(new URL('../app/visualizer.ts',import.meta.url));
const bands=Uint8Array.from({length:32},(_,i)=>i*8),wave=new Uint8Array(128).fill(128);
test('FFT1 validates header/length, owns bytes, and legacy packets invalidate waveform',()=>{
 const store=new AudioFrameStore();const packet=encodeAudio(bands,wave);
 assert.equal(packet.length,164);assert.ok(store.ingest(packet,0));packet.fill(0);assert.deepEqual(store.frame.bands,bands);
 assert.equal(store.frame.serial,1);assert.equal(store.frame.waveSerial,1);
 assert.equal(store.ingest(new Uint8Array(164),100),false);assert.equal(store.frame.serial,1);
 assert.equal(store.ingest(encodeAudio(bands,null).slice(0,35),100),false);
 assert.ok(store.ingest(encodeAudio(bands,null),200));assert.equal(store.frame.waveform,null);assert.equal(store.frame.serial,2);assert.equal(store.frame.waveSerial,1);
 store.clear();assert.equal(store.frame,null);store.ingest(encodeAudio(bands,wave),201);assert.equal(store.frame.serial,3);
 assert.throws(()=>encodeAudio(new Uint8Array(31),wave));
});
test('staleness and forced-mode grace use the firmware boundaries including timestamp zero',()=>{
 const store=new AudioFrameStore();assert.equal(store.eligible(0),false);store.force(0);
 assert.equal(store.eligible(9999),true);assert.equal(store.eligible(10000),false);
 store.ingest(encodeAudio(bands,wave),0);assert.equal(store.stale(2000),false);assert.equal(store.stale(2001),true);
 assert.equal(store.eligible(10000),true);assert.equal(store.eligible(10001),false);store.clear();assert.equal(store.eligible(1),false);
});
test('silence is zero bands and centered waveform; tones select the expected frequency band',()=>{
 const processor=new AudioSpectrum();const silent=processor.process(new Float32Array(1920));assert.ok(silent.slice(4,36).every(v=>v===0));assert.ok(silent.slice(36).every(v=>v===128));
 for(const hz of [90,440,3200]){
  const signal=Float32Array.from({length:1920},(_,i)=>.5*Math.sin(2*Math.PI*hz*i/48000));
  const packet=new AudioSpectrum().process(signal),spectrum=packet.slice(4,36),peak=spectrum.indexOf(Math.max(...spectrum));
  assert.ok(Math.abs(peak-Math.log(hz/50)/Math.log(320)*32)<2);
  assert.ok(packet.slice(36).some(v=>v>230));assert.ok(packet.slice(36).some(v=>v<25));
 }
 assert.throws(()=>processor.process(new Float32Array(4)));
});
test('waveform begins at the first available rising crossing after decimation',()=>{
 const signal=Float32Array.from({length:1920},(_,i)=>i<80?-.25:.25);
 const packet=new AudioSpectrum().process(signal);assert.ok(packet.slice(36).every(v=>v===246));
});
test('deterministic demo yields actual normalized packets',()=>{
 assert.deepEqual(demoBlock(42),demoBlock(42));const packet=new AudioSpectrum().process(demoBlock(42));assert.equal(packet.length,164);assert.ok(packet.slice(4,36).some(v=>v>0));
});
test('effect IDs preserve firmware gap and all seven effects are selectable',()=>{
 assert.deepEqual(effects.map(e=>e.id),[0,1,2,3,5,6,15]);assert.deepEqual(effects.filter(e=>e.available).map(e=>e.id),[0,1,2,3,5,6,15]);
});
test('all available visualizers render audio, silence and a cached corner clock',()=>{
 const clock={zone:'UTC',hour24:true,blink:false};
 for(const {id} of effects.filter(e=>e.available)){
  const renderer=new Visualizer(),store=new AudioFrameStore();store.ingest(encodeAudio(bands,wave),0);
  let frame;for(let t=0;t<1000;t+=16)frame=renderer.render(store,t,{...vizDefaults,effect:id},clock,new Date('2026-09-10T12:34:00Z'));
  assert.equal(frame.pixels.length,8192);assert.ok(frame.pixels.filter(p=>p!==0).length>100);
  const corner=Array.from(frame.pixels).filter((_,i)=>i%128>=94&&i<1280);
  const stale=renderer.render(store,10001,{...vizDefaults,effect:id},clock,null);
  assert.deepEqual(Array.from(stale.pixels).filter((_,i)=>i%128>=94&&i<1280),corner);
  assert.ok(stale.pixels.some((p,i)=>p===0xffffff&&i>=28*128&&i<36*128));
 }
});
test('audio worklet downmixes and emits only complete 40 ms blocks',()=>{
 for(const rate of [44100,48000,96000]){
  let Capture;const packets=[];
  class Processor{port={postMessage:block=>packets.push(block.slice())};}
  vm.runInNewContext(readFileSync(new URL('../public/audio-capture.js',import.meta.url),'utf8'),{AudioWorkletProcessor:Processor,registerProcessor:(_,klass)=>Capture=klass,sampleRate:rate,Float32Array});
  const capture=new Capture();
  for(let i=0;i<Math.ceil(rate*.08/128);i++)capture.process([[new Float32Array(128).fill(.5),new Float32Array(128).fill(-.25)]]);
  assert.equal(packets.length,2);assert.ok(packets.every(p=>p.length===1920&&p.every(v=>v===.125)));
 }
});

// A worklet message can be dispatched after the rAF timestamp was assigned,
// but before its callback runs. Reproduce after the initial forced grace ends.
test('new audio arriving after the rAF timestamp never selects the clock for one frame',()=>{
 const store=new AudioFrameStore();store.force(0);
 for(let i=0;i<120;i++){
  const raf=12000+i*40;
  store.ingest(encodeAudio(bands,wave),raf+2);
  assert.equal(store.eligible(raf),true);
  assert.equal(store.stale(raf),false);
  assert.equal(store.eligible(raf+3),true);
 }
 const last=12000+119*40+2;
 assert.equal(store.stale(last+2001),true);
 assert.equal(store.eligible(last+10000),true);
 assert.equal(store.eligible(last+10001),false);
 store.clear();assert.equal(store.eligible(last),false);
});
