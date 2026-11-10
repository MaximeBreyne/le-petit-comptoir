'use strict';

// Capture the actual game UI and WebGL scene without showing a window or
// modifying the player's profile. Run: node node_modules/electron/cli.js checks/visual-preview.cjs
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');

const root=path.resolve(__dirname,'..');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-visual-'));
const artifacts=path.join(__dirname,'artifacts');
app.setPath('userData',profile);
const errors=[];
let win;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timeout=setTimeout(()=>{console.error('Visual preview timed out');app.exit(1)},90000);

app.whenReady().then(async()=>{
 try{
  // The capture window stays hidden and at a fixed size. The desktop bridge
  // avoids browser fullscreen prompts; native window behavior has separate tests.
  ipcMain.handle('game:fullscreen:get',()=>true);
  ipcMain.handle('game:fullscreen:toggle',()=>true);
  ipcMain.handle('game:quit',()=>false);
  const updateStatus={state:'disabled',version:require('../package.json').version,
   sourceDirectory:null,message:'Aperçu de développement.'};
  ipcMain.handle('update:status',()=>updateStatus);
  ipcMain.handle('update:check',()=>updateStatus);
  ipcMain.handle('update:choose-source',()=>updateStatus);
  win=new BrowserWindow({show:false,width:1600,height:1000,useContentSize:true,
   backgroundColor:'#101a19',webPreferences:{preload:path.join(root,'desktop/preload.cjs'),
    sandbox:true,nodeIntegration:false,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
  win.webContents.on('console-message',details=>{
   if(details.level==='error'||details.level===3)errors.push(details.message);
  });
  win.webContents.on('render-process-gone',(_event,details)=>{
   console.error('Renderer exited',details);app.exit(1);
  });
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||path.join(root,'dist/index.html')));
  await sleep(400);
  fs.mkdirSync(artifacts,{recursive:true});
  async function evaluate(expression){return win.webContents.executeJavaScript(expression,true)}
  async function capture(name){
   await evaluate('render();renderer.gl.finish();');
   // Keep the application's RAF running: hidden-window capture needs a freshly
   // composited frame after camera/UI changes, while paused freezes simulation.
   await sleep(250);
   // Offscreen painting supplies the newly composed frame directly; capturePage
   // can return an older surface while a regular BrowserWindow remains hidden.
   const png=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('No fresh preview frame for '+name)),5000);
    win.webContents.once('paint',(_event,_dirty,image)=>{clearTimeout(timer);resolve(image.toPNG())});
    win.webContents.invalidate();
   });
   fs.writeFileSync(path.join(artifacts,name),png);
  }

  const home=await evaluate(`(()=>{
   if(!renderer)throw Error('WebGL renderer unavailable');
   if(!window.GameMenu||!GameMenu.isHome())throw Error('Welcome screen missing');
   paused=true;
   return {home:GameMenu.isHome(),mode:GameMenu.getMode(),overlayVisible:!document.getElementById('gameMenu').hidden,bodyClass:document.body.className};
  })()`);
  await capture('preview-home.png');

  await evaluate(`(()=>{
   const button=document.querySelector('[data-menu-action="new"]')||document.querySelector('#menu-new')||
    [...document.querySelectorAll('button')].find(button=>/^(Nouvelle partie|Nouveau bar|Commencer une partie)$/i.test(button.textContent.trim()));
   if(!button)throw Error('New game button missing');
   button.click();
  })()`);
  await sleep(100);
  const gameView=await evaluate(`(()=>{
   if(GameMenu.isHome())throw Error('New game did not enter the bar');
   paused=true;keys={};game.setPour(false);
   game.open();
   state=game.s;
   state.orders=[{id:1,name:'Lucie',recipe:'beer',patience:90},{id:2,name:'Marc',recipe:'wine',patience:80}];
   state.nextId=3;state.spawn=16;
   customerVisuals.clear();visualTime=0;render();visualTime=4;
   if(typeof BarScene!=='undefined'&&BarScene.playCamera)camera={...BarScene.playCamera};
   ui();render();
   return {home:GameMenu.isHome(),mode:GameMenu.getMode(),overlayVisible:!document.getElementById('gameMenu').hidden,bodyClass:document.body.className,camera:{...camera},orders:state.orders.length};
  })()`);
  await capture('preview-game.png');

  const hud=await evaluate(`(()=>{
   camera={...BarScene.homeCamera};state.time=1230;ui();render();
   if(!$('workbench').hidden||document.getElementById('interactionMode')||document.querySelector('aside'))throw Error('Persistent management panels still cover the room');
   if($('dayProgress').value!==210)throw Error('Half-day HUD progress is incorrect');
   return {status:$('serviceStatus').textContent,remaining:$('dayRemaining').textContent,progress:$('dayProgress').value};
  })()`);
  await capture('preview-room.png');
  const lighting={};
  for(const [name,time]of [['day',1020],['night',1380]]){
   lighting[name]=await evaluate(`(()=>{
    state.time=${time};camera={...BarScene.homeCamera};ui();render();renderer.gl.finish();
    const daylight=BarRenderer.daylightAt(state.time),uploadedDaylight=renderer.gl.getUniform(renderer.program,renderer.uniforms.daylight);
    if(Math.abs(uploadedDaylight-daylight)>.00001)throw Error('Service time did not reach the lighting shader');
    const glError=renderer.gl.getError();if(glError!==renderer.gl.NO_ERROR)throw Error('Lighting WebGL error '+glError);
    return {time:state.time,daylight,uploadedDaylight,camera:{...camera},visualTime,glError};
   })()`);
   await capture('preview-room-'+name+'.png');
  }
  if(lighting.day.daylight!==1||lighting.night.daylight!==0||lighting.day.visualTime!==lighting.night.visualTime)throw Error('Day/night fixture must change lighting without moving customers');
  for(const [name,flags]of Object.entries({closed:{open:false,closing:false},open:{open:true,closing:false},closing:{open:true,closing:true}})){
   await evaluate('Object.assign(state,'+JSON.stringify(flags)+');camera={x:6.78,y:1.78,z:8.7,a:0,pitch:.12};ui();render();');
   await capture('preview-entrance-'+name+'.png');
  }
  await evaluate('state.open=true;state.closing=false;state.time=1020;ui();');

  const hiddenHud=await win.webContents.insertCSS('body > :not(#world):not(script):not(style){visibility:hidden!important}');
  const labels=await evaluate(`(()=>{
   let count=0,worstAspectError=0;const regions=new Map();
   for(const box of [...boxes,...BarVenue.labelTemplates].filter(box=>box.label||box.labelLines)){
    const rect=renderer.label(box),face=box.labelFace||'front';
    if(!rect)throw Error('Missing label: '+box.label);
    if(!(rect.u0>=0&&rect.v0>=0&&rect.u1<=1&&rect.v1<=1&&rect.u1>rect.u0&&rect.v1>rect.v0))throw Error('Invalid label region: '+box.label);
    const aspect=face==='top'||face==='bottom'?box.w/box.d:face==='left'||face==='right'?box.d/box.h:box.w/box.h;
    const pixelAspect=(rect.u1-rect.u0)*renderer.atlas.width/((rect.v1-rect.v0)*renderer.atlas.height);
    const error=Math.abs(pixelAspect/aspect-1);worstAspectError=Math.max(worstAspectError,error);
    if(error>.02)throw Error('Distorted label aspect: '+box.label+' ('+pixelAspect+' instead of '+aspect+')');
    regions.set(JSON.stringify([rect.u0,rect.v0,rect.u1,rect.v1]),rect);count++;
   }
   const unique=[...regions.values()];
   for(let i=0;i<unique.length;i++)for(let j=0;j<i;j++){
    const a=unique[i],b=unique[j];
    if(Math.min(a.u1,b.u1)-Math.max(a.u0,b.u0)>1e-7&&Math.min(a.v1,b.v1)-Math.max(a.v0,b.v0)>1e-7)throw Error('Overlapping label atlas regions');
   }
   return {count,regions:unique.length,worstAspectError};
  })()`);
  const atlas=await evaluate('renderer.atlas.toDataURL("image/png")');
  fs.writeFileSync(path.join(artifacts,'preview-label-atlas.png'),Buffer.from(atlas.split(',')[1],'base64'));
  const detailViews={
   reserve:{x:2.25,y:1.65,z:-1.25,a:Math.PI,pitch:-.06},
   'reserve-oblique':{x:3.6,y:1.65,z:-1.2,a:Math.atan2(-1.35,-2.5),pitch:-.06},
   menu:{x:2,y:1.7,z:4.35,a:-Math.PI/2,pitch:.12},
   chairs:{x:2.9,y:1.35,z:7.45,a:3.75,pitch:-.28},
   signs:{x:6,y:1.7,z:2,a:Math.PI,pitch:.18},
   banner:{x:6,y:1.7,z:6.3,a:Math.PI,pitch:.20},
  };
  for(const [name,view]of Object.entries(detailViews)){
   await evaluate('camera='+JSON.stringify(view)+';render();');
   await capture('preview-'+name+'.png');
  }
  const reserveExtension=await evaluate(`(()=>{
   const keys=['whisky','gin','tonic','cola'];
   for(const key of keys)state.reserve[key]=ingredients[key].pack*2;
   camera={x:2.2,y:1.5,z:-1.65,a:-Math.PI/2,pitch:-.22};render();
   const stockShapes=[];BarScene.storageVisuals(stockShapes,state);
   return {camera:{...camera},stock:Object.fromEntries(keys.map(key=>[key,state.reserve[key]])),shapes:stockShapes.length};
  })()`);
  await capture('preview-reserve-extension.png');

  const drinkComparisons=[];
  await evaluate(`(()=>{
   window.__previewBeforeDrinks={state:JSON.parse(JSON.stringify(state)),fov:preferences.fov};
   state.orders=[];state.staff={bartender:null,waiter:null};state.management.assistant=false;state.management.bartender=false;state.management.waiter=false;
   state.prep=null;state.tray=[];state.time=1020;customerVisuals.clear();waiterVisual=null;
   window.__previewOriginalRender=renderer.render;window.__previewDrinkShapes=[];
   renderer.render=function(view,dynamic,settings,time){return window.__previewOriginalRender.call(this,view,[...dynamic,...window.__previewDrinkShapes],settings,time)};
   preferences.fov=50;camera={x:6.2,y:1.67,z:2.05,a:0,pitch:-.35};
  })()`);
  for(const ids of [['virginMojito','lemonade','whisky'],['ginTonic','ginFizz','cubaLibre']]){
   const comparison=await evaluate(`(()=>{
    const ids=${JSON.stringify(ids)};window.__previewDrinkShapes=[];const g=BarScene.geometry(window.__previewDrinkShapes),drinks=[];
    ids.forEach((id,index)=>{
     const x=5.7+index*.5,full=[],empty=[],partial=[];
     BarScene.glass(BarScene.geometry(full),id,x-.12,1.102,3.08,1);
     BarScene.glass(BarScene.geometry(empty),id,x+.12,1.102,3.08,0);
     BarScene.glass(BarScene.geometry(partial),id,x-.12,1.102,3.08,.25);
     const liquid=shape=>shape.round&&shape.c===recipes[id].color&&[BarScene.materials.glass,BarScene.materials.clearGlass].includes(shape.mat);
     if(!full.some(liquid)||empty.some(liquid))throw Error('Full/empty liquid comparison failed for '+id);
     const level=shapes=>Math.max(...shapes.filter(liquid).map(shape=>shape.y+shape.h/2));
     if(!(level(full)>level(partial)))throw Error('Liquid level must rise with the dose for '+id);
     if(id==='ginTonic'&&full.filter(liquid).some(shape=>shape.mat!==BarScene.materials.clearGlass))throw Error('Gin tonic must remain transparent');
     window.__previewDrinkShapes.push(...full,...empty);
     drinks.push({id,name:recipes[id].name,vessel:recipes[id].vessel,fullX:x-.12,emptyX:x+.12,fullShapes:full.length,emptyShapes:empty.length});
    });
    render();renderer.gl.finish();const glError=renderer.gl.getError();if(glError!==renderer.gl.NO_ERROR)throw Error('Drink WebGL error '+glError);
    return {drinks,camera:{...camera},fov:preferences.fov,glError};
   })()`);
   const name='preview-drinks-'+ids.join('-')+'.png';await capture(name);drinkComparisons.push({...comparison,capture:name});
  }
  await evaluate(`(()=>{
   renderer.render=window.__previewOriginalRender;preferences.fov=window.__previewBeforeDrinks.fov;
   game.s=window.__previewBeforeDrinks.state;state=game.s;customerVisuals.clear();
   delete window.__previewOriginalRender;delete window.__previewDrinkShapes;delete window.__previewBeforeDrinks;
  })()`);
  const scene=await evaluate(`(()=>{
   camera=typeof BarScene!=='undefined'&&BarScene.homeCamera?{...BarScene.homeCamera}:{x:10.5,y:1.72,z:8.5,a:3.91,pitch:-.045};
   render();renderer.gl.finish();
   const start=performance.now();
   for(let i=0;i<20;i++){render();renderer.gl.finish()}
   const averageRenderMs=(performance.now()-start)/20;
   const glError=renderer.gl.getError();
   if(glError!==renderer.gl.NO_ERROR)throw Error('WebGL error '+glError);
   return {camera:{...camera},averageRenderMs,glError,canvas:[canvas.width,canvas.height],staticVertices:renderer.count};
  })()`);
  await capture('preview-bar.png');
  const serviceScene=await evaluate(`(()=>{
   game.s=new Game().s;state=game.s;game.open();state.spawn=999;state.nextId=6;
   const order=(id,name,recipe,tableId,phase,extra={})=>({id,name,recipe,tableId,slot:0,phase,patience:85,arrivalRemaining:0,drinkRemaining:0,paymentMethod:'cash',due:0,tender:0,cardRemaining:0,...extra});
   state.orders=[
    order(1,'Lucie','coffee',1,'awaiting-order'),
    order(2,'Marc','beer',2,'preparing'),
    order(3,'Nadia','wine',3,'drinking',{drinkRemaining:5,due:7}),
    order(4,'Thomas','beer',4,'payment',{paymentMethod:'card',due:6}),
    order(5,'Sophie','coffee',null,'cash-collected',{due:3,tender:10}),
   ];
   state.management.bartender=true;state.management.waiter=true;
   state.staff.bartender={orderId:2,recipe:'beer',remaining:5,total:8};
   state.staff.waiter={orderId:1,task:'take-order',remaining:4,total:6};
   customerVisuals.clear();waiterVisual=null;visualTime=20;render();
   for(let i=0;i<100;i++){visualTime+=.05;render()}
   for(const order of state.orders.filter(order=>order.tableId)){
    const seat=BarScene.tableSeat(order.tableId),visual=customerVisuals.get(order.id);
    if(!visual||Math.hypot(visual.x-seat.x,visual.z-seat.z)>.001)throw Error('Seated customer is not on table chair '+order.tableId);
   }
   camera={x:2.9,y:1.55,z:5.1,a:Math.atan2(-.8,1.35),pitch:-.18};ui();render();
   return {tables:4,employees:['bartender','waiter'],register:{x:2.65,z:2.0}};
  })()`);
  await capture('preview-tables.png');
  await evaluate('state.management.waiter=false;camera={x:BarScene.tableSeat(1).x-.70,y:1.3,z:BarScene.tableSeat(1).z,a:Math.PI/2,pitch:0};render();');
  await capture('preview-customer-face.png');
  const waiterTray=await evaluate(`(()=>{
   state.management.waiter=true;state.staff.bartender=null;state.staff.waiter={orderId:2,task:'serve',recipe:'beer',drink:{recipe:'beer',quality:95,orderId:2},remaining:4,total:6};
   for(let i=0;i<60;i++){visualTime+=.05;render()}
   const p=alongRoute(waiterVisual.route,waiterVisual.progress),sn=Math.sin(p.angle),cs=Math.cos(p.angle);
   const x=p.x-sn*.8+cs*1.5,z=p.z-cs*.8-sn*1.5;
   camera={x,y:1.5,z,a:Math.atan2(p.x-x,p.z-z),pitch:-.16};render();
   return {task:state.staff.waiter.task,recipe:state.staff.waiter.recipe,position:{x:p.x,z:p.z},camera:{...camera}};
  })()`);
  await capture('preview-waiter-tray.png');
  await evaluate("state.staff.bartender={orderId:2,recipe:'beer',remaining:5,total:8};state.staff.waiter={orderId:1,task:'take-order',remaining:4,total:6};");
  await evaluate('camera={x:6,y:1.68,z:7.3,a:Math.PI,pitch:-.04};render();');
  await capture('preview-staff.png');
  await evaluate('camera={x:2.65,y:1.64,z:1.82,a:0,pitch:-.12};render();');
  await capture('preview-register.png');
  await evaluate(`(()=>{game.pickupTerminal(camera);if(!state.payments.terminalCarried)throw Error('Terminal pickup failed at till');render()})()`);
  await capture('preview-terminal-held.png');
  await evaluate('game.returnTerminal(camera);render();');

  const occupiedBar=await evaluate(`(()=>{
   const prior=JSON.parse(JSON.stringify(state));
   state.management.assistant=true;state.management.bartender=true;state.management.waiter=true;
   state.staff.waiter=null;state.staff.bartender=null;state.time=1380;
   state.orders=Array.from({length:7},(_,index)=>({id:index+1,name:'Client '+(index+1),recipe:['beer','wine','coffee'][index%3],patience:85,tableId:index<4?index+1:null,slot:index<4?null:index-4,phase:'preparing',arrivalRemaining:0,paymentMethod:'card'}));
   customerVisuals.clear();waiterVisual=null;camera={...BarScene.homeCamera};
   for(let frame=0;frame<4;frame++){render();renderer.gl.finish()}
   const frames=12,start=performance.now();for(let frame=0;frame<frames;frame++){render();renderer.gl.finish()}
   const averageRenderMs=(performance.now()-start)/frames,glError=renderer.gl.getError();
   if(glError!==renderer.gl.NO_ERROR)throw Error('Occupied bar WebGL error '+glError);
   window.__previewBeforeOccupied=prior;
   return {customers:state.orders.length,employees:3,frames,averageRenderMs,quality:preferences.quality,canvas:[canvas.width,canvas.height],glError};
  })()`);
  await capture('preview-occupied-night.png');
  await evaluate('game.s=window.__previewBeforeOccupied;state=game.s;customerVisuals.clear();waiterVisual=null;delete window.__previewBeforeOccupied;');
  await win.webContents.removeInsertedCSS(hiddenHud);

  const serviceUI=await evaluate(`(()=>{
   camera={x:2.9,y:1.68,z:6.4,a:-Math.PI/2,pitch:-.1};paused=false;
   if(!BarTablet.open('service',1))throw Error('Service tablet did not open');paused=true;BarTablet.refresh(true);
   const take=document.querySelector('[data-service-order="1"] [data-tablet-order-action="take"]');
   if(!take||take.disabled)throw Error('Nearby table order action unavailable');
   return {tab:BarTablet.getTab(),nearTable:game.canReachOrder(1,camera),orderButton:take.textContent};
  })()`);
  await capture('preview-service.png');
  const cashUI=await evaluate(`(()=>{
   BarTablet.close({suspend:true});camera={x:2.65,y:1.64,z:1.82,a:0,pitch:-.12};paused=false;
   if(!BarTablet.open('register',5))throw Error('Register tablet did not open');paused=true;
   const input=document.querySelector('[data-change-input="5"]');
   if(!input||input.disabled)throw Error('Cash change input unavailable');
   input.value='7.00';input.focus({preventScroll:true});BarTablet.refresh(true);
   const confirm=document.querySelector('[data-change-confirm="5"]');
   if(!confirm||confirm.disabled||input.value!=='7.00')throw Error('Cash amount or confirm control changed on refresh');
   return {tab:BarTablet.getTab(),nearTill:game.nearRegister(camera),received:10,due:3,selectedChange:Number(input.value)};
  })()`);
  await capture('preview-cash.png');

  const licenseUI=await evaluate(`(()=>{
   BarTablet.close({suspend:true});game.s=new Game().s;state=game.s;state.totalSold=36;state.cash=1000;
   camera={...BarScene.playCamera};customerVisuals.clear();waiterVisual=null;paused=false;
   if(!BarTablet.open('licenses'))throw Error('License tablet did not open');paused=true;BarTablet.refresh(true);
   const signature=document.querySelector('[data-upgrade="signature"]'),button=signature?.querySelector('[data-tablet-upgrade="signature"]');
   if(!signature||!button?.disabled||!signature.textContent.includes('Licence cocktails')||!signature.textContent.includes('Licence spiritueux'))throw Error('Signature prerequisites are not visible');
   return {sales:state.totalSold,cash:state.cash,tab:BarTablet.getTab(),licenses:[...document.querySelectorAll('[data-upgrade]')].filter(card=>BarEngine.managementUpgrades[card.dataset.upgrade].category==='licenses').map(card=>({id:card.dataset.upgrade,text:card.textContent})),unmetPrerequisites:game.upgradeInfo('signature').unmetPrerequisites};
  })()`);
  await capture('preview-licenses.png');
  await evaluate('document.querySelector(\'[data-upgrade="signature"]\').scrollIntoView({block:"end"});');
  await capture('preview-license-prerequisites.png');

  const pause=await evaluate(`(()=>{
   if(typeof BarScene!=='undefined'&&BarScene.playCamera)camera={...BarScene.playCamera};
   paused=false;GameMenu.pause();render();
   return {home:GameMenu.isHome(),mode:GameMenu.getMode(),overlayVisible:!document.getElementById('gameMenu').hidden,paused,bodyClass:document.body.className};
  })()`);
  if(!pause.paused||pause.mode!=='pause'||!pause.overlayVisible)throw Error('Pause menu did not pause the game');
  await capture('preview-pause.png');
  if(errors.length)throw Error(errors.join('\n'));
  const result={home,game:gameView,hud,lighting,labels,detailViews,reserveExtension,drinkComparisons,scene,serviceScene,waiterTray,occupiedBar,serviceUI,cashUI,licenseUI,pause};
  fs.writeFileSync(path.join(artifacts,'visual-preview.json'),JSON.stringify(result,null,2));
  console.log('VISUAL PREVIEW OK',JSON.stringify(result));
  clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){clearTimeout(timeout);console.error(error);if(errors.length)console.error(errors.join('\n'));app.exit(1)}
});
