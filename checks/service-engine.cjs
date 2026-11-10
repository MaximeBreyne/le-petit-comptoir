'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Game,recipes,tables,registerPosition}=require('../dist/engine.js');
const {staff,gather,stationPosition}=require('./preparation-fixtures.cjs');

const advance=(game,seconds)=>{for(let i=0;i<Math.ceil(seconds*10);i++)game.tick(.1)};
function session(){const game=new Game();game.open();game.s.spawn=999;return game}
function order(game,extra={}){
 const result={id:game.s.nextId++,name:'Lucie',recipe:'beer',patience:100,tableId:1,slot:null,phase:'awaiting-order',arrivalRemaining:0,drinkRemaining:0,paymentMethod:'cash',due:0,tender:0,cardRemaining:0,...extra};
 game.s.orders.push(result);return result;
}
function readyToPay(game,extra={}){
 const customer=order(game,{phase:'preparing',...extra});
 game.s.tray.push({recipe:customer.recipe,quality:100});
 game.serve(customer.id,game.orderPosition(customer));advance(game,8.1);
 assert.equal(customer.phase,'payment');return customer;
}
const reload=game=>new Game(JSON.parse(JSON.stringify(game.s)));

test('seven customers occupy distinct tables and counter places; arrivals must finish before interaction',()=>{
 const game=session();
 for(let i=0;i<9;i++){game.s.spawn=0;game.tick(.1)}
 assert.equal(game.s.orders.length,7);
 assert.equal(new Set(game.s.orders.filter(o=>o.tableId).map(o=>o.tableId)).size,4);
 assert.equal(new Set(game.s.orders.filter(o=>!o.tableId).map(o=>o.slot)).size,3);
 const tableOrder=game.s.orders.find(o=>o.tableId);
 assert.equal(game.canReachOrder(tableOrder.id,game.orderPosition(tableOrder)),false);
 game.takeOrder(tableOrder.id,game.orderPosition(tableOrder));assert.equal(tableOrder.phase,'awaiting-order');
 advance(game,3.1);assert.equal(game.canReachOrder(tableOrder.id,game.orderPosition(tableOrder)),true);
});

test('table orders need proximity and explicit order taking; serving does not book a sale',()=>{
 const game=session(),customer=order(game),position=tables[0];
 game.s.tray.push({recipe:'beer',quality:100});
 game.takeOrder(customer.id,registerPosition);assert.equal(customer.phase,'awaiting-order');
 game.serve(customer.id,position);assert.equal(game.s.tray.length,1);
 game.takeOrder(customer.id,position);assert.equal(customer.phase,'preparing');
 game.serve(customer.id,registerPosition);assert.equal(game.s.tray.length,1);
 game.serve(customer.id,position);assert.equal(customer.phase,'drinking');assert.equal(game.s.tray.length,0);
 assert.equal(game.s.cash,260);assert.equal(game.s.sold,0);assert.equal(game.s.revenue,0);
 game.serve(customer.id,position);assert.equal(game.s.cash,260);
 advance(game,7.9);assert.equal(customer.phase,'drinking');advance(game,.2);assert.equal(customer.phase,'payment');
});

test('cash is counted at the register and credited only when change is returned, even through reloads',()=>{
 let game=session(),customer=readyToPay(game);const id=customer.id,position=tables[0],due=customer.due,till=game.s.payments.till;
 game.collectCash(id,registerPosition);assert.equal(customer.phase,'payment');
 game.collectCash(id,position);assert.equal(customer.phase,'cash-collected');
 assert.equal(game.s.cash,260);assert.equal(game.s.payments.till,till);
 game=reload(game);customer=game.s.orders[0];assert.equal(customer.phase,'cash-collected');
 const before=JSON.stringify(game.s),change=customer.tender-due;
 for(const wrong of [NaN,Infinity,-1,'4',change+.5]){game.prepareChange(id,wrong,registerPosition);assert.equal(JSON.stringify(game.s),before)}
 game.prepareChange(id,change,position);assert.equal(JSON.stringify(game.s),before);
 game.prepareChange(id,change,registerPosition);assert.equal(customer.phase,'change-ready');assert.equal(game.s.payments.till,till+due);assert.equal(game.s.cash,260);
 game=reload(game);customer=game.s.orders[0];assert.equal(customer.phase,'change-ready');assert.equal(game.s.payments.till,till+due);
 const prepared=JSON.stringify(game.s);game.prepareChange(id,change,registerPosition);assert.equal(JSON.stringify(game.s),prepared);
 advance(game,150);assert.equal(game.s.orders.length,1,'Collected money never disappears on a patience timeout');
 game.completeCash(id,registerPosition);assert.equal(game.s.orders.length,1);
 game.completeCash(id,position);assert.equal(game.s.orders.length,0);assert.equal(game.s.cash,260+due);assert.equal(game.s.payments.till,till+due);assert.equal(game.s.sold,1);assert.equal(game.s.totalSold,1);assert.equal(game.s.payments.cashRevenue,due);
 assert.equal(game.s.payments.receipts[0].method,'cash');assert.equal(game.s.payments.receipts[0].amount,due);
 const settled=JSON.stringify(game.s);game.completeCash(id,position);game.collectCash(id,position);assert.equal(JSON.stringify(game.s),settled);
 game=reload(game);assert.equal(game.s.cash,260+due);assert.equal(game.s.payments.receipts.length,1);
});

test('card requires the carried terminal, proximity and asynchronous approval; its timer persists',()=>{
 let game=session();const first=readyToPay(game,{paymentMethod:'card'}),second=readyToPay(game,{tableId:2,paymentMethod:'card'});
 const id=first.id,due=first.due,till=game.s.payments.till;
 game.payCard(id,tables[0]);assert.equal(first.phase,'payment');
 game.pickupTerminal(tables[0]);assert.equal(game.s.payments.terminalCarried,false);
 game.pickupTerminal(registerPosition);game.payCard(id,registerPosition);assert.equal(first.phase,'payment');
 game.payCard(id,tables[0]);assert.equal(first.phase,'card-processing');assert.equal(game.s.cash,260);
 game.payCard(second.id,tables[1]);assert.equal(second.phase,'payment');
 game.returnTerminal(registerPosition);assert.equal(game.s.payments.terminalCarried,true);
 advance(game,1.4);game=reload(game);assert.equal(game.s.orders[0].phase,'card-processing');
 assert.equal(game.s.payments.terminalOrderId,id);advance(game,1.5);assert.equal(game.s.cash,260);advance(game,.2);
 assert.equal(game.s.cash,260+due);assert.equal(game.s.payments.cardRevenue,due);assert.equal(game.s.payments.till,till);assert.equal(game.s.payments.terminalOrderId,null);assert.equal(game.s.sold,1);
 game.payCard(id,tables[0]);advance(game,3.1);assert.equal(game.s.cash,260+due);
 game.returnTerminal(registerPosition);assert.equal(game.s.payments.terminalCarried,false);
});

test('cash float transfers and purchases preserve total treasury and cannot create funds',()=>{
 const game=session();const cash=game.s.cash,till=game.s.payments.till;
 game.fundTill(20,tables[0]);assert.equal(game.s.payments.till,till);
 game.fundTill(20,registerPosition);assert.equal(game.s.cash,cash);assert.equal(game.s.payments.till,till+20);assert.equal(game.availableBank(),160);
 const before=JSON.stringify(game.s);for(const amount of [NaN,Infinity,-2,0,.001,161]){game.fundTill(amount,registerPosition);assert.equal(JSON.stringify(game.s),before)}
 game.s.cash=90;game.buy('rum');assert.equal(game.s.cash,72);assert.equal(game.s.payments.till,72);assert.equal(game.availableBank(),0);
});

test('insufficient change leaves a cash ticket untouched and funding the drawer allows completion',()=>{
 const game=session(),customer=readyToPay(game);game.s.payments.till=0;
 game.collectCash(customer.id,tables[0]);const before=JSON.stringify(game.s);
 game.prepareChange(customer.id,customer.tender-customer.due,registerPosition);assert.equal(JSON.stringify(game.s),before);
 game.fundTill(10,registerPosition);game.prepareChange(customer.id,customer.tender-customer.due,registerPosition);assert.equal(customer.phase,'change-ready');
 game.completeCash(customer.id,tables[0]);assert.equal(game.s.cash,260+customer.due);
});

test('closing waits for outstanding payments and reports cash/card receipts separately',()=>{
 const game=session(),customer=readyToPay(game);game.close();advance(game,110);
 assert.equal(game.s.open,true);assert.equal(game.s.day,1);assert.equal(game.end(),null);
 game.collectCash(customer.id,tables[0]);game.prepareChange(customer.id,customer.tender-customer.due,registerPosition);game.completeCash(customer.id,tables[0]);
 const report=game.tick(.1);assert.equal(report.sold,1);assert.equal(report.cashRevenue,customer.due);assert.equal(report.cardRevenue,0);assert.equal(game.s.day,2);assert.equal(game.s.payments.cashRevenue,0);assert.equal(game.s.payments.receipts.length,1);
});

test('legacy saves preserve funds and stock while old counter orders gain explicit payment stages',()=>{
 const old=new Game().s;old.cash=173;old.stock.beer=777;old.orders=[{id:4,name:'Marc',recipe:'beer',patience:44}];old.nextId=5;delete old.payments;delete old.staff;delete old.management.bartender;delete old.management.waiter;
 const before=JSON.stringify(old),game=new Game(old);assert.equal(JSON.stringify(old),before);assert.equal(game.s.cash,173);assert.equal(game.s.stock.beer,777);assert.equal(game.s.orders[0].phase,'preparing');assert.equal(game.s.orders[0].tableId,null);assert.equal(game.s.payments.till,80);assert.equal(game.s.management.bartender,false);
 game.open();game.s.tray=[{recipe:'beer',quality:100}];game.serve(4,game.orderPosition(game.s.orders[0]));assert.equal(game.s.cash,173);assert.equal(game.s.orders[0].phase,'drinking');
});

test('bartender reserves capacity and consumes ingredients only once across a saved job',()=>{
 let game=session();game.s.management.bartender=true;const customer=order(game,{phase:'preparing'}),stock=game.s.stock.beer;
 game.tick(.1);assert.equal(game.s.staff.bartender.orderId,customer.id);assert.equal(game.s.stock.beer,stock-50);
 game.start('coffee',staff);assert.equal(game.s.prep.recipe,'coffee');
 advance(game,3.9);game=reload(game);const afterLoad=game.s.stock.beer;advance(game,4.2);
 assert.equal(game.s.stock.beer,afterLoad);assert.equal(game.s.staff.bartender,null);assert.equal(game.s.tray.length,1);assert.equal(game.s.tray[0].orderId,customer.id);assert.equal(game.s.tray[0].quality,92);
 advance(game,10);assert.equal(game.s.tray.length,1);assert.equal(game.s.stock.beer,afterLoad);
});

test('bartender respects licenses, physical stock, player preparations and full trays',()=>{
 const game=session();game.s.management.bartender=true;
 const customer=order(game,{phase:'preparing',recipe:'mojito'}),before={...game.s.stock};game.tick(.1);assert.equal(game.s.staff.bartender,null);assert.deepEqual(game.s.stock,before);
 customer.recipe='beer';game.s.stock.beer=0;game.tick(.1);assert.equal(game.s.staff.bartender,null);
 game.s.stock.beer=100;gather(game,'beer');game.setPour(true,stationPosition(game));game.tick(.1);assert.equal(game.s.staff.bartender,null);assert.equal(game.s.stock.beer,50);
 game.discard();game.s.tray=[{recipe:'wine',quality:90},{recipe:'wine',quality:90}];game.tick(.1);assert.equal(game.s.staff.bartender,null);assert.equal(game.s.stock.beer,50);
});

test('waiter takes table orders, delivers prepared drinks and then handles the payment',()=>{
 const game=session();game.s.management.waiter=true;game.s.management.bartender=true;const customer=order(game);
 game.tick(.1);assert.equal(game.s.staff.waiter.task,'take-order');assert.ok(game.s.staff.waiter.total>=6);assert.equal(customer.phase,'awaiting-order');
 advance(game,6.1);assert.equal(customer.phase,'preparing');advance(game,8.2);
 assert.equal(game.s.staff.waiter.task,'serve');assert.equal(game.s.staff.waiter.orderId,customer.id);assert.equal(game.s.tray.length,0);assert.ok(game.s.staff.waiter.drink);
 game.s.tray.push({recipe:'beer',quality:100});game.serve(customer.id,tables[0]);assert.equal(customer.phase,'preparing','Player cannot double-serve a reserved waiter delivery');assert.equal(game.s.tray.length,1);
 advance(game,15);assert.equal(customer.phase,'payment');assert.equal(game.s.cash,260);assert.equal(game.s.sold,0);assert.equal(game.s.staff.waiter.task,'collect-cash');
 advance(game,40);assert.equal(game.s.orders.length,0);assert.equal(game.s.cash,266);assert.equal(game.s.payments.cashRevenue,6);assert.equal(game.s.sold,1);
});

test('waiter keeps a carried drink and job through reload without consuming another tray item',()=>{
 let game=session();game.s.management.waiter=true;const customer=order(game,{phase:'preparing'});game.s.tray.push({recipe:'beer',quality:90,orderId:customer.id});game.tick(.1);advance(game,2);
 assert.equal(game.s.tray.length,0);game=reload(game);assert.equal(game.s.staff.waiter.drink.recipe,'beer');advance(game,4.1);
 assert.equal(game.s.orders[0].phase,'drinking');assert.equal(game.s.tray.length,0);assert.equal(game.s.cash,260);
});

test('cancelled staff preparation records waste; a cancelled delivery returns its drink',()=>{
 const preparing=session();preparing.s.management.bartender=true;order(preparing,{phase:'preparing',patience:.2});preparing.tick(.1);assert.ok(preparing.s.staff.bartender);preparing.tick(.1);assert.equal(preparing.s.staff.bartender,null);assert.equal(preparing.s.waste,1);assert.equal(preparing.s.stock.beer,950);
 const serving=session();serving.s.management.waiter=true;order(serving,{phase:'preparing',patience:.2});serving.s.tray=[{recipe:'beer',quality:90,orderId:1}];serving.tick(.1);assert.ok(serving.s.staff.waiter);serving.tick(.1);assert.equal(serving.s.staff.waiter,null);assert.equal(serving.s.tray.length,1);assert.equal(serving.s.tray[0].orderId,undefined);assert.equal(serving.s.waste,0);
});

test('all three employees have paid unlocks and recurring salaries, conserved after saving',()=>{
 let game=new Game();game.s.totalSold=100;game.s.cash=2000;
 for(const id of ['assistant','bartender','waiter'])game.purchaseUpgrade(id);
 assert.equal(game.s.cash,1100);game=reload(game);assert.equal(game.s.management.bartender,true);assert.equal(game.s.management.waiter,true);
 game.open();game.s.spawn=999;game.close();const report=game.tick(.1);assert.equal(report.salaries,50);assert.equal(report.charges,85);assert.equal(game.s.cash,1015);
});
