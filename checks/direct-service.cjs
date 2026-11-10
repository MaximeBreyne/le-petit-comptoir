'use strict';
// Exercise customer targeting, real keyboard/click controls and the physical
// cash drawer without opening the tablet or touching the player's profile.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-direct-service-')));
const timeout=setTimeout(()=>{console.error('Direct service checks timed out');app.exit(1)},45000);
let win;
app.whenReady().then(async()=>{
 try{
  const errors=[];
  win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   const flush=()=>new Promise(resolve=>setTimeout(resolve,30));
   const click=selector=>{const node=document.querySelector(selector);check(node&&!node.disabled,'Usable control '+selector);node.click()};
   const key=code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,key:code,bubbles:true,cancelable:true}));
   const aimAt=point=>{const dx=point.x-camera.x,dy=point.y-camera.y,dz=point.z-camera.z;camera.a=Math.atan2(dx,dz);camera.pitch=Math.atan2(dy,Math.hypot(dx,dz));};
   const atTable=id=>{const seat=BarScene.tableSeat(id),table=BarEngine.tables.find(t=>t.id===id);camera={...camera,x:table.x+(table.x<6?1.25:-1.25),z:table.z,y:1.68};aimAt({...seat,y:1.25});customerVisuals.clear();};
   const atRegister=()=>{camera={...camera,x:2.65,y:1.68,z:1.85};aimAt({x:2.65,y:1.59,z:2.94});};
   const atTerminal=()=>{camera={...camera,x:3.25,y:1.68,z:1.85};aimAt({x:3.25,y:1.2,z:2.65});};
   const tick=seconds=>{for(let i=0;i<Math.ceil(seconds*10);i++)game.tick(.1);state=game.s;ui();};
   const fixture=(id,tableId,recipe,paymentMethod,phase='awaiting-order')=>({id,name:'Client '+id,tableId,slot:null,recipe,paymentMethod,phase,patience:100,arrivalRemaining:0,drinkRemaining:0,due:0,tender:0,cardRemaining:0});
   let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
   canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});
   document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
   window.requestAnimationFrame=()=>0;await flush();click('[data-menu-action="new"]');await flush();
   check(window.BarService,'Direct service module loaded');game.open();state.spawn=999;state.orders=[fixture(1,1,'beer','cash')];state.nextId=2;ui();
   atTable(1);let target=BarService.target(camera);check(target?.kind==='customer'&&target.orderId===1,'Looking at seated client targets their order');
   camera.a+=Math.PI;check(!BarService.target(camera),'Looking away does not target the closest client');check(!BarService.use(target)&&state.orders[0].phase==='awaiting-order','Stale target cannot act while looking away');
   atTable(1);paused=true;check(!BarService.use(BarService.target(camera)),'Pause blocks direct actions');paused=false;
   key('KeyE');check(state.orders[0].phase==='preparing'&&!BarTablet.isOpen(),'E takes the order without a tablet');
   state.tray=[{recipe:'wine',quality:100},{recipe:'beer',quality:100}];canvas.click();
   check(state.orders[0].phase==='drinking'&&state.tray.length===1&&state.tray[0].recipe==='wine','Click serves matching drink and keeps unrelated tray drink');
   const cashBefore=state.cash;tick(8);key('KeyE');check(state.orders[0].phase==='cash-collected'&&state.cash===cashBefore,'E collects cash without prematurely booking the sale');
   check(!BarService.openRegister()&&!$('modal').open,'Cash drawer cannot open remotely');
   atRegister();check(BarService.target(camera)?.kind==='register','Looking at screen targets cash drawer');key('KeyE');await flush();
   check(BarService.isRegisterOpen()&&!BarTablet.isOpen(),'E opens physical register, not tablet');
   const confirm=document.querySelector('[data-direct-confirm="1"]');check(confirm?.disabled,'Wrong amount cannot be confirmed');
   click('[data-direct-coin="100"][data-order-id="1"]');check(confirm.disabled,'Insufficient selected change stays blocked');
   click('[data-direct-reset="1"]');click('[data-direct-coin="200"][data-order-id="1"]');click('[data-direct-coin="200"][data-order-id="1"]');
   check(!confirm.disabled,'Exact four euros enables cash preparation');
   const selected=document.querySelector('[data-direct-selected="1"]');BarService.refresh();check(document.querySelector('[data-direct-selected="1"]')===selected,'Register refresh preserves its controls');
   const due=state.orders[0].due;click('[data-direct-confirm="1"]');check(state.orders[0].phase==='change-ready'&&state.cash===cashBefore,'Prepared change waits for handover');
   const treasury=state.cash,till=state.payments.till;const input=document.querySelector('#directFundAmount');input.value='3';input.dispatchEvent(new Event('input',{bubbles:true}));click('[data-direct-fund]');check(state.cash===treasury&&state.payments.till===till+3,'Funding transfers existing treasury');
   click('#close');for(let attempt=0;attempt<30&&!BarInput.isLooking();attempt++)await flush();check(!BarService.isRegisterOpen()&&BarInput.isLooking(),'Cash drawer closes and camera resumes');
   atTable(1);key('KeyE');check(state.orders.length===0&&state.cash===cashBefore+due&&state.sold===1&&!BarTablet.isOpen(),'Direct change handover books exactly one payment');
   game.completeCash(1,camera);check(state.cash===cashBefore+due,'Repeated cash handover cannot duplicate revenue');

   state.orders=[fixture(2,3,'wine','card','preparing')];state.nextId=3;state.spawn=999;atTable(3);key('KeyE');tick(8);
   key('KeyE');check(state.orders[0].phase==='payment'&&!state.payments.terminalCarried,'Card request requires taking the terminal');
   atTerminal();check(BarService.target(camera)?.kind==='terminal','Terminal is selected separately from register');key('KeyE');check(state.payments.terminalCarried&&!BarTablet.isOpen(),'E picks up terminal directly');
   const cardBefore=state.cash;atTable(3);const beforeClick={looking:BarInput.isLooking(),target:interactionTarget()};canvas.click();check(state.orders[0].phase==='card-processing','Click presents terminal to the client '+JSON.stringify({beforeClick,phase:state.orders[0].phase,looking:BarInput.isLooking(),paused,target:interactionTarget(),terminal:state.payments.terminalCarried,menu:GameMenu.getMode(),modal:$('modal').open}));
   atTerminal();key('KeyE');check(state.payments.terminalCarried,'Terminal cannot be returned during authorization');
   tick(3);check(state.orders.length===0&&state.cash===cardBefore+7&&state.sold===2,'Card authorization completes a single sale');
   key('KeyE');check(!state.payments.terminalCarried,'E puts terminal back on its dock');tick(3);check(state.cash===cardBefore+7,'Further ticks do not duplicate card payment');
   check(state.payments.receipts.length===2&&!BarTablet.isOpen(),'Both receipts recorded without opening tablet');
   return {targeting:'aimed and nearby',cash:'collect, count, hand over',card:'take terminal, present, return',keyboardAndClick:true,receipts:2};
  })()`,true);
  await win.webContents.executeJavaScript(`camera={...camera,x:2.65,y:1.68,z:1.85,a:0,pitch:-.08};state.orders=[{id:3,name:'Lucie',tableId:1,recipe:'wine',paymentMethod:'cash',phase:'cash-collected',patience:100,arrivalRemaining:0,due:7,tender:20}];BarService.openRegister();for(const value of [500,500,200,100])document.querySelector('[data-direct-coin="'+value+'"][data-order-id="3"]').click();render();renderer.gl.finish();`,true);
  await new Promise(resolve=>setTimeout(resolve,200));
  const png=await new Promise(resolve=>{win.webContents.once('paint',(_event,_rect,image)=>resolve(image.toPNG()));win.webContents.invalidate()});
  const artifacts=path.join(__dirname,'artifacts');fs.mkdirSync(artifacts,{recursive:true});fs.writeFileSync(path.join(artifacts,'direct-register.png'),png);
  if(errors.length)throw Error(errors.join('\n'));
  console.log('DIRECT SERVICE OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}
});
