import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {MarioClock,PacmanClock,drawPacmanDigits} from '../../app/character-clocks.ts';
const exe=process.argv[2]||'/private/tmp/clock-reference/reference';
const glyphs=JSON.parse(readFileSync(new URL('file:'+exe+'/../glyphs.json'),'utf8'));
const failures=[];let checked=0,pelletFrames=0;
for(const style of ['mario','pacman'])for(const [live,next] of [['12:34','12:35'],['23:59','00:00'],['11:59','12:00'],['12:59','01:00'],...Array.from({length:10},(_,n)=>['12:3'+n,'12:3'+(n+1)%10])])for(const idle of [0,11]){
 const rows=execFileSync(exe,[style,live,next,String(idle)],{encoding:'utf8'}).trim().split('\n').map(JSON.parse);
 const c=style==='mario'?new MarioClock():new PacmanClock(()=>.5);
 for(const row of rows){const [tick,phase,x,y]=row;c.updateTime(live,next,100,tick<=idle?55:56);c.tick();
  const phases=style==='mario'?['idle','walking','jumping','leaving']:['patrol','targeting','eating','returning'];
  let mask=0;for(const n of c.eaten||[])mask+=2**n;
  const actual=[c.phase,c.x,style==='mario'?c.jump:c.y,style==='mario'?c.frame:c.direction,style==='mario'?c.displayed:c.mouth,style==='mario'?undefined:c.displayed];
  const expected=[phases[phase],x,y,row[4],row[5],row[6]];
  // Masks only meaningful for the old glyph during eating/returning; blank
  // cells in the TS mask are ignored here and tested by framebuffer checks.
  const matches=actual[0]===expected[0]&&Math.trunc(actual[1])===Math.trunc(x)&&Math.trunc(actual[2])===Math.trunc(y)&&Math.abs(actual[1]-x)<.002&&Math.abs(actual[2]-y)<.002&&actual[3]===expected[3]&&actual[4]===expected[4]&&(style==='mario'||actual[5]===expected[5]);
  if(style==='pacman'&&['eating','returning'].includes(c.phase)&&matches){
    const target=c.queue[0].index,value=Number(c.displayed[target]);
    const expectedMask=BigInt(row[7]);
    for(let r=0;r<7;r++)for(let col=0;col<5;col++)if(glyphs[value][r]&(1<<(4-col))){
      const eaten=!!(expectedMask&(1n<<BigInt(r*5+col)));
      if(c.eaten.has(r*5+col)!==eaten)throw new Error(`Pellet mask mismatch ${live} tick ${tick}, ${col},${r}`);
    }
    const frame=new Uint8Array(8192);
    drawPacmanDigits(c,false,'white',glyphs,(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(xx>=0&&xx<128&&yy>=0&&yy<64)frame[yy*128+xx]=1;});
    for(let r=0;r<7;r++)for(let col=0;col<5;col++)if(glyphs[value][r]&(1<<(4-col))){
      const x=[1,30,56,74,103][target]+col*5,y=16+r*5+Math.trunc(c.offsets[target]);
      const eaten=!!(expectedMask&(1n<<BigInt(r*5+col)));
      for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])if(y+dy>=0&&y+dy<64&&frame[(y+dy)*128+x+dx]!==Number(!eaten))throw new Error('Rendered dot does not match firmware mask');
    }
    pelletFrames++;
  }
  if(!matches){failures.push({style,live,next,idle,tick,actual,expected});break;}checked++;
 }
}
console.log(JSON.stringify({checked,pelletFrames,failures:failures.slice(0,12),failedScenarios:failures.length},null,2));
if(failures.length)process.exitCode=1;
