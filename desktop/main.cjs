const {app,BrowserWindow,Menu}=require('electron');
const path=require('node:path');
app.setName('Le Petit Comptoir - Bar');
let win;
function create(){
 win=new BrowserWindow({width:1440,height:960,minWidth:1100,minHeight:760,backgroundColor:'#192f2a',show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 Menu.setApplicationMenu(null);
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',e=>e.preventDefault());
 win.loadFile(path.join(__dirname,'../dist/index.html'));
 win.once('ready-to-show',()=>win.show());
 win.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='F11'){win.setFullScreen(!win.isFullScreen());event.preventDefault()}});
}
app.whenReady().then(create);
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)create()});
