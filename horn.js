window.PonyHorn = (() => {
  'use strict';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const damage=charge=>1+Math.floor(clamp(charge,0,1)*4);
  const unicorn=new Image();
  unicorn.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(window.PonyArt.pony(5,false,{hideHorn:true}));
  const hornImage = new Image();
  hornImage.src = 'assets/horn.png';
  let hornProfile;
  // Row centres for the current 64x64 skin also work when file:// blocks pixel reads.
  const localSkinProfile=[40,39,40,39,39,41,42,43,43,45,47,50,50,51,53,54,55,56,57,58,59,59,60,61,61,62,63,63,63,63,63,63,...Array(32).fill(64)].map(x=>x/128);

  function imageProfile(){
    if(hornProfile)return hornProfile;
    const width=hornImage.naturalWidth,height=hornImage.naturalHeight;
    if(!width||!height)return null;
    try{
      const surface=document.createElement('canvas');surface.width=width;surface.height=height;
      const brush=surface.getContext('2d',{willReadFrequently:true});brush.drawImage(hornImage,0,0);
      const pixels=brush.getImageData(0,0,width,height).data;
      hornProfile=Array.from({length:height},(_,y)=>{
        let first=width,last=-1;
        for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>16){first=Math.min(first,x);last=x;}
        return last<0?.5:(first+last+1)/(2*width);
      });
    }catch{
      hornProfile=width===64&&height===64?localSkinProfile:Array(height).fill(.5);
    }
    return hornProfile;
  }

  // Presentation only: geometry() and onHorn() keep the original charging area.
  function visualGeometry(g,W,H){
    const charge=clamp(g.visualCharge??g.charge,0,1),ease=charge*charge*(3-2*charge);
    const h=geometry({charge},W,H),length=h.length*(.6+.4*ease),bend=1-ease;
    const controls=[{x:0,y:0},{x:-.05*length*bend,y:-length/3},{x:.95*length*bend,y:-2*length/3},{x:.85*length*bend,y:-length*(1-1.28*bend)}];
    const angle=Math.atan2(h.uy,h.ux)+Math.PI/2,cos=Math.cos(angle),sin=Math.sin(angle),end=controls[3];
    return{base:h.base,length,half:h.half*(.68+.32*ease),angle,controls,charge,
      tip:{x:h.base.x+end.x*cos-end.y*sin,y:h.base.y+end.x*sin+end.y*cos}};
  }
  function curvePoint(pose,t){
    const [a,b,c,d]=pose.controls,s=1-t;
    return{x:s*s*s*a.x+3*s*s*t*b.x+3*s*t*t*c.x+t*t*t*d.x,y:s*s*s*a.y+3*s*s*t*b.y+3*s*t*t*c.y+t*t*t*d.y};
  }
  function textureTriangle(ctx,source,a,b,c,p,q,r){
    const denominator=a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y);
    if(Math.abs(denominator)<.00001)return;
    const coefficients=(u,v,w)=>[
      (u*(b.y-c.y)+v*(c.y-a.y)+w*(a.y-b.y))/denominator,
      (u*(c.x-b.x)+v*(a.x-c.x)+w*(b.x-a.x))/denominator,
      (u*(b.x*c.y-c.x*b.y)+v*(c.x*a.y-a.x*c.y)+w*(a.x*b.y-b.x*a.y))/denominator
    ];
    const [xx,xy,xt]=coefficients(p.x,q.x,r.x),[yx,yy,yt]=coefficients(p.y,q.y,r.y);
    ctx.save();ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.closePath();ctx.clip();
    ctx.transform(xx,yx,xy,yy,xt,yt);ctx.drawImage(source,0,0);ctx.restore();
  }
  function drawHornSkin(ctx,pose){
    if(!hornImage.complete||!hornImage.naturalWidth)return;
    const profile=imageProfile(),width=hornImage.naturalWidth,height=hornImage.naturalHeight;
    const segments=Math.max(24,Math.min(56,Math.ceil(pose.length/4)));
    const edge=t=>{
      const p=curvePoint(pose,t),before=curvePoint(pose,Math.max(0,t-.001)),after=curvePoint(pose,Math.min(1,t+.001));
      const dx=after.x-before.x,dy=after.y-before.y,distance=Math.hypot(dx,dy)||1,nx=-dy/distance,ny=dx/distance;
      const y=(1-t)*height,row=clamp(y-.5,0,height-1),index=Math.floor(row),mix=row-index;
      const centre=profile[index]*(1-mix)+profile[Math.min(index+1,height-1)]*mix;
      return{y,left:{x:p.x-nx*pose.half*2*centre,y:p.y-ny*pose.half*2*centre},right:{x:p.x+nx*pose.half*2*(1-centre),y:p.y+ny*pose.half*2*(1-centre)}};
    };
    ctx.save();ctx.translate(pose.base.x,pose.base.y);ctx.rotate(pose.angle);
    ctx.shadowColor='#b798e8';ctx.shadowBlur=8+pose.charge*24;ctx.strokeStyle='#dbc6ec99';ctx.lineWidth=3;
    const [a,b,c,d]=pose.controls;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(b.x,b.y,c.x,c.y,d.x,d.y);ctx.stroke();ctx.shadowBlur=0;
    for(let i=0;i<segments;i++){
      const start=edge(i/segments),end=edge((i+1)/segments);
      const sl={x:0,y:start.y},sr={x:width,y:start.y},el={x:0,y:end.y},er={x:width,y:end.y};
      textureTriangle(ctx,hornImage,sl,sr,er,start.left,start.right,end.right);
      textureTriangle(ctx,hornImage,sl,er,el,start.left,end.right,end.left);
    }
    ctx.restore();
  }

  function geometry(g,W,H){
    const width=Math.min(228,W*.27),height=width*194/210;
    const image={x:W*.055,y:H-height-22,width,height};
    const base={x:image.x+width*158/210,y:image.y+height*33/194};
    const length=74+g.charge*120,ux=.36,uy=-Math.sqrt(1-.36*.36),half=34+g.charge*10;
    return{base,length,ux,uy,half,image,tip:{x:base.x+ux*length,y:base.y+uy*length}};
  }
  function onHorn(p,h){
    const dx=p.x-h.base.x,dy=p.y-h.base.y,along=dx*h.ux+dy*h.uy;
    const across=Math.abs(dx*h.uy-dy*h.ux);
    return along>=-6&&along<=h.length+6&&across<=h.half*(1-clamp(along/h.length,0,1))+9;
  }
  function monster(x,y,hp=1,index=0){
    return{x,y,homeY:y,r:27+hp*3,hp,maxHp:hp,phase:index*1.7,speed:8+hp*1.5,flash:0,color:['#99c8b8','#ba9dd5','#e9b1c8'][index%3]};
  }
  function create(W,H){
    return{t:0,score:0,lives:3,charge:0,visualCharge:0,dragging:false,lastPointer:null,aim:{x:W*.78,y:220},
      monsters:[monster(W*.78,220,2,0),monster(W*.94,345,3,1)],shots:[],particles:[],rings:[],spawnIn:4,
      spawned:2,kills:0,hits:0,fullPowerHits:0,shotsFired:0,message:'Сначала заряди рог: зажми ЛКМ и води вдоль него.',messageUntil:5,ended:false};
  }
  function release(g){
    const wasDragging=g.dragging;g.dragging=false;g.lastPointer=null;
    if(wasDragging&&g.charge>=.15){g.message='Магия готова: прицелься и кликни по монстрику.';g.messageUntil=g.t+2;}
  }
  function move(g,p,primaryDown,W,H){
    g.aim={x:clamp(p.x,0,W),y:clamp(p.y,0,H)};
    if(!g.dragging)return;
    if(!primaryDown){release(g);return;}
    const h=geometry(g,W,H),previous=g.lastPointer;
    if(previous&&onHorn(previous,h)&&onHorn(p,h)){
      const distance=Math.hypot(p.x-previous.x,p.y-previous.y);
      // Only actual motion over the horn creates charge. Holding still gives none.
      g.charge=clamp(g.charge+Math.min(distance,45)/520,0,1);
      if(distance>0){g.message=g.charge>=.999?'Максимальная сила! Отпусти ЛКМ и кликни по монстрику.':'Рог растёт — продолжай водить курсором вдоль него.';g.messageUntil=g.t+2;}
    }
    g.lastPointer={...p};
  }
  function down(g,p,W,H,{tone=()=>{}}={}){
    const h=geometry(g,W,H);g.aim={...p};
    if(onHorn(p,h)){g.dragging=true;g.lastPointer={...p};return 'charge';}
    if(p.x<W*.37)return 'outside';
    if(g.charge<.15){g.message='Сначала накопи хотя бы 15% магии, водя мышью по рогу.';g.messageUntil=g.t+2;return 'empty';}
    const visibleTip=visualGeometry(g,W,H).tip;
    const dx=p.x-visibleTip.x,dy=p.y-visibleTip.y,distance=Math.hypot(dx,dy);
    if(distance<10)return 'outside';
    const power=g.charge,speed=480+power*330;
    g.shots.push({x:visibleTip.x,y:visibleTip.y,vx:dx/distance*speed,vy:dy/distance*speed,power,damage:damage(power),r:6+power*13,life:2.5});
    g.shotsFired++;g.charge=0;release(g);g.message='Магия в пути! Заряди рог для следующего выстрела.';g.messageUntil=g.t+1.8;
    tone(330+power*550,.22,'triangle',.065);
    return 'shot';
  }
  function segmentDistance(p,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
    const fraction=length?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/length,0,1):0;
    return{distance:Math.hypot(p.x-a.x-dx*fraction,p.y-a.y-dy*fraction),fraction};
  }
  function burst(g,x,y,color,count=14){
    for(let i=0;i<count;i++){
      const angle=i/count*Math.PI*2,speed=35+Math.random()*85;
      g.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-20,life:.65,color});
    }
    g.rings.push({x,y,life:.4});
  }
  function end(g,finish){
    if(g.ended)return;
    g.ended=true;release(g);
    finish(g.score,`Разогнано: ${g.kills} · Попадания: ${g.hits} · Выстрелы: ${g.shotsFired}`);
  }
  function tick(g,dt,W,H,{tone=()=>{},finish=()=>{}}={}){
    if(g.ended)return;
    const visual=g.visualCharge??g.charge;
    g.visualCharge=visual+(g.charge-visual)*(1-Math.exp(-dt*12));
    if(Math.abs(g.visualCharge-g.charge)<.0001)g.visualCharge=g.charge;
    g.spawnIn-=dt;
    if(g.spawnIn<=0){
      const hp=1+(g.spawned%3),y=135+(g.spawned%3)*102;
      g.monsters.push(monster(W+45,y,hp,g.spawned++));
      g.spawnIn=Math.max(2.4,4-g.t*.025);
    }
    for(const m of g.monsters){
      m.x-=m.speed*dt;m.y=m.homeY+Math.sin(g.t*1.7+m.phase)*12;m.flash=Math.max(0,m.flash-dt);
      if(m.x<W*.37){m.escaped=true;g.lives--;burst(g,m.x,m.y,'#b5a4d4',7);tone(170,.18,'triangle',.045);}
    }
    g.monsters=g.monsters.filter(m=>!m.escaped&&m.hp>0);
    if(g.lives<=0){g.lives=0;end(g,finish);return;}
    for(const shot of g.shots){
      const before={x:shot.x,y:shot.y};shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;
      let target=null,first=Infinity;
      for(const m of g.monsters){
        if(m.hp<=0)continue;
        const collision=segmentDistance(m,before,shot);
        if(collision.distance<m.r+shot.r&&collision.fraction<first){target=m;first=collision.fraction;}
      }
      if(target){
        target.hp-=shot.damage;target.flash=.18;shot.life=0;g.hits++;g.score+=shot.damage*10;
        if(shot.power>=.999)g.fullPowerHits++;
        burst(g,target.x,target.y,shot.power>=.999?'#eed496':'#c4a0e6');
        if(target.hp<=0){g.kills++;g.score+=60+target.maxHp*20+Math.round(shot.power*40);tone(760,.15,'sine',.06);}
        else tone(530,.1,'sine',.045);
      }
    }
    g.monsters=g.monsters.filter(m=>m.hp>0);
    g.shots=g.shots.filter(s=>s.life>0&&s.x>-40&&s.x<W+60&&s.y>-60&&s.y<H+60);
    for(const p of g.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;p.life-=dt;}
    g.particles=g.particles.filter(p=>p.life>0);
    for(const ring of g.rings)ring.life-=dt;
    g.rings=g.rings.filter(r=>r.life>0);
    if(g.t>=60)end(g,finish);
  }

  function spark(ctx,x,y,size,color){
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x+size*.3,y-size*.3);ctx.lineTo(x+size,y);ctx.lineTo(x+size*.3,y+size*.3);ctx.lineTo(x,y+size);ctx.lineTo(x-size*.3,y+size*.3);ctx.lineTo(x-size,y);ctx.lineTo(x-size*.3,y-size*.3);ctx.closePath();ctx.fill();
  }
  function drawMonster(ctx,m,t){
    ctx.save();ctx.translate(m.x,m.y);const r=m.r;
    ctx.fillStyle='#a79ab530';ctx.beginPath();ctx.ellipse(0,r+9,r*.9,7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=m.flash?'#fff3df':m.color;
    ctx.beginPath();ctx.moveTo(-r*.8,r*.65);ctx.bezierCurveTo(-r*1.2,-r*.2,-r*.6,-r,0,-r);ctx.bezierCurveTo(r*.65,-r,r*1.15,-r*.2,r*.8,r*.65);ctx.quadraticCurveTo(r*.55,r,r*.25,r*.73);ctx.quadraticCurveTo(0,r*.98,-r*.25,r*.73);ctx.quadraticCurveTo(-r*.6,r,-r*.8,r*.65);ctx.fill();
    ctx.strokeStyle=m.color;ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-r*.5,-r*.65);ctx.lineTo(-r*.63,-r*1.12);ctx.moveTo(r*.5,-r*.65);ctx.lineTo(r*.63,-r*1.12);ctx.stroke();
    ctx.fillStyle='#fffafc';for(const x of [-r*.32,r*.32]){ctx.beginPath();ctx.ellipse(x,-r*.2,8,11,0,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#66546e';for(const x of [-r*.32,r*.32]){ctx.beginPath();ctx.ellipse(x-1,-r*.17,3.5,5,0,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#807087';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,r*.22,7,0,Math.PI);ctx.stroke();
    ctx.fillStyle='#f0c3d4a0';ctx.beginPath();ctx.ellipse(-r*.57,r*.19,6,3,0,0,Math.PI*2);ctx.ellipse(r*.57,r*.19,6,3,0,0,Math.PI*2);ctx.fill();
    for(let i=0;i<m.maxHp;i++){ctx.fillStyle=i<m.hp?'#ab88ce':'#e9dff0';ctx.beginPath();ctx.arc((i-(m.maxHp-1)/2)*12,-r-19,4,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  function draw(ctx,g,W,H){
    if(!g)return;
    ctx.save();
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#e5e2f8');sky.addColorStop(.65,'#edf2f5');sky.addColorStop(1,'#deece5');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    for(let i=0;i<25;i++)spark(ctx,(i*139+57)%W,30+(i*71)%310,2+i%3,'#ffffffa8');
    ctx.fillStyle='#e4d6ed';ctx.beginPath();ctx.moveTo(0,H*.77);ctx.bezierCurveTo(W*.2,H*.59,W*.35,H*.81,W*.55,H*.66);ctx.bezierCurveTo(W*.8,H*.48,W*.9,H*.67,W,H*.62);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    ctx.fillStyle='#d5e5dd';ctx.beginPath();ctx.moveTo(0,H*.91);ctx.bezierCurveTo(W*.35,H*.75,W*.55,H*.92,W,H*.81);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    // A small crystal village marks the side the player is protecting.
    ctx.fillStyle='#d2c2e3';ctx.fillRect(25,207,27,61);ctx.beginPath();ctx.moveTo(16,207);ctx.lineTo(39,177);ctx.lineTo(61,207);ctx.fill();ctx.fillStyle='#eee6f3';ctx.fillRect(34,225,9,16);
    ctx.strokeStyle='#b3c9b97a';ctx.setLineDash([5,10]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W*.37,78);ctx.lineTo(W*.37,H-40);ctx.stroke();ctx.setLineDash([]);
    const h=geometry(g,W,H);
    ctx.fillStyle='#af9bbe30';ctx.beginPath();ctx.ellipse(h.image.x+h.image.width*.52,H-22,h.image.width*.48,11,0,0,Math.PI*2);ctx.fill();
    if(unicorn.complete&&unicorn.naturalWidth)ctx.drawImage(unicorn,h.image.x,h.image.y,h.image.width,h.image.height);
    const pose=visualGeometry(g,W,H);
    drawHornSkin(ctx,pose);
    
    if(g.charge>0){
      for(let i=0;i<6;i++){const angle=g.t*1.8+i*Math.PI/3,radius=22+g.charge*12;spark(ctx,pose.tip.x+Math.cos(angle)*radius,pose.tip.y+Math.sin(angle)*radius,2+g.charge*3,i%2?'#e7c783':'#b991db');}
    }
    if(g.charge>=.15&&!g.dragging&&g.aim.x>W*.37){
      ctx.strokeStyle='#ae8ac77a';ctx.lineWidth=1.5;ctx.setLineDash([4,8]);ctx.beginPath();ctx.moveTo(pose.tip.x,pose.tip.y);ctx.lineTo(g.aim.x,g.aim.y);ctx.stroke();ctx.setLineDash([]);
      ctx.strokeStyle='#a484bb';ctx.beginPath();ctx.arc(g.aim.x,g.aim.y,12,0,Math.PI*2);ctx.moveTo(g.aim.x-18,g.aim.y);ctx.lineTo(g.aim.x-7,g.aim.y);ctx.moveTo(g.aim.x+7,g.aim.y);ctx.lineTo(g.aim.x+18,g.aim.y);ctx.moveTo(g.aim.x,g.aim.y-18);ctx.lineTo(g.aim.x,g.aim.y-7);ctx.moveTo(g.aim.x,g.aim.y+7);ctx.lineTo(g.aim.x,g.aim.y+18);ctx.stroke();
    }
    for(const m of g.monsters)drawMonster(ctx,m,g.t);
    for(const shot of g.shots){
      ctx.shadowBlur=22;ctx.shadowColor='#b499ec';ctx.fillStyle=shot.power>=.95?'#fff0bd':'#d8bcf0';ctx.beginPath();ctx.arc(shot.x,shot.y,shot.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;spark(ctx,shot.x,shot.y,shot.r*.65,'#fffafc');
    }
    for(const ring of g.rings){ctx.strokeStyle=`rgba(185,146,214,${ring.life*1.8})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(ring.x,ring.y,(.4-ring.life)*110+5,0,Math.PI*2);ctx.stroke();}
    for(const p of g.particles){ctx.globalAlpha=Math.max(0,p.life/.65);spark(ctx,p.x,p.y,4,p.color);}ctx.globalAlpha=1;
    ctx.textAlign='center';ctx.font='700 12px Manrope, sans-serif';ctx.fillStyle='#a089b5';
    ctx.fillText(g.dragging?'РОГ РАСТЁТ!':g.charge>=.999?'МАКСИМАЛЬНАЯ СИЛА':g.charge>=.15?'МАГИЯ ГОТОВА':'ЗАРЯДИ РОГ',h.base.x+4,78);
    ctx.textAlign='left';ctx.fillStyle='#9a83aa';ctx.font='600 11px Manrope, sans-serif';ctx.fillText('ЗАЩИТИ ПОЛЯНУ',W*.45,40);
    if(g.t<g.messageUntil){ctx.textAlign='center';ctx.fillStyle='#9478a8';ctx.font='500 11px Manrope, sans-serif';ctx.fillText(g.message,W*.63,H-20);}
    ctx.restore();
  }
  return{create,geometry,onHorn,visualGeometry,curvePoint,damage,down,move,release,tick,draw};
})();
