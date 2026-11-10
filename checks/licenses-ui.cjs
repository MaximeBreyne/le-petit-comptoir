'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-licenses-'));
app.setPath('userData',profile);
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const timeout=setTimeout(()=>{console.error('License UI checks timed out');app.exit(1)},60000);
app.whenReady().then(async()=>{
 let win;
 try{
  win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   const flush=()=>new Promise(resolve=>setTimeout(resolve,25));
   const click=selector=>{const node=document.querySelector(selector);check(node&&!node.disabled&&!node.closest('[hidden]'),'Usable visible control '+selector);node.click()};
   const key=(code,type='keydown')=>window.dispatchEvent(new KeyboardEvent(type,{code,key:code,bubbles:true,cancelable:true}));
   const advance=seconds=>{for(let i=0;i<Math.ceil(seconds*10);i++)game.tick(.1);ui();};
   const approach=point=>({x:point.x,z:Math.min(2.15,Math.max(1.35,point.z))});
   const faceStation=()=>{const point=game.preparationStation(),position=approach(point);camera={...position,y:1.68,a:0,pitch:Math.atan2(point.y+.18-1.68,point.z-position.z)};ui();};
   const gatherSelected=()=>{const layout=BarEngine.preparationLayout,position=approach(game.preparationStation());check(state.prep.held?.kind==='vessel','Recipe selection has already taken its vessel');game.placeHeld(position);for(const ingredient of Object.keys(recipes[state.prep.recipe].ingredients).filter(k=>k!=='beer')){game.takeIngredient(ingredient,approach(layout.ingredients[ingredient]));check(state.prep.held?.key===ingredient,'Ingredient is held: '+ingredient);game.placeHeld(position);}faceStation();};
   let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
   canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});
   document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
   window.requestAnimationFrame=()=>0;await flush();click('[data-menu-action="new"]');await flush();
   BarTablet.open('service');click('#tabletServiceToggle');state.spawn=999;BarTablet.close();await flush();
   camera={...BarScene.playCamera,x:7,z:1.4};BarPreparation.openVessels();
   check(Object.keys(recipes).length===10,'Ten drinks are available in the glass catalogue');
   const added=['virginMojito','lemonade','whisky','ginTonic','ginFizz','cubaLibre'];
   for(const id of added)check(document.querySelector('#modal [data-vessel-recipe="'+id+'"]').disabled,'A locked drink cannot be prepared from its glass: '+id);
   $('modal').close();await flush();BarTablet.open('licenses');
   const buyLicense=id=>click('[data-tablet-upgrade="'+id+'"]');
   check(document.querySelector('[data-tablet-upgrade="softDrinks"]').disabled,'Sales threshold blocks the license');
   state.totalSold=12;BarTablet.refresh(true);const supplies=JSON.stringify([state.stock,state.reserve]);buyLicense('softDrinks');
   check(state.cash===170&&game.canPrepare('lemonade')&&JSON.stringify([state.stock,state.reserve])===supplies,'License is paid once and grants recipes, not ingredients');
   document.querySelector('[data-tablet-upgrade="softDrinks"]').click();check(state.cash===170,'Owned license cannot be charged twice');
   state.totalSold=36;BarTablet.refresh(true);
   check(document.querySelector('[data-tablet-upgrade="spirits"]').disabled,'Insufficient funds keep an eligible license disabled');
   check(document.querySelector('[data-upgrade="spirits"] .tablet-upgrade-status').textContent.includes('40'),'UI explains the missing funds');
   check(document.querySelector('[data-upgrade="signature"] .tablet-upgrade-status').textContent.includes('Licence cocktails'),'Signature UI explains prerequisite licenses');
   state.cash=1000;BarTablet.refresh(true);buyLicense('spirits');
   check(document.querySelector('[data-tablet-upgrade="signature"]').disabled,'One prerequisite alone does not unlock signature drinks');
   buyLicense('cocktails');buyLicense('signature');check(state.cash===310,'Each purchase deducts its advertised price');
   BarTablet.open('reserve');camera={...BarScene.stockroomCamera};BarTablet.refresh(true);
   for(const key of ['whisky','gin','tonic','cola']){check(state.stock[key]===0&&state.reserve[key]===0,'New stock starts empty');click('[data-tablet-buy="'+key+'"]');}
   advance(10.1);BarTablet.refresh(true);
   for(const key of ['whisky','gin','tonic','cola']){check(state.reserve[key]===ingredients[key].pack,'Delivery reaches reserve: '+key);click('[data-tablet-restock="'+key+'"]');check(state.stock[key]===ingredients[key].pack&&state.reserve[key]===0,'Stock transfers through the tablet: '+key);}
   camera={...BarScene.playCamera,x:1.65,z:6.4};BarTablet.open('orders');
   check(!document.querySelector('[data-tablet-recipe]'),'Tablet no longer starts preparation');BarTablet.close();await flush();
   check(!BarPreparation.openVessels()&&state.prep===null,'The glass selector cannot open remotely at a table');
   const served=[];
   for(const id of added){
    BarTablet.close();await flush();camera={...BarScene.playCamera};
    const order={id:state.nextId++,name:'Test',recipe:id,patience:100,tableId:null,slot:1,phase:'preparing',arrivalRemaining:0,paymentMethod:'card'};
    state.orders=[order];const before={...state.stock};
    camera={...BarScene.playCamera,x:7,z:1.4};BarPreparation.openVessels();click('#modal [data-vessel-recipe="'+id+'"]');await flush();
    check(state.prep?.recipe===id&&!BarTablet.isOpen()&&BarInput.isLooking(),'Recipe returns to physical preparation: '+id);
    check(JSON.stringify(state.stock)===JSON.stringify(before),'Choosing a recipe consumes no ingredients');gatherSelected();
    key(preferences.bindings.pour.code);advance(recipes[id].target/recipes[id].speed);key(preferences.bindings.pour.code,'keyup');key('KeyE');
    if(!state.prep.ready)key('KeyE');
    check(state.prep.ready&&state.prep.quality>=90,'All preparation steps finish with a good dose: '+id);
    for(const [key,amount]of Object.entries(recipes[id].ingredients))check(Math.abs(state.stock[key]-(before[key]-amount))<1e-8,'Ingredients consumed once: '+id+'/'+key);
    key('KeyE');camera={...BarScene.playCamera};key('KeyE');
    check(order.phase==='drinking','New drink can be served directly after glass selection: '+id);
    advance(4.1);game.pickupTerminal(BarEngine.registerPosition);const cash=state.cash;game.payCard(order.id,camera);advance(3.1);
    check(state.cash===cash+recipes[id].price+1,'Payment matches the new recipe and tip: '+id);
    served.push(id);render();check(renderer.gl.getError()===0,'New drink renders without WebGL errors: '+id);
   }
   BarTablet.close();await flush();save(true);const paid=JSON.parse(JSON.stringify(state));GameMenu.returnHome();GameMenu.continueGame();await flush();
   check(state.cash===paid.cash&&['softDrinks','spirits','signature'].every(id=>state.management[id]),'Paid licenses and funds survive an actual menu reload');
   // Load an authentic pre-expansion shape through the real menu validator.
   const old=new Game().s;old.cash=173;old.totalSold=18;old.management.cocktails=true;old.stock.rum=37;old.open=true;old.spawn=999;
   for(const key of ['whisky','gin','tonic','cola']){delete old.stock[key];delete old.reserve[key];}
   for(const id of ['softDrinks','spirits','signature'])delete old.management[id];
   old.prep={recipe:'mojito',step:5,amount:4,pouring:false,ready:false,quality:100};
   check(GameMenu.validState(old),'Legacy save is accepted before stock migration');
   GameMenu.returnHome();localStorage.setItem('comptoir-bar-v2',JSON.stringify(old));GameMenu.continueGame();await flush();
   check(state.cash===173&&state.stock.rum===37&&state.totalSold===18&&state.prep.step===5,'Legacy funds, progression, stock and current preparation are retained');
   for(const key of ['whisky','gin','tonic','cola'])check(state.stock[key]===0&&state.reserve[key]===0,'Migration grants no extra ingredients');
   for(const id of ['softDrinks','spirits','signature'])check(state.management[id]===false,'Migration grants no new license');
   faceStation();key('KeyE');check(state.prep.ready&&state.prep.quality===100,'Legacy mojito finishes with the generic recipe flow');
   BarTablet.open('reserve');check(document.querySelector('[data-tablet-buy="gin"]').disabled,'Locked supplier products are disabled after loading');
   return {licenses:3,recipes:served,stock:'paid, delivered and transferred',legacy:'progression and preparation retained',gl:0};
  })()`,true);
  if(errors.length)throw Error(errors.join('\n'));console.log('LICENSE UI OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){clearTimeout(timeout);console.error(error);win?.destroy();app.exit(1)}
});
