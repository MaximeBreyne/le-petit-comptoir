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
 assistant:{name:'Aide de réserve',category:'team',requiredSales:18,cost:220,salary:10,description:'Réapprovisionne le comptoir depuis la réserve toutes les 12 secondes de service. Salaire : 10 € par soir.'}
});
function normalizeManagement(saved){
 const value=saved.management;
 return {cocktails:!Object.hasOwn(saved,'management')||value?.cocktails===true,counter:value?.counter===true,assistant:value?.assistant===true,restockTimer:Number.isFinite(value?.restockTimer)&&value.restockTimer>=0?Math.min(value.restockTimer,12):0};
}
const recipes={beer:{name:'Bière pression',price:5,glass:'Pinte',station:'Tireuse',ingredients:{beer:50},target:50,unit:'cl',speed:14,color:'#d8a348',steps:['Choisir une pinte','Tirer 50 cl de bière']},wine:{name:'Verre de rouge',price:6,glass:'Verre à vin',station:'Bouteilles',ingredients:{wine:15},target:15,unit:'cl',speed:5,color:'#8e3c48',steps:['Choisir un verre à vin','Verser 15 cl de vin']},coffee:{name:'Espresso',price:3,glass:'Tasse',station:'Machine à café',ingredients:{coffee:1},target:25,unit:'ml',speed:8,color:'#71462b',steps:['Choisir une tasse','Extraire 25 ml de café']},mojito:{name:'Mojito maison',price:10,glass:'Verre haut',station:'Cocktails',ingredients:{rum:4,lime:1,mint:1,sugar:2,soda:10,ice:1},target:4,unit:'cl de rhum',speed:1.5,color:'#b8d28a',steps:['Choisir un verre haut','Ajouter citron et menthe','Piler avec le sirop','Ajouter les glaçons','Doser 4 cl de rhum','Compléter et mélanger']}};
const names=['Lucie','Marc','Nadia','Julien','Sophie','Thomas','Amélie','Émile'];
const fresh=()=>({version:2,cash:260,day:1,time:1020,open:false,closing:false,stock:{beer:1000,wine:150,coffee:25,rum:70,lime:12,mint:12,sugar:100,soda:200,ice:20},reserve:Object.fromEntries(ingredientKeys.map(key=>[key,ingredients[key].pack])),management:{cocktails:false,counter:false,assistant:false,restockTimer:0},orders:[],deliveries:[],prep:null,tray:[],sold:0,lost:0,revenue:0,expenses:0,waste:0,totalSold:0,capacity:2,upgraded:false,spawn:1,nextId:1,lastReport:null,gameOver:false});
class Game{
 constructor(saved){this.s=fresh();if(saved&&saved.version===2){const s=saved;const nums=['cash','day','time','sold','lost','revenue','expenses','waste','totalSold','capacity','spawn','nextId'];if(nums.every(k=>Number.isFinite(s[k]))&&ingredientKeys.every(k=>Number.isFinite(s.stock?.[k])&&s.stock[k]>=0)&&Array.isArray(s.orders)&&s.orders.every(o=>o&&Object.hasOwn(recipes,o.recipe)&&Number.isFinite(o.patience))&&Array.isArray(s.tray)&&s.tray.every(t=>t&&Object.hasOwn(recipes,t.recipe))&&Array.isArray(s.deliveries)&&s.deliveries.every(d=>d&&Object.hasOwn(ingredients,d.key)&&Number.isFinite(d.remaining))&&(!s.prep||(Object.hasOwn(recipes,s.prep.recipe)&&Number.isFinite(s.prep.amount)))){this.s=JSON.parse(JSON.stringify(s));
  // Legacy saves already own their service stock. Migrating must not grant a
  // second starter supply, clamp existing quantities or mutate the saved object.
  this.s.reserve=normalizeReserve(s.reserve);this.s.management=normalizeManagement(s);if(this.s.prep)this.s.prep.pouring=false;
 }}}
 canPrepare(id){return Object.hasOwn(recipes,id)&&(id!=='mojito'||this.s.management.cocktails)}
 canMake(id){return this.canPrepare(id)&&Object.entries(recipes[id].ingredients).every(([k,n])=>this.s.stock[k]>=n)}
 serviceCapacity(key){return Object.hasOwn(serviceCapacities,key)?serviceCapacities[key]*(this.s.management.counter?1.5:1):0}
 upgradeInfo(id){const item=managementUpgrades[id];if(!Object.hasOwn(managementUpgrades,id))return null;const owned=id==='tray'?this.s.upgraded:this.s.management[id];return {id,...item,owned:!!owned,unlocked:!!owned||this.s.totalSold>=item.requiredSales,affordable:this.s.cash>=item.cost&&!this.s.gameOver}}
 purchaseUpgrade(id){
  const info=this.upgradeInfo(id),s=this.s;if(!info)return 'Amélioration inconnue.';if(s.gameOver)return 'La partie est terminée.';if(info.owned)return 'Déjà installé.';
  if(!info.unlocked)return `Servez ${info.requiredSales} clients pour débloquer cette amélioration.`;
  if(!info.affordable)return 'Trésorerie insuffisante.';
  s.cash-=info.cost;s.expenses+=info.cost;
  if(id==='tray'){s.upgraded=true;s.capacity=4}else{s.management[id]=true;if(id==='assistant')s.management.restockTimer=0}
  return id==='tray'?'Plateau agrandi : 4 boissons au lieu de 2.':`${info.name} : achat effectué.`;
 }
 open(){let s=this.s;if(s.gameOver)return 'La partie est terminée. Lancez un nouveau bar.';if(s.open)return 'Le bar est déjà ouvert.';s.open=true;s.closing=false;s.spawn=1;return 'Le bar est ouvert. Premier client en approche.'}
 buy(key){let s=this.s;if(!Object.hasOwn(ingredients,key))return 'Produit inconnu.';const i=ingredients[key];if(s.gameOver)return 'La partie est terminée.';if(s.cash<i.cost)return 'Trésorerie insuffisante.';s.cash-=i.cost;s.expenses+=i.cost;s.deliveries.push({key,remaining:10});return 'Commande passée : livraison en réserve dans 10 secondes de jeu.'}
 restock(key,amount){
  const s=this.s;if(!Object.hasOwn(ingredients,key))return 'Produit inconnu.';if(s.gameOver)return 'La partie est terminée.';
  if(amount!==undefined&&(!Number.isFinite(amount)||amount<=0))return 'Choisissez une quantité positive.';
  const available=s.reserve[key],space=Math.max(0,this.serviceCapacity(key)-s.stock[key]);
  if(space===0)return 'Le stock de service est déjà plein.';if(available<=0)return 'La réserve ne contient plus ce produit.';
  const quantity=Math.min(amount===undefined?space:amount,space,available);
  s.reserve[key]-=quantity;s.stock[key]+=quantity;
  return `${ingredients[key].name} : ${quantity.toLocaleString('fr-BE',{maximumFractionDigits:2})} ${ingredients[key].unit} transférés au comptoir.`;
 }
 start(id){let s=this.s;if(!Object.hasOwn(recipes,id))return 'Boisson inconnue.';if(!s.open)return 'Ouvrez le bar avant de préparer.';if(s.prep)return 'Terminez ou jetez la préparation en cours.';if(s.tray.length>=s.capacity)return 'Le plateau est plein : servez ou retirez une boisson.';if(!this.canPrepare(id))return 'Achetez la licence cocktails dans la tablette pour préparer le mojito.';if(!this.canMake(id))return 'Il manque des ingrédients. Réapprovisionnez le comptoir depuis la réserve.';for(const [k,n]of Object.entries(recipes[id].ingredients))s.stock[k]-=n;s.prep={recipe:id,step:0,amount:0,pouring:false,ready:false,quality:0};return 'Préparation commencée : '+recipes[id].name+'.'}
 step(){let p=this.s.prep;if(!p||p.ready)return;if(p.step<recipes[p.recipe].steps.length-1)p.step++}
 isPour(){let p=this.s.prep;return !!p&&!p.ready&&p.step===(p.recipe==='mojito'?4:1)}
 setPour(v){if(this.isPour())this.s.prep.pouring=!!v;else if(this.s.prep)this.s.prep.pouring=false}
 finishPour(){let p=this.s.prep;if(!this.isPour())return;p.pouring=false;const r=recipes[p.recipe];p.quality=Math.max(0,Math.round(100-Math.abs(p.amount-r.target)/r.target*180));if(p.recipe==='mojito')p.step=5;else p.ready=true}
 finishMix(){let p=this.s.prep;if(p?.recipe==='mojito'&&p.step===5)p.ready=true}
 plate(){let s=this.s,p=s.prep;if(!p?.ready)return 'Terminez la préparation.';if(s.tray.length>=s.capacity)return 'Le plateau est plein.';s.tray.push({recipe:p.recipe,quality:p.quality});s.prep=null;return 'Boisson déposée sur le plateau.'}
 discard(index){let s=this.s;if(index===undefined){if(!s.prep)return;s.prep=null;}else{if(!s.tray[index])return;s.tray.splice(index,1)}s.waste++;return 'Boisson jetée. Les ingrédients sont perdus.'}
 serve(id){let s=this.s,o=s.orders.find(o=>o.id===id);if(!o)return 'Ce client est déjà parti.';const i=s.tray.findIndex(t=>t.recipe===o.recipe);if(i<0)return 'Préparez '+recipes[o.recipe].name+' et posez-le sur le plateau.';let drink=s.tray.splice(i,1)[0];if(drink.quality<40){s.orders=s.orders.filter(x=>x.id!==id);s.lost++;return 'Boisson refusée : dosage trop éloigné de la recette.'}let tip=drink.quality>=85&&o.patience>25?1:0;let value=recipes[o.recipe].price+tip;s.cash+=value;s.revenue+=value;s.sold++;s.totalSold++;s.orders=s.orders.filter(x=>x.id!==id);return 'Servi ! +'+value+' €'+(tip?' dont 1 € de pourboire.':'.')}
 upgrade(){return this.purchaseUpgrade('tray')}
 close(){if(!this.s.open)return;this.s.closing=true;return 'Dernières commandes : servez les clients restants.'}
 end(){let s=this.s;const salaries=s.management.assistant?managementUpgrades.assistant.salary:0,charges=35+salaries;s.cash-=charges;s.waste+=s.tray.length+(s.prep?1:0);s.lastReport={day:s.day,revenue:s.revenue,expenses:s.expenses,charges,salaries,profit:s.revenue-s.expenses-charges,sold:s.sold,lost:s.lost,waste:s.waste};s.open=false;s.closing=false;s.orders=[];s.tray=[];s.prep=null;s.management.restockTimer=0;s.gameOver=s.cash<0;s.day++;s.time=1020;s.sold=0;s.lost=0;s.revenue=0;s.expenses=0;s.waste=0;return s.lastReport}
 tick(dt){let s=this.s;if(!Number.isFinite(dt))return;dt=Math.min(.1,Math.max(0,dt));for(let d of s.deliveries){d.remaining-=dt;if(d.remaining<=0)s.reserve[d.key]+=ingredients[d.key].pack}s.deliveries=s.deliveries.filter(d=>d.remaining>0);if(!s.open)return;
  if(s.management.assistant){s.management.restockTimer+=dt;if(s.management.restockTimer>=12-1e-9){s.management.restockTimer=Math.max(0,s.management.restockTimer-12);for(const key of ingredientKeys)this.restock(key)}}
  if(s.prep?.pouring&&this.isPour()){s.prep.amount=Math.min(recipes[s.prep.recipe].target*1.6,s.prep.amount+recipes[s.prep.recipe].speed*dt)}s.time+=dt*2;if(s.time>=1440)s.closing=true;for(let o of s.orders)o.patience-=dt;let gone=s.orders.filter(o=>o.patience<=0);s.lost+=gone.length;s.orders=s.orders.filter(o=>o.patience>0);s.spawn-=dt;if(!s.closing&&s.orders.length<3&&s.spawn<=0){const ids=Object.keys(recipes).filter(id=>this.canPrepare(id));let recipe=ids[Math.floor(Math.random()*ids.length)];s.orders.push({id:s.nextId++,name:names[Math.floor(Math.random()*names.length)],recipe,patience:100});s.spawn=s.upgraded?12:16}if(s.closing&&s.orders.length===0)return this.end()}
}
const api={Game,ingredients,recipes,serviceCapacities,managementUpgrades};if(typeof module!=='undefined')module.exports=api;root.BarEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
