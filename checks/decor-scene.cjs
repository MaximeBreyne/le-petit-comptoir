'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({});for(const file of ['engine.js','scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
const Scene=vm.runInContext('BarScene',context),Engine=context.BarEngine;
const full=()=>{const game=new Engine.Game();game.s.cash=10000;game.s.totalSold=80;for(const id of ['expansion1','table5','table6','expansion2','table7','table8'])game.purchaseUpgrade(id);return game};
test('decor changes surfaces throughout purchased rooms while leaving interaction positions and furniture footprints intact',()=>{
 const game=full(),original=Scene.create(game.s),footprint=boxes=>boxes.filter(box=>box.solid).map(({x,y,z,w,h,d,ry=0})=>({x,y,z,w,h,d,ry}));
 for(const [category,id]of [['tables','marble'],['chairs','leather'],['walls','midnight'],['ceiling','charcoal'],['floor','terracotta']])game.purchaseDecor(category,id);
 const shapes=Scene.create(game.s),style=Engine.decorStyle(game.s);assert.deepEqual(footprint(shapes),footprint(original));
 const floors=shapes.filter(box=>box.roomFloor);assert.equal(floors.length,3);
 assert.ok(floors.every(box=>box.mat===Scene.materials.tile&&box.c===style.floor.colors.surface));
 const tops=shapes.filter(box=>box.decorCategory==='tables');assert.equal(tops.length,8);assert.ok(tops.every(box=>box.c===style.tables.colors.top&&box.mat===Scene.materials.stone&&box.sideColor===style.tables.colors.edge));
 const seats=shapes.filter(box=>box.solid&&Math.abs(box.y-.48)<1e-8||box.solid&&Math.abs(box.y-.795)<1e-8);
 assert.equal(seats.length,22);assert.ok(seats.every(box=>box.c===style.chairs.colors.seat&&box.mat===Scene.materials.leather));
 const ceilings=shapes.filter(box=>box.y===3.45&&box.z>0);assert.equal(ceilings.length,3);assert.ok(ceilings.every(box=>box.c===style.ceiling.colors.surface));
 assert.ok(shapes.some(box=>box.x===12&&box.y===1.7&&box.c===style.walls.colors.plaster));
 assert.ok(shapes.some(box=>box.x===2.3&&box.z===-2.1&&box.mat===Scene.materials.tile&&box.c==='#82877b'),'Reserve retains its practical floor');
 for(const station of Engine.preparationSlots){const p=Scene.prepStation({recipe:station.kind==='cocktails'?'wine':station.kind,slotId:station.id});assert.equal(p.x,station.x);assert.equal(p.z,station.z);}
});

test('pouring streams run from their outlets into each vessel without floating above the rim or crossing the saucer',()=>{
 for(const recipe of ['beer','coffee','wine','mojito'])for(const amount of [0,Engine.recipes[recipe].target/2,Engine.recipes[recipe].target]){
  const point=Scene.prepStation({recipe,amount,ready:false}),bottom=point.stream.y-point.stream.h/2,top=point.stream.y+point.stream.h/2;
  const rim=point.y+(recipe==='beer'?.29:recipe==='coffee'?.143:recipe==='wine'?.275:.27);
  assert.ok(bottom<rim,'Stream enters the open vessel');assert.ok(bottom>point.y+.01,'Stream does not cross the bottom of the vessel');
  if(recipe==='beer')assert.ok(Math.abs(top-1.612)<1e-8,'Beer starts immediately under the metal outlet');
  if(recipe==='coffee')assert.ok(Math.abs(top-1.33)<1e-8,'Coffee starts under the espresso spout');
 }
});
