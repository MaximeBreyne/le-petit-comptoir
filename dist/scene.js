/* Original shop geometry. Dimensions are in metres; static meshes are uploaded once. */
const BarScene=(()=>{
 const M={paint:0,wood:1,tile:2,plaster:3,brick:4,metal:5,glass:6,light:7,fabric:8,skin:9,floor:10};
 const playCamera={x:6,y:1.68,z:1.55,a:0,pitch:-.06};
 const homeCamera={x:10.5,y:1.72,z:8.5,a:3.91,pitch:-.045};
 const stockroomCamera={x:.95,y:1.68,z:-.72,a:2.70,pitch:-.09};
 const tableLocations=globalThis.BarEngine?.tables||[{id:1,x:1.65,z:6.4},{id:2,x:1.65,z:8.6},{id:3,x:10.22,z:6.5},{id:4,x:10.22,z:8.65}];
 function tableSeat(id){
  const table=tableLocations.find(table=>table.id===Number(id));if(!table)return null;
  const inside=table.x<6?1:-1;
  return {x:table.x+inside*.78,z:table.z,angle:inside*Math.PI/2};
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
 ];
 function containsWalkablePosition(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  return (x>=.3&&x<=11.7&&z>=.3&&z<=9.6)||
   (x>=.3&&x<=4.3&&z>=-3.9&&z<=-.3)||
   (x>=.55&&x<=1.35&&z>=-.35&&z<=.35);
 }
 const inStockroom=position=>!!position&&position.x>=.3&&position.x<=4.3&&position.z>=-3.9&&position.z<-.35;
 function prepStation(recipe){
  if(recipe==='coffee')return {x:8.43,y:1.152,z:2.47,stream:{x:8.43,y:1.316,z:2.47,h:.072}};
  if(recipe==='beer')return {x:4.15,y:1.133,z:3.18,stream:{x:4.15,y:1.53,z:3.18,h:.18}};
  return {x:6.5,y:1.133,z:3.05,stream:{x:6.5,y:1.51,z:3.05,h:.24}};
 }
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
  const rim='#c4cfc9';
  if(recipe==='coffee'){
   g.cylinder(x,y+.009,z,.21,.018,.21,'#d5cfc0');
   g.cylinder(x,y+.029,z,.107,.022,.107,'#e3ded0');
   // An open cup made of thin walls: the liquid stays inside, beneath its rim.
   for(let i=0;i<16;i++){
    const a=i*Math.PI*2/16;
    g.box(x+Math.sin(a)*.063,y+.085,z+Math.cos(a)*.063,.027,.116,.011,'#e3ded0',0,{ry:a});
   }
   const liquid=Math.min(1,Math.max(0,fill));
   g.cylinder(x,y+.041+liquid*.082,z,.113,.003,.113,liquid>0?'#9c7040':'#c6bcaa');
   // Continuous handle segments avoid the old disconnected bead silhouette.
   for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12,b=(i+1)*Math.PI*2/12;
    const ax=.079+Math.sin(a)*.034,ay=.086+Math.cos(a)*.036,bx=.079+Math.sin(b)*.034,by=.086+Math.cos(b)*.036;
    g.cylinder(x+(ax+bx)/2,y+(ay+by)/2,z,.014,Math.hypot(bx-ax,by-ay)+.003,.014,'#ded7c7',0,{rz:-Math.atan2(bx-ax,by-ay)});
   }
  }else if(recipe==='wine'){
   g.cylinder(x,y+.01,z,.14,.012,.14,rim,M.glass);
   g.cylinder(x,y+.077,z,.012,.13,.012,rim,M.glass);
   g.sphere(x,y+.19,z,.16,.15,.16,fill>0?'#642c38':'#97a6a0',M.glass);
   g.cylinder(x,y+.272,z,.12,.009,.12,rim,M.glass);
   g.cylinder(x,y+.269,z,.102,.006,.102,'#542531',M.glass);
  }else{
   const h=recipe==='beer'?.29:.25,r=recipe==='beer'?.15:.12;
   g.cylinder(x,y+.012,z,r*.85,.018,r*.85,rim,M.glass);
   g.cylinder(x,y+h*.5,z,r,h,r,fill>0?(recipe==='beer'?'#b98231':'#a6b780'):'#7a9290',M.glass,{topRadius:1.1});
   g.cylinder(x,y+h,z,r*1.1,.009,r*1.1,rim,M.glass);
   g.cylinder(x,y+h+.004,z,r*.96,recipe==='beer'?.024:.005,r*.96,recipe==='beer'?'#eee1bc':'#a3ba78');
   g.box(x-r*.35,y+h*.5,z-r*.41,.008,h*.78,.004,'#d0d6bb',M.glass,{castShadow:false});
   if(recipe==='mojito'){
    g.cylinder(x+.025,y+h+.045,z,.012,.15,.012,'#d5cfb1',0,{rz:.16});
    g.sphere(x-.025,y+h+.009,z,.05,.012,.03,'#436a32');
   }
  }
 }
 function create(){
  const items=[],g=geometry(items),{box:b,cylinder:c,sphere:s}=g;
  const solid={solid:true},noShadow={castShadow:false};
  // Shell: old plaster, brick, timber wainscoting and a glazed street frontage.
  b(6,-.11,5,12,.22,10,'#826749',M.floor);
  b(6,3.45,5,12,.18,10,'#b4aa96',M.plaster,noShadow);
  b(0,1.7,5,.2,3.4,10,'#807264',M.brick,{...solid,...noShadow});
  b(12,1.7,5,.2,3.4,10,'#b7b0a0',M.plaster,{...solid,...noShadow});
  // The former blank wall now has a real doorway to the stockroom.
  b(.15,1.7,0,.3,3.4,.2,'#b2ab98',M.plaster,{...solid,...noShadow});
  b(6.8,1.7,0,10.4,3.4,.2,'#b2ab98',M.plaster,{...solid,...noShadow});
  b(.95,2.85,0,1.3,1.1,.2,'#b2ab98',M.plaster,noShadow);
  for(const x of [.12,11.88]){
   b(x,.58,5,.12,1.16,10,'#31453f',M.wood);
   b(x,1.18,5,.17,.06,10,'#615b48',M.wood);
   b(x,.075,5,.18,.15,10,'#303833',M.wood);
   b(x,3.24,5,.18,.11,10,'#d5cbb4',M.plaster,noShadow);
  }
  b(6,3.24,.16,12,.11,.18,'#d5cbb4',M.plaster,noShadow);
  b(.15,.58,.15,.3,1.16,.14,'#33443b',M.wood);
  b(6.8,.58,.15,10.4,1.16,.14,'#33443b',M.wood);
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
  for(const bin of storageBins)b(bin.x,bin.y-.085,-3.38,.94,.16,.025,'#eee8d5',0,{label:bin.label,labelFace:'back',labelColor:'#203c2c',castShadow:false});
  // Mounted on the front of the rack so its uprights cannot mask the lettering.
  b(2.25,2.49,-3.37,2.6,.34,.03,'#243c30',0,{label:'LA RÉSERVE',labelFace:'back',labelFont:'Georgia, serif',labelColor:'#f2e9cf',castShadow:false});
  b(4.05,.93,-1.18,.76,.055,1.35,'#9e9479',M.wood,solid);
  for(const x of [3.74,4.36])for(const z of [-1.74,-.62])b(x,.45,z,.05,.9,.05,'#48574e',M.metal,solid);
  b(4.06,.964,-1.17,.34,.012,.48,'#d9d2ba',0,{label:'INVENTAIRE',labelFace:'top',labelColor:'#405247',castShadow:false});
  b(4.455,1.8,-1.18,1.25,.58,.024,'#2d473c',0,{ry:Math.PI/2,label:'STOCKS\nE : GÉRER LA RÉSERVE',labelColor:'#f2e9cf',castShadow:false});
  c(3.9,.3,-2.53,.6,.6,.6,'#637f75',M.metal,solid);
  c(3.9,.614,-2.53,.62,.026,.62,'#9bad9d',M.metal);
  b(3.9,.78,-2.53,.1,.3,.1,'#6c8174',M.metal);
  b(3.9,.93,-2.53,.48,.05,.1,'#879b89',M.metal);
  b(6,3.13,9.98,12,.55,.2,'#a69d8d',M.plaster,noShadow);
  for(const x of [.12,4.25,7.75,11.88])b(x,1.6,9.96,.18,3.2,.2,'#273a38',M.metal,{...solid,...noShadow});
  for(const x of [2.16,9.84]){
   b(x,.35,9.97,4,.7,.2,'#31443c',M.wood,solid);
   b(x,.73,9.86,4.12,.07,.32,'#5d5141',M.wood);
   b(x,2.77,9.94,4.02,.07,.12,'#283c3b',M.metal,noShadow);
   b(x,1.75,9.94,.05,2.0,.12,'#283c3b',M.metal,noShadow);
   b(x,2.28,9.94,4,.045,.12,'#283c3b',M.metal,noShadow);
   // Small glass transoms leave the main panes clear to the street geometry.
   b(x,2.52,9.99,3.92,.42,.015,'#68827e',M.glass,noShadow);
  }
  b(6,1.41,10.02,2.9,2.82,.08,'#425854',M.glass,{...solid,...noShadow});
  b(6,1.41,9.95,.07,2.82,.1,'#263a36',M.metal,noShadow);
  b(6,.15,9.91,2.9,.3,.1,'#293b34',M.wood);
  for(const x of [5.84,6.16])c(x,1.18,9.82,.026,.38,.026,'#b79d62',M.metal);
  b(6,.006,9.06,2.3,.013,1.15,'#383e36',M.fabric,noShadow);
  // Street beyond the windows, deliberately simple and outside the playable room.
  b(6,-.08,11.1,20,.14,2.1,'#92928a',M.tile,noShadow);
  b(6,-.18,14.3,25,.13,4.2,'#424c50',0,noShadow);
  b(6,-.08,16.8,25,.14,1.5,'#94968f',M.tile,noShadow);
  for(let x=-3;x<17;x+=3.4){
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
    b(x+dx,.47,.944,1.23,.79,.035,'#586052',M.wood);
    b(x+dx,.77,.975,.23,.026,.035,'#b9a576',M.metal);
   }
   b(x,2.0,.23,2.74,1.95,.12,'#25342f',M.wood);
   for(const dx of [-1.4,1.4])b(x+dx,1.99,.43,.075,2.0,.5,'#65563e',M.wood);
   for(const y of [1.12,1.78,2.43]){
    b(x,y,.52,2.83,.055,.67,'#74604a',M.wood);
    b(x,y-.037,.72,2.65,.014,.035,'#ddc38c',M.light,noShadow);
    for(let j=0;j<8;j++){
     const col=['#3f5640','#614b2c','#3b4f46','#653e36'][j%4];
     bottle(g,x-1.16+j*.33,y+.03,.56,col,.84+(j%3)*.08,['MAISON','RESERVE','VIGNE','AMBRE'][j%4]);
    }
   }
  }
  b(6,3.02,.82,5.15,.34,.06,'#293a33',M.wood,{label:'LE PETIT COMPTOIR',labelFace:'back',labelFont:'Georgia, serif',labelColor:'#f0dfb9',castShadow:false});
  // A narrow service counter with timber slats and brass foot rail.
  b(6,.5,3.02,8.8,1,.9,'#3f3329',M.wood,solid);
  b(6,1.045,3.03,9.04,.09,1.12,'#363a35',M.paint,solid);
  b(6,1.094,3.03,9.0,.016,1.09,'#454a43',M.paint);
  b(6,.08,3.51,8.85,.15,.055,'#202b28',M.metal);
  for(let x=1.72;x<10.4;x+=.13)b(x,.54,3.49,.065,.83,.04,'#796047',M.wood);
  c(6,.26,3.79,.044,8.5,.044,'#ae8a4d',M.metal,{rz:Math.PI/2});
  for(const x of [2.1,4.7,7.3,9.9])c(x,.22,3.64,.027,.33,.027,'#a88a52',M.metal,{rx:Math.PI/2});
  // A shorter return leaves a comfortable passage behind the bar to the reserve.
  b(1.75,.5,2.45,.7,1,1,'#45392c',M.wood,solid);
  b(1.75,1.045,2.45,.93,.09,1.1,'#444941',M.paint,solid);
  // Beer taps: mounted riser, arch, actual handles, no floating blocks.
  b(4.18,1.11,3.05,.92,.025,.5,'#343d3b',M.metal);
  for(let i=0;i<11;i++)b(3.82+i*.073,1.129,3.05,.014,.006,.35,'#a7b4ab',M.metal);
  c(4.15,1.45,2.95,.075,.68,.075,'#b59b60',M.metal);
  c(4.15,1.78,2.95,.075,.85,.075,'#b59b60',M.metal,{rz:Math.PI/2});
  for(const dx of [-.3,0,.3]){
   c(4.15+dx,1.72,3.08,.045,.22,.045,'#b59b60',M.metal,{rx:Math.PI/2});
   c(4.15+dx,1.67,3.18,.035,.11,.035,'#aeb8af',M.metal);
   c(4.15+dx,1.88,3.06,.055,.24,.055,'#34332c',M.wood,{topRadius:.78});
   s(4.15+dx,2.01,3.06,.075,.065,.075,'#bdaa7f',M.metal);
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
  b(6.5,1.115,2.9,.69,.035,.4,'#ac9261',M.wood);
  for(let j=0;j<4;j++)s(6.33+j*.1,1.18,2.92,.09,.075,.09,'#71813c',0);
  c(7.2,1.22,3.02,.18,.25,.18,'#aeb7aa',M.metal,{topRadius:.8});
  c(7.47,1.19,3.02,.14,.18,.14,'#abb3a8',M.metal);
  bottle(g,7.75,1.11,3.02,'#65724c',.75,'SIROP');
  // Cash drawer and till face the staff aisle (-Z), with the display tilted
  // upward toward the barman. The room sees the monitor's closed back.
  b(2.65,1.17,2.94,.68,.15,.53,'#26332f',M.metal);
  b(2.65,1.26,3.0,.42,.035,.29,'#33433b',M.metal);
  b(2.65,1.405,3.0,.10,.30,.09,'#38433e',M.metal);
  b(2.65,1.59,2.97,.68,.43,.055,'#1c302b',M.paint,{rx:.22});
  b(2.65,1.597,2.938,.595,.335,.009,'#234d3c',M.paint,{rx:.22,label:'CAISSE\nE : ENCAISSER',labelFace:'front',labelColor:'#edf4df',castShadow:false});
  // The cordless terminal rests beside the till until the player picks it up.
  b(3.25,1.12,2.65,.205,.045,.29,'#2c3934',M.metal);
  b(3.25,1.146,2.65,.16,.008,.25,'#101f1a',M.paint);
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
   let [xx,zz]=p(0,0);b(xx,.48,zz,.48,.075,.47,'#6e4b3e',M.fabric,{solid:true,ry:angle});
   [xx,zz]=p(0,.21);b(xx,.78,zz,.47,.48,.055,'#586052',M.wood,{solid:true,ry:angle});
   // Local +Z is the back: its uprights meet the outer face of the backrest,
   // continuing down to the rear feet without protruding into the seat.
   for(const dx of [-.19,.19])for(const [dz,h] of [[-.18,.46],[.24,.99]]){[xx,zz]=p(dx,dz);b(xx,h/2,zz,.038,h,.038,'#343b33',M.metal,{ry:angle})}
  }
  for(const {id,x,z} of tableLocations){
   c(x,.75,z,1.05,.065,1.05,'#826c4d',M.wood,{solid:true});
   c(x,.38,z,.075,.72,.075,'#333c35',M.metal);
   c(x,.04,z,.53,.05,.53,'#303a33',M.metal);
   chair(x-.78,z,-Math.PI/2);chair(x+.78,z,Math.PI/2);
   c(x,.818,z,.09,.07,.09,'#b2a890');c(x,.9,z,.025,.16,.025,'#72804b');
   s(x+.025,.99,z,.13,.11,.08,'#61734b');
   b(x-.2,.787,z+.18,.2,.008,.14,'#d7cdb4');
   const inward=x<6?1:-1,signAngle=-inward*Math.PI/2;
   b(x+inward*.26,.794,z-.18,.24,.015,.07,'#867854',M.metal,{ry:signAngle});
   b(x+inward*.26,.85,z-.18,.23,.10,.018,'#203e30',M.paint,{ry:signAngle,label:'TABLE '+id,labelColor:'#f2e8c9',castShadow:false});
  }
  for(const x of [2.8,9.2]){
   c(x,.79,4.18,.4,.095,.4,'#785242',M.fabric,{solid:true});
   for(const dx of [-.14,.14])for(const dz of [-.14,.14])c(x+dx,.39,4.18+dz,.029,.76,.029,'#354139',M.metal);
   c(x,.28,4.18,.3,.025,.3,'#a78c54',M.metal);
  }
  // Framed menu, wall art, clocks and pendant lamps.
  b(.24,2.1,4.35,.055,1.25,1.5,'#473f31',M.wood);
  b(.28,2.1,4.35,1.35,1.1,.025,'#263b32',0,{ry:-Math.PI/2,label:'LA CARTE\nPression  5 €\nVin rouge  6 €\nEspresso  3 €\nMojito  10 €'});
  for(const [z,word] of [[4.75,'CAFÉ\nDE QUARTIER'],[7.6,'LES BELLES\nSOIRÉES']]){
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
    const x=bin.x+(i-1)*.28,y=bin.y,z=-3.76;
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
 function terminal(items,{x=3.25,y=1.175,z=2.65,angle=0,pitch=0}={}){
  const source=geometry(items),cs=Math.cos(angle),sn=Math.sin(angle),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const b=(dx,dy,dz,w,h,d,color,mat=0)=>{
   const py=dy*cp-dz*sp,pz=dy*sp+dz*cp;
   source.box(x+dx*cs+pz*sn,y+py,z-dx*sn+pz*cs,w,h,d,color,mat,{ry:angle,rx:pitch,castShadow:false});
  };
  b(0,0,0,.17,.05,.245,'#172a24',M.paint);
  b(0,.027,-.066,.134,.007,.079,'#94c3a4',M.paint);
  b(0,.032,-.078,.085,.003,.008,'#254a36',M.paint);
  b(-.025,.032,-.057,.035,.003,.006,'#254a36',M.paint);
  for(let row=0;row<4;row++)for(let col=0;col<3;col++){
   const color=row===3?(col===0?'#b45746':col===2?'#6eab72':'#c2a65d'):'#c3c9b7';
   b((col-1)*.04,.031,.004+row*.029,.031,.009,.022,color,M.paint);
  }
  b(.066,.029,-.078,.006,.004,.013,'#e0dcb4',M.paint);
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
  if(!state?.payments?.terminalCarried)terminal(items);
 }
 function customer(items,{x,z,id,time,moving,departing=false,patience=100,seated=false,angle,staffKind,carrying=false}){
  const g=geometry(items),skin=['#c4916d','#956c51','#d4b191','#b18061'][id%4];
  const shirt=staffKind?'#d1d0b8':['#555f61','#815c4b','#6b7058','#525f74','#927e68'][id%5];
  const hair=['#45352a','#302c26','#8b7750','#62564b'][id%4];
  const turn=Number.isFinite(angle)?angle:departing?Math.PI:0,cs=Math.cos(turn),sn=Math.sin(turn),bob=!seated&&moving?Math.sin(time*11+id)*.012:Math.sin(time*1.7+id)*.006,seatOffset=seated?-.265:0;
  const original=g.box;
  g.box=(ox,y,oz,w,h,d,c,mat=0,extra={})=>original(x+ox*cs+oz*sn,y+bob+seatOffset,z-ox*sn+oz*cs,w,h,d,c,mat,{...extra,ry:(extra.ry||0)+turn});
  g.cylinder=(...args)=>{args[8]={...args[8],round:true};return g.box(...args)};
  g.sphere=(...args)=>{args[8]={...args[8],shape:'sphere'};return g.box(...args)};
  const {box:b,cylinder:c,sphere:s}=g;
  const armSegment=(a,end,width,depth,color)=>{
   const dx=end.x-a.x,dy=end.y-a.y,dz=end.z-a.z;
   c((a.x+end.x)/2,(a.y+end.y)/2,(a.z+end.z)/2,width,Math.hypot(dx,dy,dz),depth,color,color===skin?M.skin:M.fabric,{rx:Math.atan2(Math.hypot(dx,dz),dy),ry:Math.atan2(dx,dz)});
  };
  // Separate joints, facial planes and layered clothing replace block silhouettes.
  c(0,1.105,0,.40,.49,.25,shirt,M.fabric,{topRadius:1.12,contactShadow:true});
  s(0,.855,0,.35,.2,.25,'#333f43',M.fabric);
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
  c(0,1.348,.014,.133,.018,.14,shirt,M.fabric,{topRadius:.94});
  for(const side of [-1,1]){
   s(side*.185,1.30,0,.14,.14,.17,shirt,M.fabric);
   const stride=!seated&&moving?Math.sin(time*7.2+id+side*1.57)*.34:0;
   const kneeZ=seated?-.35:Math.sin(stride)*.39,kneeY=seated?.81:.865-Math.cos(stride)*.39;
   c(side*.105,(.865+kneeY)/2,kneeZ/2,.15,Math.hypot(.865-kneeY,kneeZ),.16,'#38444a',M.fabric,{rx:seated?Math.atan2(-kneeZ,.865-kneeY):-stride,topRadius:1.12});
   s(side*.105,kneeY,kneeZ,.13,.12,.14,'#354147',M.fabric);
   const lower=stride+Math.max(0,-stride)*.8,ankleZ=seated?kneeZ:kneeZ+Math.sin(lower)*.38,ankleY=seated?.34:kneeY-Math.cos(lower)*.38;
   c(side*.105,(kneeY+ankleY)/2,(kneeZ+ankleZ)/2,.108,Math.hypot(kneeY-ankleY,kneeZ-ankleZ),.12,'#354147',M.fabric,{rx:seated?0:-lower,topRadius:1.15});
   s(side*.105,Math.max(.055,ankleY-.015),ankleZ-.055,.13,.1,.25,'#30332d',0);
   if(carrying&&!seated){
    // Both hands support a tray at local (0,1.10,-.34), clear of the torso.
    const shoulder={x:side*.21,y:1.31,z:0},elbow={x:side*.20,y:1.08,z:-.15},wrist={x:side*.145,y:1.05,z:-.34};
    armSegment(shoulder,elbow,.115,.13,shirt);s(elbow.x,elbow.y,elbow.z,.104,.105,.105,skin,M.skin);
    armSegment(elbow,wrist,.085,.095,skin);s(wrist.x,1.06,-.34,.09,.055,.10,skin,M.skin);
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
  for(let y=.98;y<1.34;y+=.087)b(0,y,-.125*(1+.12*(y-.86)/.49)-.003,.012,.012,.009,'#c2b9a0',M.paint);
  if(staffKind){
   const apron=staffKind==='bartender'?'#254c3a':'#43566a';
   b(0,1.16,-.133,.28,.30,.018,apron,M.fabric);
   b(0,.90,-.145,.34,.28,.020,apron,M.fabric);
   for(const side of [-1,1])b(side*.10,1.365,-.135,.026,.15,.015,apron,M.fabric,{rz:side*.18});
   b(0,.92,-.16,.16,.085,.008,'#b2a888',M.fabric);
  }
 }
 return {create,geometry,bottle,glass,customer,storageVisuals,registerVisuals,terminal,tableSeat,prepStation,containsWalkablePosition,inStockroom,playCamera,homeCamera,stockroomCamera,materials:M};
})();
