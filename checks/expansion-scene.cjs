'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({});
for(const file of ['engine.js','scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
const Scene=vm.runInContext('BarScene',context),Engine=context.BarEngine;
function owned(level,{tables=true}={}){
 const management={};
 if(level>=1)Object.assign(management,{expansion1:true,table5:tables,table6:tables});
 if(level>=2)Object.assign(management,{expansion2:true,table7:tables,table8:tables});
 return {management};
}
const tablesIn=boxes=>boxes.filter(box=>/^TABLE \d+$/.test(box.label||'')).map(box=>Number(box.label.slice(6)));
function blocks(box,x,z,radius=.2){
 if(!box.solid||box.y-box.h/2>=1.7||box.y+box.h/2<=.2)return false;
 const c=Math.cos(box.ry||0),s=Math.sin(box.ry||0),dx=x-box.x,dz=z-box.z,px=dx*c-dz*s,pz=dx*s+dz*c;
 return box.round?Math.hypot(px/(box.w/2+radius),pz/(box.d/2+radius))<1:Math.abs(px)<box.w/2+radius&&Math.abs(pz)<box.d/2+radius;
}
function clearRoute(boxes,state,route){
 for(let i=1;i<route.length;i++){
  const from=route[i-1],to=route[i],steps=Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.04);
  for(let step=0;step<=steps;step++){
   const t=steps?step/steps:0,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;
   assert.ok(Scene.containsWalkablePosition(x,z,state),`Walkable route at ${x},${z}`);
   assert.ok(!boxes.some(box=>blocks(box,x,z)),`Clear route at ${x},${z}`);
  }
 }
}

test('paid rooms and their purchased tables appear independently while the original bar stays unchanged',()=>{
 assert.deepEqual(Array.from(tablesIn(Scene.create())),[1,2,3,4]);
 const empty=owned(1,{tables:false}),first=owned(1),full=owned(2);
 assert.deepEqual(Array.from(tablesIn(Scene.create(empty))),[1,2,3,4]);
 empty.management.table5=true;
 assert.deepEqual(Array.from(tablesIn(Scene.create(empty))),[1,2,3,4,5]);
 assert.deepEqual(Array.from(tablesIn(Scene.create(first))),[1,2,3,4,5,6]);
 assert.deepEqual(Array.from(tablesIn(Scene.create(full))),[1,2,3,4,5,6,7,8]);
 for(const state of [undefined,empty,first,full]){
  const boxes=Scene.create(state);
  assert.equal(boxes.filter(box=>box.registerHousing).length,1,'The original counter is never duplicated');
  const props=[];Scene.registerVisuals(props,state);assert.equal(props.filter(box=>box.display==='register').length,1,'There is one live register display for every building size');
  assert.ok(boxes.every(box=>['x','y','z','w','h','d'].every(key=>Number.isFinite(box[key]))));
 }
});

test('annex floors and ceilings join the original room and each outer frontage remains enclosed',()=>{
 for(const level of [1,2]){
  const state=owned(level),boxes=Scene.create(state);
  for(let room=0;room<level;room++){
   const left=12+room*4.5,middle=left+2.25;
   const floor=boxes.find(box=>box.mat===Scene.materials.floor&&box.x===middle&&box.z===7);
   assert.equal(floor.x-floor.w/2,left);assert.equal(floor.x+floor.w/2,left+4.5);assert.equal(floor.y+floor.h/2,0);
   const ceiling=boxes.find(box=>box.x===middle&&box.z===7&&box.y===3.45);
   assert.equal(ceiling.w,4.5);assert.equal(ceiling.d,6);
   const panes=boxes.filter(box=>box.mat===Scene.materials.clearGlass&&box.x===middle&&box.z===9.99);
   assert.equal(panes.length,2,'Two panes cover the new window and transom');
   assert.ok(boxes.some(box=>box.x===middle&&box.y===.35&&box.z===9.97&&box.solid),'The frontage has a solid lower wall');
   assert.equal(Scene.containsWalkablePosition(middle,10,state),false,'The player cannot cross the window');
   for(const z of [6.2,8.4])assert.ok(boxes.some(box=>box.mat===Scene.materials.light&&box.x===middle&&box.z===z),'The renderer light positions have matching visible fixtures');
  }
 }
});

test('both purchased doorways, lateral corridors and table approaches admit the player without clipping furniture',()=>{
 assert.equal(Scene.containsWalkablePosition(12,5.25),false);
 assert.equal(Scene.containsWalkablePosition(14,7),false);
 for(const level of [1,2]){
  const state=owned(level),boxes=Scene.create(state);
  clearRoute(boxes,state,[{x:8.8,z:5.25},{x:12.9,z:5.25}]);
  assert.equal(Scene.containsWalkablePosition(12,7,state),false,'The old side wall stays closed outside its doorway');
  assert.equal(Scene.containsWalkablePosition(16.5,7,state),false,'The salon divider stays closed outside its doorway');
  for(const table of Engine.availableTables(state).filter(table=>table.id>4)){
   const aisle=table.id<7?12.9:17.4;
   clearRoute(boxes,state,[{x:12.9,z:5.25},{x:aisle,z:5.25},{x:aisle,z:table.z},{x:table.x-1.35,z:table.z}]);
   const seat=Scene.tableSeat(table.id);
   assert.equal(seat.x,table.x-.78);assert.equal(seat.z,table.z);assert.equal(seat.angle,-Math.PI/2);
   const cushion=boxes.find(box=>box.solid&&box.mat===Scene.materials.fabric&&box.x===seat.x&&box.z===seat.z);
   assert.ok(cushion,'Each new customer sits on an actual chair cushion');
   assert.ok(Math.abs(cushion.y+cushion.h/2-.5175)<1e-9);
  }
  assert.equal(Scene.containsWalkablePosition(level===1?18:22,6,state),false,'Unpurchased space stays inaccessible');
 }
});
