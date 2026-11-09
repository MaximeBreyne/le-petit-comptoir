const settingLabels={forward:'Avancer',back:'Reculer',left:'Aller à gauche',right:'Aller à droite',turnLeft:'Tourner à gauche',turnRight:'Tourner à droite',sprint:'Maintenir pour courir',pause:'Pause / reprendre',pour:'Maintenir pour verser'};
let capturing=null,lastRender=0;
const menusOpen=()=>GameMenu.isBlocking()||$('modal').open||$('settingsModal').open;
function controlHints(){const b=preferences.bindings;$('controlHints').textContent=`${b.forward.label} / ${b.back.label} / ${b.left.label} / ${b.right.label} : bouger · ${b.sprint.label} : courir · Tab : tablette · E : table / caisse / réserve · ${b.pour.label} : verser · Échap : pause`;}
function settingsUI(){
 $('bindings').replaceChildren();for(const [action,label]of Object.entries(settingLabels)){let row=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');row.className='binding';text.textContent=label;button.type='button';button.dataset.bind=action;button.textContent=capturing===action?'Appuyez sur une touche…':preferences.bindings[action].label;button.className=capturing===action?'capturing':'';row.append(text,button);$('bindings').append(row)}
 for(const k of ['quality','fps','fov','brightness','sensitivity','invertY','volume','effects','ambience','muted']){const e=$(k);if(e.type==='checkbox')e.checked=preferences[k];else e.value=preferences[k];const out=$(k+'Value');if(out)out.value=k==='fov'?preferences[k]+'°':k==='sensitivity'?preferences[k].toFixed(1)+'×':preferences[k]+' %'}controlHints();
}
function persistSettings(){const okay=savePreferences();$('settingsStatus').textContent=okay?'Réglages sauvegardés.':'Sauvegarde des réglages impossible : vérifiez l’espace disque.';audio.update();controlHints()}
function openSettings(){GameMenu.openSettings()}
$('settings').onclick=openSettings;$('settingsClose').onclick=()=>GameMenu.closeSettings({resumeSession:true});$('settingsModal').addEventListener('cancel',e=>{e.preventDefault();if(capturing){capturing=null;settingsUI()}else GameMenu.closeSettings()});
$('bindings').onclick=e=>{const b=e.target.closest('[data-bind]');if(b){capturing=b.dataset.bind;$('settingsStatus').textContent='Appuyez sur une touche. Échap annule.';settingsUI()}};
for(const k of ['quality','fps','fov','brightness','sensitivity','invertY','volume','effects','ambience','muted'])$(k).addEventListener('input',()=>{const e=$(k);preferences[k]=e.type==='checkbox'?e.checked:e.tagName==='SELECT'&&k==='quality'?e.value:Number(e.value);settingsUI();persistSettings();render()});
$('settingsReset').onclick=()=>{preferences=defaultPreferences();capturing=null;settingsUI();persistSettings();render()};
$('fullscreen').onclick=async()=>{try{if(window.desktopGame)await window.desktopGame.toggleFullscreen();else if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{$('settingsStatus').textContent='Utilisez F11 pour basculer le plein écran.'}};
$('audioTest').onclick=()=>{audio.unlock();audio.chime('sale');$('settingsStatus').textContent=preferences.muted?'Le son est coupé. Décochez « Couper tous les sons » pour le tester.':'Son de service joué avec les volumes choisis.'};
addEventListener('pointerdown',()=>audio.unlock(),{once:true});addEventListener('keydown',()=>audio.unlock(),{once:true});
function togglePause(){if(GameMenu.getMode()==='pause')GameMenu.resume();else if(GameMenu.getMode()==='play')GameMenu.pause()}
$('pause').onclick=togglePause;
function escapeAction(){if(capturing){capturing=null;settingsUI();return}if(window.BarTablet?.handleEscape())return;GameMenu.handleEscape()}
window.desktopGame?.onEscape(escapeAction);
onkeydown=e=>{
 if(capturing){e.preventDefault();e.stopPropagation();if(e.code==='Escape'){capturing=null;settingsUI();return}if(isReservedGameKey(e.code)||!/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Enter|Backspace|Home|End|PageUp|PageDown)$/.test(e.code)){ $('settingsStatus').textContent='Cette touche est réservée au jeu. Choisissez une lettre, une flèche ou Espace.';return}
 const conflict=Object.entries(preferences.bindings).find(([action,b])=>action!==capturing&&b.code===e.code);if(conflict){$('settingsStatus').textContent='Cette touche sert déjà à « '+settingLabels[conflict[0]]+' ». Choisissez-en une autre.';return}
 const special={Space:'Espace',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Tab:'Tab',Enter:'Entrée',Backspace:'Retour arrière',Shift:'Maj',Control:'Ctrl',Alt:'Alt'};preferences.bindings[capturing]={code:e.code,label:special[e.key]||special[e.code]||(e.key.length===1?e.key.toUpperCase():e.code)};capturing=null;keys={};settingsUI();persistSettings();return;
 }
 if(e.code==='Escape'){e.preventDefault();if(!e.repeat)escapeAction();return}
 const b=preferences.bindings;
 const editing=['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable;
 if(e.code===b.pause.code&&!e.repeat&&!editing&&['play','pause'].includes(GameMenu.getMode())){e.preventDefault();togglePause();return}
 if(menusOpen())return;
 if(e.code==='Tab'){e.preventDefault();if(!e.repeat)BarTablet.toggle();return}
 if(BarTablet.isOpen())return;
 if(editing)return;
 if(e.code==='KeyE'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
  e.preventDefault();if(e.repeat)return;
  if(!useInteraction())toast('Approchez le panneau d’entrée, une table, la caisse ou la réserve, puis appuyez sur E.');
  return;
 }
 if(e.code===b.pour.code&&game.isPour()){e.preventDefault();if(!paused)game.setPour(true);return}
 if(BarInput.isCursorMode())return;
 if(Object.values(b).some(v=>v.code===e.code)||(b.sprint.code==='ShiftLeft'&&e.code==='ShiftRight')){e.preventDefault();keys[e.code]=true}
};
onkeyup=e=>{keys[e.code]=false;if(e.code===preferences.bindings.pour.code)game.setPour(false)};
onblur=()=>{keys={};game.setPour(false);audio.setState(false,false);if(GameMenu.getMode()==='play'){save(true);GameMenu.pause()}};
canvas.onclick=()=>{
 if(paused||menusOpen()||BarTablet.isOpen())return;
 if(BarInput.isLooking()&&BarVenue.aimedAtSign(camera))useInteraction({action:'service'});
 else if(!BarInput.isLooking())BarInput.enterLook();
};
$('modal').addEventListener('close',()=>{if(GameMenu.getMode()==='play'&&!paused&&!BarInput.isLooking())BarInput.enterCursor();else BarInput.refresh()});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&BarInput.isLooking()&&!paused&&!menusOpen()&&!BarTablet.isOpen()){camera.a+=e.movementX*.0025*preferences.sensitivity;camera.pitch=Math.max(-1.15,Math.min(1.15,camera.pitch-e.movementY*.0025*preferences.sensitivity*(preferences.invertY?-1:1)))}});
function movement(dt){if(paused||menusOpen()||BarTablet.isOpen()||BarInput.isCursorMode())return;const b=preferences.bindings;if(keys[b.turnLeft.code])camera.a-=dt*1.8;if(keys[b.turnRight.code])camera.a+=dt*1.8;let forward=(keys[b.forward.code]?1:0)-(keys[b.back.code]?1:0),side=(keys[b.right.code]?1:0)-(keys[b.left.code]?1:0);const length=Math.hypot(forward,side)||1;forward/=length;side/=length;
 const running=keys[b.sprint.code]||(b.sprint.code==='ShiftLeft'&&keys.ShiftRight),speed=running?4.6:2.5;
 const dx=(Math.sin(camera.a)*forward+Math.cos(camera.a)*side)*dt*speed,dz=(Math.cos(camera.a)*forward-Math.sin(camera.a)*side)*dt*speed;walk(dx,0);walk(0,dz);
}
settingsUI();

requestAnimationFrame(frame);
