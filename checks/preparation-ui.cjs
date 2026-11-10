'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-physical-prep-')));
const timeout=setTimeout(()=>{console.error('Physical preparation timed out');app.exit(1)},60000);
app.whenReady().then(async()=>{
 let win;
 try{
  win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)},flush=()=>new Promise(resolve=>setTimeout(resolve,30));
   let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
   canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});
   document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
   window.requestAnimationFrame=()=>0;await flush();GameMenu.newGame();await flush();game.open();state.spawn=999;
   for(const key of ['cocktails','softDrinks','spirits','signature'])state.management[key]=true;
   for(const key of Object.keys(ingredients))state.stock[key]=1000;
   const key=(code,type='keydown')=>window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
   const layout=BarEngine.preparationLayout,station=id=>layout.stations[id]||layout.stations.cocktails;
   const move=(x,z)=>{let count=0;while(Math.hypot(camera.x-x,camera.z-z)>.001&&count++<250){walk(Math.max(-.08,Math.min(.08,x-camera.x)),0);walk(0,Math.max(-.08,Math.min(.08,z-camera.z)));}check(count<250,'Physical aisle reaches '+x+','+z);};
   const approach=point=>{move(camera.x,1.75);move(point.x,1.75);move(point.x,point.z<1?1.65:Math.min(2.05,point.z-.65));};
   const look=point=>{const dx=point.x-camera.x,dz=point.z-camera.z;camera.a=Math.atan2(dx,dz);camera.pitch=Math.atan2(point.y-camera.y,Math.hypot(dx,dz));};
   const interact=(expected,click=false)=>{const target=interactionTarget();check(target?.action==='preparation'&&target.kind===expected,'Expected '+expected+', got '+JSON.stringify(target));if(click)canvas.click();else key('KeyE');ui();};
   camera={x:3,y:1.68,z:6.4,a:0,pitch:0};BarTablet.open('drinks');
   check(document.querySelector('[data-tablet-recipe="wine"]').disabled,'Recipe disabled at a table');
   const beforeRemote=JSON.stringify(state.stock);game.start('wine',camera);check(!state.prep&&JSON.stringify(state.stock)===beforeRemote,'Remote start cannot consume stock');
   BarTablet.close();await flush();camera={...BarScene.playCamera};
   const completed=[];
   for(const id of Object.keys(recipes)){
    state.tray=[];state.orders=[];const before={...state.stock};
    BarTablet.open('drinks');document.querySelector('[data-tablet-recipe="'+id+'"]').click();await flush();
    check(state.prep?.recipe===id&&!BarTablet.isOpen()&&BarInput.isLooking(),'Recipe selected and camera resumed: '+id);
    check(JSON.stringify(state.stock)===JSON.stringify(before),'Selection does not charge ingredients: '+id);
    approach(layout.vessels);look({...layout.vessels,y:layout.vessels.y+.12});
    if(id==='beer'){camera.a+=Math.PI;key('KeyE');check(!state.prep.held,'Looking away cannot take a glass');camera.a-=Math.PI;}
    interact('vessel',id==='wine');check(state.prep.held?.kind==='vessel','Glass held: '+id);
    const point=station(id);approach(point);look({...point,y:point.y+.18});interact('place-vessel');check(state.prep.vesselPlaced,'Glass placed at its workstation: '+id);
    for(const ingredient of game.preparationStatus(camera).remaining.filter(key=>key!=='beer')){
     const source=layout.ingredients[ingredient];approach(source);look({...source,y:source.y+.13});
     interact('ingredient',ingredient==='wine');check(state.prep.held?.key===ingredient,'Ingredient held: '+ingredient);
     const afterTake=state.stock[ingredient];game.takeIngredient(ingredient,camera);check(state.stock[ingredient]===afterTake,'Held ingredient cannot be charged twice');
     check(Math.abs(afterTake-(before[ingredient]-recipes[id].ingredients[ingredient]))<1e-8,'Exact physical stock debit: '+ingredient);
     if(id==='wine'){render();check(renderer.gl.getError()===0,'Held bottle renders');}
     approach(point);look({...point,y:point.y+.18});interact('place-ingredient');check(state.prep.added[ingredient]&&!state.prep.held,'Ingredient delivered: '+ingredient);
    }
    check(game.isPour(),'All ingredients unlock dosage: '+id);
    const savedCamera={...camera};camera={x:3,y:1.68,z:6.4,a:0,pitch:0};ui();
    check(document.querySelector('#workbench').hidden,'Preparation controls disappear in the room');
    const amount=state.prep.amount;key(preferences.bindings.pour.code);game.tick(.1);check(!state.prep.pouring&&state.prep.amount===amount,'Cannot pour at a table');
    game.finishPour(camera);game.finishMix(camera);game.plate(camera);check(state.prep&&!state.prep.ready,'Cannot finish or plate remotely');
    camera={...savedCamera};ui();key(preferences.bindings.pour.code);
    check(state.prep.pouring,'Dosage key works at station: '+id);
    if(id==='beer'){
     camera.z=1.15;frame(performance.now()+20);check(!state.prep.pouring,'Walking away stops pouring before the tick');camera={...savedCamera};key(preferences.bindings.pour.code);
    }
    let remaining=recipes[id].target/recipes[id].speed;while(remaining>1e-8){const dt=Math.min(.1,remaining);game.tick(dt);remaining-=dt;}
    key(preferences.bindings.pour.code,'keyup');look({...point,y:point.y+.18});interact('pour');
    if(!state.prep.ready)interact('mix');
    check(state.prep.ready&&state.prep.quality>=99,'Physical recipe completed: '+id);
    for(const [ingredient,quantity]of Object.entries(recipes[id].ingredients))check(Math.abs(state.stock[ingredient]-(before[ingredient]-quantity))<1e-8,'Recipe consumes exactly once: '+id+'/'+ingredient);
    interact('ready');check(!state.prep&&state.tray.length===1&&state.tray[0].recipe===id,'Finished drink taken to tray: '+id);
    completed.push(id);render();check(renderer.gl.getError()===0,'Recipe renders: '+id);
   }
   check(!document.querySelector('[data-action="step"]'),'No generic add button bypasses physical ingredients');
   return {recipes:completed,physicalAisle:true,tableBlocked:true,walkingStopsPour:true,gl:renderer.gl.getError()};
  })()`,true);
  if(errors.length)throw Error(errors.join('\n'));console.log('PHYSICAL PREPARATION UI OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}
});
