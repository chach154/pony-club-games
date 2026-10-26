const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {test}=require('node:test');
const sandbox={window:{PonyArt:{pony:()=>'<svg/>'}},Image:class{},Math};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../horn.js'),'utf8'),sandbox);
const Horn=sandbox.window.PonyHorn,W=960,H=500;
const point=(h,t)=>({x:h.base.x+h.ux*t,y:h.base.y+h.uy*t});
const check=test;
function charge(g,target=1){
  const h=Horn.geometry(g,W,H);
  Horn.down(g,point(h,14),W,H);
  for(let i=0;i<60&&g.charge<target;i++)Horn.move(g,point(h,i%2?14:58),true,W,H);
  Horn.release(g);
}
function advance(g,seconds,finish=()=>{}){for(let i=0;i<Math.ceil(seconds*120);i++){g.t+=1/120;Horn.tick(g,1/120,W,H,{finish});}}

check('Stationary hold adds no charge',()=>{
  const g=Horn.create(W,H),h=Horn.geometry(g,W,H),p=point(h,35);
  Horn.down(g,p,W,H);for(let i=0;i<100;i++)Horn.move(g,p,true,W,H);
  advance(g,2);assert.equal(g.charge,0);
});
check('Motion outside the horn and motion without LMB add no charge',()=>{
  const g=Horn.create(W,H),h=Horn.geometry(g,W,H);
  Horn.down(g,point(h,30),W,H);
  for(let i=0;i<40;i++)Horn.move(g,{x:500+i*5,y:100+i*2},true,W,H);
  assert.equal(g.charge,0);Horn.release(g);
  for(let i=0;i<40;i++)Horn.move(g,point(h,i%2?14:58),false,W,H);
  assert.equal(g.charge,0);
});
check('Stroking grows horn and strength; charge is capped and survives release',()=>{
  const g=Horn.create(W,H),before=Horn.geometry(g,W,H).length;charge(g);
  assert.equal(g.charge,1);assert.equal(Horn.geometry(g,W,H).length,before+120);
  assert.equal(Horn.damage(0),1);assert.equal(Horn.damage(.5),3);assert.equal(Horn.damage(1),5);
  assert.equal(g.dragging,false);
});
check('Shot consumes charge, shrinks horn and scales projectile power',()=>{
  const g=Horn.create(W,H);charge(g);
  assert.equal(Horn.down(g,{x:800,y:220},W,H),'shot');
  assert.equal(g.charge,0);assert.equal(Horn.geometry(g,W,H).length,74);
  assert.equal(g.shots[0].damage,5);assert.equal(g.shots[0].r,19);
  assert.ok(Math.abs(Math.hypot(g.shots[0].vx,g.shots[0].vy)-810)<1e-9);
  assert.equal(Horn.down(g,{x:800,y:220},W,H),'empty');assert.equal(g.shots.length,1);
});
check('Strong projectile collides, defeats monster and counts a full-power hit',()=>{
  const g=Horn.create(W,H);charge(g);const h=Horn.geometry(g,W,H),m=g.monsters[0];
  m.x=h.tip.x+240;m.y=m.homeY=h.tip.y;m.speed=0;g.monsters=[m];
  Horn.down(g,{x:m.x,y:m.y},W,H);advance(g,.6);
  assert.equal(g.hits,1);assert.equal(g.kills,1);assert.equal(g.fullPowerHits,1);assert.ok(g.score>0);
});
check('Weak projectile hurts a sturdy monster without defeating it',()=>{
  const g=Horn.create(W,H);g.charge=.16;const h=Horn.geometry(g,W,H),m=g.monsters[1];
  m.x=h.tip.x+200;m.y=m.homeY=h.tip.y;m.speed=0;g.monsters=[m];
  Horn.down(g,{x:m.x,y:m.y},W,H);advance(g,.7);
  assert.equal(g.hits,1);assert.equal(g.kills,0);assert.equal(m.hp,2);assert.equal(g.fullPowerHits,0);
});
check('Missed shots do not damage monsters',()=>{
  const g=Horn.create(W,H);g.charge=1;Horn.down(g,{x:W,y:0},W,H);advance(g,1.5);
  assert.equal(g.hits,0);assert.equal(g.kills,0);
});
check('Swept collision catches a projectile that crosses a monster between frames',()=>{
  const g=Horn.create(W,H);g.charge=1;const h=Horn.geometry(g,W,H),m=g.monsters[0];
  m.x=h.tip.x+200;m.y=m.homeY=h.tip.y;m.speed=0;g.monsters=[m];
  Horn.down(g,{x:m.x,y:m.y},W,H);g.t=.8;Horn.tick(g,.8,W,H);
  assert.equal(g.hits,1);assert.equal(g.kills,1);
});
check('Timer and depleted lives each finish a round exactly once',()=>{
  const timed=Horn.create(W,H);timed.t=60;let timerEnds=0;
  Horn.tick(timed,.016,W,H,{finish:()=>timerEnds++});Horn.tick(timed,.016,W,H,{finish:()=>timerEnds++});
  assert.equal(timerEnds,1);
  const lost=Horn.create(W,H);lost.monsters.push({...lost.monsters[0]});for(const m of lost.monsters)m.x=W*.37-1;
  let lossEnds=0;Horn.tick(lost,.016,W,H,{finish:()=>lossEnds++});Horn.tick(lost,.016,W,H,{finish:()=>lossEnds++});
  assert.equal(lost.lives,0);assert.equal(lossEnds,1);
});

check('Uncharged skin droops; the fully charged skin is larger and straight',()=>{
  const g=Horn.create(W,H),loose=Horn.visualGeometry(g,W,H);
  assert.ok(loose.tip.y>loose.base.y);
  g.charge=g.visualCharge=1;const straight=Horn.visualGeometry(g,W,H);
  assert.ok(straight.tip.y<straight.base.y);assert.ok(straight.length>loose.length*3);
  for(let i=0;i<=10;i++)assert.equal(Horn.curvePoint(straight,i/10).x,0);
  assert.equal(Horn.curvePoint(loose,0).x,0);assert.equal(Horn.curvePoint(loose,0).y,0);
  assert.equal(straight.base.x,loose.base.x);assert.equal(straight.base.y,loose.base.y);
});

check('Visual bending does not alter charging geometry or hit detection',()=>{
  const g=Horn.create(W,H);g.charge=.35;g.visualCharge=0;
  const before=Horn.geometry(g,W,H),answers=[];
  for(let y=before.base.y-180;y<before.base.y+60;y+=7)for(let x=before.base.x-70;x<before.base.x+100;x+=7)answers.push(Horn.onHorn({x,y},before));
  g.visualCharge=1;const after=Horn.geometry(g,W,H);assert.deepEqual(after,before);
  let i=0;for(let y=after.base.y-180;y<after.base.y+60;y+=7)for(let x=after.base.x-70;x<after.base.x+100;x+=7)assert.equal(Horn.onHorn({x,y},after),answers[i++]);
});

check('Skin straightens and curls back gradually without changing stored charge',()=>{
  const g=Horn.create(W,H);g.charge=1;
  Horn.tick(g,.05,W,H);assert.ok(g.visualCharge>0&&g.visualCharge<1);assert.equal(g.charge,1);
  const rising=g.visualCharge;g.charge=0;Horn.tick(g,.05,W,H);
  assert.ok(g.visualCharge>0&&g.visualCharge<rising);assert.equal(g.charge,0);
});

check('Projectile starts at the visible bent tip',()=>{
  const g=Horn.create(W,H);g.charge=.6;g.visualCharge=.1;
  const tip=Horn.visualGeometry(g,W,H).tip;
  assert.equal(Horn.down(g,{x:800,y:220},W,H),'shot');
  assert.equal(g.shots[0].x,tip.x);assert.equal(g.shots[0].y,tip.y);assert.equal(g.charge,0);
});
