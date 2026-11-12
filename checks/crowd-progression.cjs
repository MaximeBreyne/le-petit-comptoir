'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {Game,recipes,tables,counterSeats,crowdStages,MAX_CUSTOMERS,registerPosition,preparationLayout,managementUpgrades,buildingLayout,availableTables}=require('../dist/engine.js');
const {staff,approach}=require('./preparation-fixtures.cjs');
const {reachCheckout}=require('./checkout-fixtures.cjs');

const clone=value=>JSON.parse(JSON.stringify(value));
const advance=(game,seconds)=>{for(let remaining=seconds;remaining>1e-9;remaining-=.1)game.tick(Math.min(.1,remaining))};
function session(totalSold=0){const game=new Game();game.s.totalSold=totalSold;game.open();return game}
function fill(game){for(let index=0;index<MAX_CUSTOMERS+2;index++)game.spawnCustomer()}
function canonicalOrders(game){for(const order of game.s.orders){order.due=recipes[order.recipe].price;order.tender=Math.ceil(order.due/5)*5;order.tip=0}}
function assertDistinctSeats(game){
 const occupied=game.s.orders.map(order=>order.tableId?'table:'+order.tableId:'counter:'+order.slot);
 assert.equal(new Set(occupied).size,occupied.length);
}

test('six stable counter seats retain old positions and share player and waiter interaction positions',()=>{
 assert.equal(MAX_CUSTOMERS,22);assert.equal(counterSeats.length,6);assert.ok(Object.isFrozen(counterSeats));
 assert.deepEqual(counterSeats.slice(0,3),[{slot:0,x:4.6,z:4.3},{slot:1,x:6,z:4.3},{slot:2,x:7.4,z:4.3}]);
 assert.deepEqual(counterSeats.slice(3).map(seat=>seat.x),[3.2,8.8,10.2]);
 const game=session(80);fill(game);
 for(const seat of counterSeats){
  assert.ok(Object.isFrozen(seat));const order=game.s.orders.find(order=>!order.tableId&&order.slot===seat.slot);
  assert.ok(order);order.arrivalRemaining=0;
  assert.deepEqual(game.orderPosition(order),{x:seat.x,z:2.1,floorY:0});
  assert.deepEqual(game.waiterDestination('serve',order),{x:seat.x,z:4.8});
  assert.equal(game.canReachOrder(order.id,{x:seat.x,z:2.1}),true);
 }
});

test('attendance grows for paid customer totals only, without spending or automatically buying licenses',()=>{
 const game=session(),cash=game.s.cash,management=clone(game.s.management);
 for(const [sales,seats,capacity,interval,current,next] of [
  [0,3,7,16,0,20],[19,3,7,16,0,20],[20,4,8,15,20,45],
  [44,4,8,15,20,45],[45,5,9,14,45,80],[79,5,9,14,45,80],
  [80,6,10,12,80,null],[1000,6,10,12,80,null]
 ]){
  game.s.totalSold=sales;
  assert.deepEqual(game.crowdInfo(),{totalSold:sales,currentThreshold:current,nextThreshold:next,counterSeatsUnlocked:seats,capacity,spawnInterval:interval,maxCapacity:22});
  assert.equal(game.s.cash,cash);assert.deepEqual(game.s.management,management);assert.equal(game.s.orders.length,0);
 }
 assert.ok(Object.isFrozen(crowdStages));assert.ok(crowdStages.every(Object.isFrozen));
});

test('a new bar still starts empty, receives one client after one second, then waits sixteen seconds',()=>{
 const game=new Game();advance(game,20);assert.equal(game.s.orders.length,0);
 game.open();advance(game,.9);assert.equal(game.s.orders.length,0);
 advance(game,.1);assert.equal(game.s.orders.length,1);assert.equal(game.s.spawn,16);
 advance(game,15.9);assert.equal(game.s.orders.length,1);
 advance(game,.1);assert.equal(game.s.orders.length,2);assertDistinctSeats(game);
});

test('direct arrivals and simulation both obey unlocked seats and the capacity at every threshold',()=>{
 for(const [sales,seats,capacity] of [[0,3,7],[19,3,7],[20,4,8],[44,4,8],[45,5,9],[79,5,9],[80,6,10]]){
  const game=session(sales);fill(game);assert.equal(game.s.orders.length,capacity);assertDistinctSeats(game);
  assert.equal(game.s.orders.filter(order=>order.tableId).length,game.activeTables().length);
  assert.deepEqual(game.s.orders.filter(order=>!order.tableId).map(order=>order.slot).sort((a,b)=>a-b),Array.from({length:seats},(_,index)=>index));
  const orders=clone(game.s.orders),nextId=game.s.nextId;game.spawnCustomer();
  assert.deepEqual(game.s.orders,orders);assert.equal(game.s.nextId,nextId);
  game.s.spawn=0;game.tick(.1);assert.equal(game.s.orders.length,capacity);assertDistinctSeats(game);
 }
});

test('an old service tray keeps its twelve-second bonus without increasing capacity or stacking bonuses',()=>{
 for(const sales of [0,20,45,80]){
  const game=session(sales),capacity=game.crowdInfo().capacity;
  game.s.upgraded=true;game.s.capacity=4;game.spawnCustomer();
  assert.equal(game.crowdInfo().spawnInterval,12);assert.equal(game.s.spawn,12);
  assert.equal(game.crowdInfo().capacity,capacity);assert.equal(game.s.capacity,4);
 }
});

test('progression neither unlocks recipes nor prevents arrivals when stock is empty',()=>{
 const random=Math.random;
 try{
  for(const sales of [0,20,45,80]){
   const game=session(sales),seen=new Set();
   for(const key of Object.keys(game.s.stock)){game.s.stock[key]=0;game.s.reserve[key]=0}
   for(let index=0;index<3;index++){
    Math.random=()=>(index+.5)/3;game.s.orders=[];game.spawnCustomer();seen.add(game.s.orders[0].recipe);
   }
   assert.deepEqual([...seen].sort(),['beer','coffee','wine']);
   assert.equal(game.canPrepare('mojito'),false);assert.equal(game.canPrepare('ginTonic'),false);
  }
 }finally{Math.random=random}
});

test('serving and pending card approval do not unlock a stool until the twentieth payment completes',()=>{
 const game=session(19);game.s.spawn=999;game.spawnCustomer();game.spawnCustomer();game.s.spawn=999;
 const order=game.s.orders.find(order=>!order.tableId);order.recipe='beer';order.arrivalRemaining=0;order.paymentMethod='card';
 game.s.tray.push({recipe:'beer',quality:100});game.serve(order.id,game.orderPosition(order));
 assert.equal(game.crowdInfo().capacity,7);advance(game,4);assert.equal(order.phase,'payment');reachCheckout(game,order);
 game.pickupTerminal(registerPosition);game.payCard(order.id,game.orderPosition(order));
 advance(game,2.9);assert.equal(game.s.totalSold,19);assert.equal(game.crowdInfo().capacity,7);
 const cash=game.s.cash;advance(game,.1);
 assert.equal(game.s.totalSold,20);assert.equal(game.crowdInfo().capacity,8);assert.equal(game.s.cash,cash+6);
 game.finishPayment(order,'card');assert.equal(game.s.totalSold,20);assert.equal(game.s.cash,cash+6);
});

test('legacy seven-customer saves retain customers, seats, deliveries and treasury',()=>{
 const game=session();fill(game);canonicalOrders(game);game.buy('beer');
 const saved=clone(game.s),original=clone(saved),restored=new Game(saved);
 assert.deepEqual(saved,original);assert.deepEqual(restored.s.orders,saved.orders);
 for(const key of ['cash','day','sold','totalSold','stock','reserve','deliveries','expenses'])assert.deepEqual(restored.s[key],saved[key]);
 assert.equal(restored.crowdInfo().capacity,7);assertDistinctSeats(restored);
});

test('ten-customer saves retain preparations, deliveries, staff jobs and a payment on the last stool',()=>{
 const game=session(80);fill(game);canonicalOrders(game);game.buy('wine');
 game.start('wine',staff);game.takeVessel(approach(preparationLayout.vessels));
 game.s.management.bartender=true;game.s.management.waiter=true;
 const preparing=game.s.orders.find(order=>order.slot===0),serving=game.s.orders.find(order=>order.tableId===1),paying=game.s.orders.find(order=>order.slot===5);
 preparing.recipe='beer';preparing.phase='preparing';
 game.s.staff.bartender={orderId:preparing.id,recipe:'beer',total:8,remaining:4};
 serving.phase='preparing';game.assignWaiterJob('serve',serving);game.s.staff.waiter.drink={recipe:serving.recipe,quality:92};
 paying.arrivalRemaining=0;paying.phase='payment';paying.paymentMethod='card';reachCheckout(game,paying);game.pickupTerminal(registerPosition);game.payCard(paying.id,game.orderPosition(paying));
 canonicalOrders(game);
 const saved=clone(game.s),original=clone(saved),restored=new Game(saved);
 assert.deepEqual(saved,original);assert.equal(restored.s.orders.length,10);assertDistinctSeats(restored);
 for(const key of ['cash','totalSold','stock','reserve','orders','deliveries','prep','tray','staff','payments','expenses'])assert.deepEqual(restored.s[key],saved[key],key);
 assert.equal(restored.s.payments.terminalOrderId,paying.id);assert.equal(restored.s.orders.find(order=>order.id===paying.id).cardRemaining,3);
});

test('restoring occupied locked stools keeps all clients, then only fills unlocked vacancies',()=>{
 const game=session(80);fill(game);canonicalOrders(game);game.s.totalSold=0;
 const restored=new Game(clone(game.s));assert.equal(restored.s.orders.length,10);assert.equal(restored.crowdInfo().capacity,7);
 const locked=restored.s.orders.filter(order=>!order.tableId&&order.slot>=3).map(order=>order.id);
 const before=clone(restored.s.orders);restored.spawnCustomer();assert.deepEqual(restored.s.orders,before);
 for(const order of [...restored.s.orders].filter(order=>order.tableId)){restored.removeOrder(order)}
 assert.equal(restored.s.orders.length,6);restored.spawnCustomer();assert.equal(restored.s.orders.length,7);
 assert.ok(restored.s.orders.at(-1).tableId);assert.ok(locked.every(id=>restored.s.orders.some(order=>order.id===id)));
 assertDistinctSeats(restored);restored.spawnCustomer();assert.equal(restored.s.orders.length,7);
});

test('duplicate saved counter slots are repaired to distinct physical seats without discarding customers',()=>{
 const game=session(80);fill(game);canonicalOrders(game);
 for(const order of game.s.orders.filter(order=>!order.tableId))order.slot=0;
 const restored=new Game(clone(game.s));assert.equal(restored.s.orders.length,10);assertDistinctSeats(restored);
 assert.deepEqual(restored.s.orders.filter(order=>!order.tableId).map(order=>order.slot).sort((a,b)=>a-b),[0,1,2,3,4,5]);
});

test('full capacity does not accumulate a burst of arrivals when several seats become free',()=>{
 const game=session(80);fill(game);for(const order of game.s.orders){order.phase='payment';order.arrivalRemaining=0}
 advance(game,60);assert.equal(game.s.orders.length,10);assert.equal(game.s.spawn,0);
 for(const order of game.s.orders.slice(0,2))game.removeOrder(order);
 game.tick(.1);assert.equal(game.s.orders.length,9);assert.equal(game.s.spawn,12);
 advance(game,11.9);assert.equal(game.s.orders.length,9);
 advance(game,.1);assert.equal(game.s.orders.length,10);assertDistinctSeats(game);
});

test('closing admits no more clients and preserves progression for the next day',()=>{
 const game=session(80);fill(game);canonicalOrders(game);for(const order of game.s.orders){order.phase='payment';order.arrivalRemaining=0}
 const ids=game.s.orders.map(order=>order.id);game.close();game.s.spawn=0;advance(game,30);game.spawnCustomer();
 assert.deepEqual(game.s.orders.map(order=>order.id),ids);assert.equal(game.s.open,true);
 for(const order of [...game.s.orders])game.finishPayment(order,'card');game.tick(.1);
 assert.equal(game.s.open,false);assert.equal(game.s.day,2);assert.equal(game.s.totalSold,90);assert.equal(game.crowdInfo().capacity,10);
 advance(game,20);assert.equal(game.s.orders.length,0);
 game.open();advance(game,.9);assert.equal(game.s.orders.length,0);advance(game,.1);assert.equal(game.s.orders.length,1);assert.equal(game.s.spawn,12);
});

test('waiter routes clear the stool backs before crossing the room or returning to the terminal',()=>{
 const context=vm.createContext({});
 for(const file of ['engine.js','scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
 const scene=vm.runInContext('BarScene',context),boxes=scene.create();
 // Include the visible backrests as well as solid cushions and legs: the
 // waiter should not walk through geometry lacking a player collision flag.
 const obstacles=boxes.filter(box=>box.y-box.h/2<1.7&&box.y+box.h/2>.2&&counterSeats.some(seat=>Math.abs(box.x-seat.x)<.3&&Math.abs(box.z-seat.z)<.4));
 assert.ok(obstacles.length>counterSeats.length);
 const game=session(80);fill(game);
 const initial={...game.s.staff.waiterPosition},terminal=game.waiterDestination('pickup-terminal'),destinations=[terminal,...game.s.orders.map(order=>game.waiterDestination('serve',order))];
 const blocks=(point,box)=>{
  const angle=box.ry||0,c=Math.cos(angle),s=Math.sin(angle),dx=point.x-box.x,dz=point.z-box.z,px=dx*c-dz*s,pz=dx*s+dz*c;
  return box.round?Math.hypot(px/(box.w/2+.2),pz/(box.d/2+.2))<1:Math.abs(px)<box.w/2+.2&&Math.abs(pz)<box.d/2+.2;
 };
 for(const from of [initial,...destinations])for(const to of destinations){
  const route=game.waiterRoute(from,to);assert.deepEqual(route[0],from);assert.deepEqual(route.at(-1),to);
  if(from===initial)assert.deepEqual(route[1],{x:initial.x,z:4.9},'Leave the stool row before moving horizontally');
  for(let index=1;index<route.length;index++){
   const a=route[index-1],b=route[index],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.02));
   if(Math.min(a.z,b.z)<3.02&&Math.max(a.z,b.z)>3.02)assert.ok(a.x<1.3&&b.x<1.3,'Counter crossings still use the left passage');
   for(let step=0;step<=steps;step++){
    const t=step/steps,point={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
    assert.equal(obstacles.some(box=>blocks(point,box)),false,'No stool collision at '+JSON.stringify(point)+' on '+JSON.stringify(route));
   }
  }
 }
});

const buildingPurchases=['expansion1','table5','table6','expansion2','table7','table8'];
function expandedBar(last='table8'){
 const game=new Game();game.s.cash=10000;game.s.totalSold=80;
 for(const id of buildingPurchases){game.purchaseUpgrade(id);assert.equal(game.upgradeInfo(id).owned,true,id);if(id===last)break}
 return game;
}

test('new and legacy bars retain their original room and tables until construction is bought',()=>{
 const game=new Game();
 assert.deepEqual(buildingLayout(),{level:0,upstairs:false,nightclub:false,width:12,area:120,height:3.6});
 assert.deepEqual(availableTables().map(table=>table.id),[1,2,3,4]);
 assert.deepEqual(game.buildingInfo(),{level:0,upstairs:false,nightclub:false,width:12,area:120,height:3.6,tableCount:4,maxTables:16,capacity:7,maxCapacity:22});
 assert.equal(game.s.orders.length,0);
 const saved=clone(game.s);for(const id of buildingPurchases)delete saved.management[id];
 saved.totalSold=1000;const before=clone(saved),loaded=new Game(saved);
 assert.deepEqual(saved,before);assert.equal(loaded.buildingInfo().level,0);assert.equal(loaded.activeTables().length,4);
 assert.equal(loaded.crowdInfo().capacity,10);assert.equal(loaded.s.cash,saved.cash);
 for(const id of buildingPurchases)assert.equal(loaded.s.management[id],false);
 const old=clone(saved);delete old.management;const migrated=new Game(old);
 assert.equal(migrated.canPrepare('mojito'),true);assert.equal(migrated.activeTables().length,4);
});

test('construction respects paid prerequisites and never starts while service is open or unfinished',()=>{
 for(const id of buildingPurchases){
  const game=new Game();game.s.cash=10000;game.s.totalSold=80;
  for(const prior of buildingPurchases){if(prior===id)break;game.purchaseUpgrade(prior)}
  const offer=game.upgradeInfo(id);assert.equal(offer.requiresClosed,true);assert.equal(offer.purchasable,true);
  game.open();let before=clone(game.s);assert.equal(game.upgradeInfo(id).purchasable,false);assert.match(game.upgradeInfo(id).blockedReason,/Fermez le bar/);
  game.purchaseUpgrade(id);assert.deepEqual(game.s,before);
  game.close();before=clone(game.s);game.purchaseUpgrade(id);assert.deepEqual(game.s,before);
  game.s.open=false;game.s.closing=false;game.s.orders=[{id:1,name:'Lucie',recipe:'beer',patience:100,tableId:1,phase:'payment'}];
  before=clone(game.s);game.purchaseUpgrade(id);assert.deepEqual(game.s,before);
  game.s.orders=[];const cash=game.s.cash,expenses=game.s.expenses;game.purchaseUpgrade(id);
  assert.equal(game.s.cash,cash-offer.cost);assert.equal(game.s.expenses,expenses+offer.cost);assert.equal(game.upgradeInfo(id).owned,true);
  before=clone(game.s);game.purchaseUpgrade(id);assert.deepEqual(game.s,before);
 }
 const game=new Game();game.s.cash=10000;game.s.totalSold=1000;
 for(const id of buildingPurchases.slice(1)){const before=clone(game.s);game.purchaseUpgrade(id);assert.deepEqual(game.s,before)}
 game.s.totalSold=19;const before=clone(game.s);game.purchaseUpgrade('expansion1');assert.deepEqual(game.s,before);
});

test('empty expansions add floor space only and every paid table adds exactly one customer place',()=>{
 const game=new Game();game.s.cash=10000;game.s.totalSold=80;
 const expected=[['expansion1',1,147,4,10],['table5',1,147,5,11],['table6',1,147,6,12],['expansion2',2,174,6,12],['table7',2,174,7,13],['table8',2,174,8,14]];
 let spent=0;
 for(const [id,level,area,count,capacity]of expected){
  game.purchaseUpgrade(id);spent+=managementUpgrades[id].cost;
  const info=game.buildingInfo();assert.equal(info.level,level);assert.equal(info.area,area);assert.equal(info.width,12+4.5*level);
  assert.equal(info.tableCount,count);assert.equal(info.capacity,capacity);assert.equal(game.s.orders.length,0);
  assert.equal(game.s.cash,10000-spent);assert.equal(game.s.expenses,spent);assert.equal(game.crowdInfo().spawnInterval,12);
  const restored=new Game(clone(game.s));assert.deepEqual(restored.buildingInfo(),info);assert.equal(restored.s.cash,game.s.cash);
 }
 assert.equal(spent,2040);assert.deepEqual(game.activeTables().map(table=>table.id),[1,2,3,4,5,6,7,8]);
});

test('customer arrivals use bought tables only and still enter individually without exceeding capacity',()=>{
 for(const [last,count]of [['expansion1',4],['table5',5],['table6',6],['expansion2',6],['table7',7],['table8',8]]){
  const game=expandedBar(last);game.open();advance(game,.9);assert.equal(game.s.orders.length,0);advance(game,.1);assert.equal(game.s.orders.length,1);
  fill(game);assert.equal(game.s.orders.length,count+6);assertDistinctSeats(game);
  assert.deepEqual(game.s.orders.filter(order=>order.tableId).map(order=>order.tableId).sort((a,b)=>a-b),game.activeTables().map(table=>table.id));
  for(const order of game.s.orders){order.phase='payment';order.arrivalRemaining=0}advance(game,30);
  assert.equal(game.s.orders.length,count+6);game.removeOrder(game.s.orders.at(-1));game.removeOrder(game.s.orders.at(-1));
  game.tick(.1);assert.equal(game.s.orders.length,count+5);assert.equal(game.s.spawn,12);advance(game,11.9);assert.equal(game.s.orders.length,count+5);
  advance(game,.1);assert.equal(game.s.orders.length,count+6);
 }
});

test('fourteen customers and a waiter in the far room survive saving with the same purchases and payments',()=>{
 const game=expandedBar();game.open();fill(game);canonicalOrders(game);
 game.s.management.waiter=true;game.s.staff.waiterPosition={x:17.65,z:8.65};
 const paying=game.s.orders.find(order=>order.tableId===8);paying.arrivalRemaining=0;paying.phase='payment';paying.paymentMethod='card';paying.paymentBy='waiter';
 reachCheckout(game,paying);game.s.payments.terminalWithWaiter=true;game.assignWaiterJob('take-card',paying);game.tick(.1);
 const saved=clone(game.s),before=clone(saved),restored=new Game(saved);
 assert.deepEqual(saved,before);assert.equal(restored.s.orders.length,14);assertDistinctSeats(restored);
 for(const key of ['management','orders','cash','expenses','stock','reserve','staff','payments'])assert.deepEqual(restored.s[key],saved[key],key);
 assert.deepEqual(restored.buildingInfo(),game.buildingInfo());assert.equal(restored.canReachOrder(paying.id,{x:17.65,z:8.65}),false);
 assert.equal(restored.canReachOrder(paying.id,registerPosition),true);
});

test('invalid expansion prerequisites and unbought saved table positions never grant free rooms',()=>{
 const game=new Game();game.s.management.table5=true;game.s.management.expansion2=true;game.s.management.table8=true;
 game.s.orders=[{id:1,name:'Client',recipe:'beer',patience:100,tableId:8,phase:'preparing',arrivalRemaining:0}];game.s.nextId=2;
 assert.equal(game.orderPosition(game.s.orders[0]),null);assert.equal(game.canReachOrder(1,{x:19,z:8.65}),false);
 const restored=new Game(clone(game.s));assert.equal(restored.buildingInfo().level,0);assert.equal(restored.activeTables().length,4);
 assert.equal(restored.s.cash,game.s.cash);for(const id of buildingPurchases)assert.equal(restored.s.management[id],false);
 assert.equal(restored.s.orders.length,1);assert.ok(restored.activeTables().some(table=>table.id===restored.s.orders[0].tableId));
 const bought=expandedBar();const saved=clone(bought.s);saved.management.expansion2='true';
 const normalized=new Game(saved);assert.equal(normalized.buildingInfo().level,1);assert.equal(normalized.activeTables().length,6);
 assert.equal(normalized.s.management.table7,false);assert.equal(normalized.s.management.table8,false);
});

test('waiter reaches annex tables and settles cash and card after taking and serving their order',()=>{
 for(const [tableId,method]of [[5,'cash'],[8,'card']]){
  let game=expandedBar();game.open();game.s.spawn=999;game.s.management.waiter=true;
  const order={id:game.s.nextId++,name:'Camille',recipe:'beer',patience:100,tableId,slot:null,phase:'awaiting-order',arrivalRemaining:0,paymentMethod:method,due:0,tender:0};
  game.s.orders.push(order);game.s.tray.push({recipe:'beer',quality:100});const cash=game.s.cash,stock=clone(game.s.stock);
  let savedInAnnex=false;
  for(let tick=0;tick<1800&&(game.s.orders.length||game.s.payments.terminalWithWaiter);tick++){
   game.tick(.1);
   if(!savedInAnnex&&game.s.staff.waiterPosition.x>12){const snapshot=clone(game.s);game=new Game(snapshot);assert.deepEqual(game.s.staff,snapshot.staff);savedInAnnex=true}
  }
  assert.equal(savedInAnnex,true);assert.equal(game.s.orders.length,0);assert.equal(game.s.payments.terminalWithWaiter,false);
  assert.equal(game.s.cash,cash+6);assert.equal(game.s.totalSold,81);assert.equal(game.s.payments.receipts.length,1);
  assert.equal(game.s.payments.receipts[0].tableId,tableId);assert.equal(game.s.payments.receipts[0].method,method);assert.deepEqual(game.s.stock,stock);
 }
});

test('waiter annex routes cross both doorways and clear the purchased room furniture',()=>{
 const game=expandedBar(),context=vm.createContext({});
 for(const file of ['engine.js','scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
 const scene=vm.runInContext('BarScene',context),boxes=scene.create(game.s),obstacles=boxes.filter(box=>box.solid&&box.y-box.h/2<1.7&&box.y+box.h/2>.2);
 const destinations=[game.waiterDestination('pickup-terminal'),...game.activeTables().map(table=>game.waiterDestination('serve',{tableId:table.id}))];
 const blocks=(point,box)=>{
  const angle=box.ry||0,c=Math.cos(angle),s=Math.sin(angle),dx=point.x-box.x,dz=point.z-box.z,px=dx*c-dz*s,pz=dx*s+dz*c;
  return box.round?Math.hypot(px/(box.w/2+.2),pz/(box.d/2+.2))<1:Math.abs(px)<box.w/2+.2&&Math.abs(pz)<box.d/2+.2;
 };
 for(const from of destinations)for(const to of destinations){
  if(from.x<12&&to.x<12)continue;
  const route=game.waiterRoute(from,to);assert.deepEqual(route[0],from);assert.deepEqual(route.at(-1),to);assert.ok(route.length<=24);
  for(let index=1;index<route.length;index++){
   const a=route[index-1],b=route[index];
   for(const wall of [12,16.5])if(Math.min(a.x,b.x)<wall&&Math.max(a.x,b.x)>wall){assert.equal(a.z,5.25);assert.equal(b.z,5.25)}
   const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.04));
   for(let step=0;step<=steps;step++){
    const t=step/steps,point={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
    assert.equal(scene.containsWalkablePosition(point.x,point.z,game.s),true,'Inside bought space '+JSON.stringify(point));
    assert.equal(obstacles.some(box=>blocks(point,box)),false,'Furniture collision at '+JSON.stringify(point)+' on '+JSON.stringify(route));
   }
  }
 }
});

test('annex arrivals walk at a stable speed and preserve their progress and full patience across saves',()=>{
 let game=expandedBar();game.open();game.s.spawn=999;
 const random=Math.random;try{Math.random=()=>.999;game.spawnCustomer()}finally{Math.random=random}
 let order=game.s.orders[0];assert.equal(order.tableId,8);
 const distance=4.05+(17.4-6)+(8.65-5.25)+(19-.78-17.4);
 assert.ok(Math.abs(order.arrivalDuration-distance/1.5)<1e-9);assert.equal(order.arrivalRemaining,order.arrivalDuration);
 advance(game,3);assert.ok(order.arrivalRemaining>0);assert.equal(order.patience,100);
 assert.equal(game.canReachOrder(order.id,game.orderPosition(order)),false);game.takeOrder(order.id,game.orderPosition(order));
 assert.equal(order.phase,'awaiting-order');assert.deepEqual(game.preparationQueue(),[]);
 const saved=clone(game.s),progress=1-order.arrivalRemaining/order.arrivalDuration;game=new Game(saved);order=game.s.orders[0];
 assert.equal(1-order.arrivalRemaining/order.arrivalDuration,progress);assert.equal(order.patience,100);
 advance(game,order.arrivalRemaining-.05);assert.equal(order.patience,100);assert.equal(game.canReachOrder(order.id,game.orderPosition(order)),false);
 game.tick(.1);assert.equal(order.arrivalRemaining,0);assert.equal(order.patience,100);
 game.takeOrder(order.id,game.orderPosition(order));assert.equal(order.phase,'preparing');assert.equal(game.preparationQueue().length,1);
 const malformed=clone(saved);malformed.orders[0].arrivalDuration=1000;malformed.orders[0].arrivalRemaining=1000;
 let restored=new Game(malformed);assert.equal(restored.s.orders[0].arrivalDuration,30);assert.equal(restored.s.orders[0].arrivalRemaining,30);
 delete malformed.orders[0].arrivalDuration;restored=new Game(malformed);
 assert.equal(restored.s.orders[0].arrivalDuration,undefined);assert.equal(restored.s.orders[0].arrivalRemaining,3);
});
