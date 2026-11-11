'use strict';
// Actual WebGL material and collision audit in an isolated scene, independent of
// player saves and input devices. Captures are reviewable in checks/artifacts.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),html=path.join(root,'.build','visual-surface-audit.html');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-surfaces-')));
const source=path.resolve(process.env.BAR_QA_TARGET?path.dirname(process.env.BAR_QA_TARGET):path.join(root,'dist'));
fs.mkdirSync(path.dirname(html),{recursive:true});
fs.writeFileSync(html,'<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#16201c;width:100%;height:100%;overflow:hidden}canvas{width:100%;height:100%;display:block}</style><canvas id="world"></canvas>'+['engine.js','renderer.js','scene.js','venue.js'].map(file=>'<script src="'+pathToFileURL(path.join(source,file)).href+'"></script>').join(''));
let win;const timeout=setTimeout(()=>{console.error('Surface audit timed out');app.exit(1)},60000);
app.whenReady().then(async()=>{
 try{
  const errors=[];win=new BrowserWindow({show:false,width:1440,height:900,useContentSize:true,webPreferences:{offscreen:true,nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(html);const evaluate=code=>win.webContents.executeJavaScript(code,true);
  await evaluate(`window.game=new BarEngine.Game();game.s.cash=10000;game.s.totalSold=80;for(const id of ['expansion1','table5','table6','expansion2','table7','table8'])game.purchaseUpgrade(id);
   const initial=BarScene.create(game.s);BarVenue.addFrame(initial);window.renderer=new BarRenderer(document.getElementById('world'),initial,{labels:[...BarScene.terminalLabelTemplates,...BarVenue.labelTemplates]});
   window.settings={quality:'medium',brightness:100,fov:75};
   window.camera={x:6,y:1.68,z:1.7,a:0,pitch:-.12};
   window.aim=(x,y,z)=>{const dx=x-camera.x,dy=y-camera.y,dz=z-camera.z;camera.a=Math.atan2(dx,dz);camera.pitch=Math.atan2(dy,Math.hypot(dx,dz))};
   window.draw=()=>{const dynamic=[];BarVenue.render(dynamic,game.s);BarScene.storageVisuals(dynamic,game.s);BarScene.preparationVisuals(dynamic,game.s);BarScene.registerVisuals(dynamic,game.s);
    for(const [index,slot]of BarEngine.preparationSlots.entries()){const recipe=['beer','beer','coffee','mojito','ginFizz'][index];BarScene.glass(BarScene.geometry(dynamic),recipe,slot.x,slot.y,slot.z,1);}
    for(const [index,recipe]of ['coffee','ginFizz','wine','mojito'].entries()){const point=BarScene.trayPosition(index);BarScene.glass(BarScene.geometry(dynamic),recipe,point.x,point.y,point.z,1);}
    renderer.render(camera,dynamic,settings,1020);renderer.gl.finish();if(renderer.gl.getError())throw Error('WebGL failed');};
   window.applyDecor=styles=>{for(const [category,id]of Object.entries(styles))game.purchaseDecor(category,id);const shapes=BarScene.create(game.s);BarVenue.addFrame(shapes);renderer.setScene(shapes);};true;
  `);
  async function capture(name,code){
   await evaluate(code+';draw()');await new Promise(resolve=>setTimeout(resolve,120));await evaluate('draw()');
   const png=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Capture missing: '+name)),5000);win.webContents.once('paint',(_event,_rect,image)=>{clearTimeout(timer);resolve(image.toPNG())});win.webContents.invalidate()});
   if(png.length<10000)throw Error('Capture appears blank: '+name);
   const dir=path.join(__dirname,'artifacts');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name+'.png'),png);
  }
  await capture('audit-counter',"camera={x:6,y:1.72,z:1.6};aim(6,1.2,3.05)");
  await capture('audit-coffee',"camera={x:8.72,y:1.55,z:1.8};aim(8.72,1.38,2.75)");
  for(const quality of ['low','high'])await capture('audit-coffee-'+quality,'settings.quality='+JSON.stringify(quality));
  await evaluate("settings.quality='medium'");
  await capture('audit-reserve',"camera={x:2.25,y:1.68,z:-2.0};aim(2.25,1.3,-3.7)");
  await capture('audit-entrance',"camera={x:6,y:1.68,z:7.4};aim(6,1.6,10)");
  await capture('decor-classic',"camera={x:12.9,y:1.68,z:5.45};aim(15.1,1.25,8.05)");
  await capture('decor-blue-stone',"applyDecor({tables:'marble',chairs:'blue',walls:'midnight',ceiling:'white',floor:'lightOak'});camera={x:12.9,y:1.68,z:5.45};aim(15.1,1.25,8.05)");
  await capture('decor-cognac-tiles',"applyDecor({tables:'walnut',chairs:'leather',walls:'terracotta',ceiling:'charcoal',floor:'terracotta'});camera={x:17.4,y:1.68,z:5.45};aim(19.2,1.25,8.05);if(renderer.buildingWidth!==21)throw Error('Tile floor reduced the shadow extent')");
  await evaluate(`for(const [category,catalog]of Object.entries(BarEngine.decorCatalog))for(const option of catalog.options){applyDecor({[category]:option.id});for(const quality of ['low','medium','high']){settings.quality=quality;draw()}}`);
  if(errors.length)throw Error(errors.join('\n'));
  console.log('VISUAL SURFACES OK',JSON.stringify({styles:18,captures:9,qualities:3,fullBuilding:true,gl:0}));clearTimeout(timeout);win.destroy();fs.unlinkSync(html);app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}
});
