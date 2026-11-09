'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mockContext={fillRect(){},fillText(){},measureText(text){return {width:text.length*60,actualBoundingBoxAscent:74,actualBoundingBoxDescent:15}}};
const context=vm.createContext({document:{createElement:()=>({getContext:()=>({...mockContext})})}});
for(const file of ['renderer.js','scene.js','venue.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const {Renderer,Scene,Venue}=vm.runInContext('({Renderer:BarRenderer,Scene:BarScene,Venue:BarVenue})',context);
function renderer(limit){
 const result=Object.create(Renderer.prototype);
 result.gl={MAX_TEXTURE_SIZE:0x0d33,getParameter:()=>limit,bindBuffer(){},bufferData(){}};
 result.colors=new Map();result.scratch=new Float32Array(16384);result.sceneLabels=Venue.labelTemplates;result.uploadAtlas=()=>{};
 return result;
}
function inspectAtlas(r){
 const rectangles=[...r.labelMap.values()];
 for(const a of rectangles){assert.ok(a.u0>=0&&a.u1<=1&&a.v0>=0&&a.v1<=1);assert.ok(a.u1>a.u0&&a.v1>a.v0);}
 for(let i=0;i<rectangles.length;i++)for(let j=0;j<i;j++){
  const a=rectangles[i],b=rectangles[j];assert.ok(Math.min(a.u1,b.u1)<=Math.max(a.u0,b.u0)||Math.min(a.v1,b.v1)<=Math.max(a.v0,b.v0),'Distinct label regions never overlap');
 }
}
for(const limit of [4096,2048])test(`the real venue labels fit the ${limit}px atlas, retain resolution and survive dynamic additions`,()=>{
 const r=renderer(limit),boxes=Scene.create();Venue.addFrame(boxes);r.setScene(boxes);
 assert.equal(r.atlas.width,limit);assert.equal(r.atlas.height,2048);assert.ok(r.labelMap.size>=30);inspectAtlas(r);
 const existing=[...r.labelMap].map(([key,rect])=>[key,{...rect}]);
 for(const box of [...boxes,...Venue.labelTemplates].filter(b=>b.label||b.labelLines)){
  const rect=r.label(box),size=r.labelDimensions(box);assert.ok(Math.abs((rect.u1-rect.u0)*r.atlas.width-size.w)<1e-6);assert.ok(Math.abs((rect.v1-rect.v0)*r.atlas.height-size.h)<1e-6);
  assert.ok(Math.abs(size.w/size.h/r.labelAspect(box)-1)<.025,'Glyph aspect ratio follows the physical sign');
 }
 const count=r.labelMap.size;for(const state of [{open:false,closing:false},{open:true,closing:false},{open:true,closing:true}]){const dynamic=[];Venue.render(dynamic,state);r.mesh(dynamic);}
 assert.equal(r.labelMap.size,count,'Changing the entrance sign reuses its preloaded regions');
 r.label({x:0,y:0,z:0,w:1,h:.25,d:.01,c:'#123456',label:'ÉTIQUETTE DYNAMIQUE',labelPixels:480});inspectAtlas(r);
 for(const [key,rect]of existing)assert.deepEqual({...r.labelMap.get(key)},rect,'Dynamic labels cannot relocate existing UVs');
 r.setScene(boxes);assert.equal(r.labelMap.size,count);for(const [key,rect]of existing)assert.deepEqual({...r.labelMap.get(key)},rect,'Resetting the scene gives deterministic label placement');
});

test('an exhausted atlas rejects the new region without changing existing allocations',()=>{
 const r=renderer(2048);r.resetAtlas();r.atlasFreeRects=[{x:0,y:0,w:32,h:32}];
 const before=JSON.stringify(r.atlasFreeRects);assert.throws(()=>r.allocateLabel(33,20),/pleine/);assert.equal(JSON.stringify(r.atlasFreeRects),before);
 const filled=r.allocateLabel(32,32);assert.equal(filled.x,0);assert.equal(filled.y,0);assert.equal(r.atlasFreeRects.length,0);assert.throws(()=>r.allocateLabel(1,1),/pleine/);
});

test('cached sphere topology keeps triangle order, exact endpoints and normalized transformed normals',()=>{
 const r=renderer(4096),topology=Renderer.topology();assert.equal(Renderer.topology(),topology);assert.equal(topology.sphere.length,16*10*6*3);
 const box={x:3,y:2,z:5,w:.4,h:.7,d:.9,c:'#123456',shape:'sphere',rx:.2,ry:.7,rz:.3};
 const result=r.mesh([box]).slice();assert.equal(result.length/12,16*10*6);
 for(let i=0;i<result.length;i+=12){assert.ok(Number.isFinite(result[i]));assert.ok(Math.abs(Math.hypot(result[i+7],result[i+8],result[i+9])-1)<1e-6);assert.equal(result[i+10],-1);assert.equal(result[i+11],-1);}
 // For the south-pole strip the first and fourth triangle corners coincide.
 for(let i=0;i<16;i++){const first=i*6*12;assert.deepEqual([...result.subarray(first,first+3)],[...result.subarray(first+36,first+39)]);}
 assert.deepEqual(r.mesh([box]),result,'Repeated frames produce the same geometry');
});
