'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Game,managementUpgrades,ingredients,recipes,buildingLayout,tables,MAX_CUSTOMERS,registerPosition}=require('../dist/engine.js');
const {prepare}=require('./preparation-fixtures.cjs');
const {reachCheckout}=require('./checkout-fixtures.cjs');
const clone=value=>JSON.parse(JSON.stringify(value));
const advance=(game,seconds)=>{for(let remaining=seconds;remaining>1e-8;remaining-=.1)game.tick(Math.min(.1,remaining))};
function buy(game,id){
 for(const required of managementUpgrades[id].requires)if(!game.upgradeInfo(required).owned)buy(game,required);
 game.purchaseUpgrade(id);assert.equal(game.upgradeInfo(id).owned,true,'Purchased '+id);
}
function funded(){const game=new Game();game.s.cash=50000;game.s.totalSold=500;return game;}
function developed(){const game=funded();for(const id of ['table12','table16','classiques','premium','nightlife'])buy(game,id);return game;}
function order(game,{tableId=9,recipe='beer',phase='preparing',method='cash'}={}){
 const item={id:game.s.nextId++,name:'Client de test',recipe,tableId,slot:null,phase,arrivalRemaining:0,drinkRemaining:0,patience:100,paymentMethod:method,due:recipes[recipe].price,tip:0,tender:20,cardRemaining:0};game.s.orders.push(item);return item;
}

test('upper floor, club and eight new tables are separately paid and never add places before furniture exists',()=>{
 const game=funded(),before=clone(game.s);game.purchaseUpgrade('upstairs');assert.deepEqual(game.s,before);
 buy(game,'table8');assert.equal(game.buildingInfo().area,174);assert.equal(game.crowdInfo().capacity,14);
 const stock=clone(game.s.stock),cash=game.s.cash;buy(game,'upstairs');
 assert.equal(game.s.cash,cash-1800);assert.equal(game.buildingInfo().area,246);assert.equal(game.buildingInfo().width,24);
 assert.equal(game.crowdInfo().capacity,14);assert.equal(game.activeTables().length,8);
 for(const id of ['table9','table10','table11','table12'])buy(game,id);
 assert.equal(game.activeTables().length,12);assert.equal(game.crowdInfo().capacity,18);
 buy(game,'nightclub');assert.equal(game.buildingInfo().area,294);assert.equal(game.buildingInfo().width,32);assert.equal(game.crowdInfo().capacity,18);
 for(const id of ['table13','table14','table15','table16'])buy(game,id);
 assert.equal(game.crowdInfo().capacity,22);assert.equal(MAX_CUSTOMERS,22);assert.equal(game.buildingInfo().height,7.2);
 assert.deepEqual(game.s.stock,stock);assert.ok(game.activeTables().filter(t=>t.floor==='upstairs').every(t=>t.y===3.6));
 const saved=new Game(clone(game.s));assert.deepEqual(saved.buildingInfo(),game.buildingInfo());assert.deepEqual(saved.activeTables(),game.activeTables());
 const still=clone(game.s);game.purchaseUpgrade('nightclub');assert.deepEqual(game.s,still);
 const busy=funded();buy(busy,'table8');busy.open();const active=clone(busy.s);busy.purchaseUpgrade('upstairs');assert.deepEqual(busy.s,active);
});

test('legacy saves acquire no floor, new staff, licences or ingredient supply, including invalid prerequisite flags',()=>{
 const game=funded();buy(game,'table8');game.s.cash=173;
 const legacy=clone(game.s),newIds=['upstairs','nightclub',...Array.from({length:8},(_,i)=>'table'+(i+9)),'classiques','premium','nightlife','floorManager','bartender2','dj','host'];
 for(const id of newIds)delete legacy.management[id];for(const id of ['vodka','cranberry','energy']){delete legacy.stock[id];delete legacy.reserve[id];}
 delete legacy.staff.bartender2;
 const before=clone(legacy),restored=new Game(legacy);assert.deepEqual(legacy,before);assert.equal(restored.s.cash,173);assert.equal(restored.activeTables().length,8);
 for(const id of newIds)assert.equal(restored.s.management[id],false,id);for(const id of ['vodka','cranberry','energy']){assert.equal(restored.s.stock[id],0);assert.equal(restored.s.reserve[id],0);}
 const corrupt=clone(new Game().s);Object.assign(corrupt.management,{upstairs:true,nightclub:true,table9:true,nightlife:true,bartender2:true,dj:true});
 const rejected=new Game(corrupt);assert.equal(rejected.buildingInfo().area,120);assert.equal(rejected.activeTables().length,4);assert.equal(rejected.s.management.nightlife,false);assert.equal(rejected.s.management.dj,false);
});

test('new licences require premises and progression, charge only once, and all six drinks use real ingredients',()=>{
 const game=funded();
 for(const id of ['classiques','premium','nightlife']){
  const rejected=clone(game.s);game.purchaseUpgrade(id);assert.deepEqual(game.s,rejected);
  for(const required of managementUpgrades[id].requires)if(!game.upgradeInfo(required).owned)buy(game,required);
  game.s.totalSold=managementUpgrades[id].requiredSales-1;const blocked=clone(game.s);game.purchaseUpgrade(id);assert.deepEqual(game.s,blocked);
  game.s.totalSold=500;const cash=game.s.cash,stock=clone(game.s.stock),reserve=clone(game.s.reserve);buy(game,id);
  assert.equal(game.s.cash,cash-managementUpgrades[id].cost);assert.deepEqual(game.s.stock,stock);assert.deepEqual(game.s.reserve,reserve);
  const owned=clone(game.s);game.purchaseUpgrade(id);assert.deepEqual(game.s,owned);
 }
 for(const id of ['vodka','cranberry','energy']){assert.equal(game.s.stock[id],0);game.buy(id);}
 advance(game,10.1);
 for(const id of ['vodka','cranberry','energy']){assert.equal(game.s.reserve[id],ingredients[id].pack);game.restock(id);assert.equal(game.s.stock[id],ingredients[id].pack);}
 game.open();game.s.spawn=999;
 for(const id of ['daiquiri','whiskyHighball','vodkaTonic','vodkaCranberry','vodkaEnergy','nightPurple']){
  for(const key of Object.keys(ingredients))game.s.stock[key]=1000;game.s.tray=[];
  const stock=clone(game.s.stock);prepare(game,id);assert.equal(game.s.tray[0].recipe,id);assert.equal(game.s.tray[0].quality,100);
  for(const key of Object.keys(ingredients))assert.equal(game.s.stock[key],stock[key]-(recipes[id].ingredients[key]||0),id+': '+key);
 }
});

test('the same horizontal coordinates on another floor cannot take orders, serve, pay or use ground-floor equipment',()=>{
 const game=developed(),guest=order(game,{phase:'awaiting-order'}),target=game.orderPosition(guest);
 const downstairs={x:target.x,y:1.68,z:target.z},upstairs={...downstairs,y:5.28};
 assert.equal(target.floorY,3.6);assert.equal(game.canReachOrder(guest.id,downstairs),false);assert.equal(game.canReachOrder(guest.id,upstairs),true);
 const before=clone(game.s);game.takeOrder(guest.id,downstairs);assert.deepEqual(game.s,before);game.takeOrder(guest.id,upstairs);assert.equal(guest.phase,'preparing');
 game.s.tray.push({recipe:'beer',quality:100});game.serve(guest.id,downstairs);assert.equal(game.s.tray.length,1);game.serve(guest.id,upstairs);assert.equal(guest.phase,'drinking');
 guest.phase='payment';game.collectCash(guest.id,downstairs);assert.equal(guest.phase,'payment');game.collectCash(guest.id,upstairs);assert.equal(guest.phase,'payment');
 reachCheckout(game,guest);game.collectCash(guest.id,upstairs);assert.equal(guest.phase,'payment');game.collectCash(guest.id,registerPosition);assert.equal(guest.phase,'cash-collected');
 assert.equal(game.nearRegister({...registerPosition,y:5.28}),false);assert.equal(game.canWork({x:6,y:5.28,z:1.55}),false);
 assert.equal(game.nearRegister({...registerPosition,y:NaN}),false);assert.equal(game.canWork({x:6,y:Infinity,z:1.55}),false);
 game.prepareChange(guest.id,guest.tender-guest.due,{...registerPosition,y:5.28});assert.equal(guest.phase,'cash-collected');
 game.prepareChange(guest.id,guest.tender-guest.due,registerPosition);assert.equal(guest.phase,'change-ready');
 const cash=game.s.cash;game.completeCash(guest.id,upstairs);assert.equal(game.s.cash,cash);game.completeCash(guest.id,registerPosition);assert.equal(game.s.cash,cash+guest.due);
 const card=order(game,{phase:'payment',method:'card'});game.pickupTerminal(registerPosition);game.payCard(card.id,downstairs);assert.equal(card.phase,'payment');reachCheckout(game,card);game.payCard(card.id,upstairs);assert.equal(card.phase,'payment');game.payCard(card.id,registerPosition);assert.equal(card.phase,'card-processing');
});

test('two preparers reserve different orders and tray slots, survive saves, and consume each recipe only once',()=>{
 let game=developed();buy(game,'bartender2');game.open();game.s.spawn=999;
 const a=order(game,{tableId:9,recipe:'wine'}),b=order(game,{tableId:10,recipe:'beer'}),c=order(game,{tableId:11,recipe:'wine'}),stock=clone(game.s.stock);
 game.tick(.1);assert.equal(game.bartenderJobs().length,2);assert.deepEqual(new Set(game.bartenderJobs().map(job=>job.orderId)),new Set([a.id,b.id]));
 assert.equal(game.s.stock.wine,stock.wine-15);assert.equal(game.s.stock.beer,stock.beer-50);assert.equal(game.preparationQueue().find(row=>row.orderId===c.id).status,'todo');
 const consumed=clone(game.s.stock);advance(game,2);const jobs=clone(game.s.staff);game=new Game(clone(game.s));assert.deepEqual(game.s.staff,jobs);
 advance(game,8);assert.deepEqual(game.s.stock,consumed);assert.equal(game.s.tray.length,2);assert.equal(game.bartenderJobs().length,0);
 assert.deepEqual(new Set(game.s.tray.map(drink=>drink.orderId)),new Set([a.id,b.id]));
 const served=game.s.tray.shift();game.deliverDrink(game.s.orders.find(item=>item.id===served.orderId),served);game.tick(.1);assert.equal(game.bartenderJobs().length,1);assert.equal(game.bartenderJobs()[0].orderId,c.id);assert.equal(game.s.stock.wine,consumed.wine-15);
});

test('staff unlocks follow usable building area and all new salaries and effects apply',()=>{
 const game=funded();
 for(const [id,area]of [['floorManager',174],['bartender2',246],['dj',294],['host',294]]){assert.equal(game.upgradeInfo(id).unmetArea,area);assert.equal(game.upgradeInfo(id).purchasable,false);}
 for(const id of ['assistant','floorManager','bartender2','dj','host'])buy(game,id);
 assert.equal(game.waiterSpeed(),2.25);assert.equal(game.buildingInfo().area,294);game.open();game.s.spawn=999;
 const guest=order(game,{tableId:1,recipe:'wine'});game.tick(.1);assert.ok(Math.abs(guest.patience-99.932)<1e-8);assert.ok(guest.patience<=100);
 game.s.orders=[];game.s.staff.bartender=null;game.s.staff.bartender2=null;game.s.staff.waiter=null;game.s.payments.terminalWithWaiter=false;
 const cash=game.s.cash,report=game.end();assert.equal(report.salaries,165);assert.equal(report.charges,200);assert.equal(game.s.cash,cash-200);
});

test('club customers request the exclusive menu while every other room keeps its own menu',()=>{
 const game=developed();buy(game,'dj');
 const fake=tableId=>({id:game.s.nextId++,tableId,slot:null,recipe:'beer',phase:'preparing',arrivalRemaining:0,patience:100});
 game.s.orders=game.activeTables().filter(t=>t.floor!=='nightclub').map(t=>fake(t.id));
 for(let slot=0;slot<6;slot++)game.s.orders.push({...fake(null),slot});
 const seen=new Set(),original=Math.random;
 try{
  for(const n of [.1,.9]){Math.random=()=>n;game.spawnCustomer();const guest=game.s.orders.at(-1);assert.equal(tables.find(t=>t.id===guest.tableId).floor,'nightclub');seen.add(guest.recipe);assert.equal(game.s.spawn,12*.85);assert.equal(game.s.spawn,game.crowdInfo().spawnInterval);game.s.orders.pop();}
  assert.deepEqual([...seen].sort(),['nightPurple','vodkaEnergy']);
  game.s.orders=[];for(let slot=0;slot<6;slot++)game.s.orders.push({...fake(null),slot});
  for(const table of game.activeTables().filter(t=>t.id!==1))game.s.orders.push(fake(table.id));
  Math.random=()=>.99;game.spawnCustomer();assert.equal(game.s.orders.at(-1).tableId,1);assert.equal(recipes[game.s.orders.at(-1).recipe].clubOnly,undefined);
 }finally{Math.random=original;}
 game.s.orders=[];const clubGuest=order(game,{tableId:13,recipe:'vodkaEnergy'});game.deliverDrink(clubGuest,{quality:100});assert.equal(clubGuest.tip,2);
 const standardGuest=order(game,{tableId:1});game.deliverDrink(standardGuest,{quality:100});assert.equal(standardGuest.tip,1);
 let saved=new Game(clone(game.s));assert.equal(saved.s.orders.find(o=>o.id===clubGuest.id).due,16);assert.equal(saved.s.orders.find(o=>o.id===clubGuest.id).tip,2);
 saved.open();saved.s.spawn=999;advance(saved,8.1);reachCheckout(saved,saved.s.orders.find(o=>o.id===clubGuest.id));const cash=saved.s.cash,target=saved.orderPosition(saved.s.orders.find(o=>o.id===clubGuest.id));
 saved.collectCash(clubGuest.id,target);saved.prepareChange(clubGuest.id,4,registerPosition);saved.completeCash(clubGuest.id,target);saved.completeCash(clubGuest.id,target);
 assert.equal(saved.s.cash,cash+16);assert.equal(saved.s.payments.receipts.length,1);assert.equal(saved.s.payments.receipts[0].tip,2);
 const card=order(saved,{tableId:14,recipe:'nightPurple',method:'card'});saved.deliverDrink(card,{quality:100});advance(saved,8.1);
 // The ordinary customer's older ticket is paid before the next club guest.
 const preceding=saved.s.orders.find(o=>o.id===standardGuest.id);reachCheckout(saved,preceding);saved.finishPayment(preceding,'card');reachCheckout(saved,card);
 saved.pickupTerminal(registerPosition);saved.payCard(card.id,saved.orderPosition(card));advance(saved,1);saved=new Game(clone(saved.s));advance(saved,2.1);
 assert.equal(saved.s.cash,cash+16+18+6);assert.equal(saved.s.payments.receipts.length,3);assert.equal(saved.s.payments.receipts[0].tip,2);
});

test('customers walk down the stairs to pay the waiter at the ground-floor register and save their true height',()=>{
 for(const tableId of [9,13])for(const method of ['cash','card']){
  let game=developed();buy(game,'waiter');buy(game,'floorManager');game.open();game.s.spawn=999;
  const guest=order(game,{tableId,phase:'payment',method}),cash=game.s.cash;
  const arrival=game.customerRoute(guest);if(tableId===9){assert.ok(arrival.some(point=>point.x===22.5&&point.y===0&&point.z===5.25));assert.ok(arrival.some(point=>point.x===22.5&&point.y===3.6&&point.z===9.1));
   assert.equal(arrival.at(-1).y,3.6);assert.ok(game.waiterRouteLength(arrival)>arrival.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-arrival[i].x,p.z-arrival[i].z),0));}
  else assert.ok(arrival.every(point=>(point.y||0)===0));
  let sawStairs=false,sawUpper=false,reloaded=false;
  for(let step=0;step<1800&&(game.s.orders.length||game.s.payments.terminalWithWaiter);step++){
   game.tick(.1);const info=game.checkoutInfo(guest.id),y=info?.position.y||0;
   if(y>.1&&y<3.5){sawStairs=true;if(!reloaded){const state=clone(game.s);game=new Game(state);assert.equal(game.checkoutInfo(guest.id).position.y,y);reloaded=true;}}
   if(tableId===13&&!reloaded&&info?.moving){const state=clone(game.s);game=new Game(state);assert.deepEqual(game.checkoutInfo(guest.id).position,info.position);reloaded=true;}
   if(y===3.6)sawUpper=true;
  }
  assert.ok(reloaded);if(tableId===9)assert.ok(sawStairs&&sawUpper);else assert.ok(!sawStairs&&!sawUpper);assert.equal(game.s.orders.length,0,method+' finishes');assert.equal(game.s.payments.terminalWithWaiter,false);assert.equal(game.s.payments.receipts.length,1);assert.equal(game.s.payments.receipts[0].method,method);assert.equal(game.s.cash,cash+5);
 }
});
