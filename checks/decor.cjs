'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Game,decorCatalog,decorStyle}=require('../dist/engine.js');
const clone=value=>JSON.parse(JSON.stringify(value));

test('new and legacy bars retain their original free decor without receiving paid finishes',()=>{
 const game=new Game(),defaults={tables:'oak',chairs:'bistro',walls:'cream',ceiling:'ivory',floor:'oak'};
 assert.deepEqual(game.s.decor,defaults);assert.equal(Object.values(decorCatalog).flatMap(category=>category.options).length,18);
 for(const [category,id]of Object.entries(defaults)){
  assert.deepEqual(game.s.decorOwned[category],[id]);assert.equal(decorStyle(game.s)[category].id,id);
  assert.equal(game.decorInfo(category,id).selected,true);assert.equal(game.decorInfo(category,id).price,0);
 }
 const legacy=clone(game.s);delete legacy.decor;delete legacy.decorOwned;
 const before=clone(legacy),restored=new Game(legacy);assert.deepEqual(legacy,before);assert.deepEqual(restored.s.decor,defaults);
 assert.deepEqual(restored.s.stock,before.stock);assert.equal(restored.s.cash,before.cash);assert.equal(restored.s.expenses,before.expenses);
 assert.ok(Object.isFrozen(decorCatalog));for(const catalog of Object.values(decorCatalog)){assert.ok(Object.isFrozen(catalog.options));for(const option of catalog.options)assert.ok(Object.isFrozen(option.colors))}
});

test('a finish is paid exactly once and can be reapplied freely without changing stock or progression',()=>{
 const game=new Game(),cash=game.s.cash,stock=clone(game.s.stock),reserve=clone(game.s.reserve),management=clone(game.s.management);
 game.purchaseDecor('tables','walnut');assert.equal(game.s.cash,cash-120);assert.equal(game.s.expenses,120);assert.equal(decorStyle(game.s).tables.id,'walnut');
 const bought=clone(game.s);game.purchaseDecor('tables','walnut');assert.deepEqual(game.s,bought);
 game.purchaseDecor('tables','oak');assert.equal(game.s.cash,cash-120);assert.equal(game.s.expenses,120);assert.equal(decorStyle(game.s).tables.id,'oak');
 game.purchaseDecor('tables','walnut');assert.equal(game.s.cash,cash-120);assert.deepEqual(game.s.decorOwned.tables,['oak','walnut']);
 assert.deepEqual(game.s.stock,stock);assert.deepEqual(game.s.reserve,reserve);assert.deepEqual(game.s.management,management);assert.equal(game.s.totalSold,0);assert.equal(game.s.orders.length,0);
});

test('progression, funds, active service and invalid choices reject decor changes without side effects',()=>{
 const game=new Game();
 for(const [category,id]of [['tables','marble'],['ceiling','charcoal'],['unknown','oak'],['tables','__proto__'],['__proto__','oak']]){const before=clone(game.s);game.purchaseDecor(category,id);assert.deepEqual(game.s,before)}
 game.s.cash=10;let before=clone(game.s);game.purchaseDecor('tables','walnut');assert.deepEqual(game.s,before);
 game.s.cash=500;game.open();before=clone(game.s);game.purchaseDecor('walls','sage');assert.deepEqual(game.s,before);assert.match(game.decorInfo('walls','sage').blockedReason,/Fermez/);
 game.s.open=false;game.s.closing=true;before=clone(game.s);game.purchaseDecor('walls','sage');assert.deepEqual(game.s,before);
 game.s.closing=false;game.s.orders=[{id:1,recipe:'beer',patience:100,phase:'payment'}];before=clone(game.s);game.purchaseDecor('walls','sage');assert.deepEqual(game.s,before);
 game.s.orders=[];game.s.gameOver=true;before=clone(game.s);game.purchaseDecor('walls','sage');assert.deepEqual(game.s,before);
});

test('all owned finishes and the selected combination survive save, load, and expansion purchases',()=>{
 const game=new Game();game.s.cash=10000;game.s.totalSold=80;
 for(const [category,catalog]of Object.entries(decorCatalog))for(const option of catalog.options)game.purchaseDecor(category,option.id);
 for(const id of ['expansion1','table5','table6','expansion2','table7','table8'])game.purchaseUpgrade(id);
 const saved=clone(game.s),before=clone(saved),restored=new Game(saved);
 assert.deepEqual(saved,before);assert.deepEqual(restored.s.decor,saved.decor);assert.deepEqual(restored.s.decorOwned,saved.decorOwned);
 assert.deepEqual(decorStyle(restored.s),decorStyle(game.s));assert.equal(restored.s.cash,saved.cash);assert.equal(restored.s.expenses,saved.expenses);assert.equal(restored.buildingInfo().tableCount,8);
 for(const [category,catalog]of Object.entries(decorCatalog))for(const option of catalog.options){assert.equal(restored.decorInfo(category,option.id).owned,true);assert.equal(restored.decorInfo(category,option.id).price,0)}
});

test('malformed and unknown saved finishes fall back safely without granting selected paid styles',()=>{
 const game=new Game();game.s.decor={tables:'marble',chairs:'missing',walls:'midnight',ceiling:'white',floor:'oak'};
 game.s.decorOwned={tables:[],chairs:['missing'],walls:['midnight','midnight','unknown'],ceiling:'white',floor:null};
 const saved=clone(game.s),before=clone(saved),restored=new Game(saved);
 assert.deepEqual(saved,before);assert.deepEqual(restored.s.decor,{tables:'oak',chairs:'bistro',walls:'midnight',ceiling:'ivory',floor:'oak'});
 assert.deepEqual(restored.s.decorOwned.walls,['cream','midnight']);assert.equal(restored.s.cash,saved.cash);
 assert.equal(restored.decorInfo('tables','marble').owned,false);assert.equal(restored.decorInfo('ceiling','white').owned,false);
});
