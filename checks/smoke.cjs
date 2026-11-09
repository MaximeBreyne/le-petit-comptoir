const {app,BrowserWindow}=require('electron');const path=require('node:path');const fs=require('node:fs');
app.setPath('userData',path.resolve('.qa-profile'));
const errors=[];let win;
app.whenReady().then(async()=>{try{
 win=new BrowserWindow({width:1440,height:960,show:false,webPreferences:{backgroundThrottling:false,nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.webContents.on('console-message',details=>{if(details.level==='error'||details.level===3)errors.push(details.message)});
 win.webContents.on('render-process-gone',(_e,d)=>{console.error(d);app.exit(1)});
 await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
 await new Promise(r=>setTimeout(r,1000));
 const result=await win.webContents.executeJavaScript(`(()=>{
 function check(v,m){if(!v)throw Error(m)}
 GameMenu.newGame();if(GameMenu.getMode()==='confirm')document.querySelector('[data-menu-action="confirm"]').click();preferences=defaultPreferences();ui();check(renderer,'WebGL renderer initialized');
 $('open').click();check(state.open,'Open button');
 game.s.orders=[{id:1,name:'Lucie',recipe:'beer',patience:90}];ui();
 document.querySelector('[data-recipe="beer"]').click();check(state.prep.recipe==='beer','Recipe click');
 document.querySelector('[data-action="step"]').click();check(game.isPour(),'Select glass');
 const pour=$('pour');pour.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));
 check(state.prep.pouring,'Held pour');for(let i=0;i<36;i++)game.tick(.1);
 pour.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}));check(!state.prep.pouring,'Released pour');
 document.querySelector('[data-action="finish"]').click();check(state.prep.ready,'Validate dose');
 document.querySelector('[data-action="plate"]').click();check(state.tray.length===1,'Tray');
 document.querySelector('[data-serve="1"]').click();check(state.sold===1&&state.cash===266,'Serve and tip');
 $('order').click();check($('modal').open,'Supplier dialog');
 document.querySelector('[data-buy="rum"]').click();check(state.deliveries.length===1,'Order delivery');
 $('close').click();check(!$('modal').open,'Close dialog');
 for(let i=0;i<101;i++)game.tick(.1);check(state.stock.rum===140,'Delivery arrived');
 game.s.orders=[{id:2,name:'Nadia',recipe:'mojito',patience:80},{id:3,name:'Thomas',recipe:'wine',patience:65}];
 game.start('mojito');game.step();game.step();game.step();game.step();game.s.prep.amount=3.5;ui();
 save();const restored=new Game(JSON.parse(localStorage.getItem('comptoir-bar-v2')));check(restored.s.stock.rum===136,'Saved stock');
 check(!document.body.innerText.includes('Tabac'),'No old theme');
 return {cash:state.cash,stock:state.stock.rum,stage:state.prep.step,title:document.title,bodyWidth:document.body.scrollWidth,windowWidth:innerWidth};
 })()`);
 await new Promise(r=>setTimeout(r,500));
 fs.mkdirSync('checks/artifacts',{recursive:true});fs.writeFileSync('checks/artifacts/bar-preview.png',(await win.webContents.capturePage()).toPNG());
 if(errors.length)throw Error(errors.join('\n'));
 console.log('WINDOWS UI OK',JSON.stringify(result));app.quit();
 }catch(e){console.error(e);app.exit(1)}});
