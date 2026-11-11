'use strict';
// Exercise real WebGL pixels, not a mock renderer. A separate hidden profile
// leaves the player's saves untouched; BAR_QA_TARGET can point into app.asar.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),artifacts=path.join(root,'checks/artifacts');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-render-review-')));
let win;const timeout=setTimeout(()=>{console.error('Render review timed out');app.exit(1)},60000);
app.whenReady().then(async()=>{
 try{
  fs.mkdirSync(artifacts,{recursive:true});
  const errors=[];win=new BrowserWindow({show:false,width:1440,height:900,useContentSize:true,webPreferences:{offscreen:true,sandbox:true,nodeIntegration:false,contextIsolation:true,backgroundThrottling:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3){errors.push(event.message);console.error('Renderer:',event.message)}});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||path.join(root,'dist/index.html')));
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  await evaluate(`GameMenu.newGame();paused=true;keys={};game.s=new Game().s;state=game.s;game.open();state.spawn=999;camera={...BarScene.homeCamera};ui();`);
  await win.webContents.insertCSS('body > :not(#world):not(script):not(style){visibility:hidden!important}');
  async function capture(name){
   await evaluate('render();renderer.gl.finish()');
   await new Promise(r=>setTimeout(r,150));
   const png=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No paint '+name)),5000);win.webContents.once('paint',(_event,_rect,img)=>{clearTimeout(timer);resolve(img.toPNG())});win.webContents.invalidate()});
   fs.writeFileSync(path.join(artifacts,name+'.png'),png);
  }
  await capture('graphics-room-day');
  await evaluate('state.time=1440;');await capture('graphics-room-night');
  await evaluate('state.time=1020;camera={x:6.7,y:1.6,z:8.1,a:0,pitch:-.03};');await capture('graphics-frontage');
  await evaluate('camera={x:6.0,y:1.68,z:1.55,a:0,pitch:-.06};');await capture('graphics-workstation');
  const checks=await evaluate(`(()=>{
   const canvas=document.createElement('canvas');document.body.append(canvas);canvas.style.cssText='position:fixed;width:512px;height:512px';
   const far={x:0,y:1,z:4,w:2,h:2,d:.1,c:'#ee0000'},pane={x:0,y:1,z:2,w:2,h:2,d:.03,c:'#c5d5cf',mat:11,castShadow:false},near={...far,z:1,c:'#0000ee'};
   const camera={x:0,y:1,z:0,a:0,pitch:0},settings={...preferences,quality:'low',fov:75};
   const r=new BarRenderer(canvas,[far]),pixel=()=>{const p=new Uint8Array(4);r.gl.readPixels(r.canvas.width/2,r.canvas.height/2,1,1,r.gl.RGBA,r.gl.UNSIGNED_BYTE,p);return [...p]};
   r.render(camera,[],settings);const opaque=pixel();r.setScene([far,pane]);r.render(camera,[],settings);const through=pixel();
   if(!(through[0]>120&&through[0]>through[2]*2))throw Error('Clear glass masks its red background '+through);
   if(JSON.stringify(through)===JSON.stringify(opaque))throw Error('Clear glass pass has no visible tint');
   r.setScene([far,pane,near]);r.render(camera,[],settings);const inFront=pixel();
   if(!(inFront[2]>120&&inFront[0]<30))throw Error('Glass is composited over nearer opaque objects '+inFront);
   r.setScene([pane,far]);r.render(camera,[],settings);if(JSON.stringify(pixel())!==JSON.stringify(through))throw Error('Clear glass ordering depends on scene insertion');
   if(r.gl.getError())throw Error('Clear glass WebGL error');canvas.remove();
   const crowd=[];for(let id=0;id<10;id++)BarScene.customer(crowd,{id,x:1.3+(id%5)*2.1,z:4.7+Math.floor(id/5)*2.2,time:0,moving:false,angle:0});
   renderer.render(BarScene.homeCamera,crowd,preferences,1020);renderer.gl.finish();const begin=performance.now();
   for(let i=0;i<12;i++){renderer.render(BarScene.homeCamera,crowd,preferences,1020);renderer.gl.finish()}
   const crowdMs=(performance.now()-begin)/12,contacts=renderer.people.filter((v,i)=>i%4===3&&v===1).length;
   const gl=renderer.gl;
   // The center lands on a dark bottle. Read useful surfaces over whole areas
   // instead: a foreground tabletop, the service counter and the walkable floor.
   // Bounds use the same top-left normalized coordinates as the review images.
   const zones={table:[.08,.80,.28,.92],worktop:[.40,.52,.60,.55],floor:[.58,.72,.81,.87]};
   const snapshot=time=>{
    renderer.render(BarScene.homeCamera,[],preferences,time);gl.finish();
    const center=new Uint8Array(4);gl.readPixels(renderer.canvas.width/2,renderer.canvas.height/2,1,1,gl.RGBA,gl.UNSIGNED_BYTE,center);
    const regions={};
    for(const [name,[left,top,right,bottom]]of Object.entries(zones)){
     const x=Math.floor(left*renderer.canvas.width),y=Math.floor((1-bottom)*renderer.canvas.height),w=Math.floor((right-left)*renderer.canvas.width),h=Math.floor((bottom-top)*renderer.canvas.height),data=new Uint8Array(w*h*4);
     gl.readPixels(x,y,w,h,gl.RGBA,gl.UNSIGNED_BYTE,data);
     let luminance=0,readable=0;const rgb=[0,0,0];
     for(let i=0;i<data.length;i+=4){const value=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];luminance+=value;if(value>=25)readable++;for(let channel=0;channel<3;channel++)rgb[channel]+=data[i+channel];}
     const pixels=w*h;regions[name]={pixels,rgb:rgb.map(value=>Number((value/pixels).toFixed(2))),luminance:Number((luminance/pixels).toFixed(2)),readableFraction:Number((readable/pixels).toFixed(4))};
    }
    return {time,center:[...center],regions};
   };
   const lighting={day:snapshot(1020),twilight:snapshot(1200),night:snapshot(1440)};
   for(const name of Object.keys(zones)){
    const day=lighting.day.regions[name],twilight=lighting.twilight.regions[name],night=lighting.night.regions[name];
    if(night.luminance<40||night.readableFraction<.90)throw Error('Night '+name+' is unreadable: '+JSON.stringify(night));
    if(!(day.luminance>twilight.luminance+2&&twilight.luminance>night.luminance+2&&day.luminance>night.luminance+5))throw Error('Day/twilight/night transition failed for '+name+': '+JSON.stringify({day,twilight,night}));
   }
   const error=gl.getError();if(error!==gl.NO_ERROR)throw Error('Rendering WebGL error '+error);
   return {opaque,through,inFront,crowdMs,vertices:renderer.mesh(crowd).length/12,contacts,dayPixel:lighting.day.center,nightPixel:lighting.night.center,lighting,gl:error};
  })()`);
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(path.join(artifacts,'graphics-review.json'),JSON.stringify(checks,null,2));console.log('GRAPHICS REVIEW OK',JSON.stringify(checks));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}
});
