const PREF_KEY='comptoir-bar-settings-v1';
const isReservedGameKey=code=>/^(Escape|F11|Tab|KeyE)$/.test(code);
const defaultPreferences=()=>({quality:'medium',fps:60,fov:75,brightness:100,sensitivity:1,invertY:false,volume:70,effects:80,ambience:25,muted:false,bindings:{forward:{code:'KeyW',label:'Z / W'},back:{code:'KeyS',label:'S'},left:{code:'KeyA',label:'Q / A'},right:{code:'KeyD',label:'D'},turnLeft:{code:'ArrowLeft',label:'←'},turnRight:{code:'ArrowRight',label:'→'},sprint:{code:'ShiftLeft',label:'Maj'},pause:{code:'KeyP',label:'P'},pour:{code:'Space',label:'Espace'}}});
function loadPreferences(){
 const result=defaultPreferences(),defaults=result.bindings;let saved;
 try{saved=JSON.parse(localStorage.getItem(PREF_KEY))}catch{}
 if(saved){for(const k of ['quality','fps','fov','brightness','sensitivity','invertY','volume','effects','ambience','muted'])if(typeof saved[k]===typeof result[k])result[k]=saved[k]}
 const used=new Set(),bindings={};
 for(const action of Object.keys(defaults)){
  const value=saved?.bindings?.[action];
  if(value&&/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Enter|Backspace|Home|End|PageUp|PageDown)$/.test(value.code)&&!isReservedGameKey(value.code)&&!used.has(value.code)){
   bindings[action]={code:value.code,label:String(value.label||value.code).slice(0,20)};used.add(value.code);
  }
 }
 for(const action of Object.keys(defaults))if(!bindings[action]){
  const code=[defaults[action].code,'ShiftLeft','ShiftRight','ControlLeft','ControlRight','KeyR','KeyT','KeyF','KeyG','KeyH','KeyJ'].find(code=>!used.has(code)&&!isReservedGameKey(code));
  bindings[action]={code,label:code===defaults[action].code?defaults[action].label:code.startsWith('Shift')?'Maj':code.startsWith('Control')?'Ctrl':code.replace('Key','')};used.add(code);
 }
 result.bindings=bindings;
 if(!['low','medium','high'].includes(result.quality))result.quality='medium';if(![30,60,120].includes(result.fps))result.fps=60;
 for(const [k,min,max]of [['fov',60,100],['brightness',65,140],['sensitivity',.2,3],['volume',0,100],['effects',0,100],['ambience',0,100]])result[k]=Number.isFinite(result[k])?Math.min(max,Math.max(min,result[k])):defaultPreferences()[k];
 return result;
}
let preferences=loadPreferences();
function savePreferences(){try{localStorage.setItem(PREF_KEY,JSON.stringify(preferences));return true}catch{return false}}
class BarAudio{
 constructor(){this.context=null;this.active=false;this.pouring=false}
 unlock(){try{if(!this.context){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const c=this.context=new A();this.master=c.createGain();this.fx=c.createGain();this.room=c.createGain();this.flow=c.createGain();this.master.connect(c.destination);this.fx.connect(this.master);this.room.connect(this.master);this.flow.connect(this.fx);
 const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.3;
 const noise=c.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=900;noise.connect(filter);filter.connect(this.flow);noise.start();
 const hum=c.createOscillator();hum.type='sine';hum.frequency.value=110;const tone=c.createGain();tone.gain.value=.025;hum.connect(tone);tone.connect(this.room);hum.start();
 const air=c.createBufferSource();air.buffer=buffer;air.loop=true;const roomFilter=c.createBiquadFilter();roomFilter.type='lowpass';roomFilter.frequency.value=240;air.connect(roomFilter);roomFilter.connect(this.room);air.start();this.update();}
 this.context.resume().catch(()=>{});}catch(e){console.warn('Audio indisponible',e.message)}}
 update(){if(!this.context)return;const t=this.context.currentTime;this.master.gain.setTargetAtTime(preferences.muted?0:preferences.volume/100,t,.025);this.fx.gain.setTargetAtTime(preferences.effects/100,t,.025);this.room.gain.setTargetAtTime(this.active?preferences.ambience/100:0,t,.04);this.flow.gain.setTargetAtTime(this.pouring && this.active ? .32 : 0,t,.02)}
 setState(active,pouring){if(this.active===active&&this.pouring===pouring)return;this.active=active;this.pouring=pouring;this.update()}
 chime(kind='click'){if(!this.context)return;const c=this.context,t=c.currentTime,notes=kind==='sale'?[660,880,1100]:kind==='arrival'?[440,660]:[520];notes.forEach((hz,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,t+i*.075);g.gain.linearRampToValueAtTime(.11,t+i*.075+.01);g.gain.exponentialRampToValueAtTime(.001,t+i*.075+.16);o.connect(g);g.connect(this.fx);o.start(t+i*.075);o.stop(t+i*.075+.18)})}
}
const audio=new BarAudio();
