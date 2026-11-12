'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mockContext={fillRect(){},fillText(){},measureText(text){return {width:text.length*60,actualBoundingBoxAscent:74,actualBoundingBoxDescent:15}}};
const context=vm.createContext({document:{createElement:()=>({getContext:()=>({...mockContext})})}});
for(const file of ['engine.js','renderer.js','scene.js','venue.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const {Renderer,Scene,Venue}=vm.runInContext('({Renderer:BarRenderer,Scene:BarScene,Venue:BarVenue})',context);
function renderer(limit){
 const result=Object.create(Renderer.prototype);
 result.gl={MAX_TEXTURE_SIZE:0x0d33,getParameter:()=>limit,bindBuffer(){},bufferData(){}};
 result.colors=new Map();result.scratch=new Float32Array(16384);result.sceneLabels=[...Venue.labelTemplates,...Scene.terminalLabelTemplates];result.uploadAtlas=()=>{};
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
 for(const box of [...boxes,...Venue.labelTemplates,...Scene.terminalLabelTemplates].filter(b=>b.label||b.labelLines)){
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

test('cached ellipsoids translate and recolor independently without unbounded growth',()=>{
 const r=renderer(4096),a={x:1,y:2,z:3,w:.2,h:.3,d:.25,c:'#ff0000',shape:'sphere',ry:.2};
 const first=r.mesh([a]).slice(),moved=r.mesh([{...a,x:5,c:'#0000ff',mat:9}]).slice();
 assert.equal(r.sphereModels.size,1,'World position, material and tint do not duplicate the model');
 for(let i=0;i<first.length;i+=12){assert.ok(Math.abs(moved[i]-first[i]-4)<1e-6);assert.equal(moved[i+1],first[i+1]);assert.equal(moved[i+2],first[i+2]);assert.equal(moved[i+3],0);assert.equal(moved[i+5],1);assert.equal(moved[i+6],9);}
 for(let i=0;i<270;i++)r.sphereModel({...a,ry:i*.01});
 assert.equal(r.sphereModels.size,256,'Continuously changing rotations obey the cache memory bound');
 assert.deepEqual(r.mesh([a]),first,'An evicted model regenerates the same geometry');
});

test('window daylight fades through the evening while invalid or out-of-range times remain bounded',()=>{
 assert.equal(Renderer.daylightAt(),1);
 assert.ok(Renderer.daylightAt(1020)>Renderer.daylightAt(1200));
 assert.ok(Renderer.daylightAt(1200)>Renderer.daylightAt(1350));
 assert.equal(Renderer.daylightAt(1440),0);
 assert.equal(Renderer.daylightAt(1700),0);
 assert.equal(Renderer.daylightAt(-100),1);
 assert.equal(Renderer.daylightAt(NaN),1);
});

test('all twenty-two clients and seven employees cast contacts on their own floor and clear when people leave',()=>{
 assert.equal(Renderer.maxContactPeople,29);
 const r=renderer(4096);r.people=new Float32Array(Renderer.maxContactPeople*4);
 const people=Array.from({length:30},(_,index)=>({x:index+1,z:index/2,contactShadow:true,contactFloor:index%2?3.6:0}));
 r.contactShadows([{x:100,z:100},...people]);
 for(let i=0;i<29;i++){assert.equal(r.people[i*4],people[i].x);assert.equal(r.people[i*4+1],people[i].z);assert.ok(Math.abs(r.people[i*4+2]-people[i].contactFloor)<1e-6);assert.equal(r.people[i*4+3],1);}
 assert.equal(r.people.length,116,'Departing extras cannot grow the fixed GPU upload');
 r.contactShadows([people[0]]);assert.equal(r.people[3],1);assert.ok([...r.people.subarray(4)].every(value=>value===0));
});

for(const limit of [2048,4096])test(`expansion rebuilds fit the ${limit}px atlas and adjust the shadow extent`,()=>{
 const r=renderer(limit),game=new context.BarEngine.Game();game.s.cash=10000;game.s.totalSold=80;
 for(const id of ['expansion1','table5','table6','expansion2','table7','table8']){
  game.purchaseUpgrade(id);const boxes=Scene.create(game.s);Venue.addFrame(boxes);r.setScene(boxes);
  assert.equal(r.buildingWidth,game.buildingInfo().width);inspectAtlas(r);
 }
 assert.equal(r.buildingWidth,21);
 r.setScene(Scene.create());assert.equal(r.buildingWidth,12,'Starting over restores the original shadow volume');
});

for(const limit of [2048,4096])test(`both storeys, the club and all sixteen table signs fit the ${limit}px atlas with separate shadow geometry`,()=>{
 const r=renderer(limit),game=new context.BarEngine.Game();for(const id of Object.keys(context.BarEngine.managementUpgrades))game.s.management[id]=true;
 const boxes=Scene.create(game.s);Venue.addFrame(boxes);r.setScene(boxes);inspectAtlas(r);
 assert.equal(r.buildingWidth,32);assert.equal(r.hasUpstairs,true);assert.equal(r.shadowFloor,0);
 assert.ok(r.upperShadowMesh.length>0&&r.groundShadowMesh.length>r.upperShadowMesh.length);
 for(let offset=1;offset<r.upperShadowMesh.length;offset+=12)assert.ok(r.upperShadowMesh[offset]>=3.5,'The upper shadow buffer cannot contain ground-floor furniture');
 r.setScene(Scene.create());assert.equal(r.hasUpstairs,false);assert.equal(r.upperShadowMesh,null);assert.equal(r.shadowFloor,0);
});

test('clear panes are separated from opaque depth and shadow geometry',()=>{
 const r=renderer(4096),uploaded=[];r.gl.bufferData=(_target,data)=>uploaded.push(data.length/12);
 const solid={x:0,y:1,z:3,w:1,h:1,d:.1,c:'#aa4433',mat:0};
 const pane={...solid,z:2,mat:11};r.setScene([solid,pane]);
 assert.equal(r.staticGlass.length,1);assert.equal(r.staticGlass[0],pane);
 assert.equal(r.count,36);assert.equal(r.shadowCount,36);assert.deepEqual(uploaded,[36,36]);
});

test('character visibility preserves near bodies and screen-edge limbs using actual yaw, pitch, FOV and aspect ratio',()=>{
 const camera={x:0,y:1.68,z:0,a:0,pitch:0},visible=(point,view=camera,fov=90,aspect=1)=>Renderer.characterVisible({x:0,y:1.68,z:10,radius:1.35,...point},view,fov,aspect);
 assert.equal(visible({}),true);assert.equal(visible({z:-3}),false);assert.equal(visible({z:-.5}),true);
 assert.equal(visible({x:100,z:.5}),false,'Near depth does not keep an unrelated character far beside the camera');
 assert.equal(visible({x:11.8}),true,'A limb can intersect the screen edge even with its center off-screen');assert.equal(visible({x:12.1}),false);
 assert.equal(visible({y:13.48}),true);assert.equal(visible({y:13.78}),false);
 assert.equal(visible({x:15},camera,90,16/9),true);assert.equal(visible({x:15}),false);
 assert.equal(visible({x:8},camera,60),false);assert.equal(visible({x:8},camera,100),true);
 assert.equal(visible({x:10,z:0},{...camera,a:Math.PI/2}),true);assert.equal(visible({x:-10,z:0},{...camera,a:Math.PI/2}),false);
 assert.equal(visible({y:11.68,z:0},{...camera,pitch:Math.PI/2}),true);assert.equal(visible({y:-8.32,z:0},{...camera,pitch:Math.PI/2}),false);
 const upper={...camera,y:5.28};assert.equal(visible({y:4.6},upper),true,'Upstairs characters use their world altitude');
});

test('table edge finishes reach only the sides of the actual mesh without adding intersecting surfaces',()=>{
 const r=renderer(4096),shape={x:0,y:1,z:0,w:1,h:.1,d:1,c:'#ffffff',sideColor:'#000000',mat:12,round:true};
 const data=r.mesh([shape]).slice(),plain=r.mesh([{...shape,sideColor:undefined}]);
 assert.equal(data.length,plain.length,'Edge finish does not require a second coplanar mesh');
 let top=0,edge=0;
 for(let i=0;i<data.length;i+=12){
  assert.deepEqual([...data.subarray(i,i+3)],[...plain.subarray(i,i+3)]);
  const horizontal=Math.abs(data[i+8])>.99;assert.deepEqual([...data.subarray(i+3,i+6)],horizontal?[1,1,1]:[0,0,0]);
  if(horizontal)top++;else edge++;
 }
 assert.ok(top>0&&edge>0);
});

test('tiled annexes retain the complete light and shadow volume after changing floor materials',()=>{
 const game=new context.BarEngine.Game();game.s.cash=10000;game.s.totalSold=80;
 for(const id of ['expansion1','table5','table6','expansion2','table7','table8'])game.purchaseUpgrade(id);
 game.purchaseDecor('floor','terracotta');const r=renderer(4096);r.setScene(Scene.create(game.s));
 assert.equal(r.buildingWidth,21);
 game.purchaseDecor('floor','oak');r.setScene(Scene.create(game.s));assert.equal(r.buildingWidth,21);
});

test('register tickets reuse one display canvas and leave all static labels and UVs unchanged',()=>{
 const r=renderer(2048);r.setScene(Scene.create());const labels=[...r.labelMap].map(([key,rect])=>[key,{...rect}]);
 const screen={x:2.65,y:1.438,z:2.928,w:.551,h:.310,d:.004,mat:14,c:'#ffffff',display:'register',labelFace:'front',screenData:{ticket:1,customer:'Lucie',recipe:'Nuit Pourpre',price:16,tip:1,total:17,phase:'payment',method:'cash'}};
 const before=r.mesh([screen]).slice(),canvas=r.registerCanvas,updates=r.registerUpdates;
 for(let i=0;i<20;i++)assert.deepEqual(r.mesh([screen]),before);
 assert.equal(r.registerUpdates,updates,'Unchanged bills do not redraw the canvas');
 for(let i=0;i<200;i++)r.mesh([{...screen,screenData:{...screen.screenData,ticket:i,total:i+.5}}]);
 assert.equal(r.registerCanvas,canvas);assert.equal(canvas.width,1024);assert.equal(canvas.height,576);
 assert.equal(r.labelMap.size,labels.length);for(const [key,rect]of labels)assert.deepEqual({...r.labelMap.get(key)},rect);
 assert.deepEqual(r.mesh([screen]),before,'Changing a ticket never changes its screen geometry or texture coordinates');
});

test('street ground and neighbouring buildings continue beyond the visible range without adding interior collisions or shadow casters',()=>{
 for(const state of [new context.BarEngine.Game().s,{management:Object.fromEntries(Object.keys(context.BarEngine.managementUpgrades).map(key=>[key,true]))}]){
  const boxes=Scene.create(state),exterior=boxes.filter(box=>box.exterior),ground=exterior.find(box=>box.mat===15&&box.d===5.1);
  assert.ok(ground.x-ground.w/2<-180&&ground.x+ground.w/2>180+context.BarEngine.buildingLayout(state).width);
  assert.ok(exterior.length>100);assert.ok(exterior.every(box=>box.castShadow===false&&!box.solid));
  const housing=boxes.find(box=>box.registerHousing);assert.ok(housing.y+housing.h/2<=1.62,'A standing customer can be seen above the register');
  assert.ok(housing.y-housing.h/2>1.245,'The monitor does not intersect the cash drawer');
 }
});
