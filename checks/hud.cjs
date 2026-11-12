'use strict';
// Real browser checks for the compact HUD and the entrance sign. Pointer-lock
// timing is deterministic; the native capture path has separate interaction checks.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-hud-')));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const timeout=setTimeout(()=>{console.error('HUD checks timed out');app.exit(1)},45000);
app.whenReady().then(async()=>{
 let win;
 try{
  win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   const flush=()=>new Promise(resolve=>setTimeout(resolve,30));
   const click=selector=>{const node=document.querySelector(selector);check(node&&!node.disabled,'Usable control '+selector);node.click()};
   const key=(repeat=false)=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true,cancelable:true,repeat}));
   let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
   canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});
   document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
   window.requestAnimationFrame=()=>0;await flush();
   click('[data-menu-action="new"]');await flush();
   const removed=['open','end','customers','stock','order','upgrade','reset','mission','progress','interactionMode','interactionToggle','interactionTablet','interactionLabel','interactionHelp'];
   for(const id of removed)check(!document.getElementById(id),'Obsolete persistent HUD removed: '+id);
   check($('workbench').hidden,'Preparation controls do not cover the empty room');
   check($('serviceHud').getBoundingClientRect().height>0&&getComputedStyle($('serviceHud')).visibility==='visible','Compact service HUD is visible during play');
   const status=()=>({code:$('serviceHud').dataset.state,text:$('serviceStatus').textContent});
   const initial=status();check(initial.code==='closed'&&initial.text==='FERMÉ','A new bar starts visibly closed');
   const stages=[];
   for(const [time,value,remaining,clock]of [[1020,0,'11 h 00','17:00'],[1230,210,'7 h 30','20:30'],[1440,420,'4 h 00','00:00'],[1500,480,'3 h 00','01:00'],[1680,660,'0 h 00','04:00'],[1740,660,'0 h 00','05:00']]){
    state.time=time;ui();const progress=$('dayProgress');
    check(progress.max===660&&progress.value===value,'Day progress tracks elapsed service time at '+time);
    check($('dayRemaining').textContent.startsWith(remaining)&&progress.getAttribute('aria-valuetext')===$('dayRemaining').textContent,'Remaining time is readable and accessible at '+time);
    check($('clock').textContent===clock,'Clock wraps after midnight without freezing at '+time);
    stages.push({time,value:progress.value,remaining:$('dayRemaining').textContent,clock:$('clock').textContent});
   }
   state.time=1500;ui();save(true);GameMenu.returnHome();GameMenu.continueGame();await flush();
   check(state.time===1500&&$('clock').textContent==='01:00'&&$('dayProgress').value===480&&$('dayRemaining').textContent.startsWith('3 h 00'),'Loading a saved game after midnight restores the clock, progress and remaining time');
   state.time=1020;ui();
   const atlasSize=renderer.labelMap.size;
   const front={x:BarVenue.sign.x,y:1.68,z:BarVenue.sign.z-1,a:0,pitch:Math.atan2(BarVenue.sign.y-1.68,1)};
   camera={...BarScene.playCamera};key();check(!state.open,'E away from the entrance does not open service');
   camera={...front};check(BarVenue.aimedAtSign(camera),'Entrance sign is aimed at from the room');
   check(!BarVenue.aimedAtSign({...front,a:Math.PI}),'Looking away does not target the sign');
   check(!BarVenue.aimedAtSign({...front,z:front.z-2}),'A distant click cannot target the sign');
   check(!BarVenue.nearSign({...front,z:BarVenue.sign.z+.2}),'Sign cannot be operated through the exterior wall');
   BarInput.enterCursor();await flush();canvas.click();await flush();
   check(BarInput.isLooking()&&!state.open,'The first scene click captures the camera without turning the sign');
   GameMenu.pause();key();canvas.click();check(!state.open&&paused,'Pause blocks keyboard and mouse sign actions');GameMenu.resume();await flush();
   BarTablet.open('service');key();canvas.click();check(!state.open&&BarTablet.isOpen(),'The open tablet blocks keyboard and scene sign actions');BarTablet.close();await flush();
   key();check(state.open&&!state.closing&&status().code==='open'&&status().text==='OUVERT','E at the sign opens service and updates the HUD');
   state.spawn=999;key(true);check(!state.closing,'Held E does not immediately reverse the sign');
   camera.a=Math.PI;canvas.click();check(!state.closing,'Clicking elsewhere in the room leaves service open');
   camera={...front};canvas.click();check(state.closing&&status().code==='closing','Clicking the aimed sign requests the last round');
   const cash=state.cash;key();check(state.closing&&state.cash===cash,'The closing sign cannot restart or charge the service');
   render();check(renderer.gl.getError()===0,'The closing sign renders without WebGL errors');
   game.s=new Game().s;state=game.s;ui();render();
   BarTablet.open('service');click('#tabletServiceToggle');check(state.open&&status().code==='open','Service can also be opened from the tablet Service page');
   click('[data-tablet-tab="orders"]');check(!document.querySelector('[data-tablet-recipe]'),'The tablet command list has no preparation buttons');
   BarTablet.close();await flush();check(!BarPreparation.openVessels()&&state.prep===null,'A glass cannot be selected near the entrance');
   camera={...BarScene.playCamera,x:7,z:1.4};check(BarPreparation.openVessels(),'Glass selection opens only near the shelf');click('#modal [data-vessel-recipe="beer"]');await flush();
   check(state.prep?.recipe==='beer'&&!$('workbench').hidden,'Preparation controls appear only when needed');
   BarTablet.open('service');click('#tabletServiceToggle');
   check(state.closing&&state.prep?.recipe==='beer'&&$('tabletServiceToggle').disabled,'Last round remains available during preparation and disables reopening');
   render();
   // All sign states are prepared once. Repeated state changes must neither
   // overflow the shared atlas nor allocate fresh text textures per frame.
   const signRegions=[];
   for(const flags of [{open:false,closing:false},{open:true,closing:false},{open:true,closing:true}]){
    Object.assign(state,flags);ui();render();const props=[];BarVenue.render(props,state);
    const sign=props.find(prop=>prop.label);check(sign,'A physical sign exists for '+status().code);
    const rect=renderer.label(sign);check(rect.u0>=0&&rect.v0>=0&&rect.u1<=1&&rect.v1<=1,'Sign label fits the atlas');
    signRegions.push(JSON.stringify(rect));
   }
   check(new Set(signRegions).size===3,'Closed, open and last-round signs have distinct text');
   check(renderer.labelMap.size===atlasSize,'Service changes reuse preallocated label regions');
   check(renderer.gl.getError()===0,'All service states render without WebGL errors');
   return {removedHud:removed.length,stages,restoredProgress:true,sign:'E and aimed click; distance, direction, repeat, pause and tablet guards',tablet:'Service remains available during physical preparation',atlasLabels:atlasSize,gl:0};
  })()`,true);
  if(errors.length)throw Error(errors.join('\n'));console.log('HUD OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){clearTimeout(timeout);console.error(error);win?.destroy();app.exit(1)}
});
