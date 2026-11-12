'use strict';
// Exercise the paid waiter, payment ownership, real UI controls and saved jobs.
// The hidden window uses its own profile and never opens the player's saves.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-waiter-payments-')));
const timeout=setTimeout(()=>{console.error('Waiter payment UI timed out');app.exit(1)},90000);
let win;
app.whenReady().then(async()=>{
 try{
  const errors=[];
  win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  const initial=await evaluate(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   const flush=()=>new Promise(resolve=>setTimeout(resolve,30));
   const key=code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,key:code,bubbles:true,cancelable:true}));
   const aimAt=point=>{const dx=point.x-camera.x,dy=point.y-camera.y,dz=point.z-camera.z;camera.a=Math.atan2(dx,dz);camera.pitch=Math.atan2(dy,Math.hypot(dx,dz));};
   const atTable=id=>{const seat=BarScene.tableSeat(id),table=BarEngine.tables.find(t=>t.id===id);camera={x:table.x+(table.x<6?1.25:-1.25),z:table.z,y:1.68,a:0,pitch:0};aimAt({...seat,y:1.25});customerVisuals.clear();};
   const atRegister=()=>{camera={x:2.65,y:1.68,z:1.85,a:0,pitch:0};aimAt({x:2.65,y:1.39,z:2.94});};
   const atCheckout=id=>{camera={x:2.65,y:1.68,z:1.85,a:0,pitch:0};const point=game.checkoutInfo(id).position;aimAt({...point,y:point.y+1.65});customerVisuals.clear();};
   const atTerminal=()=>{camera={x:3.25,y:1.68,z:1.85,a:0,pitch:0};aimAt({x:3.25,y:1.2,z:2.65});};
   const tick=(seconds,draw=false)=>{for(let i=0;i<Math.ceil(seconds*10);i++){game.tick(.1);visualTime+=.1;if(draw)render();}state=game.s;ui();BarTablet.refresh(true);};
   const until=(predicate,message,max=600,draw=false)=>{for(let i=0;i<max&&!predicate();i++)tick(.1,draw);check(predicate(),message+' '+JSON.stringify({job:state.staff.waiter,payments:state.payments,orders:state.orders}));};
   const order=(id,tableId,method,due)=>({id,name:'Client '+id,tableId,slot:null,recipe:method==='cash'?'beer':'wine',paymentMethod:method,phase:'payment',patience:100,arrivalRemaining:0,drinkRemaining:0,due,tender:method==='cash'?10:due,cardRemaining:0,tip:1});
   const reload=async()=>{save(true);GameMenu.returnHome();GameMenu.continueGame();await flush();state=game.s;check(GameMenu.getMode()==='play'&&!paused,'Saved session resumes');};
   const unavailable=selector=>{const element=document.querySelector(selector);return !element||element.disabled||element.hidden||!!element.closest('[hidden]');};
   const closeRegister=async()=>{$('close').click();for(let i=0;i<30&&!BarInput.isLooking();i++)await flush();check(!BarService.isRegisterOpen()&&BarInput.isLooking(),'Register closes back into camera');};
   let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
   canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});
   document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
   window.requestAnimationFrame=()=>0;await flush();GameMenu.newGame();await flush();game.open();state.spawn=999;
   state.management.waiter=true;state.orders=[order(1,1,'cash',6)];state.nextId=2;ui();
   const initialCash=state.cash,initialTill=state.payments.till;
   until(()=>game.paymentHandledByWaiter(1),'Client reaches checkout and waiter reserves the cash payment');check(state.staff.waiter?.task==='collect-cash','Waiter reserves a pending cash payment only at checkout');
   atCheckout(1);check(/serveur/i.test(BarService.target(camera)?.label||''),'Direct prompt explains waiter is handling the bill');
   key('KeyE');check(state.orders[0].phase==='payment'&&state.cash===initialCash,'Player cannot collect a reserved cash payment');
   BarTablet.open('service',1);check(unavailable('[data-tablet-order-action="collect"][data-order-id="1"]'),'Tablet cannot collect waiter payment');
   check(/serveur/i.test(document.querySelector('[data-service-order="1"]').textContent),'Tablet shows waiter payment responsibility');BarTablet.close();await flush();
   until(()=>state.orders[0]?.phase==='cash-collected','Waiter collects customer cash');
   check(state.cash===initialCash&&state.payments.till===initialTill,'Collection has not booked revenue or changed drawer');
   atRegister();BarService.openRegister();check(BarService.isRegisterOpen(),'Player may consult physical drawer while waiter works');
   check(unavailable('[data-direct-confirm="1"]'),'Physical drawer cannot count reserved waiter money');await closeRegister();
   await reload();check(state.orders[0]?.phase==='cash-collected'&&game.paymentHandledByWaiter(1),'Actual save preserves waiter-owned collected cash');
   until(()=>state.orders[0]?.phase==='change-ready','Waiter counts exact change at register');
   check(state.cash===initialCash&&state.payments.till===initialTill+6,'Drawer receives net cash once before change handover');
   atCheckout(1);key('KeyE');check(state.orders[0]?.phase==='change-ready'&&state.cash===initialCash,'Player cannot double-complete waiter cash handover');
   until(()=>!state.orders.length,'Waiter returns change and finishes cash payment');
   check(state.cash===initialCash+6&&state.payments.till===initialTill+6&&state.sold===1&&state.payments.cashRevenue===6,'Waiter cash revenue and drawer total match');
   check(state.payments.receipts.length===1,'Cash payment has one receipt');

   atTerminal();key('KeyE');check(state.payments.terminalCarried&&!state.payments.terminalWithWaiter,'Player holds the unique terminal first');
   state.orders=[order(2,3,'card',7)];state.nextId=3;state.spawn=999;tick(3);
   check(state.orders[0].phase==='payment'&&state.payments.terminalCarried&&!state.payments.terminalWithWaiter,'Waiter cannot steal or clone player terminal');
   atTerminal();key('KeyE');check(!state.payments.terminalCarried,'Player returns shared terminal');
   until(()=>state.payments.terminalWithWaiter,'Waiter fetches the available terminal',600,true);
   check(!state.payments.terminalCarried&&game.paymentHandledByWaiter(2),'Waiter exclusively holds terminal for reserved payment');
   atTerminal();key('KeyE');check(!state.payments.terminalCarried&&state.payments.terminalWithWaiter,'E cannot duplicate terminal already carried by waiter');
   BarTablet.open('register');check(unavailable('[data-tablet-action="terminal-pickup"]'),'Tablet pickup disabled while terminal is with waiter');
   check(/serveur/i.test(document.querySelector('[data-tablet-page="register"]').textContent),'Register explains terminal is with waiter');BarTablet.close();await flush();
   const held=[],playerHeld=[],docked=[];
   BarScene.registerVisuals(held,state);BarScene.registerVisuals(playerHeld,{...state,payments:{...state.payments,terminalCarried:true,terminalWithWaiter:false}});BarScene.registerVisuals(docked,{...state,payments:{...state.payments,terminalCarried:false,terminalWithWaiter:false}});
   check(held.length===playerHeld.length&&docked.length>held.length,'No dock terminal is drawn when either person carries it');
   const cashBeforeCard=state.cash;
   until(()=>state.orders[0]?.phase==='card-processing','Waiter presents terminal at customer',600,true);
   check(state.cash===cashBeforeCard&&state.payments.terminalOrderId===2,'Authorization starts before card revenue is booked');
   atCheckout(2);key('KeyE');check(state.payments.terminalWithWaiter&&!state.payments.terminalCarried,'Direct player interaction leaves waiter authorization alone');
   const visual=waiterVisual;camera={x:(visual?.x||8.8)-1.25,y:1.5,z:(visual?.z||6.5)-1.1,a:0,pitch:0};aimAt({x:visual?.x||8.8,y:1.12,z:visual?.z||6.5});render();renderer.gl.finish();
   check(renderer.gl.getError()===0,'Waiter holding terminal renders without WebGL errors');
   window.__waiterPaymentQA={check,flush,key,atTerminal,atTable,tick,until,reload,initialCash,initialTill,cashBeforeCard};
   return {cash:'collected, counted, returned',savedCashStage:'cash-collected',terminalShared:true,dockHidden:true};
  })()`);
  async function capture(name){
   await evaluate('render();renderer.gl.finish();');await new Promise(resolve=>setTimeout(resolve,180));
   const png=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No capture '+name)),5000);win.webContents.once('paint',(_event,_rect,image)=>{clearTimeout(timer);resolve(image.toPNG())});win.webContents.invalidate()});
   const dir=path.join(__dirname,'artifacts');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name+'.png'),png);
  }
  await capture('waiter-card-payment');
  const final=await evaluate(`(async()=>{
   const {check,flush,key,atTerminal,atTable,tick,until,reload,initialCash,initialTill,cashBeforeCard}=window.__waiterPaymentQA;
   const remaining=state.orders[0].cardRemaining;await reload();
   check(state.orders[0]?.phase==='card-processing'&&state.orders[0].cardRemaining===remaining&&state.payments.terminalWithWaiter&&!state.payments.terminalCarried,'Reload preserves shared terminal and authorization timer');
   until(()=>!state.orders.length,'Saved waiter card authorization completes');
   check(state.cash===cashBeforeCard+7&&state.payments.cardRevenue===7&&state.payments.till===initialTill+6&&state.sold===2,'Card revenue increases treasury once without touching cash drawer');
   until(()=>!state.payments.terminalWithWaiter&&!state.staff.waiter,'Waiter returns terminal even after the paid customer leaves',600,true);
   check(state.payments.terminalOrderId===null&&!state.payments.terminalCarried,'Shared terminal is idle on dock');
   tick(5);check(state.cash===initialCash+13&&state.payments.receipts.length===2,'Further ticks cannot double-book either payment');
   atTerminal();key('KeyE');check(state.payments.terminalCarried&&!state.payments.terminalWithWaiter,'Player can take terminal again after waiter return');
   key('KeyE');check(!state.payments.terminalCarried,'Player can return the terminal normally');
   render();check(renderer.gl.getError()===0,'Final scene renders without WebGL errors');
   return {cashRevenue:state.payments.cashRevenue,cardRevenue:state.payments.cardRevenue,receipts:state.payments.receipts.length,savedCardTimer:true,terminalReturned:true,gl:0};
  })()`);
  if(errors.length)throw Error(errors.join('\n'));
  console.log('WAITER PAYMENTS UI OK',JSON.stringify({...initial,...final}));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}
});
