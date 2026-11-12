'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Game,registerPosition,checkoutPositions,checkoutCustomer}=require('../dist/engine.js');
const clone=value=>JSON.parse(JSON.stringify(value));
const advance=(game,seconds)=>{for(let remaining=seconds;remaining>1e-9;remaining-=.1)game.tick(Math.min(.1,remaining))};
function session(){const game=new Game();game.open();game.s.spawn=99999;return game;}
function guest(game,tableId,extra={}){const order={id:game.s.nextId++,name:'Client '+tableId,recipe:'beer',tableId,slot:null,phase:'payment',patience:100,arrivalRemaining:0,drinkRemaining:0,paymentMethod:'cash',due:6,tender:10,tip:1,cardRemaining:0,...extra};game.s.orders.push(order);return order;}
function until(game,predicate){for(let i=0;i<2400&&!predicate();i++)game.tick(.1);assert.ok(predicate(),'The actual simulation reaches the requested state');}
function payCash(game,order){game.collectCash(order.id,registerPosition);assert.equal(order.phase,'cash-collected');game.prepareChange(order.id,order.tender-order.due,registerPosition);assert.equal(order.phase,'change-ready');game.completeCash(order.id,registerPosition);assert.ok(!game.s.orders.includes(order));}

test('two physical queue places admit guests in order while the others remain seated and retain their capacity',()=>{
 let game=session();const ids=[1,2,3,4].map(tableId=>guest(game,tableId).id),initial=game.s.cash;
 assert.ok(game.s.orders.every(order=>game.checkoutInfo(order).state==='waiting'));
 game.tick(.1);assert.equal(game.checkoutInfo(ids[0]).moving,true);assert.equal(checkoutCustomer(game.s),null);
 for(let step=0;step<500;step++){
  const occupied=game.s.orders.filter(order=>order.checkout?.slot!==null&&order.checkout?.slot!==undefined);
  assert.equal(new Set(occupied.map(order=>order.checkout.slot)).size,occupied.length);assert.ok(occupied.length<=2);
  assert.ok(game.s.orders.filter(order=>game.checkoutInfo(order).moving).length<=1);
  game.tick(.1);
 }
 assert.equal(game.checkoutCustomer().id,ids[0]);assert.equal(game.checkoutInfo(ids[1]).state,'queued');
 assert.equal(game.checkoutInfo(ids[2]).seated,true);assert.equal(game.checkoutInfo(ids[3]).seated,true);assert.equal(game.s.orders.length,4);
 assert.deepEqual(Object.fromEntries(['x','y','z'].map(key=>[key,game.checkoutInfo(ids[0]).position[key]])),checkoutPositions[0]);
 const before=clone(game.s);game.collectCash(ids[1],registerPosition);game.completeCash(ids[2],registerPosition);assert.deepEqual(game.s,before,'The cashier cannot skip the queue');
 for(const [index,id]of ids.entries()){
  until(game,()=>game.checkoutCustomer()?.id===id);const saved=clone(game.s),position=game.checkoutInfo(id).position;
  game=new Game(saved);assert.deepEqual(game.checkoutInfo(id).position,position);assert.deepEqual(game.s.orders,saved.orders);
  const current=game.s.orders.find(order=>order.id===id);payCash(game,current);game.completeCash(id,registerPosition);
  assert.equal(game.s.cash,initial+6*(index+1));assert.equal(game.s.payments.receipts.length,index+1);assert.equal(game.s.totalSold,index+1);
 }
 assert.deepEqual(game.s.payments.receipts.map(receipt=>receipt.id),ids.slice().reverse());
});

test('cashier proximity is required even with the terminal and guests cannot be paid at their former table or in the queue',()=>{
 const game=session(),first=guest(game,1,{paymentMethod:'card'}),second=guest(game,2,{paymentMethod:'card'}),table={x:1.65,z:6.4};
 game.pickupTerminal(registerPosition);
 const initial=clone(game.s);for(const point of [table,registerPosition,{...registerPosition,y:5.28}])game.payCard(first.id,point);assert.deepEqual(game.s,initial);
 until(game,()=>game.checkoutCustomer()?.id===first.id);until(game,()=>game.checkoutInfo(second).state==='queued');
 for(const point of [table,checkoutPositions[0],{...registerPosition,y:5.28}]){game.payCard(first.id,point);assert.equal(first.phase,'payment');}
 game.payCard(second.id,registerPosition);assert.equal(second.phase,'payment');
 game.payCard(first.id,registerPosition);assert.equal(first.phase,'card-processing');advance(game,2.9);assert.equal(game.s.cash,260);advance(game,.1);assert.equal(game.s.cash,266);
 assert.equal(game.s.payments.terminalCarried,true);assert.equal(game.s.payments.terminalOrderId,null);
});

test('movement and queue promotion survive a save without resetting distance or advancing the next guest through the previous one',()=>{
 let game=session();const first=guest(game,4),second=guest(game,1),third=guest(game,2);
 game.tick(.1);advance(game,1);const before=game.checkoutInfo(first).position,snapshot=clone(game.s),original=clone(snapshot);
 assert.equal(game.checkoutInfo(first).state,'walking');game=new Game(snapshot);assert.deepEqual(game.checkoutInfo(first.id).position,before);
 assert.deepEqual(game.s.orders[0].checkout,snapshot.orders[0].checkout);assert.deepEqual(snapshot,original);
 until(game,()=>game.checkoutInfo(second.id).state==='queued');payCash(game,game.s.orders.find(order=>order.id===first.id));game.tick(.1);
 assert.equal(game.checkoutInfo(second.id).state,'walking');assert.equal(game.checkoutInfo(third.id).state,'waiting');
 const moving=game.checkoutInfo(second.id).position,copy=clone(game.s);game=new Game(copy);assert.deepEqual(game.checkoutInfo(second.id).position,moving);
 until(game,()=>game.checkoutCustomer()?.id===second.id);assert.notEqual(game.checkoutInfo(third.id).state,'ready');
});

test('legacy unpaid guests walk to the counter, while cash already exchanged migrates without disappearing or being credited twice',()=>{
 const old=session();const pending=guest(old,1),cash=guest(old,2,{phase:'change-ready',change:4});old.s.payments.till=86;
 delete old.s.payments.checkoutNext;const source=clone(old.s),game=new Game(source);
 assert.deepEqual(source,old.s);assert.equal(game.s.cash,260);assert.equal(game.s.payments.till,86);
 assert.equal(game.checkoutInfo(cash.id).state,'ready');assert.equal(game.checkoutInfo(pending.id).state,'waiting');
 const inherited=game.s.orders.find(order=>order.id===cash.id);game.completeCash(cash.id,registerPosition);game.completeCash(cash.id,registerPosition);
 assert.equal(game.s.cash,266);assert.equal(game.s.payments.till,86);assert.equal(game.s.payments.receipts.length,1);
 game.tick(.1);assert.equal(game.checkoutInfo(pending.id).state,'walking');assert.equal(game.s.orders.length,1);assert.equal(inherited.change,4);
});

test('legacy card processing keeps its timer and terminal, and waits ahead of an older unexchanged ticket',()=>{
 const old=session();const waiting=guest(old,1),card=guest(old,2,{phase:'card-processing',paymentMethod:'card',cardRemaining:1.7});
 old.s.payments.terminalCarried=true;old.s.payments.terminalOrderId=card.id;delete old.s.payments.checkoutNext;
 const game=new Game(clone(old.s));assert.equal(game.checkoutCustomer().id,card.id);assert.equal(game.s.payments.terminalOrderId,card.id);
 advance(game,1.6);assert.equal(game.s.cash,260);advance(game,.1);assert.equal(game.s.cash,266);assert.ok(game.s.orders.some(order=>order.id===waiting.id));
 const reload=new Game(clone(game.s));advance(reload,3);assert.equal(reload.s.cash,266);assert.equal(reload.s.payments.receipts.length,1);
});

test('closing waits for walking guests, all queued transactions and the shared terminal to return',()=>{
 const game=session();game.s.management.waiter=true;guest(game,1,{paymentMethod:'card'});guest(game,2);guest(game,3,{paymentMethod:'card'});game.close();
 game.tick(.1);assert.equal(game.s.open,true);assert.equal(game.end(),null);assert.equal(game.s.staff.waiter,null);
 until(game,()=>!game.s.open);assert.equal(game.s.day,2);assert.equal(game.s.orders.length,0);assert.equal(game.s.payments.terminalWithWaiter,false);
 assert.equal(game.s.lastReport.sold,3);assert.equal(game.s.lastReport.cardRevenue,12);assert.equal(game.s.lastReport.cashRevenue,6);assert.equal(game.s.payments.receipts.length,3);
});

test('legacy waiter jobs retargeted to the checkout begin at the saved position and retain actual walking speed',()=>{
 for(const task of ['collect-cash','return-change']){
  const old=session();old.s.management.waiter=true;
  const order=guest(old,4,{phase:task==='return-change'?'change-ready':'payment',paymentBy:'waiter',change:4});
  if(task==='return-change')old.s.payments.till+=order.due;
  const route=[{x:.95,z:4.9},{x:8.8,z:4.9},{x:8.8,z:8.65}],travel=old.waiterRouteLength(route)/old.waiterSpeed(),total=travel+2;
  old.s.staff.waiter={task,orderId:order.id,recipe:order.recipe,route,travel,total,remaining:total-travel*.55};old.updateWaiterPosition(old.s.staff.waiter);
  const position={...old.s.staff.waiterPosition},snapshot=clone(old.s),game=new Game(snapshot);
  assert.deepEqual(game.s.staff.waiterPosition,position);assert.equal(game.s.cash,260);
  if(task==='return-change'){
   assert.deepEqual(game.s.staff.waiter.route[0],position);
   assert.equal(game.s.staff.waiter.remaining,game.s.staff.waiter.total);
   assert.ok(Math.abs(game.s.staff.waiter.travel-game.waiterRouteLength(game.s.staff.waiter.route)/game.waiterSpeed())<1e-9);
  }
  let previous={...position};
  for(let step=0;step<1800&&game.s.orders.length;step++){
   game.tick(.1);const current=game.s.staff.waiterPosition;
   assert.ok(Math.hypot(current.x-previous.x,current.z-previous.z,(current.y||0)-(previous.y||0))<=game.waiterSpeed()*.1+1e-8,'Migrated waiter never skips part of the new route');
   previous={...current};
  }
  assert.equal(game.s.orders.length,0);assert.equal(game.s.cash,266);assert.equal(game.s.payments.receipts.length,1);
 }
});

test('legacy waiter card authorisation is relocated with its customer without resetting or speeding up the bank timer',()=>{
 const old=session();old.s.management.waiter=true;const order=guest(old,4,{phase:'card-processing',paymentMethod:'card',paymentBy:'waiter',cardRemaining:1.7});
 const point={x:8.87,z:8.65};old.s.staff.waiterPosition=point;old.s.staff.waiter={task:'wait-card',orderId:order.id,recipe:order.recipe,route:[{...point},{...point}],travel:0,total:3,remaining:1.7};
 old.s.payments.terminalWithWaiter=true;old.s.payments.terminalOrderId=order.id;
 const game=new Game(clone(old.s));assert.equal(game.s.orders[0].cardRemaining,1.7);assert.equal(game.s.staff.waiter.remaining,1.7);assert.deepEqual(game.s.staff.waiterPosition,registerPosition);
 advance(game,1.6);assert.equal(game.s.cash,260);assert.equal(game.s.payments.terminalWithWaiter,true);advance(game,.1);assert.equal(game.s.cash,266);
 until(game,()=>!game.s.payments.terminalWithWaiter);assert.equal(game.s.payments.receipts.length,1);
});
