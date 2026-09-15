import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importTS} from './load-module.mjs';
const {BrowserAudioInput}=await importTS(new URL('../app/audio-input.ts',import.meta.url));
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('stopping while microphone permission is pending releases a late stream',async()=>{
 const pending=defer();let stopped=0;
 const prior=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>pending.promise}}});
 try{
  const input=new BrowserAudioInput(()=>{});const starting=input.microphone();input.stop();
  pending.resolve({getTracks:()=>[{stop(){stopped++;}}]});await starting;
  assert.equal(stopped,1);assert.equal(input.state.status,'stopped');assert.equal(input.store.frame,null);
 }finally{if(prior)Object.defineProperty(globalThis,'navigator',prior);else delete globalThis.navigator;}
});
test('file capture, pause/resume, source switching and failure release audio nodes',async()=>{
 const contexts=[],nodes=[];
 class Context{
  state='running';audioWorklet={addModule:async()=>{}};destination={};closed=false;
  constructor(){contexts.push(this);}
  async resume(){this.state='running';this.onstatechange?.();}
  async suspend(){this.state='suspended';this.onstatechange?.();}
  async close(){this.closed=true;this.state='closed';}
  async decodeAudioData(){return {};}
  createBufferSource(){return {connect(){},disconnect(){this.disconnected=true;},start(){},stop(){this.stopped=true;},onended:null};}
 }
 class Worklet{port={onmessage:null};constructor(){nodes.push(this);}connect(){}disconnect(){this.disconnected=true;}}
 const priorContext=globalThis.AudioContext,priorNode=globalThis.AudioWorkletNode;
 globalThis.AudioContext=Context;globalThis.AudioWorkletNode=Worklet;
 try{
  const input=new BrowserAudioInput(()=>{});await input.file({name:'test.wav',size:44,arrayBuffer:async()=>new ArrayBuffer(44)});
  assert.equal(input.state.status,'running');nodes[0].port.onmessage({data:new Float32Array(1920)});assert.ok(input.store.frame.waveform);
  await input.pause();assert.equal(input.state.status,'paused');await input.resume();assert.equal(input.state.status,'running');
  input.demo();assert.equal(contexts[0].closed,true);assert.equal(nodes[0].disconnected,true);assert.equal(input.state.kind,'demo');assert.ok(input.store.frame);
  input.stop();assert.equal(input.store.frame,null);assert.equal(input.state.status,'stopped');
  await input.file({name:'bad.wav',size:44,arrayBuffer:async()=>{throw Error('Decode failed');}});
  assert.equal(input.state.status,'error');assert.match(input.state.error,/Decode failed/);assert.equal(contexts[1].closed,true);
 }finally{globalThis.AudioContext=priorContext;globalThis.AudioWorkletNode=priorNode;}
});
