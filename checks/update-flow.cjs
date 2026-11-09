'use strict';
// Electron integration: actual preload/IPC, local feed, updater download and
// installer checksum. The final installation call is intercepted (no OS changes).
const {app,BrowserWindow,ipcMain,powerMonitor}=require('electron');
const {EventEmitter}=require('node:events');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {NsisUpdater}=require('electron-updater');
const {ElectronHttpExecutor}=require('electron-updater/out/electronHttpExecutor');
const {createLocalUpdateSource}=require('../desktop/local-update-source.cjs');
const {setupUpdater}=require('../desktop/updater.cjs');

const profile=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'comptoir-flow-'));
app.setPath('userData',profile);
const timeout=setTimeout(()=>{console.error('Update integration timed out');app.exit(1)},45000);
app.whenReady().then(async()=>{
 let source;
 try{
  const root=path.resolve(__dirname,'..'),version=require('../package.json').version;
  const builds=fs.readdirSync(path.join(root,'release-final')).filter(n=>/^build-\d+$/.test(n)).sort();
  const resources=path.join(root,'release-final',builds.at(-1),'win-unpacked','resources');
  source=await createLocalUpdateSource({app,resourcesPath:resources,dialog:{showOpenDialog:async()=>({canceled:true,filePaths:[]})},getWindow:()=>win});
  let quitHandler,installOptions;
  const adapter={version:'0.3.0',name:'comptoir-update-test',isPackaged:true,appUpdateConfigPath:path.join(resources,'app-update.yml'),userDataPath:profile,baseCachePath:path.join(profile,'cache'),whenReady:()=>Promise.resolve(),onQuit:fn=>{quitHandler=fn},quit:()=>assert.fail('Must not quit during play'),relaunch:()=>assert.fail('Must not restart during play')};
  const updater=new NsisUpdater(undefined,adapter);updater.httpExecutor=new ElectronHttpExecutor();
  const external=[];
  updater.netSession.webRequest.onBeforeRequest((details,callback)=>{
   const local=new URL(details.url).hostname==='127.0.0.1';if(!local)external.push(details.url);callback({cancel:!local});
  });
  updater.doInstall=options=>{installOptions=options;return true};
  const win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{preload:path.join(root,'desktop/preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
  const lifecycle=Object.assign(new EventEmitter(),{isPackaged:true,getVersion:()=>adapter.version});
  const url=pathToFileURL(path.join(root,'dist/index.html')).href;
  const controller=setupUpdater({app:lifecycle,ipcMain,powerMonitor,getWindow:()=>win,localSource:source,autoUpdater:updater,trustedUrl:url});
  await win.loadURL(url);
  await win.webContents.executeJavaScript(`(()=>{GameMenu.newGame();paused=true;game.s=new Game().s;state=game.s;state.cash=173;state.stock.beer=321;save();ui();})()`);
  assert.ok(await win.webContents.executeJavaScript("!!window.desktopUpdates && document.getElementById('settingsModal').textContent.includes('Mises à jour du jeu')"),'Preload and updater UI loaded');
  const downloaded=new Promise((resolve,reject)=>{updater.once('update-downloaded',resolve);updater.once('error',reject)});
  await win.webContents.executeJavaScript('window.desktopUpdates.check()');
  const info=await downloaded;
  assert.equal(info.version,version);assert.equal(controller.getStatus().state,'ready');
  assert.equal(installOptions,undefined,'Downloading must not install while playing');
  assert.deepEqual(external,[],'Update must not contact online servers');
  const manifest=require('js-yaml').load(fs.readFileSync(path.join(root,'release-final/latest.yml'),'utf8'));
  assert.equal(createHash('sha512').update(fs.readFileSync(info.downloadedFile)).digest('base64'),manifest.files[0].sha512);
  await win.loadURL(url);
  const restored=await win.webContents.executeJavaScript('({cash:game.s.cash,beer:game.s.stock.beer,status:document.getElementById("settingsModal").textContent})');
  assert.equal(restored.cash,173);assert.equal(restored.beer,321);
  assert.ok(restored.status.includes('Mises à jour du jeu'));
  assert.equal(typeof quitHandler,'function');quitHandler(0);
  assert.equal(installOptions.isSilent,true);assert.equal(installOptions.isForceRunAfter,false);
  // Same or newer installed versions must not be downgraded by the folder.
  for(const current of [version,'99.0.0']){
   const instance=new NsisUpdater(undefined,{...adapter,version:current});instance.httpExecutor=new ElectronHttpExecutor();instance.autoDownload=false;instance.allowDowngrade=false;
   instance.setFeedURL({provider:'generic',url:await source.prepare()});
   const result=await instance.checkForUpdates();assert.equal(result.isUpdateAvailable,false);
  }
  console.log('LOCAL UPDATE FLOW OK',JSON.stringify({version,checksum:'verified',savedCash:restored.cash,externalRequests:external.length,install:'scheduled silently on normal exit'}));
  source.close();clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){source?.close();clearTimeout(timeout);console.error(error);app.exit(1)}
});
