'use strict';

const fs=require('node:fs');
const fsp=fs.promises;
const path=require('node:path');
const http=require('node:http');
const {randomBytes}=require('node:crypto');
const yaml=require('js-yaml');

// electron-updater expects HTTP. This private loopback adapter serves only the
// manifest and installers from a chosen local folder. Nothing is published online.
async function createLocalUpdateSource({app,dialog,getWindow,resourcesPath=process.resourcesPath}){
 const configPath=path.join(app.getPath('userData'),'update-source.json');
 let directory=null,server=null,feed=null,starting=null,closed=false,cancelStart=null;
 const allowed=new Map(),token=randomBytes(24).toString('hex');
 for(const config of [configPath,resourcesPath&&path.join(resourcesPath,'local-update-source.json')].filter(Boolean)){
  try{
   const saved=JSON.parse(await fsp.readFile(config,'utf8'));
   if(typeof saved.directory==='string'&&path.isAbsolute(saved.directory)){directory=saved.directory;break}
  }catch{}
 }

 async function readManifest(){
  const realDirectory=await fsp.realpath(directory);
  const manifestPath=await fsp.realpath(path.join(realDirectory,'latest.yml'));
  if(path.dirname(manifestPath)!==realDirectory)throw Error('Manifeste hors du dossier choisi.');
  if((await fsp.stat(manifestPath)).size>65536)throw Error('Manifeste trop volumineux.');
  const value=yaml.load(await fsp.readFile(manifestPath,'utf8'),{schema:yaml.JSON_SCHEMA});
  if(!value||!/^\d+\.\d+\.\d+$/.test(value.version)||!Array.isArray(value.files)||value.files.length!==1)throw Error('Manifeste de mise à jour invalide.');
  const file=value.files[0],name=`Le-Petit-Comptoir-Bar-${value.version}-Setup.exe`;
  if(file.url!==name||typeof file.sha512!=='string'||! /^[A-Za-z0-9+/]{86}==$/.test(file.sha512)||!Number.isSafeInteger(file.size)||file.size<=0)throw Error('Installateur de mise à jour invalide.');
  const fullPath=await fsp.realpath(path.join(realDirectory,name));
  if(path.dirname(fullPath)!==realDirectory||(await fsp.stat(fullPath)).size!==file.size)throw Error('Installateur incomplet ou hors du dossier choisi.');
  allowed.set(name,fullPath);
  // Return a restricted manifest: external URLs, package URLs and HTML notes
  // from the input cannot make the updater connect to any external server.
  return JSON.stringify({version:value.version,files:[{url:name,sha512:file.sha512,size:file.size}],path:name,sha512:file.sha512});
 }

 async function handle(req,res){
  try{
   if(!['GET','HEAD'].includes(req.method)||req.headers.host!==`127.0.0.1:${server.address().port}`){res.writeHead(403).end();return}
   const url=new URL(req.url,feed),prefix=`/${token}/`;
   if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return}
   const name=url.pathname.slice(prefix.length);
   if(name==='latest.yml'){
    const body=await readManifest();res.writeHead(200,{'Content-Type':'application/yaml','Cache-Control':'no-store','Content-Length':Buffer.byteLength(body)});res.end(req.method==='HEAD'?undefined:body);return;
   }
   const fullPath=allowed.get(name);
   if(!fullPath){res.writeHead(404).end();return}
   const stat=await fsp.stat(fullPath);
   res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store'});
   if(req.method==='HEAD'){res.end();return}
   const stream=fs.createReadStream(fullPath);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch{if(!res.headersSent)res.writeHead(503).end('Mise à jour locale indisponible.');else res.destroy()}
 }

 async function prepare(){
  if(!directory||closed)return null;
  if(feed)return feed;
  if(starting)return starting;
  starting=new Promise((resolve,reject)=>{
   cancelStart=()=>resolve(null);
   const listener=http.createServer((req,res)=>{void handle(req,res)});server=listener;
   listener.once('error',reject);
   listener.listen(0,'127.0.0.1',()=>{
    if(closed){listener.close();resolve(null);return}
    listener.removeListener('error',reject);listener.on('error',()=>{});listener.unref();
    feed=`http://127.0.0.1:${listener.address().port}/${token}/`;resolve(feed);
   });
  });
  try{return await starting}finally{starting=null;cancelStart=null}
 }

 async function choose(){
  const options={title:'Dossier des mises à jour du Petit Comptoir',properties:['openDirectory'],defaultPath:directory||app.getPath('documents')};
  const win=getWindow();const result=win?await dialog.showOpenDialog(win,options):await dialog.showOpenDialog(options);
  if(result.canceled||!result.filePaths[0])return null;
  const selected=await fsp.realpath(result.filePaths[0]);
  if(!(await fsp.stat(selected)).isDirectory())throw Error('Choisissez un dossier.');
  await fsp.mkdir(path.dirname(configPath),{recursive:true});
  const temp=configPath+'.tmp';await fsp.writeFile(temp,JSON.stringify({directory:selected},null,2));await fsp.rename(temp,configPath);
  directory=selected;allowed.clear();return prepare();
 }
 function close(){closed=true;cancelStart?.();server?.closeAllConnections();server?.close();server=null;feed=null}
 return {prepare,choose,getDirectory:()=>directory,close};
}

module.exports={createLocalUpdateSource};
