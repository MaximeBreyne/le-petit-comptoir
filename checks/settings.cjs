const {app,BrowserWindow}=require('electron'),path=require('node:path'),fs=require('node:fs');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'comptoir-settings-')));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
app.whenReady().then(async()=>{let win;const errors=[];try{
 win=new BrowserWindow({width:1440,height:960,show:false,webPreferences:{backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error'||e.level===3)errors.push(e.message)});
 await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));await new Promise(r=>setTimeout(r,500));
 const result=await win.webContents.executeJavaScript(`(async()=>{
 const check=(v,m)=>{if(!v)throw Error(m)};
 const key=(code,value,type='keydown')=>window.dispatchEvent(new KeyboardEvent(type,{code,key:value,bubbles:true,cancelable:true}));
 const set=(id,value)=>{const el=$(id);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}))};
 // Keep native hidden-window capture denial from cancelling the held audio
 // control under test. Dedicated interaction checks cover capture failures.
 let locked=null;Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>locked});
 canvas.requestPointerLock=()=>Promise.resolve().then(()=>{locked=canvas;document.dispatchEvent(new Event('pointerlockchange'))});
 document.exitPointerLock=()=>queueMicrotask(()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'))});
 GameMenu.newGame();if(GameMenu.getMode()==='confirm')document.querySelector('[data-menu-action="confirm"]').click();preferences=defaultPreferences();settingsUI();render();
 check(renderer&&renderer.gl.isEnabled(renderer.gl.DEPTH_TEST),'Depth test enabled');check(Object.keys(preferences.bindings).length===9&&preferences.bindings.sprint.code==='ShiftLeft','Sprint is included in configurable controls');
 // Intersecting, differently-sized objects must occlude identically regardless of insertion order.
 const probe=document.createElement('canvas');probe.style.cssText='width:200px;height:200px;position:fixed;left:-500px';document.body.append(probe);
 // Isolate depth from cached static shadows, whose lighting changes when a mesh becomes dynamic.
 const near={x:0,y:0,z:2,w:1,h:1,d:.3,c:'#ff0000',castShadow:false},far={x:0,y:0,z:4,w:4,h:4,d:.3,c:'#0000ff',castShadow:false};
 const testRenderer=new BarRenderer(probe,[near,far]),p=defaultPreferences(),cam={x:0,y:0,z:0,a:0,pitch:0};testRenderer.render(cam,[],p);const gl=testRenderer.gl;
 const pixel=()=>{const c=new Uint8Array(4);gl.readPixels(115,100,1,1,gl.RGBA,gl.UNSIGNED_BYTE,c);return Array.from(c)};
 const first=pixel();check(first[0]>120&&first[2]<30,'Near red object hides far blue object');testRenderer.setScene([far,near]);testRenderer.render(cam,[],p);check(JSON.stringify(first)===JSON.stringify(pixel()),'Draw order does not change occlusion');
 testRenderer.setScene([near]);testRenderer.render(cam,[far],p);check(JSON.stringify(first)===JSON.stringify(pixel()),'Dynamic objects obey static depth');
 testRenderer.setScene([far]);testRenderer.render(cam,[near],p);check(JSON.stringify(first)===JSON.stringify(pixel()),'Near dynamic objects hide scenery');
 // Camera intersects a box; the GPU must clip it without invalid pixels or GL errors.
 testRenderer.render({...cam,z:1.88},[],p);check(gl.getError()===gl.NO_ERROR,'Near-plane clipping');probe.remove();
 game.open();ui();$('settings').click();check($('settingsModal').open,'Settings open');const cash=state.cash,time=state.time;await new Promise(r=>setTimeout(r,150));frame(performance.now()+50);check(state.time===time,'Game clock paused in settings');
 document.querySelector('[data-bind="forward"]').click();key('KeyS','s');check(capturing==='forward','Duplicate rejected');check($('settingsStatus').textContent.includes('déjà'),'Duplicate explained');key('KeyI','i');check(preferences.bindings.forward.code==='KeyI','Remap accepted');
 document.querySelector('[data-bind="pour"]').click();key('KeyV','v');check(preferences.bindings.pour.code==='KeyV','Pour remapped');
 document.querySelector('[data-bind="left"]').click();key('Escape','Escape');check(!capturing&&$('settingsModal').open,'Escape cancels capture');
 set('quality','low');const low=canvas.width;set('quality','high');check(canvas.width>low,'Quality changes resolution');set('fps',30);set('fov',95);set('brightness',120);set('sensitivity',2);set('invertY',true);
 set('volume',37);set('effects',42);set('ambience',15);set('muted',true);audio.unlock();await new Promise(r=>setTimeout(r,200));check(audio.context&&audio.master.gain.value<.01,'Mute reaches master audio gain');
 set('muted',false);await new Promise(r=>setTimeout(r,200));check(audio.master.gain.value>.3&&audio.fx.gain.value>.35,'Volumes control real audio nodes');check(audio.room.gain.value<.01&&audio.flow.gain.value<.01,'Menu silences ambience and pouring');
 const loaded=loadPreferences();check(loaded.bindings.forward.code==='KeyI'&&loaded.volume===37&&loaded.quality==='high'&&loaded.fps===30,'Settings survive save and reload');
 check(state.cash===cash&&state.time===time,'Settings preserve game state');
 $('settingsClose').click();await new Promise(r=>setTimeout(r,60));
 check(!$('settingsModal').open&&GameMenu.getMode()==='play'&&!paused,'Returning from settings resumes the game');
 check(BarInput.isLooking()&&locked===canvas,'Camera remains captured after the settings dialog and unlock events settle');
 camera={x:6,y:1.65,z:7,a:Math.PI,pitch:0};const z=camera.z;key('KeyW','w');movement(.1);key('KeyW','w','keyup');check(camera.z===z,'Old key inactive');key('KeyI','i');movement(.1);key('KeyI','i','keyup');check(camera.z<z,'Remapped key moves player');
 game.open();camera={...BarScene.playCamera};game.start('beer',camera);game.takeVessel({x:7,z:1.35});camera={...BarScene.playCamera,x:4.15,z:2.15};game.placeHeld(camera);key('KeyV','v');check(state.prep.pouring,'Remapped pour key starts flow');frame(performance.now());await new Promise(r=>setTimeout(r,200));check(audio.room.gain.value>.1&&audio.flow.gain.value>.25,'Pouring and ambience gains active in game: '+JSON.stringify({active:audio.active,pouring:audio.pouring,room:audio.room.gain.value,flow:audio.flow.gain.value,paused,menu:menusOpen(),open:state.open}));key('KeyV','v','keyup');check(!state.prep.pouring,'Remapped key releases flow');
 key('KeyP','p');check(paused,'Pause key');key('KeyP','p');check(!paused,'Resume key');
 $('settings').click();$('settingsReset').click();check(preferences.bindings.forward.code==='KeyW'&&preferences.quality==='medium','Restore defaults');check(state.stock.beer===950,'Reset settings preserves game');
 render();return {occlusion:first,qualityResolution:[low,canvas.width],bindings:Object.keys(preferences.bindings).length,settingsSaved:!!localStorage.getItem(PREF_KEY),gl:renderer.gl.getError()};
 })()`);
 await new Promise(r=>setTimeout(r,250));
 fs.mkdirSync('checks/artifacts',{recursive:true});fs.writeFileSync('checks/artifacts/settings-preview.png',(await win.webContents.capturePage()).toPNG());
 if(errors.length)throw Error(errors.join('\n'));console.log('SETTINGS AND DEPTH OK',JSON.stringify(result));app.quit();
 }catch(e){console.error(e);app.exit(1)}});
