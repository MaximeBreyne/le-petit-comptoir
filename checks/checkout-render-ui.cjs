'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-checkout-render-')));
let win;const timeout=setTimeout(()=>{console.error('Checkout render timed out');app.exit(1)},120000);
app.whenReady().then(async()=>{
 const errors=[];
 try{
  win=new BrowserWindow({show:false,width:1440,height:960,useContentSize:true,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)},flush=()=>new Promise(resolve=>setTimeout(resolve,30)),distance=(a,b)=>Math.hypot(a.x-b.x,(a.y||0)-(b.y||0),a.z-b.z);
   let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
   canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
   window.requestAnimationFrame=()=>0;await flush();GameMenu.newGame();await flush();
   for(const [id,offer]of Object.entries(BarEngine.managementUpgrades))if(offer.requiresClosed)state.management[id]=true;
   state.totalSold=500;state.cash=5000;game.open();state.spawn=99999;
   const order=(id,tableId,slot)=>({id,name:'Client '+id,recipe:'wine',tableId,slot,phase:'drinking',drinkRemaining:0,patience:100,arrivalRemaining:0,paymentMethod:'cash',due:7,tender:10});
   state.orders=[order(101,9,null),order(102,13,null),order(103,null,4)];state.nextId=104;ui();
   let renderedSamples=0,savedOnStairs=false;
   const verify=()=>{render();renderedSamples++;for(const customer of state.orders){const info=game.checkoutInfo(customer),visual=customerVisuals.get(customer.id);check(info&&visual&&distance(info.position,visual)<.000001,'Rendered customer follows the engine checkout pose');check(visual.seated===info.seated&&visual.moving===info.moving,'Standing, walking and seated poses match queue state');}};
   for(let i=0;i<2400;i++){
    game.tick(.1);visualTime+=.1;const info=game.checkoutInfo(101);
    if(i%20===0)verify();
    if(!savedOnStairs&&info.moving&&info.position.y>.3&&info.position.y<3.3){
     verify();const before={...info.position};save(true);GameMenu.returnHome();GameMenu.continueGame();await flush();check(distance(before,game.checkoutInfo(101).position)<.000001,'Menu save restores checkout halfway down stairs');verify();savedOnStairs=true;
    }
    if(game.checkoutInfo(101)?.ready&&game.checkoutInfo(102)?.state==='queued')break;
   }
   verify();check(savedOnStairs,'The upper-floor customer walks down the stairs');check(game.checkoutCustomer()?.id===101,'The first finished customer heads the queue');
   check(game.checkoutInfo(102)?.state==='queued'&&game.checkoutInfo(103)?.state==='waiting','The club customer queues while the next customer waits at their seat');
   check(distance(game.checkoutInfo(101).position,game.checkoutInfo(102).position)>.7,'The two queue customers do not overlap');
   const atRegister={...BarEngine.registerPosition,y:1.68},cash=state.cash,first=state.orders.find(order=>order.id===101);camera={...camera,...atRegister,a:0,pitch:0};
   game.collectCash(first.id,camera);game.prepareChange(first.id,first.tender-first.due,camera);game.completeCash(first.id,camera);check(state.cash===cash+first.due,'Payment is credited once at the cashier');
   render();const departure=customerVisuals.get(101);check(departure&&!departure.active&&departure.departure.every(p=>!(p.y>0)),'Paid customer exits from the ground-floor cashier');
   check(distance(departure.departure.at(-1),{x:6,y:0,z:9.3})<.01,'Departure heads to the entrance instead of the old table');
   for(let i=0;i<200&&!game.checkoutInfo(102)?.ready;i++){game.tick(.1);visualTime+=.1;}verify();check(game.checkoutCustomer()?.id===102,'The next customer advances to the cashier');
   camera={...camera,x:1.03,y:1.68,z:4.95,a:Math.atan2(2.45-1.03,4.15-4.95),pitch:0};render();renderer.gl.finish();check(renderer.gl.getError()===0,'Checkout scene has no WebGL errors');
   camera={...camera,...atRegister};check(BarService.openRegister(),'The live till opens for the final customers');game.close();
   while(state.orders.length){
    for(let i=0;i<1600&&!game.checkoutCustomer();i++)game.tick(.1);
    const final=game.checkoutCustomer();check(final,'The last round keeps the checkout queue advancing');game.collectCash(final.id,camera);game.prepareChange(final.id,final.tender-final.due,camera);game.completeCash(final.id,camera);
   }
   const evening=state.day;last=performance.now()-45;frame(performance.now());
   check(state.day===evening+1&&$('modalTitle').textContent.includes('Bilan du soir'),'The actual frame presents the closing report from an open register');
   check(!BarService.isRegisterOpen()&&!$('modal').classList.contains('physical-register')&&!serviceSimulationActive(),'The closing report ends live checkout simulation');
   return {renderedSamples,stairsSave:true,standingQueue:true,seatedWaiting:true,exitFromRegister:true,nextCustomer:true,closingReport:true,gl:0};
  })()`,true);
  if(errors.length)throw Error(errors.join('\n'));console.log('CHECKOUT RENDER UI OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error,errors.join('\n'));clearTimeout(timeout);win?.destroy();app.exit(1)}
});
