const PREF_KEY='comptoir-bar-settings-v1';
const isReservedGameKey=code=>/^(Escape|F11)$/.test(code);
const isBindableGameKey=code=>/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Tab|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Enter|Backspace|Home|End|PageUp|PageDown)$/.test(code)&&!isReservedGameKey(code);
const defaultGamepadPreferences=()=>({enabled:true,sensitivity:1,deadzone:.18,invertY:false,bindings:{interact:0,tablet:3,manage:2,pour:7,sprint:10,pause:9}});
const defaultPreferences=()=>({quality:'medium',fps:60,fov:75,brightness:100,sensitivity:1,invertY:false,volume:70,effects:80,ambience:25,muted:false,gamepad:defaultGamepadPreferences(),bindings:{forward:{code:'KeyW',label:'Z / W'},back:{code:'KeyS',label:'S'},left:{code:'KeyA',label:'Q / A'},right:{code:'KeyD',label:'D'},turnLeft:{code:'ArrowLeft',label:'←'},turnRight:{code:'ArrowRight',label:'→'},sprint:{code:'ShiftLeft',label:'Maj'},pause:{code:'KeyP',label:'P'},pour:{code:'Space',label:'Espace'},interact:{code:'KeyE',label:'E'},tablet:{code:'Tab',label:'Tab'},manage:{code:'KeyR',label:'R'}}});
function loadPreferences(){
 const result=defaultPreferences(),defaults=result.bindings;let saved;
 try{saved=JSON.parse(localStorage.getItem(PREF_KEY))}catch{}
 if(saved){for(const k of ['quality','fps','fov','brightness','sensitivity','invertY','volume','effects','ambience','muted'])if(typeof saved[k]===typeof result[k])result[k]=saved[k]}
 const used=new Set(),bindings={};
 for(const action of Object.keys(defaults)){
  const value=saved?.bindings?.[action];
  if(value&&isBindableGameKey(value.code)&&!used.has(value.code)){
   bindings[action]={code:value.code,label:String(value.label||value.code).slice(0,20)};used.add(value.code);
  }
 }
 for(const action of Object.keys(defaults))if(!bindings[action]){
  const code=[defaults[action].code,'ShiftLeft','ShiftRight','ControlLeft','ControlRight',...'RTFGHJKLUIOBCNVXYZ'.split('').map(key=>'Key'+key)].find(code=>!used.has(code)&&!isReservedGameKey(code));
  bindings[action]={code,label:code===defaults[action].code?defaults[action].label:code.startsWith('Shift')?'Maj':code.startsWith('Control')?'Ctrl':code.replace('Key','')};used.add(code);
 }
 result.bindings=bindings;
 const pad=defaultGamepadPreferences(),stored=saved?.gamepad,assigned=new Set();
 for(const key of ['enabled','invertY'])if(typeof stored?.[key]==='boolean')pad[key]=stored[key];
 for(const [key,min,max]of [['sensitivity',.2,3],['deadzone',.05,.4]])if(Number.isFinite(stored?.[key]))pad[key]=Math.min(max,Math.max(min,stored[key]));
 const padBindings={};for(const action of Object.keys(pad.bindings)){const index=stored?.bindings?.[action];if(Number.isInteger(index)&&index>=0&&index<=11&&!assigned.has(index)){padBindings[action]=index;assigned.add(index)}}
 for(const action of Object.keys(pad.bindings))if(padBindings[action]===undefined){const index=[pad.bindings[action],...Array.from({length:12},(_,i)=>i)].find(i=>!assigned.has(i));padBindings[action]=index;assigned.add(index)}
 pad.bindings=padBindings;result.gamepad=pad;
 if(!['low','medium','high'].includes(result.quality))result.quality='medium';if(![30,60,120].includes(result.fps))result.fps=60;
 for(const [k,min,max]of [['fov',60,100],['brightness',65,140],['sensitivity',.2,3],['volume',0,100],['effects',0,100],['ambience',0,100]])result[k]=Number.isFinite(result[k])?Math.min(max,Math.max(min,result[k])):defaultPreferences()[k];
 return result;
}
let preferences=loadPreferences();
function savePreferences(){try{localStorage.setItem(PREF_KEY,JSON.stringify(preferences));return true}catch{return false}}
class BarAudio{
 constructor(){
  this.context=null;this.active=false;this.pouring=false;this.clubRequested=false;this.clubLevel=0;this.clubVoices=null;this.clubTimer=null;this.clubBlurred=false;
  globalThis.addEventListener?.('blur',()=>{this.clubBlurred=true;this.stopClub()});
  globalThis.addEventListener?.('focus',()=>{this.clubBlurred=false;this.updateClub()});
  globalThis.document?.addEventListener?.('visibilitychange',()=>this.updateClub());
 }
 unlock(){try{if(!this.context){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const c=this.context=new A();this.master=c.createGain();this.fx=c.createGain();this.room=c.createGain();this.flow=c.createGain();this.master.connect(c.destination);this.fx.connect(this.master);this.room.connect(this.master);this.flow.connect(this.fx);
 const buffer=this.noiseBuffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.3;
 const noise=c.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=900;noise.connect(filter);filter.connect(this.flow);noise.start();
 const hum=c.createOscillator();hum.type='sine';hum.frequency.value=110;const tone=c.createGain();tone.gain.value=.025;hum.connect(tone);tone.connect(this.room);hum.start();
 const air=c.createBufferSource();air.buffer=buffer;air.loop=true;const roomFilter=c.createBiquadFilter();roomFilter.type='lowpass';roomFilter.frequency.value=240;air.connect(roomFilter);roomFilter.connect(this.room);air.start();
 this.club=c.createGain();this.club.gain.value=0;this.club.connect(this.room);c.addEventListener('statechange',()=>this.updateClub());this.update();}
 this.context.resume().then(()=>this.updateClub()).catch(()=>{});}catch(e){console.warn('Audio indisponible',e.message)}}
 update(){if(!this.context)return;const t=this.context.currentTime;this.master.gain.setTargetAtTime(preferences.muted?0:preferences.volume/100,t,.025);this.fx.gain.setTargetAtTime(preferences.effects/100,t,.025);this.room.gain.setTargetAtTime(this.active?preferences.ambience/100:0,t,.04);this.flow.gain.setTargetAtTime(this.pouring && this.active ? .32 : 0,t,.02);this.updateClub()}
 setState(active,pouring){if(this.active===active&&this.pouring===pouring)return;this.active=active;this.pouring=pouring;this.update()}
 // The frame supplies eligibility (open club + recruited DJ) and room attenuation.
 // Music shares the ambience bus; no voice or timer is created on a normal frame.
 setClubState(active,level=1){
  active=!!active;level=Number.isFinite(level)?Math.max(0,Math.min(1,level)):0;
  if(this.clubRequested===active&&this.clubLevel===level)return;
  this.clubRequested=active;this.clubLevel=level;this.updateClub();
 }
 canPlayClub(){return !!this.club&&this.context.state==='running'&&this.active&&this.clubRequested&&this.clubLevel>0&&!preferences.muted&&preferences.volume>0&&preferences.ambience>0&&!this.clubBlurred&&globalThis.document?.hidden!==true}
 updateClub(){
  if(!this.canPlayClub()){this.stopClub();return}
  this.club.gain.setTargetAtTime(this.clubLevel*.65,this.context.currentTime,.08);
  if(!this.clubVoices)this.startClub();
 }
 startClub(){
  const c=this.context,voice=type=>{const source=c.createOscillator(),gain=c.createGain();source.type=type;gain.gain.value=0;source.connect(gain);gain.connect(this.club);source.start();return {source,gain}};
  const kick=voice('sine'),bass=voice('triangle'),hat={source:c.createBufferSource(),gain:c.createGain(),filter:c.createBiquadFilter()};
  hat.source.buffer=this.noiseBuffer;hat.source.loop=true;hat.filter.type='highpass';hat.filter.frequency.value=6500;hat.gain.gain.value=0;hat.source.connect(hat.filter);hat.filter.connect(hat.gain);hat.gain.connect(this.club);hat.source.start();
  this.clubVoices={kick,bass,hat};this.clubStep=0;this.clubNext=c.currentTime+.025;this.scheduleClub();
 }
 stopClub(){
  if(this.clubTimer!==null){clearTimeout(this.clubTimer);this.clubTimer=null}
  if(this.club){this.club.gain.cancelScheduledValues(0);this.club.gain.value=0}
  if(this.clubVoices)for(const voice of Object.values(this.clubVoices)){try{voice.source.stop()}catch{}voice.source.disconnect();voice.gain.disconnect();voice.filter?.disconnect()}
  this.clubVoices=null;this.clubStep=0;this.clubNext=0;
 }
 scheduleClub(){
  this.clubTimer=null;if(!this.canPlayClub()){this.stopClub();return}
  const now=this.context.currentTime;
  // Never replay missed beats after a suspended context or a stalled frame.
  if(this.clubNext<now-.15){this.clubNext=now+.025;this.clubStep=0}
  let scheduled=0;while(this.clubNext<now+.16&&scheduled++<4){this.clubBeat(this.clubNext,this.clubStep);this.clubStep=(this.clubStep+1)%16;this.clubNext+=60/112/4;}
  this.clubTimer=setTimeout(()=>this.scheduleClub(),50);
 }
 clubBeat(time,step){
  const envelope=(voice,peak,duration)=>{const gain=voice.gain.gain;gain.cancelScheduledValues(time);gain.setValueAtTime(0,time);gain.linearRampToValueAtTime(peak,time+.004);gain.exponentialRampToValueAtTime(.0001,time+duration);gain.setValueAtTime(0,time+duration+.012)};
  const {kick,bass,hat}=this.clubVoices;
  if(step%4===0){kick.source.frequency.cancelScheduledValues(time);kick.source.frequency.setValueAtTime(125,time);kick.source.frequency.exponentialRampToValueAtTime(44,time+.13);envelope(kick,.30,.15)}
  if(step%4===2){bass.source.frequency.setValueAtTime([55,65.406,73.416,49][Math.floor(step/4)],time);envelope(bass,.12,.22)}
  if(step%2===0)envelope(hat,step%4===2?.18:.11,.035);
 }
 chime(kind='click'){if(!this.context)return;const c=this.context,t=c.currentTime,notes=kind==='sale'?[660,880,1100]:kind==='arrival'?[440,660]:[520];notes.forEach((hz,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,t+i*.075);g.gain.linearRampToValueAtTime(.11,t+i*.075+.01);g.gain.exponentialRampToValueAtTime(.001,t+i*.075+.16);o.connect(g);g.connect(this.fx);o.start(t+i*.075);o.stop(t+i*.075+.18)})}
}
const audio=new BarAudio();
