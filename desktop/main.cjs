const {app,BrowserWindow,Menu,ipcMain,powerMonitor,dialog}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {setupUpdater}=require('./updater.cjs');
const {createLocalUpdateSource}=require('./local-update-source.cjs');
const {gameWindowOptions,setupGameWindow}=require('./game-window.cjs');
app.setName('Le Petit Comptoir - Bar');
app.setAppUserModelId('be.lepetitcomptoir.bar');
let win;
let updates;
let nativeGame;
const gameUrl=pathToFileURL(path.join(__dirname,'../dist/index.html')).href;
function create(){
 win=new BrowserWindow(gameWindowOptions(path.join(__dirname,'preload.cjs')));
 Menu.setApplicationMenu(null);
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',e=>e.preventDefault());
 win.loadFile(path.join(__dirname,'../dist/index.html'));
 win.once('ready-to-show',()=>win.show());
 nativeGame.attach(win);
}
// One process owns the save profile and updater. A second launch focuses the game.
if(!app.requestSingleInstanceLock())app.quit();
else{
 nativeGame=setupGameWindow({ipcMain,getWindow:()=>win,trustedUrl:gameUrl});
 app.on('second-instance',()=>{if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.focus()}});
 app.whenReady().then(async()=>{
  const localSource=await createLocalUpdateSource({app,dialog,getWindow:()=>win});
  create();
  updates=setupUpdater({app,ipcMain,powerMonitor,getWindow:()=>win,localSource,trustedUrl:gameUrl});
  updates.start();
  app.once('will-quit',()=>localSource.close());
 });
}
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)create()});
