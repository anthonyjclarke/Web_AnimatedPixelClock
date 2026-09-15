import {execFileSync} from 'node:child_process';
import {drawMarioSprite,drawPacmanSprite} from '../../app/character-clocks.ts';
const palette=['#030608','#ffff00','#ff0000','#0000ff','#ffb6c5','#a42829'];
const rows=execFileSync(process.argv[2]||'/private/tmp/clock-reference/sprites',{encoding:'utf8'}).trim().split('\n');
let pixels=0;const failures=[];
for(const row of rows){const args=row.split(' ');const expected=args.pop(),style=args.shift();const fb=new Uint8Array(8192);
 const paint=(x,y,w,h,color)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(xx>=0&&xx<128&&yy>=0&&yy<64)fb[yy*128+xx]=palette.indexOf(color);};
 if(style==='mario')drawMarioSprite({x:64,jump:-10,facingRight:args[0]==='1',frame:+args[1],phase:args[2]==='1'?'jumping':'walking'},paint);
 else drawPacmanSprite({x:64,y:32,direction:+args[0],mouth:+args[1]},paint);
 const differences=fb.reduce((n,c,i)=>n+(c!==+expected[i]),0);pixels+=fb.length;if(differences)failures.push({style,args,differences});
}
console.log(JSON.stringify({frames:rows.length,pixels,failures},null,2));if(failures.length)process.exitCode=1;
