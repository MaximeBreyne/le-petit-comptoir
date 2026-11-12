'use strict';
// Exercise actual Web Audio nodes in a disposable hidden profile. No external music.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-club-audio-')));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
let win;const timeout=setTimeout(()=>{console.error('Club audio timed out');app.exit(1)},45000);
app.whenReady().then(async()=>{
 try{
  const errors=[];win=new BrowserWindow({show:false,width:1100,height:800,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  win.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)errors.push(event.message)});
  await win.loadFile(path.resolve(process.env.BAR_QA_TARGET||'dist/index.html'));
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)},wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
   window.requestAnimationFrame=()=>0;await wait(40);
   let hidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});
   const music=new BarAudio();preferences=defaultPreferences();preferences.volume=10;music.unlock();await music.context.resume();await wait(40);
   music.setState(true,false);let oscillators=0,buffers=0;
   const oscillator=music.context.createOscillator.bind(music.context),buffer=music.context.createBufferSource.bind(music.context);
   music.context.createOscillator=()=>{oscillators++;return oscillator()};music.context.createBufferSource=()=>{buffers++;return buffer()};
   const meter=music.context.createAnalyser();meter.fftSize=512;music.club.connect(meter);const data=new Float32Array(meter.fftSize);
   const peak=async duration=>{let result=0;for(let elapsed=0;elapsed<duration;elapsed+=25){await wait(25);meter.getFloatTimeDomainData(data);const rms=Math.sqrt(data.reduce((sum,value)=>sum+value*value,0)/data.length);result=Math.max(result,rms);}return result};
   music.setClubState(true,1);const original=music.clubVoices;check(original&&music.clubTimer!==null,'Active club creates voices and one scheduler');
   for(let i=0;i<100;i++)music.setClubState(true,1);
   const loud=await peak(950);check(loud>.003,'Real club output has audible energy: '+loud);
   check(oscillators===2&&buffers===1&&music.clubVoices===original,'Voices are reused across frames and scheduled beats');
   music.setClubState(true,.06);await wait(400);const soft=await peak(950);check(soft<loud*.2&&soft>0,'Neighbouring rooms attenuate the actual music: '+JSON.stringify({loud,soft}));
   check(music.clubVoices===original,'Changing location reuses the same voices');
   let ended=0;for(const voice of Object.values(original))voice.source.onended=()=>ended++;
   music.setState(false,false);await wait(60);
   check(!music.clubVoices&&music.clubTimer===null&&music.club.gain.value===0&&ended===3,'Pause stops every music source and timer: '+JSON.stringify({voices:!!music.clubVoices,timer:music.clubTimer,gain:music.club.gain.value,ended,state:music.context.state}));
   music.setState(true,false);await wait(50);check(music.clubVoices,'Resuming starts a fresh phrase');
   preferences.muted=true;music.update();await wait(150);check(!music.clubVoices&&music.clubTimer===null&&music.master.gain.value<.001,'Mute stops music generation and silences master output');
   preferences.muted=false;preferences.ambience=0;music.update();await wait(260);check(!music.clubVoices&&music.room.gain.value<.001,'Zero ambience keeps music stopped');
   preferences.ambience=40;music.update();await wait(200);check(music.clubVoices&&Math.abs(music.room.gain.value-.4)<.01,'Music uses the ambience bus');
   preferences.effects=0;music.update();check(music.clubVoices,'Effects volume does not disable background music');
   preferences.volume=0;music.update();check(!music.clubVoices&&music.clubTimer===null,'Zero master volume stops the scheduler');
   preferences.volume=10;music.update();await wait(30);window.dispatchEvent(new Event('blur'));check(!music.clubVoices&&music.clubTimer===null,'Losing focus releases music sources');
   window.dispatchEvent(new Event('focus'));await wait(30);check(music.clubVoices,'Focus restores eligible music');
   hidden=true;document.dispatchEvent(new Event('visibilitychange'));check(!music.clubVoices&&music.clubTimer===null,'An inactive document stops music');
   hidden=false;document.dispatchEvent(new Event('visibilitychange'));await wait(30);check(music.clubVoices,'Returning to a visible eligible game restarts music');
   await music.context.suspend();await wait(30);check(!music.clubVoices&&music.clubTimer===null,'A suspended audio context has no polling timer');
   await music.context.resume();await wait(40);check(music.clubVoices&&music.clubNext<music.context.currentTime+.4,'Resume cannot schedule a burst of missed beats');
   preferences=defaultPreferences();music.update();await wait(180);check(Math.abs(music.room.gain.value-.25)<.01&&Math.abs(music.master.gain.value-.7)<.01,'Reset audio preferences applies to actual buses');
   music.setClubState(false,0);check(!music.clubVoices&&music.clubTimer===null&&music.club.gain.value===0,'Leaving the session releases all club resources');
   await music.context.close();
   return {loud,soft,initialVoices:3,noPerFrameAllocation:true,pauseStopsAll:true,mute:true,ambienceBus:true,focusAndVisibility:true,suspendAndResume:true,reset:true,contextClosed:true};
  })()`,true);
  if(errors.length)throw Error(errors.join('\n'));
  console.log('CLUB AUDIO OK',JSON.stringify(result));clearTimeout(timeout);win.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);win?.destroy();app.exit(1)}
});
