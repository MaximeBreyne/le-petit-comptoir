'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Game,registerPosition}=require('../dist/engine.js');
const {reachCheckout}=require('./checkout-fixtures.cjs');
const advance=(game,seconds)=>{for(let i=0;i<Math.ceil(seconds*10);i++)game.tick(.1)};
const reload=game=>new Game(JSON.parse(JSON.stringify(game.s)));
function session(){const game=new Game();game.open();game.s.spawn=999;game.s.management.waiter=true;return game}
function payable(game,method='cash',extra={}){const order={id:game.s.nextId++,name:'Lucie',recipe:'beer',patience:100,tableId:1,slot:null,phase:'payment',arrivalRemaining:0,drinkRemaining:0,paymentMethod:method,due:6,tender:10,cardRemaining:0,tip:1,...extra};game.s.orders.push(order);return order}
function until(game,predicate,message){for(let i=0;i<1500&&!predicate();i++)game.tick(.1);assert.ok(predicate(),message)}
const stage=(game,name)=>until(game,()=>game.s.staff.waiter?.task===name,'Reach '+name);

test('waiter cash collection visits the till, returns change and credits exactly once',()=>{
 const game=session(),order=payable(game),position=game.orderPosition(order);
 stage(game,'collect-cash');assert.equal(order.paymentBy,'waiter');assert.ok(game.paymentHandledByWaiter(order.id));
 assert.equal(game.s.cash,260);const before=JSON.stringify(game.s);game.collectCash(order.id,position);assert.equal(JSON.stringify(game.s),before);
 stage(game,'prepare-change');assert.equal(order.phase,'cash-collected');assert.equal(game.s.payments.till,80);assert.equal(game.s.cash,260);
 const collecting=JSON.stringify(game.s);game.prepareChange(order.id,4,registerPosition);assert.equal(JSON.stringify(game.s),collecting);
 stage(game,'return-change');assert.equal(order.phase,'change-ready');assert.equal(game.s.payments.till,86);assert.equal(game.s.cash,260);
 assert.ok(Math.hypot(game.s.staff.waiterPosition.x-3,game.s.staff.waiterPosition.z-1.9)<.001,'Money is prepared after reaching the till');
 const returning=JSON.stringify(game.s);game.completeCash(order.id,position);assert.equal(JSON.stringify(game.s),returning);
 until(game,()=>!game.s.orders.length,'Cash handed back');assert.equal(game.s.cash,266);assert.equal(game.s.sold,1);assert.equal(game.s.payments.cashRevenue,6);assert.equal(game.s.payments.till,86);
 assert.equal(game.s.payments.receipts.length,1);game.completeCash(order.id,position);advance(game,25);assert.equal(game.s.cash,266);assert.equal(game.s.payments.receipts.length,1);
});

test('a single shared terminal is collected, authorized for three seconds and returned',()=>{
 const game=session(),order=payable(game,'card');
 stage(game,'pickup-terminal');assert.equal(game.s.payments.terminalWithWaiter,false);
 game.pickupTerminal(registerPosition);assert.equal(game.s.payments.terminalCarried,false,'Reserved terminal cannot be taken by the player');
 stage(game,'take-card');assert.equal(game.s.payments.terminalWithWaiter,true);assert.equal(game.s.payments.terminalCarried,false);assert.equal(order.phase,'payment');
 game.pickupTerminal(registerPosition);game.returnTerminal(registerPosition);assert.equal(game.s.payments.terminalWithWaiter,true);
 game.payCard(order.id,game.orderPosition(order));assert.equal(order.phase,'payment','Player cannot present the waiter terminal');
 stage(game,'wait-card');assert.equal(order.phase,'card-processing');assert.equal(game.s.payments.terminalOrderId,order.id);
 advance(game,2.8);assert.equal(game.s.cash,260);advance(game,.3);assert.equal(game.s.cash,266);assert.equal(game.s.payments.cardRevenue,6);assert.equal(game.s.payments.till,80);
 assert.equal(game.s.staff.waiter.task,'return-terminal');assert.equal(game.s.payments.terminalWithWaiter,true);assert.equal(game.s.payments.terminalOrderId,null);
 until(game,()=>!game.s.payments.terminalWithWaiter,'Terminal returned');assert.equal(game.s.staff.waiter,null);assert.equal(game.s.payments.receipts.length,1);
});

test('each cash and card job resumes after saving without duplicate receipt or stock mutation',()=>{
 for(const [method,tasks]of [['cash',['collect-cash','prepare-change','return-change']],['card',['pickup-terminal','take-card','wait-card','return-terminal']]]){
  let game=session();payable(game,method);const stock=JSON.stringify(game.s.stock);
  for(const task of tasks){stage(game,task);advance(game,.1);const cash=game.s.cash,till=game.s.payments.till,remaining=game.s.staff.waiter.remaining,position={...game.s.staff.waiterPosition};game=reload(game);assert.equal(game.s.staff.waiter.task,task);assert.equal(game.s.staff.waiter.remaining,remaining);assert.deepEqual(game.s.staff.waiterPosition,position);assert.equal(game.s.cash,cash);assert.equal(game.s.payments.till,till);assert.equal(JSON.stringify(game.s.stock),stock);}
  until(game,()=>!game.s.orders.length&&!game.s.payments.terminalWithWaiter,'Finish saved '+method);
  assert.equal(game.s.cash,266);assert.equal(game.s.payments.till,method==='cash'?86:80);assert.equal(game.s.payments.receipts.length,1);assert.equal(game.s.totalSold,1);
  game=reload(game);advance(game,20);assert.equal(game.s.cash,266);assert.equal(game.s.payments.receipts.length,1);
 }
});

test('the checkout queue waits for the player terminal, then serves cash in order',()=>{
 const game=session();game.pickupTerminal(registerPosition);const card=payable(game,'card'),cash=payable(game,'cash',{tableId:2});
 reachCheckout(game,card);
 assert.equal(game.waiterPaymentStatus(card.id).blocked,'terminal');
 advance(game,30);assert.ok(game.s.orders.includes(cash));assert.equal(game.checkoutInfo(cash).state,'queued');
 assert.equal(card.phase,'payment');assert.equal(game.s.payments.terminalCarried,true);assert.equal(game.s.payments.terminalWithWaiter,false);assert.equal(game.s.cash,260);
 game.returnTerminal(registerPosition);until(game,()=>!game.s.orders.length&&!game.s.payments.terminalWithWaiter,'Card settles after player returns terminal');
 assert.equal(game.s.cash,272);assert.equal(game.s.payments.receipts.length,2);
});

test('the waiter does not take over cash or card payments begun by the player',()=>{
 const game=session();game.s.management.waiter=false;const cash=payable(game),card=payable(game,'card',{tableId:2});
 reachCheckout(game,cash);game.collectCash(cash.id,game.orderPosition(cash));game.pickupTerminal(registerPosition);game.s.management.waiter=true;
 advance(game,20);assert.equal(cash.phase,'cash-collected');assert.equal(game.paymentHandledByWaiter(cash.id),false);assert.equal(game.s.cash,260);assert.equal(game.s.payments.terminalCarried,true);assert.equal(game.s.staff.waiter,null);
 game.prepareChange(cash.id,4,registerPosition);game.completeCash(cash.id,game.orderPosition(cash));assert.equal(game.s.cash,266);
 reachCheckout(game,card);game.payCard(card.id,registerPosition);assert.equal(card.phase,'card-processing');advance(game,3.1);
 assert.equal(game.s.cash,272);assert.equal(game.s.payments.receipts.length,2);assert.equal(game.s.payments.terminalCarried,true);
});

test('a cash shortage holds the checkout queue until real treasury funds can replenish the drawer',()=>{
 const game=session(),cash=payable(game);stage(game,'prepare-change');
 game.s.cash=0;game.s.payments.till=0;advance(game,30);assert.equal(cash.phase,'cash-collected');assert.equal(game.s.staff.waiter,null);assert.equal(game.waiterPaymentStatus(cash.id).blocked,'change');assert.equal(game.s.cash,0);
 const card=payable(game,'card',{tableId:2});advance(game,30);assert.equal(game.s.orders.length,2);assert.equal(game.checkoutInfo(card).state,'queued');assert.equal(game.s.cash,0);
 game.s.cash=4;until(game,()=>!game.s.orders.length&&!game.s.payments.terminalWithWaiter,'Actual treasury funds unblock change and then card');
 assert.equal(game.s.cash,16);assert.equal(game.s.payments.till,10);assert.equal(game.availableBank(),6);assert.equal(game.s.payments.receipts.length,2);
});

test('unfunded cash payments remain available to the player without fabricated money',()=>{
 const game=session(),cash=payable(game);game.s.cash=0;game.s.payments.till=0;advance(game,10);
 assert.equal(game.s.staff.waiter,null);assert.equal(game.waiterPaymentStatus(cash.id).blocked,'change');assert.equal(game.paymentHandledByWaiter(cash.id),false);assert.equal(cash.phase,'payment');assert.equal(game.s.cash,0);
 game.s.cash=10;until(game,()=>!game.s.orders.length,'Waiter proceeds after real funding');assert.equal(game.s.cash,16);assert.equal(game.s.payments.till,10);
});

test('closing waits until the waiter has returned the shared terminal',()=>{
 const game=session();payable(game,'card');game.close();stage(game,'return-terminal');assert.equal(game.s.orders.length,0);assert.equal(game.s.open,true);assert.equal(game.end(),null);
 until(game,()=>!game.s.open,'Closing completes');assert.equal(game.s.day,2);assert.equal(game.s.payments.terminalWithWaiter,false);assert.equal(game.s.cash,209);assert.equal(game.s.lastReport.cardRevenue,6);assert.equal(game.s.lastReport.salaries,22);
});

test('legacy ownership is preserved and malformed duplicate holders never duplicate the terminal',()=>{
 const legacy=session();legacy.s.management.waiter=false;legacy.pickupTerminal(registerPosition);const old=JSON.parse(JSON.stringify(legacy.s));delete old.payments.terminalWithWaiter;delete old.staff.waiterPosition;
 const restored=new Game(old);assert.equal(restored.s.payments.terminalCarried,true);assert.equal(restored.s.payments.terminalWithWaiter,false);assert.deepEqual(restored.s.staff.waiterPosition,{x:1.05,z:4.5});
 const duplicate=session();payable(duplicate,'card');stage(duplicate,'wait-card');const saved=JSON.parse(JSON.stringify(duplicate.s));saved.payments.terminalCarried=true;
 const normalized=new Game(saved);assert.equal(normalized.s.payments.terminalCarried,true);assert.equal(normalized.s.payments.terminalWithWaiter,false);assert.equal(normalized.s.staff.waiter,null);advance(normalized,4);assert.equal(normalized.s.cash,266);assert.equal(normalized.s.payments.receipts.length,1);
});

test('waiter routes use the left passage and action timers allow the full route',()=>{
 const game=session();payable(game,'cash',{tableId:4});stage(game,'collect-cash');const job=game.s.staff.waiter;
 assert.ok(job.route.some(point=>point.x===.95&&point.z===1.9));assert.ok(job.route.some(point=>point.x===.95&&point.z===4.9));assert.ok(job.total>=job.travel+1.999);
 for(let i=1;i<job.route.length;i++){const a=job.route[i-1],b=job.route[i];if(Math.min(a.z,b.z)<3.02&&Math.max(a.z,b.z)>3.02)assert.ok(a.x<1.3&&b.x<1.3,'Route never crosses the counter');}
 stage(game,'prepare-change');assert.ok(game.s.staff.waiter.route.every(point=>point.z<2.5),'The cashier remains behind the bar to prepare change');
});
