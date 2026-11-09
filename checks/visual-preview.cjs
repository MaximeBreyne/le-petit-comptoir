'use strict';

// Capture the actual game UI and WebGL scene without showing a window or
// modifying the player's profile. Run: electron checks/visual-preview.cjs
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

  const hiddenHud=await win.webContents.insertCSS('body > :not(#world):not(script):not(style){visibility:hidden!important}');
  const labels=await evaluate(`(()=>{
   let count=0,worstAspectError=0;const regions=new Map();
   for(const box of boxes.filter(box=>box.label||box.labelLines)){
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
  const waiterTray=await evaluate(`(()=>{
   state.staff.bartender=null;state.staff.waiter={orderId:2,task:'serve',recipe:'beer',drink:{recipe:'beer',quality:95,orderId:2},remaining:4,total:6};
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

  const pause=await evaluate(`(()=>{
   if(typeof BarScene!=='undefined'&&BarScene.playCamera)camera={...BarScene.playCamera};
   paused=false;GameMenu.pause();render();
   return {home:GameMenu.isHome(),mode:GameMenu.getMode(),overlayVisible:!document.getElementById('gameMenu').hidden,paused,bodyClass:document.body.className};
  })()`);
  if(!pause.paused||pause.mode!=='pause'||!pause.overlayVisible)throw Error('Pause menu did not pause the game');
  await capture('preview-pause.png');
  if(errors.length)throw Error(errors.join('\n'));
  const result={home,game:gameView,labels,detailViews,scene,serviceScene,waiterTray,serviceUI,cashUI,pause};
  fs.writeFileSync(path.join(artifacts,'visual-preview.json'),JSON.stringify(result,null,2));
  console.log('VISUAL PREVIEW OK',JSON.stringify(result));
  clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){clearTimeout(timeout);console.error(error);if(errors.length)console.error(errors.join('\n'));app.exit(1)}
});
