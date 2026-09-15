import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {MarioClock,PacmanClock} from '../../app/character-clocks.ts';
let frames=0,maxError=0;
for(const style of ['mario','pacman'])for(const high of [false,true])for(const smooth of [false,true]){
 const walk=high?35:15,patrol=high?30:5,eating=high?50:10,mouth=high?20:5;
 const c=style==='mario'?new MarioClock():new PacmanClock(()=>.5);
 c.configure(style==='mario'?{marioWalkSpeed:walk,marioSmoothAnimation:smooth}:{pacmanSpeed:patrol,pacmanEatingSpeed:eating,pacmanMouthSpeed:mouth});
 const rows=execFileSync('/private/tmp/clock-reference/reference',[style,'23:59','00:00','11',walk,+smooth,patrol,eating,mouth].map(String),{encoding:'utf8'}).trim().split('\n').map(JSON.parse);
 for(const [tick,phase,x,y,frame,shown,final] of rows){c.updateTime('23:59','00:00',100,tick<=11?55:56);c.tick();const phases=style==='mario'?['idle','walking','jumping','leaving']:['patrol','targeting','eating','returning'];const context=`${style}/${high}/${smooth}/${tick}`;assert.equal(c.phase,phases[phase],context);const delta=Math.max(Math.abs(c.x-x),Math.abs((style==='mario'?c.jump:c.y)-y));maxError=Math.max(maxError,delta);assert.ok(delta<.002,context);assert.equal(style==='mario'?c.frame:c.direction,frame,context);assert.equal(style==='mario'?c.displayed:c.mouth,shown,context);if(style==='pacman')assert.equal(c.displayed,final,context);frames++;}
}
const results={frames,scenarios:8,maxPositionError:maxError};writeFileSync(new URL('../../reports/character-settings-reference-results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');console.log(results);
