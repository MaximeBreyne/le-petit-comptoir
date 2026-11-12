'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Game,recipes,ingredients,managementUpgrades,isValidStock,registerPosition}=require('../dist/engine.js');

const {staff,gather,stationPosition}=require('./preparation-fixtures.cjs');
const {reachCheckout}=require('./checkout-fixtures.cjs');
const newIngredients=['whisky','gin','tonic','cola'];
const newRecipes=['virginMojito','lemonade','whisky','ginTonic','ginFizz','cubaLibre'];
const licenses=['cocktails','softDrinks','spirits','signature'];
const clone=value=>JSON.parse(JSON.stringify(value));
const advance=(game,seconds)=>{for(let remaining=seconds;remaining>1e-9;remaining-=.1)game.tick(Math.min(.1,remaining))};
function licensedGame(){
 const game=new Game();game.s.cash=2000;game.s.totalSold=100;
 for(const id of licenses)game.purchaseUpgrade(id);
 game.open();game.s.spawn=999;return game;
}
function addOrder(game,recipe){
 const order={id:game.s.nextId++,name:'Nadia',recipe,patience:100,tableId:null,slot:0,phase:'preparing',arrivalRemaining:0,drinkRemaining:0,paymentMethod:'card',due:0,tender:0,cardRemaining:0};
 game.s.orders.push(order);return order;
}

test('legacy stock accepts absent extension keys but rejects malformed quantities',()=>{
 const stock=clone(new Game().s.stock);for(const [key,ingredient]of Object.entries(ingredients))if(ingredient.license)delete stock[key];
 assert.equal(isValidStock(stock),true);
 for(const key of Object.keys(ingredients))for(const invalid of [NaN,Infinity,-1,'0',null,undefined]){
  assert.equal(isValidStock({...stock,[key]:invalid}),false,key+' must be numeric and nonnegative when present');
 }
 for(const key of Object.keys(stock)){const missing={...stock};delete missing[key];assert.equal(isValidStock(missing),false)}
 for(const invalid of [null,[],false,'stock'])assert.equal(isValidStock(invalid),false);
 for(const key of newIngredients)assert.equal(isValidStock({...stock,[key]:12.5}),true);
});

test('new licenses charge once at their progression threshold and never grant inventory',()=>{
 const game=new Game();game.s.cash=2000;const stock=clone(game.s.stock),reserve=clone(game.s.reserve);
 for(const key of newIngredients){assert.equal(stock[key],0);assert.equal(reserve[key],0)}
 for(const id of licenses){
  const upgrade=managementUpgrades[id];game.s.totalSold=upgrade.requiredSales-1;
  const before=clone(game.s);game.purchaseUpgrade(id);assert.deepEqual(game.s,before);
  game.s.totalSold=upgrade.requiredSales;assert.equal(game.upgradeInfo(id).unlocked,true);
  const cash=game.s.cash,expenses=game.s.expenses;game.purchaseUpgrade(id);
  assert.equal(game.s.cash,cash-upgrade.cost);assert.equal(game.s.expenses,expenses+upgrade.cost);
  assert.deepEqual(game.s.stock,stock);assert.deepEqual(game.s.reserve,reserve);
  const purchased=clone(game.s);game.purchaseUpgrade(id);assert.deepEqual(game.s,purchased);
 }
 const saved=new Game(clone(game.s)),cash=saved.s.cash,expenses=saved.s.expenses;
 for(const id of licenses){assert.equal(saved.upgradeInfo(id).owned,true);saved.purchaseUpgrade(id)}
 assert.equal(saved.s.cash,cash);assert.equal(saved.s.expenses,expenses);assert.deepEqual(saved.s.stock,stock);assert.deepEqual(saved.s.reserve,reserve);
});

test('signature license requires both purchased prerequisite licenses, progression and funds',()=>{
 const game=new Game();game.s.cash=2000;game.s.totalSold=100;
 assert.deepEqual(game.upgradeInfo('signature').requires,['cocktails','spirits']);
 assert.deepEqual(game.upgradeInfo('signature').unmetPrerequisites,['cocktails','spirits']);
 let before=clone(game.s);assert.match(game.purchaseUpgrade('signature'),/cocktails.*spiritueux/);assert.deepEqual(game.s,before);
 game.purchaseUpgrade('cocktails');assert.deepEqual(game.upgradeInfo('signature').unmetPrerequisites,['spirits']);
 before=clone(game.s);game.purchaseUpgrade('signature');assert.deepEqual(game.s,before);
 game.purchaseUpgrade('spirits');game.s.totalSold=35;before=clone(game.s);game.purchaseUpgrade('signature');assert.deepEqual(game.s,before);
 game.s.totalSold=36;game.s.cash=359;before=clone(game.s);game.purchaseUpgrade('signature');assert.deepEqual(game.s,before);
 game.s.cash=360;game.purchaseUpgrade('signature');assert.equal(game.s.management.signature,true);assert.equal(game.s.cash,0);
});

test('licensed ingredients must be paid for, delivered and transferred; reloads do not duplicate deliveries',()=>{
 for(const key of newIngredients){
  let game=new Game();const before=clone(game.s);assert.equal(game.canBuy(key),false);game.buy(key);assert.deepEqual(game.s,before);
  game=licensedGame();const cash=game.s.cash;assert.equal(game.canBuy(key),true);game.buy(key);
  assert.equal(game.s.cash,cash-ingredients[key].cost);assert.equal(game.s.stock[key],0);assert.equal(game.s.reserve[key],0);
  advance(game,4);game=new Game(clone(game.s));advance(game,6.1);
  assert.equal(game.s.reserve[key],ingredients[key].pack);assert.equal(game.s.stock[key],0);
  game.restock(key,10);assert.equal(game.s.stock[key],10);assert.equal(game.s.reserve[key],ingredients[key].pack-10);
  const saved=clone(game.s);game=new Game(saved);advance(game,10);
  assert.equal(game.s.stock[key],10);assert.equal(game.s.reserve[key],ingredients[key].pack-10);assert.equal(game.s.cash,cash-ingredients[key].cost);
 }
});

test('each new recipe can be stocked, dosed, finished, served and paid exactly once',()=>{
 for(const [index,id]of newRecipes.entries()){
  let game=licensedGame();const recipe=recipes[id];
  for(const key of Object.keys(recipe.ingredients).filter(key=>newIngredients.includes(key)))game.buy(key);
  advance(game,10.1);for(const key of newIngredients)game.restock(key);
  const stock=clone(game.s.stock),cash=game.s.cash;const station=gather(game,id);assert.equal(game.s.prep.recipe,id);
  for(const [key,amount]of Object.entries(recipe.ingredients))assert.equal(game.s.stock[key],stock[key]-amount);
  game.finishMix(station);assert.equal(game.s.prep.ready,false);game.plate(station);assert.equal(game.s.tray.length,0);
  assert.equal(game.preparationStatus(station).stage,'pour');
  assert.equal(game.isPour(),true);game.step();assert.equal(game.s.prep.step,recipe.pourStep,'The dose cannot be skipped');
  game.setPour(true,station);advance(game,recipe.target/recipe.speed/2);const half=game.s.prep.amount;
  game=new Game(clone(game.s));assert.equal(game.s.prep.pouring,false);assert.equal(game.s.prep.amount,half);
  game.setPour(true,station);advance(game,recipe.target/recipe.speed/2);game.finishPour(station);assert.equal(game.s.prep.quality,100);
  if(Number.isInteger(recipe.finishStep)){assert.equal(game.s.prep.step,recipe.finishStep);assert.equal(game.s.prep.ready,false);game.plate(station);assert.equal(game.s.tray.length,0);game.finishMix(station)}
  assert.equal(game.s.prep.ready,true);game.plate(station);assert.equal(game.s.tray.length,1);assert.equal(game.s.tray[0].recipe,id);
  const order=addOrder(game,id),position=game.orderPosition(order);order.paymentMethod=index%2?'cash':'card';
  game.serve(order.id,position);assert.equal(game.s.cash,cash);assert.equal(game.s.sold,0);advance(game,4.1);reachCheckout(game,order);
  if(order.paymentMethod==='cash'){
   game.collectCash(order.id,registerPosition);game.prepareChange(order.id,order.tender-order.due,registerPosition);assert.equal(game.s.cash,cash);game.completeCash(order.id,registerPosition);game.completeCash(order.id,registerPosition);
  }else{
   game.pickupTerminal(registerPosition);game.payCard(order.id,registerPosition);assert.equal(game.s.cash,cash);advance(game,3.1);game.payCard(order.id,registerPosition);
  }
  assert.equal(game.s.cash,cash+recipe.price+1);assert.equal(game.s.sold,1);assert.equal(game.s.orders.length,0);
  assert.equal(game.s.payments.receipts.length,1);assert.equal(game.s.payments.receipts[0].recipe,id);
 }
});

test('customer requests expand only with owned licenses, independently of ingredient stock',()=>{
 const game=new Game();game.s.totalSold=100;game.s.cash=2000;const random=Math.random;
 try{
  for(const nextLicense of [null,...licenses]){
   if(nextLicense)game.purchaseUpgrade(nextLicense);
   const expected=Object.keys(recipes).filter(id=>!recipes[id].license||game.s.management[recipes[id].license]),seen=new Set();
   for(let index=0;index<expected.length;index++){
    Math.random=()=>(index+.5)/expected.length;game.s.orders=[];game.spawnCustomer();seen.add(game.s.orders[0].recipe);
   }
   assert.deepEqual([...seen].sort(),expected.sort());
  }
 }finally{Math.random=random}
});

test('bartender cannot prepare any locked new recipe and paid licenses enable saved jobs without extra stock use',()=>{
 for(const id of newRecipes){
  let game=new Game();game.s.cash=2000;game.s.totalSold=100;game.s.management.bartender=true;game.open();game.s.spawn=999;
  for(const [key,amount]of Object.entries(recipes[id].ingredients))game.s.stock[key]=amount*3;
  const order=addOrder(game,id),stock=clone(game.s.stock);game.tick(.1);
  assert.equal(game.s.staff.bartender,null);assert.deepEqual(game.s.stock,stock);game.start(id,staff);assert.equal(game.s.prep,null);assert.deepEqual(game.s.stock,stock);
  for(const license of licenses)game.purchaseUpgrade(license);game.tick(.1);assert.equal(game.s.staff.bartender.orderId,order.id);
  for(const [key,amount]of Object.entries(recipes[id].ingredients))assert.equal(game.s.stock[key],stock[key]-amount);
  const consumed=clone(game.s.stock);advance(game,2);game=new Game(clone(game.s));advance(game,12);
  assert.deepEqual(game.s.stock,consumed);assert.equal(game.s.tray.length,1);assert.equal(game.s.tray[0].recipe,id);assert.equal(game.s.tray[0].orderId,order.id);
 }
});

test('old saves retain funds, ingredients, active preparation and staff jobs without new unlocks or supplies',()=>{
 const original=new Game();original.s.cash=173;original.s.management.bartender=true;original.s.management.waiter=true;original.s.management.cocktails=true;original.open();original.s.spawn=999;
 addOrder(original,'beer');const table=addOrder(original,'coffee');table.tableId=1;table.slot=null;table.phase='awaiting-order';
 original.tick(.1);gather(original,'wine');original.setPour(true,stationPosition(original));original.tick(.1);
 const legacy=clone(original.s);for(const key of ['physical','vesselPlaced','held','added'])delete legacy.prep[key];for(const key of newIngredients){delete legacy.stock[key];delete legacy.reserve[key]}
 for(const key of ['softDrinks','spirits','signature'])delete legacy.management[key];
 const before=clone(legacy);let restored=new Game(legacy);
 assert.deepEqual(legacy,before);assert.equal(restored.s.cash,173);assert.equal(restored.s.prep.recipe,'wine');assert.equal(restored.s.prep.amount,legacy.prep.amount);assert.equal(restored.s.prep.pouring,false);
 assert.deepEqual(restored.s.staff,legacy.staff);assert.deepEqual(restored.s.orders.map(o=>[o.id,o.recipe,o.phase]),legacy.orders.map(o=>[o.id,o.recipe,o.phase]));
 for(const [key,amount]of Object.entries(legacy.stock))assert.equal(restored.s.stock[key],amount);
 for(const [key,amount]of Object.entries(legacy.reserve))assert.equal(restored.s.reserve[key],amount);
 for(let load=0;load<3;load++){
  for(const key of newIngredients){assert.equal(restored.s.stock[key],0);assert.equal(restored.s.reserve[key],0)}
  for(const key of ['softDrinks','spirits','signature'])assert.equal(restored.s.management[key],false);
  assert.equal(restored.s.management.cocktails,true);assert.equal(restored.s.cash,173);restored=new Game(clone(restored.s));
 }
 delete legacy.management;const oldest=new Game(legacy);assert.equal(oldest.canPrepare('mojito'),true);assert.equal(oldest.canPrepare('ginTonic'),false);assert.equal(oldest.s.management.bartender,false);
});
