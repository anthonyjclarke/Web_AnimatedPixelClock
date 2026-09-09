import {Tetris, rotations, digitX, pieceColors} from './tetris';
const tetrisStates = new WeakMap<HTMLCanvasElement, {game:Tetris;last:number;accumulator:number;key:string}>();
const tetrisReplays = new WeakSet<HTMLCanvasElement>();
export function resetTetris(canvas:HTMLCanvasElement,replay=false){tetrisStates.delete(canvas);if(replay)tetrisReplays.add(canvas);else tetrisReplays.delete(canvas);}
export const styles=['Tetris','Mario','Pac-Man','Snake','Space Invaders','Asteroids','Dino Runner','Matrix Rain','TRON','Bomberman','Pong','Standard','Large'];
export type Options={style:string;brightness:number;hour24:boolean;date:boolean;blink:boolean;glow:boolean;zone:string;color:string;motion:boolean};
// Numerals from the original Tetris / Pac-Man 5 × 7 block font.
export const digits=[[14,17,17,17,17,17,14],[4,12,4,4,4,4,14],[14,17,1,2,4,8,31],[14,17,1,6,1,17,14],[2,6,10,18,31,2,2],[31,16,30,1,1,17,14],[6,8,16,22,17,17,14],[31,1,2,4,8,8,8],[14,17,17,14,17,17,14],[14,17,17,15,1,2,12]];
const letters:Record<string,number[]>={A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],J:[7,2,2,2,18,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,25,21,19,17,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],'-':[0,0,0,31,0,0,0],':':[0,4,4,0,4,4,0],'.':[0,0,0,0,0,4,4]};
const palette=['#50dcec','#7384f5','#f7a94e','#eedb51','#73dc85','#bf7dea','#ee737b'];
export function timeParts(date:Date,o:Options){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:o.zone==='local'?undefined:o.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);let h=Number(parts.find(p=>p.type==='hour')!.value);const m=parts.find(p=>p.type==='minute')!.value;const pm=h>=12;if(!o.hour24)h=h%12||12;return {text:String(h).padStart(2,'0')+':'+m,pm};}
export function renderClock(canvas:HTMLCanvasElement,o:Options,t:number,date:Date){
 t=Number.isFinite(t)?Math.max(0,t):0;
 const c=canvas.getContext('2d');if(!c)return;const S=canvas.width/128;c.fillStyle='#030608';c.fillRect(0,0,canvas.width,canvas.height);
 const rect=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x)*S,Math.round(y)*S,w*S,h*S)};
 const pix=(x:number,y:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x)*S+.9,Math.round(y)*S+.9,S-1.8,S-1.8)};
 const block=(x:number,y:number,w:number,h:number,col:string)=>{for(let a=0;a<w;a++)for(let b=0;b<h;b++)pix(x+a,y+b,col)};
 const line=(x:number,y:number,x2:number,y2:number,col:string)=>{const n=Math.max(Math.abs(x2-x),Math.abs(y2-y));for(let i=0;i<=n;i++)pix(x+(x2-x)*i/(n||1),y+(y2-y)*i/(n||1),col)};
 const text=(s:string,x:number,y:number,col:string)=>{[...s].forEach((ch,i)=>{const rows=/\d/.test(ch)?digits[Number(ch)]:letters[ch];rows?.forEach((r,yy)=>{for(let xx=0;xx<5;xx++)if(r&(1<<(4-xx)))pix(x+i*6+xx,y+yy,col)})})};
 const sprite=(rows:string[],x:number,y:number,col:string)=>rows.forEach((r,yy)=>[...r].forEach((v,xx)=>{if(v!==' ')pix(x+xx,y+yy,v==='2'?'#ffffff':v==='3'?'#e99563':col)}));
 for(let x=0;x<128;x++)for(let y=0;y<64;y++)pix(x,y,'#0b1014');
 const style=o.style, tt=timeParts(date,o), sec=date.getSeconds()+date.getMilliseconds()/1000;
 if(style==='Matrix Rain'){for(let x=0;x<128;x+=4){const head=(t*(9+x%7)+x*2)%82;for(let y=0;y<22;y++){const yy=Math.floor(head-y);if(yy>=0&&yy<64){const strength=1-y/23;pix(x,yy,`rgb(0,${Math.round(strength*100)},${Math.round(strength*45)})`);if(y%3===0)pix(x+1,yy,'#0c381d')}}}}
 if(style==='Space Invaders'||style==='Asteroids'){for(let i=0;i<34;i++)pix((i*37+Math.floor(t*(i%3+1)))%128,(i*17)%64,i%4===0?'#657b94':'#243448')}
 if(style==='Tetris'){
   const key=o.zone+o.hour24;let state=tetrisStates.get(canvas);
   if(!state||state.key!==key||t<state.last){state={game:new Tetris(),last:t,accumulator:0,key};tetrisStates.set(canvas,state);state.game.sync(tt.text,tt.text,Math.floor(date.getTime()/60000),sec,digits,tetrisReplays.delete(canvas));}
   const game=state.game;
   game.sync(tt.text,timeParts(new Date(date.getTime()+60000),o).text,Math.floor(date.getTime()/60000),sec,digits);
   state.accumulator+=o.motion?Math.min(.1,Math.max(0,t-state.last))*1000:0;state.last=t;
   while(state.accumulator>=16){game.tick();game.tickDigits(digits);state.accumulator-=16;}
   game.displayed.split('').forEach((ch,i)=>{if(i===2){if(!o.blink||sec%1<.5){block(61,28,2,2,o.color);block(61,34,2,2,o.color);}return;}if(game.queue[0]?.index===i)return;digits[Number(ch)].forEach((row,y)=>{for(let x=0;x<5;x++)if(row&(1<<(4-x)))block(digitX[i]+x*3,22+y*3+game.offsets[i],2,2,o.color);});});
   for(const dot of game.dots)if(game.frame>=dot.delay)block(dot.x,dot.y,2,2,o.color);
   game.board.forEach((row,y)=>{if(game.clearRows.includes(y)&&Math.floor(game.flash/5)%2===0)return;row.forEach((piece,x)=>{if(piece>=0)block(x*4,44+y*4,3,3,pieceColors[piece]);});});
   if(game.phase==='moving')for(const [x,y] of rotations[game.drawRotation].cells){const cx=Math.floor(game.column+.5)+x,py=Math.floor(game.y+.5)+y*4;if(cx>=0&&cx<32&&py>=0&&py<64)block(cx*4,py,3,3,pieceColors[game.piece]);}
   if(!o.hour24)text(tt.pm?'PM':'AM',110,4,o.color);
   return;
 }
 if(o.date){const d=new Intl.DateTimeFormat('en-GB',{timeZone:o.zone==='local'?undefined:o.zone,weekday:'short',day:'2-digit',month:'short'}).format(date).replaceAll(',','').toUpperCase();text(d,Math.floor((128-d.length*6)/2),5,'#72958f')}
 if(!o.hour24)text(tt.pm?'PM':'AM',113,18,'#7e9a96');
 const pitch=style==='Large'?4:3, w=5*pitch, gap=style==='Large'?5:6,total=w*4+pitch+gap*4,x0=Math.floor((128-total)/2),y0=style==='Large'?22:24;
 [...tt.text].forEach((ch,i)=>{let x=x0+i*(w+gap);if(i>2)x-=w-pitch;if(ch===':'){if(!o.blink||sec%1<.5){block(x,y0+pitch,pitch,pitch,o.color);block(x,y0+pitch*5,pitch,pitch,o.color)}return}const rows=digits[Number(ch)];rows.forEach((r,y)=>{for(let xx=0;xx<5;xx++){if(!(r&(1<<(4-xx))))continue;let dy=y0+y*pitch;const transition=Math.min(t,sec);if(style==='Mario')dy-=Math.max(0,Math.sin(Math.min(1,transition/1.5)*Math.PI))*((i+1)*2);else if(style==='Matrix Rain'&&transition<1&&((xx+y)%4)>transition*4)continue;else if(style==='Bomberman'&&transition<.6&&((xx+y)%3)===0)continue;const col=o.color;block(x+xx*pitch,dy,style==='Pac-Man'?1:pitch-(style==='Bomberman'?1:0),style==='Pac-Man'?1:pitch-(style==='Bomberman'?1:0),col)}})});
 const x=(t*13)%150-11,ground=59;
 if(style==='Mario'){for(let i=0;i<128;i+=5){block(i,61,4,2,'#aa693d');pix(i,60,'#eaa36c')}const jump=Math.max(0,Math.sin(t*2))*7;sprite(['   11111','  1111111','  333233',' 33332333','   33333','  11111',' 11111111','331111133','  11111','  11 11',' 111 111'],x,ground-10-jump,'#f27655');sprite(['  111',' 11111','1112111','1111111',' 11 11'],(135-t*7)%145,54,'#b8844f')}
 if(style==='Pac-Man'){for(let i=0;i<128;i+=6)pix(i,55,'#edcb8b');const cx=(t*19)%160-12;c.fillStyle='#f8dc4b';c.beginPath();const mouth=.15+Math.abs(Math.sin(t*9))*.6;c.moveTo((cx+5)*S,55*S);c.arc((cx+5)*S,55*S,5*S,mouth,Math.PI*2-mouth);c.closePath();c.fill();sprite([' 11111 ','1111111','1221221','1221221','1111111','1111111','11 1 11'],cx-17,51,'#ed7283');sprite([' 11111 ','1111111','1221221','1221221','1111111','1111111','11 1 11'],cx-29,51,'#79dbea')}
 if(style==='Snake'){for(let i=0;i<24;i++){const sx=(t*18-i*2+256)%128;block(sx,54+Math.round(Math.sin(sx/13)*4),2,2,i===0?'#d6ffe3':'#55ce83')}block(110,53,2,2,'#fa6f66')}
 if(style==='Space Invaders'){for(let i=0;i<5;i++)sprite([' 1     1 ','  1   1  ',' 1111111 ','112111211','111111111','1 11111 1','1 1   1 1','   1 1   '],7+i*24+Math.sin(t*2)*3,50,palette[i]);block(60,48-(t*20)%28,1,4,'#f8ca68')}
 if(style==='Pong'){const bx=8+Math.abs(((t*38)%224)-112),by=47+Math.abs(((t*17)%24)-12);block(bx,by,2,2,'#eeeac8');block(Math.max(0,Math.min(114,bx-6)),62,14,1,'#72d5e9');for(let i=0;i<12;i++)block(5+i*10,48,8,2,palette[i%7])}
 if(style==='Dino Runner'){line(0,61,127,61,'#4b6a61');sprite(['     111111','     112111','     111111','     111   ','1   11111  ','11 1111    ','1111111    ',' 111111    ','  1111     ','  1 11     ',Math.floor(t*8)%2?' 11  1     ':'  1  11    '],18,49-Math.max(0,Math.sin(t*2))*8,'#afdabd');for(let i=0;i<3;i++){const cx=128-((t*23+i*49)%140);block(cx,52,2,9,'#6ea57a');block(cx-2,54,1,4,'#6ea57a');block(cx+3,52,1,5,'#6ea57a');line(cx-2,57,cx+3,57,'#6ea57a')}}
 if(style==='TRON'){for(let j=0;j<2;j++){const col=j?'#fbad52':'#59d9ef';for(let i=0;i<35;i++){const sx=(t*23+i*(j?-1:1)+256)%128;pix(sx,52+j*7+(Math.floor(sx/22)%2)*3,col)}const cx=(t*23+256)%128;block(cx,51+j*7+(Math.floor(cx/22)%2)*3,4,3,col)}}
 if(style==='Bomberman'){for(let i=0;i<8;i++)block(8+i*16,54,5,5,'#886446');const bx=15+Math.floor(t/3)%7*16;sprite([' 111 ','12221',' 111 ',' 333 ','11 11'],(t*14)%120,53,'#ede9dd');const phase=t%3;if(phase>2.2){line(bx-8,56,bx+8,56,'#ffe48c');line(bx,48,bx,63,'#ff9c43')}else{block(bx,55,3,3,'#98a1b4');pix(bx+2,54,'#ffd773')}}
 if(style==='Asteroids'){const cx=64+Math.sin(t)*40,cy=55;line(cx-4,cy+3,cx,cy-5,'#b5cedd');line(cx,cy-5,cx+4,cy+3,'#b5cedd');line(cx-4,cy+3,cx+4,cy+3,'#b5cedd');line(cx,cy+4,cx,cy+7,'#edaa63');for(let i=0;i<4;i++){const ax=(i*37+t*6)%128,ay=48+(i*7)%13;for(let k=0;k<6;k++)line(ax+Math.cos(k)*4,ay+Math.sin(k)*4,ax+Math.cos(k+1)*4,ay+Math.sin(k+1)*4,'#637c91')}pix(cx,48-(t*20)%25,'#dbf8ff')}
 if(style==='Standard'){const seconds=String(date.getSeconds()).padStart(2,'0');text(seconds,59,53,'#77968e')}
}
