'use strict';
// Camera capture and the counter cursor are separate from the pause menu.
window.BarInput=(()=>{
 let mode='cursor',suspended=true,wasLocked=document.pointerLockElement===canvas,pending=null,releasing=false,fallback='';
 let lastUnlockAt=-Infinity,retriedUnlockAt=-Infinity,recoveryTimer=null;
 const panel=document.createElement('section');panel.id='interactionMode';panel.setAttribute('aria-label','Souris et comptoir');
 const heading=document.createElement('div');heading.className='interaction-heading';
 const label=document.createElement('strong');label.id='interactionLabel';
 const button=document.createElement('button');button.type='button';button.id='interactionToggle';button.setAttribute('aria-describedby','interactionHelp');
 const tabletButton=document.createElement('button');tabletButton.type='button';tabletButton.id='interactionTablet';tabletButton.textContent='Tab · Tablette';tabletButton.addEventListener('click',()=>window.BarTablet?.open());
 const help=document.createElement('p');help.id='interactionHelp';help.setAttribute('role','status');
 heading.append(label,tabletButton,button);panel.append(heading,help);document.body.append(panel);

 function active(){return window.GameMenu?.getMode()==='play'&&!paused&&!$('modal').open&&!$('settingsModal').open&&!window.BarTablet?.isOpen()}
 function stopActions(){keys={};game.setPour(false)}
 function cancelRecovery(){if(recoveryTimer!==null)clearTimeout(recoveryTimer);recoveryTimer=null}
 function refresh(){
  document.body.dataset.interaction=mode;
  panel.hidden=suspended||!active();
  const target=interactionTarget();
  label.textContent=BarScene.inStockroom(camera)?'Réserve':target?.section==='register'?'Caisse':mode==='look'?'Caméra libre':'Service';
  button.textContent=mode==='look'?'Curseur':'Caméra';
  button.setAttribute('aria-label',mode==='look'?'Libérer la souris pour gérer le comptoir':'Reprendre la caméra');
  const terminal=state.payments?.terminalCarried?' · Terminal sans fil en main.':'';
  const text=fallback||((mode==='look'?(target?target.label:'Tab : service et gestion · Maintenez Maj pour courir.'):'Préparez et servez à la souris. Cliquez sur le décor pour reprendre la caméra.')+terminal);
  if(help.textContent!==text)help.textContent=text;
 }
 function release(){
  if(document.pointerLockElement!==canvas||releasing)return;
  // The browser reports this asynchronously. Keep its intent until the event,
  // even if Tab has already switched the requested mode back to the camera.
  releasing=true;
  try{document.exitPointerLock()}catch{releasing=false}
 }
 function enterCursor(){
  cancelRecovery();mode='cursor';suspended=false;fallback='';stopActions();release();refresh();
 }
 function suspend(){
  cancelRecovery();mode='cursor';suspended=true;fallback='';stopActions();release();refresh();
 }
 function failed(attempt,error){
  if(pending!==attempt)return;
  clearTimeout(attempt.timeout);pending=null;
  if(mode!=='look'||suspended||!active())return;
  // Chromium briefly blocks recapture after Escape's default unlock. A normal
  // permission denial must remain a cursor fallback, never a retry loop.
  const sinceUnlock=Date.now()-lastUnlockAt;
  const cooldown=error?.name==='SecurityError'&&/pointer lock.*immediately after.*exited the lock/i.test(error.message||'');
  if(cooldown&&sinceUnlock>=0&&sinceUnlock<2000&&retriedUnlockAt!==lastUnlockAt){
   const unlockAt=lastUnlockAt;
   fallback='Reprise de la caméra…';
   recoveryTimer=setTimeout(()=>{
    recoveryTimer=null;
    if(mode!=='look'||suspended||!active())return;
    retriedUnlockAt=unlockAt;enterLook();
   },Math.max(0,1300-sinceUnlock));
   refresh();return;
  }
  mode='cursor';stopActions();fallback='Caméra indisponible pour le moment. Réessayez avec Tab ou le bouton Caméra.';refresh();
 }
 function settled(attempt){
  if(pending!==attempt)return;
  clearTimeout(attempt.timeout);pending=null;
  if(mode!=='look'||suspended||!active())release();
  else if(document.pointerLockElement!==canvas&&!releasing)enterLook();
  refresh();
 }
 function enterLook(){
  if(!active())return;
  mode='look';suspended=false;fallback=recoveryTimer!==null?'Reprise de la caméra…':'';stopActions();refresh();
  canvas.tabIndex=-1;canvas.focus({preventScroll:true});
  if(document.pointerLockElement===canvas||pending||releasing||recoveryTimer!==null)return;
  const attempt={timeout:null,promise:false};pending=attempt;
  if(!canvas.requestPointerLock){failed(attempt);return}
  try{
   // Request immediately inside the start/resume/Tab gesture, before awaiting anything.
   const result=canvas.requestPointerLock();
   attempt.promise=!!result?.then;
   if(attempt.promise)result.then(()=>settled(attempt),error=>failed(attempt,error));
   if(pending===attempt)attempt.timeout=setTimeout(()=>failed(attempt),5000);
  }catch(error){failed(attempt,error)}
 }
 function toggle(){if(!active())return;if(mode==='look')enterCursor();else enterLook()}
 button.addEventListener('click',toggle);
 document.addEventListener('pointerlockchange',()=>{
  const locked=document.pointerLockElement===canvas,previous=wasLocked;wasLocked=locked;
  if(locked){
   if(pending)settled(pending);
   if(mode!=='look'||suspended||!active())release();
  }else{
   // Native Escape can suspend the menu before this event arrives, so preserve
   // the time here and let Chromium's specific error identify its cooldown.
   if(previous)lastUnlockAt=Date.now();
   const intentional=releasing;releasing=false;
   if(mode==='look'&&!suspended&&active()){
    if(intentional)enterLook();
    // Escape or focus loss is a real pause; releasing the cursor for the UI is not.
    else if(previous)window.GameMenu.pointerUnlocked();
   }
  }
  refresh();
 });
 document.addEventListener('pointerlockerror',()=>{
  const attempt=pending;
  // Modern Chromium also rejects the promise with the useful failure reason.
  Promise.resolve().then(()=>{if(attempt&&!attempt.promise)failed(attempt)});
 });
 const observer=new MutationObserver(refresh);
 observer.observe(document.body,{attributes:true,attributeFilter:['data-screen','data-menu-open']});
 observer.observe($('modal'),{attributes:true,attributeFilter:['open']});
 observer.observe($('settingsModal'),{attributes:true,attributeFilter:['open']});
 refresh();
 return {enterLook,enterCursor,toggle,suspend,refresh,isLooking:()=>mode==='look'&&!suspended,isCursorMode:()=>mode==='cursor'&&!suspended};
})();
