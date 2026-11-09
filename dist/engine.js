(function(root){
'use strict';
const ingredients={beer:{name:'Bière pression',unit:'cl',pack:500,cost:16},wine:{name:'Vin rouge',unit:'cl',pack:75,cost:7},coffee:{name:'Café',unit:'dose',pack:20,cost:5},rum:{name:'Rhum',unit:'cl',pack:70,cost:18},lime:{name:'Citron vert',unit:'portion',pack:12,cost:4},mint:{name:'Menthe',unit:'portion',pack:12,cost:3},sugar:{name:'Sirop de sucre',unit:'cl',pack:100,cost:4},soda:{name:'Eau pétillante',unit:'cl',pack:100,cost:2},ice:{name:'Glaçons',unit:'portion',pack:20,cost:3}};
const ingredientKeys=Object.keys(ingredients);
const serviceCapacities=Object.freeze(Object.fromEntries(ingredientKeys.map(key=>[key,ingredients[key].pack*2])));
const normalizeReserve=value=>Object.fromEntries(ingredientKeys.map(key=>[key,Number.isFinite(value?.[key])&&value[key]>=0?value[key]:0]));
const managementUpgrades=Object.freeze({
 tray:{name:'Plateau de service',category:'building',requiredSales:5,cost:100,description:'Passez de 2 à 4 boissons sur le plateau.'},
 cocktails:{name:'Licence cocktails',category:'licenses',requiredSales:8,cost:120,description:'Ajoutez le mojito à votre carte et aux commandes des clients.'},
 counter:{name:'Comptoir équipé',category:'building',requiredSales:12,cost:180,description:'Augmentez de 50 % la capacité de chaque ingrédient au comptoir.'},
 assistant:{name:'Aide de réserve',category:'team',requiredSales:18,cost:220,salary:10,description:'Réapprovisionne le comptoir depuis la réserve toutes les 12 secondes de service. Salaire : 10 € par soir.'},
 bartender:{name:'Préparateur de boissons',category:'team',requiredSales:24,cost:300,salary:18,description:'Prépare les commandes prises, avec les ingrédients du comptoir, puis les pose sur le plateau. Salaire : 18 € par soir.'},
 waiter:{name:'Serveur',category:'team',requiredSales:32,cost:380,salary:22,description:'Prend les commandes à table et apporte les boissons disponibles. Vous gérez les encaissements. Salaire : 22 € par soir.'}
});
function normalizeManagement(saved){
 const value=saved.management;
 return {cocktails:!Object.hasOwn(saved,'management')||value?.cocktails===true,counter:value?.counter===true,assistant:value?.assistant===true,bartender:value?.bartender===true,waiter:value?.waiter===true,restockTimer:Number.isFinite(value?.restockTimer)&&value.restockTimer>=0?Math.min(value.restockTimer,12):0};
}
const recipes={beer:{name:'Bière pression',price:5,glass:'Pinte',station:'Tireuse',ingredients:{beer:50},target:50,unit:'cl',speed:14,color:'#d8a348',steps:['Choisir une pinte','Tirer 50 cl de bière']},wine:{name:'Verre de rouge',price:6,glass:'Verre à vin',station:'Bouteilles',ingredients:{wine:15},target:15,unit:'cl',speed:5,color:'#8e3c48',steps:['Choisir un verre à vin','Verser 15 cl de vin']},coffee:{name:'Espresso',price:3,glass:'Tasse',station:'Machine à café',ingredients:{coffee:1},target:25,unit:'ml',speed:8,color:'#71462b',steps:['Choisir une tasse','Extraire 25 ml de café']},mojito:{name:'Mojito maison',price:10,glass:'Verre haut',station:'Cocktails',ingredients:{rum:4,lime:1,mint:1,sugar:2,soda:10,ice:1},target:4,unit:'cl de rhum',speed:1.5,color:'#b8d28a',steps:['Choisir un verre haut','Ajouter citron et menthe','Piler avec le sirop','Ajouter les glaçons','Doser 4 cl de rhum','Compléter et mélanger']}};
const names=['Lucie','Marc','Nadia','Julien','Sophie','Thomas','Amélie','Émile'];
const tables=Object.freeze([{id:1,x:1.65,z:6.4},{id:2,x:1.65,z:8.6},{id:3,x:10.22,z:6.5},{id:4,x:10.22,z:8.65}].map(Object.freeze));
const registerPosition=Object.freeze({x:2.65,z:2.0});
const phases=new Set(['awaiting-order','preparing','drinking','payment','cash-collected','change-ready','card-processing']);
const money=value=>Math.round((value+Number.EPSILON)*100)/100;
const bounded=(value,min,max,fallback)=>Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
const positionNear=(a,b,radius)=>!!a&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Math.hypot(a.x-b.x,a.z-b.z)<=radius;
const freshPayments=()=>({till:80,terminalCarried:false,terminalOrderId:null,cashRevenue:0,cardRevenue:0,receipts:[]});
const fresh=()=>({version:2,cash:260,day:1,time:1020,open:false,closing:false,stock:{beer:1000,wine:150,coffee:25,rum:70,lime:12,mint:12,sugar:100,soda:200,ice:20},reserve:Object.fromEntries(ingredientKeys.map(key=>[key,ingredients[key].pack])),management:{cocktails:false,counter:false,assistant:false,bartender:false,waiter:false,restockTimer:0},payments:freshPayments(),staff:{bartender:null,waiter:null},orders:[],deliveries:[],prep:null,tray:[],sold:0,lost:0,revenue:0,expenses:0,waste:0,totalSold:0,capacity:2,upgraded:false,spawn:1,nextId:1,lastReport:null,gameOver:false});
class Game{
 constructor(saved){this.s=fresh();if(saved&&saved.version===2){const s=saved;const nums=['cash','day','time','sold','lost','revenue','expenses','waste','totalSold','capacity','spawn','nextId'];if(nums.every(k=>Number.isFinite(s[k]))&&ingredientKeys.every(k=>Number.isFinite(s.stock?.[k])&&s.stock[k]>=0)&&Array.isArray(s.orders)&&s.orders.every(o=>o&&Object.hasOwn(recipes,o.recipe)&&Number.isFinite(o.patience))&&Array.isArray(s.tray)&&s.tray.every(t=>t&&Object.hasOwn(recipes,t.recipe))&&Array.isArray(s.deliveries)&&s.deliveries.every(d=>d&&Object.hasOwn(ingredients,d.key)&&Number.isFinite(d.remaining))&&(!s.prep||(Object.hasOwn(recipes,s.prep.recipe)&&Number.isFinite(s.prep.amount)))){this.s=JSON.parse(JSON.stringify(s));
  // Legacy saves already own their service stock. Migrating must not grant a
  // second starter supply, clamp existing quantities or mutate the saved object.
  this.s.reserve=normalizeReserve(s.reserve);this.s.management=normalizeManagement(s);if(this.s.prep)this.s.prep.pouring=false;
  this.normalizeService(s);
 }}}
 normalizeService(saved){
  const s=this.s,occupiedTables=new Set(),occupiedSlots=new Set();
  s.orders=s.orders.slice(0,7).map((order,index)=>{
   const table=tables.find(table=>table.id===order.tableId&&!occupiedTables.has(table.id));
   if(table)occupiedTables.add(table.id);
   let slot=null;if(!table){slot=Number.isInteger(order.slot)&&order.slot>=0&&order.slot<3&&!occupiedSlots.has(order.slot)?order.slot:[0,1,2].find(id=>!occupiedSlots.has(id));if(slot===undefined)return null;occupiedSlots.add(slot)}
   const phase=phases.has(order.phase)?order.phase:'preparing',recipe=recipes[order.recipe];
   const due=money(bounded(order.due,recipe.price,recipe.price+1,recipe.price));
   return {...order,id:Number.isSafeInteger(order.id)&&order.id>0?order.id:s.nextId+index,name:String(order.name||'Client').replace(/[<>]/g,'').slice(0,80),tableId:table?.id??null,slot,phase,patience:bounded(order.patience,0,100,100),arrivalRemaining:bounded(order.arrivalRemaining,0,3,0),drinkRemaining:bounded(order.drinkRemaining,0,10,phase==='drinking'?8:0),paymentMethod:order.paymentMethod==='cash'?'cash':'card',due,tender:money(bounded(order.tender,due,100,Math.ceil(due/5)*5)),cardRemaining:bounded(order.cardRemaining,0,3,phase==='card-processing'?3:0),tip:money(bounded(order.tip,0,1,Math.max(0,due-recipe.price)))};
  }).filter(Boolean);
  s.nextId=Math.max(s.nextId,...s.orders.map(order=>order.id+1));
  const p=saved.payments,uncredited=s.orders.filter(order=>order.phase==='change-ready').reduce((sum,order)=>sum+order.due,0);
  s.payments={till:money(bounded(p?.till,0,Math.max(0,s.cash)+uncredited,Math.min(80,Math.max(0,s.cash)))),terminalCarried:p?.terminalCarried===true,terminalOrderId:null,cashRevenue:money(bounded(p?.cashRevenue,0,1e9,0)),cardRevenue:money(bounded(p?.cardRevenue,0,1e9,0)),receipts:Array.isArray(p?.receipts)?p.receipts.filter(r=>r&&Number.isSafeInteger(r.id)&&Number.isFinite(r.amount)&&r.amount>=0&&['cash','card'].includes(r.method)).slice(0,40):[]};
  const activeCard=s.orders.find(order=>order.phase==='card-processing'&&s.payments.terminalCarried&&order.id===p?.terminalOrderId);
  for(const order of s.orders)if(order.phase==='card-processing'&&order!==activeCard){order.phase='payment';order.cardRemaining=0}
  if(activeCard)s.payments.terminalOrderId=activeCard.id;
  s.staff={bartender:null,waiter:null};
  for(const role of ['bartender','waiter']){
   const job=saved.staff?.[role],order=s.orders.find(order=>order.id===job?.orderId);
   if(!s.management[role]||!job||!order||!Number.isFinite(job.remaining)||!Number.isFinite(job.total)||job.total<=0||job.total>30)continue;
   if(role==='bartender'&&(job.recipe!==order.recipe||order.phase!=='preparing'))continue;
   if(role==='waiter'&&!['take-order','serve'].includes(job.task))continue;
   if(role==='waiter'&&job.task==='serve'&&(!job.drink||job.drink.recipe!==order.recipe||!Number.isFinite(job.drink.quality)))continue;
   s.staff[role]={...job,remaining:bounded(job.remaining,0,job.total,job.total)};
  }
 }
 orderPhase(order){return phases.has(order?.phase)?order.phase:'preparing'}
 orderPosition(order){return tables.find(table=>table.id===order?.tableId)||{x:4.6+(Number.isInteger(order?.slot)?order.slot:Math.max(0,this.s.orders.indexOf(order))%3)*1.4,z:2.1}}
 canReachOrder(id,position){const order=this.s.orders.find(order=>order.id===id);return !!order&&(order.arrivalRemaining||0)<=0&&positionNear(position,this.orderPosition(order),order.tableId?1.6:1.65)}
 nearRegister(position){return positionNear(position,registerPosition,1.25)}
 availableBank(){const uncredited=this.s.orders.filter(o=>o.phase==='change-ready').reduce((sum,o)=>sum+(o.due||0),0);return money(Math.max(0,this.s.cash-this.s.payments.till+uncredited))}
 spend(amount){this.s.cash=money(this.s.cash-amount);const uncredited=this.s.orders.filter(o=>o.phase==='change-ready').reduce((sum,o)=>sum+(o.due||0),0);this.s.payments.till=Math.min(this.s.payments.till,money(Math.max(0,this.s.cash)+uncredited))}
 fundTill(amount,position){if(!this.nearRegister(position))return 'Rejoignez la caisse au comptoir.';if(!Number.isFinite(amount)||amount<=0||money(amount)!==amount)return 'Choisissez un montant positif en euros.';if(amount>this.availableBank())return 'Le solde disponible hors caisse est insuffisant.';this.s.payments.till=money(this.s.payments.till+amount);return `${amount.toFixed(2)} € ajoutés au fond de caisse depuis votre trésorerie.`}
 canPrepare(id){return Object.hasOwn(recipes,id)&&(id!=='mojito'||this.s.management.cocktails)}
 canMake(id){return this.canPrepare(id)&&Object.entries(recipes[id].ingredients).every(([k,n])=>this.s.stock[k]>=n)}
 serviceCapacity(key){return Object.hasOwn(serviceCapacities,key)?serviceCapacities[key]*(this.s.management.counter?1.5:1):0}
 upgradeInfo(id){const item=managementUpgrades[id];if(!Object.hasOwn(managementUpgrades,id))return null;const owned=id==='tray'?this.s.upgraded:this.s.management[id];return {id,...item,owned:!!owned,unlocked:!!owned||this.s.totalSold>=item.requiredSales,affordable:this.s.cash>=item.cost&&!this.s.gameOver}}
 purchaseUpgrade(id){
  const info=this.upgradeInfo(id),s=this.s;if(!info)return 'Amélioration inconnue.';if(s.gameOver)return 'La partie est terminée.';if(info.owned)return 'Déjà installé.';
  if(!info.unlocked)return `Servez ${info.requiredSales} clients pour débloquer cette amélioration.`;
  if(!info.affordable)return 'Trésorerie insuffisante.';
  this.spend(info.cost);s.expenses+=info.cost;
  if(id==='tray'){s.upgraded=true;s.capacity=4}else{s.management[id]=true;if(id==='assistant')s.management.restockTimer=0}
  return id==='tray'?'Plateau agrandi : 4 boissons au lieu de 2.':`${info.name} : achat effectué.`;
 }
 open(){let s=this.s;if(s.gameOver)return 'La partie est terminée. Lancez un nouveau bar.';if(s.open)return 'Le bar est déjà ouvert.';s.open=true;s.closing=false;s.spawn=1;return 'Le bar est ouvert. Premier client en approche.'}
 buy(key){let s=this.s;if(!Object.hasOwn(ingredients,key))return 'Produit inconnu.';const i=ingredients[key];if(s.gameOver)return 'La partie est terminée.';if(s.cash<i.cost)return 'Trésorerie insuffisante.';this.spend(i.cost);s.expenses+=i.cost;s.deliveries.push({key,remaining:10});return 'Commande passée : livraison en réserve dans 10 secondes de jeu.'}
 restock(key,amount){
  const s=this.s;if(!Object.hasOwn(ingredients,key))return 'Produit inconnu.';if(s.gameOver)return 'La partie est terminée.';
  if(amount!==undefined&&(!Number.isFinite(amount)||amount<=0))return 'Choisissez une quantité positive.';
  const available=s.reserve[key],space=Math.max(0,this.serviceCapacity(key)-s.stock[key]);
  if(space===0)return 'Le stock de service est déjà plein.';if(available<=0)return 'La réserve ne contient plus ce produit.';
  const quantity=Math.min(amount===undefined?space:amount,space,available);
  s.reserve[key]-=quantity;s.stock[key]+=quantity;
  return `${ingredients[key].name} : ${quantity.toLocaleString('fr-BE',{maximumFractionDigits:2})} ${ingredients[key].unit} transférés au comptoir.`;
 }
 start(id){let s=this.s;if(!Object.hasOwn(recipes,id))return 'Boisson inconnue.';if(!s.open)return 'Ouvrez le bar avant de préparer.';if(s.prep)return 'Terminez ou jetez la préparation en cours.';if(s.tray.length+(s.staff.bartender?1:0)>=s.capacity)return 'Le plateau est plein ou réservé par le préparateur : servez une boisson.';if(!this.canPrepare(id))return 'Achetez la licence cocktails dans la tablette pour préparer le mojito.';if(!this.canMake(id))return 'Il manque des ingrédients. Réapprovisionnez le comptoir depuis la réserve.';for(const [k,n]of Object.entries(recipes[id].ingredients))s.stock[k]-=n;s.prep={recipe:id,step:0,amount:0,pouring:false,ready:false,quality:0};return 'Préparation commencée : '+recipes[id].name+'.'}
 step(){let p=this.s.prep;if(!p||p.ready)return;if(p.step<recipes[p.recipe].steps.length-1)p.step++}
 isPour(){let p=this.s.prep;return !!p&&!p.ready&&p.step===(p.recipe==='mojito'?4:1)}
 setPour(v){if(this.isPour())this.s.prep.pouring=!!v;else if(this.s.prep)this.s.prep.pouring=false}
 finishPour(){let p=this.s.prep;if(!this.isPour())return;p.pouring=false;const r=recipes[p.recipe];p.quality=Math.max(0,Math.round(100-Math.abs(p.amount-r.target)/r.target*180));if(p.recipe==='mojito')p.step=5;else p.ready=true}
 finishMix(){let p=this.s.prep;if(p?.recipe==='mojito'&&p.step===5)p.ready=true}
 plate(){let s=this.s,p=s.prep;if(!p?.ready)return 'Terminez la préparation.';if(s.tray.length+(s.staff.bartender?1:0)>=s.capacity)return 'Le plateau est plein.';s.tray.push({recipe:p.recipe,quality:p.quality});s.prep=null;return 'Boisson déposée sur le plateau.'}
 discard(index){let s=this.s;if(index===undefined){if(!s.prep)return;s.prep=null;}else{if(!s.tray[index])return;s.tray.splice(index,1)}s.waste++;return 'Boisson jetée. Les ingrédients sont perdus.'}
 takeOrder(id,position){const order=this.s.orders.find(o=>o.id===id);if(!order)return 'Ce client est déjà parti.';if(!this.canReachOrder(id,position))return 'Approchez-vous de la table pour prendre la commande.';if(this.orderPhase(order)!=='awaiting-order')return 'La commande a déjà été prise.';order.phase='preparing';order.patience=100;return `Table ${order.tableId} : ${recipes[order.recipe].name}. Commande envoyée au bar.`}
 trayDrinkIndex(order){return this.s.tray.findIndex(drink=>drink.recipe===order.recipe&&(!drink.orderId||drink.orderId===order.id))}
 serve(id,position){const s=this.s,order=s.orders.find(o=>o.id===id);if(!order)return 'Ce client est déjà parti.';if(!this.canReachOrder(id,position))return 'Approchez-vous du client pour apporter sa boisson.';if(this.orderPhase(order)!=='preparing')return this.orderPhase(order)==='awaiting-order'?'Prenez d’abord sa commande avec la tablette.':'Ce client a déjà été servi.';if(s.staff.waiter?.task==='serve'&&s.staff.waiter.orderId===id)return 'Le serveur apporte déjà cette commande.';const index=this.trayDrinkIndex(order);if(index<0)return 'Préparez '+recipes[order.recipe].name+' et posez-le sur le plateau.';return this.deliverDrink(order,s.tray.splice(index,1)[0])}
 deliverDrink(order,drink){const s=this.s;if(drink.quality<40){this.removeOrder(order);s.lost++;return 'Boisson refusée : dosage trop éloigné de la recette.'}order.tip=drink.quality>=85&&order.patience>25?1:0;order.due=money(recipes[order.recipe].price+order.tip);order.paymentMethod=order.paymentMethod==='cash'?'cash':'card';order.tender=[5,10,20,50,100].find(note=>note>=order.due)||order.due;if(order.paymentMethod==='cash'&&order.tender===order.due&&order.id%2===1)order.tender=Math.min(100,order.tender*2);order.phase='drinking';order.drinkRemaining=order.tableId?8:4;order.patience=Math.max(25,order.patience);return 'Boisson servie. Le client vous demandera ensuite l’addition.'}
 collectCash(id,position){const order=this.s.orders.find(o=>o.id===id);if(!order)return 'Ce client est déjà parti.';if(!this.canReachOrder(id,position))return 'Approchez-vous du client pour prendre les espèces.';if(this.orderPhase(order)!=='payment'||order.paymentMethod!=='cash')return 'Ce client ne vous remet pas d’espèces maintenant.';order.phase='cash-collected';return `${order.tender.toFixed(2)} € reçus. Rejoignez la caisse pour préparer la monnaie.`}
 prepareChange(id,amount,position){const s=this.s,order=s.orders.find(o=>o.id===id);if(!this.nearRegister(position))return 'Rejoignez la caisse au comptoir.';if(!order||this.orderPhase(order)!=='cash-collected')return 'Aucun encaissement en espèces à traiter pour ce client.';const expected=money(order.tender-order.due);if(!Number.isFinite(amount)||amount<0||Math.abs(amount-expected)>.000001)return 'Le montant de monnaie est incorrect. Vérifiez le total et les espèces reçues.';if(s.payments.till+1e-9<expected)return 'Le fond de caisse est insuffisant pour rendre la monnaie. Ajoutez des espèces depuis la trésorerie.';s.payments.till=money(s.payments.till+order.due);order.change=expected;order.phase='change-ready';return expected?`${expected.toFixed(2)} € de monnaie préparés. Rapportez-les au client.`:'Paiement exact. Rapportez le ticket au client.'}
 completeCash(id,position){const order=this.s.orders.find(o=>o.id===id);if(!order||this.orderPhase(order)!=='change-ready')return 'Préparez la monnaie à la caisse avant de revenir.';if(!this.canReachOrder(id,position))return 'Retournez auprès du client pour terminer l’encaissement.';this.finishPayment(order,'cash');return 'Monnaie et ticket remis. Paiement enregistré.'}
 pickupTerminal(position){const p=this.s.payments;if(!this.nearRegister(position))return 'Le terminal sans fil se trouve à côté de la caisse.';if(p.terminalCarried)return 'Vous avez déjà le terminal.';p.terminalCarried=true;return 'Terminal sans fil pris. Apportez-le au client qui paie par carte.'}
 returnTerminal(position){const p=this.s.payments;if(!this.nearRegister(position))return 'Reposez le terminal sur son socle au comptoir.';if(p.terminalOrderId!==null)return 'Attendez la confirmation du paiement en cours.';if(!p.terminalCarried)return 'Le terminal est déjà sur son socle.';p.terminalCarried=false;return 'Terminal reposé sur son socle.'}
 payCard(id,position){const s=this.s,order=s.orders.find(o=>o.id===id);if(!order||this.orderPhase(order)!=='payment'||order.paymentMethod!=='card')return 'Aucun paiement par carte disponible pour ce client.';if(!s.payments.terminalCarried)return 'Prenez le terminal sans fil au comptoir.';if(s.payments.terminalOrderId!==null)return 'Le terminal traite déjà un paiement.';if(!this.canReachOrder(id,position))return 'Apportez le terminal auprès du client.';order.phase='card-processing';order.cardRemaining=3;s.payments.terminalOrderId=id;return 'Carte présentée. Autorisation en cours…'}
 finishPayment(order,method){const s=this.s;if(!s.orders.includes(order))return;const amount=money(order.due);s.cash=money(s.cash+amount);s.revenue=money(s.revenue+amount);s.payments[method==='cash'?'cashRevenue':'cardRevenue']=money(s.payments[method==='cash'?'cashRevenue':'cardRevenue']+amount);s.sold++;s.totalSold++;s.payments.receipts.unshift({id:order.id,day:s.day,customerName:order.name||'Client',tableId:order.tableId??null,recipe:order.recipe,method,amount,tip:order.tip||0,time:s.time});s.payments.receipts.length=Math.min(40,s.payments.receipts.length);this.removeOrder(order)}
 removeOrder(order){const s=this.s;s.orders=s.orders.filter(o=>o!==order);for(const drink of s.tray)if(drink.orderId===order.id)delete drink.orderId;if(s.payments.terminalOrderId===order.id)s.payments.terminalOrderId=null}
 upgrade(){return this.purchaseUpgrade('tray')}
 close(){if(!this.s.open)return;this.s.closing=true;return 'Dernières commandes : servez et encaissez les clients restants.'}
 end(){let s=this.s;if(s.orders.length)return null;const salaries=['assistant','bartender','waiter'].reduce((sum,id)=>sum+(s.management[id]?managementUpgrades[id].salary:0),0),charges=35+salaries;this.spend(charges);s.waste+=s.tray.length+(s.prep?1:0)+(s.staff.bartender?1:0)+(s.staff.waiter?.drink?1:0);s.lastReport={day:s.day,revenue:s.revenue,cashRevenue:s.payments.cashRevenue,cardRevenue:s.payments.cardRevenue,expenses:s.expenses,charges,salaries,profit:s.revenue-s.expenses-charges,sold:s.sold,lost:s.lost,waste:s.waste};s.open=false;s.closing=false;s.orders=[];s.tray=[];s.prep=null;s.staff={bartender:null,waiter:null};s.payments.cashRevenue=0;s.payments.cardRevenue=0;s.payments.terminalOrderId=null;s.management.restockTimer=0;s.gameOver=s.cash<0;s.day++;s.time=1020;s.sold=0;s.lost=0;s.revenue=0;s.expenses=0;s.waste=0;return s.lastReport}
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
   if(order){for(const [key,amount]of Object.entries(recipes[order.recipe].ingredients))s.stock[key]-=amount;const total=order.recipe==='mojito'?12:8;s.staff.bartender={orderId:order.id,recipe:order.recipe,remaining:total,total}}
  }
  job=s.staff.waiter;
  if(job){
   const order=s.orders.find(order=>order.id===job.orderId),expected=job.task==='take-order'?'awaiting-order':'preparing';
   if(!s.management.waiter||!order||this.orderPhase(order)!==expected){
    if(job.drink){delete job.drink.orderId;if(s.tray.length+(s.prep?1:0)+(s.staff.bartender?1:0)<s.capacity)s.tray.push(job.drink);else s.waste++}
    s.staff.waiter=null;
   }else{job.remaining=Math.max(0,job.remaining-dt);if(job.remaining<=1e-9){s.staff.waiter=null;if(job.task==='take-order')this.takeOrder(order.id,this.orderPosition(order));else this.deliverDrink(order,job.drink)}}
  }
  if(s.management.waiter&&!s.staff.waiter){
   const available=s.orders.filter(order=>(order.arrivalRemaining||0)<=0);
   const serving=available.find(order=>this.orderPhase(order)==='preparing'&&this.trayDrinkIndex(order)>=0);
   const order=serving||available.find(order=>this.orderPhase(order)==='awaiting-order');
   if(order){const point=this.orderPosition(order),total=Math.max(6,Math.min(10,Math.hypot(point.x-1.05,point.z-4.5)/1.4+2));s.staff.waiter={orderId:order.id,task:serving?'serve':'take-order',remaining:total,total,recipe:order.recipe};if(serving)s.staff.waiter.drink=s.tray.splice(this.trayDrinkIndex(order),1)[0]}
  }
 }
 spawnCustomer(){
  const s=this.s,freeTables=tables.filter(table=>!s.orders.some(order=>order.tableId===table.id)),freeSlots=[0,1,2].filter(slot=>!s.orders.some(order=>!order.tableId&&(Number.isInteger(order.slot)?order.slot:s.orders.indexOf(order)%3)===slot));
  if(!freeTables.length&&!freeSlots.length)return;
  const preferTable=(s.nextId%2===1&&freeTables.length)||!freeSlots.length,table=preferTable?freeTables[Math.floor(Math.random()*freeTables.length)]:null;
  const ids=Object.keys(recipes).filter(id=>this.canPrepare(id)),recipe=ids[Math.floor(Math.random()*ids.length)];
  s.orders.push({id:s.nextId++,name:names[Math.floor(Math.random()*names.length)],recipe,patience:100,tableId:table?.id??null,slot:table?null:freeSlots[0],phase:table?'awaiting-order':'preparing',arrivalRemaining:3,drinkRemaining:0,paymentMethod:Math.random()<.5?'cash':'card',due:0,tender:0,cardRemaining:0});
  s.spawn=s.upgraded?12:16;
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
  this.staffTick(dt);s.spawn-=dt;if(!s.closing&&s.orders.length<7&&s.spawn<=0)this.spawnCustomer();if(s.closing&&s.orders.length===0)return this.end()}
}
const api={Game,ingredients,recipes,serviceCapacities,managementUpgrades,tables,registerPosition};if(typeof module!=='undefined')module.exports=api;root.BarEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
