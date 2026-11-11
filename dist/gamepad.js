'use strict';
// Standard Gamepad mapping: menu controls remain fixed while game actions can
// be rebound. Polling is owned by the main frame, including while paused.
window.BarGamepad=(()=>{
 const names=['A / Croix','B / Rond','X / Carré','Y / Triangle','LB / L1','RB / R1','LT / L2','RT / R2','View / Share','Menu / Options','Stick gauche','Stick droit'];
 const actionNames={interact:'Interagir / prendre / servir',tablet:'Tablette',manage:'Gérer le verre visé',pour:'Maintenir pour verser',sprint:'Maintenir pour courir',pause:'Pause / reprendre'};
 let active=false,padKey=null,armed=false,previous=[],motionState={forward:0,side:0,sprint:false},pourArmed=false,blurred=false;
 let capture=null,captureReady=false,repeatDirection=null,repeatTime=0,status='Branchez une manette, puis appuyez sur un bouton.',editingValue=false;
 const label=action=>names[preferences.gamepad.bindings[action]]||preferences.bindings[action]?.label||action;
 const pressed=(pad,index)=>!!pad.buttons[index]&&(pad.buttons[index].pressed||pad.buttons[index].value>.55);
 const playing=()=>GameMenu.getMode()==='play'&&!paused&&!menusOpen()&&!BarTablet.isOpen();
 const zero=()=>{motionState={forward:0,side:0,sprint:false}};
 function setStatus(text){if(status===text)return;status=text;if($('gamepadStatus'))$('gamepadStatus').textContent=text}
 function stop(){zero();game.setPour(false);pourArmed=false;repeatDirection=null;repeatTime=0;editingValue=false}
 function activate(){if(active)return;active=true;keys={};audio.unlock();if(playing())BarInput.enterGamepad();controlHints();document.body.dataset.inputDevice='gamepad'}
 function useKeyboardMouse(){if(!active)return;active=false;stop();document.body.dataset.inputDevice='keyboard';if(playing())BarInput.enterLook();controlHints()}
 function suspend(){stop();armed=false;blurred=true}
 addEventListener('focus',()=>{blurred=false;armed=false});
 function cancelCapture(){if(!capture)return false;capture=null;captureReady=false;refreshSettings();return true}
 function scope(){if($('settingsModal').open)return $('settingsModal');if($('modal').open)return $('modal');if(BarTablet.isOpen())return $('tabletModal');const menu=$('gameMenu');return menu&&!menu.hidden?menu:null}
 function visible(node){return !node.disabled&&!node.closest('[hidden],[inert]')&&getComputedStyle(node).visibility!=='hidden'&&node.getClientRects().length>0}
 function controls(root){return [...root.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(visible)}
 function focus(node){node?.focus({preventScroll:true});node?.scrollIntoView({block:'nearest',inline:'nearest'});editingValue=false}
 function moveFocus(root,direction,sequential=false){
  const all=controls(root);if(!all.length)return;
  const current=document.activeElement,index=all.indexOf(current);if(index<0){focus(all[0]);return}
  if(sequential||direction==='up'||direction==='down'){
   focus(all[(index+(direction==='up'||direction==='left'?-1:1)+all.length)%all.length]);return;
  }
  const rect=current.getBoundingClientRect(),cx=(rect.left+rect.right)/2,cy=(rect.top+rect.bottom)/2,sign=direction==='left'?-1:1;
  const candidates=all.filter(node=>node!==current).map(node=>{const r=node.getBoundingClientRect(),dx=((r.left+r.right)/2-cx)*sign,dy=Math.abs((r.top+r.bottom)/2-cy);return {node,dx,score:dx+dy*2}}).filter(item=>item.dx>4).sort((a,b)=>a.score-b.score);
  focus(candidates[0]?.node||all[(index+sign+all.length)%all.length]);
 }
 function adjust(node,direction,coarse=false){
  if(!node||!visible(node))return false;
  if(node.tagName==='SELECT'){
   const options=[...node.options].filter(option=>!option.disabled),index=options.indexOf(node.selectedOptions[0]);
   const next=options[Math.max(0,Math.min(options.length-1,index+direction))];if(next){node.value=next.value;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}))}return true;
  }
  if(node.tagName==='INPUT'&&['range','number'].includes(node.type)){
   const step=Number(node.step)>0?Number(node.step):1,delta=coarse&&node.type==='number'?Math.max(1,step):step;
   const min=node.min===''?-1e9:Number(node.min),max=node.max===''?1e9:Number(node.max),old=Number(node.value)||0;
   node.value=String(Math.round(Math.min(max,Math.max(min,old+direction*delta))*1e6)/1e6);
   node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));return true;
  }
  return false;
 }
 function back(){
  if(cancelCapture())return;
  if(capturing){capturing=null;settingsUI();return}
  if(editingValue){editingValue=false;return}
  if($('modal').open){if(!BarPreparation.handleEscape())$('modal').close();return}
  escapeAction();
 }
 function navigate(root,pad,edges,dt){
  if(capturing){if(edges[1]){capturing=null;settingsUI()}return}
  if(edges[1]||edges[9]){back();return}
  let all=controls(root);if(!all.includes(document.activeElement))focus(all[0]);
  if(edges[0]){
   const element=document.activeElement;
   if(element?.matches('input[type="number"],input[type="range"],select'))editingValue=!editingValue;
   else element?.click();
   return;
  }
  if(edges[4]||edges[5]){moveFocus(root,edges[4]?'up':'down',true);return}
  if(root===$('tabletModal')&&![0,1,4,5,6,9].includes(preferences.gamepad.bindings.tablet)&&edges[preferences.gamepad.bindings.tablet]){BarTablet.close();return}
  const horizontal=pressed(pad,14)?-1:pressed(pad,15)?1:Math.abs(pad.axes[0]||0)>.55?Math.sign(pad.axes[0]):0;
  const vertical=pressed(pad,12)?-1:pressed(pad,13)?1:Math.abs(pad.axes[1]||0)>.55?Math.sign(pad.axes[1]):0;
  const direction=vertical?(vertical<0?'up':'down'):horizontal?(horizontal<0?'left':'right'):null;
  if(direction){
   repeatTime-=dt;
   if(direction!==repeatDirection||repeatTime<=0){
    const first=direction!==repeatDirection;repeatDirection=direction;repeatTime=first?.36:.13;
    if(horizontal&&adjust(document.activeElement,horizontal,pressed(pad,6))){}
    else if(editingValue&&vertical&&adjust(document.activeElement,-vertical,pressed(pad,6))){}
    else moveFocus(root,direction);
   }
  }else {repeatDirection=null;repeatTime=0}
  const scroll=pad.axes[3]||0;if(Math.abs(scroll)>.25){
   const node=root.querySelector('.tablet-main')||root;node.scrollTop+=scroll*dt*650;
  }
 }
 function deadzone(x,y){const radius=Math.hypot(x,y),zone=preferences.gamepad.deadzone;if(radius<=zone)return [0,0];const scale=Math.min(1,(radius-zone)/(1-zone))/radius;return [x*scale,y*scale]}
 function refreshSettings(){
  if(!$('gamepadBindings'))return;
  const focused=document.activeElement?.dataset.padBind,container=$('gamepadBindings');container.replaceChildren();
  for(const [action,title]of Object.entries(actionNames)){
   const row=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');row.className='binding';text.textContent=title;button.type='button';button.dataset.padBind=action;
   button.textContent=capture===action?'Relâchez, puis appuyez…':label(action);button.classList.toggle('capturing',capture===action);
   button.onclick=()=>{capturing=null;capture=action;captureReady=false;$('settingsStatus').textContent='Relâchez les boutons, puis appuyez sur le nouveau bouton. Échap annule. La croix directionnelle reste réservée à la navigation.';settingsUI()};row.append(text,button);container.append(row);
  }
  if(focused)container.querySelector('[data-pad-bind="'+focused+'"]')?.focus({preventScroll:true});
  for(const key of ['enabled','sensitivity','deadzone','invertY']){const element=$('gamepad'+key[0].toUpperCase()+key.slice(1));element.type==='checkbox'?element.checked=preferences.gamepad[key]:element.value=preferences.gamepad[key];}
  $('gamepadSensitivityValue').value=preferences.gamepad.sensitivity.toFixed(1)+'×';$('gamepadDeadzoneValue').value=Math.round(preferences.gamepad.deadzone*100)+' %';$('gamepadStatus').textContent=status;
 }
 function update(dt){
  dt=Math.min(.1,Math.max(0,Number(dt)||0));zero();
  if(capture&&!$('settingsModal').open)cancelCapture();
  let devices=[];try{devices=[...(navigator.getGamepads?.()||[])]}catch{}
  const available=devices.filter(pad=>pad?.connected&&pad.mapping==='standard'),pad=available.find(item=>item.index+':'+item.id===padKey)||available[0];
  if(!preferences.gamepad.enabled||!pad){
   if(padKey){stop();padKey=null;armed=false;previous=[];if(active&&GameMenu.getMode()==='play'){save(true);GameMenu.pause()}active=false;document.body.dataset.inputDevice='keyboard';controlHints();}
   setStatus(!preferences.gamepad.enabled?'Manette désactivée.':devices.some(pad=>pad?.connected)?'Cette manette ne fournit pas de disposition standard. Activez son mode compatible avec les jeux Windows.':'Branchez une manette, puis appuyez sur un bouton.');return;
  }
  const identity=pad.index+':'+pad.id,buttons=Array.from({length:17},(_,index)=>pressed(pad,index));
  if(identity!==padKey){stop();padKey=identity;armed=false;previous=buttons;setStatus('Manette détectée. Relâchez les boutons et les sticks.');}
  const neutral=!buttons.some(Boolean)&&pad.axes.every(axis=>Math.abs(axis)<.35);
  if(blurred){previous=buttons;return}
  if(!armed){if(neutral){armed=true;pourArmed=true;setStatus('Manette prête · '+String(pad.id).slice(0,75));}previous=buttons;return}
  const edges=buttons.map((value,index)=>value&&!previous[index]);previous=buttons;
  if(capture){
   stop();if(!captureReady){if(!buttons.some(Boolean))captureReady=true;return}
   const index=edges.findIndex(Boolean);if(index<0)return;
   if(index>11){$('settingsStatus').textContent='La croix directionnelle est réservée aux menus. Choisissez un autre bouton.';return}
   const conflict=Object.keys(actionNames).find(action=>action!==capture&&preferences.gamepad.bindings[action]===index);
   if(conflict){$('settingsStatus').textContent='Ce bouton sert déjà à « '+actionNames[conflict]+' ».';return}
   preferences.gamepad.bindings[capture]=index;capture=null;captureReady=false;refreshSettings();persistSettings();return;
  }
  const [side,forwardAxis]=deadzone(pad.axes[0]||0,pad.axes[1]||0),[lookX,lookY]=deadzone(pad.axes[2]||0,pad.axes[3]||0);
  if(edges.some(Boolean)||side||forwardAxis||lookX||lookY)activate();
  if(!active)return;
  const root=scope();
  if(root){game.setPour(false);pourArmed=!buttons[preferences.gamepad.bindings.pour];navigate(root,pad,edges,dt);return}
  if(!playing())return;
  const bindings=preferences.gamepad.bindings;
  if(edges[bindings.pause]){stop();togglePause();return}
  if(edges[bindings.tablet]){stop();BarTablet.toggle();return}
  if(edges[bindings.manage]){stop();BarControls.manageTarget();return}
  if(edges[bindings.interact]){game.setPour(false);useInteraction();if(!playing())return}
  if(!BarInput.isLooking())BarInput.enterGamepad();
  motionState={forward:-forwardAxis,side,sprint:buttons[bindings.sprint]};
  camera.a+=lookX*dt*2.35*preferences.gamepad.sensitivity;
  camera.pitch=Math.max(-1.15,Math.min(1.15,camera.pitch-lookY*dt*1.9*preferences.gamepad.sensitivity*(preferences.gamepad.invertY?-1:1)));
  if(!buttons[bindings.pour]){if(game.s.prep?.pouring)game.setPour(false);pourArmed=true}
  else if(pourArmed&&game.isPour()){const message=game.setPour(true,camera);if(message&&edges[bindings.pour])toast(message)}
 }
 for(const key of ['enabled','sensitivity','deadzone','invertY']){
  const element=$('gamepad'+key[0].toUpperCase()+key.slice(1));element.addEventListener('input',()=>{preferences.gamepad[key]=element.type==='checkbox'?element.checked:Number(element.value);if(key==='enabled')stop();refreshSettings();persistSettings()});
 }
 document.body.dataset.inputDevice='keyboard';refreshSettings();
 return {update,motion:()=>motionState,isActive:()=>active,label,refreshSettings,cancelCapture,useKeyboardMouse,suspend,isCapturing:()=>!!capture};
})();
