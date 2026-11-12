const settingLabels={forward:'Avancer',back:'Reculer',left:'Aller à gauche',right:'Aller à droite',turnLeft:'Tourner à gauche',turnRight:'Tourner à droite',sprint:'Maintenir pour courir',pause:'Pause / reprendre',pour:'Maintenir pour verser',interact:'Interagir / prendre / servir',tablet:'Ouvrir / ranger la tablette',manage:'Gérer le verre visé'};
let capturing=null,lastRender=0;
const menusOpen=()=>GameMenu.isBlocking()||$('modal').open||$('settingsModal').open;
function bindingLabel(action){return window.BarGamepad?.isActive()?BarGamepad.label(action):preferences.bindings[action]?.label||action}
function manageTarget(){
 if(paused||menusOpen()||BarTablet.isOpen()||GameMenu.getMode()!=='play')return false;
 const item=interactionTarget();if(item?.action!=='preparation')return false;
 if(item.kind==='tray')return BarPreparation.openTray(item.trayIndex);
 if(['select','manage','place-ingredient','pour','mix','ready'].includes(item.kind))return BarPreparation.openPreparation(item.prepId);
 return false;
}
window.BarControls={label:bindingLabel,manageTarget};
function controlHints(){const b=preferences.bindings;$('controlHints').textContent=window.BarGamepad?.isActive()?`Stick gauche : bouger · Stick droit : regarder · ${bindingLabel('sprint')} : courir · ${bindingLabel('tablet')} : tablette · ${bindingLabel('interact')} : interagir · ${bindingLabel('pour')} : verser · ${bindingLabel('pause')} : pause`:`${b.forward.label} / ${b.back.label} / ${b.left.label} / ${b.right.label} : bouger · ${b.sprint.label} : courir · ${b.tablet.label} : tablette · ${b.interact.label} : interagir · ${b.manage.label} : gérer · ${b.pour.label} : verser · Échap : pause`;}
function settingsUI(){
 const focused=document.activeElement?.dataset.bind;
 $('bindings').replaceChildren();for(const [action,label]of Object.entries(settingLabels)){let row=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');row.className='binding';text.textContent=label;button.type='button';button.dataset.bind=action;button.textContent=capturing===action?'Appuyez sur une touche…':preferences.bindings[action].label;button.className=capturing===action?'capturing':'';row.append(text,button);$('bindings').append(row)}
 if(focused)$('bindings').querySelector('[data-bind="'+focused+'"]')?.focus({preventScroll:true});
 for(const k of ['quality','fps','fov','brightness','sensitivity','invertY','volume','effects','ambience','muted']){const e=$(k);if(e.type==='checkbox')e.checked=preferences[k];else e.value=preferences[k];const out=$(k+'Value');if(out)out.value=k==='fov'?preferences[k]+'°':k==='sensitivity'?preferences[k].toFixed(1)+'×':preferences[k]+' %'}window.BarGamepad?.refreshSettings();window.BarDeveloper?.refresh();controlHints();
}
function persistSettings(){const okay=savePreferences();$('settingsStatus').textContent=okay?'Réglages sauvegardés.':'Sauvegarde des réglages impossible : vérifiez l’espace disque.';audio.update();controlHints()}
function openSettings(){GameMenu.openSettings()}
$('settings').onclick=openSettings;$('settingsClose').onclick=()=>GameMenu.closeSettings({resumeSession:true});$('settingsModal').addEventListener('cancel',e=>{e.preventDefault();if(capturing){capturing=null;settingsUI()}else GameMenu.closeSettings()});
$('bindings').onclick=e=>{const b=e.target.closest('[data-bind]');if(b){window.BarGamepad?.cancelCapture();capturing=b.dataset.bind;$('settingsStatus').textContent='Appuyez sur une touche. Échap annule.';settingsUI()}};
for(const k of ['quality','fps','fov','brightness','sensitivity','invertY','volume','effects','ambience','muted'])$(k).addEventListener('input',()=>{const e=$(k);preferences[k]=e.type==='checkbox'?e.checked:e.tagName==='SELECT'&&k==='quality'?e.value:Number(e.value);settingsUI();persistSettings();render()});
$('settingsReset').onclick=()=>{window.BarGamepad?.cancelCapture();preferences=defaultPreferences();capturing=null;settingsUI();persistSettings();render()};
$('fullscreen').onclick=async()=>{try{if(window.desktopGame)await window.desktopGame.toggleFullscreen();else if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{$('settingsStatus').textContent='Utilisez F11 pour basculer le plein écran.'}};
$('audioTest').onclick=()=>{audio.unlock();audio.chime('sale');$('settingsStatus').textContent=preferences.muted?'Le son est coupé. Décochez « Couper tous les sons » pour le tester.':'Son de service joué avec les volumes choisis.'};
addEventListener('pointerdown',()=>audio.unlock(),{once:true});addEventListener('keydown',()=>audio.unlock(),{once:true});
function togglePause(){if(GameMenu.getMode()==='pause')GameMenu.resume();else if(GameMenu.getMode()==='play')GameMenu.pause()}
$('pause').onclick=togglePause;
function escapeAction(){if(window.BarGamepad?.cancelCapture())return;if(capturing){capturing=null;settingsUI();return}if(window.BarPreparation?.handleEscape())return;if(window.BarTablet?.handleEscape())return;GameMenu.handleEscape()}
window.desktopGame?.onEscape(escapeAction);
onkeydown=e=>{
 window.BarGamepad?.useKeyboardMouse();
 if(capturing){e.preventDefault();e.stopPropagation();if(e.code==='Escape'){capturing=null;settingsUI();return}if(!isBindableGameKey(e.code)){ $('settingsStatus').textContent='Cette touche est réservée au jeu. Choisissez une lettre, une flèche, Tab ou Espace.';return}
 const conflict=Object.entries(preferences.bindings).find(([action,b])=>action!==capturing&&b.code===e.code);if(conflict){$('settingsStatus').textContent='Cette touche sert déjà à « '+settingLabels[conflict[0]]+' ». Choisissez-en une autre.';return}
 const special={Space:'Espace',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Tab:'Tab',Enter:'Entrée',Backspace:'Retour arrière',Shift:'Maj',Control:'Ctrl',Alt:'Alt'};preferences.bindings[capturing]={code:e.code,label:special[e.key]||special[e.code]||(e.key.length===1?e.key.toUpperCase():e.code)};capturing=null;keys={};settingsUI();persistSettings();return;
 }
 if(e.code==='Escape'){e.preventDefault();if(!e.repeat)escapeAction();return}
 const b=preferences.bindings;
 const editing=['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable;
 if(e.code===b.pause.code&&!e.repeat&&!editing&&['play','pause'].includes(GameMenu.getMode())){e.preventDefault();togglePause();return}
 if(menusOpen())return;
 if(e.code===b.tablet.code&&!editing){e.preventDefault();if(!e.repeat)BarTablet.toggle();return}
 if(BarTablet.isOpen())return;
 if(editing)return;
 if(e.code===b.interact.code&&!e.metaKey&&(!e.ctrlKey||/^Control/.test(b.interact.code))&&(!e.altKey||/^Alt/.test(b.interact.code))){
  e.preventDefault();if(e.repeat)return;
  if(!useInteraction())toast('Approchez-vous et regardez le client, l’ingrédient ou le poste à utiliser.');
  return;
 }
 if(e.code===b.manage.code&&!e.repeat){e.preventDefault();if(!manageTarget())toast('Regardez un verre au poste ou sur le plateau pour le gérer.');return}
 if(e.code===b.pour.code&&game.isPour()){e.preventDefault();if(!paused){const message=game.setPour(true,camera);if(message&&!e.repeat)toast(message)}return}
 if(BarInput.isCursorMode())return;
 if(Object.values(b).some(v=>v.code===e.code)||(b.sprint.code==='ShiftLeft'&&e.code==='ShiftRight')){e.preventDefault();keys[e.code]=true}
};
onkeyup=e=>{keys[e.code]=false;if(e.code===preferences.bindings.pour.code)game.setPour(false)};
onblur=()=>{window.BarGamepad?.suspend();keys={};game.setPour(false);audio.setState(false,false);if(GameMenu.getMode()==='play'){save(true);GameMenu.pause()}};
addEventListener('pointerdown',event=>{if(event.isTrusted)window.BarGamepad?.useKeyboardMouse()});
canvas.onclick=()=>{
 if(paused||menusOpen()||BarTablet.isOpen())return;
 if(BarInput.isLooking())useInteraction();
 else if(!BarInput.isLooking())BarInput.enterLook();
};
$('modal').addEventListener('close',()=>{if(GameMenu.getMode()==='play'&&!paused&&!BarInput.isLooking())BarInput.enterLook();else BarInput.refresh()});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&BarInput.isLooking()&&!paused&&!menusOpen()&&!BarTablet.isOpen()){camera.a+=e.movementX*.0025*preferences.sensitivity;camera.pitch=Math.max(-1.15,Math.min(1.15,camera.pitch-e.movementY*.0025*preferences.sensitivity*(preferences.invertY?-1:1)))}});
function movement(dt){if(paused||menusOpen()||BarTablet.isOpen()||BarInput.isCursorMode()&&!window.BarGamepad?.isActive())return;const b=preferences.bindings,pad=window.BarGamepad?.motion()||{forward:0,side:0,sprint:false};if(keys[b.turnLeft.code])camera.a-=dt*1.8;if(keys[b.turnRight.code])camera.a+=dt*1.8;let forward=(keys[b.forward.code]?1:0)-(keys[b.back.code]?1:0)+pad.forward,side=(keys[b.right.code]?1:0)-(keys[b.left.code]?1:0)+pad.side;const length=Math.max(1,Math.hypot(forward,side));forward/=length;side/=length;
 const running=pad.sprint||keys[b.sprint.code]||(b.sprint.code==='ShiftLeft'&&keys.ShiftRight),speed=running?4.6:2.5;
 const dx=(Math.sin(camera.a)*forward+Math.cos(camera.a)*side)*dt*speed,dz=(Math.cos(camera.a)*forward-Math.sin(camera.a)*side)*dt*speed;walk(dx,0);walk(0,dz);
}
settingsUI();

requestAnimationFrame(frame);
