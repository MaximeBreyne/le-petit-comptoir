'use strict';

// Capture the actual game UI and WebGL scene without showing a window or
// modifying the player's profile. Run: electron checks/visual-preview.cjs
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');

const root=path.resolve(__dirname,'..');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-visual-'));
const artifacts=path.join(__dirname,'artifacts');
app.setPath('userData',profile);
const errors=[];
let win;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timeout=setTimeout(()=>{console.error('Visual preview timed out');app.exit(1)},90000);

app.whenReady().then(async()=>{
 try{
  // The capture window stays hidden and at a fixed size. The desktop bridge
  // avoids browser fullscreen prompts; native window behavior has separate tests.
  ipcMain.handle('game:fullscreen:get',()=>true);
  ipcMain.handle('game:fullscreen:toggle',()=>true);
  ipcMain.handle('game:quit',()=>false);
  const updateStatus={state:'disabled',version:require('../package.json').version,
   sourceDirectory:null,message:'Aperçu de développement.'};
  ipcMain.handle('update:status',()=>updateStatus);
  ipcMain.handle('update:check',()=>updateStatus);
  ipcMain.handle('update:choose-source',()=>updateStatus);
  win=new BrowserWindow({show:false,width:1600,height:1000,useContentSize:true,
   backgroundColor:'#101a19',webPreferences:{preload:path.join(root,'desktop/preload.cjs'),
    sandbox:true,nodeIntegration:false,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
  win.webContents.on('console-message',details=>{
   if(details.level==='error'||details.level===3)errors.push(details.message);
  });
  win.webContents.on('render-process-gone',(_event,details)=>{
   console.error('Renderer exited',details);app.exit(1);
  });
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||path.join(root,'dist/index.html')));
  await sleep(400);
  fs.mkdirSync(artifacts,{recursive:true});
  async function evaluate(expression){return win.webContents.executeJavaScript(expression,true)}
  async function capture(name){
   await evaluate('render();renderer.gl.finish();');
   // Keep the application's RAF running: hidden-window capture needs a freshly
   // composited frame after camera/UI changes, while paused freezes simulation.
   await sleep(250);
   // Offscreen painting supplies the newly composed frame directly; capturePage
   // can return an older surface while a regular BrowserWindow remains hidden.
   const png=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('No fresh preview frame for '+name)),5000);
    win.webContents.once('paint',(_event,_dirty,image)=>{clearTimeout(timer);resolve(image.toPNG())});
    win.webContents.invalidate();
   });
   fs.writeFileSync(path.join(artifacts,name),png);
  }

  const home=await evaluate(`(()=>{
   if(!renderer)throw Error('WebGL renderer unavailable');
   if(!window.GameMenu||!GameMenu.isHome())throw Error('Welcome screen missing');
   paused=true;
   return {home:GameMenu.isHome(),mode:GameMenu.getMode(),overlayVisible:!document.getElementById('gameMenu').hidden,bodyClass:document.body.className};
  })()`);
  await capture('preview-home.png');

  await evaluate(`(()=>{
   const button=document.querySelector('[data-menu-action="new"]')||document.querySelector('#menu-new')||
    [...document.querySelectorAll('button')].find(button=>/^(Nouvelle partie|Nouveau bar|Commencer une partie)$/i.test(button.textContent.trim()));
   if(!button)throw Error('New game button missing');
   button.click();
  })()`);
  await sleep(100);
  const gameView=await evaluate(`(()=>{
   if(GameMenu.isHome())throw Error('New game did not enter the bar');
   paused=true;keys={};game.setPour(false);
   game.open();
   state=game.s;
   state.orders=[{id:1,name:'Lucie',recipe:'beer',patience:90},{id:2,name:'Marc',recipe:'wine',patience:80}];
   state.nextId=3;state.spawn=16;
   customerVisuals.clear();visualTime=0;render();visualTime=4;
   if(typeof BarScene!=='undefined'&&BarScene.playCamera)camera={...BarScene.playCamera};
   ui();render();
   return {home:GameMenu.isHome(),mode:GameMenu.getMode(),overlayVisible:!document.getElementById('gameMenu').hidden,bodyClass:document.body.className,camera:{...camera},orders:state.orders.length};
  })()`);
  await capture('preview-game.png');

  const hiddenHud=await win.webContents.insertCSS('body > :not(#world):not(script):not(style){visibility:hidden!important}');
  const scene=await evaluate(`(()=>{
   camera=typeof BarScene!=='undefined'&&BarScene.homeCamera?{...BarScene.homeCamera}:{x:10.5,y:1.72,z:8.5,a:3.91,pitch:-.045};
   render();renderer.gl.finish();
   const start=performance.now();
   for(let i=0;i<20;i++){render();renderer.gl.finish()}
   const averageRenderMs=(performance.now()-start)/20;
   const glError=renderer.gl.getError();
   if(glError!==renderer.gl.NO_ERROR)throw Error('WebGL error '+glError);
   return {camera:{...camera},averageRenderMs,glError,canvas:[canvas.width,canvas.height],staticVertices:renderer.count};
  })()`);
  await capture('preview-bar.png');
  await win.webContents.removeInsertedCSS(hiddenHud);

  const pause=await evaluate(`(()=>{
   if(typeof BarScene!=='undefined'&&BarScene.playCamera)camera={...BarScene.playCamera};
   paused=false;GameMenu.pause();render();
   return {home:GameMenu.isHome(),mode:GameMenu.getMode(),overlayVisible:!document.getElementById('gameMenu').hidden,paused,bodyClass:document.body.className};
  })()`);
  if(!pause.paused||pause.mode!=='pause'||!pause.overlayVisible)throw Error('Pause menu did not pause the game');
  await capture('preview-pause.png');
  if(errors.length)throw Error(errors.join('\n'));
  const result={home,game:gameView,scene,pause};
  fs.writeFileSync(path.join(artifacts,'visual-preview.json'),JSON.stringify(result,null,2));
  console.log('VISUAL PREVIEW OK',JSON.stringify(result));
  clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){clearTimeout(timeout);console.error(error);app.exit(1)}
});
