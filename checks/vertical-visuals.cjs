'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),html=path.join(root,'.build','vertical-visual-audit.html');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-vertical-visuals-')));
const source=path.resolve(process.env.BAR_QA_TARGET?path.dirname(process.env.BAR_QA_TARGET):path.join(root,'dist'));
fs.mkdirSync(path.dirname(html),{recursive:true});fs.writeFileSync(html,'<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}canvas{width:100%;height:100%;display:block}</style><canvas id="world"></canvas>'+['engine.js','renderer.js','scene.js','venue.js'].map(file=>'<script src="'+pathToFileURL(path.join(source,file)).href+'"></script>').join(''));
let win;const timeout=setTimeout(()=>{console.error('Vertical visuals timed out');app.exit(1)},90000);
app.whenReady().then(async()=>{
 try{
  const errors=[];win=new BrowserWindow({show:false,width:1440,height:900,useContentSize:true,webPreferences:{offscreen:true,nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});await win.loadFile(html);const evaluate=code=>win.webContents.executeJavaScript(code,true);
  await evaluate(`window.game=new BarEngine.Game();for(const id of Object.keys(BarEngine.managementUpgrades))game.s.management[id]=true;
   for(const key of Object.keys(BarEngine.ingredients)){game.s.stock[key]=BarEngine.ingredients[key].pack;game.s.reserve[key]=BarEngine.ingredients[key].pack;}
   const boxes=BarScene.create(game.s);BarVenue.addFrame(boxes);window.renderer=new BarRenderer(document.getElementById('world'),boxes,{labels:[...BarScene.terminalLabelTemplates,...BarVenue.labelTemplates]});
   window.settings={quality:'medium',brightness:100,fov:75};window.serviceTime=1020;window.showPeople=false;
   window.camera={x:22.5,y:1.68,z:4.65,a:0,pitch:.2};
   window.aim=(x,y,z)=>{const dx=x-camera.x,dy=y-camera.y,dz=z-camera.z;camera.a=Math.atan2(dx,dz);camera.pitch=Math.atan2(dy,Math.hypot(dx,dz))};
   window.draw=()=>{const dynamic=[];BarScene.storageVisuals(dynamic,game.s);BarScene.preparationVisuals(dynamic,game.s);BarScene.registerVisuals(dynamic,game.s);
    if(showPeople){let id=0;for(const table of BarEngine.tables){const seat=BarScene.tableSeat(table.id);BarScene.customer(dynamic,{...seat,id:id++,time:1,moving:false,seated:true});}
     for(const counter of BarEngine.counterSeats){const seat=BarScene.counterSeat(counter.slot);BarScene.customer(dynamic,{...seat,id:id++,time:1,moving:false,seated:true});}
     for(const person of [{x:3,z:-2.1,staffKind:'assistant'},{x:8,z:1.72,staffKind:'bartender'},{x:9.8,z:1.72,staffKind:'bartender'},{x:20.1,z:4.5,staffKind:'manager'},{x:28,z:4.3,angle:Math.PI,staffKind:'dj'},{x:24.8,z:4.55,angle:Math.PI,staffKind:'host'},{x:13.15,y:3.6,z:6.5,staffKind:'waiter'}])BarScene.customer(dynamic,{...person,id:id++,time:1,moving:false});
    }
    renderer.render(camera,dynamic,settings,serviceTime);renderer.gl.finish();if(renderer.gl.getError())throw Error('WebGL failed');return dynamic.length;};true;
  `);
  async function capture(name,code){await evaluate(code+';draw()');await new Promise(resolve=>setTimeout(resolve,100));await evaluate('draw()');const png=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No paint '+name)),5000);win.webContents.once('paint',(_e,_r,image)=>{clearTimeout(timer);resolve(image.toPNG())});win.webContents.invalidate()});if(png.length<10000)throw Error('Blank '+name);fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});fs.writeFileSync(path.join(__dirname,'artifacts',name+'.png'),png);}
  await capture('vertical-stairs-bottom',"camera={x:22.5,y:1.68,z:4.65};aim(22.5,4.4,9.2)");
  await capture('vertical-stairs-top',"camera={x:22.5,y:5.28,z:9.3};aim(22.5,1.8,5)");
  await capture('vertical-upper-salon',"camera={x:20.1,y:5.28,z:5.25};aim(15.9,4.8,7.7)");
  await capture('vertical-club',"camera={x:24.65,y:1.68,z:5.25};aim(28.6,1.3,7.8)");
  await capture('vertical-club-dj',"showPeople=true;camera={x:28,y:1.68,z:8.2};aim(28,1.35,4.6)");
  await capture('vertical-upper-night',"serviceTime=1440;camera={x:20.1,y:5.28,z:5.25};aim(15.9,4.8,7.7)");
  await capture('vertical-new-stock',"showPeople=false;camera={x:8.4,y:1.68,z:1.8};aim(8.35,1.24,.85)");
  await capture('vertical-reserve-stock',"camera={x:2.25,y:1.68,z:-1.3};aim(.43,1.5,-1.65)");
  const result=await evaluate(`(()=>{showPeople=true;const checks=[];for(const quality of ['low','medium','high'])for(const floor of [0,3.6]){settings.quality=quality;camera={x:20.1,y:floor+1.68,z:5.25};aim(15.9,floor+1.2,7.7);draw();if(renderer.shadowFloor!==floor)throw Error('Wrong shadow floor');if(renderer.people.filter((value,index)=>index%4===3&&value===1).length!==29)throw Error('Crowd shadow capacity');checks.push({quality,floor});}
   settings.quality='medium';camera={x:28,y:1.68,z:8.2};aim(28,1.3,4.6);const shapes=draw();const begin=performance.now();for(let i=0;i<8;i++)draw();const fullCrowdFrameMs=(performance.now()-begin)/8;
   if(renderer.totalCharacters!==29||renderer.visibleCharacters>=29||renderer.visibleCharacters<1)throw Error('Character visibility was not applied');
   return {checks,contacts:29,visibleCharacters:renderer.visibleCharacters,totalCharacters:renderer.totalCharacters,upperCasters:renderer.upperShadowMesh.length/12,groundCasters:renderer.groundShadowMesh.length/12,width:renderer.buildingWidth,fullCrowdFrameMs,shapes,gl:renderer.gl.getError()};})()`);
  if(errors.length)throw Error(errors.join('\n'));console.log('VERTICAL VISUALS OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();fs.unlinkSync(html);app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}
});
