'use strict';
// The two order lists, physical glass picker and actual menu saves share one game.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-parallel-service-')));
let win;const timeout=setTimeout(()=>{console.error('Parallel service checks timed out');app.exit(1)},90000);
app.whenReady().then(async()=>{
 try{
  const errors=[];
  win=new BrowserWindow({show:false,width:1440,height:960,useContentSize:true,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  async function capture(name){
   await evaluate('render();renderer.gl.finish()');await new Promise(resolve=>setTimeout(resolve,150));
   const png=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No capture '+name)),5000);win.webContents.once('paint',(_event,_rect,image)=>{clearTimeout(timer);resolve(image.toPNG())});win.webContents.invalidate()});
   const dir=path.join(__dirname,'artifacts');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name+'.png'),png);
  }
  await evaluate(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)},flush=()=>new Promise(resolve=>setTimeout(resolve,30));
   const click=selector=>{const button=document.querySelector(selector);check(button&&!button.disabled&&!button.closest('[hidden]'),'Usable control '+selector);button.click()};
   const key=code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,key:code,bubbles:true,cancelable:true}));
   const aimAt=point=>{const dx=point.x-camera.x,dy=point.y-camera.y,dz=point.z-camera.z;camera.a=Math.atan2(dx,dz);camera.pitch=Math.atan2(dy,Math.hypot(dx,dz));};
   const approach=point=>({x:point.x,y:1.68,z:Math.min(2.15,Math.max(1.4,point.z)),a:0,pitch:0});
   const dose=seconds=>{for(let rest=seconds;rest>1e-9;rest-=.1)game.tick(Math.min(.1,rest));state=game.s;ui();};
   const queues=()=>{
    BarOrders.refresh();const read=selector=>[...document.querySelectorAll(selector+' [data-queue-order]')].map(row=>({id:Number(row.dataset.queueOrder),status:row.dataset.status,text:row.textContent}));
    const hud=read('#orderQueueHud'),tablet=read('#tabletOrderQueue');check(JSON.stringify(hud)===JSON.stringify(tablet),'HUD and tablet show the same tickets and states');return hud;
   };
   let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
   canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});
   document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
   window.requestAnimationFrame=()=>0;await flush();click('[data-menu-action="new"]');await flush();game.open();state.spawn=999;
   const order=(id,recipe,tableId,slot,phase='preparing')=>({id,name:'Client '+id,recipe,tableId,slot,phase,patience:100,arrivalRemaining:0,paymentMethod:'card'});
   state.orders=[order(1,'beer',null,0),order(2,'beer',null,1),order(3,'wine',2,null),order(4,'wine',3,null),order(5,'coffee',4,null),order(6,'beer',1,null,'awaiting-order')];state.nextId=7;ui();
   let tickets=queues();check(tickets.length===5&&!tickets.some(row=>row.id===6),'Unasked orders are excluded from both drink queues');
   const stable=document.querySelector('#orderQueueHud [data-queue-order="1"]');ui();check(stable===document.querySelector('#orderQueueHud [data-queue-order="1"]'),'Live refresh preserves ticket nodes');
   BarTablet.open('orders');check(!document.querySelector('[data-tablet-recipe]')&&!document.querySelector('[data-tablet-order-action="prepare"]'),'No tablet control can start drink preparation');
   BarTablet.close();await flush();const table=BarEngine.tables.find(table=>table.id===1);camera={...camera,x:table.x+1.25,z:table.z};aimAt({...BarScene.tableSeat(1),y:1.25});key('KeyE');
   check(BarTablet.isOpen()&&state.orders[5].phase==='awaiting-order','Looking at a waiting guest opens the order tablet');click('[data-tablet-order-action="take"][data-order-id="6"]');
   tickets=queues();check(tickets.length===6&&tickets.find(row=>row.id===6).status==='todo','A newly taken order appears immediately in both lists');
   BarTablet.close();await flush();camera={...BarScene.playCamera,x:7,z:1.4};check(BarPreparation.openVessels(),'The physical glass picker opens at its shelf');
   window.__parallelQA={check,flush,click,key,aimAt,approach,dose,queues};
  })()`);
  await capture('parallel-glass-picker');
  const preparation=await evaluate(`(async()=>{
   const {check,flush,click,approach,dose,queues}=window.__parallelQA,initialStock={...state.stock};
   for(const [index,recipe]of ['beer','beer','wine','wine','coffee'].entries()){
    if(index){camera={...BarScene.playCamera,x:7,z:1.4};check(BarPreparation.openVessels(),'Another glass can be chosen while previous drinks remain at their posts');}
    click('#modal [data-vessel-recipe="'+recipe+'"]');await flush();const p=state.prep;
    check(p?.recipe===recipe&&p.held?.kind==='vessel'&&!$('modal').open,'Choosing the recipe immediately takes the corresponding vessel');
    const point=game.preparationStation(p);camera=approach(point);game.placeHeld(camera);
    for(const ingredient of Object.keys(recipes[recipe].ingredients).filter(key=>key!=='beer')){game.takeIngredient(ingredient,approach(BarEngine.preparationLayout.ingredients[ingredient]));check(p.held?.key===ingredient,'Each ingredient must be physically collected');game.placeHeld(camera);}
    game.setPour(true,camera);dose(recipes[recipe].target/recipes[recipe].speed*(recipe==='coffee'?1:.5));game.setPour(false);
    if(recipe==='coffee')game.finishPour(camera);
    check(game.preparations().length===index+1,'Starting another preparation preserves all existing vessels');
   }
   check(game.preparations().length===5&&new Set(game.preparations().map(p=>p.slotId)).size===5,'Five preparations occupy five distinct physical stations');
   check(initialStock.beer-state.stock.beer===100&&initialStock.wine-state.stock.wine===30&&initialStock.coffee-state.stock.coffee===1,'Parallel preparation consumes each ingredient exactly once');
   const tickets=queues();check(tickets.filter(row=>row.status==='preparing').length===4&&tickets.filter(row=>row.status==='ready').length===1&&tickets.find(row=>row.id===6).status==='todo','Ticket states distinguish all unfinished drinks, the ready cup and a still unstarted order');
   check(GameMenu.validState(state),'The real save validator accepts five concurrent preparations');
   window.__parallelQA.snapshot={stock:JSON.stringify(state.stock),preps:game.preparations().map(p=>({id:p.id,slotId:p.slotId,recipe:p.recipe,orderId:p.orderId,amount:p.amount,ready:p.ready})).sort((a,b)=>a.id-b.id)};
   camera={x:6.6,y:1.68,z:1.55,a:0,pitch:-.1};ui();render();check(renderer.gl.getError()===0,'Five vessels and both beer taps render without WebGL errors');
   const bounds=$('orderQueueHud').getBoundingClientRect();check(bounds.left>=0&&bounds.right<=innerWidth&&bounds.bottom<innerHeight-30,'The in-game order list stays within the viewport');
   return {concurrentPreparations:5,queueTickets:tickets.length,stockConsumedOnce:true};
  })()`);
  await capture('parallel-orders-hud');
  await evaluate("BarTablet.open('orders');BarTablet.refresh(true)");await capture('parallel-orders-tablet');
  const persistence=await evaluate(`(async()=>{
   const {check,flush,click,key,aimAt,approach,dose,queues,snapshot}=window.__parallelQA;
   BarTablet.close();await flush();GameMenu.pause();click('[data-menu-action="save"]');click('[data-menu-action="save-slot"][data-slot="1"]');
   const saved=JSON.parse(localStorage.getItem('comptoir-bar-slot-v1-1')).state;check([saved.prep,...saved.parkedPreps].filter(Boolean).length===5,'Manual save contains every preparation');
   state.prep=null;state.parkedPreps=[];state.stock.beer=0;click('[data-menu-action="back"]');click('[data-menu-action="load"]');click('[data-menu-action="load-slot"][data-slot="1"]');click('[data-menu-action="confirm"]');await flush();
   const restored=game.preparations().map(p=>({id:p.id,slotId:p.slotId,recipe:p.recipe,orderId:p.orderId,amount:p.amount,ready:p.ready})).sort((a,b)=>a.id-b.id);
   check(JSON.stringify(restored)===JSON.stringify(snapshot.preps)&&JSON.stringify(state.stock)===snapshot.stock,'Loading preserves all partial doses, assigned orders and stock');
   GameMenu.returnHome();GameMenu.continueGame();await flush();check(game.preparations().length===5&&JSON.stringify(state.stock)===snapshot.stock,'Automatic save and continue retain all five preparations');
   camera=approach(game.preparationStation(state.prep));check(state.prep.recipe==='coffee'&&state.prep.ready,'The ready coffee remains selected after reload');game.plate(camera);ui();
   check(queues().find(row=>row.id===5).text.includes('Sur le plateau'),'The queue distinguishes a ready drink already collected on the tray');
   const firstBeer=game.preparations().find(p=>p.orderId===1);camera=approach(game.preparationStation(firstBeer));game.selectPreparation(firstBeer.id,camera);game.setPour(true,camera);dose((recipes.beer.target-firstBeer.amount)/recipes.beer.speed);game.setPour(false);game.finishPour(camera);game.plate(camera);ui();
   let tickets=queues();check(tickets.find(row=>row.id===1).status==='ready'&&tickets.find(row=>row.id===2).status==='preparing','One ready beer never marks a second identical order as ready');
   const order=state.orders.find(order=>order.id===1),seat=BarScene.counterSeat(order.slot);camera={...BarScene.playCamera,x:seat.x,z:2.1};aimAt({...seat,y:1.5});customerVisuals.clear();render();key('KeyE');
   check(order.phase==='drinking','The prepared beer can be served directly');tickets=queues();check(!tickets.some(row=>row.id===1)&&tickets.some(row=>row.id===2),'Serving removes only the matching ticket from both queues');
   render();check(renderer.gl.getError()===0,'Save, resume and service keep valid rendering');
   return {manualAndAutomaticSave:5,sameRecipeTicketsDistinct:true,servedTicketRemoved:true,gl:0};
  })()`);
  if(errors.length)throw Error(errors.join('\n'));
  console.log('PARALLEL SERVICE UI OK',JSON.stringify({...preparation,...persistence}));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}
});
