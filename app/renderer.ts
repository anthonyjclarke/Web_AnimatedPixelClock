import {Doom,type DoomSettings} from './doom';
import {Bomberman} from './bomberman';
import {createPong,type PongSettings} from './pong';
import {Tron,type TronSettings} from './tron';
import {Matrix,type MatrixSettings} from './matrix';
import {Dino,type DinoSettings} from './dino';
import {Asteroids,type AsteroidsSettings} from './asteroids';
import {Space,type SpaceSettings} from './space';
import {Snake,type SnakeSettings} from './snake';
import {drawClassicClock} from './classic-clocks';
import type {MarioSettings,PacmanSettings} from './character-settings';
import {type TetrisSettings} from './tetris-settings';
import {gfxFont} from './character-clocks';
import {Framebuffer,FramePresenter} from './framebuffer';
import {CachedWallTime,FixedStepClock} from './frame-time';
import {drawCharacterClock,resetCharacters} from './character-clocks';
import {Tetris, rotations, digitX, pieceColors} from './tetris';
const tetrisStates = new WeakMap<HTMLCanvasElement, {game:Tetris;last:number;timing:FixedStepClock;key:string}>();
const doomStates=new WeakMap<HTMLCanvasElement,{game:Doom;timing:FixedStepClock;replay:boolean}>();
const doomReplays=new WeakSet<HTMLCanvasElement>();
const bomberStates=new WeakMap<HTMLCanvasElement,{game:Bomberman;timing:FixedStepClock;replay:boolean}>();
const bomberReplays=new WeakSet<HTMLCanvasElement>();
const pongStates=new WeakMap<HTMLCanvasElement,{game:ReturnType<typeof createPong>;timing:FixedStepClock;replay:boolean}>();
const pongReplays=new WeakSet<HTMLCanvasElement>();
const tronStates=new WeakMap<HTMLCanvasElement,{game:Tron;timing:FixedStepClock;replay:boolean}>();
const tronReplays=new WeakSet<HTMLCanvasElement>();
const matrixStates=new WeakMap<HTMLCanvasElement,{game:Matrix;timing:FixedStepClock;replay:boolean}>();
const matrixReplays=new WeakSet<HTMLCanvasElement>();
const dinoStates=new WeakMap<HTMLCanvasElement,{game:Dino;timing:FixedStepClock;replay:boolean}>();
const dinoReplays=new WeakSet<HTMLCanvasElement>();
const asteroidsStates=new WeakMap<HTMLCanvasElement,{game:Asteroids;timing:FixedStepClock;replay:boolean}>();
const asteroidsReplays=new WeakSet<HTMLCanvasElement>();
const spaceStates=new WeakMap<HTMLCanvasElement,{game:Space;timing:FixedStepClock;replay:boolean}>();
const spaceReplays=new WeakSet<HTMLCanvasElement>();
const snakeStates=new WeakMap<HTMLCanvasElement,{game:Snake;timing:FixedStepClock;replay:boolean}>();
const snakeReplays=new WeakSet<HTMLCanvasElement>();
const tetrisReplays = new WeakSet<HTMLCanvasElement>();
export function resetClock(canvas:HTMLCanvasElement,replay=false){sessions.delete(canvas);doomStates.delete(canvas);if(replay)doomReplays.add(canvas);else doomReplays.delete(canvas);bomberStates.delete(canvas);pongStates.delete(canvas);if(replay){bomberReplays.add(canvas);pongReplays.add(canvas);}else{bomberReplays.delete(canvas);pongReplays.delete(canvas);}tronStates.delete(canvas);if(replay)tronReplays.add(canvas);else tronReplays.delete(canvas);matrixStates.delete(canvas);if(replay)matrixReplays.add(canvas);else matrixReplays.delete(canvas);dinoStates.delete(canvas);if(replay)dinoReplays.add(canvas);else dinoReplays.delete(canvas);asteroidsStates.delete(canvas);if(replay)asteroidsReplays.add(canvas);else asteroidsReplays.delete(canvas);tetrisStates.delete(canvas);snakeStates.delete(canvas);spaceStates.delete(canvas);if(replay)spaceReplays.add(canvas);else spaceReplays.delete(canvas);if(replay)snakeReplays.add(canvas);else snakeReplays.delete(canvas);resetCharacters(canvas,replay);if(replay)tetrisReplays.add(canvas);else tetrisReplays.delete(canvas);}
export const resetTetris=resetClock;
const sessions=new WeakMap<HTMLCanvasElement,{key:string;wall:CachedWallTime;scene:Date|null;last:number;frame:Framebuffer}>();
const presenters=new WeakMap<HTMLCanvasElement,FramePresenter>();
export function renderClock(canvas:HTMLCanvasElement,o:Options,t:number,date:Date|null){
 const frame=renderClockFrame(canvas,o,t,date);if(!frame)return;
 let presenter=presenters.get(canvas);if(!presenter){presenter=new FramePresenter();presenters.set(canvas,presenter);}
 presenter.present(canvas,frame);
}
export function renderClockFrame(canvas:HTMLCanvasElement,o:Options,t:number,candidate:Date|null):Framebuffer|null{
 const key=o.style+':'+o.zone+':'+o.hour24;
 let state=sessions.get(canvas);
 if(!state||state.key!==key||t<state.last){resetClock(canvas,tetrisReplays.has(canvas));state={key,wall:new CachedWallTime(),scene:null,last:t,frame:new Framebuffer()};sessions.set(canvas,state);}
 const wall=state.wall.read(candidate);if(!wall)return state.scene?state.frame:null;
 if(o.motion||!state.scene){
   if(state.scene&&Math.floor(+wall/60000)!==Math.floor(+state.scene/60000)&&(wall.getTime()<state.scene.getTime()||wall.getTime()-state.scene.getTime()>2000)){
     tetrisStates.get(canvas)?.game.resyncTime(timeParts(wall,o).text,Math.floor(wall.getTime()/60000));resetCharacters(canvas);doomStates.delete(canvas);bomberStates.delete(canvas);pongStates.delete(canvas);tronStates.delete(canvas);matrixStates.delete(canvas);dinoStates.delete(canvas);asteroidsStates.delete(canvas);snakeStates.delete(canvas);spaceStates.delete(canvas);
   }
   state.scene=wall;
 }
 state.last=t;
 const next=new Framebuffer();drawFrame(canvas,next,o,t,state.scene!);state.frame=next;return next;
}
export const styles=['Tetris','Mario','Pac-Man','Snake','Space Invaders','Asteroids','Dino Runner','Matrix Rain','TRON','Bomberman','Pong','Doom Fire','Standard','Large'];
export type Options={style:string;brightness:number;hour24:boolean;date:boolean;blink:boolean;glow:boolean;zone:string;color:string;motion:boolean;dateFormat?:number;doom?:DoomSettings;pong?:PongSettings;tron?:TronSettings;matrix?:MatrixSettings;dino?:DinoSettings;asteroids?:AsteroidsSettings;space?:SpaceSettings;snake?:SnakeSettings;mario?:MarioSettings;pacman?:PacmanSettings;tetris?:TetrisSettings};
// Numerals from the original Tetris / Pac-Man 5 × 7 block font.
export const digits=[[14,17,17,17,17,17,14],[4,12,4,4,4,4,14],[14,17,1,2,4,8,31],[14,17,1,6,1,17,14],[2,6,10,18,31,2,2],[31,16,30,1,1,17,14],[6,8,16,22,17,17,14],[31,1,2,4,8,8,8],[14,17,17,14,17,17,14],[14,17,17,15,1,2,12]];
const letters:Record<string,number[]>={A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],J:[7,2,2,2,18,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,25,21,19,17,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],'-':[0,0,0,31,0,0,0],':':[0,4,4,0,4,4,0],'.':[0,0,0,0,0,4,4]};
const palette=['#50dcec','#7384f5','#f7a94e','#eedb51','#73dc85','#bf7dea','#ee737b'];
export function timeParts(date:Date,o:Options){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:o.zone==='local'?undefined:o.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);let h=Number(parts.find(p=>p.type==='hour')!.value);const m=parts.find(p=>p.type==='minute')!.value;const pm=h>=12;if(!o.hour24)h=h%12||12;return {text:String(h).padStart(2,'0')+':'+m,pm};}
function drawFrame(canvas:HTMLCanvasElement,frame:Framebuffer,o:Options,t:number,date:Date){
 t=Number.isFinite(t)?Math.max(0,t):0;
 frame.clear();
 const pix=frame.pixel.bind(frame),block=frame.rect.bind(frame),line=frame.line.bind(frame);
 const text=(s:string,x:number,y:number,col:string)=>{[...s].forEach((ch,i)=>{const rows=/\d/.test(ch)?digits[Number(ch)]:letters[ch];rows?.forEach((r,yy)=>{for(let xx=0;xx<5;xx++)if(r&(1<<(4-xx)))pix(x+i*6+xx,y+yy,col)})})};
 const sprite=(rows:string[],x:number,y:number,col:string)=>rows.forEach((r,yy)=>[...r].forEach((v,xx)=>{if(v!==' ')pix(x+xx,y+yy,v==='2'?'#ffffff':v==='3'?'#e99563':col)}));
 const style=o.style, tt=timeParts(date,o), sec=date.getSeconds()+date.getMilliseconds()/1000;
 if(style==='Doom Fire'){
 let state=doomStates.get(canvas);if(!state){state={game:new Doom((0x2545f491^Math.floor(t*1000))>>>0,o.doom),timing:new FixedStepClock(),replay:doomReplays.delete(canvas)};state.game.displayed=tt.text;doomStates.set(canvas,state);}
 state.game.configure(o.doom);state.timing.advance(t,o.motion,()=>{state!.game.tick(tt.text,timeParts(new Date(date.getTime()+60000),o).text,Math.floor(date.getTime()/60000),date.getSeconds(),!o.blink||date.getMilliseconds()<500,state!.replay);state!.replay=false;});state.game.draw(frame,date,o,tt.pm);return;
 }
 if(style==='Bomberman'){
 let state=bomberStates.get(canvas);if(!state){state={game:new Bomberman(Math.random),timing:new FixedStepClock(),replay:bomberReplays.delete(canvas)};state.game.shown=tt.text.replace(':','').split('').map(Number);bomberStates.set(canvas,state);}
 state.timing.advance(t,o.motion,()=>{state!.game.tick(tt.text,state!.replay);state!.replay=false;});state.game.draw(frame,date,o,tt.pm);return;
 }
 if(style==='Pong'){
 let state=pongStates.get(canvas);if(!state){state={game:createPong(Math.random,o.pong),timing:new FixedStepClock(),replay:pongReplays.delete(canvas)};state.game.setDisplayed(tt.text);pongStates.set(canvas,state);}
 state.game.configure(o.pong);state.timing.advance(t,o.motion,()=>{state!.game.tick(tt.text,date.getSeconds(),state!.replay);state!.replay=false;});state.game.draw(frame,date,o,tt.pm);return;
 }
 if(style==='TRON'){
 let state=tronStates.get(canvas);if(!state){state={game:new Tron(Math.random,o.tron),timing:new FixedStepClock(),replay:tronReplays.delete(canvas)};state.game.shown=tt.text.replace(':','').split('').map(Number);tronStates.set(canvas,state);}
 state.game.configure(o.tron);state.timing.advance(t,o.motion,()=>{state!.game.tick(tt.text,state!.replay);state!.replay=false;});state.game.draw(frame,date,o,tt.pm);return;
 }
 if(style==='Matrix Rain'){
 let state=matrixStates.get(canvas);if(!state){state={game:new Matrix(Math.random,o.matrix),timing:new FixedStepClock(),replay:matrixReplays.delete(canvas)};state.game.displayed=tt.text;matrixStates.set(canvas,state);}
 state.game.configure(o.matrix);state.timing.advance(t,o.motion,()=>{state!.game.tick(tt.text,timeParts(new Date(date.getTime()+60000),o).text,Math.floor(date.getTime()/60000),date.getSeconds(),state!.replay);state!.replay=false;});state.game.draw(frame,date,o,tt.pm);return;
 }
 if(style==='Dino Runner'){
 let state=dinoStates.get(canvas);if(!state){state={game:new Dino(Math.random,o.dino),timing:new FixedStepClock(),replay:dinoReplays.delete(canvas)};state.game.displayed=tt.text;dinoStates.set(canvas,state);}
 state.game.configure(o.dino);state.timing.advance(t,o.motion,()=>{state!.game.tick(tt.text,timeParts(new Date(date.getTime()+60000),o).text,Math.floor(date.getTime()/60000),date.getSeconds(),state!.replay,o.mario?.marioBounceSpeed);state!.replay=false;});state.game.draw(frame,date,o,tt.pm);return;
 }
 if(style==='Asteroids'){
 let state=asteroidsStates.get(canvas);if(!state){state={game:new Asteroids(Math.random,o.asteroids),timing:new FixedStepClock(),replay:asteroidsReplays.delete(canvas)};state.game.displayed=tt.text;asteroidsStates.set(canvas,state);}
 state.game.configure(o.asteroids);state.timing.advance(t,o.motion,()=>{state!.game.tick(tt.text,timeParts(new Date(date.getTime()+60000),o).text,Math.floor(date.getTime()/60000),date.getSeconds(),digits,state!.replay,o.mario?.marioBounceHeight,o.mario?.marioBounceSpeed);state!.replay=false;});state.game.draw(frame,date,o,tt.pm);return;
 }
 if(style==='Space Invaders'){
   let state=spaceStates.get(canvas);if(!state){state={game:new Space(Math.random,o.space),timing:new FixedStepClock(),replay:spaceReplays.delete(canvas)};state.game.displayed=tt.text;spaceStates.set(canvas,state);}
   state.game.configure(o.space);state.timing.advance(t,o.motion,()=>{state!.game.tick(tt.text,timeParts(new Date(date.getTime()+60000),o).text,Math.floor(date.getTime()/60000),date.getSeconds(),state!.replay);state!.replay=false;});state.game.draw(frame,date,o,tt.pm);return;
 }
 if(style==='Snake'){
   let state=snakeStates.get(canvas);if(!state){state={game:new Snake(Math.random,o.snake),timing:new FixedStepClock(),replay:snakeReplays.delete(canvas)};state.game.displayed=tt.text;snakeStates.set(canvas,state);}
   state.game.configure(o.snake);state.timing.advance(t,o.motion,()=>{state!.game.tick(tt.text,timeParts(new Date(date.getTime()+60000),o).text,Math.floor(date.getTime()/60000),date.getSeconds(),digits,state!.replay,o.mario?.marioBounceHeight,o.mario?.marioBounceSpeed);state!.replay=false;});
   state.game.draw(frame,date,o,tt.pm);return;
 }
 if(style==='Standard'||style==='Large'){drawClassicClock(frame,style==='Large',tt.text,tt.pm,date,o);return;}
 if(style==='Tetris'){
   const key=o.zone+o.hour24;let state=tetrisStates.get(canvas);
   if(!state||state.key!==key||t<state.last){state={game:new Tetris(Math.random,o.tetris),last:t,timing:new FixedStepClock(),key};tetrisStates.set(canvas,state);state.game.sync(tt.text,tt.text,Math.floor(date.getTime()/60000),sec,digits,tetrisReplays.delete(canvas));}
   const game=state.game;game.configure(o.tetris);
   const bs=game.settings.tetrisBlockStyle===1?3:2,ty=game.timeY;
   game.sync(tt.text,timeParts(new Date(date.getTime()+60000),o).text,Math.floor(date.getTime()/60000),sec,digits);
   state.last=t;state.timing.advance(t,o.motion,()=>{game.tick();game.tickDigits(digits);});
   if(!game.settings.tetrisSmallClock)game.displayed.split('').forEach((ch,i)=>{if(i===2){if(!o.blink||sec%1<.5){block(61,ty+6,bs,bs,o.color);block(61,ty+12,bs,bs,o.color);}return;}if(game.queue[0]?.index===i)return;digits[Number(ch)].forEach((row,y)=>{for(let x=0;x<5;x++)if(row&(1<<(4-x)))block(digitX[i]+x*3,ty+y*3+Math.trunc(game.offsets[i]),bs,bs,o.color);});});
   if(!game.settings.tetrisSmallClock){
     if(game.settings.tetrisAnimStyle===1){for(const dot of game.dots)if(game.frame>=dot.delay)block(dot.x,Math.trunc(dot.y),bs,bs,o.color);}
     else if(game.queue[0]){const a=game.queue[0];for(let slab=0;slab<=Math.min(2,game.slab);slab++){const [first,last]=[[4,6],[2,3],[0,1]][slab];for(let y=first;y<=last;y++)for(let x=0;x<5;x++)if(digits[Number(a.value)][y]&(1<<(4-x)))block(digitX[a.index]+x*3,ty+y*3+(slab===game.slab?Math.trunc(game.slabOffset):0),bs,bs,o.color);}}
     for(const f of game.fragments)block(Math.trunc(f.x),Math.trunc(f.y),2,2,o.color);
   }
   if(game.gameOn)game.board.forEach((row,y)=>{if(game.clearRows.includes(y)&&Math.floor(game.flash/5)%2===0)return;row.forEach((piece,x)=>{if(piece>=0)block(x*4,game.wellTop+y*4,3,3,pieceColors[piece]);});});
   if(game.gameOn&&game.phase==='moving')for(const [x,y] of rotations[game.drawRotation].cells){const cx=Math.floor(game.column+.5)+x,py=Math.floor(game.y+.5)+y*4;if(cx>=0&&cx<32&&py>=0&&py<64)block(cx*4,py,3,3,pieceColors[game.piece]);}
   const gfx=(value:string,x:number,y:number,col:string)=>{[...value].forEach((ch,i)=>gfxFont[ch]?.forEach((bits,c)=>{for(let r=0;r<8;r++)if(bits&(1<<r))pix(x+i*6+c,y+r,col);}));};
   if(game.settings.tetrisSmallClock){const bx=game.settings.tetrisSmallClockPos===0?0:94;block(bx,0,34,10,'#000000');gfx(tt.text.replace(':',!o.blink||sec%1<.5?':':' '),bx+3,1,o.color);}
   else {if(game.dateShown){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:o.zone==='local'?undefined:o.zone,day:'2-digit',month:'2-digit',year:'numeric'}).format(date);gfx(parts,34,game.settings.tetrisDatePosition===0?4:56,'#ffffff');}if(!o.hour24)text(tt.pm?'PM':'AM',110,4,'#ffffff');}
   return;
 }
 if(style==='Mario'||style==='Pac-Man'){drawCharacterClock(canvas,style,t,tt.text,timeParts(new Date(date.getTime()+60000),o).text,date,o,digits,block);if(!o.hour24)text(tt.pm?'PM':'AM',110,4,'#ffffff');return;}
 if(o.date){const d=new Intl.DateTimeFormat('en-GB',{timeZone:o.zone==='local'?undefined:o.zone,weekday:'short',day:'2-digit',month:'short'}).format(date).replaceAll(',','').toUpperCase();text(d,Math.floor((128-d.length*6)/2),5,'#72958f')}
 if(!o.hour24)text(tt.pm?'PM':'AM',113,18,'#7e9a96');
 const pitch=3, w=5*pitch, gap=6,total=w*4+pitch+gap*4,x0=Math.floor((128-total)/2),y0=24;
 [...tt.text].forEach((ch,i)=>{let x=x0+i*(w+gap);if(i>2)x-=w-pitch;if(ch===':'){if(!o.blink||sec%1<.5){block(x,y0+pitch,pitch,pitch,o.color);block(x,y0+pitch*5,pitch,pitch,o.color)}return}const rows=digits[Number(ch)];rows.forEach((r,y)=>{for(let xx=0;xx<5;xx++){if(!(r&(1<<(4-xx))))continue;let dy=y0+y*pitch;const transition=Math.min(t,sec);if(style==='Bomberman'&&transition<.6&&((xx+y)%3)===0)continue;const col=o.color;block(x+xx*pitch,dy,pitch-(style==='Bomberman'?1:0),pitch-(style==='Bomberman'?1:0),col)}})});
}
