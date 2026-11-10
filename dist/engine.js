(function(root){
'use strict';
const ingredients={beer:{name:'Bière pression',unit:'cl',pack:500,cost:16},wine:{name:'Vin rouge',unit:'cl',pack:75,cost:7},coffee:{name:'Café',unit:'dose',pack:20,cost:5},rum:{name:'Rhum',unit:'cl',pack:70,cost:18},lime:{name:'Citron vert',unit:'portion',pack:12,cost:4},mint:{name:'Menthe',unit:'portion',pack:12,cost:3},sugar:{name:'Sirop de sucre',unit:'cl',pack:100,cost:4},soda:{name:'Eau pétillante',unit:'cl',pack:100,cost:2},ice:{name:'Glaçons',unit:'portion',pack:20,cost:3},whisky:{name:'Whisky',unit:'cl',pack:70,cost:22,license:'spirits'},gin:{name:'Gin',unit:'cl',pack:70,cost:20,license:'spirits'},tonic:{name:'Tonic',unit:'cl',pack:100,cost:3,license:'spirits'},cola:{name:'Cola',unit:'cl',pack:100,cost:3,license:'signature'}};
const ingredientKeys=Object.keys(ingredients);
const coreIngredientKeys=Object.freeze(['beer','wine','coffee','rum','lime','mint','sugar','soda','ice']);
const isValidStock=stock=>!!stock&&typeof stock==='object'&&!Array.isArray(stock)&&coreIngredientKeys.every(key=>Number.isFinite(stock[key])&&stock[key]>=0)&&ingredientKeys.every(key=>!Object.hasOwn(stock,key)||Number.isFinite(stock[key])&&stock[key]>=0);
const serviceCapacities=Object.freeze(Object.fromEntries(ingredientKeys.map(key=>[key,ingredients[key].pack*2])));
const normalizeReserve=value=>Object.fromEntries(ingredientKeys.map(key=>[key,Number.isFinite(value?.[key])&&value[key]>=0?value[key]:0]));
const managementUpgrades=Object.freeze({
 tray:{name:'Plateau de service',category:'building',requiredSales:5,cost:100,requires:[],description:'Passez de 2 à 4 boissons sur le plateau.'},
 cocktails:{name:'Licence cocktails',category:'licenses',requiredSales:8,cost:120,requires:[],description:'Ajoutez le mojito à votre carte et aux commandes des clients.'},
 softDrinks:{name:'Licence sans alcool',category:'licenses',requiredSales:12,cost:90,requires:[],description:'Servez le virgin mojito et la limonade maison avec les ingrédients du bar.'},
 spirits:{name:'Licence spiritueux',category:'licenses',requiredSales:20,cost:210,requires:[],description:'Ajoutez le whisky et le gin tonic à la carte. Commandez leurs ingrédients en réserve.'},
 signature:{name:'Licence créations maison',category:'licenses',requiredSales:36,cost:360,requires:['cocktails','spirits'],description:'Proposez le gin fizz et le cuba libre après les licences cocktails et spiritueux.'},
 counter:{name:'Comptoir équipé',category:'building',requiredSales:12,cost:180,requires:[],description:'Augmentez de 50 % la capacité de chaque ingrédient au comptoir.'},
 assistant:{name:'Aide de réserve',category:'team',requiredSales:18,cost:220,salary:10,requires:[],description:'Réapprovisionne le comptoir depuis la réserve toutes les 12 secondes de service. Salaire : 10 € par soir.'},
 bartender:{name:'Préparateur de boissons',category:'team',requiredSales:24,cost:300,salary:18,requires:[],description:'Prépare les commandes prises, avec les ingrédients du comptoir, puis les pose sur le plateau. Salaire : 18 € par soir.'},
 waiter:{name:'Serveur',category:'team',requiredSales:32,cost:380,salary:22,requires:[],description:'Prend les commandes, apporte les boissons et encaisse les espèces ou les cartes avec le terminal partagé. Salaire : 22 € par soir.'}
});
function normalizeManagement(saved){
 const value=saved.management;
 return {cocktails:!Object.hasOwn(saved,'management')||value?.cocktails===true,softDrinks:value?.softDrinks===true,spirits:value?.spirits===true,signature:value?.signature===true,counter:value?.counter===true,assistant:value?.assistant===true,bartender:value?.bartender===true,waiter:value?.waiter===true,restockTimer:Number.isFinite(value?.restockTimer)&&value.restockTimer>=0?Math.min(value.restockTimer,12):0};
}
const recipes={
 beer:{name:'Bière pression',price:5,glass:'Pinte',station:'Tireuse',license:null,pourStep:1,vessel:'pint',garnish:null,ingredients:{beer:50},target:50,unit:'cl',speed:14,color:'#d8a348',steps:['Choisir une pinte','Tirer 50 cl de bière']},
 wine:{name:'Verre de rouge',price:6,glass:'Verre à vin',station:'Bouteilles',license:null,pourStep:1,vessel:'wine',garnish:null,ingredients:{wine:15},target:15,unit:'cl',speed:5,color:'#8e3c48',steps:['Choisir un verre à vin','Verser 15 cl de vin']},
 coffee:{name:'Espresso',price:3,glass:'Tasse',station:'Machine à café',license:null,pourStep:1,vessel:'cup',garnish:null,ingredients:{coffee:1},target:25,unit:'ml',speed:8,color:'#71462b',steps:['Choisir une tasse','Extraire 25 ml de café']},
 mojito:{name:'Mojito maison',price:10,glass:'Verre haut',station:'Cocktails',license:'cocktails',pourStep:4,finishStep:5,vessel:'highball',garnish:'mint-lime',ingredients:{rum:4,lime:1,mint:1,sugar:2,soda:10,ice:1},target:4,unit:'cl de rhum',speed:1.5,color:'#b8d28a',steps:['Choisir un verre haut','Ajouter citron et menthe','Piler avec le sirop','Ajouter les glaçons','Doser 4 cl de rhum','Compléter et mélanger']},
 virginMojito:{name:'Virgin mojito',price:7,glass:'Verre haut',station:'Sans alcool',license:'softDrinks',pourStep:4,finishStep:5,vessel:'highball',garnish:'mint-lime',ingredients:{lime:1,mint:1,sugar:2,soda:10,ice:1},target:10,unit:'cl d’eau pétillante',speed:4,color:'#c3d99a',steps:['Choisir un verre haut','Ajouter citron et menthe','Piler avec le sirop','Ajouter les glaçons','Verser 10 cl d’eau pétillante','Mélanger doucement']},
 lemonade:{name:'Limonade maison',price:5,glass:'Verre haut',station:'Sans alcool',license:'softDrinks',pourStep:2,finishStep:3,vessel:'highball',garnish:'lime',ingredients:{lime:2,sugar:2,soda:16,ice:1},target:16,unit:'cl d’eau pétillante',speed:6,color:'#e3d890',steps:['Choisir un verre haut','Ajouter citron, sirop et glaçons','Verser 16 cl d’eau pétillante','Mélanger la limonade']},
 whisky:{name:'Whisky sur glace',price:8,glass:'Verre bas',station:'Spiritueux',license:'spirits',pourStep:1,vessel:'rocks',garnish:null,ingredients:{whisky:4,ice:1},target:4,unit:'cl de whisky',speed:1.5,color:'#b8792e',steps:['Choisir un verre bas avec des glaçons','Doser 4 cl de whisky']},
 ginTonic:{name:'Gin tonic',price:10,glass:'Verre haut',station:'Spiritueux',license:'spirits',pourStep:2,finishStep:3,vessel:'highball',garnish:'lime',ingredients:{gin:4,tonic:12,lime:1,ice:1},target:4,unit:'cl de gin',speed:1.5,color:'#d7e3cb',steps:['Choisir un verre haut','Ajouter les glaçons et le citron','Doser 4 cl de gin','Compléter au tonic et mélanger']},
 ginFizz:{name:'Gin fizz',price:12,glass:'Coupe',station:'Créations maison',license:'signature',pourStep:2,finishStep:3,vessel:'coupe',garnish:'lime',ingredients:{gin:4,lime:1,sugar:2,soda:8,ice:1},target:4,unit:'cl de gin',speed:1.5,color:'#e8e6c7',steps:['Choisir une coupe','Ajouter citron, sirop et glaçons au shaker','Doser 4 cl de gin','Secouer, filtrer et compléter à l’eau pétillante']},
 cubaLibre:{name:'Cuba libre',price:11,glass:'Verre haut',station:'Créations maison',license:'signature',pourStep:2,finishStep:3,vessel:'highball',garnish:'lime',ingredients:{rum:4,cola:12,lime:1,ice:1},target:4,unit:'cl de rhum',speed:1.5,color:'#6b3c27',steps:['Choisir un verre haut','Ajouter les glaçons et le citron','Doser 4 cl de rhum','Compléter au cola et mélanger']}
};
const names=['Lucie','Marc','Nadia','Julien','Sophie','Thomas','Amélie','Émile'];
const tables=Object.freeze([{id:1,x:1.65,z:6.4},{id:2,x:1.65,z:8.6},{id:3,x:10.22,z:6.5},{id:4,x:10.22,z:8.65}].map(Object.freeze));
// Preserve the first three slot IDs and positions for existing saves.
const counterSeats=Object.freeze([4.6,6,7.4,3.2,8.8,10.2].map((x,slot)=>Object.freeze({slot,x,z:4.3})));
const MAX_CUSTOMERS=tables.length+counterSeats.length;
const crowdStages=Object.freeze([
 {threshold:0,counterSeatsUnlocked:3,spawnInterval:16},
 {threshold:20,counterSeatsUnlocked:4,spawnInterval:15},
 {threshold:45,counterSeatsUnlocked:5,spawnInterval:14},
 {threshold:80,counterSeatsUnlocked:6,spawnInterval:12}
].map(stage=>Object.freeze({...stage,capacity:tables.length+stage.counterSeatsUnlocked})));
const registerPosition=Object.freeze({x:2.65,z:2.0});
const phases=new Set(['awaiting-order','preparing','drinking','payment','cash-collected','change-ready','card-processing']);
const money=value=>Math.round((value+Number.EPSILON)*100)/100;
const bounded=(value,min,max,fallback)=>Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
const positionNear=(a,b,radius)=>!!a&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Math.hypot(a.x-b.x,a.z-b.z)<=radius;
const preparationLayout=Object.freeze({
 reach:1.15,stationReach:1.2,
 stations:Object.freeze({beer:Object.freeze({x:4.15,y:1.133,z:2.72}),coffee:Object.freeze({x:8.43,y:1.152,z:2.47}),cocktails:Object.freeze({x:6.5,y:1.133,z:3.05})}),
 vessels:Object.freeze({x:7,y:1.15,z:.85}),
 ingredients:Object.freeze(Object.fromEntries(Object.entries({
  wine:{x:2.9,y:1.02,z:.85},rum:{x:3.35,y:1.02,z:.85},whisky:{x:3.8,y:1.02,z:.85},gin:{x:4.25,y:1.02,z:.85},sugar:{x:4.7,y:1.02,z:.85},soda:{x:5.15,y:1.02,z:.85},tonic:{x:5.6,y:1.02,z:.85},cola:{x:6.05,y:1.02,z:.85},lime:{x:6.05,y:1.12,z:2.6},mint:{x:7.1,y:1.12,z:2.6},ice:{x:7.55,y:1.12,z:2.6},coffee:{x:9.65,y:1.02,z:.85},beer:{x:4.15,y:1.67,z:2.72,fixed:true}
 }).map(([key,point])=>[key,Object.freeze(point)])))
});
const waiterPaymentTasks=new Set(['collect-cash','prepare-change','return-change','pickup-terminal','take-card','wait-card','return-terminal']);
const freshPayments=()=>({till:80,terminalCarried:false,terminalWithWaiter:false,terminalOrderId:null,cashRevenue:0,cardRevenue:0,receipts:[]});
const fresh=()=>({version:2,cash:260,day:1,time:1020,open:false,closing:false,stock:{beer:1000,wine:150,coffee:25,rum:70,lime:12,mint:12,sugar:100,soda:200,ice:20,whisky:0,gin:0,tonic:0,cola:0},reserve:Object.fromEntries(ingredientKeys.map(key=>[key,coreIngredientKeys.includes(key)?ingredients[key].pack:0])),management:{cocktails:false,softDrinks:false,spirits:false,signature:false,counter:false,assistant:false,bartender:false,waiter:false,restockTimer:0},payments:freshPayments(),staff:{bartender:null,waiter:null,waiterPosition:{x:1.05,z:4.5}},orders:[],deliveries:[],prep:null,tray:[],sold:0,lost:0,revenue:0,expenses:0,waste:0,totalSold:0,capacity:2,upgraded:false,spawn:1,nextId:1,lastReport:null,gameOver:false});
class Game{
 constructor(saved){this.s=fresh();if(saved&&saved.version===2){const s=saved;const nums=['cash','day','time','sold','lost','revenue','expenses','waste','totalSold','capacity','spawn','nextId'];if(nums.every(k=>Number.isFinite(s[k]))&&isValidStock(s.stock)&&Array.isArray(s.orders)&&s.orders.every(o=>o&&Object.hasOwn(recipes,o.recipe)&&Number.isFinite(o.patience))&&Array.isArray(s.tray)&&s.tray.every(t=>t&&Object.hasOwn(recipes,t.recipe))&&Array.isArray(s.deliveries)&&s.deliveries.every(d=>d&&Object.hasOwn(ingredients,d.key)&&Number.isFinite(d.remaining))&&(!s.prep||(Object.hasOwn(recipes,s.prep.recipe)&&Number.isFinite(s.prep.amount)))){this.s=JSON.parse(JSON.stringify(s));
  // Legacy saves already own their service stock. Migrating must not grant a
  // second starter supply, clamp existing quantities or mutate the saved object.
  this.s.stock=normalizeReserve(s.stock);this.s.reserve=normalizeReserve(s.reserve);this.s.management=normalizeManagement(s);if(this.s.prep)this.s.prep.pouring=false;
  this.normalizeService(s);this.normalizePreparation(s.prep);
 }}}
 normalizePreparation(saved){
  if(!saved){this.s.prep=null;return}
  const recipe=recipes[saved.recipe],physical=saved.physical===true;
  const added=Object.fromEntries(Object.keys(recipe.ingredients).filter(key=>!physical||saved.added?.[key]===true).map(key=>[key,true]));
  const vesselPlaced=physical?saved.vesselPlaced===true:saved.step>0||saved.ready===true;
  let held=null;
  if(physical&&saved.held?.kind==='vessel'&&!vesselPlaced)held={kind:'vessel'};
  const key=saved.held?.key;
  if(physical&&vesselPlaced&&saved.held?.kind==='ingredient'&&key!=='beer'&&Object.hasOwn(recipe.ingredients,key)&&!added[key]&&saved.held.amount===recipe.ingredients[key])held={kind:'ingredient',key,amount:recipe.ingredients[key]};
  this.s.prep={recipe:saved.recipe,physical:true,vesselPlaced,held,added,step:0,amount:bounded(saved.amount,0,recipe.target*1.6,0),pouring:false,ready:false,quality:bounded(saved.quality,0,100,0)};
  const p=this.s.prep,complete=vesselPlaced&&Object.keys(recipe.ingredients).filter(key=>key!=='beer').every(key=>added[key]);
  if(complete){p.step=recipe.pourStep;if(Number.isInteger(recipe.finishStep)&&saved.step===recipe.finishStep)p.step=recipe.finishStep;p.ready=saved.ready===true&&Object.keys(recipe.ingredients).every(key=>added[key]);}
 }
 normalizeService(saved){
  const s=this.s,occupiedTables=new Set(),occupiedSlots=new Set();
  s.orders=s.orders.slice(0,MAX_CUSTOMERS).map((order,index)=>{
   const table=tables.find(table=>table.id===order.tableId&&!occupiedTables.has(table.id));
   if(table)occupiedTables.add(table.id);
   // Existing customers keep their seats even when a restored save has not
   // reached the corresponding attendance threshold yet.
   let slot=null;if(!table){slot=counterSeats.some(seat=>seat.slot===order.slot)&&!occupiedSlots.has(order.slot)?order.slot:counterSeats.find(seat=>!occupiedSlots.has(seat.slot))?.slot;if(slot===undefined)return null;occupiedSlots.add(slot)}
   const phase=phases.has(order.phase)?order.phase:'preparing',recipe=recipes[order.recipe];
   const due=money(bounded(order.due,recipe.price,recipe.price+1,recipe.price));
   return {...order,id:Number.isSafeInteger(order.id)&&order.id>0?order.id:s.nextId+index,name:String(order.name||'Client').replace(/[<>]/g,'').slice(0,80),tableId:table?.id??null,slot,phase,patience:bounded(order.patience,0,100,100),arrivalRemaining:bounded(order.arrivalRemaining,0,3,0),drinkRemaining:bounded(order.drinkRemaining,0,10,phase==='drinking'?8:0),paymentMethod:order.paymentMethod==='cash'?'cash':'card',due,tender:money(bounded(order.tender,due,100,Math.ceil(due/5)*5)),cardRemaining:bounded(order.cardRemaining,0,3,phase==='card-processing'?3:0),tip:money(bounded(order.tip,0,1,Math.max(0,due-recipe.price)))};
  }).filter(Boolean);
  s.nextId=Math.max(s.nextId,...s.orders.map(order=>order.id+1));
  const p=saved.payments,uncredited=s.orders.filter(order=>order.phase==='change-ready').reduce((sum,order)=>sum+order.due,0);
  s.payments={till:money(bounded(p?.till,0,Math.max(0,s.cash)+uncredited,Math.min(80,Math.max(0,s.cash)))),terminalCarried:p?.terminalCarried===true,terminalOrderId:null,cashRevenue:money(bounded(p?.cashRevenue,0,1e9,0)),cardRevenue:money(bounded(p?.cardRevenue,0,1e9,0)),receipts:Array.isArray(p?.receipts)?p.receipts.filter(r=>r&&Number.isSafeInteger(r.id)&&Number.isFinite(r.amount)&&r.amount>=0&&['cash','card'].includes(r.method)).slice(0,40):[]};
  s.payments.terminalWithWaiter=!!(s.management.waiter&&p?.terminalWithWaiter===true&&!s.payments.terminalCarried);
  for(const order of s.orders){
   if(order.paymentBy!=='waiter'||!s.management.waiter||!['payment','cash-collected','change-ready','card-processing'].includes(order.phase))delete order.paymentBy;
   if(order.paymentMethod==='card'&&s.payments.terminalCarried)delete order.paymentBy;
  }
  const activeCard=s.orders.find(order=>order.phase==='card-processing'&&order.id===p?.terminalOrderId&&(s.payments.terminalCarried||s.payments.terminalWithWaiter&&order.paymentBy==='waiter'));
  for(const order of s.orders)if(order.phase==='card-processing'&&order!==activeCard){order.phase='payment';order.cardRemaining=0}
  if(activeCard)s.payments.terminalOrderId=activeCard.id;
  const point=saved.staff?.waiterPosition;
  s.staff={bartender:null,waiter:null,waiterPosition:point&&Number.isFinite(point.x)&&Number.isFinite(point.z)&&point.x>=.3&&point.x<=11.7&&point.z>=1.15&&point.z<=9.6?{x:point.x,z:point.z}:{x:1.05,z:4.5}};
  for(const role of ['bartender','waiter']){
   const job=saved.staff?.[role],order=s.orders.find(order=>order.id===job?.orderId);
   if(!s.management[role]||!job||(!order&&!(role==='waiter'&&job.task==='return-terminal'))||!Number.isFinite(job.remaining)||!Number.isFinite(job.total)||job.total<=0||job.total>60)continue;
   if(role==='bartender'&&(job.recipe!==order.recipe||order.phase!=='preparing'))continue;
   if(role==='waiter'&&!['take-order','serve',...waiterPaymentTasks].includes(job.task))continue;
   if(role==='waiter'&&job.task==='serve'&&(!job.drink||job.drink.recipe!==order.recipe||!Number.isFinite(job.drink.quality)))continue;
   if(role==='waiter'&&!this.validWaiterJob(job,order))continue;
   s.staff[role]={...job,remaining:bounded(job.remaining,0,job.total,job.total)};
   if(role==='waiter'){
    const validRoute=Array.isArray(job.route)&&job.route.length>=2&&job.route.length<=16&&job.route.every(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z)&&p.x>=.3&&p.x<=11.7&&p.z>=1.15&&p.z<=9.6)&&Number.isFinite(job.travel)&&job.travel>=0&&job.travel<=job.total;
    if(!validRoute){const position=s.staff.waiterPosition;s.staff.waiter.route=this.waiterRoute(position,this.waiterDestination(job.task,order));s.staff.waiter.travel=Math.min(job.total,this.waiterRouteLength(s.staff.waiter.route)/1.8);}
   }
  }
  if(s.payments.terminalWithWaiter&&!s.staff.waiter){
   this.assignWaiterJob(activeCard?'wait-card':'return-terminal',activeCard||null,activeCard?activeCard.cardRemaining:undefined);
  }
 }
 paymentHandledByWaiter(id){return this.s.management.waiter&&this.s.orders.some(order=>order.id===id&&order.paymentBy==='waiter')}
 waiterPaymentStatus(id){
  const s=this.s,job=s.staff.waiter;
  if(job&&waiterPaymentTasks.has(job.task)&&(id===undefined||job.orderId===id))return {orderId:job.orderId,task:job.task,blocked:null};
  const order=s.orders.find(order=>(id===undefined||order.id===id)&&order.paymentBy==='waiter');
  if(order)return {orderId:order.id,task:order.phase==='change-ready'?'return-change':'prepare-change',blocked:this.canFundChange(order)?null:'change'};
  const waiting=s.management.waiter&&s.orders.find(order=>(id===undefined||order.id===id)&&order.phase==='payment'&&(order.paymentMethod==='card'?s.payments.terminalCarried:!this.canFundChange(order)));
  return waiting?{orderId:waiting.id,task:waiting.paymentMethod==='card'?'pickup-terminal':'collect-cash',blocked:waiting.paymentMethod==='card'?'terminal':'change'}:null;
 }
 waiterDestination(task,order){
  if(['pickup-terminal','prepare-change','return-terminal'].includes(task))return {x:3,z:1.9};
  const table=tables.find(table=>table.id===order?.tableId),seat=this.counterSeat(order);
  return table?{x:table.x+(table.x<6?1.35:-1.35),z:table.z}:order?{x:seat.x,z:seat.z+.5}:{x:1.05,z:4.5};
 }
 waiterRouteLength(route){return route.slice(1).reduce((length,p,index)=>length+Math.hypot(p.x-route[index].x,p.z-route[index].z),0)}
 waiterRoute(from,to){
  if(Math.hypot(from.x-to.x,from.z-to.z)<.001)return [{...from},{...to}];
  const route=[{...from}],add=point=>{if(Math.hypot(point.x-route.at(-1).x,point.z-route.at(-1).z)>.001)route.push({...point})};
  if(from.z<3.5||to.z<3.5){
   if(from.z<3.5){add({x:from.x,z:1.9});if(to.z<3.5){add({x:to.x,z:1.9});add(to);if(route.length===1)route.push({...to});return route}add({x:.95,z:1.9});add({x:.95,z:4.9});}
   if(to.z<3.5){if(from.z>=3.5){const aisle=from.x<6?3.1:8.8;if(from.z<=5.15)add({x:from.x,z:4.9});add({x:aisle,z:route.at(-1).z});add({x:aisle,z:4.9});add({x:.95,z:4.9});}add({x:.95,z:1.9});add({x:to.x,z:1.9});add(to);if(route.length===1)route.push({...to});return route;}
  }
  const source=route.at(-1),a=source.x<6?3.1:8.8,b=to.x<6?3.1:8.8;
  // Step out from behind the stools before moving sideways past their backs.
  if(source.z<=5.15)add({x:source.x,z:4.9});
  add({x:a,z:route.at(-1).z});add({x:a,z:4.9});add({x:b,z:4.9});add({x:b,z:to.z});add(to);if(route.length===1)route.push({...to});return route;
 }
 assignWaiterJob(task,order,duration){
  const s=this.s,position=s.staff.waiterPosition||{x:1.05,z:4.5},target=this.waiterDestination(task,order),route=task==='wait-card'?[{...position},{...position}]:this.waiterRoute(position,target),travel=this.waiterRouteLength(route)/1.8;
  const total=duration===undefined?Math.max(['serve','take-order'].includes(task)?6:2,travel+2):Math.max(.001,duration);
  s.staff.waiter={orderId:order?.id??s.staff.waiter?.orderId??null,task,remaining:total,total,recipe:order?.recipe,route,travel:Math.min(travel,total)};
  return s.staff.waiter;
 }
 updateWaiterPosition(job){
  if(!job.route)return;let distance=this.waiterRouteLength(job.route)*Math.min(1,(job.total-job.remaining)/Math.max(.0001,job.travel));
  for(let i=1;i<job.route.length;i++){const a=job.route[i-1],b=job.route[i],length=Math.hypot(b.x-a.x,b.z-a.z);if(distance<=length||i===job.route.length-1){const t=length?Math.min(1,distance/length):1;this.s.staff.waiterPosition={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};break}distance-=length;}
 }
 validWaiterJob(job,order){
  if(job.task==='return-terminal')return this.s.payments.terminalWithWaiter;
  if(!order)return false;
  const expected={'take-order':'awaiting-order',serve:'preparing','collect-cash':'payment','prepare-change':'cash-collected','return-change':'change-ready','pickup-terminal':'payment','take-card':'payment','wait-card':'card-processing'}[job.task];
  if(order.phase!==expected)return false;
  if(!waiterPaymentTasks.has(job.task))return true;
  if(order.paymentBy!=='waiter')return false;
  if(['collect-cash','prepare-change','return-change'].includes(job.task))return order.paymentMethod==='cash';
  return order.paymentMethod==='card'&&!this.s.payments.terminalCarried&&(job.task==='pickup-terminal'||this.s.payments.terminalWithWaiter);
 }
 canFundChange(order){return money(order.tender-order.due)<=money(this.s.payments.till+this.availableBank())}
 paymentGuard(id,actor){
  if(actor==='waiter')return this.paymentHandledByWaiter(id)?null:'Cet encaissement n’est pas réservé au serveur.';
  return this.paymentHandledByWaiter(id)?'Le serveur s’occupe déjà de cet encaissement.':null;
 }
 orderPhase(order){return phases.has(order?.phase)?order.phase:'preparing'}
 counterSeat(order){return counterSeats.find(seat=>seat.slot===order?.slot)||counterSeats[Math.max(0,this.s.orders.indexOf(order))%crowdStages[0].counterSeatsUnlocked]}
 orderPosition(order){return tables.find(table=>table.id===order?.tableId)||{x:this.counterSeat(order).x,z:2.1}}
 canReachOrder(id,position){const order=this.s.orders.find(order=>order.id===id);return !!order&&(order.arrivalRemaining||0)<=0&&positionNear(position,this.orderPosition(order),order.tableId?1.6:1.65)}
 nearRegister(position){return positionNear(position,registerPosition,1.25)}
 availableBank(){const uncredited=this.s.orders.filter(o=>o.phase==='change-ready').reduce((sum,o)=>sum+(o.due||0),0);return money(Math.max(0,this.s.cash-this.s.payments.till+uncredited))}
 spend(amount){this.s.cash=money(this.s.cash-amount);const uncredited=this.s.orders.filter(o=>o.phase==='change-ready').reduce((sum,o)=>sum+(o.due||0),0);this.s.payments.till=Math.min(this.s.payments.till,money(Math.max(0,this.s.cash)+uncredited))}
 fundTill(amount,position){if(!this.nearRegister(position))return 'Rejoignez la caisse au comptoir.';if(!Number.isFinite(amount)||amount<=0||money(amount)!==amount)return 'Choisissez un montant positif en euros.';if(amount>this.availableBank())return 'Le solde disponible hors caisse est insuffisant.';this.s.payments.till=money(this.s.payments.till+amount);return `${amount.toFixed(2)} € ajoutés au fond de caisse depuis votre trésorerie.`}
 canPrepare(id){return Object.hasOwn(recipes,id)&&(!recipes[id].license||this.s.management[recipes[id].license]===true)}
 canBuy(key){return Object.hasOwn(ingredients,key)&&(!ingredients[key].license||this.s.management[ingredients[key].license]===true)}
 canMake(id){return this.canPrepare(id)&&Object.entries(recipes[id].ingredients).every(([k,n])=>this.s.stock[k]>=n)}
 serviceCapacity(key){return Object.hasOwn(serviceCapacities,key)?serviceCapacities[key]*(this.s.management.counter?1.5:1):0}
 crowdInfo(){
  const totalSold=Math.max(0,this.s.totalSold),index=crowdStages.findLastIndex(stage=>totalSold>=stage.threshold),stage=crowdStages[index];
  return {totalSold,currentThreshold:stage.threshold,nextThreshold:crowdStages[index+1]?.threshold??null,counterSeatsUnlocked:stage.counterSeatsUnlocked,capacity:stage.capacity,spawnInterval:Math.min(stage.spawnInterval,this.s.upgraded?12:16),maxCapacity:MAX_CUSTOMERS};
 }
 upgradeInfo(id){const item=managementUpgrades[id];if(!Object.hasOwn(managementUpgrades,id))return null;const owned=id==='tray'?this.s.upgraded:this.s.management[id],unmetPrerequisites=item.requires.filter(required=>!this.s.management[required]);return {id,...item,unmetPrerequisites,owned:!!owned,unlocked:!!owned||this.s.totalSold>=item.requiredSales&&unmetPrerequisites.length===0,affordable:this.s.cash>=item.cost&&!this.s.gameOver}}
 purchaseUpgrade(id){
  const info=this.upgradeInfo(id),s=this.s;if(!info)return 'Amélioration inconnue.';if(s.gameOver)return 'La partie est terminée.';if(info.owned)return 'Déjà installé.';
  if(info.unmetPrerequisites.length)return `Achetez d’abord : ${info.unmetPrerequisites.map(required=>managementUpgrades[required].name).join(', ')}.`;
  if(!info.unlocked)return `Servez ${info.requiredSales} clients pour débloquer cette amélioration.`;
  if(!info.affordable)return 'Trésorerie insuffisante.';
  this.spend(info.cost);s.expenses+=info.cost;
  if(id==='tray'){s.upgraded=true;s.capacity=4}else{s.management[id]=true;if(id==='assistant')s.management.restockTimer=0}
  return id==='tray'?'Plateau agrandi : 4 boissons au lieu de 2.':`${info.name} : achat effectué.`;
 }
 open(){let s=this.s;if(s.gameOver)return 'La partie est terminée. Lancez un nouveau bar.';if(s.open)return 'Le bar est déjà ouvert.';s.open=true;s.closing=false;s.spawn=1;return 'Le bar est ouvert. Premier client en approche.'}
 buy(key){let s=this.s;if(!Object.hasOwn(ingredients,key))return 'Produit inconnu.';const i=ingredients[key];if(s.gameOver)return 'La partie est terminée.';if(!this.canBuy(key))return `Achetez la ${managementUpgrades[i.license].name.toLocaleLowerCase('fr-BE')} dans la tablette pour commander ce produit.`;if(s.cash<i.cost)return 'Trésorerie insuffisante.';this.spend(i.cost);s.expenses+=i.cost;s.deliveries.push({key,remaining:10});return 'Commande passée : livraison en réserve dans 10 secondes de jeu.'}
 restock(key,amount){
  const s=this.s;if(!Object.hasOwn(ingredients,key))return 'Produit inconnu.';if(s.gameOver)return 'La partie est terminée.';
  if(amount!==undefined&&(!Number.isFinite(amount)||amount<=0))return 'Choisissez une quantité positive.';
  const available=s.reserve[key],space=Math.max(0,this.serviceCapacity(key)-s.stock[key]);
  if(space===0)return 'Le stock de service est déjà plein.';if(available<=0)return 'La réserve ne contient plus ce produit.';
  const quantity=Math.min(amount===undefined?space:amount,space,available);
  s.reserve[key]-=quantity;s.stock[key]+=quantity;
  return `${ingredients[key].name} : ${quantity.toLocaleString('fr-BE',{maximumFractionDigits:2})} ${ingredients[key].unit} transférés au comptoir.`;
 }
 canWork(position){return !!position&&Number.isFinite(position.x)&&Number.isFinite(position.z)&&position.x>=2.25&&position.x<=10.35&&position.z>=1.15&&position.z<=2.30}
 preparationStation(id=this.s.prep?.recipe){return preparationLayout.stations[id==='beer'?'beer':id==='coffee'?'coffee':'cocktails']}
 nearPrepStation(position,id=this.s.prep?.recipe){return this.canWork(position)&&positionNear(position,this.preparationStation(id),preparationLayout.stationReach)}
 nearPreparationSource(key,position){const point=key==='vessels'?preparationLayout.vessels:preparationLayout.ingredients[key];return !!point&&this.canWork(position)&&positionNear(position,point,preparationLayout.reach)}
 preparationStatus(position){
  const p=this.s.prep;if(!p)return null;
  const remaining=Object.keys(recipes[p.recipe].ingredients).filter(key=>key!=='beer'&&!p.added?.[key]);
  const stage=p.ready?'ready':p.held?.kind==='vessel'?'place-vessel':!p.vesselPlaced?'vessel':p.held?'place-ingredient':remaining.length?'ingredient':p.step===recipes[p.recipe].finishStep?'mix':'pour';
  return {stage,remaining,held:p.held,station:this.preparationStation(),canWork:this.canWork(position),nearStation:this.nearPrepStation(position)};
 }
 start(id,position){let s=this.s;if(!Object.hasOwn(recipes,id))return 'Boisson inconnue.';if(!this.canWork(position))return 'Rejoignez l’espace de travail derrière le comptoir pour préparer une boisson.';if(!s.open)return 'Ouvrez le bar avant de préparer.';if(s.prep)return 'Terminez ou jetez la préparation en cours.';if(s.tray.length+(s.staff.bartender?1:0)>=s.capacity)return 'Le plateau est plein ou réservé par le préparateur : servez une boisson.';if(!this.canPrepare(id))return `Achetez la ${managementUpgrades[recipes[id].license].name.toLocaleLowerCase('fr-BE')} dans la tablette pour préparer cette boisson.`;if(!this.canMake(id))return 'Il manque des ingrédients. Réapprovisionnez le comptoir depuis la réserve.';s.prep={recipe:id,physical:true,vesselPlaced:false,held:null,added:{},step:0,amount:0,pouring:false,ready:false,quality:0};return 'Prenez '+recipes[id].glass.toLocaleLowerCase('fr-BE')+' au rangement derrière le bar.'}
 takeVessel(position){
  const p=this.s.prep;if(!p)return 'Choisissez une recette sur la tablette.';
  if(!this.nearPreparationSource('vessels',position))return 'Approchez-vous du rangement des verres derrière le bar.';
  if(p.held)return 'Posez d’abord ce que vous tenez au poste de préparation.';
  if(p.vesselPlaced)return 'Le récipient est déjà sur le poste.';
  p.held={kind:'vessel'};return recipes[p.recipe].glass+' pris. Posez-le au poste de préparation.';
 }
 takeIngredient(key,position){
  const p=this.s.prep;if(!p)return 'Choisissez une recette sur la tablette.';
  if(!Object.hasOwn(recipes[p.recipe].ingredients,key)||key==='beer')return key==='beer'?'La bière se tire directement au robinet.':'Cet ingrédient ne fait pas partie de la recette.';
  if(!this.nearPreparationSource(key,position))return 'Approchez-vous de cet ingrédient derrière le bar.';
  if(!p.vesselPlaced)return 'Prenez et posez d’abord le récipient au poste.';
  if(p.held)return 'Apportez d’abord l’ingrédient que vous tenez au poste.';
  if(p.added[key])return 'Cet ingrédient a déjà été apporté.';
  const amount=recipes[p.recipe].ingredients[key];if(this.s.stock[key]<amount)return 'Stock insuffisant : réapprovisionnez '+ingredients[key].name.toLocaleLowerCase('fr-BE')+'.';
  this.s.stock[key]-=amount;p.held={kind:'ingredient',key,amount};return ingredients[key].name+' pris. Apportez-le au poste de préparation.';
 }
 placeHeld(position){
  const p=this.s.prep;if(!p?.held)return 'Vous ne tenez aucun récipient ou ingrédient.';
  if(!this.nearPrepStation(position))return 'Rejoignez le poste de préparation derrière le bar.';
  const held=p.held;if(held.kind==='vessel')p.vesselPlaced=true;else p.added[held.key]=true;
  p.held=null;const remaining=Object.keys(recipes[p.recipe].ingredients).filter(key=>key!=='beer'&&!p.added[key]);
  if(p.vesselPlaced&&!remaining.length)p.step=recipes[p.recipe].pourStep;
  return remaining.length?'Prenez les ingrédients au comptoir et apportez-les à ce poste.':'Le poste est prêt : maintenez la touche de dosage pour verser.';
 }
 step(){return 'Prenez le récipient et les ingrédients dans le bar, puis apportez-les au poste.'}
 isPour(){const p=this.s.prep;return !!p&&!p.ready&&p.vesselPlaced&&!p.held&&p.step===recipes[p.recipe].pourStep&&Object.keys(recipes[p.recipe].ingredients).filter(key=>key!=='beer').every(key=>p.added?.[key])}
 setPour(v,position){
  const p=this.s.prep;if(!p)return;if(!v){p.pouring=false;return}
  if(!this.nearPrepStation(position)){p.pouring=false;return 'Rejoignez le poste pour doser la boisson.'}
  if(!this.isPour()){p.pouring=false;return 'Apportez d’abord le récipient et tous les ingrédients au poste.'}
  if(p.recipe==='beer'&&!p.added.beer){const amount=recipes.beer.ingredients.beer;if(this.s.stock.beer<amount){p.pouring=false;return 'Le fût est vide : réapprovisionnez la bière.'}this.s.stock.beer-=amount;p.added.beer=true}
  p.pouring=true;
 }
 finishPour(position){const p=this.s.prep;if(!this.nearPrepStation(position))return 'Rejoignez le poste pour terminer le dosage.';if(!this.isPour())return;if(p.recipe==='beer'&&!p.added.beer)return 'Tirez d’abord la bière au robinet.';p.pouring=false;const r=recipes[p.recipe];p.quality=Math.max(0,Math.round(100-Math.abs(p.amount-r.target)/r.target*180));if(Number.isInteger(r.finishStep))p.step=r.finishStep;else p.ready=true}
 finishMix(position){const p=this.s.prep;if(!this.nearPrepStation(position))return 'Rejoignez le poste pour mélanger la boisson.';if(p&&!p.ready&&!p.held&&Number.isInteger(recipes[p.recipe].finishStep)&&p.step===recipes[p.recipe].finishStep)p.ready=true}
 plate(position){const s=this.s,p=s.prep;if(!this.nearPrepStation(position))return 'Rejoignez le poste pour prendre la boisson préparée.';if(!p?.ready)return 'Terminez la préparation.';if(s.tray.length+(s.staff.bartender?1:0)>=s.capacity)return 'Le plateau est plein.';s.tray.push({recipe:p.recipe,quality:p.quality});s.prep=null;return 'Boisson déposée sur le plateau.'}
 discard(index){let s=this.s;if(index===undefined){if(!s.prep)return;s.prep=null;}else{if(!s.tray[index])return;s.tray.splice(index,1)}s.waste++;return 'Boisson jetée. Les ingrédients sont perdus.'}
 takeOrder(id,position){const order=this.s.orders.find(o=>o.id===id);if(!order)return 'Ce client est déjà parti.';if(!this.canReachOrder(id,position))return 'Approchez-vous de la table pour prendre la commande.';if(this.orderPhase(order)!=='awaiting-order')return 'La commande a déjà été prise.';order.phase='preparing';order.patience=100;return `Table ${order.tableId} : ${recipes[order.recipe].name}. Commande envoyée au bar.`}
 trayDrinkIndex(order){return this.s.tray.findIndex(drink=>drink.recipe===order.recipe&&(!drink.orderId||drink.orderId===order.id))}
 serve(id,position){const s=this.s,order=s.orders.find(o=>o.id===id);if(!order)return 'Ce client est déjà parti.';if(!this.canReachOrder(id,position))return 'Approchez-vous du client pour apporter sa boisson.';if(this.orderPhase(order)!=='preparing')return this.orderPhase(order)==='awaiting-order'?'Prenez d’abord sa commande.':'Ce client a déjà été servi.';if(s.staff.waiter?.task==='serve'&&s.staff.waiter.orderId===id)return 'Le serveur apporte déjà cette commande.';const index=this.trayDrinkIndex(order);if(index<0)return 'Préparez '+recipes[order.recipe].name+' et posez-le sur le plateau.';return this.deliverDrink(order,s.tray.splice(index,1)[0])}
 deliverDrink(order,drink){const s=this.s;if(drink.quality<40){this.removeOrder(order);s.lost++;return 'Boisson refusée : dosage trop éloigné de la recette.'}order.tip=drink.quality>=85&&order.patience>25?1:0;order.due=money(recipes[order.recipe].price+order.tip);order.paymentMethod=order.paymentMethod==='cash'?'cash':'card';order.tender=[5,10,20,50,100].find(note=>note>=order.due)||order.due;if(order.paymentMethod==='cash'&&order.tender===order.due&&order.id%2===1)order.tender=Math.min(100,order.tender*2);order.phase='drinking';order.drinkRemaining=order.tableId?8:4;order.patience=Math.max(25,order.patience);return 'Boisson servie. Le client vous demandera ensuite l’addition.'}
 collectCash(id,position,actor='player'){const guard=this.paymentGuard(id,actor);if(guard)return guard;const order=this.s.orders.find(o=>o.id===id);if(!order)return 'Ce client est déjà parti.';if(!this.canReachOrder(id,position))return 'Approchez-vous du client pour prendre les espèces.';if(this.orderPhase(order)!=='payment'||order.paymentMethod!=='cash')return 'Ce client ne vous remet pas d’espèces maintenant.';order.phase='cash-collected';return `${order.tender.toFixed(2)} € reçus. Rejoignez la caisse pour préparer la monnaie.`}
 prepareChange(id,amount,position,actor='player'){const guard=this.paymentGuard(id,actor);if(guard)return guard;const s=this.s,order=s.orders.find(o=>o.id===id);if(!this.nearRegister(position))return 'Rejoignez la caisse au comptoir.';if(!order||this.orderPhase(order)!=='cash-collected')return 'Aucun encaissement en espèces à traiter pour ce client.';const expected=money(order.tender-order.due);if(!Number.isFinite(amount)||amount<0||Math.abs(amount-expected)>.000001)return 'Le montant de monnaie est incorrect. Vérifiez le total et les espèces reçues.';if(s.payments.till+1e-9<expected)return 'Le fond de caisse est insuffisant pour rendre la monnaie. Ajoutez des espèces depuis la trésorerie.';s.payments.till=money(s.payments.till+order.due);order.change=expected;order.phase='change-ready';return expected?`${expected.toFixed(2)} € de monnaie préparés. Rapportez-les au client.`:'Paiement exact. Rapportez le ticket au client.'}
 completeCash(id,position,actor='player'){const guard=this.paymentGuard(id,actor);if(guard)return guard;const order=this.s.orders.find(o=>o.id===id);if(!order||this.orderPhase(order)!=='change-ready')return 'Préparez la monnaie à la caisse avant de revenir.';if(!this.canReachOrder(id,position))return 'Retournez auprès du client pour terminer l’encaissement.';this.finishPayment(order,'cash');return 'Monnaie et ticket remis. Paiement enregistré.'}
 pickupTerminal(position,actor='player'){const p=this.s.payments;if(!this.nearRegister(position))return 'Le terminal sans fil se trouve à côté de la caisse.';if(actor==='waiter'){if(p.terminalCarried||p.terminalWithWaiter)return 'Le terminal est déjà utilisé.';p.terminalWithWaiter=true;return 'Terminal pris par le serveur.'}if(p.terminalWithWaiter||this.s.staff.waiter?.task==='pickup-terminal')return 'Le serveur utilise le terminal. Il le rapportera sur son socle.';if(p.terminalCarried)return 'Vous avez déjà le terminal.';p.terminalCarried=true;return 'Terminal sans fil pris. Apportez-le au client qui paie par carte.'}
 returnTerminal(position,actor='player'){const p=this.s.payments;if(!this.nearRegister(position))return 'Reposez le terminal sur son socle au comptoir.';if(p.terminalOrderId!==null)return 'Attendez la confirmation du paiement en cours.';if(actor==='waiter'){p.terminalWithWaiter=false;return 'Terminal rapporté par le serveur.'}if(p.terminalWithWaiter)return 'Le serveur rapporte le terminal.';if(!p.terminalCarried)return 'Le terminal est déjà sur son socle.';p.terminalCarried=false;return 'Terminal reposé sur son socle.'}
 payCard(id,position,actor='player'){const guard=this.paymentGuard(id,actor);if(guard)return guard;const s=this.s,order=s.orders.find(o=>o.id===id);if(!order||this.orderPhase(order)!=='payment'||order.paymentMethod!=='card')return 'Aucun paiement par carte disponible pour ce client.';if(!(actor==='waiter'?s.payments.terminalWithWaiter:s.payments.terminalCarried))return 'Prenez le terminal sans fil au comptoir.';if(s.payments.terminalOrderId!==null)return 'Le terminal traite déjà un paiement.';if(!this.canReachOrder(id,position))return 'Apportez le terminal auprès du client.';order.phase='card-processing';order.cardRemaining=3;s.payments.terminalOrderId=id;return 'Carte présentée. Autorisation en cours…'}
 finishPayment(order,method){const s=this.s;if(!s.orders.includes(order))return;const amount=money(order.due);s.cash=money(s.cash+amount);s.revenue=money(s.revenue+amount);s.payments[method==='cash'?'cashRevenue':'cardRevenue']=money(s.payments[method==='cash'?'cashRevenue':'cardRevenue']+amount);s.sold++;s.totalSold++;s.payments.receipts.unshift({id:order.id,day:s.day,customerName:order.name||'Client',tableId:order.tableId??null,recipe:order.recipe,method,amount,tip:order.tip||0,time:s.time});s.payments.receipts.length=Math.min(40,s.payments.receipts.length);this.removeOrder(order)}
 removeOrder(order){const s=this.s;s.orders=s.orders.filter(o=>o!==order);for(const drink of s.tray)if(drink.orderId===order.id)delete drink.orderId;if(s.payments.terminalOrderId===order.id)s.payments.terminalOrderId=null}
 upgrade(){return this.purchaseUpgrade('tray')}
 close(){if(!this.s.open)return;this.s.closing=true;return 'Dernières commandes : servez et encaissez les clients restants.'}
 end(){let s=this.s;if(s.orders.length||s.payments.terminalWithWaiter||s.staff.waiter?.task==='return-terminal')return null;const salaries=['assistant','bartender','waiter'].reduce((sum,id)=>sum+(s.management[id]?managementUpgrades[id].salary:0),0),charges=35+salaries;this.spend(charges);s.waste+=s.tray.length+(s.prep?1:0)+(s.staff.bartender?1:0)+(s.staff.waiter?.drink?1:0);s.lastReport={day:s.day,revenue:s.revenue,cashRevenue:s.payments.cashRevenue,cardRevenue:s.payments.cardRevenue,expenses:s.expenses,charges,salaries,profit:s.revenue-s.expenses-charges,sold:s.sold,lost:s.lost,waste:s.waste};s.open=false;s.closing=false;s.orders=[];s.tray=[];s.prep=null;s.staff={bartender:null,waiter:null,waiterPosition:{x:1.05,z:4.5}};s.payments.terminalWithWaiter=false;s.payments.cashRevenue=0;s.payments.cardRevenue=0;s.payments.terminalOrderId=null;s.management.restockTimer=0;s.gameOver=s.cash<0;s.day++;s.time=1020;s.sold=0;s.lost=0;s.revenue=0;s.expenses=0;s.waste=0;return s.lastReport}
 staffTick(dt){
  const s=this.s;
  let job=s.staff.bartender;
  if(job){
   const order=s.orders.find(order=>order.id===job.orderId);
   if(!s.management.bartender||!order||this.orderPhase(order)!=='preparing'||!this.canPrepare(job.recipe)){s.waste++;s.staff.bartender=null}
   else {job.remaining=Math.max(0,job.remaining-dt);if(job.remaining<=1e-9&&s.tray.length+(s.prep?1:0)<s.capacity){s.tray.push({recipe:job.recipe,quality:92,orderId:job.orderId});s.staff.bartender=null}}
  }
  if(s.management.bartender&&!s.staff.bartender&&s.tray.length+(s.prep?1:0)<s.capacity){
   const order=s.orders.find(order=>this.orderPhase(order)==='preparing'&&(order.arrivalRemaining||0)<=0&&this.canMake(order.recipe)&&s.prep?.recipe!==order.recipe&&this.trayDrinkIndex(order)<0&&!(s.staff.waiter?.task==='serve'&&s.staff.waiter.orderId===order.id));
   if(order){for(const [key,amount]of Object.entries(recipes[order.recipe].ingredients))s.stock[key]-=amount;const total=Math.max(8,recipes[order.recipe].steps.length*2);s.staff.bartender={orderId:order.id,recipe:order.recipe,remaining:total,total}}
  }
  this.waiterTick(dt);
 }
 waiterTick(dt){
  const s=this.s,p=s.payments;let job=s.staff.waiter;
  if(job){
   const order=s.orders.find(order=>order.id===job.orderId);
   if(job.task==='wait-card'&&!order&&p.terminalWithWaiter){this.assignWaiterJob('return-terminal',null);job=s.staff.waiter;}
   else if(!s.management.waiter||!this.validWaiterJob(job,order)){
    if(job.drink){delete job.drink.orderId;if(s.tray.length+(s.prep?1:0)+(s.staff.bartender?1:0)<s.capacity)s.tray.push(job.drink);else s.waste++}
    if(order?.phase==='payment')delete order.paymentBy;
    s.staff.waiter=null;
    if(p.terminalWithWaiter){if(s.management.waiter)this.assignWaiterJob('return-terminal',null);else p.terminalWithWaiter=false;}
    job=s.staff.waiter;
   }
   if(job){
    job.remaining=Math.max(0,job.remaining-dt);this.updateWaiterPosition(job);
    if(job.remaining<=1e-9){
     const current=s.orders.find(order=>order.id===job.orderId);
     switch(job.task){
      case'take-order':this.takeOrder(current.id,this.orderPosition(current));s.staff.waiter=null;break;
      case'serve':this.deliverDrink(current,job.drink);s.staff.waiter=null;break;
      case'collect-cash':this.collectCash(current.id,this.orderPosition(current),'waiter');this.assignWaiterJob('prepare-change',current);break;
      case'prepare-change':{
       const change=money(current.tender-current.due),missing=money(Math.max(0,change-p.till));
       if(missing>0&&this.availableBank()>=missing)this.fundTill(missing,registerPosition);
       this.prepareChange(current.id,change,registerPosition,'waiter');
       if(current.phase==='change-ready')this.assignWaiterJob('return-change',current);else s.staff.waiter=null;
       break;
      }
      case'return-change':this.completeCash(current.id,this.orderPosition(current),'waiter');s.staff.waiter=null;break;
      case'pickup-terminal':
       this.pickupTerminal(registerPosition,'waiter');
       if(p.terminalWithWaiter)this.assignWaiterJob('take-card',current);else {delete current.paymentBy;s.staff.waiter=null;}
       break;
      case'take-card':
       this.payCard(current.id,this.orderPosition(current),'waiter');
       this.assignWaiterJob(current.phase==='card-processing'?'wait-card':'return-terminal',current,current.phase==='card-processing'?current.cardRemaining:undefined);
       break;
      case'wait-card':break; // The shared card timer alone records the payment.
      case'return-terminal':this.returnTerminal(registerPosition,'waiter');s.staff.waiter=null;break;
     }
    }
   }
  }
  if(!s.management.waiter||s.staff.waiter)return;
  if(p.terminalWithWaiter){this.assignWaiterJob('return-terminal',null);return;}
  const available=s.orders.filter(order=>(order.arrivalRemaining||0)<=0);
  const unfinished=available.find(order=>order.paymentBy==='waiter'&&(order.phase==='change-ready'||order.phase==='cash-collected'&&this.canFundChange(order)));
  if(unfinished){this.assignWaiterJob(unfinished.phase==='change-ready'?'return-change':'prepare-change',unfinished);return;}
  const payment=available.find(order=>order.phase==='payment'&&(order.paymentMethod==='cash'?this.canFundChange(order):!p.terminalCarried&&p.terminalOrderId===null));
  if(payment){payment.paymentBy='waiter';this.assignWaiterJob(payment.paymentMethod==='cash'?'collect-cash':'pickup-terminal',payment);return;}
  const serving=available.find(order=>this.orderPhase(order)==='preparing'&&this.trayDrinkIndex(order)>=0);
  const order=serving||available.find(order=>this.orderPhase(order)==='awaiting-order');
  if(order){const assigned=this.assignWaiterJob(serving?'serve':'take-order',order);if(serving)assigned.drink=s.tray.splice(this.trayDrinkIndex(order),1)[0];}
 }
 spawnCustomer(){
  const s=this.s,crowd=this.crowdInfo();
  if(s.closing||s.gameOver||s.orders.length>=crowd.capacity)return;
  const freeTables=tables.filter(table=>!s.orders.some(order=>order.tableId===table.id)),freeSlots=counterSeats.slice(0,crowd.counterSeatsUnlocked).filter(seat=>!s.orders.some(order=>!order.tableId&&this.counterSeat(order).slot===seat.slot)).map(seat=>seat.slot);
  if(!freeTables.length&&!freeSlots.length)return;
  const preferTable=(s.nextId%2===1&&freeTables.length)||!freeSlots.length,table=preferTable?freeTables[Math.floor(Math.random()*freeTables.length)]:null;
  const ids=Object.keys(recipes).filter(id=>this.canPrepare(id)),recipe=ids[Math.floor(Math.random()*ids.length)];
  s.orders.push({id:s.nextId++,name:names[Math.floor(Math.random()*names.length)],recipe,patience:100,tableId:table?.id??null,slot:table?null:freeSlots[0],phase:table?'awaiting-order':'preparing',arrivalRemaining:3,drinkRemaining:0,paymentMethod:Math.random()<.5?'cash':'card',due:0,tender:0,cardRemaining:0});
  s.spawn=crowd.spawnInterval;
 }
 tick(dt){let s=this.s;if(!Number.isFinite(dt))return;dt=Math.min(.1,Math.max(0,dt));for(let d of s.deliveries){d.remaining-=dt;if(d.remaining<=0)s.reserve[d.key]+=ingredients[d.key].pack}s.deliveries=s.deliveries.filter(d=>d.remaining>0);if(!s.open)return;
  if(s.management.assistant){s.management.restockTimer+=dt;if(s.management.restockTimer>=12-1e-9){s.management.restockTimer=Math.max(0,s.management.restockTimer-12);for(const key of ingredientKeys)this.restock(key)}}
  if(s.prep?.pouring&&this.isPour()){s.prep.amount=Math.min(recipes[s.prep.recipe].target*1.6,s.prep.amount+recipes[s.prep.recipe].speed*dt)}s.time+=dt*2;if(s.time>=1440)s.closing=true;
  for(const order of [...s.orders]){
   if(order.arrivalRemaining>0){order.arrivalRemaining=Math.max(0,order.arrivalRemaining-dt);continue}
   const phase=this.orderPhase(order);
   if(phase==='awaiting-order'||phase==='preparing'){order.patience-=dt;if(order.patience<=0){this.removeOrder(order);s.lost++}}
   else if(phase==='drinking'){order.drinkRemaining=Math.max(0,(order.drinkRemaining||0)-dt);if(order.drinkRemaining<=1e-9)order.phase='payment'}
   else if(phase==='card-processing'){order.cardRemaining=Math.max(0,(order.cardRemaining||0)-dt);if(order.cardRemaining<=1e-9)this.finishPayment(order,'card')}
  }
  this.staffTick(dt);
  // Do not accumulate missed arrivals while all available seats are occupied.
  s.spawn=Math.max(0,s.spawn-dt);if(!s.closing&&s.spawn<=1e-9)this.spawnCustomer();if(s.closing&&s.orders.length===0)return this.end()}
}
const api={Game,ingredients,recipes,serviceCapacities,managementUpgrades,isValidStock,tables,counterSeats,crowdStages,MAX_CUSTOMERS,registerPosition,preparationLayout};if(typeof module!=='undefined')module.exports=api;root.BarEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
