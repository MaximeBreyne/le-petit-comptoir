'use strict';
// Compare the new native geometry against the actual original WebGL mesh output.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const vm=require('node:vm'),os=require('node:os'),cp=require('node:child_process');
const {exportScene}=require('../Scripts/export-original-scene.cjs');
const sourceRoot=path.resolve(__dirname,'../SourceArt/Scene');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../Content/OriginalData/scene.json'),'utf8'));
assert.deepEqual(data,JSON.parse(JSON.stringify(exportScene())),'Scene export must match the original source');
const shapes=Object.values(data.collections).flat();
// Passage stays clear after removing the movable leaves from the static room.
for(let z=9.3;z<=12.1;z+=.1) {
  const blockers=data.collections.world.filter(s=>s.collision &&
    Math.abs(s.x-6)<s.w/2+.30 && Math.abs(s.z-z)<s.d/2+.30 &&
    s.y+s.h/2>.46 && s.y-s.h/2<1.8);
  assert.deepEqual(blockers,[],`Exit blocked at z=${z}`);
}
for(const name of ['doorLeft','doorRight']) {
  assert.ok(data.collections[name].some(s=>s.collision),'Door must block when closed');
  assert.ok(data.collections[name].every(s=>Math.abs(s.x)<=1.46),'Leaf fits half doorway');
}
const streetFloors=data.collections.world.filter(s=>s.streetFloor);
assert.equal(streetFloors.length,4);
assert.ok(streetFloors.every(s=>s.collision),'Street and pavements must support the player');
const fridge=data.collections.world.filter(s=>s.assembly==='fridge');
assert.ok(fridge.length>20);
for(const s of fridge) {
  assert.ok(s.x-s.w/2>10.415,'Fridge must clear the adjacent cabinet');
  assert.ok(s.z+s.d/2<1.13,'Fridge shelves and handle must not protrude into the aisle');
}
assert.equal(data.collections.world.filter(s=>s.venueName).length,2,'Name appears on both frontage and back-bar sign');
assert.ok(data.collections.world.some(s=>s.venueName&&s.z>9.9&&s.labelFace==='back'),'Frontage name must face the street');
assert.ok(data.collections.world.some(s=>s.label?.includes('5 €')),'Menu must retain euro characters');
for(let i=0;i<3;i++)for(const part of ['body','legLeft','legRight','armLeft','armRight'])
  assert.ok(data.collections[`ped${i}_${part}`].length>0,`Missing pedestrian ${i} ${part}`);
for(let i=0;i<2;i++)assert.ok(data.collections[`traffic${i}`].some(s=>s.collision));
for(let i=0;i<3;i++)for(const pose of ['seated','standing'])assert.ok(data.collections[`guest${i}_${pose}`].length>0);
for(const recipe of ['beer','wine','coffee'])for(let level=0;level<=8;level++) {
  const model=data.collections[`drink_${recipe}_${level}`];assert.ok(model.length>0);
  assert.ok(model.every(s=>!s.collision),'Drinks must not block movement or interaction');
  if(recipe==='beer') {
    const liquid=model.filter(s=>s.mat===16&&s.c==='#d8a348');
    assert.equal(liquid.length>0,level>0,'Beer must use golden liquid material while pouring and on the tray');
    assert.ok(model.some(s=>s.mat===11),'Glass must remain transparent');
    if(level>0)assert.ok(model.some(s=>s.mat===16&&s.c==='#ede1c5'),'Beer must have pale foam');
  }
}
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(sourceRoot,'renderer.js'),'utf8'),context);
const Renderer=vm.runInContext('BarRenderer',context),renderer=Object.create(Renderer.prototype);
renderer.colors=new Map();renderer.scratch=new Float32Array(1);renderer.label=()=>null;
const reference=renderer.mesh(shapes);
const input=shapes.map(s=>[s.shape==='sphere'?2:s.round?1:0,s.x,s.y,s.z,s.w,s.h,s.d,
  s.rx||0,s.ry||0,s.rz||0,s.topRadius??1,s.bottomRadius??1].join(' ')).join('\n');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'comptoir-geometry-'));
try {
  const exe=path.join(temp,process.platform==='win32'?'probe.exe':'probe');
  cp.execFileSync(process.env.CXX||'g++',['-std=c++17','-Wall','-Wextra','-Werror','-pedantic',
    path.join(__dirname,'original_geometry_probe.cpp'),'-o',exe]);
  const native=cp.execFileSync(exe,{input,maxBuffer:128*1024*1024});
  const count=reference.length/12;
  assert.equal(native.length,count*7*8,'Vertex count must match');
  let maxPositionError=0,maxNormalError=0;
  for(let v=0;v<count;v++) {
    for(const [axis,source] of [[0,2],[1,0],[2,1]]) {
      const difference=Math.abs(native.readDoubleLE((v*7+axis)*8)-reference[v*12+source]*100);
      maxPositionError=Math.max(maxPositionError,difference);
      assert.ok(difference<.005,`vertex ${v} axis ${axis}: ${difference} cm`);
      const error=Math.abs(native.readDoubleLE((v*7+3+axis)*8)-reference[v*12+7+source]);
      maxNormalError=Math.max(maxNormalError,error);
      assert.ok(error<1e-5,`normal ${v} axis ${axis}: ${error}`);
    }
  }
  // Compare screen-right/up/depth, not just world coordinates. This catches the
  // previous mirror: yaw zero in the original looks +Z with +X to screen-right.
  for(const yaw of [0,.4,Math.PI/2,Math.PI,-1.2]) {
    const pitch=-.06,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    for(let v=0;v<count;v+=97) {
      const x=reference[v*12]-data.camera.x,y=reference[v*12+1]-data.camera.y,z=reference[v*12+2]-data.camera.z;
      const referenceView=[x*cy-z*sy,y*cp-(x*sy+z*cy)*sp,y*sp+(x*sy+z*cy)*cp];
      const nx=native.readDoubleLE(v*7*8)/100-data.camera.z;
      const ny=native.readDoubleLE((v*7+1)*8)/100-data.camera.x;
      const nz=native.readDoubleLE((v*7+2)*8)/100-data.camera.y;
      const unrealView=[-nx*sy+ny*cy,-nx*cy*sp-ny*sy*sp+nz*cp,nx*cy*cp+ny*sy*cp+nz*sp];
      for(let axis=0;axis<3;axis++)assert.ok(Math.abs(referenceView[axis]-unrealView[axis])<.0001,
        `screen projection differs: yaw ${yaw}, vertex ${v}, axis ${axis}`);
    }
  }
  const floor=data.collections.world.find(s=>s.x===2.3&&s.y===-.11&&s.z===-2.1);
  assert.equal(floor.collision,true,'The reserve must have a walkable floor');
  for(const s of data.collections.world.filter(s=>s.solid||s.roomFloor))assert.equal(s.collision,true);
  assert.ok(data.collections.world.some(s=>s.label==='LE PETIT COMPTOIR'));
  assert.ok(data.collections.world.some(s=>s.exterior));
  assert.deepEqual(data.camera,{x:6,y:1.68,z:1.55,a:0,pitch:-.06});
  console.log(`PASS: ${shapes.length} shapes / ${count} vertices and 5 camera directions match the original renderer; max position error ${maxPositionError.toFixed(6)} cm, max normal error ${maxNormalError.toExponential(2)}.`);
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
