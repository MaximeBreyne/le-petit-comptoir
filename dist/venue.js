'use strict';
// The entrance sign is part of the room; it shares service state with the tablet.
const BarVenue=(()=>{
 const sign={x:6.78,y:1.91,z:9.76,w:1.02,h:.48};
 const faces={
  closed:{label:'FERMÉ\nE : OUVRIR',c:'#402f29'},
  open:{label:'OUVERT\nE : FERMER',c:'#203f37'},
  closing:{label:'DERNIÈRE TOURNÉE\nFIN DU SERVICE',c:'#403923'},
 };
 const labelTemplates=Object.values(faces).map(face=>({...sign,d:.012,mat:0,...face,labelColor:'#f4e8c9',labelPixels:480,labelFace:'front',castShadow:false}));
 function serviceState(s){return s.closing?'closing':s.open?'open':'closed'}
 function dayProgress(s){
  const time=Math.max(1020,Math.min(1440,Number.isFinite(s.time)?s.time:1020));
  const remaining=Math.ceil(1440-time);
  return {elapsed:time-1020,remaining,text:`${Math.floor(remaining/60)} h ${String(remaining%60).padStart(2,'0')} avant minuit`};
 }
 function nearSign(position){return !!position&&position.z<sign.z&&Math.hypot(position.x-sign.x,position.z-sign.z)<1.5}
 function aimedAtSign(camera){
  if(!nearSign(camera))return false;
  const cp=Math.cos(camera.pitch||0),dz=Math.cos(camera.a)*cp;
  if(dz<=0)return false;
  const t=(sign.z-.006-camera.z)/dz;
  const x=camera.x+Math.sin(camera.a)*cp*t,y=camera.y+Math.sin(camera.pitch||0)*t;
  return Math.abs(x-sign.x)<=sign.w/2&&Math.abs(y-sign.y)<=sign.h/2;
 }
 function addFrame(items){
  const g=BarScene.geometry(items);
  // Suspended inside the glazed door, leaving the handles and path clear.
  for(const offset of [-.35,.35])g.cylinder(sign.x+offset,2.36,sign.z+.028,.008,.44,.008,'#a98d54',5,{castShadow:false});
  g.box(sign.x,sign.y,sign.z+.022,sign.w+.055,sign.h+.055,.045,'#ad945e',5,{castShadow:false});
 }
 function render(items,s){
  const template=labelTemplates[['closed','open','closing'].indexOf(serviceState(s))];
  items.push({...template,solid:false});
 }
 return {sign,labelTemplates,serviceState,dayProgress,nearSign,aimedAtSign,addFrame,render};
})();
