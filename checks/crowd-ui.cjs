'use strict';
// Real rendering, table service and menu saves, with a disposable player profile.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-crowd-')));
const timeout=setTimeout(()=>{console.error('Crowd UI timed out');app.exit(1)},90000);
let win;
app.whenReady().then(async()=>{
 try{
  const errors=[];
  win=new BrowserWindow({show:false,width:1600,height:1000,useContentSize:true,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  async function capture(name){
   await evaluate('render();renderer.gl.finish();');await new Promise(resolve=>setTimeout(resolve,150));
   const png=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No capture '+name)),5000);win.webContents.once('paint',(_event,_rect,image)=>{clearTimeout(timer);resolve(image.toPNG())});win.webContents.invalidate()});
   const dir=path.join(__dirname,'artifacts');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name+'.png'),png);
  }
  const initial=await evaluate(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   const flush=()=>new Promise(resolve=>setTimeout(resolve,30));
   const key=code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,key:code,bubbles:true,cancelable:true}));
   const aimAt=point=>{const dx=point.x-camera.x,dy=point.y-camera.y,dz=point.z-camera.z;camera.a=Math.atan2(dx,dz);camera.pitch=Math.atan2(dy,Math.hypot(dx,dz));};
   const click=(action,slot)=>{const selector='[data-menu-action="'+action+'"]'+(slot===undefined?'':'[data-slot="'+slot+'"]');const button=document.querySelector(selector);check(button&&!button.disabled,'Usable menu control '+selector);button.click()};
   const tick=steps=>{for(let i=0;i<steps;i++)game.tick(.1);state=game.s;ui();};
   const sceneView=()=>{camera={x:6.55,y:1.9,z:8.1,a:Math.PI,pitch:0};aimAt({x:6.55,y:1.1,z:4.3});render();};
   let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
   canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});
   document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
   window.requestAnimationFrame=()=>0;await flush();click('new');await flush();
   check(renderer&&renderer.gl.getError()===0,'Full scene compiles and renders');
   check(state.orders.length===0,'New bar starts without extra customers');
   check(BarEngine.counterSeats.length===6,'Six physical counter seats exist at the start');
   for(const seat of BarEngine.counterSeats){const point=BarScene.counterSeat(seat.slot);check(point&&point.x===seat.x&&point.z===seat.z,'Scene and engine agree on seat '+seat.slot);check(boxes.some(box=>box.solid&&box.round&&Math.abs(box.x-point.x)<.001&&Math.abs(box.z-point.z)<.001&&Math.abs(box.y+box.h/2-point.seatHeight)<.001),'Solid stool seat supports patron '+seat.slot);}
   BarTablet.open('service');
   check(document.querySelectorAll('[data-service-seat^="counter:"]').length===6,'Tablet has all six counter places');
   check(document.querySelectorAll('[data-service-seat^="counter:"][data-service-locked="true"]').length===3,'Only three additional places start locked');
   const progress=document.querySelector('[data-crowd-progress]');check(progress&&progress.textContent.includes('20'),'Tablet explains first progression threshold');
   BarTablet.close();await flush();sceneView();
   window.__crowdQA={check,flush,key,aimAt,click,tick,sceneView};
   return {initialCustomers:state.orders.length,visibleStools:BarEngine.counterSeats.length,initialCapacity:game.crowdInfo().capacity};
  })()`);
  await capture('crowd-initial-stools');
  const progression=await evaluate(`(async()=>{
   const {check,flush,tick,sceneView}=window.__crowdQA;
   game.open();tick(10);check(state.orders.length===1,'The first customer still arrives alone after one second');
   tick(159);check(state.orders.length===1,'Initial arrivals retain their previous 16 second spacing');tick(1);check(state.orders.length===2,'Second arrival follows the initial interval');
   for(let i=0;i<20;i++)game.spawnCustomer();check(state.orders.length===7,'New game retains the previous seven-person capacity');
   const initialIds=state.orders.map(order=>order.id);state.orders.forEach(order=>{order.arrivalRemaining=0;order.patience=100});
   const tiers=[];
   for(const [sold,capacity,unlocked]of [[20,8,4],[45,9,5],[80,10,6]]){
    state.totalSold=sold;const before=state.orders.length;BarTablet.open('service');BarTablet.refresh(true);
    check(state.orders.length===before,'Unlocking a place does not instantly add a customer');
    check(game.crowdInfo().capacity===capacity,'Progressive capacity at '+sold+' served customers');
    check(document.querySelectorAll('[data-service-seat^="counter:"][data-service-locked="false"]').length===unlocked,'Tablet unlocks one stool at threshold '+sold);
    game.spawnCustomer();game.spawnCustomer();check(state.orders.length===capacity,'Only the newly unlocked capacity can fill');
    tiers.push({sold,capacity,unlocked});BarTablet.close();await flush();
   }
   check(initialIds.every(id=>state.orders.some(order=>order.id===id)),'Progression retains every existing customer');
   check(new Set(state.orders.map(order=>order.tableId?'table:'+order.tableId:'counter:'+order.slot)).size===10,'Ten customers all occupy distinct seats');
   state.orders.forEach(order=>{order.arrivalRemaining=0;order.patience=100});state.spawn=999;
   state.management.assistant=state.management.bartender=state.management.waiter=true;
   customerVisuals.clear();const poses=[],original=BarScene.customer;
   BarScene.customer=(items,options)=>{poses.push(options);return original(items,options)};
   try{sceneView();renderer.gl.finish()}finally{BarScene.customer=original}
   check(renderer.gl.getError()===0,'Full room and all three employees render without WebGL errors');
   check(poses.length===13,'Ten customers and three employees have visible models');
   for(const order of state.orders){
    const pose=poses.find(pose=>pose.id===order.id),seat=order.tableId?BarScene.tableSeat(order.tableId):BarScene.counterSeat(order.slot);
    check(pose&&pose.seated&&!pose.moving&&Math.hypot(pose.x-seat.x,pose.z-seat.z)<.001,'Customer sits at assigned chair '+order.id);
    if(!order.tableId)check(pose.seatHeight===seat.seatHeight&&pose.angle===0,'Counter customer sits at stool height facing the bar '+order.slot);
   }
   check(renderer.people.length===BarRenderer.maxContactPeople*4&&Array.from({length:13},(_,i)=>renderer.people[i*4+3]).every(value=>value===1),'All thirteen people have contact shadows in the expanded renderer capacity');
   window.__crowdQA.savedIds=state.orders.map(order=>order.id);ui();
   return {tiers,fullCapacity:state.orders.length,visiblePeople:poses.length,contactShadows:13};
  })()`);
  await capture('crowd-full-stools');
  await evaluate("BarTablet.open('service');BarTablet.refresh(true);");
  await capture('crowd-full-tablet');
  const service=await evaluate(`(async()=>{
   const {check,flush,key,aimAt,click,savedIds}=window.__crowdQA;
   BarTablet.close();await flush();
   check(GameMenu.validState(state),'Ten-client state is accepted by menu save validation');
   const savedCash=state.cash;GameMenu.pause();click('save');click('save-slot',1);
   check(JSON.parse(localStorage.getItem('comptoir-bar-slot-v1-1')).state.orders.length===10,'Manual save persists all ten customers');
   state.orders.pop();state.cash=999;click('back');click('load');click('load-slot',1);click('confirm');await flush();
   check(state.orders.length===10&&state.cash===savedCash&&savedIds.every(id=>state.orders.some(order=>order.id===id)),'Manual load restores every customer and the treasury');
   GameMenu.returnHome();click('continue');await flush();
   check(state.orders.length===10&&game.crowdInfo().counterSeatsUnlocked===6,'Automatic save and continue restore all six occupied stools');
   state.management.waiter=false;state.staff.waiter=null;customerVisuals.clear();render();
   const served=[];
   for(const order of state.orders.filter(order=>!order.tableId)){
    order.phase='preparing';order.arrivalRemaining=0;state.tray=[{recipe:order.recipe,quality:95,orderId:order.id}];
    const seat=BarScene.counterSeat(order.slot);camera={x:seat.x,y:1.68,z:2.1,a:0,pitch:0};aimAt({...seat,y:1.5});ui();render();
    const target=BarService.target(camera);check(target?.kind==='customer'&&target.orderId===order.id,'Counter place '+order.slot+' can be targeted directly from behind the bar');
    key('KeyE');check(order.phase==='drinking'&&state.tray.length===0,'E serves the customer at counter place '+order.slot);served.push(order.slot);
   }
   state.management.bartender=false;render();camera={x:2.4,y:1.68,z:1.9,a:0,pitch:0};walk(7.8,0);check(Math.abs(camera.x-10.2)<.02,'All six stools keep the staff preparation aisle clear');
   render();check(renderer.gl.getError()===0,'Service and saved customers retain valid rendering');
   return {manualSaveCustomers:10,automaticSaveCustomers:10,directlyServedSlots:served,staffAisleClear:true,gl:0};
  })()`);
  if(errors.length)throw Error(errors.join('\n'));
  console.log('CROWD UI OK',JSON.stringify({...initial,...progression,...service}));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}
});
