import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {importTS} from '../load-module.mjs';
const {Doom,doomDefaults}=await importTS(new URL('../../app/doom.ts',import.meta.url));let frames=0;
for(const smooth of [false,true])for(const wind of [0,1,2])for(const height of [8,20,40])for(const burn of [false,true]){const date=height===8,ground=height===40?40:13,g=new Doom(0x2545f491,{...doomDefaults,doomSmoothFire:smooth,doomWind:wind,doomFlameHeight:height,doomGroundHeight:ground,doomBurningDigits:burn,doomShowDate:date});g.displayed='12:34';const bytes=execFileSync('/private/tmp/doom-reference/doom',[+smooth,wind,height,ground,+burn,+date].map(String),{maxBuffer:2e6});for(let i=0;i<120;i++){g.tick('12:34','12:35',100,20,true);assert.deepEqual(Buffer.from(g.heat),bytes.subarray(i*8192,(i+1)*8192),`${smooth}/${wind}/${height}/${burn} frame ${i}`);frames++;}}
const result={frames,scenarios:36,heatCellsCompared:frames*8192,scope:'Exact heat-buffer comparison against upstream spread/stamp functions. All winds, smooth and burning digits on/off, digit heights8/20/40, ground13/40 and date layout. Does not compare rendered palette/text or digit transition timing.'};writeFileSync(new URL('../../reports/doom-reference-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
