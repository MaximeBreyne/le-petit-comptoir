'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Game,recipes,ingredients,preparationLayout,preparationSlots}=require('../dist/engine.js');
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

const vesselPosition=approach(preparationLayout.vessels);
function beginAndPlace(game,recipe,orderId){
 const count=game.preparations().length;
 assert.equal(game.preparationAvailability(recipe,vesselPosition,orderId),null);
 game.beginAtVessels(recipe,vesselPosition,orderId);
 assert.equal(game.preparations().length,count+1);
 assert.equal(game.s.prep.held.kind,'vessel');
 const p=game.s.prep;game.placeHeld(stationPosition(game));assert.equal(p.vesselPlaced,true);return p;
}
function addIngredients(game){
 for(const key of Object.keys(recipes[game.s.prep.recipe].ingredients).filter(key=>key!=='beer')){
  game.takeIngredient(key,approach(preparationLayout.ingredients[key]));assert.equal(game.s.prep.held?.key,key);
  game.placeHeld(stationPosition(game));
 }
}
function finishActive(game){
 const position=stationPosition(game);game.setPour(true,position);game.s.prep.amount=recipes[game.s.prep.recipe].target;
 game.finishPour(position);if(Number.isInteger(recipes[game.s.prep.recipe].finishStep))game.finishMix(position);
 assert.equal(game.s.prep.ready,true);
}
const pendingOrder=(id,recipe)=>({id,recipe,phase:'preparing',name:'Client '+id,patience:100,arrivalRemaining:0,tableId:null,slot:id-1,due:0,tender:0,paymentMethod:'card'});

test('five independently prepared drinks keep their own vessel, ingredients and dose',()=>{
 const game=session(),before=clone(game.s.stock),created=[];
 assert.equal(preparationSlots.length,5);
 for(const recipe of ['beer','beer','coffee','wine','wine']){
  const p=beginAndPlace(game,recipe);addIngredients(game);game.setPour(true,stationPosition(game));game.tick(.1);created.push(p);
 }
 assert.equal(game.preparations().length,5);assert.equal(new Set(created.map(p=>p.slotId)).size,5);
 assert.equal(new Set(created.map(p=>p.id)).size,5);
 assert.ok(created.slice(0,-1).every(p=>p.pouring===false));
 assert.deepEqual(created.map(p=>p.amount),[1.4000000000000001,1.4000000000000001,.8,.5,.5]);
 assert.equal(game.s.stock.beer,before.beer-100);assert.equal(game.s.stock.coffee,before.coffee-1);assert.equal(game.s.stock.wine,before.wine-30);
 const full=clone(game.s);game.beginAtVessels('wine',vesselPosition);assert.deepEqual(game.s,full);
 const first=created[0];game.selectPreparation(first.id,approach(game.preparationStation(first)));
 assert.equal(game.s.prep,first);assert.equal(game.s.prep.amount,1.4000000000000001);
 finishActive(game);game.plate(stationPosition(game));assert.equal(game.preparations().length,4);assert.equal(game.s.tray.length,1);
 beginAndPlace(game,'beer');assert.equal(game.preparations().length,5);assert.equal(game.s.prep.slotId,first.slotId);
});

test('occupied hands prevent switching or taking another glass without losing either preparation',()=>{
 const game=session(),first=beginAndPlace(game,'wine');
 beginAndPlace(game,'beer');game.selectPreparation(first.id,approach(game.preparationStation(first)));
 game.takeIngredient('wine',approach(preparationLayout.ingredients.wine));
 const before=clone(game.s),other=game.s.parkedPreps[0];
 game.beginAtVessels('coffee',vesselPosition);game.selectPreparation(other.id,approach(game.preparationStation(other)));
 assert.deepEqual(game.s,before);assert.equal(game.s.prep.held.key,'wine');
 game.placeHeld(stationPosition(game));game.selectPreparation(other.id,table);assert.equal(game.s.prep.id,first.id);
 game.selectPreparation(other.id,approach(game.preparationStation(other)));assert.equal(game.s.prep.id,other.id);
});

test('taking a recipe at the glass rack validates proximity, license and stock before any mutation',()=>{
 const game=session(),before=clone(game.s);
 game.beginAtVessels('wine',staff);assert.deepEqual(game.s,before);
 game.beginAtVessels('mojito',vesselPosition);assert.deepEqual(game.s,before);
 game.s.stock.wine=0;const empty=clone(game.s);game.beginAtVessels('wine',vesselPosition);assert.deepEqual(game.s,empty);
 game.s.stock.wine=15;game.beginAtVessels('wine',vesselPosition);
 assert.equal(game.s.prep.recipe,'wine');assert.deepEqual(game.s.prep.held,{kind:'vessel'});assert.equal(game.s.stock.wine,15);
 const held=clone(game.s);game.beginAtVessels('beer',vesselPosition);assert.deepEqual(game.s,held);
});

test('a full serving tray does not prevent counter work and never discards a finished glass',()=>{
 const game=session();game.s.tray=[{recipe:'wine',quality:95},{recipe:'beer',quality:90}];
 const p=beginAndPlace(game,'coffee');addIngredients(game);finishActive(game);
 const before=clone(game.s);game.plate(stationPosition(game));assert.deepEqual(game.s,before);
 game.discard(0);game.plate(stationPosition(game));assert.equal(game.s.prep,null);assert.equal(game.s.tray.length,2);
 assert.equal(game.s.tray[1].recipe,p.recipe);assert.equal(game.s.waste,1);
});

test('all five preparations and one held ingredient survive saves without duplicate stock use',()=>{
 let game=session();const created=[];
 for(const recipe of ['beer','beer','coffee','wine','wine']){const p=beginAndPlace(game,recipe);created.push(p);if(recipe!=='wine'){addIngredients(game);game.setPour(true,stationPosition(game));game.tick(.1)}}
 game.takeIngredient('wine',approach(preparationLayout.ingredients.wine));
 const saved=clone(game.s),original=clone(saved);game=new Game(saved);
 assert.deepEqual(saved,original);assert.equal(game.preparations().length,5);assert.deepEqual(game.s.stock,saved.stock);
 assert.equal(game.s.prep.id,saved.prep.id);assert.deepEqual(game.s.prep.held,saved.prep.held);
 for(const p of game.preparations()){
  const old=[saved.prep,...saved.parkedPreps].find(entry=>entry.id===p.id);
  assert.equal(p.slotId,old.slotId);assert.equal(p.amount,old.amount);assert.deepEqual(p.added,old.added);assert.equal(p.pouring,false);
 }
 game.placeHeld(stationPosition(game));const stock=clone(game.s.stock);game=new Game(clone(game.s));
 game.takeIngredient('wine',approach(preparationLayout.ingredients.wine));assert.deepEqual(game.s.stock,stock);
});

test('order queue counts identical recipes individually and never reveals unknown or arriving orders',()=>{
 const game=session();game.s.orders=[pendingOrder(1,'beer'),pendingOrder(2,'beer'),pendingOrder(3,'wine'),{...pendingOrder(4,'coffee'),phase:'awaiting-order'},{...pendingOrder(5,'wine'),arrivalRemaining:2}];game.s.nextId=6;
 assert.deepEqual(game.preparationQueue().map(row=>row.orderId),[1,2,3]);
 game.s.tray=[{recipe:'beer',quality:100}];
 assert.deepEqual(game.preparationQueue().map(row=>row.status),['ready','todo','todo']);
 const beer=beginAndPlace(game,'beer');assert.equal(beer.orderId,2);
 const wine=beginAndPlace(game,'wine',3);assert.equal(wine.orderId,3);
 assert.deepEqual(game.preparationQueue().map(row=>row.status),['ready','preparing','preparing']);
 const before=clone(game.s);game.beginAtVessels('beer',vesselPosition,2);assert.deepEqual(game.s,before);
 game.serve(1,game.orderPosition(game.s.orders[0]));assert.deepEqual(game.preparationQueue().map(row=>row.orderId),[2,3]);
});

test('bartender and player claim distinct same-recipe orders and the waiter takes each tray drink once',()=>{
 const game=session();game.s.orders=[pendingOrder(1,'beer'),pendingOrder(2,'beer'),pendingOrder(3,'wine')];game.s.nextId=4;
 const player=beginAndPlace(game,'beer',1);game.s.management.bartender=true;game.tick(.1);
 assert.equal(game.s.staff.bartender.orderId,2);assert.equal(player.orderId,1);
 assert.equal(game.preparationQueue().find(row=>row.orderId===2).worker,'bartender');
 const blocked=clone(game.s);game.beginAtVessels('beer',vesselPosition,2);assert.deepEqual(game.s,blocked);
 for(let i=0;i<100&&!game.s.tray.length;i++)game.tick(.1);
 assert.equal(game.s.tray[0].orderId,2);assert.equal(game.s.stock.beer,950);
 game.s.management.bartender=false;game.s.staff.bartender=null;
 finishActive(game);game.plate(stationPosition(game));assert.equal(game.s.tray[1].orderId,1);
 assert.equal(game.s.stock.beer,900);
 game.s.management.waiter=true;game.tick(.1);assert.equal(game.s.staff.waiter.task,'serve');
 const assigned=game.s.staff.waiter.orderId;assert.equal(game.preparationQueue().find(row=>row.orderId===assigned).status,'serving');
 assert.equal(game.s.tray.length,1);assert.notEqual(game.s.tray[0].orderId,assigned);
});

test('serving a spare drink releases the reserved preparation without duplicate staff work',()=>{
 for(const delivery of ['player','waiter']){
  const game=session();game.s.orders=[pendingOrder(1,'beer'),pendingOrder(2,'beer')];game.s.nextId=3;
  const first=game.s.orders[0],second=game.s.orders[1],p=beginAndPlace(game,'beer',1);
  game.setPour(true,stationPosition(game));game.tick(.1);game.setPour(false);
  const stock=clone(game.s.stock),amount=p.amount;
  game.s.tray=[{recipe:'wine',quality:100},{recipe:'beer',quality:60}];
  if(delivery==='player')game.serve(first.id,game.orderPosition(first));
  else {
   game.s.management.waiter=true;game.tick(.1);
   assert.equal(game.s.staff.waiter.orderId,first.id);assert.equal(game.s.staff.waiter.drink.recipe,'beer');
   for(let tick=0;tick<200&&first.phase==='preparing';tick++)game.tick(.1);
  }
  assert.equal(first.phase,'drinking');assert.equal(first.due,recipes.beer.price);assert.equal(first.tip,0);
  assert.deepEqual(game.s.tray,[{recipe:'wine',quality:100}]);
  assert.equal(p.orderId,null);assert.equal(p.amount,amount);
  assert.equal(game.preparationQueue().length,1);assert.equal(game.preparationQueue()[0].orderId,second.id);
  assert.equal(game.preparationQueue()[0].prepId,p.id);
  game.s.management.bartender=true;game.s.management.waiter=true;game.tick(.1);
  assert.equal(game.s.staff.bartender,null);assert.equal(game.s.staff.waiter,null);assert.deepEqual(game.s.stock,stock);
  finishActive(game);game.plate(stationPosition(game));game.tick(.1);
  assert.equal(game.s.staff.waiter.task,'serve');assert.equal(game.s.staff.waiter.orderId,second.id);
  assert.equal(game.s.staff.waiter.drink.recipe,'beer');assert.equal(game.s.tray.length,1);
  const assigned=clone(game.s.staff.waiter),tray=clone(game.s.tray);
  game.serve(second.id,game.orderPosition(second));
  assert.deepEqual(game.s.staff.waiter,assigned);assert.deepEqual(game.s.tray,tray);
  assert.equal(game.s.staff.bartender,null);assert.deepEqual(game.s.stock,stock);
 }
});

test('loading stale served or departed ticket links releases drinks without changing paid ingredients',()=>{
 const game=session();game.s.orders=[pendingOrder(1,'wine'),pendingOrder(2,'beer')];game.s.nextId=3;
 const wine=beginAndPlace(game,'wine',1);addIngredients(game);
 const beer=beginAndPlace(game,'beer',2);game.setPour(true,stationPosition(game));game.tick(.1);
 game.s.orders[0].phase='drinking';game.s.orders[0].drinkRemaining=4;game.s.orders.pop();
 game.s.tray=[{recipe:'wine',quality:91,orderId:1},{recipe:'beer',quality:88,orderId:2}];
 game.s.orders.push(pendingOrder(3,'wine'),pendingOrder(4,'beer'));game.s.nextId=5;
 const saved=clone(game.s),before=clone(saved),restored=new Game(saved);
 assert.deepEqual(saved,before);assert.deepEqual(restored.s.stock,before.stock);
 assert.ok(restored.preparations().every(prep=>prep.orderId===null&&prep.pouring===false));
 assert.deepEqual(restored.s.tray,[{recipe:'wine',quality:91},{recipe:'beer',quality:88}]);
 assert.equal(restored.preparations().find(prep=>prep.id===wine.id).added.wine,true);
 assert.equal(restored.preparations().find(prep=>prep.id===beer.id).amount,beer.amount);
 assert.deepEqual(restored.preparationQueue().map(row=>[row.orderId,row.status]),[[3,'ready'],[4,'ready']]);
 restored.s.management.bartender=true;restored.tick(.1);
 assert.equal(restored.s.staff.bartender,null);assert.deepEqual(restored.s.stock,before.stock);
 restored.serve(3,restored.orderPosition(restored.s.orders.find(order=>order.id===3)));
 restored.serve(4,restored.orderPosition(restored.s.orders.find(order=>order.id===4)));
 assert.equal(restored.s.tray.length,0);assert.equal(restored.preparationQueue().length,0);
});

test('discarding one preparation and ending the day account for every remaining glass exactly once',()=>{
 const game=session();beginAndPlace(game,'beer');beginAndPlace(game,'coffee');beginAndPlace(game,'wine');
 game.discard();assert.equal(game.preparations().length,2);assert.equal(game.s.waste,1);
 game.s.tray=[{recipe:'beer',quality:100}];const report=game.end();
 assert.equal(report.waste,4);assert.equal(game.preparations().length,0);assert.deepEqual(game.s.parkedPreps,[]);
});

test('a departing client releases their preparation for another matching order without refunding ingredients',()=>{
 const game=session();game.s.orders=[pendingOrder(1,'wine'),pendingOrder(2,'wine')];game.s.nextId=3;
 const p=beginAndPlace(game,'wine',1);addIngredients(game);const stock=clone(game.s.stock);
 game.s.orders[0].patience=.05;game.s.management.bartender=true;game.tick(.1);
 assert.equal(game.s.lost,1);assert.equal(p.orderId,null);assert.deepEqual(game.s.stock,stock);assert.equal(game.s.staff.bartender,null);
 assert.equal(game.preparationQueue()[0].prepId,p.id);finishActive(game);game.plate(stationPosition(game));
 game.serve(2,game.orderPosition(game.s.orders[0]));assert.equal(game.s.orders[0].phase,'drinking');assert.deepEqual(game.s.stock,stock);
});
