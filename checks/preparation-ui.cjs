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
   for(const [key,offer]of Object.entries(BarEngine.managementUpgrades))if(offer.category==='licenses'||offer.requiresClosed)state.management[key]=true;
   for(const key of Object.keys(ingredients))state.stock[key]=1000;
   const key=(code,type='keydown')=>window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
   const layout=BarEngine.preparationLayout;
   const move=(x,z)=>{let count=0;while(Math.hypot(camera.x-x,camera.z-z)>.001&&count++<250){walk(Math.max(-.08,Math.min(.08,x-camera.x)),0);walk(0,Math.max(-.08,Math.min(.08,z-camera.z)));}check(count<250,'Physical aisle reaches '+x+','+z);};
   const approach=point=>{move(camera.x,1.75);move(point.x,1.75);move(point.x,point.z<1?1.65:Math.min(2.05,point.z-.65));};
   const look=point=>{const dx=point.x-camera.x,dz=point.z-camera.z;camera.a=Math.atan2(dx,dz);camera.pitch=Math.atan2(point.y-camera.y,Math.hypot(dx,dz));};
   const interact=(expected,click=false)=>{const target=interactionTarget();check(target?.action==='preparation'&&target.kind===expected,'Expected '+expected+', got '+JSON.stringify(target));if(click)canvas.click();else key('KeyE');ui();};
   camera={x:3,y:1.68,z:6.4,a:0,pitch:0};BarTablet.open('service');
   check(!document.querySelector('[data-tablet-recipe]'),'The tablet has no preparation selector');
   const beforeRemote=JSON.stringify(state.stock);game.start('wine',camera);check(!state.prep&&JSON.stringify(state.stock)===beforeRemote,'Remote start cannot consume stock');
   BarTablet.close();await flush();check(!BarPreparation.openVessels(),'The vessel selector cannot open at a table');camera={...BarScene.playCamera};
   const choose=async id=>{
    approach(layout.vessels);look({...layout.vessels,y:layout.vessels.y+.12});interact('choose');
    check(BarPreparation.isChoosingVessel()&&!BarTablet.isOpen(),'E opens the physical glass selection without the tablet');
    const choice=document.querySelector('[data-vessel-recipe="'+id+'"]');check(choice&&!choice.disabled,'Recipe is available at the glass rack: '+id);choice.click();await flush();
    check(state.prep?.recipe===id&&state.prep.held?.kind==='vessel'&&!$('modal').open&&BarInput.isLooking(),'Choosing a glass takes it and resumes the camera: '+id+' '+JSON.stringify({prep:state.prep,modal:$('modal').open,looking:BarInput.isLooking(),paused,mode:GameMenu.getMode(),toast:$('toast').textContent}));
    return state.prep;
   };
   const completed=[];
   for(const id of Object.keys(recipes)){
    state.tray=[];state.orders=[];const before={...state.stock};
    if(id==='beer'){approach(layout.vessels);look({...layout.vessels,y:layout.vessels.y+.12});camera.a+=Math.PI;key('KeyE');check(!$('modal').open&&!state.prep,'Looking away cannot open the glass selector');}
    await choose(id);
    check(JSON.stringify(state.stock)===JSON.stringify(before),'Selection does not charge ingredients: '+id);
    const point=game.preparationStation(state.prep);approach(point);look({...point,y:point.y+.18});interact('place-vessel');check(state.prep.vesselPlaced,'Glass placed at its workstation: '+id);
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
   state.tray=[];state.orders=[];state.spawn=999;
   const beforeParallel={...state.stock},wine=await choose('wine'),winePoint=game.preparationStation(wine);
   approach(winePoint);look({...winePoint,y:winePoint.y+.18});interact('place-vessel');
   approach(layout.ingredients.wine);look({...layout.ingredients.wine,y:layout.ingredients.wine.y+.13});interact('ingredient');
   approach(winePoint);look({...winePoint,y:winePoint.y+.18});interact('place-ingredient');
   key(preferences.bindings.pour.code);for(let i=0;i<10;i++)game.tick(.1);key(preferences.bindings.pour.code,'keyup');
   const wineAmount=wine.amount;check(wineAmount>0&&!wine.ready,'First drink retains a partial dose');
   const mojito=await choose('mojito'),mojitoPoint=game.preparationStation(mojito);
   check(wine.slotId!==mojito.slotId&&game.preparations().length===2,'Two different drinks occupy distinct preparation places');
   approach(mojitoPoint);look({...mojitoPoint,y:mojitoPoint.y+.18});interact('place-vessel');
   approach(layout.ingredients.mint);look({...layout.ingredients.mint,y:layout.ingredients.mint.y+.13});interact('ingredient');
   const heldStock=state.stock.mint;approach(winePoint);look({...winePoint,y:winePoint.y+.18});
   const wrong=BarPreparation.target(camera);check(wrong?.kind!=='select','A held ingredient cannot switch to another glass');
   game.selectPreparation(wine.id,camera);check(state.prep.id===mojito.id&&state.prep.held.key==='mint'&&state.stock.mint===heldStock,'Engine also protects the held ingredient');
   approach(mojitoPoint);look({...mojitoPoint,y:mojitoPoint.y+.18});interact('place-ingredient');
   const beer=await choose('beer'),beerPoint=game.preparationStation(beer);approach(beerPoint);look({...beerPoint,y:beerPoint.y+.18});interact('place-vessel');
   check(game.preparations().length===3&&wine.amount===wineAmount&&wine.added.wine&&mojito.added.mint,'Three drinks retain their separate ingredients and doses');
   approach(winePoint);look({...winePoint,y:winePoint.y+.18});interact('select');check(state.prep.id===wine.id&&state.prep.amount===wineAmount,'Looking at the parked glass resumes its exact preparation');
   const preparationSnapshot=()=>JSON.stringify(game.preparations().sort((a,b)=>a.id-b.id).map(p=>Object.fromEntries(Object.entries(p).sort(([a],[b])=>a.localeCompare(b)))));
   const snapshot=preparationSnapshot(),stockSnapshot=JSON.stringify(state.stock);
   save(true);GameMenu.returnHome();GameMenu.continueGame();await flush();
   check(preparationSnapshot()===snapshot&&JSON.stringify(state.stock)===stockSnapshot,'Save and continue preserve every preparation without consuming ingredients twice');
   const afterLoad=game.preparations().find(p=>p.id===beer.id),afterLoadPoint=game.preparationStation(afterLoad);approach(afterLoadPoint);look({...afterLoadPoint,y:afterLoadPoint.y+.18});interact('select');
   check(state.prep.id===beer.id,'Restored parked preparations remain selectable');
   key(preferences.bindings.pour.code);for(let i=0;i<10;i++)game.tick(.1);key(preferences.bindings.pour.code,'keyup');
   check(Math.abs(state.stock.beer-(beforeParallel.beer-recipes.beer.ingredients.beer))<1e-8,'Parallel beer takes one portion at the tap');
   const secondBeer=await choose('beer'),secondBeerPoint=game.preparationStation(secondBeer);approach(secondBeerPoint);look({...secondBeerPoint,y:secondBeerPoint.y+.18});interact('place-vessel');
   const coffee=await choose('coffee'),coffeePoint=game.preparationStation(coffee);approach(coffeePoint);look({...coffeePoint,y:coffeePoint.y+.18});interact('place-vessel');
   check(game.preparations().length===5,'Five preparations can remain on the bar while the tray capacity is two');
   approach(layout.vessels);look({...layout.vessels,y:layout.vessels.y+.12});interact('choose');
   check([...document.querySelectorAll('[data-vessel-recipe]')].every(button=>button.disabled),'Occupied stations cannot create extra overlapping glasses');
   key('Escape');await flush();check(!$('modal').open&&!paused&&GameMenu.getMode()==='play','Escape closes the selector without pausing the game');
   const readyBeer=game.preparations().find(p=>p.id===beer.id),readyPoint=game.preparationStation(readyBeer);
   approach(readyPoint);look({...readyPoint,y:readyPoint.y+.18});interact('select');
   key(preferences.bindings.pour.code);let doseTime=(recipes.beer.target-readyBeer.amount)/recipes.beer.speed;while(doseTime>1e-8){const dt=Math.min(.1,doseTime);game.tick(dt);doseTime-=dt;}key(preferences.bindings.pour.code,'keyup');interact('pour');
   check(readyBeer.ready,'Finished preparation is ready before disposal');
   const otherPreparations=game.preparations().filter(p=>p.id!==readyBeer.id).map(p=>p.id),wasteBefore=state.waste;
   canvas.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2}));
   const discardPreparation=document.querySelector('[data-discard-preparation="'+readyBeer.id+'"]');check(discardPreparation&&$('modal').open,'Right click on a ready glass opens physical management');
   discardPreparation.click();await flush();
   check(game.preparations().length===4&&otherPreparations.every(id=>game.preparations().some(p=>p.id===id))&&state.waste===wasteBefore+1,'Discarding one ready preparation keeps the other four');
   const trayBeer=game.preparations().find(p=>p.id===secondBeer.id),trayBeerPoint=game.preparationStation(trayBeer);approach(trayBeerPoint);look({...trayBeerPoint,y:trayBeerPoint.y+.18});interact('select');
   key(preferences.bindings.pour.code);game.tick(.1);key(preferences.bindings.pour.code,'keyup');interact('pour');interact('ready');
   state.tray.push({recipe:'coffee',quality:97});const keptDrink=state.tray[1],stockBeforeDiscard=JSON.stringify(state.stock),trayPoint=BarScene.trayPosition(0);
   approach(trayPoint);look({...trayPoint,y:trayPoint.y+.14});interact('tray');
   const discardTray=document.querySelector('[data-discard-tray="0"]');check(discardTray&&$('modal').open,'E on the physical tray opens drink management');discardTray.click();await flush();
   check(state.tray.length===1&&state.tray[0]===keptDrink&&JSON.stringify(state.stock)===stockBeforeDiscard,'Discarding a tray drink preserves the other drink and does not consume stock');
   check(!BarPreparation.openTray(3),'A missing tray drink cannot be managed');
   state.parkedPreps=[];state.prep=null;state.stock.wine=0;ui();
   approach(layout.vessels);look({...layout.vessels,y:layout.vessels.y+.12});interact('choose');
   check(document.querySelector('[data-vessel-recipe="wine"]').disabled,'A stock shortage disables its physical recipe');
   const firstChoice=document.querySelector('[data-vessel-recipe="beer"]'),count=game.preparations().length;
   camera={x:3,y:1.68,z:6.4,a:0,pitch:0};firstChoice.click();check(game.preparations().length===count,'A stale picker cannot create a drink remotely');
   $('modal').close();await flush();render();
   check(!document.querySelector('[data-action="step"]'),'No generic add button bypasses physical ingredients');
   return {recipes:completed,physicalAisle:true,tableBlocked:true,walkingStopsPour:true,parallelPreparations:5,independentDoses:true,saveAll:true,selectionAtGlass:true,discardAtGlassAndTray:true,gl:renderer.gl.getError()};
  })()`,true);
  if(errors.length)throw Error(errors.join('\n'));
  await win.webContents.executeJavaScript(`(async()=>{
   camera={x:7,y:1.68,z:1.65,a:Math.PI,pitch:-.2};ui();render();
   if(!BarPreparation.openVessels())throw Error('The screenshot must open the physical vessel selector');
   await new Promise(resolve=>setTimeout(resolve,180));
   const dialog=$('modal'),rect=dialog.getBoundingClientRect();
   if(!BarPreparation.isChoosingVessel()||!dialog.classList.contains('vessel-picker')||rect.width<700||rect.height<300||document.querySelectorAll('[data-vessel-recipe]').length!==Object.keys(recipes).length)
    throw Error('The vessel selector must remain visibly open before its screenshot');
  })()`,true);
  const artifacts=path.join(__dirname,'artifacts');fs.mkdirSync(artifacts,{recursive:true});fs.writeFileSync(path.join(artifacts,'physical-vessel-picker.png'),(await win.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG());
  console.log('PHYSICAL PREPARATION UI OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}
});
