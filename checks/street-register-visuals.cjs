'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),html=path.join(root,'.build','street-register-audit.html');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-street-register-')));
const source=path.resolve(process.env.BAR_QA_TARGET?path.dirname(process.env.BAR_QA_TARGET):path.join(root,'dist'));
fs.mkdirSync(path.dirname(html),{recursive:true});fs.writeFileSync(html,'<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}canvas{width:100%;height:100%;display:block}</style><canvas id="world"></canvas>'+['engine.js','renderer.js','scene.js','venue.js'].map(file=>'<script src="'+pathToFileURL(path.join(source,file)).href+'"></script>').join(''));
let win;const timeout=setTimeout(()=>{console.error('Street/register visuals timed out');app.exit(1)},120000);
app.whenReady().then(async()=>{
 try{
  const errors=[];win=new BrowserWindow({show:false,width:1440,height:900,useContentSize:true,webPreferences:{offscreen:true,nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});await win.loadFile(html);const evaluate=code=>win.webContents.executeJavaScript(code,true);
  await evaluate(`window.game=new BarEngine.Game();game.s.open=true;window.people=false;window.developed=false;
   window.settings={quality:'medium',brightness:100,fov:75};window.camera={x:6,y:1.68,z:9.66,a:0,pitch:0};
   window.renderer=new BarRenderer(document.getElementById('world'),BarScene.create(game.s),{labels:[...BarScene.terminalLabelTemplates,...BarVenue.labelTemplates]});
   window.aim=(x,y,z)=>{const dx=x-camera.x,dy=y-camera.y,dz=z-camera.z;camera.a=Math.atan2(dx,dz);camera.pitch=Math.atan2(dy,Math.hypot(dx,dz))};
   window.draw=()=>{const dynamic=[];BarScene.registerVisuals(dynamic,game.s);if(people){let id=0;for(const table of BarEngine.availableTables(game.s)){BarScene.customer(dynamic,{...BarScene.tableSeat(table.id),id:id++,time:1,moving:false,seated:true});}for(const seat of BarEngine.counterSeats)BarScene.customer(dynamic,{...BarScene.counterSeat(seat.slot),id:id++,time:1,moving:false,seated:true});for(let i=0;i<7;i++)BarScene.customer(dynamic,{x:3+i*.9,y:0,z:1.7,id:id++,time:1,moving:false,staffKind:'bartender'});}
    const current=BarEngine.checkoutCustomer(game.s);if(current)BarScene.customer(dynamic,{x:2.45,y:0,z:4.15,id:current.id,time:1,moving:false,angle:0});
    renderer.render(camera,dynamic,settings,game.s.time);renderer.gl.finish();if(renderer.gl.getError())throw Error('WebGL failed');return dynamic.length;};
   window.upgrade=()=>{for(const id of Object.keys(BarEngine.managementUpgrades))game.s.management[id]=true;renderer.setScene(BarScene.create(game.s));developed=true};
   window.ticket=(id,phase='payment',method='cash')=>{game.s.orders=[{id,name:'Lucie',tableId:9,recipe:'nightPurple',phase,paymentMethod:method,patience:100,due:17,tip:1,tender:20,checkout:{slot:0,remaining:0,total:0,route:[{x:2.45,y:0,z:4.15},{x:2.45,y:0,z:4.15}]}}]};
   true;`);
  async function capture(name,code){await evaluate(code+';draw()');await new Promise(resolve=>setTimeout(resolve,150));await evaluate('draw()');await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No settled paint '+name)),5000);win.webContents.once('paint',()=>{clearTimeout(timer);resolve()});win.webContents.invalidate()});await new Promise(resolve=>setTimeout(resolve,75));const png=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No paint '+name)),5000);win.webContents.once('paint',(_event,_rect,image)=>{clearTimeout(timer);resolve(image.toPNG())});win.webContents.invalidate()});fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});fs.writeFileSync(path.join(__dirname,'artifacts',name+'.png'),png);if(png.length<10000)throw Error('Blank '+name);}
  await capture('street-front-day',"camera={x:5.1,y:1.68,z:9.66,a:0,pitch:-.04};settings.fov=75");
  await capture('street-window-left',"camera={x:3.2,y:1.68,z:9.66,a:-1.26,pitch:-.08};settings.fov=100");
  await capture('street-window-right',"camera={x:8.8,y:1.68,z:9.66,a:1.26,pitch:-.08};settings.fov=100");
  await capture('street-upper-window',"upgrade();camera={x:19.8,y:5.28,z:9.66,a:1.10,pitch:-.22};settings.fov=100");
  await capture('street-upper-left',"camera={x:13.1,y:5.28,z:9.66,a:-1.10,pitch:-.22}");
  await capture('street-night',"game.s.time=1500;camera={x:5.1,y:1.68,z:9.66,a:0,pitch:-.04};settings.fov=75");
  await capture('register-real-screen',"game.s.time=1200;ticket(15);camera={x:2.65,y:1.68,z:2.08};aim(2.65,1.39,2.94);settings.fov=60");
  await capture('register-card-processing',"ticket(16,'card-processing','card')");
  if(process.env.BAR_QA_BASELINE_SCENE)await evaluate(fs.readFileSync(process.env.BAR_QA_BASELINE_SCENE,'utf8').replace('const BarScene=','const BarSceneBaseline='));
  const result=await evaluate(`(()=>{
   const labels=renderer.labelMap.size,canvas=renderer.registerCanvas;ticket(17);draw();const updates=renderer.registerUpdates;for(let i=0;i<30;i++)draw();if(renderer.registerUpdates!==updates)throw Error('Unchanged register redrawn');
   for(let i=0;i<100;i++){ticket(100+i,i%2?'cash-collected':'payment');draw();}if(renderer.labelMap.size!==labels||renderer.registerCanvas!==canvas)throw Error('Register creates growing textures');
   if(!renderer.registerSignature.includes('17')||!renderer.registerSignature.includes('Nuit Pourpre'))throw Error('Actual bill missing from screen');
   game.s.orders=[];people=true;settings.fov=75;camera={x:6,y:1.68,z:1.65,a:0,pitch:0};draw();const start=performance.now();for(let i=0;i<8;i++)draw();const crowdedFrameMs=(performance.now()-start)/8;
   if(renderer.totalCharacters!==29)throw Error('Incomplete crowd measurement');
   let baselineCrowdedFrameMs=null;if(typeof BarSceneBaseline!=='undefined'){renderer.setScene(BarSceneBaseline.create(game.s));draw();const baselineStart=performance.now();for(let i=0;i<8;i++)draw();baselineCrowdedFrameMs=(performance.now()-baselineStart)/8;renderer.setScene(BarScene.create(game.s));draw();}
   const modes=[];for(const quality of ['low','medium','high']){settings.quality=quality;for(const view of [{x:3.2,y:1.68,z:9.66,a:-1.26,pitch:-.08},{x:19.8,y:5.28,z:9.66,a:1.1,pitch:-.22}]){camera=view;settings.fov=100;draw();modes.push({quality,y:camera.y});}}
   return {modes,labels,registerSize:[canvas.width,canvas.height],registerTickets:100,registerStable:true,streetVertices:renderer.count,crowdedFrameMs,baselineCrowdedFrameMs,visibleCharacters:renderer.visibleCharacters,totalCharacters:renderer.totalCharacters,gl:renderer.gl.getError()};
  })()`);
  if(errors.length)throw Error(errors.join('\n'));console.log('STREET REGISTER VISUALS OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();fs.unlinkSync(html);app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}
});
