'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({});
for(const file of ['engine.js','scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
const Scene=vm.runInContext('BarScene',context),Engine=context.BarEngine,boxes=Scene.create();

test('each preparation slot has a separate visible position, with beer streams under real outlets',()=>{
 const places=Engine.preparationSlots.map(slot=>Scene.prepStation({recipe:slot.kind==='cocktails'?'wine':slot.kind,slotId:slot.id}));
 assert.equal(new Set(places.map(point=>point.x+':'+point.z)).size,5);
 for(const slot of Engine.preparationSlots){
  const recipe=slot.kind==='cocktails'?'wine':slot.kind,point=Scene.prepStation({recipe,slotId:slot.id});
  assert.equal(point.x,slot.x);assert.equal(point.y,slot.y);assert.equal(point.z,slot.z);
  assert.equal(point.stream.x,slot.x);assert.equal(point.stream.z,slot.z);
  if(slot.kind==='beer')assert.ok(boxes.some(box=>box.round&&Math.abs(box.x-slot.x)<1e-9&&box.z===slot.z&&box.y===1.67&&box.h===.11),'Every pouring stream is beneath its own beer outlet');
  if(slot.kind==='cocktails')assert.ok(boxes.some(box=>box.mat===Scene.materials.wood&&box.x===slot.x&&box.z===slot.z&&Math.abs(box.y+box.h/2-slot.y)<1e-9),'Each cocktail vessel is supported by its own board');
 }
 for(const recipe of ['beer','coffee','wine']){
  const point=Scene.prepStation(recipe),kind=recipe==='wine'?'cocktails':recipe;
  for(const axis of ['x','y','z'])assert.equal(point[axis],Engine.preparationLayout.stations[kind][axis],'Legacy single-preparation positions remain supported');
 }
});

test('the four tray places avoid working vessels and the customer glasses along the counter',()=>{
 const points=Array.from({length:4},(_,index)=>Scene.trayPosition(index));
 for(const point of points){
  assert.ok(point.x-.115>4.75&&point.x+.115<5.47&&point.z-.115>2.68&&point.z+.115<3.34,'Even a coupe fits inside the tray rim');
  assert.ok(Math.abs(point.y-1.133)<1e-9);
  for(const slot of Engine.preparationSlots)assert.ok(Math.hypot(point.x-slot.x,point.z-slot.z)>.4,'No tray drink occupies a preparation slot');
  for(const seat of Engine.counterSeats)assert.ok(Math.hypot(point.x-seat.x,point.z-3.48)>.3,'No tray drink collides with a served customer glass');
 }
 for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(points[i].x-points[j].x,points[i].z-points[j].z)>.23,'Tray glasses do not overlap each other');
});

test('parked preparations retain their garnish and only the active preparation draws held items',()=>{
 const preparation=(id,slotId)=>({id,slotId,recipe:'mojito',physical:true,vesselPlaced:true,ready:false,amount:0,added:{lime:true},held:null});
 const active=preparation(1,'cocktails'),parked=preparation(2,'cocktails2'),state={stock:{},prep:active,parkedPreps:[parked],payments:{}};
 const items=[];Scene.preparationVisuals(items,state,null);
 const limes=items.filter(item=>item.shape==='sphere'&&item.c==='#79923d');
 assert.equal(limes.length,2);
 for(const preparation of [active,parked]){
  const point=Scene.prepStation(preparation);
  assert.ok(limes.some(lime=>Math.abs(lime.x-(point.x-.18))<1e-9&&Math.abs(lime.z-(point.z-.1))<1e-9),'Garnish remains next to the correct parked vessel');
 }
 active.held={kind:'ingredient',key:'mint'};
 const withHand=[],malformedParked=[];Scene.preparationVisuals(withHand,state,Scene.playCamera);
 parked.held={kind:'ingredient',key:'lime'};Scene.preparationVisuals(malformedParked,state,Scene.playCamera);
 assert.deepEqual(malformedParked,withHand,'A parked preparation never creates a second pair of hands');
 assert.ok(withHand.some(item=>item.c==='#c4916d'),'The active ingredient is visibly held');
 assert.ok(withHand.every(item=>['x','y','z','w','h','d'].every(key=>Number.isFinite(item[key]))));
});
