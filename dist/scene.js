/* Original shop geometry. Dimensions are in metres; static meshes are uploaded once. */
const BarScene=(()=>{
 const M={paint:0,wood:1,tile:2,plaster:3,brick:4,metal:5,glass:6,light:7,fabric:8,skin:9,floor:10,clearGlass:11,stone:12,leather:13};
 const playCamera={x:6,y:1.68,z:1.55,a:0,pitch:-.06};
 const homeCamera={x:10.5,y:1.72,z:8.5,a:3.91,pitch:-.045};
 const stockroomCamera={x:.95,y:1.68,z:-.72,a:2.70,pitch:-.09};
 const terminalScreen='#d8eee7',terminalInk='#193c35';
 const terminalLabelTemplates=[
  {w:.118,h:.001,d:.011,c:terminalScreen,label:'LE PETIT COMPTOIR'},
  ...['PRÊT','LECTURE CARTE','ACCEPTÉ'].map(label=>({w:.111,h:.001,d:.014,c:terminalScreen,label})),
  {w:.019,h:.001,d:.010,c:terminalScreen,label:'EUR'},
 ].map(label=>({...label,labelFace:'top',labelColor:terminalInk,labelPixels:256,castShadow:false}));
 const tableLocations=globalThis.BarEngine?.tables||[{id:1,x:1.65,z:6.4},{id:2,x:1.65,z:8.6},{id:3,x:10.22,z:6.5},{id:4,x:10.22,z:8.65}];
 function tableSeat(id){
  const table=tableLocations.find(table=>table.id===Number(id));if(!table)return null;
  const inside=table.x<6?1:-1;
  return {x:table.x+inside*.78,y:table.y||0,z:table.z,angle:inside*Math.PI/2};
 }
 const counterLocations=globalThis.BarEngine?.counterSeats||[4.6,6,7.4,3.2,8.8,10.2].map((x,slot)=>({slot,x,z:4.3}));
 function counterSeat(slot){
  const seat=counterLocations.find(seat=>seat.slot===slot);
  return seat?{x:seat.x,z:seat.z,angle:0,seatHeight:.84}:null;
 }
 const storageBins=[
  {key:'beer',label:'BIÈRE',pack:500,x:1,y:.37,kind:'keg',color:'#8d9993'},
  {key:'wine',label:'VIN',pack:75,x:2.25,y:.37,kind:'bottle',color:'#553b3c'},
  {key:'rum',label:'RHUM',pack:70,x:3.5,y:.37,kind:'bottle',color:'#716340'},
  {key:'coffee',label:'CAFÉ',pack:20,x:1,y:1.01,kind:'bag',color:'#9a7953'},
  {key:'sugar',label:'SIROP',pack:100,x:2.25,y:1.01,kind:'bottle',color:'#b19c6e'},
  {key:'soda',label:'EAU PÉTILLANTE',pack:100,x:3.5,y:1.01,kind:'bottle',color:'#78908c'},
  {key:'lime',label:'CITRONS',pack:12,x:1,y:1.65,kind:'produce',color:'#7d8e45'},
  {key:'mint',label:'MENTHE',pack:12,x:2.25,y:1.65,kind:'produce',color:'#4f754b'},
  {key:'ice',label:'GLAÇONS',pack:20,x:3.5,y:1.65,kind:'bag',color:'#b3c8c2'},
  {key:'whisky',label:'WHISKY',pack:70,x:.43,y:.32,z:-1.12,side:true,kind:'bottle',color:'#8b6339'},
  {key:'gin',label:'GIN',pack:70,x:.43,y:.32,z:-2.18,side:true,kind:'bottle',color:'#638477'},
  {key:'tonic',label:'TONIC',pack:100,x:.43,y:1.02,z:-1.12,side:true,kind:'bottle',color:'#a1b9a3'},
  {key:'cola',label:'COLA',pack:100,x:.43,y:1.02,z:-2.18,side:true,kind:'bottle',color:'#604536'},
  {key:'vodka',label:'VODKA',pack:70,x:.43,y:1.72,z:-1.12,side:true,kind:'bottle',color:'#a5bdc2'},
  {key:'cranberry',label:'CRANBERRY',pack:100,x:.43,y:1.72,z:-2.18,side:true,kind:'bottle',color:'#8f425b'},
  {key:'energy',label:'ÉNERGIE',pack:100,x:2.25,y:2.29,kind:'bottle',color:'#83a95a'},
 ];
 function walkSurfaceHeight(x,z,state,feetY=0){
  if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(feetY))return null;
  const building=globalThis.BarEngine?.buildingLayout?.(state)||{},level=building.level||0;
  if(building.upstairs){
   // Only the stairs connect levels. The caller also limits the height change
   // per walking step, so crossing a landing edge can never teleport a player.
   if(x>=21.65&&x<=23.35&&z>=5.25&&z<=9.1)return (z-5.25)*3.6/3.85;
   if(x>=20.7&&x<=23.7&&z>=9.1&&z<=9.6&&feetY>3.3)return 3.6;
   if(x>=12.3&&x<=20.7&&z>=4.3&&z<=9.6&&feetY>3.3)return 3.6;
   if(feetY>.18)return null;
   if(x>=20.7&&x<=21.3&&z>=4.9&&z<=5.6)return 0;
   if(x>=21.3&&x<=23.7&&z>=4.3&&z<=5.4)return 0;
   if(building.nightclub&&x>=23.7&&x<=24.3&&z>=4.9&&z<=5.6)return 0;
  }
  if(feetY>.18)return null;
  if(building.nightclub&&x>=24.3&&x<=31.7&&z>=4.3&&z<=9.6)return 0;
  return ((x>=.3&&x<=11.7&&z>=.3&&z<=9.6)||
   (x>=.3&&x<=4.3&&z>=-3.9&&z<=-.3)||
   (x>=.55&&x<=1.35&&z>=-.35&&z<=.35)||
   (level>=1&&x>=11.7&&x<=12.3&&z>=4.9&&z<=5.6)||
   (level>=1&&x>=12.3&&x<=16.2&&z>=4.3&&z<=9.6)||
   (level>=2&&x>=16.2&&x<=16.8&&z>=4.9&&z<=5.6)||
   (level>=2&&x>=16.8&&x<=20.7&&z>=4.3&&z<=9.6))?0:null;
 }
 const containsWalkablePosition=(x,z,state,feetY=0)=>walkSurfaceHeight(x,z,state,feetY)!==null;
 const inStockroom=position=>!!position&&(!Number.isFinite(position.y)||position.y<2)&&position.x>=.3&&position.x<=4.3&&position.z>=-3.9&&position.z<-.35;
 function prepStation(preparation){
  const recipe=typeof preparation==='string'?preparation:preparation?.recipe;
  const key=recipe==='beer'?'beer':recipe==='coffee'?'coffee':'cocktails';
  const slot=typeof preparation==='object'&&globalThis.BarEngine?.preparationSlots?.find(slot=>slot.id===preparation?.slotId);
  const point=slot||globalThis.BarEngine?.preparationLayout?.stations[key]||({beer:{x:4.15,y:1.133,z:2.72},coffee:{x:8.43,y:1.152,z:2.47},cocktails:{x:6.5,y:1.133,z:3.05}})[key];
  let stream=key==='beer'?{y:1.53,h:.18}:key==='coffee'?{y:1.316,h:.072}:{y:1.51,h:.24};
  if(typeof preparation==='object'){
   const info=globalThis.BarEngine?.recipes?.[recipe],vessel=info?.vessel;
   if(info){
    const volume=Object.entries(info.ingredients).reduce((sum,[key,amount])=>sum+(globalThis.BarEngine.ingredients[key].unit==='cl'?amount:0),0);
    const portion=info.finishStep!==undefined&&volume?Math.min(1,info.target/volume):1;
    const fill=preparation.ready?1:Math.min(1,Math.max(0,preparation.amount/info.target))*portion;
    const range=vessel==='cup'?[.041,.123]:vessel==='wine'?[.12,.226]:vessel==='coupe'?[.12,.195]:vessel==='rocks'?[.012,.095]:[.012,vessel==='pint'?.267:.247];
    const bottom=point.y+range[0]+fill*(range[1]-range[0]),top=key==='beer'?1.612:key==='coffee'?1.33:point.y+.50;
    stream={y:(top+bottom)/2,h:Math.max(.005,top-bottom)};
   }
  }
  return {x:point.x,y:point.y,z:point.z,stream:{x:point.x,z:point.z,...stream}};
 }
 function trayPosition(index){return {x:4.98+(index%2)*.26,y:1.133,z:2.85+Math.floor(index/2)*.32}}
 function geometry(target){
  const box=(x,y,z,w,h,d,c,mat=0,extra={})=>{const p={x,y,z,w,h,d,c,mat,solid:false,...extra};target.push(p);return p};
  const cylinder=(x,y,z,w,h,d,c,mat=0,extra={})=>box(x,y,z,w,h,d,c,mat,{round:true,...extra});
  const sphere=(x,y,z,w,h,d,c,mat=0,extra={})=>box(x,y,z,w,h,d,c,mat,{shape:'sphere',...extra});
  return {box,cylinder,sphere};
 }
 function bottle(g,x,y,z,color='#355846',scale=1,label='RESERVE'){
  const r=.105*scale;
  g.cylinder(x,y+.14*scale,z,r,.28*scale,r,color,M.glass,{topRadius:.97});
  g.cylinder(x,y+.305*scale,z,r,.05*scale,r,color,M.glass,{topRadius:.48});
  g.cylinder(x,y+.375*scale,z,r*.48,.09*scale,r*.48,color,M.glass);
  g.cylinder(x,y+.425*scale,z,r*.53,.026*scale,r*.53,'#b3a078',M.metal);
  if(label)g.box(x,y+.16*scale,z+r*.505,r*.8,.115*scale,.003,'#d4c9af',M.paint,{label,labelFace:'back',labelColor:'#37352c',castShadow:false});
 }
 function glass(g,recipe,x,y,z,fill=1){
  const info=globalThis.BarEngine?.recipes?.[recipe]||{},rim='#b9ccc5';
  const vessel=info.vessel||({coffee:'cup',wine:'wine',beer:'pint',whisky:'rocks',ginFizz:'coupe'}[recipe]||'highball');
  const color=info.color||({coffee:'#71462b',wine:'#8e3c48',beer:'#d8a348',whisky:'#b8792e'}[recipe]||'#b8d28a');
  const fillAmount=Number.isFinite(fill)?Math.min(1,Math.max(0,fill)):0;
  // Thin tangent panels form genuinely open containers. They are transparent
  // geometry, not a solid coloured cylinder with an opaque cap over its rim.
  const ring=(height,radius,thickness=.002,ringHeight=.003)=>{
   for(let i=0;i<16;i++){const a=i*Math.PI/8;g.box(x+Math.sin(a)*radius,y+height,z+Math.cos(a)*radius,2*radius*Math.tan(Math.PI/16),ringHeight,thickness,rim,M.clearGlass,{ry:a,castShadow:false});}
  };
  const walls=profile=>{
   for(let j=1;j<profile.length;j++){
    const [low,r0]=profile[j-1],[high,r1]=profile[j],radius=(r0+r1)/2;
    for(let i=0;i<16;i++){const a=i*Math.PI/8;g.box(x+Math.sin(a)*radius,y+(low+high)/2,z+Math.cos(a)*radius,2*Math.max(r0,r1)*Math.tan(Math.PI/16),Math.hypot(high-low,r1-r0),.0018,rim,M.clearGlass,{rx:Math.atan2(r1-r0,high-low),ry:a,castShadow:false});}
   }
   const [height,radius]=profile[profile.length-1];ring(height,radius);
  };
  const contents=(profile,maxHeight)=>{
   const level=profile[0][0]+fillAmount*(maxHeight-profile[0][0]);
   if(fillAmount<=0)return level;
   for(let i=1;i<profile.length;i++){
    const [low,r0]=profile[i-1],[high,r1]=profile[i];if(level<=low)break;
    const top=Math.min(level,high),radius=r0+(r1-r0)*(top-low)/(high-low),outer=Math.max(r0,radius)-.003;
    if(outer>0)g.cylinder(x,y+(low+top)/2,z,outer*2,top-low,outer*2,color,recipe==='ginTonic'?M.clearGlass:M.glass,{topRadius:Math.max(.01,(radius-.003)/outer),bottomRadius:Math.max(.01,(r0-.003)/outer),castShadow:false});
   }
   return level;
  };
  if(vessel==='cup'){
   g.cylinder(x,y+.009,z,.21,.018,.21,'#d5cfc0');
   g.cylinder(x,y+.029,z,.107,.022,.107,'#e3ded0');
   for(let i=0;i<16;i++){
    const a=i*Math.PI/8;
    g.box(x+Math.sin(a)*.063,y+.085,z+Math.cos(a)*.063,.027,.116,.011,'#e3ded0',0,{ry:a});
   }
   g.cylinder(x,y+.041+fillAmount*.082,z,.113,.003,.113,fillAmount>0?color:'#c6bcaa');
   if(fillAmount>0){
    for(const [dx,dz]of [[-.025,.012],[.014,-.019],[.025,.018]])g.sphere(x+dx,y+.043+fillAmount*.082,z+dz,.022,.0015,.012,'#c09a5d',0,{castShadow:false});
   }
   for(let i=0;i<12;i++){
    const a=i*Math.PI/6,b=(i+1)*Math.PI/6,ax=.079+Math.sin(a)*.034,ay=.086+Math.cos(a)*.036,bx=.079+Math.sin(b)*.034,by=.086+Math.cos(b)*.036;
    g.cylinder(x+(ax+bx)/2,y+(ay+by)/2,z,.014,Math.hypot(bx-ax,by-ay)+.003,.014,'#ded7c7',0,{rz:-Math.atan2(bx-ax,by-ay)});
   }
   return;
  }
  let profile,level;
  if(vessel==='wine'||vessel==='coupe'){
   g.cylinder(x,y+.008,z,vessel==='coupe'?.15:.14,.009,vessel==='coupe'?.15:.14,rim,M.clearGlass,{castShadow:false});
   g.cylinder(x,y+.066,z,.012,.12,.012,rim,M.clearGlass,{castShadow:false});
   profile=vessel==='wine'?[[.12,.018],[.145,.060],[.195,.078],[.245,.065],[.275,.054]]:[[.12,.018],[.15,.070],[.18,.102],[.22,.109]];
   walls(profile);level=contents(profile,vessel==='wine'?.226:.195);
  }else{
   const rocks=vessel==='rocks',pint=vessel==='pint',height=rocks?.15:pint?.29:.27;
   profile=[[.012,rocks?.072:pint?.062:.052],[height,rocks?.076:pint?.078:.061]];
   g.cylinder(x,y+.008,z,profile[0][1]*2,.012,profile[0][1]*2,rim,M.clearGlass,{castShadow:false});
   walls(profile);level=contents(profile,rocks?.095:height-.023);
   if(fillAmount>0&&pint)g.cylinder(x,y+level+.006,z,(.062+(.078-.062)*(level-.012)/(.29-.012))*.97*2,.012,(.062+(.078-.062)*(level-.012)/(.29-.012))*.97*2,'#ede1c5',M.paint,{castShadow:false});
  }
  if(fillAmount>0&&info.ingredients?.ice&&vessel!=='coupe'){
   const iceY=Math.max(profile[0][0]+.018,level-.008),spread=vessel==='rocks'?.033:.024;
   for(const [i,dx,dz]of [[0,-spread,.005],[1,spread,-.011],[2,.006,.028]]){
    const cubeY=y+iceY+(i===2?.016:0),rotation={ry:.4+i*.7,rx:.13*i,castShadow:false};
    g.box(x+dx,cubeY,z+dz,.033,.032,.033,'#d6e4dd',M.clearGlass,rotation);
    g.box(x+dx,cubeY,z+dz,.015,.017,.016,'#dfe5dc',M.paint,rotation);
   }
  }
  const garnish=info.garnish||(recipe==='mojito'?'mint-lime':null);
  if(fillAmount>0&&garnish){
   const [top,radius]=profile[profile.length-1],gx=x-radius*.72,gz=z+.01;
   g.cylinder(gx,y+top+.014,gz,.064,.009,.064,'#607b36',M.paint,{rx:Math.PI/2,castShadow:false});
   g.cylinder(gx,y+top+.014,gz-.005,.052,.002,.052,'#c4cd73',M.paint,{rx:Math.PI/2,castShadow:false});
   for(let i=0;i<6;i++){const a=i*Math.PI/3;g.box(gx+Math.sin(a)*.011,y+top+.014+Math.cos(a)*.011,gz-.007,.0018,.025,.001,'#e1df9a',M.paint,{rz:-a,castShadow:false});}
   if(garnish==='mint-lime'){
    g.cylinder(x+.021,y+top+.026,z-.014,.007,.12,.007,'#bdac8b',M.wood,{rz:.14,castShadow:false});
    for(const [dx,dz,a]of [[.012,.018,.4],[-.012,.012,-.6],[0,-.008,.1]])g.sphere(x+dx,y+level+.016,z+dz,.035,.006,.020,'#476237',M.paint,{ry:a,rz:.15,castShadow:false});
   }
  }
 }
 const preparationLabels={wine:'VIN ROUGE',rum:'RHUM',whisky:'WHISKY',gin:'GIN',sugar:'SIROP',soda:'EAU PÉTILLANTE',tonic:'TONIC',cola:'COLA',vodka:'VODKA',cranberry:'CRANBERRY',energy:'ÉNERGIE',lime:'CITRONS',mint:'MENTHE',ice:'GLAÇONS',coffee:'CAFÉ'};
 const preparationColors={wine:'#593c40',rum:'#8b6d3b',whisky:'#916037',gin:'#538476',sugar:'#b2a169',soda:'#739ca0',tonic:'#a1b692',cola:'#624132',vodka:'#a5bdc2',cranberry:'#8f425b',energy:'#83a95a'};
 function preparationFixtures(items){
  const layout=globalThis.BarEngine?.preparationLayout;if(!layout)return;
  const g=geometry(items),{box:b,cylinder:c}=g;
  for(const [key,point]of Object.entries(layout.ingredients)){
   if(point.fixed)continue;
   const {x,y,z}=point,front=z>2;
   if(front){
    b(x,y+.008,z,.36,.016,.29,'#73847b',M.metal);
    for(const dx of [-.172,.172])b(x+dx,y+.064,z,.016,.112,.29,'#9ba89d',M.metal);
    for(const dz of [-.137,.137])b(x,y+.064,z+dz,.36,.112,.016,'#9ba89d',M.metal);
    b(x,y+.065,z-.148,.30,.09,.006,'#eee8d5',M.paint,{label:preparationLabels[key],labelFace:'front',labelColor:'#203c2c',labelPixels:256,castShadow:false});
   }else{
    b(x,y-.007,z,.39,.014,.25,'#5c6c61',M.metal);
    b(x,y-.047,1.022,.40,.09,.014,'#eee8d5',M.paint,{label:preparationLabels[key],labelFace:'back',labelColor:'#203c2c',labelPixels:256,castShadow:false});
   }
  }
  const v=layout.vessels;
  for(const dx of [-.50,.28])b(v.x+dx,1.055,v.z,.045,.09,.27,'#53665b',M.metal);
  b(v.x,v.y-.025,v.z,1.22,.05,.35,'#64766a',M.metal);
  for(const dz of [-.165,.165])b(v.x,v.y+.018,v.z+dz,1.22,.035,.016,'#acb8aa',M.metal);
  b(v.x,v.y-.018,1.04,.85,.095,.012,'#eee8d5',M.paint,{label:'VERRERIE',labelFace:'back',labelColor:'#203c2c',labelPixels:256,castShadow:false});
  for(const [index,recipe]of ['beer','wine','coffee','mojito','whisky','ginFizz'].entries())glass(g,recipe,v.x+(index-2.5)*.19,v.y,v.z,0);
 }
 function preparationItem(g,key,x,y,z,scale=1){
  if(Object.hasOwn(preparationColors,key)){
   bottle(g,x,y,z,preparationColors[key],scale,'');
   g.box(x,y+.16*scale,z+.054*scale,.082*scale,.11*scale,.004,'#ded8bd',M.paint,{castShadow:false});
   return;
  }
  if(key==='lime'){
   g.sphere(x,y+.04*scale,z,.10*scale,.08*scale,.085*scale,'#79923d',M.paint);
   g.cylinder(x,y+.079*scale,z,.012*scale,.006*scale,.012*scale,'#445e2a',M.paint);
  }else if(key==='mint'){
   for(let i=0;i<4;i++){
    const a=i*1.8,dx=Math.sin(a)*.035*scale,dz=Math.cos(a)*.035*scale;
    g.cylinder(x+dx*.4,y+.062*scale,z+dz*.4,.004*scale,.12*scale,.004*scale,'#647d35',M.paint,{rz:.2*Math.sin(a)});
    g.sphere(x+dx,y+(.06+i*.018)*scale,z+dz,.075*scale,.012*scale,.037*scale,i%2?'#49764b':'#739548',M.paint,{ry:a,rz:.3});
   }
  }else if(key==='ice'){
   for(const [i,dx,dz]of [[0,-.035,.014],[1,.035,-.014],[2,.004,.040]]){
    g.box(x+dx*scale,y+(.025+i*.008)*scale,z+dz*scale,.045*scale,.044*scale,.046*scale,'#cfdfd8',M.clearGlass,{ry:i*.8,castShadow:false});
    g.box(x+dx*scale,y+(.025+i*.008)*scale,z+dz*scale,.021*scale,.025*scale,.023*scale,'#e1e7df',M.paint,{ry:i*.8,castShadow:false});
   }
  }else if(key==='coffee'){
   g.cylinder(x,y+.026*scale,z,.09*scale,.04*scale,.09*scale,'#aab5a9',M.metal);
   g.cylinder(x,y+.048*scale,z,.077*scale,.005*scale,.077*scale,'#4b3426',M.paint);
   g.box(x,y+.023*scale,z+.10*scale,.025*scale,.022*scale,.15*scale,'#38433c',M.paint);
  }
 }
 function preparationVisuals(items,state,camera){
  const layout=globalThis.BarEngine?.preparationLayout;if(!layout)return;
  const g=geometry(items),p=state?.prep,stock=state?.stock||{};
  for(const [key,point]of Object.entries(layout.ingredients)){
   if(point.fixed||!(stock[key]>0))continue;
   const {x,y,z}=point;
   if(Object.hasOwn(preparationColors,key)){
    if(p?.held?.key!==key)preparationItem(g,key,x,y,z);
   }else if(key==='coffee'){
    g.box(x,y+.15,z,.24,.30,.18,'#806647',M.fabric);
    g.box(x,y+.15,z+.094,.16,.15,.006,'#d9d1b2',M.paint,{castShadow:false});
    g.box(x,y+.305,z,.22,.025,.15,'#a89770',M.fabric);
   }else{
    const count=Math.min(3,Math.ceil(stock[key]/3));
    for(let i=0;i<count;i++)preparationItem(g,key,x+(i-1)*.10,y+.018,z+(i%2?-.04:.025),key==='mint'?.75:.9);
   }
  }
  // Prepared fruit and herbs remain beside the vessel until the drink is mixed.
  for(const preparation of [p,...(state?.parkedPreps||[])])if(preparation?.physical&&preparation.vesselPlaced&&!preparation.ready&&preparation.amount===0){
   const point=prepStation(preparation);
   for(const [index,key]of ['lime','mint','ice'].filter(key=>preparation.added?.[key]).entries())preparationItem(g,key,point.x-.18,point.y,point.z+(index-1)*.10,.65);
  }
  if(!camera||!p?.held)return;
  const cp=Math.cos(camera.pitch||0),sp=Math.sin(camera.pitch||0),forward=.58*cp+.40*sp,side=state.payments?.terminalCarried?-.28:.28;
  const origin={x:camera.x+Math.sin(camera.a)*forward+Math.cos(camera.a)*side,y:camera.y+.58*sp-.40*cp,z:camera.z+Math.cos(camera.a)*forward-Math.sin(camera.a)*side};
  const local=[],hand=geometry(local);
  if(p.held.kind==='vessel')glass(hand,p.recipe,0,0,0,0);
  else preparationItem(hand,p.held.key,0,0,0,.73);
  hand.sphere(.045,.03,-.005,.055,.085,.085,'#c4916d',M.skin);
  hand.sphere(.005,-.02,.025,.09,.05,.10,'#c4916d',M.skin);
  hand.cylinder(.025,-.10,.045,.095,.18,.105,'#344e43',M.fabric,{rx:-.25});
  const angle=camera.a+Math.PI,cs=Math.cos(angle),sn=Math.sin(angle);
  for(const item of local)items.push({...item,x:origin.x+item.x*cs+item.z*sn,y:origin.y+item.y,z:origin.z-item.x*sn+item.z*cs,ry:(item.ry||0)+angle,castShadow:false});
 }
 function create(state){
  const items=[],g=geometry(items),{box:b,cylinder:c,sphere:s}=g;
  const solid={solid:true},noShadow={castShadow:false};
  const decor=BarEngine.decorStyle(state),wall=decor.walls.colors,ceiling=decor.ceiling.colors;
  const table=decor.tables.colors,chairColors=decor.chairs.colors,floor=decor.floor.colors;
  const floorMaterial=M[decor.floor.material]??M.floor,tableMaterial=M[decor.tables.material]??M.wood,seatMaterial=M[decor.chairs.material]??M.fabric;
  const building=globalThis.BarEngine?.buildingLayout?.(state)||{level:0,width:12};
  const activeTables=globalThis.BarEngine?.availableTables?.(state)||tableLocations.filter(table=>!table.upgrade);
  // A room purchase changes the shell. Furniture is a separate purchase, so an
  // empty salon remains accessible without creating extra customer places.
  function sideWall(x,start,end,door=false,elevation=0,doorZ=5.25){
   const spans=door?[[start,doorZ-.65],[doorZ+.65,end]]:[[start,end]];
   for(const [from,to]of spans)if(to>from)b(x,elevation+1.7,(from+to)/2,.2,3.4,to-from,wall.plaster,M.plaster,{...solid,...noShadow});
   if(door){
    b(x,elevation+2.95,doorZ,.2,.9,1.3,wall.plaster,M.plaster,noShadow);
    for(const z of [doorZ-.65,doorZ+.65])b(x,elevation+1.25,z,.26,2.5,.065,'#4d5e51',M.wood,solid);
    b(x,elevation+2.52,doorZ,.26,.09,1.43,'#4d5e51',M.wood,noShadow);
    b(x,elevation+.006,doorZ,.25,.012,1.25,'#ad9670',M.metal,noShadow);
   }
  }
  function sidePanel(x,start,end,door=false){
   for(const [from,to]of door?[[start,4.6],[5.9,end]]:[[start,end]]){
    const z=(from+to)/2,d=to-from;
    b(x,.58,z,.12,1.16,d,wall.panel,M.wood);
    b(x,1.18,z,.17,.06,d,wall.trim,M.wood);
    b(x,.075,z,.18,.15,d,wall.trim,M.wood);
   }
   b(x,3.24,(start+end)/2,.18,.11,end-start,ceiling.trim,M.plaster,noShadow);
  }
  // Shell: old plaster, brick, timber wainscoting and a glazed street frontage.
  b(6,-.11,5,12,.22,10,floor.surface,floorMaterial,{roomFloor:true,decorCategory:'floor'});
  b(6,3.45,5,12,.18,10,ceiling.surface,M.plaster,noShadow);
  b(0,1.7,5,.2,3.4,10,decor.walls.id==='cream'?'#807264':wall.plaster,decor.walls.id==='cream'?M.brick:M.plaster,{...solid,...noShadow});
  sideWall(12,0,10,building.level>=1);
  // The former blank wall now has a real doorway to the stockroom.
  b(.15,1.7,0,.3,3.4,.2,wall.plaster,M.plaster,{...solid,...noShadow});
  b(6.8,1.7,0,10.4,3.4,.2,wall.plaster,M.plaster,{...solid,...noShadow});
  b(.95,2.85,0,1.3,1.1,.2,wall.plaster,M.plaster,noShadow);
  sidePanel(.12,0,10);
  sidePanel(11.88,0,10,building.level>=1);
  for(let room=0;room<building.level;room++){
   const left=12+room*4.5,right=left+4.5,middle=(left+right)/2;
   b(middle,-.11,7,4.5,.22,6,floor.surface,floorMaterial,{roomFloor:true,decorCategory:'floor'});
   b(middle,3.45,7,4.5,.18,6,ceiling.surface,M.plaster,noShadow);
   b(middle,1.7,4,4.5,3.4,.2,wall.plaster,M.plaster,{...solid,...noShadow});
   sidePanel(left+.12,4,10,true);
   sideWall(right,4,10,room+1<building.level||right===21&&building.upstairs);
   sidePanel(right-.12,4,10,room+1<building.level||right===21&&building.upstairs);
   b(middle,.58,4.12,4.26,1.16,.12,wall.panel,M.wood);
   b(middle,1.18,4.12,4.26,.06,.17,wall.trim,M.wood);
   b(middle,.075,4.12,4.26,.15,.18,wall.trim,M.wood);
   b(middle,3.24,4.12,4.26,.11,.18,ceiling.trim,M.plaster,noShadow);
   // Framed glazing and a solid sill close every edge along the new frontage.
   b(middle,3.13,9.98,4.5,.55,.2,wall.plaster,M.plaster,noShadow);
   for(const x of [left+.12,right-.12])b(x,1.6,9.96,.18,3.2,.2,'#273a38',M.metal,{...solid,...noShadow});
   b(middle,.35,9.97,4.32,.7,.2,wall.panel,M.wood,solid);
   b(middle,.73,9.86,4.32,.07,.32,'#5d5141',M.wood);
   for(const y of [2.28,2.77])b(middle,y,9.94,4.32,.06,.12,'#283c3b',M.metal,noShadow);
   b(middle,1.75,9.94,.05,2,.12,'#283c3b',M.metal,noShadow);
   b(middle,1.515,9.99,4.32,1.53,.009,'#c0d1cf',M.clearGlass,noShadow);
   b(middle,2.525,9.99,4.32,.46,.009,'#c0d1cf',M.clearGlass,noShadow);
   b(left-.145,2.82,5.25,1.15,.25,.025,'#263e36',M.paint,{ry:Math.PI/2,label:room?'GRANDE SALLE':'SALON',labelColor:'#f2e9cf',labelPixels:256,castShadow:false});
   b(left+.145,2.82,5.25,1.15,.25,.025,'#263e36',M.paint,{ry:-Math.PI/2,label:'COMPTOIR',labelColor:'#f2e9cf',labelPixels:256,castShadow:false});
   // Tables retain a clear aisle on their left, including when both rows exist.
   for(const z of [6.2,8.4]){
    c(middle,3.05,z,.018,.62,.018,'#273632',M.metal,noShadow);
    c(middle,2.7,z,.57,.20,.57,'#364137',M.metal,{topRadius:.32});
    c(middle,2.59,z,.50,.016,.50,'#f2d799',M.light,noShadow);
    s(middle,2.565,z,.10,.075,.10,'#f9e4b7',M.light,noShadow);
   }
   b(middle,2.17,4.14,1.5,.83,.045,'#4b4436',M.wood);
   b(middle,2.17,4.17,1.34,.67,.02,'#a79266',M.paint,{label:room?'LES SOIRÉES\nDU COMPTOIR':'PRENEZ\nLE TEMPS',labelFace:'back',labelColor:'#263b34',labelPixels:256,castShadow:false});
  }
  if(building.upstairs){
   // The upper salon is a real second storey over the two existing annexes.
   // Its slab meets the ceilings below, while the staircase has an open shaft.
   b(16.5,3.57,7,9,.06,6,floor.surface,floorMaterial,{roomFloor:true,decorCategory:'floor',floorHeight:3.6,solid:true,castShadow:false});
   b(16.5,7.05,7,9,.18,6,ceiling.surface,M.plaster,noShadow);
   sideWall(12,4,10,false,3.6);sideWall(21,4,10,true,3.6,9.3);
   b(21,3.5,7,.2,.2,6,wall.plaster,M.plaster,noShadow);
   b(16.5,5.3,4,9,3.4,.2,wall.plaster,M.plaster,{...solid,...noShadow});
   for(const z of [4.12,9.88]){
    b(16.5,4.18,z,8.76,1.16,.12,wall.panel,M.wood);
    b(16.5,4.78,z,8.76,.06,.17,wall.trim,M.wood);
    b(16.5,3.675,z,8.76,.15,.18,wall.trim,M.wood);
    b(16.5,6.84,z,8.76,.11,.18,ceiling.trim,M.plaster,noShadow);
   }
   b(12.12,4.18,7,.12,1.16,6,wall.panel,M.wood);
   b(12.12,4.78,7,.17,.06,6,wall.trim,M.wood);
   b(12.12,6.84,7,.18,.11,6,ceiling.trim,M.plaster,noShadow);
   b(20.88,4.18,6.325,.12,1.16,4.65,wall.panel,M.wood);
   b(20.88,4.78,6.325,.17,.06,4.65,wall.trim,M.wood);
   b(20.88,6.84,7,.18,.11,6,ceiling.trim,M.plaster,noShadow);
   b(16.5,4.0,9.98,9,.8,.2,wall.panel,M.wood,solid);
   b(16.5,6.73,9.98,9,.55,.2,wall.plaster,M.plaster,noShadow);
   for(const x of [12.12,16.5,20.88])b(x,5.2,9.96,.18,3.2,.2,'#273a38',M.metal,{...solid,...noShadow});
   for(const x of [14.3,18.7]){
    b(x,5.57,9.99,4.16,2.27,.009,'#c0d1cf',M.clearGlass,noShadow);
    b(x,5.88,9.94,4.16,.06,.12,'#283c3b',M.metal,noShadow);
   }
   for(const x of [14.25,18.75])for(const z of [6.2,8.4]){
    c(x,6.65,z,.018,.62,.018,'#273632',M.metal,noShadow);
    c(x,6.3,z,.57,.20,.57,'#364137',M.metal,{topRadius:.32});
    c(x,6.19,z,.50,.016,.50,'#f2d799',M.light,noShadow);
   }
   b(16.5,5.85,4.14,2.5,.48,.035,'#263e36',M.paint,{label:'LE SALON À L’ÉTAGE',labelFace:'back',labelColor:'#f2e9cf',labelPixels:512,castShadow:false});
   b(20.845,6.42,9.3,1.15,.25,.025,'#263e36',M.paint,{ry:Math.PI/2,label:'ESCALIER',labelColor:'#f2e9cf',labelPixels:256,castShadow:false});
   b(21.155,6.42,9.3,1.15,.25,.025,'#263e36',M.paint,{ry:-Math.PI/2,label:'ÉTAGE',labelColor:'#f2e9cf',labelPixels:256,castShadow:false});
   // Enclosed staircase tower. The landing remains clear of rails and posts.
   b(22.5,-.11,7,3,.22,6,floor.surface,floorMaterial,{roomFloor:true,decorCategory:'floor'});
   b(22.5,7.05,7,3,.18,6,ceiling.surface,M.plaster,noShadow);
   b(22.5,3.5,4,3,7,.2,wall.plaster,M.plaster,{...solid,...noShadow});
   b(22.5,3.5,10,3,7,.2,wall.plaster,M.plaster,{...solid,...noShadow});
   sideWall(24,4,10,building.nightclub);sideWall(24,4,10,false,3.6);
   b(24,3.5,7,.2,.2,6,wall.plaster,M.plaster,noShadow);
   b(22.5,3.57,9.55,3,.06,.9,floor.surface,floorMaterial,{solid:true,castShadow:false});
   // 24 treads, with walking following a smooth ramp to prevent camera jolts.
   for(let step=0;step<24;step++){
    const height=(step+1)*3.6/24,depth=3.85/24,z=5.25+(step+.5)*depth;
    b(22.5,height/2,z,2.04,height,depth+.003,wall.trim,M.wood,{stairTread:true,castShadow:false});
    b(22.5,height+.004,z-depth/2+.016,2.04,.008,.032,'#b8ab81',M.metal,noShadow);
   }
   const railAngle=Math.atan2(3.6,3.85),railLength=Math.hypot(3.6,3.85);
   for(const x of [21.45,23.55]){
    b(x,2.75,7.175,.065,.065,railLength,'#aa936c',M.wood,{rx:-railAngle});
    // Closely spaced spindles meet the handrail without protruding above it.
    // Their gaps are narrower than the player's collision diameter.
    for(let step=2;step<24;step++){const z=5.25+(step+.5)*3.85/24,y=(step+.5)*3.6/24;b(x,y+.475,z,.035,.95,.035,'#3e4e46',M.metal,{solid:true,stairGuard:true});}
   }
   b(20.845,2.82,5.25,1.15,.25,.025,'#263e36',M.paint,{ry:Math.PI/2,label:'ÉTAGE',labelColor:'#f2e9cf',labelPixels:256,castShadow:false});
   b(22.5,2.65,4.14,1.8,.35,.03,'#263e36',M.paint,{label:'ÉTAGE · SALON',labelFace:'back',labelColor:'#f2e9cf',labelPixels:256,castShadow:false});
   for(const [z,y]of [[4.7,2.8],[8.7,6.2]])b(23.84,y,z,.045,.45,.28,'#f2d799',M.light,noShadow);
  }
  if(building.nightclub){
   // Keep a complete loop around the dance floor and clear table approaches.
   b(28,-.11,7,8,.22,6,'#292b3b',M.tile,{roomFloor:true,decorCategory:'club'});
   b(28,3.45,7,8,.18,6,'#252532',M.plaster,noShadow);
   b(28,1.7,4,8,3.4,.2,'#363044',M.plaster,{...solid,...noShadow});
   b(28,1.7,10,8,3.4,.2,'#363044',M.plaster,{...solid,...noShadow});
   b(32,1.7,7,.2,3.4,6,'#303b49',M.plaster,{...solid,...noShadow});
   for(const z of [4.12,9.88]){b(28,.48,z,7.76,.96,.12,'#252836',M.fabric);b(28,2.8,z,7.76,.035,.035,z<7?'#7b84dc':'#69bec9',M.light,noShadow);}
   for(const x of [24.12,31.88])b(x,2.8,7,.035,.035,5.76,'#b771c4',M.light,noShadow);
   b(24.15,2.82,5.25,1.15,.25,.025,'#29253b',M.paint,{ry:-Math.PI/2,label:'COMPTOIR',labelColor:'#e8e0fa',labelPixels:256,castShadow:false});
   b(23.845,2.82,5.25,1.15,.25,.025,'#29253b',M.paint,{ry:Math.PI/2,label:'LE CLUB',labelColor:'#e8e0fa',labelPixels:256,castShadow:false});
   for(let i=0;i<4;i++)for(let j=0;j<5;j++)b(27.3+i*.46,.006,6.4+j*.46,.44,.012,.44,['#3c586e','#67446e','#426665','#49466d'][(i+j)%4],M.paint,noShadow);
   // DJ desk stays north of the 5.25 m service corridor.
   b(28,.53,4.65,2.1,1.06,.35,'#222632',M.metal,solid);
   b(28,1.075,4.65,2.2,.03,.42,'#383a49',M.metal);
   for(const x of [27.45,28.55]){c(x,1.099,4.65,.32,.015,.32,'#151b23',M.paint,noShadow);c(x,1.11,4.65,.09,.008,.09,'#76c8cd',M.light,noShadow);}
   for(let i=0;i<6;i++)b(27.84+i*.065,1.11,4.65,.018,.016,.17,i%2?'#80c4cb':'#aa91cd',M.metal);
   for(const x of [25.5,30.5]){b(x,1.28,4.4,.5,1.7,.48,'#232731',M.fabric,solid);for(const y of [.85,1.4])c(x,y,4.648,.29,.025,.29,'#111b24',M.metal,{rx:Math.PI/2});}
   b(28,2.3,4.14,2.3,.50,.035,'#29253b',M.paint,{label:'LE CLUB\nNUITS DU COMPTOIR',labelFace:'back',labelColor:'#b6e4e6',labelPixels:512,castShadow:false});
   for(const [x,z,color]of [[26,6,'#8d89e1'],[30,6,'#76ced1'],[26,8.7,'#d47fbd'],[30,8.7,'#858fdb']]){c(x,3.04,z,.22,.18,.22,'#242d35',M.metal);c(x,2.94,z,.17,.02,.17,color,M.light,noShadow);}
  }
  b(6,3.24,.16,12,.11,.18,ceiling.trim,M.plaster,noShadow);
  b(.15,.58,.15,.3,1.16,.14,wall.panel,M.wood);
  b(6.8,.58,.15,10.4,1.16,.14,wall.panel,M.wood);
  for(const x of [.29,1.61])b(x,1.16,.12,.075,2.32,.16,'#5a6758',M.wood,solid);
  b(.95,2.33,.12,1.4,.09,.16,'#5a6758',M.wood);
  b(.95,2.59,.122,1.18,.25,.035,'#263e36',0,{label:'RÉSERVE',labelFace:'back',labelColor:'#f2e9cf',castShadow:false});
  b(.95,.013,0,1.2,.025,.24,'#8d9387',M.metal);
  // A separate, fully enclosed room: rear shelves, clear aisle and inventory desk.
  b(2.3,-.11,-2.1,4.6,.22,4.2,'#82877b',M.tile);
  b(2.3,3.45,-2.1,4.6,.18,4.2,'#b9b9a8',M.plaster,noShadow);
  b(0,1.7,-2.1,.2,3.4,4.2,'#a4a998',M.plaster,{...solid,...noShadow});
  b(4.6,1.7,-2.1,.2,3.4,4.2,'#a4a998',M.plaster,{...solid,...noShadow});
  b(2.3,1.7,-4.2,4.6,3.4,.2,'#b0b39f',M.plaster,{...solid,...noShadow});
  for(const x of [.12,4.48])b(x,.08,-2.1,.08,.16,4.2,'#566252',M.paint);
  b(2.3,.08,-4.08,4.36,.16,.08,'#566252',M.paint);
  b(2.3,3.3,-2.1,.55,.055,1.3,'#5e6861',M.metal,noShadow);
  b(2.3,3.264,-2.1,.45,.016,1.18,'#e7e5c9',M.light,noShadow);
  for(const x of [.35,2.25,4.15])for(const z of [-4.04,-3.42])b(x,1.25,z,.055,2.5,.055,'#4b5a53',M.metal,solid);
  for(const y of [.35,.99,1.63,2.27])b(2.25,y,-3.73,3.85,.04,.68,'#9b9c85',M.paint,solid);
  // Whole rack footprint stays collidable even when every shelf is empty.
  b(2.25,.17,-3.76,3.85,.3,.66,'#677063',M.paint,solid);
  for(const bin of storageBins.filter(bin=>!bin.side))b(bin.x,bin.y-.085,-3.38,.94,.16,.025,'#eee8d5',0,{label:bin.label,labelFace:'back',labelColor:'#203c2c',castShadow:false});
  // The new bottles have their own shallow rack on the left wall. The aisle
  // through the reserve door remains clear, including the player's collision radius.
  for(const x of [.20,.68])for(const z of [-.67,-2.63])b(x,1.12,z,.035,2.24,.035,'#4b5a53',M.metal,solid);
  for(const y of [.30,1.00,1.70])b(.44,y,-1.65,.56,.035,2.02,'#939783',M.paint,solid);
  b(.44,.15,-1.65,.56,.30,2.02,'#667064',M.paint,solid);
  for(const bin of storageBins.filter(bin=>bin.side))b(.735,bin.y-.075,bin.z,.86,.14,.02,'#eee8d5',M.paint,{ry:Math.PI/2,label:bin.label,labelFace:'back',labelColor:'#203c2c',labelPixels:256,castShadow:false});
  // Mounted on the front of the rack so its uprights cannot mask the lettering.
  b(2.25,2.49,-3.37,2.6,.34,.03,'#243c30',0,{label:'LA RÉSERVE',labelFace:'back',labelFont:'Georgia, serif',labelColor:'#f2e9cf',castShadow:false});
  b(4.05,.93,-1.18,.76,.055,1.35,'#9e9479',M.wood,solid);
  for(const x of [3.74,4.36])for(const z of [-1.74,-.62])b(x,.45,z,.05,.9,.05,'#48574e',M.metal,solid);
  b(4.06,.964,-1.17,.34,.012,.48,'#d9d2ba',0,{label:'INVENTAIRE',labelFace:'top',labelColor:'#405247',castShadow:false});
  b(4.455,1.8,-1.18,1.25,.58,.024,'#2d473c',0,{ry:Math.PI/2,label:'STOCKS\nGÉRER LA RÉSERVE',labelColor:'#f2e9cf',castShadow:false});
  c(3.9,.3,-2.53,.6,.6,.6,'#637f75',M.metal,solid);
  c(3.9,.614,-2.53,.62,.026,.62,'#9bad9d',M.metal);
  b(3.9,.78,-2.53,.1,.3,.1,'#6c8174',M.metal);
  b(3.9,.93,-2.53,.48,.05,.1,'#879b89',M.metal);
  b(6,3.13,9.98,12,.55,.2,wall.plaster,M.plaster,noShadow);
  for(const x of [.12,4.25,7.75,11.88])b(x,1.6,9.96,.18,3.2,.2,'#273a38',M.metal,{...solid,...noShadow});
  for(const x of [2.16,9.84]){
   b(x,.35,9.97,4,.7,.2,wall.panel,M.wood,solid);
   b(x,.73,9.86,4.12,.07,.32,'#5d5141',M.wood);
   b(x,2.77,9.94,4.02,.07,.12,'#283c3b',M.metal,noShadow);
   b(x,1.75,9.94,.05,2.0,.12,'#283c3b',M.metal,noShadow);
   b(x,2.28,9.94,4,.045,.12,'#283c3b',M.metal,noShadow);
   // Glazing overlaps its rebates so daylight cannot leak through frame seams.
   b(x,1.515,9.99,4.02,1.53,.009,'#c0d1cf',M.clearGlass,noShadow);
   b(x,2.525,9.99,4.02,.46,.009,'#c0d1cf',M.clearGlass,noShadow);
  }
  // The 2.9 m double door sits inside the 3.32 m opening between the shopfront
  // posts. Full-depth jambs and a lintel close that gap, outside the door path.
  for(const x of [4.44,7.56])b(x,1.41,9.96,.23,2.82,.20,'#273a38',M.metal,{...solid,...noShadow});
  b(6,2.825,9.96,3.5,.10,.20,'#273a38',M.metal,noShadow);
  b(6,1.41,10.02,2.9,2.82,.018,'#b7cfca',M.clearGlass,{...solid,...noShadow});
  for(const x of [4.56,7.44])b(x,1.41,9.95,.055,2.82,.10,'#263a36',M.metal,noShadow);
  b(6,1.41,9.95,.07,2.82,.1,'#263a36',M.metal,noShadow);
  b(6,.15,9.91,2.9,.3,.1,'#293b34',M.wood);
  for(const x of [5.84,6.16])c(x,1.18,9.82,.026,.38,.026,'#b79d62',M.metal);
  b(6,.006,9.06,2.3,.013,1.15,'#383e36',M.fabric,noShadow);
  // Street beyond the windows, deliberately simple and outside the playable room.
  const streetExtra=building.width-12;
  b(6+streetExtra/2,-.08,11.1,20+streetExtra,.14,2.1,'#92928a',M.tile,noShadow);
  b(6+streetExtra/2,-.18,14.3,25+streetExtra,.13,4.2,'#424c50',0,noShadow);
  b(6+streetExtra/2,-.08,16.8,25+streetExtra,.14,1.5,'#94968f',M.tile,noShadow);
  for(let x=-3;x<17+streetExtra;x+=3.4){
   b(x,4.2,18,3.35,8.4,.4,['#77665b','#637073','#827869'][Math.abs(Math.round(x*10))%3],M.brick,noShadow);
   for(let y=1.2;y<8;y+=2.15){
    b(x,y,17.72,1.7,1.5,.14,'#272f32',M.metal,noShadow);
    b(x,y,17.62,1.48,1.29,.04,y<2?'#b5a076':'#53656c',M.glass,noShadow);
    b(x,y,17.57,.045,1.3,.045,'#252f31',M.metal,noShadow);
    b(x,y,17.57,1.5,.045,.045,'#252f31',M.metal,noShadow);
   }
  }
  // Back bar cabinetry, three bays with varied glass bottles and readable signs.
  for(const x of [3,6,9]){
   b(x,.47,.52,2.72,.94,.82,'#443e32',M.wood,solid);
   b(x,.97,.54,2.83,.08,.94,'#a59d87',M.tile);
   for(const dx of [-.65,.65]){
    b(x+dx,.47,.944,1.23,.79,.035,chairColors.back,M.wood);
    b(x+dx,.77,.975,.23,.026,.035,'#b9a576',M.metal);
   }
   b(x,2.0,.23,2.74,1.95,.12,'#25342f',M.wood);
   for(const dx of [-1.4,1.4])b(x+dx,1.99,.43,.075,2.0,.5,'#65563e',M.wood);
   for(const y of [1.12,1.78,2.43]){
    // The low shelf is recessed: usable bottles sit in front on the worktop.
    b(x,y,y===1.12?.42:.52,2.83,.055,y===1.12?.45:.67,'#74604a',M.wood);
    b(x,y-.037,.72,2.65,.014,.035,'#ddc38c',M.light,noShadow);
    for(let j=0;y>1.12&&j<8;j++){
     const col=['#3f5640','#614b2c','#3b4f46','#653e36'][j%4];
     bottle(g,x-1.16+j*.33,y+.03,.56,col,.84+(j%3)*.08,['MAISON','RESERVE','VIGNE','AMBRE'][j%4]);
    }
   }
  }
  preparationFixtures(items);
  b(6,3.02,.82,5.15,.34,.06,'#293a33',M.wood,{label:'LE PETIT COMPTOIR',labelFace:'back',labelFont:'Georgia, serif',labelColor:'#f0dfb9',castShadow:false});
  // A narrow service counter with timber slats and brass foot rail.
  b(6,.5,3.02,8.8,1,.9,'#3f3329',M.wood,solid);
  b(6,1.045,3.03,9.04,.09,1.12,'#42453e',M.stone,solid);
  b(6,1.094,3.03,9.0,.016,1.09,'#53564d',M.stone);
  c(6,1.07,3.584,.026,9.02,.026,'#8c7750',M.metal,{rz:Math.PI/2});
  b(6,.08,3.51,8.85,.15,.055,'#202b28',M.metal);
  for(let x=1.72;x<10.4;x+=.13)b(x,.54,3.49,.065,.83,.04,'#796047',M.wood);
  c(6,.26,3.79,.044,8.5,.044,'#ae8a4d',M.metal,{rz:Math.PI/2});
  for(const x of [2.1,4.7,7.3,9.9])c(x,.22,3.64,.027,.33,.027,'#a88a52',M.metal,{rx:Math.PI/2});
  // A shorter return leaves a comfortable passage behind the bar to the reserve.
  b(1.75,.5,2.45,.7,1,1,'#45392c',M.wood,solid);
  b(1.75,1.045,2.45,.93,.09,1.1,'#53564d',M.stone,solid);
  // Beer taps face the staff aisle (-Z), with the glass and drip tray below the outlets.
  b(4.18,1.11,2.85,.92,.025,.5,'#343d3b',M.metal);
  for(let i=0;i<11;i++)b(3.82+i*.073,1.129,2.85,.014,.006,.35,'#a7b4ab',M.metal);
  c(4.15,1.45,2.95,.075,.68,.075,'#b59b60',M.metal);
  c(4.15,1.126,2.95,.15,.031,.15,'#9d824c',M.metal);
  c(4.15,1.157,2.95,.105,.023,.105,'#bba26b',M.metal);
  c(4.15,1.78,2.95,.075,.85,.075,'#b59b60',M.metal,{rz:Math.PI/2});
  for(const dx of [-.35,0,.3]){
   c(4.15+dx,1.72,2.82,.045,.22,.045,'#b59b60',M.metal,{rx:Math.PI/2});
   c(4.15+dx,1.67,2.72,.035,.11,.035,'#aeb8af',M.metal);
   c(4.15+dx,1.707,2.72,.057,.025,.057,'#9aab9f',M.metal);
   c(4.15+dx,1.62,2.72,.039,.015,.039,'#5a6960',M.metal);
   c(4.15+dx,1.88,2.84,.055,.24,.055,'#34332c',M.wood,{topRadius:.78});
   s(4.15+dx,2.01,2.84,.075,.065,.075,'#bdaa7f',M.metal);
   c(4.15+dx,1.895,2.810,.041,.006,.041,'#d9cfb4',M.paint,{rx:Math.PI/2});
  }
  // Espresso station has a recessed brewing bay, separated from the drip tray.
  b(8.75,1.42,3.13,1.28,.62,.32,'#283c38',M.metal);
  b(8.75,1.57,2.87,1.28,.32,.62,'#283c38',M.metal);
  b(8.75,1.58,2.544,1.18,.27,.025,'#adb7ac',M.metal);
  for(const x of [8.15,9.35])b(x,1.28,2.9,.08,.34,.5,'#334640',M.metal);
  b(8.75,1.125,2.77,1.31,.04,.98,'#a7afa4',M.metal);
  for(let i=0;i<16;i++)b(8.18+i*.075,1.149,2.49,.012,.006,.34,'#485b53',M.metal);
  for(const dx of [-.32,.32]){
   c(8.75+dx,1.60,2.517,.105,.018,.105,'#dfd7b8',0,{rx:Math.PI/2});
   b(8.75+dx,1.60,2.504,.007,.065,.006,'#4b5248',0,{rz:.45});
   for(let tick=0;tick<8;tick++){const a=tick*Math.PI/4;b(8.75+dx+Math.sin(a)*.037,1.60+Math.cos(a)*.037,2.505,.002,.009,.003,'#565d50',M.paint,{rz:-a,castShadow:false});}
   c(8.75+dx,1.415,2.55,.11,.095,.11,'#929d96',M.metal);
   c(8.75+dx,1.35,2.47,.025,.04,.025,'#a8b8ab',M.metal);
   c(8.75+dx,1.419,2.4,.035,.23,.035,'#222e29',0,{rx:Math.PI/2});
  }
  b(8.75,1.739,2.98,1.2,.018,.5,'#a8b2a7',M.metal);
  for(const dx of [-.4,0,.4])glass(g,'coffee',8.75+dx,1.748,2.98,0);
  b(9.76,1.3,2.93,.28,.4,.33,'#47504a',M.metal);
  c(9.76,1.65,2.93,.28,.3,.28,'#58412e',M.glass,{topRadius:.85});
  c(9.76,1.8175,2.93,.3,.035,.3,'#252e29');
  // Preparation utensils, cutting board, produce and register.
  for(const point of globalThis.BarEngine?.preparationSlots?.filter(slot=>slot.kind==='cocktails')||[{x:6.5,y:1.133,z:3.05},{x:5.85,y:1.133,z:3.05}]){
   b(point.x,point.y-.017,point.z,.52,.034,.40,'#ac9261',M.wood);
   for(const dx of [-.235,.235])b(point.x+dx,point.y+.001,point.z,.009,.002,.35,'#80683f',M.wood,{castShadow:false});
   for(const dz of [-.175,.175])b(point.x,point.y+.001,point.z+dz,.47,.002,.009,'#80683f',M.wood,{castShadow:false});
  }
  // Four tray places stay clear of both working boards and the customer glasses.
  b(5.11,1.115,3.01,.74,.036,.68,'#a18c5e',M.metal);
  b(5.11,1.133,3.01,.70,.002,.64,'#344e43',M.fabric,{castShadow:false});
  for(const x of [4.75,5.47])b(x,1.146,3.01,.02,.027,.68,'#b8a275',M.metal);
  for(const z of [2.68,3.34])b(5.11,1.146,z,.74,.027,.02,'#b8a275',M.metal);
  b(7.96,1.115,2.61,.20,.018,.30,'#b6b69c',M.fabric,{ry:-.12});
  c(7.2,1.22,3.02,.18,.25,.18,'#aeb7aa',M.metal,{topRadius:.8});
  c(7.47,1.19,3.02,.14,.18,.14,'#abb3a8',M.metal);
  // Cash drawer and till face the staff aisle (-Z), with the display tilted
  // upward toward the barman. The room sees the monitor's closed back.
  b(2.65,1.17,2.94,.68,.15,.53,'#26332f',M.metal);
  b(2.65,1.26,3.0,.42,.035,.29,'#33433b',M.metal);
  b(2.65,1.405,3.0,.10,.30,.09,'#38433e',M.metal);
  b(2.65,1.59,2.97,.68,.43,.055,'#1c302b',M.paint,{rx:.22});
  b(2.65,1.597,2.938,.595,.335,.009,'#234d3c',M.paint,{rx:.22,label:'CAISSE\nENCAISSER',labelFace:'front',labelColor:'#edf4df',castShadow:false});
  // The cordless terminal rests beside the till until the player picks it up.
  b(3.25,1.12,2.65,.185,.035,.27,'#273532',M.metal);
  for(const dx of [-.082,.082])c(3.25+dx,1.12,2.65,.023,.035,.27,'#273532',M.metal);
  b(3.25,1.139,2.65,.159,.006,.239,'#141d1b',M.paint);
  for(const dx of [-.061,.061])for(const dz of [-.094,.094])c(3.25+dx,1.142,2.65+dz,.018,.006,.018,'#37413b',M.paint);
  for(const dx of [-.018,.018])c(3.25+dx,1.144,2.69,.006,.005,.006,'#bbac70',M.metal);
  b(3.25,1.126,2.512,.027,.005,.002,'#8ab9a1',M.light,noShadow);
  // Illuminated bottle fridge by the wall.
  b(10.96,1.04,.75,1.15,2.08,1.12,'#253330',M.metal,solid);
  b(10.96,1.11,1.32,.97,1.67,.025,'#c5d1bc',M.light);
  for(const y of [.38,.79,1.2,1.61]){
   b(10.96,y,1.48,.94,.022,.27,'#76897f',M.metal);
   for(let j=0;j<5;j++)bottle(g,10.6+j*.18,y+.02,1.43,['#587952','#9f713b','#455c69'][j%3],.58,'');
  }
  for(const x of [10.43,11.49])b(x,1.08,1.54,.045,1.98,.055,'#273835',M.metal);
  b(10.96,2.04,1.38,1.05,.15,.09,'#344b46',0,{label:'FRAÎCHEUR',labelFace:'back'});
  c(11.43,1.14,1.6,.027,.46,.027,'#c1c7b7',M.metal);
  // Bistro tables and upholstered chairs with believable leg dimensions.
  function chair(x,z,angle=0){
   const sin=Math.sin(angle),cos=Math.cos(angle);
   const p=(dx,dz)=>[x+dx*cos+dz*sin,z-dx*sin+dz*cos];
   let [xx,zz]=p(0,0);b(xx,.48,zz,.48,.075,.47,chairColors.seat,seatMaterial,{solid:true,ry:angle});
   [xx,zz]=p(0,.21);b(xx,.78,zz,.47,.48,.055,chairColors.back,M.wood,{solid:true,ry:angle});
   // Local +Z is the back: its uprights meet the outer face of the backrest,
   // continuing down to the rear feet without protruding into the seat.
   for(const dx of [-.19,.19])for(const [dz,h] of [[-.18,.46],[.24,.99]]){[xx,zz]=p(dx,dz);b(xx,h/2,zz,.038,h,.038,chairColors.frame,M.metal,{ry:angle})}
  }
  for(const {id,x,z,y=0} of activeTables){
   const first=items.length;
   c(x,.75,z,1.05,.065,1.05,table.top,tableMaterial,{solid:true,sideColor:table.edge,decorCategory:'tables'});
   c(x,.38,z,.075,.72,.075,table.base,M.metal);
   c(x,.04,z,.53,.05,.53,table.base,M.metal);
   chair(x-.78,z,-Math.PI/2);chair(x+.78,z,Math.PI/2);
   c(x,.818,z,.09,.07,.09,'#b2a890');c(x,.9,z,.025,.16,.025,'#72804b');
   for(let leaf=0;leaf<5;leaf++){const a=leaf*2.4;s(x+Math.sin(a)*.046,.91+leaf*.018,z+Math.cos(a)*.04,.078,.012,.036,['#6a7c51','#4d6843','#7b8a5c'][leaf%3],M.paint,{ry:a,rz:.32*Math.sin(a)});}
   b(x-.2,.787,z+.18,.2,.008,.14,'#d7cdb4');
   const inward=x<6?1:-1,signAngle=-inward*Math.PI/2;
   b(x+inward*.26,.794,z-.18,.24,.015,.07,'#867854',M.metal,{ry:signAngle});
   b(x+inward*.26,.85,z-.18,.23,.10,.018,'#203e30',M.paint,{ry:signAngle,label:'TABLE '+id,labelColor:'#f2e8c9',labelPixels:256,castShadow:false});
   if(y)for(let index=first;index<items.length;index++)items[index].y+=y;
  }
  // All six stools exist from the start. Progression only changes which seats
  // guests use; the backrests face the room and leave the serving aisle clear.
  for(const {x,z} of counterLocations){
   c(x,.735,z,.43,.035,.43,'#4b4031',M.wood);
   c(x,.795,z,.47,.09,.47,chairColors.seat,seatMaterial,{solid:true});
   c(x,.764,z,.474,.009,.474,'#ad8964',M.fabric);
   for(const dx of [-.175,.175])for(const dz of [-.175,.175]){
    c(x+dx,.36,z+dz,.033,.72,.033,chairColors.frame,M.metal,{solid:true,topRadius:1.2});
    c(x+dx,.012,z+dz,.043,.024,.043,'#27302a',M.paint);
   }
   // The rear uprights meet the outer face, never protruding into the cushion.
   for(const dx of [-.185,.185]){
    c(x+dx,.94,z+.258,.026,.43,.026,chairColors.frame,M.metal);
    b(x+dx,.742,z+.211,.027,.025,.12,chairColors.frame,M.metal);
    b(x+dx,.3225,z-.265,.025,.024,.17,'#a78c54',M.metal);
   }
   b(x,1.045,z+.22,.44,.21,.05,chairColors.back,M.wood);
   b(x,1.048,z+.191,.40,.155,.018,chairColors.seat,seatMaterial);
   c(x,.3225,z-.35,.024,.40,.024,'#a78c54',M.metal,{rz:Math.PI/2});
   c(x,.3225,z+.175,.023,.35,.023,chairColors.frame,M.metal,{rz:Math.PI/2});
  }
  // Framed menu, wall art, clocks and pendant lamps.
  b(.24,2.1,4.35,.055,1.25,1.5,'#473f31',M.wood);
  b(.28,2.1,4.35,1.35,1.1,.025,'#263b32',0,{ry:-Math.PI/2,label:'LA CARTE\nPression  5 €\nVin rouge  6 €\nEspresso  3 €\nMojito  10 €'});
  for(const [z,word] of [[building.level?3.75:4.75,'CAFÉ\nDE QUARTIER'],[7.6,'LES BELLES\nSOIRÉES']]){
   b(11.84,2.03,z,.055,1.0,.77,'#4b4436',M.wood);
   b(11.8,2.03,z,.63,.87,.02,'#a79266',0,{ry:Math.PI/2,label:word,labelColor:'#263b34'});
  }
  c(10.96,2.65,.2,.49,.055,.49,'#b8ac8c',M.metal,{rx:Math.PI/2});
  c(10.96,2.65,.235,.43,.015,.43,'#e0d6bb',0,{rx:Math.PI/2});
  b(10.96,2.73,.25,.016,.17,.015,'#394137');b(11.015,2.64,.25,.12,.015,.015,'#394137');
  for(const x of [3,6,9]){
   c(x,3.04,4.65,.018,.65,.018,'#273632',M.metal,noShadow);
   c(x,2.68,4.65,.61,.22,.61,'#364137',M.metal,{topRadius:.32});
   c(x,2.555,4.65,.54,.016,.54,'#f2d799',M.light,noShadow);
   s(x,2.53,4.65,.11,.08,.11,'#f9e4b7',M.light,noShadow);
  }
  // Keep the stockroom entrance clear; the street-side plant stays in its corner.
  c(11.15,.24,9.15,.43,.48,.43,'#7b5a42',0,{topRadius:1.14});
  c(11.15,.57,9.15,.025,.44,.025,'#536243');
  for(let i=0;i<11;i++){const a=i*2.4;s(11.15+Math.sin(a)*.16,.61+(i%4)*.09,9.15+Math.cos(a)*.16,.24,.11,.12,['#526748','#637650','#405b42'][i%3],0,{ry:a,rz:.25*Math.sin(a)})}
  return items;
 }
 function storageVisuals(items,state){
  const g=geometry(items),reserve=state?.reserve||{};
  for(const bin of storageBins){
   const quantity=Math.max(0,Number(reserve[bin.key])||0),count=Math.min(3,Math.ceil(quantity/bin.pack));
   for(let i=0;i<count;i++){
    const x=bin.side?bin.x:bin.x+(i-1)*.28,y=bin.y,z=bin.side?bin.z+(i-1)*.22:-3.76;
    if(bin.kind==='keg'){
     g.cylinder(x,y+.225,z,.24,.45,.24,bin.color,M.metal);
     for(const h of [.045,.405])g.cylinder(x,y+h,z,.257,.025,.257,'#b0b9ab',M.metal);
     g.cylinder(x,y+.456,z,.08,.018,.08,'#5f7166',M.metal);
    }else if(bin.kind==='bottle')bottle(g,x,y,z,bin.color,.96,'');
    else if(bin.kind==='produce'){
     g.box(x,y+.09,z,.25,.18,.34,'#8d7d58',M.wood);
     for(let j=0;j<4;j++)g.sphere(x+(j%2-.5)*.09,y+.20,z+(Math.floor(j/2)-.5)*.12,.105,.075,.11,bin.color);
    }else{
     g.box(x,y+.17,z,.22,.34,.29,bin.color,0);
     g.box(x,y+.17,z+.148,.15,.15,.005,'#d9d4b7',0,{castShadow:false});
    }
   }
  }
 }
 function terminal(items,{x=3.25,y=1.175,z=2.65,angle=0,pitch=0,status='ready',amount=null}={}){
  const source=geometry(items),cs=Math.cos(angle),sn=Math.sin(angle),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const b=(dx,dy,dz,w,h,d,color,mat=0,extra={})=>{
   const py=dy*cp-dz*sp,pz=dy*sp+dz*cp;
   source.box(x+dx*cs+pz*sn,y+py,z-dx*sn+pz*cs,w,h,d,color,mat,{...extra,ry:angle,rx:pitch,castShadow:false});
  };
  const rounded=(dx,dy,dz,w,h,d,r,color,mat=M.paint)=>{
   b(dx,dy,dz,w-2*r,h,d,color,mat);b(dx,dy,dz,w,h,d-2*r,color,mat);
   for(const sx of [-1,1])for(const sz of [-1,1])b(dx+sx*(w/2-r),dy,dz+sz*(d/2-r),r*2,h,r*2,color,mat,{round:true});
  };
  // A moulded shell with a rubber bumper, seam and inset faceplate.
  rounded(0,-.005,0,.169,.043,.263,.018,'#1b2525');
  rounded(0,.012,0,.165,.018,.258,.017,'#626c69',M.metal);
  rounded(0,.022,0,.159,.015,.252,.015,'#323d3c');
  rounded(0,.030,0,.149,.004,.239,.013,'#222d2b');
  for(const side of [-1,1]){
   b(side*.083,-.002,.055,.003,.009,.055,'#101a19');
   for(const dz of [-.084,.087])b(side*.060,-.027,dz,.016,.004,.019,'#111a18');
  }
  // Flush screen glass sits inside the bezel, rather than above the enclosure.
  rounded(0,.032,.055,.139,.005,.103,.007,'#0e1d1a');
  b(0,.035,.055,.126,.001,.090,terminalScreen,M.light);
  const text=(template,dx,dz)=>b(dx,.036,dz,template.w,template.h,template.d,template.c,M.paint,template);
  text(terminalLabelTemplates[0],0,.090);
  text(terminalLabelTemplates[status==='processing'?2:status==='approved'?3:1],0,.073);
  const segments={0:'abcedf',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc',8:'abcdefg',9:'abfgcd'};
  function digit(character,cx,cz,width,height,y,color){
   const thickness=width*.18,parts=segments[character]||'';
   for(const part of parts){
    const horizontal='adg'.includes(part),sx='fe'.includes(part)?-1:'bc'.includes(part)?1:0,sz=part==='a'?1:part==='d'?-1:part==='g'?0:'fb'.includes(part)?.5:-.5;
    b(cx+sx*width/2,y,cz+sz*height/2,horizontal?width:thickness,.001,horizontal?thickness:height/2-thickness,color);
   }
  }
  // Amount digits are geometry, so an evening's distinct bills cannot grow the label atlas.
  const value=Number.isFinite(amount)&&amount>=0?Math.min(999.99,amount).toFixed(2):'0.00';
  const advance=.014,start=-.022-(value.length-4)*advance/2;
  for(let i=0;i<value.length;i++){
   if(value[i]==='.')b(start+i*advance,.0365,.031,.0025,.001,.0025,terminalInk);
   else digit(value[i],start+i*advance,.043,.009,.021,.0365,terminalInk);
  }
  text(terminalLabelTemplates[4],.047,.042);
  // Contactless radio waves and battery level stay readable at normal hand distance.
  for(let wave=0;wave<3;wave++)for(let part=0;part<11;part++){
   const a=-.8+part*.16,r=.003+wave*.003;
   b(-.047+Math.cos(a)*r,.037,.019+Math.sin(a)*r,.0012,.001,.0012,terminalInk);
  }
  b(.044,.037,.019,.017,.001,.007,terminalInk);b(.054,.037,.019,.003,.001,.003,terminalInk);b(.043,.038,.019,.011,.001,.0035,'#77ae91');
  const keyLabels=['1','2','3','4','5','6','7','8','9','*','0','#'];
  for(let row=0;row<4;row++)for(let col=0;col<3;col++){
   const kx=(col-1)*.045,kz=-.012-row*.026,label=keyLabels[row*3+col];
   rounded(kx,.035,kz,.034,.007,.021,.004,'#aeb6b0');
   if(/[0-9]/.test(label))digit(label,kx,kz,.006,.011,.0393,'#1b2d27');
   else if(label==='#'){
    for(const offset of [-.002,.002]){b(kx+offset,.0393,kz,.001,.001,.012,'#1b2d27');b(kx,.0393,kz+offset,.009,.001,.001,'#1b2d27');}
   }else{
    b(kx,.0393,kz,.009,.001,.0012,'#1b2d27');b(kx,.0393,kz,.0012,.001,.010,'#1b2d27');
    for(const offset of [-.0025,.0025])b(kx+offset,.0393,kz+offset,.002,.001,.002,'#1b2d27');
   }
  }
  for(const [col,color]of ['#a84f41','#b7a260','#568f6c'].entries())rounded((col-1)*.045,.035,-.115,.034,.007,.016,.004,color);
  // Cancel, correction and confirmation symbols are inset into their coloured keys.
  for(const offset of [-.003,0,.003]){b(-.045+offset,.0393,-.115+offset,.0024,.001,.0024,'#f1ede1');b(-.045+offset,.0393,-.115-offset,.0024,.001,.0024,'#f1ede1');}
  b(0,.0393,-.115,.012,.001,.0015,'#f1ede1');b(-.005,.0393,-.113,.002,.001,.004,'#f1ede1');
  for(const [dx,dz]of [[-.004,0],[-.002,-.002],[0,0],[.002,.002],[.004,.004]])b(.045+dx,.0393,-.115+dz,.0023,.001,.0023,'#edf1df');
  // Card insertion slot on the operator-facing edge and side power key.
  b(0,-.004,-.132,.082,.011,.0015,'#080f10');b(0,-.002,-.133,.063,.004,.001,'#56615e',M.metal);
  b(.084,.010,-.037,.003,.012,.023,'#6e7d76',M.metal);
  b(-.058,.035,.112,.006,.001,.003,status==='processing'?'#ddb664':'#78b298',M.light);
 }
 function registerVisuals(items,state,{open=false}={}){
  const {box:b,cylinder:c}=geometry(items),z=open?2.59:2.94;
  // Open tray extends toward the barman, with separate note/coin compartments.
  b(2.65,1.122,z,.615,.016,.46,'#354239',M.metal);
  for(const x of [2.345,2.955])b(x,1.157,z,.013,.07,.46,'#475347',M.metal);
  b(2.65,1.157,z-.225,.625,.075,.018,'#36453b',M.metal);
  b(2.65,1.16,z-.24,.15,.026,.025,'#b2aa84',M.metal);
  if(open){
   for(const x of [2.51,2.66,2.81])b(x,1.145,z,.012,.035,.41,'#17251d',M.paint);
   b(2.65,1.145,z-.07,.59,.035,.012,'#17251d',M.paint);
   for(const [i,color]of ['#a5ae82','#aab4c3','#c2aa85','#a9b695'].entries()){
    b(2.43+i*.15,1.142,z+.06,.10,.008,.16,color,M.paint);
    b(2.43+i*.15,1.149,z+.06,.009,.008,.15,'#657868',M.metal);
    for(let coin=0;coin<3;coin++)c(2.42+i*.15+(coin%2)*.04,1.145+Math.floor(coin/2)*.008,z-.15,.027,.007,.027,i%2?'#b4aa72':'#bdc0aa',M.metal);
   }
  }
  if(!state?.payments?.terminalCarried&&!state?.payments?.terminalWithWaiter)terminal(items);
 }
 function customer(items,{x,y:floorY=0,z,id,time,moving,departing=false,patience=100,seated=false,seatHeight,angle,staffKind,carrying=false,carryingTerminal=false}){
  const g=geometry(items),skin=['#c4916d','#956c51','#d4b191','#b18061'][id%4];
  const shirt=staffKind?({manager:'#674d5d',dj:'#424969',host:'#3c4f59'}[staffKind]||'#d1d0b8'):['#555f61','#815c4b','#6b7058','#525f74','#927e68'][id%5];
  const hair=['#45352a','#302c26','#8b7750','#62564b'][id%4];
  const highSeat=seated&&Number.isFinite(seatHeight)&&seatHeight>.7;
  const turn=Number.isFinite(angle)?angle:departing?Math.PI:0,cs=Math.cos(turn),sn=Math.sin(turn),bob=!seated&&moving?Math.sin(time*11+id)*.012:Math.sin(time*1.7+id)*.006,seatOffset=seated?(Number.isFinite(seatHeight)?seatHeight-.7825:-.265):0;
  const characterBounds={x,y:floorY+1,z,radius:1.35};
  const original=g.box;
  g.box=(ox,y,oz,w,h,d,c,mat=0,extra={})=>original(x+ox*cs+oz*sn,floorY+y+bob+seatOffset,z-ox*sn+oz*cs,w,h,d,c,mat,{...extra,characterBounds,...(extra.contactShadow?{contactFloor:floorY}:{}),ry:(extra.ry||0)+turn});
  g.cylinder=(...args)=>{args[8]={...args[8],round:true};return g.box(...args)};
  g.sphere=(...args)=>{args[8]={...args[8],shape:'sphere'};return g.box(...args)};
  const {box:b,cylinder:c,sphere:s}=g;
  const armSegment=(a,end,width,depth,color)=>{
   const dx=end.x-a.x,dy=end.y-a.y,dz=end.z-a.z;
   c((a.x+end.x)/2,(a.y+end.y)/2,(a.z+end.z)/2,width,Math.hypot(dx,dy,dz),depth,color,color===skin?M.skin:M.fabric,{rx:Math.atan2(Math.hypot(dx,dz),dy),ry:Math.atan2(dx,dz)});
  };
  // A shaped rib cage, waist and sloping shoulders replace the old barrel torso.
  // Their silhouettes overlap beneath the clothing, with no exposed flat cap.
  s(0,1.14,.004,.50,.50,.265,shirt,M.fabric,{contactShadow:true});
  c(0,.935,.004,.31,.18,.22,shirt,M.fabric,{topRadius:1.07,bottomRadius:1.02});
  s(0,.852,.004,.34,.17,.24,'#333f43',M.fabric);
  c(0,.879,.004,.329,.027,.235,'#373c35',M.fabric);
  // Faces point towards local -Z. Layer the features beyond the skull surface:
  // putting the eyes at the skull centreline used to hide them inside the head.
  c(0,1.38,.014,.112,.10,.12,skin,M.skin);
  {
   // Lower the head into the neck without changing shoulders or seated poses.
   const s=(ox,y,...args)=>g.sphere(ox,y-.03,...args);
   const c=(ox,y,...args)=>g.cylinder(ox,y-.03,...args);
   const b=(ox,y,...args)=>g.box(ox,y-.03,...args);
   const faceShade=['#ad7b5c','#80583f','#bd987b','#976b50'][id%4];
   const lips=['#976451','#745044','#ac7767','#875b4b'][id%4];
   const iris=['#555e4d','#513c2b','#5e6971','#635135'][id%4];
   s(0,1.565,0,.202,.268,.210,skin,M.skin);
   s(0,1.492,.008,.164,.12,.170,skin,M.skin);
   for(const side of [-1,1]){
    s(side*.099,1.565,.005,.030,.061,.040,skin,M.skin);
    c(side*.109,1.567,-.006,.009,.003,.027,faceShade,M.skin,{rz:Math.PI/2,rx:.18});
    // The whites are mostly covered by the lids, with small, inset irises.
    const eyeAngle=-side*.42;
    s(side*.0415,1.593,-.092,.034,.012,.015,'#d6d1bc',M.skin,{ry:eyeAngle});
    c(side*.0415,1.593,-.0995,.010,.0015,.010,iris,M.skin,{rx:Math.PI/2});
    c(side*.0415,1.593,-.1003,.0045,.001,.0045,'#242720',M.skin,{rx:Math.PI/2});
    s(side*.0415,1.599,-.089,.039,.006,.015,skin,M.skin,{ry:eyeAngle});
    s(side*.0415,1.587,-.089,.038,.005,.014,skin,M.skin,{ry:eyeAngle});
    b(side*.042,1.611,-.090,.038,.004,.007,hair,M.fabric,{ry:eyeAngle,rz:side*.08});
   }
   s(0,1.574,-.097,.022,.059,.027,skin,M.skin);
   s(0,1.55,-.109,.027,.023,.026,skin,M.skin);
   for(const side of [-1,1]){
    s(side*.010,1.546,-.100,.017,.014,.022,skin,M.skin);
    c(side*.009,1.541,-.111,.005,.0015,.003,faceShade,M.skin,{rx:1.15});
   }
   s(0,1.519,-.095,.050,.006,.013,lips,M.skin);
   s(0,1.512,-.094,.048,.007,.015,lips,M.skin);
   b(0,1.515,-.102,.043,.0014,.0015,faceShade,M.skin);
   // A shared scalp with a few broad locks gives distinct silhouettes at low cost.
   s(0,1.663,.029,.208,.108,.202,hair,M.fabric);
   s(0,1.602,.084,.178,.137,.071,hair,M.fabric);
   const hairStyle=id%4;
   if(hairStyle===0){
    s(-.035,1.671,-.044,.144,.055,.101,hair,M.fabric,{rz:-.16});
    s(.068,1.64,-.005,.055,.086,.13,hair,M.fabric);
   }else if(hairStyle===1){
    for(const side of [-1,1])s(side*.087,1.604,.034,.042,.132,.107,hair,M.fabric);
    s(0,1.626,.124,.11,.099,.093,hair,M.fabric);
   }else if(hairStyle===2){
    s(.025,1.677,-.043,.17,.067,.112,hair,M.fabric,{rz:.10});
    s(-.074,1.638,.009,.049,.085,.128,hair,M.fabric);
   }else{
    for(const side of [-1,1])s(side*.09,1.628,.032,.037,.086,.112,hair,M.fabric);
   }
  }
  // A fitted neckline avoids floating collar rectangles cutting into the chest.
  c(0,1.381,.014,.132,.016,.14,shirt,M.fabric,{topRadius:.94});
  for(const side of [-1,1]){
   s(side*.172,1.28,.018,.16,.11,.12,shirt,M.fabric,{rz:side*.16});
   // A sleeve-sized round cap covers the arm's flat cylinder end at its joint.
   s(side*((carrying||carryingTerminal)&&!seated?.21:.245),1.305,0,.115,.07,.13,shirt,M.fabric);
   const stride=!seated&&moving?Math.sin(time*7.2+id+side*1.57)*.34:0;
   const kneeZ=seated?-.35:Math.sin(stride)*.39,kneeY=seated?(highSeat?.865:.81):.865-Math.cos(stride)*.39;
   c(side*.105,(.865+kneeY)/2,kneeZ/2,.15,Math.hypot(.865-kneeY,kneeZ),.16,'#38444a',M.fabric,{rx:seated?Math.atan2(-kneeZ,.865-kneeY):-stride,topRadius:1.12});
   s(side*.105,kneeY,kneeZ,.13,.12,.14,'#354147',M.fabric);
   const lower=stride+Math.max(0,-stride)*.8,ankleZ=seated?kneeZ:kneeZ+Math.sin(lower)*.38,ankleY=seated?.34:kneeY-Math.cos(lower)*.38;
   c(side*.105,(kneeY+ankleY)/2,(kneeZ+ankleZ)/2,.108,Math.hypot(kneeY-ankleY,kneeZ-ankleZ),.12,'#354147',M.fabric,{rx:seated?0:-lower,topRadius:1.15});
   s(side*.105,Math.max(.055,ankleY-.015),ankleZ-.055,.13,.1,.25,'#30332d',0);
   if(carryingTerminal&&!seated){
    const shoulder={x:side*.21,y:1.31,z:0},elbow={x:side*.20,y:1.09,z:-.10},wrist={x:side*.095,y:1.17,z:-.28};
    armSegment(shoulder,elbow,.115,.13,shirt);s(elbow.x,elbow.y,elbow.z,.104,.105,.105,skin,M.skin);
    armSegment(elbow,wrist,.085,.095,skin);s(wrist.x,wrist.y,wrist.z,.063,.055,.10,skin,M.skin);
   }else if(carrying&&!seated){
    // Both hands support a tray at local (0,1.10,-.34), clear of the torso.
    const shoulder={x:side*.21,y:1.31,z:0},elbow={x:side*.20,y:1.08,z:-.15},wrist={x:side*.145,y:1.05,z:-.34};
    armSegment(shoulder,elbow,.115,.13,shirt);s(elbow.x,elbow.y,elbow.z,.104,.105,.105,skin,M.skin);
    armSegment(elbow,wrist,.085,.095,skin);s(wrist.x,1.06,-.34,.09,.055,.10,skin,M.skin);
   }else if(highSeat){
    // Rest the hands on the thighs while sitting back from the counter.
    const shoulder={x:side*.245,y:1.31,z:0},elbow={x:side*.245,y:1.08,z:-.09},wrist={x:side*.13,y:.92,z:-.29};
    armSegment(shoulder,elbow,.115,.13,shirt);s(elbow.x,elbow.y,elbow.z,.104,.105,.105,skin,M.skin);
    armSegment(elbow,wrist,.085,.095,skin);s(wrist.x,wrist.y,wrist.z,.07,.055,.10,skin,M.skin);
   }else{
    const swing=moving?-stride*.8:(patience<30?Math.sin(time*2.8)*.12:.02),elbowY=seated?1.1:1.31-Math.cos(swing)*.27,elbowZ=seated?-.19:Math.sin(swing)*.27;
    c(side*.245,(1.31+elbowY)/2,elbowZ/2,.115,Math.hypot(1.31-elbowY,elbowZ),.13,shirt,M.fabric,{rx:seated?Math.atan2(-elbowZ,1.31-elbowY):-swing});
    s(side*.245,elbowY,elbowZ,.104,.105,.105,skin,M.skin);
    if(seated){
     c(side*.245,1.11,-.29,.085,Math.hypot(.02,.20),.095,skin,M.skin,{rx:Math.atan2(.20,-.02),topRadius:1.08});
     s(side*.245,1.12,-.40,.085,.055,.10,skin,M.skin);
    }else{
     c(side*.245,elbowY-.13,elbowZ-.02,.085,.26,.095,skin,M.skin,{rx:.12,topRadius:1.08});
     s(side*.245,elbowY-.285,elbowZ-.04,.085,.11,.05,skin,M.skin);
    }
   }
  }
  for(let y=.98;y<1.28;y+=.087){const chest=.1325*Math.sqrt(Math.max(0,1-((y-1.14)/.25)**2)),waist=y<1.025?.118:0;b(0,y,.004-Math.max(chest,waist)-.004,.009,.009,.006,'#bfb79e',M.paint);}
  if(staffKind==='dj'){
   for(const side of [-1,1]){b(side*.114,1.54,.016,.028,.075,.065,'#1f252d',M.metal);b(side*.114,1.62,.02,.018,.10,.026,'#1f252d',M.metal);}
   b(0,1.682,.02,.23,.018,.026,'#1f252d',M.metal);
  }else if(staffKind==='manager'||staffKind==='host'){
   b(-.10,1.22,-.125,.085,.035,.007,'#d7c39a',M.metal);
  }else if(staffKind){
   const apron=staffKind==='bartender'?'#254c3a':'#43566a';
   b(0,1.16,-.138,.25,.28,.014,apron,M.fabric);
   b(0,.90,-.145,.34,.28,.020,apron,M.fabric);
   for(const side of [-1,1])b(side*.085,1.31,-.078,.024,.12,.012,apron,M.fabric,{rz:side*.16,rx:.62});
   b(0,.92,-.16,.16,.085,.008,'#b2a888',M.fabric);
  }
 }
 return {create,geometry,bottle,glass,customer,storageVisuals,preparationVisuals,registerVisuals,terminal,terminalLabelTemplates,tableSeat,counterSeat,prepStation,trayPosition,walkSurfaceHeight,containsWalkablePosition,inStockroom,playCamera,homeCamera,stockroomCamera,materials:M};
})();
