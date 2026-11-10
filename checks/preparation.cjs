'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Game,recipes,ingredients,preparationLayout}=require('../dist/engine.js');
const {staff,approach,stationPosition,gather,prepare}=require('./preparation-fixtures.cjs');
const clone=value=>JSON.parse(JSON.stringify(value));
const session=()=>{const game=new Game();game.open();game.s.spawn=999;return game};
const table={x:1.65,z:6.4};

test('preparation is restricted to the staff aisle and needs physical collection',()=>{
 const game=session(),before=clone(game.s);
 for(const position of [undefined,null,table,{x:6,z:4.3},{x:6,z:.5},{x:NaN,z:2},{x:6,z:Infinity}]){game.start('wine',position);assert.deepEqual(game.s,before)}
 game.start('wine',staff);assert.equal(game.s.stock.wine,150);assert.equal(game.preparationStatus(staff).stage,'vessel');
 const started=clone(game.s);game.step(staff);game.setPour(true,staff);game.finishPour(staff);game.finishMix(staff);game.plate(staff);assert.deepEqual(game.s,started);
 game.takeVessel(table);assert.equal(game.s.prep.held,null);
 game.takeVessel(approach(preparationLayout.vessels));assert.deepEqual(game.s.prep.held,{kind:'vessel'});
 game.placeHeld(table);assert.equal(game.s.prep.vesselPlaced,false);
 game.placeHeld(stationPosition(game));assert.equal(game.s.prep.vesselPlaced,true);
 game.takeIngredient('wine',table);assert.equal(game.s.stock.wine,150);
 game.takeIngredient('wine',approach(preparationLayout.ingredients.wine));assert.equal(game.s.stock.wine,135);
 const held=clone(game.s);game.takeIngredient('wine',approach(preparationLayout.ingredients.wine));assert.deepEqual(game.s,held);
 game.placeHeld(table);assert.equal(game.s.prep.added.wine,undefined);
 game.placeHeld(stationPosition(game));assert.equal(game.preparationStatus(staff).stage,'pour');
 const collected=clone(game.s);game.takeIngredient('wine',approach(preparationLayout.ingredients.wine));assert.deepEqual(game.s,collected);
 game.setPour(true,table);game.tick(.1);assert.equal(game.s.prep.amount,0);
 game.setPour(true,stationPosition(game));game.tick(.1);assert.equal(game.s.prep.amount,.5);
 game.setPour(false);const amount=game.s.prep.amount;game.tick(.1);assert.equal(game.s.prep.amount,amount);
 game.finishPour(table);assert.equal(game.s.prep.ready,false);
 game.s.prep.amount=15;game.finishPour(stationPosition(game));assert.equal(game.s.prep.ready,true);
 game.plate(table);assert.equal(game.s.tray.length,0);game.plate(stationPosition(game));assert.equal(game.s.tray.length,1);
});

test('all ten recipes consume precisely the ingredients physically taken',()=>{
 for(const id of Object.keys(recipes)){
  const game=session();for(const key of ['cocktails','softDrinks','spirits','signature'])game.s.management[key]=true;
  for(const [key,ingredient]of Object.entries(ingredients))game.s.stock[key]=ingredient.pack*2;
  const before=clone(game.s.stock);prepare(game,id);
  assert.equal(game.s.tray[0].recipe,id);assert.equal(game.s.tray[0].quality,100);
  for(const key of Object.keys(ingredients))assert.equal(game.s.stock[key],before[key]-(recipes[id].ingredients[key]||0));
 }
});

test('beer is drawn from the tap once, and a dry tap cannot create a free pint',()=>{
 const game=session(),station=gather(game,'beer');assert.equal(game.s.stock.beer,1000);
 game.finishPour(station);assert.equal(game.s.prep.ready,false);
 game.s.stock.beer=0;game.setPour(true,station);assert.equal(game.s.prep.pouring,false);assert.equal(game.s.prep.added.beer,undefined);
 game.s.stock.beer=50;game.setPour(true,station);assert.equal(game.s.stock.beer,0);assert.equal(game.s.prep.added.beer,true);
 game.setPour(false);game.setPour(true,station);assert.equal(game.s.stock.beer,0);game.tick(.1);assert.ok(game.s.prep.amount>0);
 const restored=new Game(clone(game.s));restored.setPour(true,station);assert.equal(restored.s.stock.beer,0);assert.equal(restored.s.prep.pouring,true);
});

test('shortages and occupied hands never consume missing or duplicate ingredients',()=>{
 const game=session();game.s.management.cocktails=true;game.start('mojito',staff);
 const wineBefore=game.s.stock.wine;game.takeIngredient('wine',approach(preparationLayout.ingredients.wine));assert.equal(game.s.stock.wine,wineBefore);
 game.takeIngredient('rum',approach(preparationLayout.ingredients.rum));assert.equal(game.s.stock.rum,70,'Vessel must be placed first');
 game.takeVessel(approach(preparationLayout.vessels));game.placeHeld(stationPosition(game));
 game.s.stock.rum=0;game.takeIngredient('rum',approach(preparationLayout.ingredients.rum));assert.equal(game.s.prep.held,null);assert.equal(game.s.stock.rum,0);
 game.takeIngredient('mint',approach(preparationLayout.ingredients.mint));assert.equal(game.s.stock.mint,11);
 game.takeIngredient('lime',approach(preparationLayout.ingredients.lime));assert.equal(game.s.stock.lime,12);assert.equal(game.s.prep.held.key,'mint');
 game.discard();assert.equal(game.s.stock.mint,11);assert.equal(game.s.stock.lime,12);assert.equal(game.s.stock.rum,0);
});

test('held ingredients and gathered state survive reload with no duplicate deduction',()=>{
 let game=session();game.start('wine',staff);game.takeVessel(approach(preparationLayout.vessels));
 game=new Game(clone(game.s));assert.equal(game.s.prep.held.kind,'vessel');game.placeHeld(stationPosition(game));
 game.takeIngredient('wine',approach(preparationLayout.ingredients.wine));game=new Game(clone(game.s));
 assert.deepEqual(game.s.prep.held,{kind:'ingredient',key:'wine',amount:15});assert.equal(game.s.stock.wine,135);
 game.placeHeld(stationPosition(game));game=new Game(clone(game.s));game.takeIngredient('wine',approach(preparationLayout.ingredients.wine));assert.equal(game.s.stock.wine,135);
 game.setPour(true,stationPosition(game));game.tick(.1);game=new Game(clone(game.s));assert.equal(game.s.prep.pouring,false);assert.equal(game.s.prep.amount,.5);assert.equal(game.s.stock.wine,135);
});

test('legacy prepaid preparations retain dose and quality without rededucting ingredients',()=>{
 for(const id of Object.keys(recipes))for(const ready of [false,true]){
  const saved=session().s,recipe=recipes[id];for(const key of ['cocktails','softDrinks','spirits','signature'])saved.management[key]=true;
  saved.prep={recipe:id,step:recipe.finishStep??recipe.pourStep,amount:recipe.target,quality:93,ready,pouring:true};
  saved.stock.wine=37;const before=clone(saved);let game=new Game(saved);assert.deepEqual(saved,before);
  assert.equal(game.s.prep.amount,recipe.target);assert.equal(game.s.prep.quality,93);assert.equal(game.s.prep.ready,ready);assert.equal(game.s.prep.pouring,false);
  assert.deepEqual(game.s.stock,before.stock);game=new Game(clone(game.s));assert.deepEqual(game.s.stock,before.stock);
  const station=stationPosition(game);if(!ready){if(recipe.finishStep!==undefined)game.finishMix(station);else game.finishPour(station)}game.plate(station);
  assert.equal(game.s.tray.length,1);assert.deepEqual(game.s.stock,before.stock);
 }
});

test('malformed physical held objects cannot materialize ingredients or advance the recipe',()=>{
 for(const held of [null,false,{}, {kind:'ingredient',key:'constructor',amount:1},{kind:'ingredient',key:'wine',amount:-1},{kind:'vessel'}]){
  const saved=session().s;saved.prep={recipe:'wine',physical:true,vesselPlaced:true,held,added:{wine:'yes'},step:1,amount:15,ready:true,quality:100};
  const game=new Game(saved);assert.equal(game.s.prep.ready,false);assert.equal(game.s.prep.held,null);assert.equal(game.isPour(),false);assert.deepEqual(game.s.stock,saved.stock);
 }
});
