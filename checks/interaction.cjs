'use strict';

// Exercise the real game UI with asynchronous pointer-lock transitions. A hidden
// Electron window may deny OS pointer capture; that native fallback is checked too.
// BAR_QA_VISIBLE=1 briefly shows a focused window and requires real OS capture.
// BAR_QA_DIAG=1 additionally records forwarded native request errors for diagnosis.
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {setupGameWindow}=require('../desktop/game-window.cjs');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-interaction-'));
app.setPath('userData',profile);
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const timeout=setTimeout(()=>{console.error('Interaction checks timed out');app.exit(1)},45000);
app.whenReady().then(async()=>{
 let win;
 try{
  const url=pathToFileURL(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html')).href;
  const native=setupGameWindow({ipcMain,getWindow:()=>win,trustedUrl:url});
  ipcMain.handle('update:status',()=>({state:'disabled',version:'test',message:'Test des interactions.'}));
  win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{preload:path.resolve('desktop/preload.cjs'),backgroundThrottling:false,nodeIntegration:false,contextIsolation:true,sandbox:true}});
  native.attach(win);
  const errors=[];
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadURL(url);
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   const flush=()=>new Promise(resolve=>setTimeout(resolve,30));
   const key=(code,value=code,type='keydown',repeat=false)=>window.dispatchEvent(new KeyboardEvent(type,{code,key:value,bubbles:true,cancelable:true,repeat}));
   const click=selector=>{const node=document.querySelector(selector);check(node&&!node.disabled,'Usable button: '+selector);node.click()};
   check(window.BarInput,'Interaction controller is loaded');
   // Control the OS callback timing, including a grant arriving after TAB.
   let locked=null,requests=0,exits=0,autoGrant=true,rejectNext=false,delayRelease=false,pending=[],releases=[];
   const changed=()=>document.dispatchEvent(new Event('pointerlockchange'));
   Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
   canvas.requestPointerLock=()=>{
    requests++;
    if(rejectNext){const error=rejectNext===true?new DOMException('Denied for test','NotAllowedError'):rejectNext;rejectNext=false;return Promise.reject(error)}
    return new Promise(resolve=>{const grant=()=>{locked=canvas;changed();resolve()};if(autoGrant)queueMicrotask(grant);else pending.push(grant)});
   };
   document.exitPointerLock=()=>{exits++;if(locked){const release=()=>{locked=null;changed()};if(delayRelease)releases.push(release);else queueMicrotask(release)}};
   window.requestAnimationFrame=()=>0;
   await flush();
   check(GameMenu.isHome()&&!locked&&requests===0,'Home never captures the mouse');
   click('[data-menu-action="new"]');await flush();
   check(GameMenu.getMode()==='play'&&!paused&&locked===canvas&&BarInput.isLooking(),'New game activates camera without an extra scene click');
   const angle=camera.a;document.dispatchEvent(new MouseEvent('mousemove',{movementX:-20,movementY:0}));check(camera.a<angle,'Automatic camera responds in the correct direction');

   key('Tab','Tab');await flush();
   check(!locked&&BarTablet.isOpen()&&!paused&&GameMenu.getMode()==='play','TAB opens the tablet without entering pause');
   click('[data-tablet-tab="drinks"]');click('[data-tablet-page="drinks"] [data-tablet-action="service"]');check(state.open,'Open bar is usable in the tablet');
   state.spawn=999;const clock=state.time;last=performance.now()-30;frame(performance.now());check(state.time>clock,'Service time continues in cursor mode');
   const stillAngle=camera.a;document.dispatchEvent(new MouseEvent('mousemove',{movementX:40,movementY:20}));check(camera.a===stillAngle,'Cursor motion does not rotate the camera');
   const position={x:camera.x,z:camera.z};key(preferences.bindings.forward.code,'z');movement(.1);key(preferences.bindings.forward.code,'z','keyup');check(camera.x===position.x&&camera.z===position.z,'Cursor typing does not move the player');
   key('Tab','Tab');await flush();check(locked===canvas&&BarInput.isLooking()&&!paused,'TAB returns directly to camera');
   delayRelease=true;key('Tab','Tab');key('Tab','Tab');
   check(releases.length===1&&locked===canvas&&BarInput.isLooking(),'Fast TAB waits for the intentional native unlock');
   releases.shift()();await flush();delayRelease=false;
   check(locked===canvas&&BarInput.isLooking()&&!paused&&GameMenu.getMode()==='play','Delayed intentional unlock recaptures after fast TAB without pausing');
   key('Tab','Tab');key('Tab','Tab');key('Tab','Tab');key('Tab','Tab');await flush();
   check(locked===canvas&&BarInput.isLooking()&&!paused,'Four rapid TAB presses settle in camera mode');

   const choices=['beer','wine','coffee','mojito'];
   for(const recipe of choices){
    game.s=new Game().s;state=game.s;state.management.cocktails=true;game.open();state.spawn=999;ui();
    BarInput.enterLook();await flush();key('Tab','Tab');await flush();click('[data-tablet-recipe="'+recipe+'"]');await flush();
    check(state.prep?.recipe===recipe,'Tablet selects recipe '+recipe);
    check(BarInput.isCursorMode()&&!locked&&!paused&&GameMenu.getMode()==='play','Recipe selection opens usable cursor controls');
    check(document.querySelector('[data-action="step"]'),'Recipe preparation is available immediately');
   }
   game.s=new Game().s;state=game.s;game.open();ui();
   for(let index=1;index<=4;index++){key('Digit'+index,String(index));key('Numpad'+index,String(index));check(state.prep===null,'Number shortcuts no longer select a recipe')}

   game.s=new Game().s;state=game.s;game.open();state.spawn=999;
   camera={...BarScene.playCamera};state.orders=[{id:1,name:'Lucie',recipe:'beer',patience:90,tableId:null,slot:1,phase:'preparing',arrivalRemaining:0,paymentMethod:'card'}];state.nextId=2;ui();
   key('Tab','Tab');await flush();click('[data-tablet-recipe="beer"]');await flush();click('[data-action="step"]');
   key(preferences.bindings.pour.code,' ');check(state.prep.pouring,'Pour key works with cursor controls');
   key('Tab','Tab');await flush();check(!state.prep.pouring&&BarTablet.isOpen(),'Opening the tablet releases held pouring');
   key(preferences.bindings.pour.code,' ','keyup');click('[data-tablet-action="prep"]');await flush();
   key(preferences.bindings.pour.code,' ');for(let i=0;i<36;i++)game.tick(.1);key(preferences.bindings.pour.code,' ','keyup');ui();
   click('[data-action="finish"]');click('[data-action="plate"]');BarTablet.open('service',1);click('[data-tablet-order-action="serve"][data-order-id="1"]');BarTablet.close({resumeLook:false});await flush();
   check(state.sold===0&&state.cash===260&&state.orders[0].phase==='drinking'&&state.tray.length===0,'A drink can be selected, prepared and served without ESC before payment');
   for(let i=0;i<41;i++)game.tick(.1);check(state.orders[0].phase==='payment','The served client requests payment');game.pickupTerminal(BarEngine.registerPosition);game.payCard(1,camera);check(state.sold===0&&state.cash===260,'Pending card approval does not credit money');for(let i=0;i<31;i++)game.tick(.1);ui();check(state.sold===1&&state.cash===266&&state.orders.length===0,'Payment completes service without ESC');
   check(GameMenu.getMode()==='play'&&!paused&&BarInput.isCursorMode(),'Service never enters the pause menu');

   // A modal is an intentional release, not an unexpected pointer loss.
   BarInput.enterLook();await flush();key('Tab','Tab');await flush();click('[data-tablet-tab="reserve"]');await flush();
   check(BarTablet.isOpen()&&BarTablet.getTab()==='reserve'&&GameMenu.getMode()==='play','Supplier tablet opens without a pause overlay');
   const beforeBuy=state.cash;click('[data-tablet-buy="rum"]');check(state.cash===beforeBuy-18,'Supplier remains usable after intentional unlock');
   BarTablet.close();await flush();check(!BarTablet.isOpen()&&GameMenu.getMode()==='play','Close supplier returns to the active session');

   BarInput.enterLook();await flush();GameMenu.pause();await flush();
   check(paused&&!locked&&GameMenu.getMode()==='pause','Pause intentionally frees the cursor');
   const noPrep=state.prep;key('Digit2','é');check(state.prep===noPrep,'Recipe shortcuts cannot run in menus');
   const previousRequests=requests;click('[data-menu-action="resume"]');await flush();
   check(!paused&&locked===canvas&&requests>previousRequests,'Resume recaptures the camera automatically');
   locked=null;changed();await flush();check(paused&&GameMenu.getMode()==='pause','Unexpected capture loss still pauses safely');
   click('[data-menu-action="resume"]');await flush();

   BarInput.enterCursor();await flush();autoGrant=false;BarInput.enterLook();
   check(pending.length===1,'A camera request is pending');BarInput.enterCursor();pending.shift()();await flush();
   check(!locked&&BarInput.isCursorMode()&&!paused,'Late pointer-lock grant cannot steal the cursor or pause');
   autoGrant=true;rejectNext=true;BarInput.enterLook();await flush();
   check(!locked&&BarInput.isCursorMode()&&!paused,'Rejected pointer lock leaves a usable cursor without throwing');
   rejectNext=new DOMException('Pointer lock cannot be acquired immediately after the user has exited the lock.','SecurityError');
   BarInput.enterLook();await flush();BarInput.enterCursor();const requestsBeforeCancel=requests;
   await new Promise(resolve=>setTimeout(resolve,1600));
   check(requests===requestsBeforeCancel&&!locked&&BarInput.isCursorMode()&&!paused,'Switching to the counter cancels pending Escape cooldown recovery');

   GameMenu.pause();GameMenu.openSettings();
   for(const code of ['Tab','KeyE','F11']){
    click('[data-bind="forward"]');const original=preferences.bindings.forward.code;key(code,code);
    check(capturing==='forward'&&preferences.bindings.forward.code===original,'Reserved shortcut cannot be rebound: '+code);key('Escape','Escape');
   }
   const oldPreferences=defaultPreferences();oldPreferences.bindings.forward={code:'Tab',label:'Tab'};oldPreferences.bindings.pour={code:'KeyE',label:'E'};delete oldPreferences.bindings.sprint;
   localStorage.setItem(PREF_KEY,JSON.stringify(oldPreferences));const migrated=loadPreferences();
   check(migrated.bindings.forward.code!=='Tab'&&migrated.bindings.pour.code!=='KeyE'&&migrated.bindings.sprint.code==='ShiftLeft','Existing bindings migrate away from reserved shortcuts and gain sprint');
   preferences=defaultPreferences();savePreferences();GameMenu.closeSettings();GameMenu.returnHome();await flush();
   check(!locked&&GameMenu.isHome(),'Returning home releases camera');
   const homePrep=state.prep;key('Digit4',"'");check(state.prep===homePrep,'Welcome rejects preparation shortcuts');
   return {automaticCamera:true,tablet:'without pause',recipes:'tablet catalogue',fullService:'without ESC',lateCapture:'safe',bindingMigration:true,requests,exits};
  })()`,true);

  // Reload restores the actual Chromium capture methods. In a hidden window,
  // acceptance and refusal must both settle into a usable input mode.
  await win.loadURL(url);
  const nativeCapture=await win.webContents.executeJavaScript(`(async()=>{
   document.querySelector('[data-menu-action="continue"]').click();
   await new Promise(resolve=>setTimeout(resolve,250));
   if(GameMenu.getMode()!=='play'||paused)throw Error('Native capture disrupted the active session');
   const captured=document.pointerLockElement===canvas;
   if(!captured&&!BarInput.isCursorMode())throw Error('Native capture denial did not restore cursor mode');
   GameMenu.pause();
   return captured?'accepted':'hidden-window denial handled';
  })()`,true);
  let focusedNative='not requested';
  if(process.env.BAR_QA_VISIBLE==='1'){
   // This opt-in phase briefly shows the actual window. Only trusted input
   // events click the menu and change modes: no pointer methods are replaced.
   await win.loadURL(url);
   if(process.env.BAR_QA_DIAG==='1')await win.webContents.executeJavaScript(`(()=>{
    window.nativeLockErrors=[];const original=canvas.requestPointerLock.bind(canvas);
    canvas.requestPointerLock=(...args)=>{const result=original(...args);return result?.catch?result.catch(error=>{window.nativeLockErrors.push({name:error.name,message:error.message});throw error}):result};
   })()`);
   const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
   const waitFor=async(expression,message)=>{
    const deadline=Date.now()+2500;
    while(Date.now()<deadline){if(await win.webContents.executeJavaScript(expression))return;await sleep(30)}
    const state=await win.webContents.executeJavaScript("({mode:GameMenu.getMode(),paused,looking:BarInput.isLooking(),cursor:BarInput.isCursorMode(),locked:document.pointerLockElement===canvas,interaction:document.body.dataset.interaction,focused:document.hasFocus(),nativeLockErrors:window.nativeLockErrors})");
    throw Error(message+': '+JSON.stringify(state));
   };
   const nativeClick=async selector=>{
    const point=await win.webContents.executeJavaScript(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.disabled)throw Error('Native button unavailable');const r=b.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
    win.webContents.sendInputEvent({type:'mouseMove',...point});
    win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...point});
    win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...point});
   };
   const nativeKey=keyCode=>{win.webContents.sendInputEvent({type:'keyDown',keyCode});win.webContents.sendInputEvent({type:'keyUp',keyCode})};
   const visibleStart=Date.now();
   win.show();win.focus();win.webContents.focus();await sleep(100);
   await nativeClick('[data-menu-action="continue"]');
   await waitFor("document.pointerLockElement===canvas&&BarInput.isLooking()&&!paused",'Focused Continue must capture the camera without a scene click');
   nativeKey('Tab');
   await waitFor("!document.pointerLockElement&&BarTablet.isOpen()&&!paused&&GameMenu.getMode()==='play'",'Native TAB must open the tablet without pause');
   await nativeClick('[data-tablet-tab="drinks"]');await nativeClick('[data-tablet-recipe="beer"]');
   await waitFor("state.prep?.recipe==='beer'&&!paused",'Native cursor click must choose a drink without ESC');
   await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
   await sleep(250);
   fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
   fs.writeFileSync(path.join(__dirname,'artifacts','interaction-cursor.png'),(await win.webContents.capturePage()).toPNG());
   nativeKey('Tab');await waitFor("BarTablet.isOpen()",'Native TAB reopens the tablet');nativeKey('Tab');
   await waitFor("document.pointerLockElement===canvas&&BarInput.isLooking()&&!paused",'Native TAB must recapture the camera');
   nativeKey('Escape');
   await waitFor("!document.pointerLockElement&&paused&&GameMenu.getMode()==='pause'",'Native ESC must pause and release capture');
   await nativeClick('[data-menu-action="resume"]');
   await waitFor("document.pointerLockElement===canvas&&BarInput.isLooking()&&!paused",'Native Resume must recapture without a scene click');
   focusedNative={start:'captured',tab:'cursor and camera',drink:'selected with mouse',resume:'captured',visibleMs:Date.now()-visibleStart};
   win.hide();
  }
  if(errors.length)throw Error(errors.join('\n'));
  console.log('INTERACTION OK',JSON.stringify({...result,nativeCapture,focusedNative}));
  clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){clearTimeout(timeout);console.error(error);win?.destroy();app.exit(1)}
});
