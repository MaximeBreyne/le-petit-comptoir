const settingLabels={forward:'Avancer',back:'Reculer',left:'Aller à gauche',right:'Aller à droite',turnLeft:'Tourner à gauche',turnRight:'Tourner à droite',pause:'Pause / reprendre',pour:'Maintenir pour verser'};
let capturing=null,lastRender=0;
const menusOpen=()=>$('modal').open||$('settingsModal').open;
function controlHints(){const b=preferences.bindings;$('controlHints').textContent=`${b.forward.label} / ${b.back.label} / ${b.left.label} / ${b.right.label} : bouger · ${b.turnLeft.label} / ${b.turnRight.label} : tourner · ${b.pour.label} : verser · ${b.pause.label} : pause · F11 : plein écran`;}
function settingsUI(){
 $('bindings').replaceChildren();for(const [action,label]of Object.entries(settingLabels)){let row=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');row.className='binding';text.textContent=label;button.type='button';button.dataset.bind=action;button.textContent=capturing===action?'Appuyez sur une touche…':preferences.bindings[action].label;button.className=capturing===action?'capturing':'';row.append(text,button);$('bindings').append(row)}
 for(const k of ['quality','fps','fov','brightness','sensitivity','invertY','volume','effects','ambience','muted']){const e=$(k);if(e.type==='checkbox')e.checked=preferences[k];else e.value=preferences[k];const out=$(k+'Value');if(out)out.value=k==='fov'?preferences[k]+'°':k==='sensitivity'?preferences[k].toFixed(1)+'×':preferences[k]+' %'}controlHints();
}
function persistSettings(){const okay=savePreferences();$('settingsStatus').textContent=okay?'Réglages sauvegardés.':'Sauvegarde des réglages impossible : vérifiez l’espace disque.';audio.update();controlHints()}
function openSettings(){keys={};game.setPour(false);document.exitPointerLock?.();capturing=null;settingsUI();$('settingsStatus').textContent='';$('settingsModal').showModal();audio.setState(false,false)}
$('settings').onclick=openSettings;$('settingsClose').onclick=()=>{$('settingsModal').close();capturing=null;keys={};last=performance.now()};$('settingsModal').addEventListener('cancel',e=>{if(capturing){e.preventDefault();capturing=null;settingsUI()}});
$('bindings').onclick=e=>{const b=e.target.closest('[data-bind]');if(b){capturing=b.dataset.bind;$('settingsStatus').textContent='Appuyez sur une touche. Échap annule.';settingsUI()}};
for(const k of ['quality','fps','fov','brightness','sensitivity','invertY','volume','effects','ambience','muted'])$(k).addEventListener('input',()=>{const e=$(k);preferences[k]=e.type==='checkbox'?e.checked:e.tagName==='SELECT'&&k==='quality'?e.value:Number(e.value);settingsUI();persistSettings();render()});
$('settingsReset').onclick=()=>{preferences=defaultPreferences();capturing=null;settingsUI();persistSettings();render()};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{$('settingsStatus').textContent='Utilisez F11 pour basculer le plein écran.'}};
$('audioTest').onclick=()=>{audio.unlock();audio.chime('sale');$('settingsStatus').textContent=preferences.muted?'Le son est coupé. Décochez « Couper tous les sons » pour le tester.':'Son de service joué avec les volumes choisis.'};
addEventListener('pointerdown',()=>audio.unlock(),{once:true});addEventListener('keydown',()=>audio.unlock(),{once:true});
function togglePause(){paused=!paused;game.setPour(false);keys={};audio.setState(!paused&&state.open&&!menusOpen(),false);ui()}
$('pause').onclick=togglePause;
onkeydown=e=>{
 if(capturing){e.preventDefault();e.stopPropagation();if(e.code==='Escape'){capturing=null;settingsUI();return}if(!/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Enter|Backspace|Tab|Home|End|PageUp|PageDown)$/.test(e.code)){ $('settingsStatus').textContent='Cette touche est réservée. Choisissez une lettre, une flèche ou Espace.';return}
 const conflict=Object.entries(preferences.bindings).find(([action,b])=>action!==capturing&&b.code===e.code);if(conflict){$('settingsStatus').textContent='Cette touche sert déjà à « '+settingLabels[conflict[0]]+' ». Choisissez-en une autre.';return}
 const special={Space:'Espace',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Tab:'Tab',Enter:'Entrée',Backspace:'Retour arrière',Shift:'Maj',Control:'Ctrl',Alt:'Alt'};preferences.bindings[capturing]={code:e.code,label:special[e.key]||special[e.code]||(e.key.length===1?e.key.toUpperCase():e.code)};capturing=null;keys={};settingsUI();persistSettings();return;
 }
 if(menusOpen())return;
 if(e.code==='Escape'){e.preventDefault();openSettings();return}
 const b=preferences.bindings;
 if(e.code===b.pause.code&&!e.repeat){e.preventDefault();togglePause();return}
 if(e.code===b.pour.code&&game.isPour()){e.preventDefault();if(!paused)game.setPour(true);return}
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
 if(Object.values(b).some(v=>v.code===e.code)){e.preventDefault();keys[e.code]=true}
};
onkeyup=e=>{keys[e.code]=false;if(e.code===preferences.bindings.pour.code)game.setPour(false)};
onblur=()=>{keys={};paused=true;game.setPour(false);audio.setState(false,false);save();ui()};
canvas.onclick=()=>{if(!paused&&!menusOpen()){const lock=canvas.requestPointerLock?.();lock?.catch?.(()=>{})}};
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!paused&&!menusOpen()){camera.a-=e.movementX*.0025*preferences.sensitivity;camera.pitch=Math.max(-1.15,Math.min(1.15,camera.pitch-e.movementY*.0025*preferences.sensitivity*(preferences.invertY?-1:1)))}});
function movement(dt){const b=preferences.bindings;if(keys[b.turnLeft.code])camera.a+=dt*1.8;if(keys[b.turnRight.code])camera.a-=dt*1.8;let forward=(keys[b.forward.code]?1:0)-(keys[b.back.code]?1:0),side=(keys[b.right.code]?1:0)-(keys[b.left.code]?1:0);const length=Math.hypot(forward,side)||1;forward/=length;side/=length;
 const dx=(Math.sin(camera.a)*forward+Math.cos(camera.a)*side)*dt*2.5,dz=(Math.cos(camera.a)*forward-Math.sin(camera.a)*side)*dt*2.5;walk(dx,0);walk(0,dz);
}
settingsUI();

requestAnimationFrame(frame);
