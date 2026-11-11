'use strict';
// Complete decoration purchase using controller input only: no synthetic DOM
// click or focus helper can bypass the actual navigation and activation paths.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-decor-gamepad-')));
let win;const errors=[],timeout=setTimeout(()=>{console.error('Decor gamepad UI timed out');app.exit(1)},90000);
app.whenReady().then(async()=>{
 try{
  win=new BrowserWindow({show:false,width:1440,height:960,useContentSize:true,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)},flush=()=>new Promise(resolve=>setTimeout(resolve,20));
   window.requestAnimationFrame=()=>0;await flush();
   const pad={id:'Decor integration controller',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
   Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
   let pointerRequests=0,buttonPresses=0;canvas.requestPointerLock=()=>{pointerRequests++;return Promise.reject(new DOMException('No pointer capture in controller test','NotAllowedError'))};
   const update=()=>BarGamepad.update(.05),setButton=(index,down)=>{pad.buttons[index]={pressed:down,value:down?1:0};update()};
   const press=async index=>{buttonPresses++;setButton(index,true);setButton(index,false);await flush()};
   async function navigateTo(selector){
    for(let steps=0;steps<180;steps++){
     if(document.activeElement?.matches(selector))return;
     await press(13);
    }
    throw Error('Controller could not reach '+selector+'; focused '+document.activeElement?.outerHTML);
   }
   update();update();await press(0);
   check(GameMenu.getMode()==='play'&&!paused&&BarGamepad.isActive(),'A starts the game without mouse or keyboard');
   check(pointerRequests===0&&BarInput.isLooking(),'Controller play does not request mouse capture');
   const stock=JSON.stringify(state.stock),cash=state.cash,initialCamera={...camera};
   await press(3);check(BarTablet.isOpen()&&!paused,'Y opens the tablet');
   await navigateTo('[data-tablet-tab="decor"]');await press(0);
   check(BarTablet.getTab()==='decor','D-pad and A open the decoration application');
   await navigateTo('[data-decor-category="tables"][data-decor-finish="walnut"]');
   check(!document.activeElement.disabled,'Controller reaches an affordable finish');
   await press(0);
   check(state.decor.tables==='walnut'&&state.cash===cash-120&&state.expenses===120,'A buys and applies exactly one table finish');
   check(state.decorOwned.tables.filter(id=>id==='walnut').length===1&&JSON.stringify(state.stock)===stock,'The purchase keeps ingredients and unique ownership intact');
   check(boxes.some(box=>box.decorCategory==='tables'&&box.c===BarEngine.decorStyle(state).tables.colors.top),'Actual table geometry uses the controller-selected finish');
   check(camera.x===initialCamera.x&&camera.z===initialCamera.z,'Menu navigation never moves the player');
   await press(1);check(!BarTablet.isOpen()&&!paused&&GameMenu.getMode()==='play'&&BarInput.isLooking(),'B closes the tablet and returns directly to play');
   await press(9);check(GameMenu.getMode()==='pause'&&paused,'Menu opens pause');
   await navigateTo('[data-menu-action="settings"]');await press(0);
   check($('settingsModal').open,'Settings are reachable using only the controller');
   await navigateTo('#gamepadSensitivity');const sensitivity=preferences.gamepad.sensitivity;
   await press(0);await press(15);
   check(preferences.gamepad.sensitivity>sensitivity,'A and D-pad edit the sensitivity slider');
   check(loadPreferences().gamepad.sensitivity===preferences.gamepad.sensitivity,'Controller-edited sensitivity is persisted');
   await press(1);check($('settingsModal').open,'First B ends value editing without leaving settings');
   await press(1);check(!$('settingsModal').open&&GameMenu.getMode()==='pause','Second B returns to the previous pause menu');
   await press(9);check(!paused&&GameMenu.getMode()==='play','Menu resumes after settings');
   check(state.decor.tables==='walnut'&&state.cash===cash-120&&JSON.stringify(state.stock)===stock,'Settings and navigation do not repeat the decoration purchase');
   render();check(renderer.gl.getError()===0,'Controller decoration renders cleanly');
   return {controllerOnly:true,buttonPresses,tabletNavigation:true,decorPurchase:true,geometryUpdated:true,returnWithoutPause:true,sliderEditing:true,settingsPersist:true,noPointerLock:pointerRequests===0,gl:0};
  })()`,true);
  if(errors.length)throw Error(errors.join('\n'));
  console.log('DECOR GAMEPAD UI OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error);if(errors.length)console.error(errors.join('\n'));clearTimeout(timeout);win?.destroy();app.exit(1)}
});
