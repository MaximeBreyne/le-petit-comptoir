'use strict';
const {contextBridge,ipcRenderer}=require('electron');

contextBridge.exposeInMainWorld('desktopGame',Object.freeze({
 quit:()=>ipcRenderer.invoke('game:quit'),
 toggleFullscreen:()=>ipcRenderer.invoke('game:fullscreen:toggle'),
 getFullscreen:()=>ipcRenderer.invoke('game:fullscreen:get'),
 onEscape:callback=>{
  if(typeof callback!=='function')return ()=>{};
  const listener=()=>callback();
  ipcRenderer.on('game:escape',listener);
  return ()=>ipcRenderer.removeListener('game:escape',listener);
 }
}));

// Expose only fixed update operations; no arbitrary channels, paths or URLs.
contextBridge.exposeInMainWorld('desktopUpdates',Object.freeze({
 getStatus:()=>ipcRenderer.invoke('update:status'),
 check:()=>ipcRenderer.invoke('update:check'),
 chooseSource:()=>ipcRenderer.invoke('update:choose-source'),
 onStatus:callback=>{
  if(typeof callback!=='function')return ()=>{};
  const listener=(_event,status)=>callback(status);
  ipcRenderer.on('update:status',listener);
  return ()=>ipcRenderer.removeListener('update:status',listener);
 }
}));
