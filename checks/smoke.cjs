'use strict';
const {app,BrowserWindow}=require('electron');const path=require('node:path');const fs=require('node:fs');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'comptoir-smoke-')));
const errors=[];let win;const timeout=setTimeout(()=>{console.error('Smoke checks timed out');app.exit(1)},45000);
app.whenReady().then(async()=>{try{
 win=new BrowserWindow({width:1440,height:960,show:false,webPreferences:{backgroundThrottling:false,nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.webContents.on('console-message',details=>{if(details.level==='error'||details.level===3)errors.push(details.message)});
 win.webContents.on('render-process-gone',(_e,d)=>{console.error(d);app.exit(1)});
 await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const check=(value,message)=>{if(!value)throw Error(message)};
  const flush=()=>new Promise(resolve=>setTimeout(resolve,30));
  const key=(code,type='keydown')=>window.dispatchEvent(new KeyboardEvent(type,{code,key:code,bubbles:true,cancelable:true}));
  const click=selector=>{const node=document.querySelector(selector);check(node&&!node.disabled,'Usable button '+selector);node.click()};
  const aimAt=point=>{const dx=point.x-camera.x,dy=point.y-camera.y,dz=point.z-camera.z;camera.a=Math.atan2(dx,dz);camera.pitch=Math.atan2(dy,Math.hypot(dx,dz))};
  const at=point=>{camera={x:point.x,y:1.68,z:point.z<1?1.35:Math.min(2.15,point.z-.35),a:0,pitch:0};aimAt({...point,y:point.y+.15})};
  const choose=async recipe=>{at(BarEngine.preparationLayout.vessels);key('KeyE');await flush();click('[data-vessel-recipe="'+recipe+'"]');await flush();check(state.prep?.recipe===recipe&&state.prep.held?.kind==='vessel','Rack supplies selected recipe glass');at(game.preparationStation());key('KeyE');check(state.prep.vesselPlaced,'Glass physically placed');};
  let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
  canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});
  document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
  window.requestAnimationFrame=()=>0;await flush();GameMenu.newGame();await flush();preferences=defaultPreferences();ui();check(renderer,'WebGL renderer initialized');
  BarTablet.open('service');click('[data-tablet-page="service"] [data-tablet-action="service"]');check(state.open,'Open service from the tablet');
  BarTablet.close();await flush();game.s.orders=[{id:1,name:'Lucie',recipe:'beer',patience:90,tableId:null,slot:1,phase:'preparing',arrivalRemaining:0,paymentMethod:'card'}];state.nextId=2;state.spawn=999;ui();
  await choose('beer');key(preferences.bindings.pour.code);check(state.prep.pouring,'Held pour');
  for(let i=0;i<36;i++)game.tick(.1);key(preferences.bindings.pour.code,'keyup');check(!state.prep.pouring,'Released pour');
  key('KeyE');check(state.prep.ready,'Validate dose');key('KeyE');check(state.tray.length===1,'Finished drink reaches tray');
  camera={x:6,y:1.68,z:2.1,a:0,pitch:0};aimAt({x:6,y:1.5,z:4.3});customerVisuals.clear();render();key('KeyE');
  check(state.sold===0&&state.cash===260&&state.orders[0].phase==='drinking'&&state.tray.length===0,'Direct serving leaves payment outstanding');
  for(let i=0;i<41;i++)game.tick(.1);check(state.orders[0].phase==='payment','Payment requested after drinking');game.pickupTerminal(BarEngine.registerPosition);game.payCard(1,camera);check(state.sold===0&&state.cash===260,'Pending authorization');for(let i=0;i<31;i++)game.tick(.1);ui();check(state.sold===1&&state.cash===266&&state.orders.length===0,'Confirmed payment and tip');
  BarTablet.open('reserve');click('[data-tablet-buy="rum"]');check(state.deliveries.length===1,'Supplier order submitted');BarTablet.close();await flush();
  for(let i=0;i<101;i++)game.tick(.1);check(state.reserve.rum===140&&state.stock.rum===70,'Delivery arrived in reserve');
  camera={...BarScene.stockroomCamera};BarTablet.open('reserve');click('[data-tablet-restock="rum"]');BarTablet.close();await flush();check(state.stock.rum===140&&state.reserve.rum===70,'Restock from physical reserve');
  state.management.cocktails=true;state.orders=[{id:2,name:'Nadia',recipe:'mojito',patience:80,phase:'preparing',slot:0,arrivalRemaining:0},{id:3,name:'Thomas',recipe:'wine',patience:65,phase:'preparing',slot:1,arrivalRemaining:0}];state.nextId=4;ui();
  await choose('mojito');
  for(const ingredient of Object.keys(recipes.mojito.ingredients)){
   at(BarEngine.preparationLayout.ingredients[ingredient]);key('KeyE');check(state.prep.held?.key===ingredient,'Physically taking '+ingredient);
   at(game.preparationStation());key('KeyE');
  }
  state.prep.amount=3.5;ui();save();const restored=new Game(JSON.parse(localStorage.getItem('comptoir-bar-v2')));check(restored.s.stock.rum===136&&restored.preparations().length===1,'Saved ingredients and physical preparation');
  BarTablet.open('orders');check(!document.querySelector('[data-tablet-recipe]'),'Tablet has no preparation shortcuts');check(document.querySelectorAll('[data-tablet-page="orders"] [data-queue-order]').length===2,'Tablet lists both outstanding recipes');BarTablet.close();await flush();
  check(!document.body.innerText.includes('Tabac'),'No old theme');render();check(renderer.gl.getError()===0,'Updated scene renders');
  return {cash:state.cash,stock:state.stock.rum,stage:state.prep.step,selection:'physical glass rack',service:'direct',orders:game.preparationQueue().length,title:document.title,bodyWidth:document.body.scrollWidth,windowWidth:innerWidth};
 })()`,true);
 fs.mkdirSync('checks/artifacts',{recursive:true});fs.writeFileSync('checks/artifacts/bar-preview.png',(await win.webContents.capturePage()).toPNG());
 if(errors.length)throw Error(errors.join('\n'));
 console.log('WINDOWS UI OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}});
