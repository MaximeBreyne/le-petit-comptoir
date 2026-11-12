'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Game,ingredients,serviceSchedule,serviceInfo,formatServiceTime}=require('../dist/engine.js');
const {gather,stationPosition}=require('./preparation-fixtures.cjs');
const clone=value=>JSON.parse(JSON.stringify(value));
const advance=(game,seconds)=>{for(let remaining=seconds;remaining>1e-8;remaining-=.1)game.tick(Math.min(.1,remaining))};
function customer(game,extra={}){const item={id:game.s.nextId++,name:'Client de test',recipe:'beer',tableId:1,slot:null,phase:'preparing',patience:100,arrivalRemaining:0,paymentMethod:'card',...extra};game.s.orders.push(item);return item;}

test('developer tools require explicit activation and enablement alone grants no money, stock or progress',()=>{
 const game=new Game(),original=clone(game.s);
 assert.deepEqual(game.s.developer,{enabled:false,clockPaused:false});
 for(const [action,value]of [['addMoney',1000],['addProgress',100],['refillStocks'],['pauseClock',true],['advanceTime',60]]){assert.match(game.developerAction(action,value),/Activez/);assert.deepEqual(game.s,original);}
 game.setDeveloperMode('true');assert.deepEqual(game.s,original);
 game.setDeveloperMode(true);assert.deepEqual(game.s,{...original,developer:{enabled:true,clockPaused:false}});
 assert.equal(new Game().s.developer.enabled,false,'A separate game never inherits the developer mode');
});

test('developer treasury injection is not a receipt or till transfer and can recover a bankrupt bar',()=>{
 const game=new Game();game.setDeveloperMode(true);game.s.cash=-40;game.s.gameOver=true;
 const payments=clone(game.s.payments),income={revenue:game.s.revenue,sold:game.s.sold,totalSold:game.s.totalSold,expenses:game.s.expenses,day:game.s.day};
 game.developerAction('addMoney',30);assert.equal(game.s.cash,-10);assert.equal(game.s.gameOver,true);
 game.developerAction('addMoney',1010.25);assert.equal(game.s.cash,1000.25);assert.equal(game.s.gameOver,false);assert.deepEqual(game.s.payments,payments);
 for(const [key,value]of Object.entries(income))assert.equal(game.s[key],value,key);
 const before=clone(game.s);for(const invalid of [undefined,null,'100',NaN,Infinity,-20,0,.5,1.001,1000001]){game.developerAction('addMoney',invalid);assert.deepEqual(game.s,before);}
 game.open();assert.equal(game.s.open,true);
 const restored=new Game(clone(game.s));assert.equal(restored.s.cash,1000.25);assert.equal(restored.s.developer.enabled,true);
});

test('developer progress unlocks paid offers without creating sales, income, buildings or employees',()=>{
 const game=new Game();game.setDeveloperMode(true);const before=clone(game.s);
 game.developerAction('addProgress',100);assert.equal(game.s.totalSold,100);assert.equal(game.upgradeInfo('spirits').unlocked,true);
 assert.equal(game.upgradeInfo('upstairs').unlocked,false,'Building prerequisites still apply');
 for(const key of ['cash','sold','revenue','expenses','management','orders','payments'])assert.deepEqual(game.s[key],before[key],key);
 assert.equal(game.crowdInfo().counterSeatsUnlocked,6);assert.equal(game.activeTables().length,4);
 const boosted=clone(game.s);for(const invalid of [undefined,'100',NaN,Infinity,0,-1,.5,1001]){game.developerAction('addProgress',invalid);assert.deepEqual(game.s,boosted);}
 game.purchaseUpgrade('spirits');assert.equal(game.s.cash,before.cash-210);assert.equal(game.s.management.spirits,true);
});

test('developer supplies obey licences and counter capacities while preserving larger existing stocks and prepared drinks',()=>{
 const game=new Game();game.setDeveloperMode(true);game.s.management.spirits=true;game.s.management.counter=true;
 game.s.stock.beer=12345;game.s.reserve.coffee=2000;game.s.tray=[{recipe:'wine',quality:92}];
 const cash=game.s.cash,management=clone(game.s.management),tray=clone(game.s.tray);
 game.developerAction('refillStocks');
 for(const [key,item]of Object.entries(ingredients)){
  if(game.canBuy(key)){assert.ok(game.s.stock[key]>=game.serviceCapacity(key),key);assert.ok(game.s.reserve[key]>=item.pack*5,key);}
  else {assert.equal(game.s.stock[key],0,key);assert.equal(game.s.reserve[key],0,key);}
 }
 assert.equal(game.s.stock.beer,12345);assert.equal(game.s.reserve.coffee,2000);assert.equal(game.s.stock.gin,210);assert.equal(game.s.cash,cash);
 assert.deepEqual(game.s.management,management);assert.deepEqual(game.s.tray,tray);
 const restored=new Game(clone(game.s));assert.deepEqual(restored.s.stock,game.s.stock);assert.deepEqual(restored.s.reserve,game.s.reserve);
});

test('freezing the service clock leaves pouring, deliveries, customer patience and arrivals running',()=>{
 const game=new Game();game.setDeveloperMode(true);game.open();game.s.spawn=1;
 const order=customer(game);gather(game,'beer');game.setPour(true,stationPosition(game));
 game.s.deliveries.push({key:'coffee',remaining:.5});const time=game.s.time,coffee=game.s.reserve.coffee;
 game.developerAction('pauseClock',true);advance(game,1.1);
 assert.equal(game.s.time,time);assert.equal(serviceInfo(game.s).clockPaused,true);assert.ok(game.s.prep.amount>0);assert.ok(order.patience<100);assert.equal(game.s.reserve.coffee,coffee+ingredients.coffee.pack);assert.equal(game.s.orders.length,2);
 const restored=new Game(clone(game.s));assert.equal(restored.s.developer.clockPaused,true);restored.tick(.1);assert.equal(restored.s.time,time);
 const previous=clone(restored.s);restored.developerAction('pauseClock','false');assert.deepEqual(restored.s,previous);
 restored.setDeveloperMode(false);assert.deepEqual(restored.s.developer,{enabled:false,clockPaused:false});restored.tick(.1);assert.ok(restored.s.time>time);
});

test('advancing the clock never fast-forwards payments or preparations and keeps customers for the last round',()=>{
 const game=new Game();game.setDeveloperMode(true);
 const closed=clone(game.s);game.developerAction('advanceTime',60);assert.deepEqual(game.s,closed);
 game.open();game.s.spawn=999;const order=customer(game,{phase:'payment',due:5,tender:5});game.s.time=1650;
 const previous=clone(game.s);for(const invalid of [undefined,'60',NaN,Infinity,0,-1,.5,61]){game.developerAction('advanceTime',invalid);assert.deepEqual(game.s,previous);}
 game.developerAction('advanceTime',60);assert.equal(game.s.time,1680);assert.equal(game.s.closing,true);assert.equal(game.s.day,1);assert.equal(game.s.open,true);
 assert.deepEqual(game.s.orders,previous.orders);assert.deepEqual(game.s.payments,previous.payments);assert.equal(game.s.spawn,999);
 const closing=clone(game.s);game.developerAction('advanceTime',60);assert.deepEqual(game.s,closing);
 advance(game,5);assert.equal(game.s.orders.length,1);assert.equal(game.s.day,1);
 game.finishPayment(order,'card');const report=game.tick(.1);assert.equal(report.sold,1);assert.equal(game.s.day,2);assert.equal(game.s.time,serviceSchedule.opensAt);
});

test('developer settings migrate safely and are scoped to saves without mutating the loaded snapshot',()=>{
 const saved=clone(new Game().s);delete saved.developer;const original=clone(saved),game=new Game(saved);
 assert.deepEqual(saved,original);assert.deepEqual(game.s.developer,{enabled:false,clockPaused:false});
 for(const value of [null,42,{}, {enabled:'true',clockPaused:true},{enabled:false,clockPaused:true}])assert.deepEqual(new Game({...saved,developer:value}).s.developer,{enabled:false,clockPaused:false});
 assert.deepEqual(new Game({...saved,developer:{enabled:true,clockPaused:'true'}}).s.developer,{enabled:true,clockPaused:false});
 const frozen={...saved,time:1560,open:true,developer:{enabled:true,clockPaused:true}};const copy=clone(frozen),restored=new Game(frozen);
 assert.deepEqual(frozen,copy);assert.deepEqual(restored.s.developer,{enabled:true,clockPaused:true});restored.tick(.1);assert.equal(restored.s.time,1560);
 const before=clone(restored.s);restored.developerAction('__proto__');assert.deepEqual(restored.s,before);
});

test('service info covers the full 17:00 to 04:00 schedule and formats times after midnight',()=>{
 assert.deepEqual(serviceSchedule,{opensAt:1020,closesAt:1680,minutesPerSecond:.5});
 assert.equal(serviceInfo(new Game().s).realDurationSeconds,22*60);
 for(const [time,label,elapsed,remaining]of [[1020,'17:00',0,660],[1439,'23:59',419,241],[1440,'00:00',420,240],[1560,'02:00',540,120],[1680,'04:00',660,0],[1740,'05:00',660,0]]){
  const info=serviceInfo({time});assert.equal(formatServiceTime(time),label);assert.equal(info.elapsed,elapsed);assert.equal(info.remaining,remaining);assert.equal(info.progress,elapsed/660);
 }
 assert.equal(serviceInfo({time:800}).elapsed,0);assert.equal(serviceInfo({time:Infinity}).remaining,660);
});
