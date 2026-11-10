'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({});
for(const file of ['engine.js','scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
const Scene=vm.runInContext('BarScene',context),boxes=Scene.create();
const seats=Array.from({length:6},(_,slot)=>Scene.counterSeat(slot));

test('six counter stools have usable cushions, outward backrests and a clear serving aisle',()=>{
 assert.equal(Scene.counterSeat(6),null);
 for(const seat of seats){
  assert.equal(seat.angle,0,'Every guest faces towards the bar');
  const cushion=boxes.find(b=>b.solid&&b.round&&b.mat===Scene.materials.fabric&&b.x===seat.x&&b.z===seat.z);
  assert.ok(cushion,'Every counter seat has a physical cushion');
  assert.ok(Math.abs(cushion.y+cushion.h/2-seat.seatHeight)<1e-9);
  const backrest=boxes.find(b=>b.mat===Scene.materials.wood&&b.x===seat.x&&b.y>seat.seatHeight&&Math.abs(b.z-seat.z-.22)<1e-9);
  assert.ok(backrest&&backrest.z>seat.z,'The backrest is behind the customer');
  for(const b of boxes.filter(b=>b.solid&&b.y-b.h/2<1.7&&b.y+b.h/2>.2)){
   const angle=b.ry||0,c=Math.cos(angle),s=Math.sin(angle),dx=seat.x-b.x,dz=4.8-b.z,px=dx*c-dz*s,pz=dx*s+dz*c;
   const blocked=b.round?Math.hypot(px/(b.w/2+.2),pz/(b.d/2+.2))<1:Math.abs(px)<b.w/2+.2&&Math.abs(pz)<b.d/2+.2;
   assert.equal(blocked,false,'A player or waiter can pass behind each stool at z=4.8');
  }
 }
 for(let i=0;i<seats.length;i++)for(let j=0;j<i;j++)assert.ok(Math.abs(seats[i].x-seats[j].x)>=1.2,'Adjacent guests and stools do not overlap');
});

test('counter customers sit on the cushion with their feet supported, while table poses stay unchanged',()=>{
 const pose=options=>{const items=[];Scene.customer(items,{x:0,z:0,id:0,time:0,moving:false,seated:true,...options});return items};
 const stool=pose({seatHeight:.84}),table=pose({}),explicitTable=pose({seatHeight:.5175});
 assert.equal(table.length,explicitTable.length);
 for(let i=0;i<table.length;i++)for(const axis of ['x','y','z'])assert.ok(Math.abs(table[i][axis]-explicitTable[i][axis])<1e-12,'Default table seating remains unchanged');
 const pelvis=stool.find(b=>b.shape==='sphere'&&b.w===.34&&b.h===.17);
 assert.ok(pelvis.y-pelvis.h/2>.81&&pelvis.y-pelvis.h/2<.85,'Pelvis rests in the cushion instead of floating above it');
 const shoes=stool.filter(b=>b.c==='#30332d'&&b.shape==='sphere');
 assert.equal(shoes.length,2);
 for(const shoe of shoes)assert.ok(Math.abs(shoe.y-shoe.h/2-.3345)<.01,'Both feet rest on the front crossbar');
 const thighs=stool.filter(b=>b.c==='#38444a'&&b.round);
 assert.equal(thighs.length,2);
 for(const thigh of thighs)assert.ok(thigh.y-thigh.w/2>=.84,'Thighs remain above the seat cushion');
 assert.ok(stool.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.z)));
});
