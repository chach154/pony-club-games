/* Pony Club — buildless, browser-local mini games. No external game services. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const {icon, pony, ponies, cover} = window.PonyArt;
  const STORAGE_KEY = 'pony-club-v1';
  const gameIds = ['flight', 'memory', 'rhythm', 'horn'];
  const desktopOnly = () => matchMedia('(pointer: coarse) and (hover: none)').matches && !matchMedia('(any-pointer: fine)').matches;
  const meta = {
    flight: {title:'Радужный полёт',kicker:'ПРИКЛЮЧЕНИЕ С РАДУГОЙ ДЭШ',icon:'bolt',symbol:'☁',intro:'Собирай золотые звёздочки и обходи грозовые тучки. У тебя три сердечка и 75 секунд полёта!',help:'Стрелки / WASD или веди пони пальцем по экрану',action:'Полетели!'},
    memory: {title:'Парочки дружбы',kicker:'ПРИКЛЮЧЕНИЕ С СУМЕРЕЧНОЙ ИСКОРКОЙ',icon:'cards',symbol:'✦',intro:'Открывай по две карточки и находи одинаковых пони. Собери все шесть пар. Торопиться не нужно!',help:'Нажимай на карточки · Найди 6 пар',action:'Искать друзей'},
    rhythm: {title:'Мелодия дружбы',kicker:'ПРИКЛЮЧЕНИЕ С ПИНКИ ПАЙ',icon:'music',symbol:'♫',intro:'Нажимай D, F, J, K или цветные кнопки, когда ноты попадут на линию. Можно играть со звуком и без!',help:'Клавиши D F J K или кнопки под игровым полем',action:'Зажигаем!'},
    horn: {title:'Магия единорога',kicker:'ПРИКЛЮЧЕНИЕ С РАРИТИ · ТОЛЬКО ПК',icon:'sparkle',symbol:'✧',intro:'Зажми левую кнопку мыши и води по рогу — он вырастет и накопит магию. Отпусти кнопку и кликни по монстрику, чтобы выстрелить. Чем длиннее рог, тем сильнее снаряд! Защити поляну за 60 секунд.',help:'ЛКМ + движение по рогу — зарядка · Отпусти и кликни по цели — выстрел',action:'Сотворить магию'}
  };
  const achievements = [
    {id:'first',title:'Первое волшебство',description:'Заверши свою первую игру.',symbol:'✦'},
    {id:'explorer',title:'Вся Эквестрия',description:'Заверши каждую из четырёх игр.',symbol:'♧'},
    {id:'stars',title:'Выше облаков',description:'Собери 30 звёзд за один полёт.',symbol:'☁'},
    {id:'memory',title:'Помню всех друзей',description:'Найди 6 пар за 15 ходов или меньше.',symbol:'♡'},
    {id:'rhythm',title:'В одном ритме',description:'Поймай 12 нот подряд.',symbol:'♫'},
    {id:'regular',title:'Как дома',description:'Заверши 5 игр в клубе.',symbol:'⌂'},
    {id:'horn-power',title:'Большая магия',description:'Попади в монстрика снарядом полной силы.',symbol:'✧'},
    {id:'horn-guard',title:'Страж Эквестрии',description:'Разгони 10 монстриков за одну партию.',symbol:'♜'}
  ];
  const freshData = () => ({favorites:[],sound:false,best:Object.fromEntries(gameIds.map(id=>[id,0])),completed:Object.fromEntries(gameIds.map(id=>[id,0])),achievements:[]});
  let data = freshData();
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      data.favorites = Array.isArray(saved.favorites) ? saved.favorites.filter(id=>gameIds.includes(id)) : [];
      data.achievements = Array.isArray(saved.achievements) ? saved.achievements.filter(id=>achievements.some(a=>a.id===id)) : [];
      data.sound = saved.sound === true;
      for (const id of gameIds) for (const field of ['best','completed']) {
        const value = saved[field]?.[id];
        if (Number.isFinite(value) && value >= 0) data[field][id] = Math.floor(value);
      }
    }
  } catch { storageAvailable = false; }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); storageAvailable=true; }
    catch { storageAvailable = false; }
  }
  let toastTimer;
  function toast(message) {
    const el = $('#toast'); el.textContent = message; el.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove('visible'), 3400);
  }
  const audio = {
    ctx:null, voices:new Set(),
    ensure() {
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        this.ctx ||= new Audio();
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(()=>{});
      } catch { /* Visual play remains available when audio is unsupported. */ }
    },
    tone(frequency=523,duration=.12,type='sine',volume=.08) {
      if (!data.sound || !this.ctx || this.ctx.state !== 'running') return;
      const oscillator=this.ctx.createOscillator(), gain=this.ctx.createGain(), now=this.ctx.currentTime;
      oscillator.type=type; oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0,now); gain.gain.linearRampToValueAtTime(volume,now+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      oscillator.connect(gain); gain.connect(this.ctx.destination);
      oscillator.start(now); oscillator.stop(now+duration+.02); this.voices.add(oscillator);
      oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
    },
    stop() { for (const voice of this.voices) { try { voice.stop(); } catch {} } this.voices.clear(); }
  };
  function renderIcons(root=document) { root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon)); }
  renderIcons();
  gameIds.forEach(id=>$(`#${id}-cover`).innerHTML=cover(id));
  function renderSound() {
    $$('.sound-toggle').forEach(button=>{
      button.innerHTML=icon(data.sound?'sound-on':'sound-off');
      button.setAttribute('aria-label',data.sound?'Выключить звук':'Включить звук');
      button.title=data.sound?'Выключить звук':'Включить звук';
      button.setAttribute('aria-pressed',String(data.sound));
    });
  }
  $$('.sound-toggle').forEach(button=>button.addEventListener('click',()=>{
    data.sound=!data.sound; if(data.sound){audio.ensure();audio.tone(659,.18);}else audio.stop();
    save(); renderSound();
  }));
  let filter='all';
  function renderCollection() {
    $$('[data-favorite]').forEach(button=>{
      const id=button.dataset.favorite, favorite=data.favorites.includes(id);
      button.setAttribute('aria-pressed',String(favorite));
      button.setAttribute('aria-label',`${favorite?'Убрать':'Добавить'} «${meta[id].title}» ${favorite?'из любимых':'в любимые'}`);
    });
    $('#favorites-count').textContent=data.favorites.length;
    $('#all-games-count').textContent=gameIds.length;
    $$('[data-play="horn"]').forEach(button=>{
      button.disabled=desktopOnly();
      button.innerHTML=desktopOnly()?'Только на ПК':`Играть${icon('arrow-right')}`;
      button.title=desktopOnly()?'Для этой игры нужна мышь на компьютере':'';
    });
    $$('[data-game]').forEach(card=>card.hidden=filter==='favorites'&&!data.favorites.includes(card.dataset.game));
    $('#empty-favorites').hidden=!(filter==='favorites'&&data.favorites.length===0);
    $$('[data-filter]').forEach(button=>{const active=button.dataset.filter===filter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    for (const id of gameIds) {
      const el=$(`[data-record="${id}"]`);
      el.textContent=data.completed[id]?`✧ Личный рекорд: ${data.best[id].toLocaleString('ru-RU')} очков`:'Твой первый рекорд ещё впереди';
      el.classList.toggle('has-record',data.completed[id]>0);
    }
    const count=data.achievements.length;
    $('#achievement-count').textContent=count;
    $('#journey-count').textContent=`${count} из ${achievements.length}`;
    $('#journey-fill').style.width=`${count/achievements.length*100}%`;
    $('#journey-text').textContent=count===achievements.length?'Вся коллекция собрана! Спасибо, что приносишь в клуб волшебство.':count>0?'Твоя история уже началась. Впереди ещё столько маленьких побед!':'Начни с одной игры — и открой своё первое достижение.';
    $$('.saved-note').forEach(el=>el.lastChild.textContent=storageAvailable?'Рекорды сохраняются на устройстве':'Прогресс доступен до закрытия страницы');
  }
  $$('[data-favorite]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.favorite;
    data.favorites=data.favorites.includes(id)?data.favorites.filter(x=>x!==id):[...data.favorites,id];
    save(); renderCollection();
  }));
  $$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;renderCollection();}));
  $('#show-all').addEventListener('click',()=>{filter='all';renderCollection();});
  function renderAchievements() {
    $('#achievements-grid').innerHTML=achievements.map(a=>{
      const unlocked=data.achievements.includes(a.id);
      return `<article class="achievement ${unlocked?'unlocked':''}"><span class="achievement-icon">${a.symbol}</span><h3>${a.title}</h3><p>${a.description}</p><span class="achievement-status">${unlocked?'✦ ОТКРЫТО':'ЕЩЁ ВПЕРЕДИ'}</span></article>`;
    }).join('');
  }
  function showInfo(id){if(id==='achievements-dialog')renderAchievements();$(`#${id}`).showModal();}
  $('#achievements-nav').addEventListener('click',()=>showInfo('achievements-dialog'));
  $('#journey-open').addEventListener('click',()=>showInfo('achievements-dialog'));
  $$('.about-trigger').forEach(button=>button.addEventListener('click',()=>showInfo('about-dialog')));
  $$('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>$(`#${button.dataset.closeDialog}`).close()));
  $$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
  }));
  renderSound(); renderCollection();

  const canvas=$('#game-canvas'), ctx=canvas.getContext('2d'), dialog=$('#game-dialog');
  let W=960;
  const H=500;
  function configureCanvas(){
    const rect=$('#game-stage').getBoundingClientRect();
    if(!rect.height)return;
    W=Math.max(320,Math.round(H*rect.width/rect.height));
    canvas.width=W;canvas.height=H;
  }
  const playerImage=new Image();
  playerImage.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(pony(1));
  playerImage.onload=()=>{if(session.phase==='ready'&&session.type==='flight')drawFlight(session.game);};
  const session={type:null,phase:'closed',game:null,raf:0,last:0};
  const keys=new Set();
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function shuffled(array){const copy=[...array];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
  function setOverlay(html) {$('#stage-overlay').hidden=false;$('#overlay-content').innerHTML=html;}
  function hideOverlay() {$('#stage-overlay').hidden=true;}
  function openGame(id) {
    if(!gameIds.includes(id))return;
    if(id==='horn'&&desktopOnly()){toast('«Магия единорога» доступна на ПК: для игры нужна мышь.');return;}
    cleanup();session.type=id;session.phase='ready';
    const info=meta[id];
    $('#game-title').textContent=info.title;$('#game-kicker').textContent=info.kicker;
    $('#modal-game-icon').innerHTML=icon(info.icon);$('#game-help-text').textContent=info.help;
    $('#rhythm-pads').hidden=id!=='rhythm';$('#memory-board').hidden=id!=='memory';canvas.hidden=id==='memory';
    $('#horn-controls').hidden=id!=='horn';dialog.classList.toggle('horn-dialog',id==='horn');
    $('#pause-game').disabled=true;
    if(!dialog.open)dialog.showModal();
    configureCanvas();
    session.game=createGame(id);renderGame();renderHud();
    setOverlay(`<span class="overlay-symbol">${info.symbol}</span><h3>${info.title}</h3><p>${info.intro}</p><button class="button button-primary" id="start-game">${icon('play')}${info.action}</button>`);
    $('#start-game').addEventListener('click',startGame);
  }
  $$('[data-play]').forEach(button=>button.addEventListener('click',()=>openGame(button.dataset.play)));
  $('#random-game').addEventListener('click',()=>{const playable=gameIds.filter(id=>id!=='horn'||!desktopOnly());openGame(playable[Math.floor(Math.random()*playable.length)]);});
  function releaseHorn(){if(session.type==='horn'&&session.game)window.PonyHorn.release(session.game);}
  function cleanup() {cancelAnimationFrame(session.raf);session.raf=0;keys.clear();releaseHorn();audio.stop();session.phase='closed';$$('.rhythm-pads .pressed').forEach(el=>el.classList.remove('pressed'));}
  $('#close-game').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{cleanup();session.type=null;session.game=null;});
  dialog.addEventListener('cancel',event=>{
    if(session.phase==='playing'||session.phase==='paused'){event.preventDefault();togglePause();}
  });
  function startGame() {
    audio.ensure();audio.stop();keys.clear();session.game=createGame(session.type);session.phase='playing';
    hideOverlay();$('#pause-game').disabled=false;$('#pause-game').innerHTML=icon('pause');
    $('#pause-game').setAttribute('aria-label','Приостановить игру');
    canvas.tabIndex=0;
    if(session.type==='memory')$('#memory-board button').focus({preventScroll:true});
    else canvas.focus({preventScroll:true});
    session.last=performance.now();session.raf=requestAnimationFrame(frame);renderHud();
  }
  function togglePause() {
    if(session.phase==='playing'){
      session.phase='paused';cancelAnimationFrame(session.raf);keys.clear();releaseHorn();audio.stop();
      $('#pause-game').innerHTML=icon('play');$('#pause-game').setAttribute('aria-label','Продолжить игру');
      setOverlay('<span class="overlay-symbol">☕</span><h3>Маленькая передышка</h3><p>Твои друзья подождут. Продолжим, когда будешь готов!</p><button class="button button-primary" id="resume-game">Продолжить игру</button><button class="overlay-secondary" id="pause-exit">К другим играм</button>');
      $('#resume-game').addEventListener('click',togglePause);$('#pause-exit').addEventListener('click',()=>dialog.close());
    }else if(session.phase==='paused'){
      session.phase='playing';hideOverlay();$('#pause-game').innerHTML=icon('pause');$('#pause-game').setAttribute('aria-label','Приостановить игру');
      if(session.type==='memory')$('#memory-board button:not(:disabled)')?.focus({preventScroll:true});
      else canvas.focus({preventScroll:true});
      session.last=performance.now();session.raf=requestAnimationFrame(frame);
    }
  }
  $('#pause-game').addEventListener('click',togglePause);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&session.phase==='playing')togglePause();});
  window.addEventListener('blur',()=>{keys.clear();if(session.phase==='playing')togglePause();});
  function frame(now) {
    if(session.phase!=='playing')return;
    const dt=clamp((now-session.last)/1000,0,.05);session.last=now;session.game.t+=dt;
    if(session.type==='flight')tickFlight(session.game,dt);
    if(session.type==='memory')tickMemory(session.game);
    if(session.type==='rhythm')tickRhythm(session.game);
    if(session.type==='horn')window.PonyHorn.tick(session.game,dt,W,H,{tone:(...args)=>audio.tone(...args),finish});
    if(session.phase!=='playing')return;
    renderGame();renderHud();session.raf=requestAnimationFrame(frame);
  }
  function createGame(id){
    if(id==='horn')return window.PonyHorn.create(W,H);
    if(id==='flight')return{t:0,score:0,stars:0,lives:3,x:Math.min(200,W*.28),y:250,objects:[],particles:[],spawn:.25,invincible:0,pointer:null};
    if(id==='memory'){
      const game={t:0,score:0,moves:0,pairs:0,open:[],resolveAt:0,cards:shuffled([...ponies.keys(),...ponies.keys()]).map((pony,index)=>({pony,index,flipped:false,matched:false}))};
      $('#memory-board').innerHTML=game.cards.map(card=>`<button class="memory-card" data-card="${card.index}" aria-label="Закрытая карточка ${card.index+1}" aria-pressed="false"><span class="memory-card-inner"><span class="card-back">✦</span><span class="card-front">${pony(card.pony,true)}<span>${ponies[card.pony].name}</span></span></span></button>`).join('');
      $$('[data-card]').forEach(button=>button.addEventListener('click',()=>flipCard(Number(button.dataset.card))));
      return game;
    }
    const melody=[0,2,4,2,0,2,4,7,5,4,2,0,2,4,2,0,4,5,7,5,4,2,0,2,0,2,4,7,9,7,5,4,2,4,5,4,2,0,2,4,7,5,4,2,0,4,2,0];
    return{t:0,score:0,combo:0,maxCombo:0,hits:0,misses:0,feedback:'Поймай свой ритм',feedbackAt:-1,pulses:[0,0,0,0],notes:melody.map((pitch,i)=>({time:2+i*.55,lane:[0,1,2,1,0,2,3,2,1,0,3,1][i%12],pitch,judged:false,played:false})),length:30};
  }
  function renderHud(){
    const g=session.game;if(!g)return;
    if(session.type==='flight'){
      $('#hud-primary').textContent=`✦ ${g.score} очков`;
      $('#hud-middle').textContent='♥'.repeat(g.lives)+'♡'.repeat(3-g.lives);
      $('#hud-secondary').textContent=`${Math.max(0,Math.ceil(75-g.t))} сек`;
    }else if(session.type==='memory'){
      $('#hud-primary').textContent=`Пары: ${g.pairs} / 6`;$('#hud-middle').textContent=`Ходы: ${g.moves}`;
      $('#hud-secondary').textContent=`${Math.floor(g.t/60)}:${String(Math.floor(g.t%60)).padStart(2,'0')}`;
    }else if(session.type==='horn'){
      $('#hud-primary').textContent=`✧ ${g.score} очков`;
      $('#hud-middle').textContent='♥'.repeat(g.lives)+'♡'.repeat(3-g.lives);
      $('#hud-secondary').textContent=`${Math.max(0,Math.ceil(60-g.t))} сек`;
      const power=Math.floor(g.charge*100);
      $('#horn-power-value').textContent=`${power}% · Урон ${window.PonyHorn.damage(g.charge)}`;
      $('#horn-power-fill').style.width=`${power}%`;
      $('#horn-charge-track').setAttribute('aria-valuenow',String(power));
      $('#horn-stats').textContent=`Разогнано: ${g.kills}`;
      $('#horn-instruction').textContent=g.dragging?(power===100?'Максимальная сила! Отпусти ЛКМ и кликни по монстрику.':'Води курсором вдоль рога, удерживая ЛКМ.'):(power===100?'Максимальная сила! Прицелься и кликни по монстрику.':power>=15?'Прицелься и кликни по монстрику. Можно зарядить рог ещё сильнее.':'Зажми ЛКМ на роге и води курсором вдоль него.');
    }else{
      $('#hud-primary').textContent=`♫ ${g.score} очков`;$('#hud-middle').textContent=`Серия: ${g.combo}`;
      $('#hud-secondary').textContent=`${Math.max(0,Math.ceil(30-g.t))} сек`;
    }
  }
  function renderGame(){if(session.type==='flight')drawFlight(session.game);else if(session.type==='rhythm')drawRhythm(session.game);else if(session.type==='horn')window.PonyHorn.draw(ctx,session.game,W,H);}
  function finish(score,details){
    if(session.phase!=='playing')return;
    session.phase='result';cancelAnimationFrame(session.raf);keys.clear();audio.stop();$('#pause-game').disabled=true;
    const id=session.type,g=session.game,previous=data.best[id];
    score=Math.max(0,Math.floor(score));data.best[id]=Math.max(previous,score);data.completed[id]++;
    const earned=[];
    const unlock=id=>{if(!data.achievements.includes(id)){data.achievements.push(id);earned.push(achievements.find(a=>a.id===id).title);}};
    unlock('first');
    if(gameIds.every(id=>data.completed[id]>0))unlock('explorer');
    if(id==='flight'&&g.stars>=30)unlock('stars');
    if(id==='memory'&&g.moves<=15)unlock('memory');
    if(id==='rhythm'&&g.maxCombo>=12)unlock('rhythm');
    if(id==='horn'&&g.fullPowerHits>0)unlock('horn-power');
    if(id==='horn'&&g.kills>=10)unlock('horn-guard');
    if(gameIds.reduce((sum,id)=>sum+data.completed[id],0)>=5)unlock('regular');
    save();renderCollection();renderHud();
    const title=id==='memory'?'Все друзья вместе!':id==='flight'?'Вот это полёт!':id==='horn'?(g.lives?'Поляна под защитой!':'Хорошая тренировка!'):'Праздник удался!';
    setOverlay(`<span class="overlay-symbol">${score>previous?'✧':'♡'}</span><h3>${title}</h3><div class="result-score">${score.toLocaleString('ru-RU')}</div><p>очков${score>previous?' · новый личный рекорд!':''}</p><p class="result-details">${details}</p><button class="button button-primary" id="restart-game">${icon('play')}Ещё раз</button><button class="overlay-secondary" id="result-exit">К другим играм</button>`);
    $('#restart-game').addEventListener('click',startGame);$('#result-exit').addEventListener('click',()=>dialog.close());
    if(earned.length)toast(`✦ Достижение: ${earned.join(' · ')}`);
    else if(!storageAvailable)toast('Браузер не разрешает сохранение. Рекорды доступны до закрытия страницы.');
    audio.tone(784,.35,'sine',.05);
  }

  // Flight: movement uses seconds and world coordinates on every screen size.
  function tickFlight(g,dt){
    let dx=0,dy=0;
    if(keys.has('ArrowLeft')||keys.has('KeyA'))dx--;
    if(keys.has('ArrowRight')||keys.has('KeyD'))dx++;
    if(keys.has('ArrowUp')||keys.has('KeyW'))dy--;
    if(keys.has('ArrowDown')||keys.has('KeyS'))dy++;
    if(dx||dy){const length=Math.hypot(dx,dy);g.x+=dx/length*360*dt;g.y+=dy/length*360*dt;g.pointer=null;}
    if(g.pointer){g.x+=(g.pointer.x-g.x)*Math.min(1,dt*12);g.y+=(g.pointer.y-g.y)*Math.min(1,dt*12);}
    g.x=clamp(g.x,60,W-65);g.y=clamp(g.y,55,H-55);g.invincible=Math.max(0,g.invincible-dt);
    g.spawn-=dt;
    if(g.spawn<=0){
      const storm=Math.random()<.28;
      g.objects.push({x:W+60,y:65+Math.random()*(H-130),type:storm?'storm':'star',r:storm?29:15,phase:Math.random()*6});
      g.spawn=.38+Math.random()*.25;
    }
    const speed=210+g.t*1.4;
    for(const o of g.objects){
      o.x-=speed*dt;
      if(!o.used&&Math.hypot(g.x-o.x,g.y-o.y)<o.r+24){
        if(o.type==='star'){
          o.used=true;g.score+=10;g.stars++;audio.tone(659+(g.stars%4)*80,.1);
          for(let j=0;j<8;j++)g.particles.push({x:o.x,y:o.y,vx:(Math.random()-.5)*140,vy:(Math.random()-.5)*140,life:.5,color:'#edc96e'});
        }else if(g.invincible===0){o.used=true;g.lives--;g.invincible=1.5;audio.tone(150,.25,'triangle',.08);if(!g.lives){finish(g.score,`Звёзды: ${g.stars} · Время в облаках: ${Math.floor(g.t)} с`);return;}}
      }
    }
    g.objects=g.objects.filter(o=>o.x>-80&&!o.used);
    for(const p of g.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
    g.particles=g.particles.filter(p=>p.life>0);
    if(g.t>=75)finish(g.score,`Звёзды: ${g.stars} · Полный полёт над Эквестрией!`);
  }
  function cloud(x,y,scale=1,color='#ffffffb0'){
    ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,43*scale,15*scale,0,0,Math.PI*2);ctx.ellipse(x-18*scale,y-9*scale,20*scale,20*scale,0,0,Math.PI*2);ctx.ellipse(x+11*scale,y-17*scale,25*scale,24*scale,0,0,Math.PI*2);ctx.fill();
  }
  function star(x,y,r,color,rotation=0){
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.beginPath();
    for(let i=0;i<10;i++){const angle=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;i?ctx.lineTo(Math.cos(angle)*rr,Math.sin(angle)*rr):ctx.moveTo(Math.cos(angle)*rr,Math.sin(angle)*rr);}
    ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();
  }
  function drawFlight(g){
    if(!g)return;
    const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#cbe4fa');gradient.addColorStop(1,'#f1e3f7');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=.28;const rainbow=['#e8a4c5','#eeca9f','#d7ddaa','#a8d7d7','#b4b7e3'];
    rainbow.forEach((color,i)=>{ctx.beginPath();ctx.arc(720,480,310-i*16,Math.PI,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=16;ctx.stroke();});ctx.restore();
    for(let i=0;i<10;i++){const x=((i*153+900-g.t*(i%2?21:13))%1160+1160)%1160-100;cloud(x,50+(i*83)%420,.5+(i%3)*.3,'#ffffff80');}
    ctx.fillStyle='#c8b9df55';ctx.beginPath();ctx.moveTo(0,H);for(let i=0;i<=W;i+=20)ctx.lineTo(i,475+Math.sin(i/140+g.t*.08)*15);ctx.lineTo(W,H);ctx.fill();
    for(const o of g.objects){
      if(o.type==='star'){star(o.x,o.y,o.r+4,'#fff8dd80',Math.sin(g.t*2+o.phase)*.15);star(o.x,o.y,o.r,'#eecb72',Math.sin(g.t*2+o.phase)*.15);}
      else{cloud(o.x,o.y,.73,'#aa97be');ctx.fillStyle='#e8d3a5';ctx.beginPath();ctx.moveTo(o.x+2,o.y+7);ctx.lineTo(o.x-9,o.y+22);ctx.lineTo(o.x,o.y+22);ctx.lineTo(o.x-4,o.y+35);ctx.lineTo(o.x+12,o.y+16);ctx.lineTo(o.x+3,o.y+16);ctx.fill();}
    }
    for(const p of g.particles){ctx.globalAlpha=p.life*2;star(p.x,p.y,4,p.color);}ctx.globalAlpha=1;
    if(!g.invincible||Math.floor(g.invincible*12)%2){
      const colors=['#e8a4c5','#eeca9f','#b8d9c1','#b2cce8'];
      colors.forEach((color,i)=>{ctx.strokeStyle=color;ctx.lineWidth=5;ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(g.x-33,g.y+6+i*4);ctx.quadraticCurveTo(g.x-75,g.y+Math.sin(g.t*6)*15+i*3,g.x-114,g.y+12+i*4);ctx.stroke();});ctx.globalAlpha=1;
      if(playerImage.complete&&playerImage.naturalWidth)ctx.drawImage(playerImage,g.x-66,g.y-62+Math.sin(g.t*8)*3,130,120);
      else{ctx.fillStyle='#9dd6ed';ctx.beginPath();ctx.ellipse(g.x,g.y,33,25,0,0,Math.PI*2);ctx.fill();}
    }
  }

  // Memory: delayed turns are driven by the game clock, so pausing is exact.
  function flipCard(index){
    if(session.phase!=='playing'||session.type!=='memory')return;
    const g=session.game,card=g.cards[index];
    if(!card||card.flipped||card.matched||g.open.length>=2)return;
    card.flipped=true;g.open.push(index);updateMemoryCard(card);audio.tone(440+card.pony*55,.08);
    if(g.open.length===2){
      g.moves++;
      const [a,b]=g.open.map(i=>g.cards[i]);
      if(a.pony===b.pony){
        a.matched=b.matched=true;g.pairs++;g.open=[];updateMemoryCard(a);updateMemoryCard(b);audio.tone(784,.2);
        if(g.pairs===6){g.score=Math.max(100,1500-g.moves*45-Math.floor(g.t)*2);finish(g.score,`Найдено пар: 6 · Ходы: ${g.moves} · Время: ${Math.floor(g.t)} с`);}
      }else g.resolveAt=g.t+.85;
    }
    renderHud();
  }
  function updateMemoryCard(card){
    const el=$(`[data-card="${card.index}"]`);el.classList.toggle('flipped',card.flipped);el.classList.toggle('matched',card.matched);
    el.setAttribute('aria-pressed',String(card.flipped));el.setAttribute('aria-label',card.matched?`${ponies[card.pony].name} — пара найдена`:card.flipped?ponies[card.pony].name:`Закрытая карточка ${card.index+1}`);
    el.disabled=card.matched;
  }
  function tickMemory(g){if(g.resolveAt&&g.t>=g.resolveAt){g.open.forEach(index=>{g.cards[index].flipped=false;updateMemoryCard(g.cards[index]);});g.open=[];g.resolveAt=0;}}

  // Rhythm: notes and melody share a single game clock; no audio files needed.
  const laneColors=['#b294e2','#e89fc1','#8acddd','#e5c681'];
  function hitLane(lane){
    if(session.type!=='rhythm'||session.phase!=='playing')return;
    const g=session.game;
    g.pulses[lane]=g.t+.15;
    const note=g.notes.filter(n=>n.lane===lane&&!n.judged).sort((a,b)=>Math.abs(a.time-g.t)-Math.abs(b.time-g.t))[0];
    const distance=note?Math.abs(note.time-g.t):Infinity;
    if(distance<=.22){
      note.judged=true;g.hits++;g.combo++;g.maxCombo=Math.max(g.combo,g.maxCombo);
      const perfect=distance<=.105;g.score+=(perfect?100:60)+Math.min(g.combo,20)*2;
      g.feedback=perfect?'Волшебно!':'В ритме!';g.feedbackAt=g.t;audio.tone(1047,.055,'sine',.025);
    }else{
      g.combo=0;g.feedback='Чуть ближе к линии';g.feedbackAt=g.t;
    }
    const pad=$(`[data-lane="${lane}"]`);pad.classList.add('pressed');setTimeout(()=>pad.classList.remove('pressed'),110);renderHud();
  }
  function tickRhythm(g){
    for(const n of g.notes){
      if(!n.played&&g.t>=n.time){n.played=true;audio.tone(261.63*Math.pow(2,n.pitch/12),.32,'triangle',.075);}
      if(!n.judged&&g.t-n.time>.22){n.judged=true;g.misses++;g.combo=0;g.feedback='Продолжай, всё получится';g.feedbackAt=g.t;}
    }
    if(g.t>=g.length){const accuracy=Math.round(g.hits/g.notes.length*100);finish(g.score,`Точность ${accuracy}% · Лучшая серия: ${g.maxCombo}`);}
  }
  function drawRhythm(g){
    const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#e9dff5');gradient.addColorStop(1,'#f8e6ef');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
    for(let i=0;i<18;i++){star((i*73+31)%W,(i*97+43)%H,3+i%4,'#ffffff95',i);}
    const left=W*.16,gap=W*.0125,width=(W*.68-gap*3)/4,top=-25,target=410,travel=1.8;
    for(let lane=0;lane<4;lane++){
      const x=left+lane*(width+gap),color=laneColors[lane];
      ctx.fillStyle='#ffffff45';ctx.beginPath();ctx.roundRect(x,0,width,H,17);ctx.fill();
      ctx.fillStyle=g.pulses[lane]>g.t?color:'#ffffff80';ctx.beginPath();ctx.roundRect(x+7,target-18,width-14,36,10);ctx.fill();
      ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x+7,target-18,width-14,36,10);ctx.stroke();
      ctx.fillStyle='#ab94b7';ctx.font='700 16px sans-serif';ctx.textAlign='center';ctx.fillText(['D','F','J','K'][lane],x+width/2,474);
    }
    if(g.t===0){for(let i=0;i<7;i++){const lane=[0,2,1,3,0,1,2][i],x=left+lane*(width+gap);ctx.fillStyle=laneColors[lane];ctx.beginPath();ctx.roundRect(x+23,50+i*40,width-46,22,8);ctx.fill();}}
    for(const n of g.notes){
      if(n.judged)continue;
      const until=n.time-g.t;if(until>travel+.2||until<-.3)continue;
      const y=target-until/travel*(target-top),x=left+n.lane*(width+gap);
      ctx.shadowColor=laneColors[n.lane];ctx.shadowBlur=12;ctx.fillStyle=laneColors[n.lane];ctx.beginPath();ctx.roundRect(x+17,y-13,width-34,26,9);ctx.fill();ctx.shadowBlur=0;
      star(x+width/2,y,7,'#ffffffc0');
    }
    ctx.textAlign='center';ctx.fillStyle='#a183b3';ctx.font='700 17px sans-serif';
    if(g.feedbackAt<0||g.t-g.feedbackAt<1.1)ctx.fillText(g.feedback,W/2,41);
    ctx.fillStyle='#bca2c7';ctx.font='15px sans-serif';ctx.fillText('♫',W*.08,260);ctx.fillText('♪',W*.92,180);
  }
  const controlCodes=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','KeyF','KeyJ','KeyK','Space']);
  window.addEventListener('keydown',event=>{
    if(!dialog.open)return;
    if(controlCodes.has(event.code)&&session.phase==='playing')event.preventDefault();
    if(event.code==='Space'&&event.target.tagName!=='BUTTON'&&(session.phase==='playing'||session.phase==='paused')){event.preventDefault();togglePause();return;}
    if(session.phase!=='playing')return;
    if(!event.repeat&&session.type==='rhythm'){
      const lane=['KeyD','KeyF','KeyJ','KeyK'].indexOf(event.code);if(lane>=0)hitLane(lane);
    }
    keys.add(event.code);
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));
  canvas.addEventListener('pointerdown',event=>{
    if(session.type!=='flight'||session.phase!=='playing')return;
    canvas.setPointerCapture(event.pointerId);movePointer(event);
  });
  function movePointer(event){
    if(session.type!=='flight'||session.phase!=='playing')return;
    if(event.type==='pointermove'&&!canvas.hasPointerCapture(event.pointerId))return;
    const r=canvas.getBoundingClientRect();session.game.pointer={x:(event.clientX-r.left)/r.width*W,y:(event.clientY-r.top)/r.height*H};
  }
  canvas.addEventListener('pointermove',movePointer);
  canvas.addEventListener('pointerup',()=>{if(session.type==='flight'&&session.game)session.game.pointer=null;});
  canvas.addEventListener('pointercancel',()=>{if(session.type==='flight'&&session.game)session.game.pointer=null;});
  function hornPoint(event){const r=canvas.getBoundingClientRect();return{x:(event.clientX-r.left)/r.width*W,y:(event.clientY-r.top)/r.height*H};}
  canvas.addEventListener('pointerdown',event=>{
    if(session.type!=='horn'||session.phase!=='playing'||event.pointerType!=='mouse'||event.button!==0)return;
    event.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);
    window.PonyHorn.down(session.game,hornPoint(event),W,H,{tone:(...args)=>audio.tone(...args)});renderHud();
  });
  canvas.addEventListener('pointermove',event=>{
    if(session.type!=='horn'||session.phase!=='playing'||event.pointerType!=='mouse')return;
    window.PonyHorn.move(session.game,hornPoint(event),(event.buttons&1)===1,W,H);
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,releaseHorn);
  $$('[data-lane]').forEach(button=>button.addEventListener('pointerdown',event=>{event.preventDefault();hitLane(Number(button.dataset.lane));}));
  $$('[data-lane]').forEach(button=>button.addEventListener('click',event=>{if(event.detail===0)hitLane(Number(button.dataset.lane));}));
  window.addEventListener('resize',()=>{if(dialog.open){configureCanvas();renderGame();}});
})();
