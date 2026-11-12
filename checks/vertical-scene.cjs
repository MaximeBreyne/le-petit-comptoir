'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({});for(const file of ['engine.js','scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
const Scene=vm.runInContext('BarScene',context),Engine=context.BarEngine;
function complete(){const game=new Engine.Game();for(const id of Object.keys(Engine.managementUpgrades))game.s.management[id]=true;return game;}
function blocks(box,point){
 if(!box.solid||box.y-box.h/2>=point.y+1.7||box.y+box.h/2<=point.y+.2)return false;
 const cosine=Math.cos(box.ry||0),sine=Math.sin(box.ry||0),dx=point.x-box.x,dz=point.z-box.z,x=dx*cosine-dz*sine,z=dx*sine+dz*cosine;
 return box.round?Math.hypot(x/(box.w/2+.2),z/(box.d/2+.2))<1:Math.abs(x)<box.w/2+.2&&Math.abs(z)<box.d/2+.2;
}
function walkRoute(boxes,state,route){
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z,b.y-a.y)/.035);
  for(let step=0;step<=steps;step++){
   const t=steps?step/steps:0,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
   const surface=Scene.walkSurfaceHeight(p.x,p.z,state,p.y);
   assert.ok(surface!==null&&Math.abs(surface-p.y)<.025,'Supported route '+JSON.stringify(p));
   const obstacle=boxes.find(box=>blocks(box,p));assert.ok(!obstacle,'Blocked route '+JSON.stringify(p)+' by '+JSON.stringify(obstacle));
  }
 }
}
const stairs=[{x:20.1,y:0,z:5.25},{x:22.5,y:0,z:5.25},{x:22.5,y:3.6,z:9.1},{x:22.5,y:3.6,z:9.3},{x:20.1,y:3.6,z:9.3},{x:20.1,y:3.6,z:5.25}];
test('stairs provide a continuous clear climb in both directions, with a separate upper floor and closed side edges',()=>{
 const game=complete(),boxes=Scene.create(game.s);walkRoute(boxes,game.s,stairs);walkRoute(boxes,game.s,[...stairs].reverse());
 assert.equal(Scene.walkSurfaceHeight(16,7,game.s,0),0);assert.equal(Scene.walkSurfaceHeight(16,7,game.s,3.6),3.6);
 assert.equal(Scene.walkSurfaceHeight(21.4,7,game.s,1.6),null);assert.equal(Scene.walkSurfaceHeight(23.6,7,game.s,1.6),null);
 assert.equal(Scene.walkSurfaceHeight(11.8,8,game.s,3.6),null);assert.equal(Scene.walkSurfaceHeight(16,7,game.s,1.5),null);
 const initial=new Engine.Game().s;assert.equal(Scene.walkSurfaceHeight(22.5,7,initial,0),null);assert.equal(Scene.walkSurfaceHeight(16,7,initial,3.6),null);
 assert.equal(boxes.filter(box=>box.stairTread).length,24);assert.ok(boxes.some(box=>box.roomFloor&&Math.abs(box.y+box.h/2-3.6)<1e-9));
});
test('every upper and club table has a physical chair at its altitude and clear service approaches',()=>{
 const game=complete(),boxes=Scene.create(game.s);
 for(const table of Engine.tables.filter(table=>table.id>8)){
  const seat=Scene.tableSeat(table.id),floor=table.y||0;assert.equal(seat.y,floor);
  assert.ok(boxes.some(box=>box.solid&&box.x===seat.x&&box.z===seat.z&&Math.abs(box.y-floor-.48)<1e-9));
  const aisle=table.id<=12?table.x-1.35:table.x-1.35;
  const route=table.id<=12?[{x:20.1,y:3.6,z:5.25},{x:aisle,y:3.6,z:5.25},{x:aisle,y:3.6,z:table.z}]:[{x:22.5,y:0,z:5.25},{x:aisle,y:0,z:5.25},{x:aisle,y:0,z:table.z}];
  walkRoute(boxes,game.s,route);
 }
 assert.ok(boxes.some(box=>box.label==='LE CLUB\nNUITS DU COMPTOIR'));assert.ok(boxes.some(box=>box.label==='LE SALON À L’ÉTAGE'));
});
test('moving an entire character upstairs preserves body geometry and moves its contact shadow without changing the seated pose',()=>{
 const low=[],high=[],person={x:14,y:0,z:7,id:4,time:1,moving:false,seated:true};Scene.customer(low,person);Scene.customer(high,{...person,y:3.6});assert.equal(low.length,high.length);
 for(let i=0;i<low.length;i++){assert.equal(low[i].x,high[i].x);assert.equal(low[i].z,high[i].z);assert.ok(Math.abs(high[i].y-low[i].y-3.6)<1e-9);}
 assert.equal(high.filter(box=>box.contactShadow).length,1);assert.equal(high.find(box=>box.contactShadow).contactFloor,3.6);
 assert.ok(high.every(box=>box.characterBounds===high[0].characterBounds),'All body parts share one conservative visibility bound');assert.equal(high[0].characterBounds.y,4.6);
 assert.equal(Scene.inStockroom({x:1,y:5.28,z:-2}),false);
});
test('engine waiter routes between register, upstairs, club and other tables stay clear at the correct altitude',()=>{
 const game=complete(),boxes=Scene.create(game.s),points=[{x:2.65,y:0,z:2},...Engine.tables.filter(table=>table.id>8).map(table=>({x:table.x-1.35,y:table.y||0,z:table.z}))];
 for(const from of points)for(const to of points)walkRoute(boxes,game.s,game.waiterRoute(from,to).map(point=>({...point,y:point.y||0})));
});
test('every new ingredient has a labelled physical container and a stocked reserve display',()=>{
 const game=complete();for(const key of ['vodka','cranberry','energy']){game.s.stock[key]=100;game.s.reserve[key]=Engine.ingredients[key].pack;}
 const boxes=Scene.create(game.s),dynamic=[];Scene.preparationVisuals(dynamic,game.s);Scene.storageVisuals(dynamic,game.s);
 for(const key of ['vodka','cranberry','energy']){
  const point=Engine.preparationLayout.ingredients[key],title={vodka:'VODKA',cranberry:'CRANBERRY',energy:'ÉNERGIE'}[key];
  assert.ok(boxes.some(box=>box.label===title),'Label '+key);assert.ok(dynamic.some(box=>Math.abs(box.x-point.x)<.08&&Math.abs(box.z-point.z)<.08&&box.y>point.y),'Container '+key);
 }
});
