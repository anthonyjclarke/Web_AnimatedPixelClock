import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const moduleURL=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
const tetrisURL=moduleURL(readFileSync(new URL('../app/tetris.ts',import.meta.url),'utf8'));
const {renderClock,resetTetris}=await import(moduleURL(readFileSync(new URL('../app/renderer.ts',import.meta.url),'utf8').replace("'./tetris'",JSON.stringify(tetrisURL))));
const options={style:'Tetris',brightness:85,hour24:true,date:true,blink:false,glow:true,zone:'UTC',color:'#64e6ac',motion:true};
function canvas(){const context={fillStyle:'',calls:[],fillRect(...args){assert.ok(args.every(Number.isFinite));this.calls.push([this.fillStyle,...args]);}};return {width:1024,height:512,getContext(){return context;},context};}
function frame(c,t,o=options){c.context.calls=[];renderClock(c,o,t,new Date('2026-09-09T12:34:20Z'));return c.context.calls;}
test('ordinary entry shows settled digits; explicit replay rebuilds them',()=>{
 const c=canvas();const initial=frame(c,0);assert.ok(initial.filter(r=>r[0]===options.color).length>200);
 resetTetris(c,true);const replay=frame(c,0);assert.ok(replay.filter(r=>r[0]===options.color).length<initial.filter(r=>r[0]===options.color).length);
});
test('pause retains the exact board and falling piece; resume advances it',()=>{
 const c=canvas();for(let i=0;i<=60;i++)frame(c,i/60);
 const paused=frame(c,1,{...options,motion:false});
 for(let i=0;i<60;i++)assert.deepEqual(frame(c,1,{...options,motion:false}),paused);
 assert.notDeepEqual(frame(c,1.1),paused);
});
test('appearance changes preserve game progress and replay resets it',()=>{
 const c=canvas();for(let i=0;i<600;i++)frame(c,i/60);
 const before=frame(c,10).filter(r=>r[0]!==options.color);
 const recolored=frame(c,10,{...options,color:'#ffffff'}).filter(r=>r[0]!=='#ffffff');
 assert.deepEqual(recolored,before);
 resetTetris(c);const reset=frame(c,0);assert.equal(reset.filter(r=>['#00ffff','#ffff00','#840084','#00ff00','#ff0000','#0000ff','#ff8200'].includes(r[0])).length,0);
});
