'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-decor-')));
let win;const errors=[],timeout=setTimeout(()=>{console.error('Decor UI timed out');app.exit(1)},90000);
app.whenReady().then(async()=>{
 try{
  win=new BrowserWindow({show:false,width:1440,height:960,useContentSize:true,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  async function capture(name){
   await evaluate('render();renderer.gl.finish()');await new Promise(resolve=>setTimeout(resolve,150));
   const png=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No capture '+name)),5000);win.webContents.once('paint',(_event,_rect,image)=>{clearTimeout(timer);resolve(image.toPNG())});win.webContents.invalidate()});
   const folder=path.join(__dirname,'artifacts');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,name+'.png'),png);
  }
  const result=await evaluate(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)},flush=()=>new Promise(resolve=>setTimeout(resolve,30));
   const click=selector=>{const button=document.querySelector(selector);check(button&&!button.disabled&&!button.closest('[hidden]'),'Usable control '+selector);button.click()};
   const finish=(category,id)=>click('[data-decor-category="'+category+'"][data-decor-finish="'+id+'"]');
   let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
   canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});
   document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
   window.requestAnimationFrame=()=>0;await flush();click('[data-menu-action="new"]');await flush();
   const originalStock=JSON.stringify(state.stock),originalDecor=JSON.stringify(state.decor);
   BarTablet.open('decor');check(BarTablet.getTab()==='decor','The decoration page opens from the tablet');
   check(document.querySelectorAll('[data-decor-finish]').length===18,'Every finish has a usable catalogue card');
   check(document.querySelectorAll('[data-decor-option][data-selected="true"]').length===5,'The five original finishes are selected');
   check(document.querySelector('[data-decor-finish="marble"]').disabled,'Premium decor is locked by paid-customer progression');
   game.open();ui();BarTablet.refresh(true);const beforeBlocked=state.cash;
   check(document.querySelector('[data-decor-finish="walnut"]').disabled,'Work is unavailable during service');
   const forced=document.querySelector('[data-decor-finish="walnut"]');forced.disabled=false;forced.click();
   check(state.cash===beforeBlocked&&JSON.stringify(state.decor)===originalDecor,'A forced button cannot bypass the engine service guard');
   game.close();game.end();state.totalSold=80;state.cash=2500;ui();BarTablet.refresh(true);
   const selected={tables:'marble',chairs:'blue',walls:'sage',ceiling:'white',floor:'terracotta'};
   for(const [category,id]of Object.entries(selected))finish(category,id);
   check(state.cash===1780&&state.expenses===720,'The five finishes charge their exact one-time prices');
   check(JSON.stringify(state.decor)===JSON.stringify(selected)&&JSON.stringify(state.stock)===originalStock,'Selected finishes apply without consuming stock');
   for(const [category,style]of Object.entries(BarEngine.decorStyle(state))){const color=style.colors.top||style.colors.seat||style.colors.plaster||style.colors.surface;check(boxes.some(box=>box.c===color),'The selected '+category+' color appears in actual room geometry');}
   const cash=state.cash;finish('tables','oak');finish('tables','marble');check(state.cash===cash&&state.expenses===720,'Reapplying owned finishes is free');
   BarTablet.close();await flush();camera={...BarScene.playCamera,x:6,z:8.8,a:Math.PI,pitch:-.08};
   GameMenu.pause();click('[data-menu-action="save"]');click('[data-menu-action="save-slot"][data-slot="1"]');await flush();
   const manual=JSON.parse(localStorage.getItem('comptoir-bar-slot-v1-1'));check(manual.state.decor.tables==='marble'&&manual.state.decorOwned.tables.includes('marble'),'Manual save includes finishes and ownership');
   click('[data-menu-action="back"]');GameMenu.resume();await flush();
   for(const [category,catalog]of Object.entries(BarEngine.decorCatalog))game.purchaseDecor(category,catalog.options[0].id);ui();
   GameMenu.pause();click('[data-menu-action="load"]');click('[data-menu-action="load-slot"][data-slot="1"]');click('[data-menu-action="confirm"]');await flush();
   check(JSON.stringify(state.decor)===JSON.stringify(selected)&&state.cash===1780,'Manual load restores appearance and paid amounts');
   BarTablet.open('building');click('[data-tablet-upgrade="expansion1"]');click('[data-tablet-upgrade="table5"]');
   check(renderer.buildingWidth===16.5,'Tiled floors retain the expanded lighting and shadow extent');
   const fifth=BarEngine.tables.find(table=>table.id===5);check(boxes.some(box=>box.decorCategory==='tables'&&box.x===fifth.x&&box.z===fifth.z&&box.c===BarEngine.decorStyle(state).tables.colors.top),'A new table inherits the owned finish');
   BarTablet.close();await flush();GameMenu.returnHome();GameMenu.continueGame();await flush();
   check(state.decor.floor==='terracotta'&&state.management.table5,'Automatic save restores both decor and room purchases');
   render();check(renderer.gl.getError()===0,'Decorated rooms render without errors');
   window.__decorQA={check,flush,click,selected};
   return {finishes:18,categories:5,paidOnce:true,stockPreserved:true,manualAndAutomaticSave:true,expandedStyle:true,gl:0};
  })()`);
  await evaluate("camera={...BarScene.playCamera,x:6.3,z:8.9,a:Math.PI,pitch:.03};render()");await capture('decorated-bar');
  await evaluate("BarTablet.open('decor');document.querySelector('.tablet-main').scrollTop=0");await capture('decor-catalogue');
  if(errors.length)throw Error(errors.join('\n'));
  console.log('DECOR UI OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error);if(errors.length)console.error(errors.join('\n'));clearTimeout(timeout);win?.destroy();app.exit(1)}
});
