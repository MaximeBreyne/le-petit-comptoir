'use strict';
// Millimetre-scale fittings and table dressing, in the existing scene coordinates.
// These are decoration, never collision or new interaction targets.
const ComptoirFinishes=(()=>{
 function add(items){
  const first=items.length,g=BarScene.geometry(items),M=BarScene.materials;
  const {box:b,cylinder:c,sphere:s}=g;
  const brass='#b39a62',steel='#abb4ae',rubber='#232a27';
  // Foot-rail wall plates and collars give the rail real attachment points.
  for(const x of [2.1,4.7,7.3,9.9]){
   c(x,.22,3.525,.09,.016,.09,brass,M.metal,{rx:Math.PI/2});
   c(x,.26,3.79,.059,.05,.059,brass,M.metal,{rz:Math.PI/2});
   for(const dx of [-.025,.025])c(x+dx,.22,3.536,.009,.003,.009,steel,M.metal,{rx:Math.PI/2});
  }
  // Panel mouldings read as joinery rather than six uninterrupted slabs.
  for(const center of [3,6,9])for(const dx of [-.65,.65]){
   const x=center+dx;
   for(const sx of [-.52,.52])b(x+sx,.47,.969,.024,.65,.016,'#5a5845',M.wood);
   for(const y of [.145,.795])b(x,y,.969,1.064,.024,.016,'#5a5845',M.wood);
   for(const side of [-.106,.106])c(x+side,.77,.996,.011,.009,.011,brass,M.metal,{rx:Math.PI/2});
  }
  // The fridge ventilation and hinges stay inside its established footprint.
  for(let i=0;i<13;i++)b(10.72+i*.063,.15,1.079,.032,.07,.005,rubber,M.paint);
  for(const y of [.40,1.72]){
   b(10.62,y,1.105,.045,.09,.018,steel,M.metal);
   for(const dy of [-.025,.025])c(10.62,y+dy,1.117,.009,.004,.009,rubber,M.metal,{rx:Math.PI/2});
  }
  // Porcelain tap badges, metal collars and recessed drain fasteners.
  for(const dx of [-.35,0,.3]){
   c(4.15+dx,1.79,2.84,.064,.026,.064,brass,M.metal);
   c(4.15+dx,1.895,2.803,.030,.003,.030,'#f2ead7',M.tile,{rx:Math.PI/2});
  }
  for(const x of [3.76,4.60])for(const z of [2.64,3.06])c(x,1.126,z,.014,.003,.014,steel,M.metal);
  // Espresso controls, steam wand and small rubber feet. Keep the cup bay clear.
  for(const x of [8.25,8.58,8.91,9.24]){
   c(x,1.68,2.526,.028,.016,.028,rubber,M.paint,{rx:Math.PI/2});
   c(x,1.68,2.515,.018,.003,.018,'#cecab8',M.tile,{rx:Math.PI/2});
  }
  for(const x of [8.19,9.31])for(const y of [1.48,1.68])c(x,y,2.528,.012,.005,.012,steel,M.metal,{rx:Math.PI/2});
  c(9.27,1.40,2.50,.014,.19,.014,steel,M.metal,{rz:-.16});
  c(9.29,1.305,2.47,.014,.06,.014,steel,M.metal,{rx:Math.PI/3});
  for(const x of [8.20,9.30])for(const z of [2.40,3.12])c(x,1.106,z,.065,.018,.065,rubber,M.paint);
  // Linen, cork coasters and folded menus: all fit on the current table tops.
  for(const {x,z} of BarEngine.tables.filter(t=>!t.upgrade)){
   c(x+.24,.788,z+.12,.13,.004,.13,'#a18b64',M.wood);
   c(x-.27,.788,z-.13,.13,.004,.13,'#a18b64',M.wood);
   b(x-.22,.795,z+.18,.19,.009,.13,'#e2dbc9',M.fabric,{ry:.12});
   b(x+.08,.855,z-.24,.16,.14,.004,'#29463b',M.paint,{rx:.28});
   b(x+.08,.855,z-.28,.16,.14,.004,'#d3cbb6',M.paint,{rx:-.28});
   for(let line=0;line<4;line++)b(x+.08,.875-line*.015,z-.213-line*.004,.10-line*.009,.002,.001,'#c4b58a',M.paint);
  }
  // Clock markers and protective glass, preserving the hands and original face.
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6;
   b(10.96+Math.sin(a)*.175,2.65+Math.cos(a)*.175,.247,.007,i%3===0?.032:.019,.002,'#394137',M.paint,{rz:-a});
  }
  c(10.96,2.65,.261,.427,.003,.427,'#d1d9d3',M.clearGlass,{rx:Math.PI/2});
  // Front sign border and individual wall lamps, above the existing doorway.
  for(const y of [2.90,3.36])b(6,y,10.09,11.72,.018,.018,brass,M.metal);
  for(const x of [.14,11.86])b(x,3.13,10.09,.018,.46,.018,brass,M.metal);
  for(const x of [2.3,6,9.7]){
   b(x,3.39,10.14,.055,.055,.20,'#2f4038',M.metal);
   c(x,3.37,10.24,.10,.27,.10,'#2f4038',M.metal,{rz:Math.PI/2});
   b(x,3.315,10.24,.21,.01,.065,'#eddbac',M.light);
  }
  for(let i=first;i<items.length;i++){
   items[i].detail=true;items[i].solid=false;
   if(items[i].z>10)items[i].exterior=true;
  }
 }
 return {add};
})();
