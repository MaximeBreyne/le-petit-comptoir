'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-management-')));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const timeout=setTimeout(()=>{console.error('Management checks timed out');app.exit(1)},45000);
app.whenReady().then(async()=>{
 let win;
 try{
  win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   const flush=()=>new Promise(resolve=>setTimeout(resolve,20));
   const key=(code,type='keydown')=>window.dispatchEvent(new KeyboardEvent(type,{code,key:code,bubbles:true,cancelable:true}));
   const click=selector=>{const node=document.querySelector(selector);check(node&&!node.disabled,'Usable button '+selector);node.click()};
   let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
   canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});
   document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
   window.requestAnimationFrame=()=>0;await flush();
   click('[data-menu-action="new"]');await flush();preferences=defaultPreferences();
   check(BarInput.isLooking()&&locked===canvas,'Starting the game activates the camera');
   const testCamera={x:6,y:1.68,z:7,a:0,pitch:0};camera={...testCamera};keys[preferences.bindings.forward.code]=true;movement(.1);const walkDistance=camera.z-testCamera.z;
   camera={...testCamera};keys[preferences.bindings.sprint.code]=true;movement(.1);const runDistance=camera.z-testCamera.z;
   check(runDistance>walkDistance*1.7&&Math.abs(runDistance-.46)<1e-6,'Held Shift runs faster than walking');
   camera={...testCamera};keys[preferences.bindings.right.code]=true;movement(.1);check(Math.abs(Math.hypot(camera.x-testCamera.x,camera.z-testCamera.z)-runDistance)<1e-6,'Diagonal running is normalized');
   keys={};camera={...BarScene.playCamera};keys[preferences.bindings.forward.code]=true;keys[preferences.bindings.sprint.code]=true;movement(2);check(camera.z<2.35&&camera.z>1.55,'Running cannot tunnel through the counter');keys={};
   camera={...BarScene.playCamera};key('Tab');await flush();check(BarTablet.isOpen()&&!paused&&!locked,'Tab opens the tablet without pausing');
   click('[data-tablet-tab="drinks"]');click('[data-tablet-page="drinks"] [data-tablet-action="service"]');check(state.open,'The tablet opens the bar');state.spawn=999;
   const clock=state.time;last=performance.now()-40;frame(performance.now());check(state.time>clock,'Service time continues in the tablet');
   const position={x:camera.x,z:camera.z};keys.KeyW=true;keys.ShiftLeft=true;movement(.2);check(camera.x===position.x&&camera.z===position.z,'The tablet blocks walking and running');keys={};
   state.stock.rum=0;BarTablet.open('reserve');BarTablet.refresh(true);const remote=document.querySelector('[data-tablet-restock="rum"]');check(remote.disabled,'Remote transfer is disabled outside the stockroom');const stored=state.reserve.rum;remote.click();check(state.reserve.rum===stored&&state.stock.rum===0,'Remote transfer cannot move inventory');
   BarTablet.close();await flush();
   // Traverse actual collisions, not a teleport into the new room.
   walk(-5.05,0);check(Math.abs(camera.x-.95)<.02,'The rear counter aisle reaches the stockroom door');walk(0,-2.35);check(BarScene.inStockroom(camera)&&Math.abs(camera.z+.8)<.02,'The stockroom doorway is traversable');
   key('KeyE');await flush();check(BarTablet.isOpen()&&BarTablet.getTab()==='reserve','E opens inventory in the stockroom');
   click('[data-tablet-restock="rum"]');check(state.stock.rum===stored&&state.reserve.rum===0,'Local transfer conserves reserve inventory');
   const cashBeforeOrder=state.cash;click('[data-tablet-buy="rum"]');check(state.cash===cashBeforeOrder-18,'Supplier payment occurs once');for(let i=0;i<101;i++)game.tick(.1);BarTablet.refresh(true);check(state.reserve.rum===70&&state.stock.rum===stored,'Deliveries arrive in reserve rather than directly at the counter');
   key('Escape');await flush();check(!BarTablet.isOpen()&&!paused&&BarInput.isLooking(),'First Escape stows the tablet');key('Escape');await flush();check(paused&&GameMenu.getMode()==='pause','Next Escape pauses the game');GameMenu.resume();await flush();

   camera={...BarScene.playCamera};state.orders=[{id:1,name:'Lucie',recipe:'beer',patience:90,tableId:null,slot:1,phase:'preparing',arrivalRemaining:0,paymentMethod:'card'}];state.nextId=2;state.spawn=999;ui();
   const beforeRecipe=state.prep;key('Digit1');key('Numpad1');check(state.prep===beforeRecipe,'Number keys no longer choose drinks');key('Tab');await flush();
   click('[data-tablet-recipe="beer"]');await flush();check(state.prep?.recipe==='beer'&&!BarTablet.isOpen()&&BarInput.isLooking(),'Tablet recipe returns to the camera for physical preparation');
   game.takeVessel({x:7,z:1.35});camera={x:4.15,y:1.68,z:2.15,a:0,pitch:Math.atan2(1.313-1.68,.57)};game.placeHeld(camera);ui();key(preferences.bindings.pour.code);check(state.prep.pouring,'Pour starts at the counter');key('Tab');await flush();check(BarTablet.isOpen()&&!state.prep.pouring,'Opening the tablet stops held pouring');key(preferences.bindings.pour.code,'keyup');key(preferences.bindings.pour.code);check(!state.prep.pouring,'Pouring cannot restart while consulting the tablet');key(preferences.bindings.pour.code,'keyup');click('[data-tablet-action="prep"]');await flush();
   key(preferences.bindings.pour.code);for(let i=0;i<36;i++)game.tick(.1);key(preferences.bindings.pour.code,'keyup');ui();key('KeyE');key('KeyE');camera={...BarScene.playCamera};const serviceCash=state.cash;BarTablet.open('service',1);click('[data-tablet-order-action="serve"][data-order-id="1"]');check(state.sold===0&&state.cash===serviceCash&&state.orders[0].phase==='drinking'&&state.tray.length===0,'A drink chosen on the tablet is physically prepared at the bar and served before payment');
   for(let i=0;i<41;i++)game.tick(.1);check(state.orders[0].phase==='payment','The served client requests payment');game.pickupTerminal(BarEngine.registerPosition);game.payCard(1,camera);check(state.sold===0&&state.cash===serviceCash,'Card authorization does not credit money early');for(let i=0;i<31;i++)game.tick(.1);ui();check(state.sold===1&&state.cash===serviceCash+6&&state.orders.length===0,'The completed service is credited after card approval');

   BarTablet.open('drinks');await flush();const stable=document.querySelector('[data-tablet-recipe="coffee"]');BarTablet.refresh(true);check(stable===document.querySelector('[data-tablet-recipe="coffee"]'),'Catalogue controls survive updates');
   recipes.testTea={...recipes.coffee,name:'Thé de test',station:'Infusions'};BarTablet.refresh(true);check(document.querySelector('[data-tablet-recipe="testTea"]'),'A future recipe appears without adding a shortcut');
   const search=$('tabletSearch');search.focus();search.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyP',key:'p',bubbles:true,cancelable:true}));check(!paused&&BarTablet.isOpen(),'Typing P in the catalogue does not pause the game');search.value='the';search.dispatchEvent(new Event('input',{bubbles:true}));check(!document.querySelector('[data-catalogue-recipe="testTea"]').hidden&&document.querySelector('[data-catalogue-recipe="beer"]').hidden,'Search ignores accents and filters dynamically');delete recipes.testTea;search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));BarTablet.refresh(true);

   state.cash=1000;state.totalSold=0;BarTablet.open('building');BarTablet.refresh(true);check(document.querySelector('[data-tablet-upgrade="tray"]').disabled,'Building purchases remain locked before their sales threshold');
   for(const id of ['tray','cocktails','counter','assistant']){const offer=game.upgradeInfo(id);state.totalSold=offer.requiredSales;BarTablet.open(offer.category);BarTablet.refresh(true);const cash=state.cash;click('[data-tablet-upgrade="'+id+'"]');check(state.cash===cash-offer.cost&&game.upgradeInfo(id).owned,'Paid progression is applied for '+id);const owned=document.querySelector('[data-tablet-upgrade="'+id+'"]');check(owned.disabled,'An owned upgrade cannot be purchased twice');owned.click();check(state.cash===cash-offer.cost,'No duplicate purchase charge');}
   check(game.canPrepare('mojito')&&game.serviceCapacity('beer')===1500&&state.management.assistant,'Licence, building and employee effects are active');
   BarTablet.close();await flush();camera={...BarScene.stockroomCamera};const checkpoint={cash:state.cash,reserve:{...state.reserve},stock:{...state.stock},camera:{...camera}};save(true);GameMenu.returnHome();GameMenu.continueGame();await flush();
   check(state.cash===checkpoint.cash&&JSON.stringify(state.reserve)===JSON.stringify(checkpoint.reserve)&&JSON.stringify(state.stock)===JSON.stringify(checkpoint.stock),'Save/load preserves stock and reserve');check(state.management.cocktails&&state.management.counter&&state.management.assistant&&state.upgraded,'Save/load preserves paid progression');check(camera.x===checkpoint.camera.x&&camera.z===checkpoint.camera.z&&BarScene.inStockroom(camera),'Save/load restores the stockroom camera');
   BarTablet.open('building');click('[data-tablet-action="new-bar"]');
   check(GameMenu.getMode()==='confirm'&&!BarTablet.isOpen()&&state.cash===checkpoint.cash,'New bar from Building requires confirmation without changing the current game');
   click('[data-menu-action="cancel"]');await flush();check(GameMenu.getMode()==='play'&&!paused&&state.cash===checkpoint.cash,'Cancelling a new bar returns to the intact game');
   BarTablet.open('building');click('[data-tablet-action="new-bar"]');click('[data-menu-action="confirm"]');await flush();
   check(GameMenu.getMode()==='play'&&!paused&&state.cash===260&&state.day===1&&state.totalSold===0&&!state.management.assistant,'Confirming a new bar from the tablet creates a fresh session');
   render();check(renderer.gl.getError()===0,'Stockroom and management scene render without WebGL errors');
   return {sprint:{walkDistance,runDistance},reserve:'walked into room, delivered and transferred',tablet:'full service and dynamic catalogue',progression:'paid and persistent',stockroomSave:true,newBar:'tablet confirmation, cancel and restart',gl:0};
  })()`,true);
  if(errors.length)throw Error(errors.join('\n'));console.log('MANAGEMENT OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){clearTimeout(timeout);console.error(error);win?.destroy();app.exit(1)}
});
