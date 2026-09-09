import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Tetris,rotations} from '../app/tetris.ts';
const glyphs=[[14,17,17,17,17,17,14],[4,12,4,4,4,4,14],[14,17,1,2,4,8,31],[14,17,1,6,1,17,14],[2,6,10,18,31,2,2],[31,16,30,1,1,17,14],[6,8,16,22,17,17,14],[31,1,2,4,8,8,8],[14,17,17,14,17,17,14],[14,17,17,15,1,2,12]];
function seeded(){let seed=12345;return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
test('all seven pieces tumble, fall and lock without overlap',()=>{
 const game=new Tetris(seeded());const pieces=new Set();let locks=0,spins=0;
 for(let i=0;i<30000;i++){
  const phase=game.phase,rot=game.drawRotation,y=game.y,before=game.board.flat().filter(v=>v>=0).length;
  game.tick();
  if(game.phase==='moving')pieces.add(game.piece);
  if(phase==='moving'){
   if(rot!==game.drawRotation)spins++;
   assert.ok(game.y>=y);
   if(game.phase!=='moving'){
    locks++;assert.equal(game.board.flat().filter(v=>v>=0).length,before+4);
    for(const [x,y] of rotations[game.rotation].cells)assert.equal(game.board[game.row+y][game.destination+x],game.piece);
   }
  }
 }
 assert.equal(pieces.size,7);assert.ok(locks>100);assert.ok(spins>100);
});
test('completed rightmost-column row flashes, clears, and carries colors down',()=>{
 const game=new Tetris(()=>0);game.board[4].fill(2);game.board[4][31]=-1;
 game.board[0][0]=6;game.piece=0;game.rotation=1;game.drawRotation=1;
 game.destination=31;game.column=31;game.row=1;game.y=48;game.phase='moving';
 game.tick();assert.equal(game.phase,'clearing');assert.deepEqual(game.clearRows,[4]);
 for(let i=0;i<15;i++)game.tick();
 assert.equal(game.phase,'delay');assert.equal(game.board[1][0],6);
 assert.equal(game.board[4][31],0);assert.ok(game.board[0].every(v=>v===-1));
});
test('full well resets and delays next piece',()=>{
 const game=new Tetris(()=>0);game.board.forEach(r=>r.fill(1));game.spawn();
 assert.ok(game.board.flat().every(v=>v===-1));assert.equal(game.timer,600);
});
test('minute transition queues only changed digits at second 56 and holds target time',()=>{
 const game=new Tetris();game.sync('12:34','12:35',100,55,glyphs);assert.equal(game.queue.length,0);
 game.sync('12:34','12:35',100,56,glyphs);assert.deepEqual(game.queue,[{index:4,value:'5'}]);
 assert.equal(game.dots[0].target,40);assert.equal(game.dots[1].delay,18);
 for(let i=0;i<1000;i++)game.tickDigits(glyphs);
 assert.equal(game.displayed,'12:35');game.sync('12:34','12:35',100,59,glyphs);assert.equal(game.displayed,'12:35');
 game.sync('12:35','12:36',101,0,glyphs);assert.equal(game.displayed,'12:35');assert.equal(game.queue.length,0);
});
test('midnight rebuilds left to right and finishes with the new time',()=>{
 const game=new Tetris();game.sync('23:59','00:00',100,56,glyphs);
 assert.deepEqual(game.queue.map(d=>d.index),[0,1,3,4]);
 for(let i=0;i<4000;i++)game.tickDigits(glyphs);
 assert.equal(game.displayed,'00:00');assert.equal(game.queue.length,0);assert.ok(game.offsets.every(v=>v===0));
});
