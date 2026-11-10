'use strict';
// The menu owns session transitions. The engine and save format stay independent.
window.GameMenu=(()=>{
 const AUTO_KEY='comptoir-bar-v2',META_KEY='comptoir-bar-save-meta-v1',SLOT_PREFIX='comptoir-bar-slot-v1-';
 const initialCamera={...camera};
 let sessionActive=false,view='home',returnView='home',settingsOrigin='home',confirmation=null,escapeSuppressedUntil=0;
 const panel=document.createElement('section');panel.id='gameMenu';panel.className='game-menu';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','menuTitle');
 document.body.append(panel);
 const gameUI=[...document.querySelectorAll('body > header, #serviceHud, #orderQueueHud, #workbench, body > footer')];

 function read(key){try{return JSON.parse(localStorage.getItem(key))}catch{return null}}
 function validState(s){
  if(!s||s.version!==2||!s.stock||![2,4].includes(s.capacity))return false;
  if(!['cash','day','time','sold','lost','revenue','expenses','waste','totalSold','spawn','nextId'].every(k=>Number.isFinite(s[k])))return false;
  if(s.day<1||s.day!==Math.floor(s.day)||s.time<0||!Number.isSafeInteger(s.nextId)||s.nextId<1)return false;
  if(!['open','closing','upgraded','gameOver'].every(k=>typeof s[k]==='boolean'))return false;
  if(!BarEngine.isValidStock(s.stock))return false;
  if(s.reserve!==undefined&&!BarEngine.isValidStock(s.reserve))return false;
  if(s.management!==undefined&&(!s.management||!['cocktails','counter','assistant'].every(k=>typeof s.management[k]==='boolean')||!Number.isFinite(s.management.restockTimer)||s.management.restockTimer<0))return false;
  if(!Array.isArray(s.orders)||s.orders.length>BarEngine.MAX_CUSTOMERS||!s.orders.every(o=>o&&recipes[o.recipe]&&Number.isSafeInteger(o.id)&&o.id>0&&typeof o.name==='string'&&o.name.length<=80&&!/[<>]/.test(o.name)&&Number.isFinite(o.patience)&&o.patience>0&&o.patience<=100))return false;
  if(!Array.isArray(s.tray)||s.tray.length>s.capacity||!s.tray.every(t=>t&&recipes[t.recipe]&&Number.isFinite(t.quality)&&t.quality>=0&&t.quality<=100))return false;
  if(!Array.isArray(s.deliveries)||!s.deliveries.every(d=>d&&ingredients[d.key]&&Number.isFinite(d.remaining)&&d.remaining>=0&&d.remaining<=10))return false;
  if(s.parkedPreps!==undefined&&!Array.isArray(s.parkedPreps))return false;
  const preparations=[s.prep,...(s.parkedPreps||[])].filter(Boolean);
  if(preparations.length>BarEngine.preparationSlots.length)return false;
  for(const p of preparations){const r=recipes[p.recipe];if(!r||!Number.isInteger(p.step)||p.step<0||p.step>=r.steps.length||!Number.isFinite(p.amount)||p.amount<0||p.amount>r.target*1.60001||!Number.isFinite(p.quality)||p.quality<0||p.quality>100||typeof p.ready!=='boolean')return false}
  return true;
 }
 function validCamera(value){return value&&['x','y','z','a','pitch'].every(k=>Number.isFinite(value[k]))&&BarScene.containsWalkablePosition(value.x,value.z)&&value.y>0&&value.y<3}
 function snapshot(slot){
  if(slot==='auto'){const s=read(AUTO_KEY),meta=read(META_KEY);return validState(s)?{state:s,savedAt:meta?.savedAt,camera:meta?.camera}:null}
  const value=read(SLOT_PREFIX+slot);return value?.schema===1&&validState(value.state)?value:null;
 }
 function sessionLabel(s){return `Soir ${s.day} · ${money(s.cash)} · ${s.totalSold} clients servis`}
 function dateLabel(value){const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString('fr-BE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Dernière partie enregistrée'}
 function freeze(){paused=true;keys={};game.setPour(false);audio.setState(false,false);window.BarTablet?.close({suspend:true});if(window.BarInput)BarInput.suspend();else document.exitPointerLock?.();last=performance.now();ui()}
 function closeDialogs(){window.BarTablet?.close({suspend:true});for(const id of ['modal','settingsModal'])if($(id).open)$(id).close()}
 function show(next){
  view=next;panel.hidden=next==='play';document.body.dataset.screen=sessionActive?'game':'home';document.body.dataset.menuOpen=String(next!=='play');
  for(const element of gameUI)element.inert=next!=='play';
  if(next!=='play'){freeze();renderMenu();requestAnimationFrame(()=>{if(view===next&&!panel.hidden)panel.querySelector('button:not(:disabled)')?.focus({preventScroll:true})})}
 }
 function notify(message){const feedback=$('menuFeedback');if(feedback)feedback.textContent=message;else toast(message)}
 function persistCurrent(){save(true);return !saveFailed}
 function didAutosave(){try{localStorage.setItem(META_KEY,JSON.stringify({savedAt:new Date().toISOString(),camera:{...camera}}))}catch{}}
 function resetView(savedCamera){
  camera=validCamera(savedCamera)?{...savedCamera}:{...initialCamera};
  camera.pitch=Math.max(-1.15,Math.min(1.15,camera.pitch));
  customerVisuals.clear();waiterVisual=null;visualTime=0;keys={};$('prep').dataset.view='';
 }
 function browserFullscreen(){
  if(!window.desktopGame&&!document.fullscreenElement&&navigator.userActivation?.isActive)document.documentElement.requestFullscreen?.().catch(()=>{});
 }
 function enterSession(s,savedCamera){
  closeDialogs();game.s=new Game(s).s;state=game.s;sessionActive=true;resetView(savedCamera);show('play');paused=false;last=performance.now();ui();audio.setState(state.open,false);canvas.tabIndex=-1;canvas.focus({preventScroll:true});save(true);window.BarInput?.enterLook();browserFullscreen();
 }
 function continueGame(){const current=snapshot('auto');if(!current){notify('Aucune sauvegarde automatique valide. Commencez une nouvelle partie.');return}enterSession(current.state,current.camera)}
 function newGame(){
  if(sessionActive||snapshot('auto')){
   confirmation={title:'Une nouvelle histoire ?',message:'La sauvegarde automatique sera remplacée. Vos sauvegardes manuelles seront conservées.',button:'Commencer la partie',action:()=>enterSession(new Game().s)};
   returnView=view;show('confirm');
  }else enterSession(new Game().s);
 }
 function pause(){if(!sessionActive)return;closeDialogs();show('pause')}
 function resume(){if(!sessionActive)return;closeDialogs();show('play');paused=false;keys={};last=performance.now();ui();audio.setState(state.open,false);canvas.focus({preventScroll:true});window.BarInput?.enterLook()}
 function returnHome(){
  if(sessionActive&&!persistCurrent()){notify('La sauvegarde a échoué. Votre partie reste ouverte.');return}
  closeDialogs();sessionActive=false;show('home');
 }
 function openSettings(){
  settingsOrigin=sessionActive?view:'home';
  if(view==='play')show('pause');
  view='settings';freeze();capturing=null;settingsUI();$('settingsStatus').textContent='';
  $('settingsClose').textContent=sessionActive?'Revenir au jeu':'Retour au menu';
  if(!$('settingsModal').open)$('settingsModal').showModal();
 }
 function closeSettings({resumeSession=false}={}){
  if(view!=='settings'&&!$('settingsModal').open)return;
  if($('settingsModal').open)$('settingsModal').close();capturing=null;keys={};last=performance.now();
  if(sessionActive&&(resumeSession||settingsOrigin==='play'))resume();else show(settingsOrigin);
 }
 function chooseSaves(kind){returnView=sessionActive?'pause':'home';show(kind)}
 function storeSlot(slot){
  if(!sessionActive||!Number.isInteger(slot)||slot<1||slot>3)return;
  const perform=()=>{
   try{game.setPour(false);localStorage.setItem(SLOT_PREFIX+slot,JSON.stringify({schema:1,savedAt:new Date().toISOString(),state:game.s,camera:{...camera}}));save(true);show('save');notify(`Emplacement ${slot} enregistré.`)}catch{show('save');notify('Sauvegarde impossible. Vérifiez l’espace disponible.')}
  };
  if(snapshot(slot)){confirmation={title:'Remplacer cette sauvegarde ?',message:`La partie de l’emplacement ${slot} sera remplacée par votre partie actuelle.`,button:'Remplacer',action:perform};returnView='save';show('confirm')}else perform();
 }
 function loadSlot(slot){
  const value=snapshot(slot);
  if(!value){notify('Cette sauvegarde est absente ou endommagée.');return}
  const perform=()=>enterSession(value.state,value.camera);
  if(sessionActive){confirmation={title:'Charger cette partie ?',message:'Votre progression actuelle sera remplacée par la sauvegarde sélectionnée.',button:'Charger la sauvegarde',action:perform};returnView='load';show('confirm')}else perform();
 }
 async function quit(){
  if(sessionActive&&!persistCurrent()){notify('La sauvegarde a échoué. Réessayez avant de quitter.');return}
  if(window.desktopGame?.quit){try{await window.desktopGame.quit()}catch{notify('La fermeture a échoué. Vous pouvez utiliser la croix de la fenêtre.')}}
  else notify('Fermez cet onglet pour quitter le jeu. Votre partie est sauvegardée.');
 }
 function handleEscape(){
  if(performance.now()<escapeSuppressedUntil){escapeSuppressedUntil=0;return}
  if(view==='settings'||$('settingsModal').open){closeSettings();return}
  if(view==='confirm'){confirmation=null;if(returnView==='play')resume();else show(returnView);return}
  if(view==='load'||view==='save'){show(sessionActive?'pause':'home');return}
  if(view==='pause'){resume();return}
  if(view==='play')pause();
 }
 function pointerUnlocked(){if(view==='play'&&sessionActive){escapeSuppressedUntil=performance.now()+180;pause()}}

 function button(label,action,options={}){
  const element=document.createElement('button');element.type='button';element.className='menu-button'+(options.primary?' menu-button-primary':'')+(options.quiet?' menu-button-quiet':'');element.dataset.menuAction=action;element.textContent=label;element.disabled=!!options.disabled;
  return element;
 }
 function renderMenu(){
  const home=view==='home';panel.classList.toggle('game-menu-home',home);panel.classList.toggle('game-menu-compact',!home);
  panel.replaceChildren();
  const ambient=document.createElement('div');ambient.className='menu-ambient';ambient.setAttribute('aria-hidden','true');panel.append(ambient);
  const content=document.createElement('div');content.className='menu-content';panel.append(content);
  const brand=document.createElement('div');brand.className='menu-brand';
  const emblem=document.createElement('img');emblem.className='menu-logo';emblem.src='assets/brand/logo-128.png';emblem.alt='';emblem.width=72;emblem.height=72;
  const eyebrow=document.createElement('p');eyebrow.className='menu-eyebrow';eyebrow.textContent=home?'SIMULATION DE BAR · ÉDITION LOCALE':sessionActive?`LE PETIT COMPTOIR · SOIR ${state.day}`:'LE PETIT COMPTOIR';brand.append(emblem,eyebrow);content.append(brand);
  const title=document.createElement('h1');title.id='menuTitle';
  if(home){title.innerHTML='Le Petit<br><span>Comptoir.</span>'}else title.textContent={pause:'Une petite pause.',load:'Retrouver votre soirée.',save:'Garder une trace.',confirm:confirmation?.title}[view]||'Le Petit Comptoir';
  content.append(title);
  const intro=document.createElement('p');intro.className='menu-intro';intro.textContent=home?'Une soirée. Votre histoire.':view==='pause'?'Le bar peut attendre. Reprenez quand vous êtes prêt.':view==='load'?'Choisissez la partie que vous souhaitez retrouver.':view==='save'?'Trois emplacements pour conserver vos soirées.':confirmation?.message||'';content.append(intro);
  const actions=document.createElement('nav');actions.className='menu-actions';actions.setAttribute('aria-label',home?'Menu principal':'Menu de pause');content.append(actions);
  if(home){
   const current=snapshot('auto');actions.append(button('Continuer la partie','continue',{primary:!!current,disabled:!current}),button('Nouvelle partie','new',{primary:!current}),button('Charger une sauvegarde','load'),button('Réglages','settings'),button('Retour au bureau','quit',{quiet:true}));
   if(current){const summary=document.createElement('p');summary.className='menu-save-summary';summary.textContent=sessionLabel(current.state);content.append(summary)}
  }else if(view==='pause'){
   actions.append(button('Reprendre la partie','resume',{primary:true}),button('Sauvegarder la partie','save'),button('Charger une sauvegarde','load'),button('Réglages','settings'),button('Retour au menu principal','home'),button('Retour au bureau','quit',{quiet:true}));
  }else if(view==='load'||view==='save'){
   actions.classList.add('menu-slots');
   const slots=view==='load'?['auto',1,2,3]:[1,2,3];
   for(const slot of slots){
    const data=snapshot(slot),card=button('',view==='load'?'load-slot':'save-slot',{disabled:view==='load'&&!data});card.dataset.slot=String(slot);card.classList.add('menu-slot');
    const name=document.createElement('strong');name.textContent=slot==='auto'?'Sauvegarde automatique':`Emplacement ${slot}`;
    const description=document.createElement('span');description.textContent=data?sessionLabel(data.state):'Emplacement vide';
    const date=document.createElement('small');date.textContent=data?dateLabel(data.savedAt):view==='save'?'Enregistrer la partie ici':'Aucune partie enregistrée';card.append(name,description,date);actions.append(card);
   }
   actions.append(button('Retour','back',{quiet:true}));
  }else if(view==='confirm')actions.append(button(confirmation.button,'confirm',{primary:true}),button('Annuler','cancel',{quiet:true}));
  const feedback=document.createElement('p');feedback.id='menuFeedback';feedback.className='menu-feedback';feedback.setAttribute('role','status');content.append(feedback);
  const footer=document.createElement('div');footer.className='menu-footer';footer.innerHTML='<span>LE PETIT COMPTOIR</span><span>Une adresse à faire vivre.</span>';panel.append(footer);
  if(home){const sceneNote=document.createElement('div');sceneNote.className='menu-scene-note';sceneNote.innerHTML='<span>LE SERVICE COMMENCE À 17 H</span><p>Les lumières sont allumées.<br>Il ne manque plus que vous.</p>';panel.append(sceneNote)}
 }
 panel.addEventListener('click',event=>{
  const b=event.target.closest('[data-menu-action]');if(!b||b.disabled)return;
  switch(b.dataset.menuAction){
   case 'continue':continueGame();break;case 'new':newGame();break;case 'resume':resume();break;case 'home':returnHome();break;case 'settings':openSettings();break;case 'quit':void quit();break;
   case 'load':chooseSaves('load');break;case 'save':chooseSaves('save');break;case 'load-slot':loadSlot(b.dataset.slot==='auto'?'auto':Number(b.dataset.slot));break;case 'save-slot':storeSlot(Number(b.dataset.slot));break;
   case 'confirm':{const action=confirmation?.action;confirmation=null;action?.();break}case 'cancel':confirmation=null;if(returnView==='play')resume();else show(returnView);break;case 'back':show(sessionActive?'pause':'home');break;
  }
 });
 panel.addEventListener('keydown',event=>{
  if(event.code!=='Tab')return;
  const buttons=[...panel.querySelectorAll('button:not(:disabled)')];if(!buttons.length)return;
  const first=buttons[0],lastButton=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();lastButton.focus()}else if(!event.shiftKey&&document.activeElement===lastButton){event.preventDefault();first.focus()}
 });
 show('home');
 return {isHome:()=>!sessionActive,hasSession:()=>sessionActive,isBlocking:()=>view!=='play',canAutosave:()=>sessionActive&&view==='play',getMode:()=>view,pause,resume,openSettings,closeSettings,handleEscape,pointerUnlocked,returnHome,resetView,didAutosave,continueGame,newGame,validState};
})();
