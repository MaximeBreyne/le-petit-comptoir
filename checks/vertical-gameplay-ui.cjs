'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-vertical-play-')));
let win;const timeout=setTimeout(()=>{console.error('Vertical gameplay timed out');app.exit(1)},120000);
app.whenReady().then(async()=>{
 try{
  const errors=[];win=new BrowserWindow({show:false,width:1440,height:960,useContentSize:true,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  const result=await evaluate(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)},flush=()=>new Promise(resolve=>setTimeout(resolve,30));
   const click=selector=>{const button=document.querySelector(selector);check(button&&!button.disabled&&!button.closest('[hidden]'),'Usable '+selector);button.click()};
   let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
   canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});
   document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
   window.requestAnimationFrame=()=>0;await flush();GameMenu.newGame();await flush();
   const base=JSON.parse(JSON.stringify(state));state.cash=100000;state.totalSold=999;
   for(const id of ['expansion1','table5','table6','expansion2','table7','table8','upstairs','table9','table10','table11','table12','nightclub','table13','table14','table15','table16']){game.purchaseUpgrade(id);check(state.management[id],'Purchased '+id)}
   ui();check(game.activeTables().length===16&&game.crowdInfo().capacity===22,'Only purchased tables expand capacity to 22');
   let walkingSteps=0;
   function travel(route){
    for(const destination of route.slice(1)){
     let attempts=0;
     while(Math.hypot(destination.x-camera.x,destination.z-camera.z)>.005&&attempts++<1200){
      const before={...camera};walk(Math.max(-.05,Math.min(.05,destination.x-camera.x)),0);walk(0,Math.max(-.05,Math.min(.05,destination.z-camera.z)));walkingSteps++;
      check(Math.hypot(camera.x-before.x,camera.z-before.z)>.00001,'Movement blocked '+JSON.stringify({camera,destination}));
     }
     check(attempts<1200&&Math.abs(camera.y-EYE_HEIGHT-(destination.y||0))<.12,'Reached correct floor '+JSON.stringify(destination));
    }
   }
   const position=()=>({x:camera.x,y:camera.y-EYE_HEIGHT,z:camera.z});
   camera={...BarScene.playCamera,x:8.8,z:5.25};
   travel(game.waiterRoute(position(),{x:13.15,y:3.6,z:6.5}));
   check(Math.abs(camera.y-5.28)<.001,'Walking up actual stairs raises the eye level');
   check(!game.canWork(camera)&&!game.nearRegister(camera)&&!BarPreparation.openVessels(),'Upstairs cannot prepare drinks or operate the register');
   const stock=JSON.stringify(state.stock);game.beginAtVessels('wine',camera);check(!state.prep&&JSON.stringify(state.stock)===stock,'Upstairs preparation cannot debit ingredients');
   game.open();state.spawn=999;
   const order={id:91,name:'Camille',recipe:'wine',tableId:9,slot:null,phase:'awaiting-order',patience:100,arrivalRemaining:0,paymentMethod:'card',due:0,tender:0,cardRemaining:0};state.orders=[order];state.nextId=92;
   check(game.canReachOrder(91,camera)&&!game.canReachOrder(91,{...camera,y:1.68}),'Interaction cannot pass through the floor');
   render();const seat=BarScene.tableSeat(9),look=point=>{const dx=point.x-camera.x,dz=point.z-camera.z;camera.a=Math.atan2(dx,dz);camera.pitch=Math.atan2(point.y-camera.y,Math.hypot(dx,dz));};
   look({...seat,y:seat.y+1.25});check(BarService.target(camera)?.orderId===91,'Aim selects the guest upstairs');useInteraction();
   check(BarTablet.isOpen(),'Direct interaction opens the upstairs table order');click('[data-tablet-order-action="take"][data-order-id="91"]');check(order.phase==='preparing','Order taken at its upstairs table');
   BarTablet.close();await flush();state.tray=[{recipe:'wine',quality:100,orderId:91}];ui();useInteraction();check(order.phase==='drinking','The upstairs drink can be served directly');
   render();const seated=customerVisuals.get(91);check(Math.abs(seated.y-3.6)<.001,'Guest is rendered on the upper floor');
   const upperCamera={...camera};GameMenu.pause();click('[data-menu-action="save"]');click('[data-menu-action="save-slot"][data-slot="1"]');await flush();
   const saved=JSON.parse(localStorage.getItem('comptoir-bar-slot-v1-1'));check(saved.state.management.nightclub&&Math.abs(saved.camera.y-5.28)<.001,'Manual save includes the upper-floor camera');
   click('[data-menu-action="back"]');GameMenu.resume();await flush();game.s=new Game(base).s;state=game.s;ui();check(camera.y<2&&camera.x<12,'Smaller building safely resets an upstairs camera');
   GameMenu.pause();click('[data-menu-action="load"]');click('[data-menu-action="load-slot"][data-slot="1"]');click('[data-menu-action="confirm"]');await flush();
   check(state.management.nightclub&&Math.abs(camera.y-upperCamera.y)<.001&&Math.abs(camera.x-upperCamera.x)<.001,'Loading restores the upper floor and position');
   state.orders=[];state.tray=[];customerVisuals.clear();
   travel(game.waiterRoute(position(),game.waiterDestination('take-order',{tableId:13})));
   check(camera.y===EYE_HEIGHT&&camera.x>24,'Stairs descend into the nightclub without teleporting');
   travel(game.waiterRoute(position(),{x:2.65,y:0,z:2}));check(game.nearRegister(camera),'The cash register remains reachable from the nightclub');
   render();check(renderer.gl.getError()===0,'The full multilevel scene renders cleanly');
   return {tables:16,capacity:22,walkingSteps,upstairsService:true,crossFloorBlocked:true,saveCamera:true,nightclubReachable:true,returnToRegister:true,gl:0};
  })()`);
  if(errors.length)throw Error(errors.join('\n'));
  console.log('VERTICAL GAMEPLAY UI OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}
});
