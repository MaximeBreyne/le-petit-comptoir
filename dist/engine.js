(function(root){
'use strict';
const ingredients={beer:{name:'Bière pression',unit:'cl',pack:500,cost:16},wine:{name:'Vin rouge',unit:'cl',pack:75,cost:7},coffee:{name:'Café',unit:'dose',pack:20,cost:5},rum:{name:'Rhum',unit:'cl',pack:70,cost:18},lime:{name:'Citron vert',unit:'portion',pack:12,cost:4},mint:{name:'Menthe',unit:'portion',pack:12,cost:3},sugar:{name:'Sirop de sucre',unit:'cl',pack:100,cost:4},soda:{name:'Eau pétillante',unit:'cl',pack:100,cost:2},ice:{name:'Glaçons',unit:'portion',pack:20,cost:3},whisky:{name:'Whisky',unit:'cl',pack:70,cost:22,license:'spirits'},gin:{name:'Gin',unit:'cl',pack:70,cost:20,license:'spirits'},tonic:{name:'Tonic',unit:'cl',pack:100,cost:3,license:'spirits'},cola:{name:'Cola',unit:'cl',pack:100,cost:3,license:'signature'}};
Object.assign(ingredients,{vodka:{name:'Vodka',unit:'cl',pack:70,cost:19,license:'premium'},cranberry:{name:'Jus de cranberry',unit:'cl',pack:100,cost:4,license:'premium'},energy:{name:'Boisson énergisante',unit:'cl',pack:100,cost:5,license:'nightlife'}});
const ingredientKeys=Object.keys(ingredients);
const coreIngredientKeys=Object.freeze(['beer','wine','coffee','rum','lime','mint','sugar','soda','ice']);
const isValidStock=stock=>!!stock&&typeof stock==='object'&&!Array.isArray(stock)&&coreIngredientKeys.every(key=>Number.isFinite(stock[key])&&stock[key]>=0)&&ingredientKeys.every(key=>!Object.hasOwn(stock,key)||Number.isFinite(stock[key])&&stock[key]>=0);
const serviceCapacities=Object.freeze(Object.fromEntries(ingredientKeys.map(key=>[key,ingredients[key].pack*2])));
const normalizeReserve=value=>Object.fromEntries(ingredientKeys.map(key=>[key,Number.isFinite(value?.[key])&&value[key]>=0?value[key]:0]));
const serviceSchedule=Object.freeze({opensAt:1020,closesAt:1680,minutesPerSecond:.5});
function formatServiceTime(minutes){const time=((Math.floor(Number.isFinite(minutes)?minutes:serviceSchedule.opensAt)%1440)+1440)%1440;return String(Math.floor(time/60)).padStart(2,'0')+':'+String(time%60).padStart(2,'0')}
function serviceInfo(state){
 const {opensAt,closesAt,minutesPerSecond}=serviceSchedule,duration=closesAt-opensAt,elapsed=Math.max(0,Math.min(duration,(Number.isFinite(state?.time)?state.time:opensAt)-opensAt));
 return {opensAt,closesAt,duration,elapsed,remaining:duration-elapsed,progress:elapsed/duration,realDurationSeconds:duration/minutesPerSecond,clockPaused:state?.developer?.enabled===true&&state.developer.clockPaused===true};
}
function normalizeDeveloper(value){const enabled=value?.enabled===true;return {enabled,clockPaused:enabled&&value?.clockPaused===true}}
const managementUpgrades=Object.freeze({
 tray:{name:'Plateau de service',category:'building',requiredSales:5,cost:100,requires:[],description:'Passez de 2 à 4 boissons sur le plateau.'},
 cocktails:{name:'Licence cocktails',category:'licenses',requiredSales:8,cost:120,requires:[],description:'Ajoutez le mojito à votre carte et aux commandes des clients.'},
 softDrinks:{name:'Licence sans alcool',category:'licenses',requiredSales:12,cost:90,requires:[],description:'Servez le virgin mojito et la limonade maison avec les ingrédients du bar.'},
 spirits:{name:'Licence spiritueux',category:'licenses',requiredSales:20,cost:210,requires:[],description:'Ajoutez le whisky et le gin tonic à la carte. Commandez leurs ingrédients en réserve.'},
 signature:{name:'Licence créations maison',category:'licenses',requiredSales:36,cost:360,requires:['cocktails','spirits'],description:'Proposez le gin fizz et le cuba libre après les licences cocktails et spiritueux.'},
 counter:{name:'Comptoir équipé',category:'building',requiredSales:12,cost:180,requires:[],description:'Augmentez de 50 % la capacité de chaque ingrédient au comptoir.'},
 expansion1:{name:'Premier agrandissement',category:'building',requiredSales:20,cost:450,requires:[],requiresClosed:true,description:'Ouvrez un salon de 27 m² sur la droite du bar. Deux emplacements de tables à aménager séparément.'},
 table5:{name:'Table 5 · Salon',category:'building',requiredSales:20,cost:130,requires:['expansion1'],requiresClosed:true,description:'Installez une table et ses chaises dans le salon : un client supplémentaire à la fois.'},
 table6:{name:'Table 6 · Salon',category:'building',requiredSales:30,cost:160,requires:['expansion1','table5'],requiresClosed:true,description:'Complétez le salon avec une deuxième table : un client supplémentaire à la fois.'},
 expansion2:{name:'Deuxième agrandissement',category:'building',requiredSales:55,cost:900,requires:['expansion1','table6'],requiresClosed:true,description:'Ajoutez une seconde salle de 27 m² après le salon. Deux nouveaux emplacements de tables à aménager.'},
 table7:{name:'Table 7 · Grande salle',category:'building',requiredSales:55,cost:180,requires:['expansion2'],requiresClosed:true,description:'Installez la première table de la grande salle : un client supplémentaire à la fois.'},
 table8:{name:'Table 8 · Grande salle',category:'building',requiredSales:75,cost:220,requires:['expansion2','table7'],requiresClosed:true,description:'Terminez l’aménagement de la grande salle : un client supplémentaire à la fois.'},
 assistant:{name:'Aide de réserve',category:'team',requiredSales:18,cost:220,salary:10,requires:[],description:'Réapprovisionne le comptoir depuis la réserve toutes les 12 secondes de service. Salaire : 10 € par soir.'},
 bartender:{name:'Préparateur de boissons',category:'team',requiredSales:24,cost:300,salary:18,requires:[],description:'Prépare les commandes prises, avec les ingrédients du comptoir, puis les pose sur le plateau. Salaire : 18 € par soir.'},
 waiter:{name:'Serveur',category:'team',requiredSales:32,cost:380,salary:22,requires:[],description:'Prend les commandes, apporte les boissons et encaisse les espèces ou les cartes avec le terminal partagé. Salaire : 22 € par soir.'},
 upstairs:{name:'Étage panoramique',category:'building',requiredSales:110,cost:1800,requires:['expansion2','table8'],requiresClosed:true,description:'Construisez un étage de 54 m² et son escalier de 18 m². Quatre tables à acheter séparément, accessibles par le véritable escalier.'},
 table9:{name:'Table 9 · Étage',category:'building',requiredSales:110,cost:200,requires:['upstairs'],requiresClosed:true,description:'Installez une première table à l’étage : une place client supplémentaire.'},
 table10:{name:'Table 10 · Étage',category:'building',requiredSales:125,cost:220,requires:['upstairs','table9'],requiresClosed:true,description:'Ajoutez une deuxième table à l’étage : une place client supplémentaire.'},
 table11:{name:'Table 11 · Étage',category:'building',requiredSales:140,cost:240,requires:['upstairs','table10'],requiresClosed:true,description:'Ajoutez une troisième table à l’étage : une place client supplémentaire.'},
 table12:{name:'Table 12 · Étage',category:'building',requiredSales:155,cost:260,requires:['upstairs','table11'],requiresClosed:true,description:'Terminez l’étage avec une quatrième table : une place client supplémentaire.'},
 nightclub:{name:'Boîte de nuit',category:'building',requiredSales:180,cost:2600,requires:['upstairs'],requiresClosed:true,description:'Ouvrez une salle de nuit de 48 m² avec piste et cabine DJ. Achetez ses tables et la licence nocturne pour développer le service.'},
 table13:{name:'Table 13 · Club',category:'building',requiredSales:180,cost:240,requires:['nightclub'],requiresClosed:true,description:'Installez la première table de la boîte de nuit : une place client supplémentaire.'},
 table14:{name:'Table 14 · Club',category:'building',requiredSales:195,cost:260,requires:['nightclub','table13'],requiresClosed:true,description:'Ajoutez une deuxième table dans le club : une place client supplémentaire.'},
 table15:{name:'Table 15 · Club',category:'building',requiredSales:210,cost:280,requires:['nightclub','table14'],requiresClosed:true,description:'Ajoutez une troisième table dans le club : une place client supplémentaire.'},
 table16:{name:'Table 16 · Club',category:'building',requiredSales:225,cost:300,requires:['nightclub','table15'],requiresClosed:true,description:'Terminez le club avec une quatrième table : une place client supplémentaire.'},
 classiques:{name:'Licence cocktails classiques',category:'licenses',requiredSales:45,cost:260,requires:['expansion1','cocktails','spirits'],description:'Servez le daiquiri et le whisky highball, avec les ingrédients déjà disponibles dans le bar.'},
 premium:{name:'Licence vodka et jus',category:'licenses',requiredSales:80,cost:380,requires:['expansion2','spirits'],description:'Débloquez la vodka tonic et la vodka cranberry. Les nouvelles bouteilles sont à commander en réserve.'},
 nightlife:{name:'Licence cocktails de nuit',category:'licenses',requiredSales:190,cost:600,requires:['nightclub','premium'],description:'Ajoutez la vodka energy et Nuit Pourpre, commandées exclusivement par les clients du club. Préparation derrière le bar principal.'},
 floorManager:{name:'Responsable de salle',category:'team',requiredSales:85,cost:650,salary:30,requiredArea:174,requires:['expansion2','waiter'],description:'À partir de 174 m² : le serveur se déplace 25 % plus vite et la patience des clients diminue 20 % moins vite. Salaire : 30 € par soir.'},
 bartender2:{name:'Second préparateur',category:'team',requiredSales:120,cost:700,salary:26,requiredArea:246,requires:['upstairs','bartender'],description:'À partir de 246 m² : prépare une autre commande en parallèle du premier préparateur, avec les stocks et le plateau partagés. Salaire : 26 € par soir.'},
 dj:{name:'DJ résident',category:'team',requiredSales:200,cost:850,salary:35,requiredArea:294,requires:['nightclub','nightlife'],description:'À partir de 294 m² : anime le club, apporte 1 € de pourboire supplémentaire par boisson du club et réduit de 15 % le délai entre les arrivées de clients. Salaire : 35 € par soir.'},
 host:{name:'Agent d’accueil',category:'team',requiredSales:210,cost:550,salary:24,requiredArea:294,requires:['nightclub'],description:'À partir de 294 m² : accueille la clientèle et ralentit de 15 % la perte de patience, en complément du responsable de salle. Salaire : 24 € par soir.'}
});
function normalizeManagement(saved){
 const value=saved.management;
 return {cocktails:!Object.hasOwn(saved,'management')||value?.cocktails===true,softDrinks:value?.softDrinks===true,spirits:value?.spirits===true,signature:value?.signature===true,counter:value?.counter===true,...Object.fromEntries(Object.entries(managementUpgrades).filter(([id,upgrade])=>upgrade.requiresClosed||['classiques','premium','nightlife','floorManager','bartender2','dj','host'].includes(id)).map(([id])=>[id,ownsBuildingUpgrade(saved,id)])),assistant:value?.assistant===true,bartender:value?.bartender===true,waiter:value?.waiter===true,restockTimer:Number.isFinite(value?.restockTimer)&&value.restockTimer>=0?Math.min(value.restockTimer,12):0};
}
function ownsBuildingUpgrade(state,id){return !!managementUpgrades[id]&&state?.management?.[id]===true&&managementUpgrades[id].requires.every(required=>ownsBuildingUpgrade(state,required))}
const buildingZones=Object.freeze({
 upstairs:Object.freeze({left:12,right:21,back:4,front:10,y:3.6}),
 stairs:Object.freeze({left:21,right:24,back:4,front:10,x:22.5,rampLeft:21.65,rampRight:23.35,startZ:5.25,endZ:9.1,height:3.6,upperExitZ:9.3}),
 nightclub:Object.freeze({left:24,right:32,back:4,front:10,y:0,doorZ:5.25})
});
function buildingLayout(state){const level=ownsBuildingUpgrade(state,'expansion2')?2:ownsBuildingUpgrade(state,'expansion1')?1:0,upstairs=ownsBuildingUpgrade(state,'upstairs'),nightclub=ownsBuildingUpgrade(state,'nightclub');return {level,upstairs,nightclub,width:nightclub?32:upstairs?24:12+level*4.5,area:120+level*27+(upstairs?72:0)+(nightclub?48:0),height:upstairs?7.2:3.6}}
function availableTables(state){return tables.filter(table=>!table.upgrade||ownsBuildingUpgrade(state,table.upgrade))}
// A finish is paid for once. Applying an already owned finish is free.
const decorCatalog=Object.freeze(Object.fromEntries(Object.entries({
 tables:{name:'Tables',options:[
  {id:'oak',name:'Chêne de bistrot',material:'wood',cost:0,requiredSales:0,colors:{top:'#826c4d',edge:'#655238',base:'#333c35'}},
  {id:'walnut',name:'Noyer chaleureux',material:'wood',cost:120,requiredSales:0,colors:{top:'#58412f',edge:'#392e24',base:'#292d2b'}},
  {id:'marble',name:'Pierre crème',material:'stone',cost:200,requiredSales:25,colors:{top:'#c6c0ad',edge:'#9a9589',base:'#554e3a'}},
  {id:'night',name:'Bois noir',material:'wood',cost:150,requiredSales:10,colors:{top:'#343a36',edge:'#232a25',base:'#596052'}},
 ]},
 chairs:{name:'Chaises et tabourets',options:[
  {id:'bistro',name:'Bistrot classique',material:'fabric',cost:0,requiredSales:0,colors:{seat:'#6e4b3e',back:'#586052',frame:'#343b33'}},
  {id:'burgundy',name:'Velours bordeaux',material:'fabric',cost:100,requiredSales:0,colors:{seat:'#733e47',back:'#4d3034',frame:'#332f2c'}},
  {id:'blue',name:'Tissu bleu ardoise',material:'fabric',cost:130,requiredSales:10,colors:{seat:'#4d6876',back:'#35494f',frame:'#2b3637'}},
  {id:'leather',name:'Cuir cognac',material:'leather',cost:180,requiredSales:25,colors:{seat:'#a66c3f',back:'#715138',frame:'#373732'}},
 ]},
 walls:{name:'Murs et boiseries',options:[
  {id:'cream',name:'Crème et vert comptoir',material:'plaster',cost:0,requiredSales:0,colors:{plaster:'#b7b0a0',panel:'#31453f',trim:'#615b48'}},
  {id:'sage',name:'Sauge et chêne',material:'plaster',cost:110,requiredSales:0,colors:{plaster:'#a2ae95',panel:'#59644e',trim:'#83735b'}},
  {id:'terracotta',name:'Terracotta douce',material:'plaster',cost:140,requiredSales:10,colors:{plaster:'#ba927b',panel:'#725749',trim:'#8c7562'}},
  {id:'midnight',name:'Bleu de minuit',material:'plaster',cost:190,requiredSales:25,colors:{plaster:'#687a82',panel:'#2d424c',trim:'#a28a60'}},
 ]},
 ceiling:{name:'Plafond et corniches',options:[
  {id:'ivory',name:'Ivoire patiné',material:'plaster',cost:0,requiredSales:0,colors:{surface:'#b4aa96',trim:'#d5cbb4'}},
  {id:'white',name:'Blanc lumineux',material:'plaster',cost:90,requiredSales:0,colors:{surface:'#dedccf',trim:'#eee9d9'}},
  {id:'charcoal',name:'Anthracite feutré',material:'plaster',cost:160,requiredSales:25,colors:{surface:'#505956',trim:'#747b70'}},
 ]},
 floor:{name:'Sol de la salle',options:[
  {id:'oak',name:'Parquet de quartier',material:'floor',cost:0,requiredSales:0,colors:{surface:'#826749'}},
  {id:'lightOak',name:'Parquet clair',material:'floor',cost:140,requiredSales:10,colors:{surface:'#b9a17b'}},
  {id:'terracotta',name:'Carreaux terre cuite',material:'tile',cost:190,requiredSales:25,colors:{surface:'#aa7658'}},
 ]},
}).map(([key,category])=>[key,Object.freeze({...category,options:Object.freeze(category.options.map(option=>Object.freeze({...option,colors:Object.freeze(option.colors)})))})])));
function normalizeDecor(state){
 const decor={},decorOwned={};
 for(const [category,catalog]of Object.entries(decorCatalog)){
  const first=catalog.options[0].id,saved=state?.decorOwned?.[category];
  decorOwned[category]=catalog.options.filter(option=>option.id===first||Array.isArray(saved)&&saved.includes(option.id)).map(option=>option.id);
  decor[category]=decorOwned[category].includes(state?.decor?.[category])?state.decor[category]:first;
 }
 return {decor,decorOwned};
}
function decorStyle(state){
 const {decor}=normalizeDecor(state);
 return Object.fromEntries(Object.entries(decorCatalog).map(([category,catalog])=>[category,catalog.options.find(option=>option.id===decor[category])]));
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
Object.assign(recipes,{
 daiquiri:{name:'Daiquiri',price:12,glass:'Coupe',station:'Cocktails classiques',license:'classiques',pourStep:2,finishStep:3,vessel:'coupe',garnish:'lime',ingredients:{rum:5,lime:2,sugar:2,ice:1},target:5,unit:'cl de rhum',speed:1.5,color:'#deddb6',steps:['Choisir une coupe','Ajouter citron, sirop et glaçons','Doser 5 cl de rhum','Secouer et filtrer']},
 whiskyHighball:{name:'Whisky highball',price:11,glass:'Verre haut',station:'Cocktails classiques',license:'classiques',pourStep:2,finishStep:3,vessel:'highball',garnish:null,ingredients:{whisky:4,soda:12,ice:1},target:4,unit:'cl de whisky',speed:1.5,color:'#c7a66d',steps:['Choisir un verre haut','Ajouter les glaçons','Doser 4 cl de whisky','Compléter à l’eau pétillante']},
 vodkaTonic:{name:'Vodka tonic',price:12,glass:'Verre haut',station:'Vodka et jus',license:'premium',pourStep:2,finishStep:3,vessel:'highball',garnish:'lime',ingredients:{vodka:4,tonic:12,lime:1,ice:1},target:4,unit:'cl de vodka',speed:1.5,color:'#d9e2ca',steps:['Choisir un verre haut','Ajouter glaçons et citron','Doser 4 cl de vodka','Compléter au tonic et mélanger']},
 vodkaCranberry:{name:'Vodka cranberry',price:12,glass:'Verre haut',station:'Vodka et jus',license:'premium',pourStep:2,finishStep:3,vessel:'highball',garnish:'lime',ingredients:{vodka:4,cranberry:12,lime:1,ice:1},target:4,unit:'cl de vodka',speed:1.5,color:'#a64765',steps:['Choisir un verre haut','Ajouter glaçons et citron','Doser 4 cl de vodka','Compléter au jus de cranberry']},
 vodkaEnergy:{name:'Vodka energy',price:14,glass:'Verre haut',station:'Club',license:'nightlife',clubOnly:true,pourStep:2,finishStep:3,vessel:'highball',garnish:null,ingredients:{vodka:4,energy:15,ice:1},target:4,unit:'cl de vodka',speed:1.5,color:'#d5c786',steps:['Choisir un verre haut','Ajouter les glaçons','Doser 4 cl de vodka','Compléter à la boisson énergisante']},
 nightPurple:{name:'Nuit Pourpre',price:16,glass:'Coupe',station:'Club',license:'nightlife',clubOnly:true,pourStep:2,finishStep:3,vessel:'coupe',garnish:'lime',ingredients:{vodka:5,cranberry:10,lime:1,sugar:2,ice:1},target:5,unit:'cl de vodka',speed:1.5,color:'#8d3d75',steps:['Choisir une coupe','Ajouter cranberry, citron, sirop et glaçons','Doser 5 cl de vodka','Secouer et filtrer']}
});
const names=['Lucie','Marc','Nadia','Julien','Sophie','Thomas','Amélie','Émile'];
const tables=Object.freeze([{id:1,x:1.65,z:6.4},{id:2,x:1.65,z:8.6},{id:3,x:10.22,z:6.5},{id:4,x:10.22,z:8.65},{id:5,x:14.5,z:6.5,upgrade:'table5'},{id:6,x:14.5,z:8.65,upgrade:'table6'},{id:7,x:19,z:6.5,upgrade:'table7'},{id:8,x:19,z:8.65,upgrade:'table8'},
 ...[[14.5,6.5],[14.5,8.5],[18.4,6.5],[18.4,8.5]].map(([x,z],index)=>({id:9+index,x,y:3.6,z,floor:'upstairs',upgrade:'table'+(9+index)})),
 ...[[26,6.6],[26,8.7],[30,6.6],[30,8.7]].map(([x,z],index)=>({id:13+index,x,y:0,z,floor:'nightclub',upgrade:'table'+(13+index)}))
].map(Object.freeze));
// Preserve the first three slot IDs and positions for existing saves.
const counterSeats=Object.freeze([4.6,6,7.4,3.2,8.8,10.2].map((x,slot)=>Object.freeze({slot,x,z:4.3})));
const MAX_CUSTOMERS=tables.length+counterSeats.length;
const crowdStages=Object.freeze([
 {threshold:0,counterSeatsUnlocked:3,spawnInterval:16},
 {threshold:20,counterSeatsUnlocked:4,spawnInterval:15},
 {threshold:45,counterSeatsUnlocked:5,spawnInterval:14},
 {threshold:80,counterSeatsUnlocked:6,spawnInterval:12}
].map(stage=>Object.freeze({...stage,capacity:4+stage.counterSeatsUnlocked})));
const registerPosition=Object.freeze({x:2.65,z:2.0});
const phases=new Set(['awaiting-order','preparing','drinking','payment','cash-collected','change-ready','card-processing']);
const money=value=>Math.round((value+Number.EPSILON)*100)/100;
const bounded=(value,min,max,fallback)=>Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
const positionNear=(a,b,radius)=>!!a&&!!b&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Math.hypot(a.x-b.x,a.z-b.z)<=radius;
// Player positions use eye height; engine-owned interaction points explicitly
// carry floorY, so an upstairs waiter never needs to masquerade as a camera.
const actorFloor=position=>position?.floorY!==undefined?(Number.isFinite(position.floorY)?position.floorY:NaN):position?.y!==undefined?(Number.isFinite(position.y)?position.y-1.68:NaN):0;
const onFloor=(position,y=0)=>Math.abs(actorFloor(position)-y)<.6;
const preparationLayout=Object.freeze({
 reach:1.15,stationReach:1.2,
 stations:Object.freeze({beer:Object.freeze({x:4.15,y:1.133,z:2.72}),coffee:Object.freeze({x:8.43,y:1.152,z:2.47}),cocktails:Object.freeze({x:6.5,y:1.133,z:3.05})}),
 vessels:Object.freeze({x:7,y:1.15,z:.85}),
 ingredients:Object.freeze(Object.fromEntries(Object.entries({
  wine:{x:2.9,y:1.02,z:.85},rum:{x:3.35,y:1.02,z:.85},whisky:{x:3.8,y:1.02,z:.85},gin:{x:4.25,y:1.02,z:.85},sugar:{x:4.7,y:1.02,z:.85},soda:{x:5.15,y:1.02,z:.85},tonic:{x:5.6,y:1.02,z:.85},cola:{x:6.05,y:1.02,z:.85},vodka:{x:7.9,y:1.02,z:.85},cranberry:{x:8.35,y:1.02,z:.85},energy:{x:8.8,y:1.02,z:.85},lime:{x:6.05,y:1.12,z:2.6},mint:{x:7.1,y:1.12,z:2.6},ice:{x:7.55,y:1.12,z:2.6},coffee:{x:9.65,y:1.02,z:.85},beer:{x:4.15,y:1.67,z:2.72,fixed:true}
 }).map(([key,point])=>[key,Object.freeze(point)])))
});
const preparationKind=id=>id==='beer'?'beer':id==='coffee'?'coffee':'cocktails';
const preparationSlots=Object.freeze([
 {id:'beer',kind:'beer',label:'Tireuse 1',...preparationLayout.stations.beer},
 {id:'beer2',kind:'beer',label:'Tireuse 2',...preparationLayout.stations.beer,x:3.8},
 {id:'coffee',kind:'coffee',label:'Machine à café',...preparationLayout.stations.coffee},
 {id:'cocktails',kind:'cocktails',label:'Plan de préparation 1',...preparationLayout.stations.cocktails},
 {id:'cocktails2',kind:'cocktails',label:'Plan de préparation 2',...preparationLayout.stations.cocktails,x:5.85}
].map(Object.freeze));
const waiterPaymentTasks=new Set(['collect-cash','prepare-change','return-change','pickup-terminal','take-card','wait-card','return-terminal']);
const freshPayments=()=>({till:80,terminalCarried:false,terminalWithWaiter:false,terminalOrderId:null,cashRevenue:0,cardRevenue:0,receipts:[]});
const fresh=()=>({...normalizeDecor(),version:2,cash:260,day:1,time:serviceSchedule.opensAt,developer:normalizeDeveloper(),open:false,closing:false,stock:{...normalizeReserve(),beer:1000,wine:150,coffee:25,rum:70,lime:12,mint:12,sugar:100,soda:200,ice:20},reserve:Object.fromEntries(ingredientKeys.map(key=>[key,coreIngredientKeys.includes(key)?ingredients[key].pack:0])),management:{...Object.fromEntries(Object.keys(managementUpgrades).filter(id=>id!=='tray').map(id=>[id,false])),restockTimer:0},payments:freshPayments(),staff:{bartender:null,bartender2:null,waiter:null,waiterPosition:{x:1.05,z:4.5}},orders:[],deliveries:[],prep:null,parkedPreps:[],nextPrepId:1,tray:[],sold:0,lost:0,revenue:0,expenses:0,waste:0,totalSold:0,capacity:2,upgraded:false,spawn:1,nextId:1,lastReport:null,gameOver:false});
class Game{
 constructor(saved){this.s=fresh();if(saved&&saved.version===2){const s=saved;const nums=['cash','day','time','sold','lost','revenue','expenses','waste','totalSold','capacity','spawn','nextId'];if(nums.every(k=>Number.isFinite(s[k]))&&isValidStock(s.stock)&&Array.isArray(s.orders)&&s.orders.every(o=>o&&Object.hasOwn(recipes,o.recipe)&&Number.isFinite(o.patience))&&Array.isArray(s.tray)&&s.tray.every(t=>t&&Object.hasOwn(recipes,t.recipe))&&Array.isArray(s.deliveries)&&s.deliveries.every(d=>d&&Object.hasOwn(ingredients,d.key)&&Number.isFinite(d.remaining))&&(!s.prep||(Object.hasOwn(recipes,s.prep.recipe)&&Number.isFinite(s.prep.amount)))){this.s=JSON.parse(JSON.stringify(s));
  // Legacy saves already own their service stock. Migrating must not grant a
  // second starter supply, clamp existing quantities or mutate the saved object.
  this.s.stock=normalizeReserve(s.stock);this.s.reserve=normalizeReserve(s.reserve);this.s.management=normalizeManagement(s);if(this.s.prep)this.s.prep.pouring=false;
  Object.assign(this.s,normalizeDecor(s));this.s.developer=normalizeDeveloper(s.developer);
  this.normalizeService(s);this.normalizePreparations(s);
 }}}
 normalizePreparation(saved){
  if(!saved||!Object.hasOwn(recipes,saved.recipe)||!Number.isFinite(saved.amount))return null;
  const recipe=recipes[saved.recipe],physical=saved.physical===true;
  const added=Object.fromEntries(Object.keys(recipe.ingredients).filter(key=>!physical||saved.added?.[key]===true).map(key=>[key,true]));
  const vesselPlaced=physical?saved.vesselPlaced===true:saved.step>0||saved.ready===true;
  let held=null;
  if(physical&&saved.held?.kind==='vessel'&&!vesselPlaced)held={kind:'vessel'};
  const key=saved.held?.key;
  if(physical&&vesselPlaced&&saved.held?.kind==='ingredient'&&key!=='beer'&&Object.hasOwn(recipe.ingredients,key)&&!added[key]&&saved.held.amount===recipe.ingredients[key])held={kind:'ingredient',key,amount:recipe.ingredients[key]};
  const p={recipe:saved.recipe,physical:true,vesselPlaced,held,added,step:0,amount:bounded(saved.amount,0,recipe.target*1.6,0),pouring:false,ready:false,quality:bounded(saved.quality,0,100,0)};
  const complete=vesselPlaced&&Object.keys(recipe.ingredients).filter(key=>key!=='beer').every(key=>added[key]);
  if(complete){p.step=recipe.pourStep;if(Number.isInteger(recipe.finishStep)&&saved.step===recipe.finishStep)p.step=recipe.finishStep;p.ready=saved.ready===true&&Object.keys(recipe.ingredients).every(key=>added[key]);}
  return p;
 }
 normalizePreparations(saved){
  const s=this.s,slots=new Set(),ids=new Set(),orders=new Set();s.prep=null;s.parkedPreps=[];
  let next=Number.isSafeInteger(saved.nextPrepId)&&saved.nextPrepId>0?saved.nextPrepId:1;
  const list=[{value:saved.prep,active:true},...(Array.isArray(saved.parkedPreps)?saved.parkedPreps:[]).map(value=>({value,active:false}))];
  for(const {value,active}of list){
   const p=this.normalizePreparation(value);if(!p)continue;
   const compatible=preparationSlots.filter(slot=>slot.kind===preparationKind(p.recipe)&&!slots.has(slot.id)),slot=compatible.find(slot=>slot.id===value.slotId)||compatible[0];if(!slot)continue;
   p.id=Number.isSafeInteger(value.id)&&value.id>0&&!ids.has(value.id)?value.id:next++;
   while(ids.has(p.id))p.id=next++;next=Math.max(next,p.id+1);ids.add(p.id);p.slotId=slot.id;slots.add(slot.id);
   const order=s.orders.find(order=>order.id===value.orderId&&order.recipe===p.recipe&&this.orderPhase(order)==='preparing'&&!orders.has(order.id));
   p.orderId=order?.id??null;if(order)orders.add(order.id);
   if(!active)p.held=null;
   if(active)s.prep=p;else s.parkedPreps.push(p);
  }
  s.nextPrepId=next;
 }
 normalizeService(saved){
  const s=this.s,activeTables=this.activeTables(),occupiedTables=new Set(),occupiedSlots=new Set();
  s.orders=s.orders.slice(0,MAX_CUSTOMERS).map((order,index)=>{
   const table=activeTables.find(table=>table.id===order.tableId&&!occupiedTables.has(table.id))||(order.tableId?activeTables.find(table=>!occupiedTables.has(table.id)):null);
   if(table)occupiedTables.add(table.id);
   // Existing customers keep their seats even when a restored save has not
   // reached the corresponding attendance threshold yet.
   let slot=null;if(!table){slot=counterSeats.some(seat=>seat.slot===order.slot)&&!occupiedSlots.has(order.slot)?order.slot:counterSeats.find(seat=>!occupiedSlots.has(seat.slot))?.slot;if(slot===undefined)return null;occupiedSlots.add(slot)}
   const phase=phases.has(order.phase)?order.phase:'preparing',recipe=recipes[order.recipe],arrivalDuration=bounded(order.arrivalDuration,3,30,3);
   const due=money(bounded(order.due,recipe.price,recipe.price+2,recipe.price));
   return {...order,...(Object.hasOwn(order,'arrivalDuration')?{arrivalDuration}:{}),id:Number.isSafeInteger(order.id)&&order.id>0?order.id:s.nextId+index,name:String(order.name||'Client').replace(/[<>]/g,'').slice(0,80),tableId:table?.id??null,slot,phase,patience:bounded(order.patience,0,100,100),arrivalRemaining:bounded(order.arrivalRemaining,0,arrivalDuration,0),drinkRemaining:bounded(order.drinkRemaining,0,10,phase==='drinking'?8:0),paymentMethod:order.paymentMethod==='cash'?'cash':'card',due,tender:money(bounded(order.tender,due,100,Math.ceil(due/5)*5)),cardRemaining:bounded(order.cardRemaining,0,3,phase==='card-processing'?3:0),tip:money(bounded(order.tip,0,2,Math.max(0,due-recipe.price)))};
  }).filter(Boolean);
  s.nextId=Math.max(s.nextId,...s.orders.map(order=>order.id+1));
  for(const drink of s.tray)if(drink.orderId&&!s.orders.some(order=>order.id===drink.orderId&&order.recipe===drink.recipe&&this.orderPhase(order)==='preparing'))delete drink.orderId;
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
  s.staff={bartender:null,bartender2:null,waiter:null,waiterPosition:this.validStaffPosition(point)?{x:point.x,z:point.z,...(point.y!==undefined?{y:point.y}:{})}:{x:1.05,z:4.5}};
  for(const role of ['bartender','bartender2','waiter']){
   const job=saved.staff?.[role],order=s.orders.find(order=>order.id===job?.orderId);
   if(!s.management[role]||!job||(!order&&!(role==='waiter'&&job.task==='return-terminal'))||!Number.isFinite(job.remaining)||!Number.isFinite(job.total)||job.total<=0||job.total>60)continue;
   if(role.startsWith('bartender')&&(job.recipe!==order.recipe||order.phase!=='preparing'||!this.canPrepare(job.recipe)||this.bartenderJobs().some(other=>other.orderId===job.orderId)))continue;
   if(role==='waiter'&&!['take-order','serve',...waiterPaymentTasks].includes(job.task))continue;
   if(role==='waiter'&&job.task==='serve'&&(!job.drink||job.drink.recipe!==order.recipe||!Number.isFinite(job.drink.quality)))continue;
   if(role==='waiter'&&!this.validWaiterJob(job,order))continue;
   s.staff[role]={...job,remaining:bounded(job.remaining,0,job.total,job.total)};
   if(role==='waiter'){
    const validRoute=Array.isArray(job.route)&&job.route.length>=2&&job.route.length<=48&&job.route.every(p=>this.validStaffPosition(p))&&Number.isFinite(job.travel)&&job.travel>=0&&job.travel<=job.total;
    if(!validRoute){const position=s.staff.waiterPosition;s.staff.waiter.route=this.waiterRoute(position,this.waiterDestination(job.task,order));s.staff.waiter.travel=Math.min(job.total,this.waiterRouteLength(s.staff.waiter.route)/this.waiterSpeed());}
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
  const table=this.activeTables().find(table=>table.id===order?.tableId),seat=this.counterSeat(order);
  return table?{x:table.x+(table.x<6?1.35:-1.35),z:table.z,...(table.y!==undefined?{y:table.y}:{})}:order?{x:seat.x,z:seat.z+.5}:{x:1.05,z:4.5};
 }
 validStaffPosition(point){
  if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z)||point.y!==undefined&&!Number.isFinite(point.y))return false;
  const building=buildingLayout(this.s),y=point.y||0;
  if(Math.abs(y)<.02)return point.x>=.3&&point.x<=building.width-.3&&point.z>=1.15&&point.z<=9.6&&(point.x<=11.7||point.z>=4.3);
  if(!building.upstairs)return false;
  if(Math.abs(y-3.6)<.02)return point.x>=12.3&&point.x<=23.7&&point.z>=4.3&&point.z<=9.6;
  const stair=buildingZones.stairs,expected=(point.z-stair.startZ)/(stair.endZ-stair.startZ)*stair.height;
  return point.x>=stair.rampLeft&&point.x<=stair.rampRight&&point.z>=stair.startZ&&point.z<=stair.endZ&&Math.abs(y-expected)<.05;
 }
 waiterSpeed(){return this.s.management.floorManager?2.25:1.8}
 waiterRouteLength(route){return route.slice(1).reduce((length,p,index)=>length+Math.hypot(p.x-route[index].x,p.z-route[index].z,(p.y||0)-(route[index].y||0)),0)}
 expansionPath(point){
  const p={x:point.x,y:point.y||0,z:point.z},route=[{x:17.4,y:0,z:5.25},{x:21.45,y:0,z:5.25},{x:21.45,y:0,z:4.75}],add=(x,y,z)=>route.push({x,y,z});
  if(p.y>.02){
   add(22.5,0,4.75);add(22.5,0,5.25);
   if(p.y<3.58){route.push(p);return route;}
   add(22.5,3.6,9.1);add(22.5,3.6,9.3);
   if(p.x>21){route.push(p);return route;}
   add(20.1,3.6,9.3);add(20.1,3.6,5.25);
   const aisle=p.x<16?13.15:17.05;
   add(aisle,3.6,5.25);add(aisle,3.6,p.z);route.push(p);return route;
  }
  if(p.x<24){add(p.x,0,4.75);route.push(p);return route;}
  add(23.55,0,4.75);add(23.55,0,5.25);
  const aisle=p.x<28?24.65:28.65;add(aisle,0,5.25);add(aisle,0,p.z);route.push(p);return route;
 }
 waiterRoute(from,to){
  if(!(from.y||to.y||from.x>21||to.x>21))return this.groundWaiterRoute(from,to);
  const start={x:from.x,y:from.y||0,z:from.z},end={x:to.x,y:to.y||0,z:to.z};
  if(start.y===3.6&&end.y===3.6&&start.x<=21&&end.x<=21){
   const a=start.x>19.7?20.1:start.x<16?13.15:17.05,b=end.x>19.7?20.1:end.x<16?13.15:17.05;
   return [start,{x:a,y:3.6,z:start.z},{x:a,y:3.6,z:5.25},{x:b,y:3.6,z:5.25},{x:b,y:3.6,z:end.z},end];
  }
  if(start.y===0&&end.y===0&&start.x>24&&end.x>24){const a=start.x<28?24.65:28.65,b=end.x<28?24.65:28.65;return [start,{x:a,y:0,z:start.z},{x:a,y:0,z:5.25},{x:b,y:0,z:5.25},{x:b,y:0,z:end.z},end];}
  const hub={x:17.4,y:0,z:5.25},special=p=>p.y>.02||p.x>21;
  const first=special(start)?this.expansionPath(start).reverse():this.groundWaiterRoute(start,hub),last=special(end)?this.expansionPath(end):this.groundWaiterRoute(hub,end);
  return [...first,...last.slice(1)].filter((p,index,all)=>index===0||Math.hypot(p.x-all[index-1].x,p.z-all[index-1].z,(p.y||0)-(all[index-1].y||0))>.0001);
 }
 groundWaiterRoute(from,to){
  if(Math.hypot(from.x-to.x,from.z-to.z)<.001)return [{...from},{...to}];
  const route=[{...from}],add=point=>{if(Math.hypot(point.x-route.at(-1).x,point.z-route.at(-1).z)>.001)route.push({...point})};
  const room=point=>point.x>16.5?2:point.x>12?1:0,sourceRoom=room(from),targetRoom=room(to),aisle=level=>level===1?12.9:17.4;
  if(sourceRoom||targetRoom){
   if(sourceRoom){add({x:aisle(sourceRoom),z:from.z});if(sourceRoom!==targetRoom)add({x:aisle(sourceRoom),z:5.25})}
   else for(const point of this.waiterRoute(from,{x:8.8,z:5.25}).slice(1))add(point);
   if(targetRoom){if(sourceRoom!==targetRoom)add({x:aisle(targetRoom),z:5.25});add({x:aisle(targetRoom),z:to.z});add(to)}
   else {add({x:8.8,z:5.25});for(const point of this.waiterRoute(route.at(-1),to).slice(1))add(point)}
   if(route.length===1)route.push({...to});return route;
  }
  if(from.z<3.5||to.z<3.5){
   if(from.z<3.5){add({x:from.x,z:1.65});if(to.z<3.5){add({x:to.x,z:1.65});add(to);if(route.length===1)route.push({...to});return route}add({x:.95,z:1.65});add({x:.95,z:1.9});add({x:.95,z:4.9});}
   if(to.z<3.5){if(from.z>=3.5){const aisle=from.x<6?3.1:8.8;if(from.z<=5.15)add({x:from.x,z:4.9});add({x:aisle,z:route.at(-1).z});add({x:aisle,z:4.9});add({x:.95,z:4.9});}add({x:.95,z:1.9});add({x:.95,z:1.65});add({x:to.x,z:1.65});add(to);if(route.length===1)route.push({...to});return route;}
  }
  const source=route.at(-1),a=source.x<6?3.1:8.8,b=to.x<6?3.1:8.8;
  // Step out from behind the stools before moving sideways past their backs.
  if(source.z<=5.15)add({x:source.x,z:4.9});
  add({x:a,z:route.at(-1).z});add({x:a,z:4.9});add({x:b,z:4.9});add({x:b,z:to.z});add(to);if(route.length===1)route.push({...to});return route;
 }
 assignWaiterJob(task,order,duration){
  const s=this.s,position=s.staff.waiterPosition||{x:1.05,z:4.5},target=this.waiterDestination(task,order),route=task==='wait-card'?[{...position},{...position}]:this.waiterRoute(position,target),travel=this.waiterRouteLength(route)/this.waiterSpeed();
  const total=duration===undefined?Math.max(['serve','take-order'].includes(task)?6:2,travel+2):Math.max(.001,duration);
  s.staff.waiter={orderId:order?.id??s.staff.waiter?.orderId??null,task,remaining:total,total,recipe:order?.recipe,route,travel:Math.min(travel,total)};
  return s.staff.waiter;
 }
 updateWaiterPosition(job){
  if(!job.route)return;let distance=this.waiterRouteLength(job.route)*Math.min(1,(job.total-job.remaining)/Math.max(.0001,job.travel));
  for(let i=1;i<job.route.length;i++){const a=job.route[i-1],b=job.route[i],length=Math.hypot(b.x-a.x,b.z-a.z,(b.y||0)-(a.y||0));if(distance<=length||i===job.route.length-1){const t=length?Math.min(1,distance/length):1;this.s.staff.waiterPosition={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,...(a.y!==undefined||b.y!==undefined?{y:(a.y||0)+((b.y||0)-(a.y||0))*t}:{})};break}distance-=length;}
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
 orderPosition(order){const table=order?.tableId&&this.activeTables().find(table=>table.id===order.tableId);return order?.tableId?(table?{...table,floorY:table.y||0}:null):{x:this.counterSeat(order).x,z:2.1,floorY:0}}
 canReachOrder(id,position){const order=this.s.orders.find(order=>order.id===id),target=order&&this.orderPosition(order);return !!order&&!!target&&(order.arrivalRemaining||0)<=0&&onFloor(position,target.floorY)&&positionNear(position,target,order.tableId?1.6:1.65)}
 nearRegister(position){return onFloor(position)&&positionNear(position,registerPosition,1.25)}
 availableBank(){const uncredited=this.s.orders.filter(o=>o.phase==='change-ready').reduce((sum,o)=>sum+(o.due||0),0);return money(Math.max(0,this.s.cash-this.s.payments.till+uncredited))}
 spend(amount){this.s.cash=money(this.s.cash-amount);const uncredited=this.s.orders.filter(o=>o.phase==='change-ready').reduce((sum,o)=>sum+(o.due||0),0);this.s.payments.till=Math.min(this.s.payments.till,money(Math.max(0,this.s.cash)+uncredited))}
 fundTill(amount,position){if(!this.nearRegister(position))return 'Rejoignez la caisse au comptoir.';if(!Number.isFinite(amount)||amount<=0||money(amount)!==amount)return 'Choisissez un montant positif en euros.';if(amount>this.availableBank())return 'Le solde disponible hors caisse est insuffisant.';this.s.payments.till=money(this.s.payments.till+amount);return `${amount.toFixed(2)} € ajoutés au fond de caisse depuis votre trésorerie.`}
 canPrepare(id){return Object.hasOwn(recipes,id)&&(!recipes[id].license||this.s.management[recipes[id].license]===true)&&(!recipes[id].clubOnly||buildingLayout(this.s).nightclub)}
 canBuy(key){return Object.hasOwn(ingredients,key)&&(!ingredients[key].license||this.s.management[ingredients[key].license]===true)}
 canMake(id){return this.canPrepare(id)&&Object.entries(recipes[id].ingredients).every(([k,n])=>this.s.stock[k]>=n)}
 serviceCapacity(key){return Object.hasOwn(serviceCapacities,key)?serviceCapacities[key]*(this.s.management.counter?1.5:1):0}
 activeTables(){return availableTables(this.s)}
 decorInfo(category,id){
  const catalog=Object.hasOwn(decorCatalog,category)?decorCatalog[category]:null,option=catalog?.options.find(option=>option.id===id);if(!option)return null;
  const s=this.s,normalized=normalizeDecor(s),owned=normalized.decorOwned[category].includes(id),selected=normalized.decor[category]===id;
  const price=owned?0:option.cost,unlocked=owned||s.totalSold>=option.requiredSales,affordable=s.cash>=price&&!s.gameOver;
  const blockedReason=!selected&&(s.open||s.closing||s.orders.length)?'Fermez le bar et terminez le service avant de changer la décoration.':null;
  return {category,...option,price,owned,selected,unlocked,affordable,blockedReason,purchasable:!selected&&unlocked&&affordable&&!blockedReason};
 }
 purchaseDecor(category,id){
  const info=this.decorInfo(category,id),s=this.s;if(!info)return 'Décoration inconnue.';
  if(s.gameOver)return 'La partie est terminée.';if(info.selected)return 'Cette finition est déjà appliquée.';
  if(info.blockedReason)return info.blockedReason;if(!info.unlocked)return `Encaissez ${info.requiredSales} clients pour débloquer cette finition.`;
  if(!info.affordable)return 'Trésorerie insuffisante.';
  Object.assign(s,normalizeDecor(s));
  if(!info.owned){this.spend(info.price);s.expenses+=info.price;s.decorOwned[category].push(id)}
  s.decor[category]=id;
  return `${info.name} : finition appliquée${info.owned?' sans frais supplémentaires':''}.`;
 }
 buildingInfo(){return {...buildingLayout(this.s),tableCount:this.activeTables().length,maxTables:tables.length,capacity:this.crowdInfo().capacity,maxCapacity:MAX_CUSTOMERS}}
 crowdInfo(){
  const totalSold=Math.max(0,this.s.totalSold),index=crowdStages.findLastIndex(stage=>totalSold>=stage.threshold),stage=crowdStages[index];
  return {totalSold,currentThreshold:stage.threshold,nextThreshold:crowdStages[index+1]?.threshold??null,counterSeatsUnlocked:stage.counterSeatsUnlocked,capacity:this.activeTables().length+stage.counterSeatsUnlocked,spawnInterval:Math.min(stage.spawnInterval,this.s.upgraded?12:16)*(this.s.management.dj&&buildingLayout(this.s).nightclub?.85:1),maxCapacity:MAX_CUSTOMERS};
 }
 upgradeInfo(id){const item=managementUpgrades[id];if(!Object.hasOwn(managementUpgrades,id))return null;const owns=key=>key==='tray'?this.s.upgraded:managementUpgrades[key].requiresClosed?ownsBuildingUpgrade(this.s,key):this.s.management[key],owned=!!owns(id),unmetPrerequisites=item.requires.filter(required=>!owns(required)),unmetArea=item.requiredArea&&buildingLayout(this.s).area<item.requiredArea?item.requiredArea:null,unlocked=owned||this.s.totalSold>=item.requiredSales&&unmetPrerequisites.length===0&&!unmetArea,affordable=this.s.cash>=item.cost&&!this.s.gameOver,blockedReason=!owned&&item.requiresClosed&&(this.s.open||this.s.closing||this.s.orders.length)?'Fermez le bar et terminez le service avant les travaux.':!owned&&unmetArea?`Agrandissez le bâtiment à ${unmetArea} m² pour recruter.`:null;return {id,...item,unmetPrerequisites,unmetArea,owned,unlocked,affordable,blockedReason,purchasable:!owned&&unlocked&&affordable&&!blockedReason}}
 purchaseUpgrade(id){
  const info=this.upgradeInfo(id),s=this.s;if(!info)return 'Amélioration inconnue.';if(s.gameOver)return 'La partie est terminée.';if(info.owned)return 'Déjà installé.';
  if(info.unmetPrerequisites.length)return `Achetez d’abord : ${info.unmetPrerequisites.map(required=>managementUpgrades[required].name).join(', ')}.`;
  if(info.unmetArea)return info.blockedReason;
  if(!info.unlocked)return `Servez ${info.requiredSales} clients pour débloquer cette amélioration.`;
  if(info.blockedReason)return info.blockedReason;
  if(!info.affordable)return 'Trésorerie insuffisante.';
  this.spend(info.cost);s.expenses+=info.cost;
  if(id==='tray'){s.upgraded=true;s.capacity=4}else{s.management[id]=true;if(id==='assistant')s.management.restockTimer=0}
  return id==='tray'?'Plateau agrandi : 4 boissons au lieu de 2.':`${info.name} : achat effectué.`;
 }
 setDeveloperMode(enabled){
  if(typeof enabled!=='boolean')return 'Choisissez si le mode développeur est activé.';
  this.s.developer={enabled,clockPaused:enabled&&this.s.developer?.clockPaused===true};
  return enabled?'Mode développeur activé pour cette partie.':'Mode développeur désactivé. L’horloge reprend son cours.';
 }
 developerAction(action,value){
  const s=this.s;if(s.developer?.enabled!==true)return 'Activez le mode développeur pour cette partie.';
  switch(action){
   case'addMoney':{
    if(!Number.isFinite(value)||value<1||value>1000000||money(value)!==value||s.cash+value>1e9)return 'Choisissez un montant de 1 à 1 000 000 €, avec deux décimales au maximum.';
    s.cash=money(s.cash+value);if(s.cash>=0)s.gameOver=false;
    return `${value.toLocaleString('fr-BE',{maximumFractionDigits:2})} € ajoutés à la trésorerie.`;
   }
   case'addProgress':{
    if(!Number.isSafeInteger(value)||value<1||value>1000||!Number.isSafeInteger(s.totalSold+value))return 'Choisissez de 1 à 1 000 clients de progression.';
    s.totalSold+=value;
    return `${value} clients ajoutés à la progression. Les améliorations restent à acheter.`;
   }
   case'refillStocks':{
    for(const key of ingredientKeys)if(this.canBuy(key)){s.stock[key]=Math.max(s.stock[key],this.serviceCapacity(key));s.reserve[key]=Math.max(s.reserve[key],ingredients[key].pack*5)}
    return 'Comptoir rempli et réserve portée à au moins cinq lots par ingrédient débloqué.';
   }
   case'pauseClock':{
    if(typeof value!=='boolean')return 'Choisissez si l’horloge doit être figée.';
    s.developer.clockPaused=value;
    return value?'Horloge figée. Les clients et les préparations continuent.':'L’horloge reprend son cours.';
   }
   case'advanceTime':{
    if(!s.open||s.closing)return 'Ouvrez le service avant d’avancer l’heure ; la dernière tournée doit être terminée.';
    if(!Number.isFinite(value)||value<1||value>60)return 'Choisissez une avance de 1 à 60 minutes de service.';
    s.time=Math.max(s.time,Math.min(serviceSchedule.closesAt,s.time+value));
    if(s.time>=serviceSchedule.closesAt)s.closing=true;
    return s.closing?'Il est 04:00 : dernière tournée. Terminez le service des clients présents.':`Heure du service avancée à ${formatServiceTime(s.time)}.`;
   }
   default:return 'Action développeur inconnue.';
  }
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
 canWork(position){return !!position&&onFloor(position)&&Number.isFinite(position.x)&&Number.isFinite(position.z)&&position.x>=2.25&&position.x<=10.35&&position.z>=1.15&&position.z<=2.30}
 bartenderJobs(){return ['bartender','bartender2'].flatMap(role=>this.s.staff?.[role]?[{...this.s.staff[role],role}]:[])}
 preparations(){return [this.s.prep,...(this.s.parkedPreps||[])].filter(Boolean)}
 preparationStation(value=this.s.prep){
  const p=typeof value==='object'&&value?value:typeof value==='number'?this.preparations().find(prep=>prep.id===value):this.s.prep?.recipe===value?this.s.prep:null;
  return preparationSlots.find(slot=>slot.id===p?.slotId)||preparationLayout.stations[preparationKind(p?.recipe||value)];
 }
 nearPrepStation(position,value=this.s.prep){return this.canWork(position)&&positionNear(position,this.preparationStation(value),preparationLayout.stationReach)}
 nearPreparationSource(key,position){const point=key==='vessels'?preparationLayout.vessels:preparationLayout.ingredients[key];return !!point&&this.canWork(position)&&positionNear(position,point,preparationLayout.reach)}
 preparationStatus(position,prepId){
  const p=prepId===undefined?this.s.prep:this.preparations().find(prep=>prep.id===prepId);if(!p)return null;
  const remaining=Object.keys(recipes[p.recipe].ingredients).filter(key=>key!=='beer'&&!p.added?.[key]);
  const stage=p.ready?'ready':p.held?.kind==='vessel'?'place-vessel':!p.vesselPlaced?'vessel':p.held?'place-ingredient':remaining.length?'ingredient':p.step===recipes[p.recipe].finishStep?'mix':'pour';
  return {stage,remaining,held:p.held,station:this.preparationStation(p),canWork:this.canWork(position),nearStation:this.nearPrepStation(position,p)};
 }
 preparationQueue(){
  const s=this.s,used=new Set(),preps=this.preparations(),drinks=s.tray.map((drink,index)=>({...drink,index}));
  const rows=s.orders.filter(order=>this.orderPhase(order)==='preparing'&&(order.arrivalRemaining||0)<=0).map(order=>({orderId:order.id,recipe:order.recipe,place:order.tableId?'Table '+order.tableId:'Comptoir '+((order.slot??0)+1),name:order.name,status:'todo',prepId:null}));
  const claim=(orderId,recipe,status,prepId)=>{const row=rows.find(row=>row.orderId===orderId&&row.recipe===recipe&&row.status==='todo');if(row){row.status=status;row.prepId=prepId??null;}return !!row;};
  const waiter=s.staff.waiter;
  if(waiter?.task==='serve')claim(waiter.orderId,waiter.recipe||waiter.drink?.recipe,'serving');
  for(const drink of drinks)if(drink.orderId&&claim(drink.orderId,drink.recipe,'ready'))used.add(drink.index);
  for(const bartender of this.bartenderJobs())if(claim(bartender.orderId,bartender.recipe,'preparing'))rows.find(row=>row.orderId===bartender.orderId).worker=bartender.role;
  for(const p of preps)if(p.orderId)claim(p.orderId,p.recipe,p.ready?'ready':'preparing',p.id);
  for(const drink of drinks)if(!drink.orderId&&!used.has(drink.index)){const row=rows.find(row=>row.recipe===drink.recipe&&row.status==='todo');if(row){claim(row.orderId,row.recipe,'ready');used.add(drink.index)}}
  for(const p of preps)if(!p.orderId){const row=rows.find(row=>row.recipe===p.recipe&&row.status==='todo');if(row)claim(row.orderId,row.recipe,p.ready?'ready':'preparing',p.id)}
  return rows;
 }
 freePreparationSlot(recipe){const occupied=new Set(this.preparations().map(p=>p.slotId));return preparationSlots.find(slot=>slot.kind===preparationKind(recipe)&&!occupied.has(slot.id))||null}
 preparationStartError(id,position,orderId){
  const s=this.s;if(!Object.hasOwn(recipes,id))return 'Boisson inconnue.';
  if(!this.canWork(position))return 'Rejoignez l’espace de travail derrière le comptoir pour préparer une boisson.';
  if(!s.open||s.gameOver)return 'Ouvrez le bar avant de préparer.';
  if(this.preparations().some(p=>p.held))return 'Posez d’abord le récipient ou l’ingrédient que vous tenez.';
  if(s.prep&&!s.prep.vesselPlaced)return 'Prenez et posez d’abord le récipient de la préparation active.';
  if(!this.canPrepare(id))return `Achetez la ${managementUpgrades[recipes[id].license].name.toLocaleLowerCase('fr-BE')} dans la tablette pour préparer cette boisson.`;
  if(!this.canMake(id))return 'Il manque des ingrédients. Réapprovisionnez le comptoir depuis la réserve.';
  if(!this.freePreparationSlot(id))return 'Tous les emplacements de ce poste sont occupés. Terminez une boisson pour libérer une place.';
  if(orderId!=null&&!this.preparationQueue().some(row=>row.orderId===orderId&&row.recipe===id&&row.status==='todo'))return 'Cette commande est déjà en préparation ou n’est plus à réaliser.';
  return null;
 }
 preparationAvailability(id,position,orderId){
  if(!this.nearPreparationSource('vessels',position))return 'Approchez-vous du rangement des verres derrière le bar.';
  return this.preparationStartError(id,position,orderId);
 }
 start(id,position,orderId){
  const error=this.preparationStartError(id,position,orderId);if(error)return error;
  const s=this.s,slot=this.freePreparationSlot(id),order=this.preparationQueue().find(row=>row.recipe===id&&row.status==='todo'&&(orderId==null||row.orderId===orderId));
  this.setPour(false);s.parkedPreps??=[];if(s.prep)s.parkedPreps.push(s.prep);
  s.nextPrepId=Number.isSafeInteger(s.nextPrepId)&&s.nextPrepId>0?s.nextPrepId:1;
  s.prep={id:s.nextPrepId++,slotId:slot.id,orderId:order?.orderId??null,recipe:id,physical:true,vesselPlaced:false,held:null,added:{},step:0,amount:0,pouring:false,ready:false,quality:0};
  return 'Prenez '+recipes[id].glass.toLocaleLowerCase('fr-BE')+' au rangement derrière le bar.';
 }
 beginAtVessels(id,position,orderId){
  const error=this.preparationAvailability(id,position,orderId);if(error)return error;
  this.start(id,position,orderId);return this.takeVessel(position);
 }
 selectPreparation(id,position){
  const s=this.s,p=this.preparations().find(prep=>prep.id===id);if(!p)return 'Cette préparation n’est plus disponible.';
  if(!this.nearPrepStation(position,p))return 'Approchez-vous de cette préparation derrière le comptoir.';
  if(s.prep===p)return null;
  if(this.preparations().some(prep=>prep.held))return 'Posez d’abord le récipient ou l’ingrédient que vous tenez.';
  this.setPour(false);s.parkedPreps=s.parkedPreps.filter(prep=>prep!==p);if(s.prep)s.parkedPreps.push(s.prep);s.prep=p;
  return recipes[p.recipe].name+' sélectionné.';
 }
 takeVessel(position){
  const p=this.s.prep;if(!p)return 'Choisissez une boisson au rangement des verres.';
  if(!this.nearPreparationSource('vessels',position))return 'Approchez-vous du rangement des verres derrière le bar.';
  if(p.held)return 'Posez d’abord ce que vous tenez au poste de préparation.';
  if(p.vesselPlaced)return 'Le récipient est déjà sur le poste.';
  p.held={kind:'vessel'};return recipes[p.recipe].glass+' pris. Posez-le au poste de préparation.';
 }
 takeIngredient(key,position){
  const p=this.s.prep;if(!p)return 'Choisissez une boisson au rangement des verres.';
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
  if(!v){for(const prep of this.preparations())prep.pouring=false;return}const p=this.s.prep;if(!p)return;
  if(!this.nearPrepStation(position)){p.pouring=false;return 'Rejoignez le poste pour doser la boisson.'}
  if(!this.isPour()){p.pouring=false;return 'Apportez d’abord le récipient et tous les ingrédients au poste.'}
  if(p.recipe==='beer'&&!p.added.beer){const amount=recipes.beer.ingredients.beer;if(this.s.stock.beer<amount){p.pouring=false;return 'Le fût est vide : réapprovisionnez la bière.'}this.s.stock.beer-=amount;p.added.beer=true}
  p.pouring=true;
 }
 finishPour(position){const p=this.s.prep;if(!this.nearPrepStation(position))return 'Rejoignez le poste pour terminer le dosage.';if(!this.isPour())return;if(p.recipe==='beer'&&!p.added.beer)return 'Tirez d’abord la bière au robinet.';p.pouring=false;const r=recipes[p.recipe];p.quality=Math.max(0,Math.round(100-Math.abs(p.amount-r.target)/r.target*180));if(Number.isInteger(r.finishStep))p.step=r.finishStep;else p.ready=true}
 finishMix(position){const p=this.s.prep;if(!this.nearPrepStation(position))return 'Rejoignez le poste pour mélanger la boisson.';if(p&&!p.ready&&!p.held&&Number.isInteger(recipes[p.recipe].finishStep)&&p.step===recipes[p.recipe].finishStep)p.ready=true}
 plate(position){const s=this.s,p=s.prep;if(!this.nearPrepStation(position))return 'Rejoignez le poste pour prendre la boisson préparée.';if(!p?.ready)return 'Terminez la préparation.';if(s.tray.length+this.bartenderJobs().length>=s.capacity)return 'Le plateau est plein.';const drink={recipe:p.recipe,quality:p.quality};if(p.orderId&&s.orders.some(order=>order.id===p.orderId&&order.recipe===p.recipe&&this.orderPhase(order)==='preparing'))drink.orderId=p.orderId;s.tray.push(drink);s.prep=null;return 'Boisson déposée sur le plateau.'}
 discard(index){let s=this.s;if(index===undefined){if(!s.prep)return;s.prep=null;}else{if(!s.tray[index])return;s.tray.splice(index,1)}s.waste++;return 'Boisson jetée. Les ingrédients sont perdus.'}
 takeOrder(id,position){const order=this.s.orders.find(o=>o.id===id);if(!order)return 'Ce client est déjà parti.';if(!this.canReachOrder(id,position))return 'Approchez-vous de la table pour prendre la commande.';if(this.orderPhase(order)!=='awaiting-order')return 'La commande a déjà été prise.';order.phase='preparing';order.patience=100;return `Table ${order.tableId} : ${recipes[order.recipe].name}. Commande envoyée au bar.`}
 trayDrinkIndex(order){return this.s.tray.findIndex(drink=>drink.recipe===order.recipe&&(!drink.orderId||drink.orderId===order.id))}
 serve(id,position){const s=this.s,order=s.orders.find(o=>o.id===id);if(!order)return 'Ce client est déjà parti.';if(!this.canReachOrder(id,position))return 'Approchez-vous du client pour apporter sa boisson.';if(this.orderPhase(order)!=='preparing')return this.orderPhase(order)==='awaiting-order'?'Prenez d’abord sa commande.':'Ce client a déjà été servi.';if(s.staff.waiter?.task==='serve'&&s.staff.waiter.orderId===id)return 'Le serveur apporte déjà cette commande.';const index=this.trayDrinkIndex(order);if(index<0)return 'Préparez '+recipes[order.recipe].name+' et posez-le sur le plateau.';return this.deliverDrink(order,s.tray.splice(index,1)[0])}
 deliverDrink(order,drink){const s=this.s;if(drink.quality<40){this.removeOrder(order);s.lost++;return 'Boisson refusée : dosage trop éloigné de la recette.'}order.tip=(drink.quality>=85&&order.patience>25?1:0)+(s.management.dj&&this.activeTables().some(table=>table.id===order.tableId&&table.floor==='nightclub')?1:0);order.due=money(recipes[order.recipe].price+order.tip);order.paymentMethod=order.paymentMethod==='cash'?'cash':'card';order.tender=[5,10,20,50,100].find(note=>note>=order.due)||order.due;if(order.paymentMethod==='cash'&&order.tender===order.due&&order.id%2===1)order.tender=Math.min(100,order.tender*2);order.phase='drinking';order.drinkRemaining=order.tableId?8:4;order.patience=Math.max(25,order.patience);this.releaseOrderDrinks(order.id);return 'Boisson servie. Le client vous demandera ensuite l’addition.'}
 collectCash(id,position,actor='player'){const guard=this.paymentGuard(id,actor);if(guard)return guard;const order=this.s.orders.find(o=>o.id===id);if(!order)return 'Ce client est déjà parti.';if(!this.canReachOrder(id,position))return 'Approchez-vous du client pour prendre les espèces.';if(this.orderPhase(order)!=='payment'||order.paymentMethod!=='cash')return 'Ce client ne vous remet pas d’espèces maintenant.';order.phase='cash-collected';return `${order.tender.toFixed(2)} € reçus. Rejoignez la caisse pour préparer la monnaie.`}
 prepareChange(id,amount,position,actor='player'){const guard=this.paymentGuard(id,actor);if(guard)return guard;const s=this.s,order=s.orders.find(o=>o.id===id);if(!this.nearRegister(position))return 'Rejoignez la caisse au comptoir.';if(!order||this.orderPhase(order)!=='cash-collected')return 'Aucun encaissement en espèces à traiter pour ce client.';const expected=money(order.tender-order.due);if(!Number.isFinite(amount)||amount<0||Math.abs(amount-expected)>.000001)return 'Le montant de monnaie est incorrect. Vérifiez le total et les espèces reçues.';if(s.payments.till+1e-9<expected)return 'Le fond de caisse est insuffisant pour rendre la monnaie. Ajoutez des espèces depuis la trésorerie.';s.payments.till=money(s.payments.till+order.due);order.change=expected;order.phase='change-ready';return expected?`${expected.toFixed(2)} € de monnaie préparés. Rapportez-les au client.`:'Paiement exact. Rapportez le ticket au client.'}
 completeCash(id,position,actor='player'){const guard=this.paymentGuard(id,actor);if(guard)return guard;const order=this.s.orders.find(o=>o.id===id);if(!order||this.orderPhase(order)!=='change-ready')return 'Préparez la monnaie à la caisse avant de revenir.';if(!this.canReachOrder(id,position))return 'Retournez auprès du client pour terminer l’encaissement.';this.finishPayment(order,'cash');return 'Monnaie et ticket remis. Paiement enregistré.'}
 pickupTerminal(position,actor='player'){const p=this.s.payments;if(!this.nearRegister(position))return 'Le terminal sans fil se trouve à côté de la caisse.';if(actor==='waiter'){if(p.terminalCarried||p.terminalWithWaiter)return 'Le terminal est déjà utilisé.';p.terminalWithWaiter=true;return 'Terminal pris par le serveur.'}if(p.terminalWithWaiter||this.s.staff.waiter?.task==='pickup-terminal')return 'Le serveur utilise le terminal. Il le rapportera sur son socle.';if(p.terminalCarried)return 'Vous avez déjà le terminal.';p.terminalCarried=true;return 'Terminal sans fil pris. Apportez-le au client qui paie par carte.'}
 returnTerminal(position,actor='player'){const p=this.s.payments;if(!this.nearRegister(position))return 'Reposez le terminal sur son socle au comptoir.';if(p.terminalOrderId!==null)return 'Attendez la confirmation du paiement en cours.';if(actor==='waiter'){p.terminalWithWaiter=false;return 'Terminal rapporté par le serveur.'}if(p.terminalWithWaiter)return 'Le serveur rapporte le terminal.';if(!p.terminalCarried)return 'Le terminal est déjà sur son socle.';p.terminalCarried=false;return 'Terminal reposé sur son socle.'}
 payCard(id,position,actor='player'){const guard=this.paymentGuard(id,actor);if(guard)return guard;const s=this.s,order=s.orders.find(o=>o.id===id);if(!order||this.orderPhase(order)!=='payment'||order.paymentMethod!=='card')return 'Aucun paiement par carte disponible pour ce client.';if(!(actor==='waiter'?s.payments.terminalWithWaiter:s.payments.terminalCarried))return 'Prenez le terminal sans fil au comptoir.';if(s.payments.terminalOrderId!==null)return 'Le terminal traite déjà un paiement.';if(!this.canReachOrder(id,position))return 'Apportez le terminal auprès du client.';order.phase='card-processing';order.cardRemaining=3;s.payments.terminalOrderId=id;return 'Carte présentée. Autorisation en cours…'}
 finishPayment(order,method){const s=this.s;if(!s.orders.includes(order))return;const amount=money(order.due);s.cash=money(s.cash+amount);s.revenue=money(s.revenue+amount);s.payments[method==='cash'?'cashRevenue':'cardRevenue']=money(s.payments[method==='cash'?'cashRevenue':'cardRevenue']+amount);s.sold++;s.totalSold++;s.payments.receipts.unshift({id:order.id,day:s.day,customerName:order.name||'Client',tableId:order.tableId??null,recipe:order.recipe,method,amount,tip:order.tip||0,time:s.time});s.payments.receipts.length=Math.min(40,s.payments.receipts.length);this.removeOrder(order)}
 releaseOrderDrinks(id){for(const drink of this.s.tray)if(drink.orderId===id)delete drink.orderId;for(const p of this.preparations())if(p.orderId===id)p.orderId=null}
 removeOrder(order){const s=this.s;s.orders=s.orders.filter(o=>o!==order);this.releaseOrderDrinks(order.id);if(s.payments.terminalOrderId===order.id)s.payments.terminalOrderId=null}
 upgrade(){return this.purchaseUpgrade('tray')}
 close(){if(!this.s.open)return;this.s.closing=true;return 'Dernières commandes : servez et encaissez les clients restants.'}
 end(){let s=this.s;if(s.orders.length||s.payments.terminalWithWaiter||s.staff.waiter?.task==='return-terminal')return null;const salaries=Object.entries(managementUpgrades).reduce((sum,[id,offer])=>sum+(offer.category==='team'&&s.management[id]?offer.salary:0),0),charges=35+salaries;this.spend(charges);s.waste+=s.tray.length+this.preparations().length+this.bartenderJobs().length+(s.staff.waiter?.drink?1:0);s.lastReport={day:s.day,revenue:s.revenue,cashRevenue:s.payments.cashRevenue,cardRevenue:s.payments.cardRevenue,expenses:s.expenses,charges,salaries,profit:s.revenue-s.expenses-charges,sold:s.sold,lost:s.lost,waste:s.waste};s.open=false;s.closing=false;s.orders=[];s.tray=[];s.prep=null;s.parkedPreps=[];s.staff={bartender:null,bartender2:null,waiter:null,waiterPosition:{x:1.05,z:4.5}};s.payments.terminalWithWaiter=false;s.payments.cashRevenue=0;s.payments.cardRevenue=0;s.payments.terminalOrderId=null;s.management.restockTimer=0;s.gameOver=s.cash<0;s.day++;s.time=serviceSchedule.opensAt;s.sold=0;s.lost=0;s.revenue=0;s.expenses=0;s.waste=0;return s.lastReport}
 staffTick(dt){
  const s=this.s;
  for(const role of ['bartender','bartender2']){
   let job=s.staff[role];
   if(job){
    const order=s.orders.find(order=>order.id===job.orderId);
    if(!s.management[role]||!order||this.orderPhase(order)!=='preparing'||!this.canPrepare(job.recipe)){s.waste++;s.staff[role]=null}
    else {job.remaining=Math.max(0,job.remaining-dt);if(job.remaining<=1e-9&&s.tray.length<s.capacity){s.tray.push({recipe:job.recipe,quality:92,orderId:job.orderId});s.staff[role]=null}}
   }
   if(s.management[role]&&!s.staff[role]&&s.tray.length+this.bartenderJobs().length<s.capacity){
    const pending=this.preparationQueue().find(row=>row.status==='todo'&&this.canMake(row.recipe));const order=s.orders.find(order=>order.id===pending?.orderId);
    if(order){for(const [key,amount]of Object.entries(recipes[order.recipe].ingredients))s.stock[key]-=amount;const total=Math.max(8,recipes[order.recipe].steps.length*2);s.staff[role]={orderId:order.id,recipe:order.recipe,remaining:total,total}}
   }
  }
  this.waiterTick(dt);
 }
 waiterTick(dt){
  const s=this.s,p=s.payments;let job=s.staff.waiter;
  if(job){
   const order=s.orders.find(order=>order.id===job.orderId);
   if(job.task==='wait-card'&&!order&&p.terminalWithWaiter){this.assignWaiterJob('return-terminal',null);job=s.staff.waiter;}
   else if(!s.management.waiter||!this.validWaiterJob(job,order)){
    if(job.drink){delete job.drink.orderId;if(s.tray.length+this.bartenderJobs().length<s.capacity)s.tray.push(job.drink);else s.waste++}
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
 customerRoute(order){
  const table=this.activeTables().find(table=>table.id===order?.tableId);
  if(table){
   const seat={x:table.x+(table.x<6?.78:-.78),y:table.y||0,z:table.z};
   if(table.floor){return [{x:6,y:0,z:9.3},{x:6,y:0,z:5.25},...this.expansionPath(seat)];}
   if(table.x>12){const aisle=table.x<16.5?12.9:17.4;return [{x:6,z:9.3},{x:6,z:5.25},{x:aisle,z:5.25},{x:aisle,z:seat.z},seat];}
   return [{x:6,z:9.3},{x:6,z:seat.z+.65},{x:seat.x+(seat.x<6?.6:-.6),z:seat.z+.65},seat];
  }
  const counter=this.counterSeat(order);return [{x:6,z:9.3},{x:6,z:5.45},{x:counter.x,z:5.45},{...counter}];
 }
 spawnCustomer(){
  const s=this.s,crowd=this.crowdInfo();
  if(s.closing||s.gameOver||s.orders.length>=crowd.capacity)return;
  const freeTables=this.activeTables().filter(table=>!s.orders.some(order=>order.tableId===table.id)),freeSlots=counterSeats.slice(0,crowd.counterSeatsUnlocked).filter(seat=>!s.orders.some(order=>!order.tableId&&this.counterSeat(order).slot===seat.slot)).map(seat=>seat.slot);
  if(!freeTables.length&&!freeSlots.length)return;
  const preferTable=(s.nextId%2===1&&freeTables.length)||!freeSlots.length,table=preferTable?freeTables[Math.floor(Math.random()*freeTables.length)]:null;
  const club=table?.floor==='nightclub',nightMenu=club?Object.keys(recipes).filter(id=>recipes[id].clubOnly&&this.canPrepare(id)):[];
  const ids=nightMenu.length?nightMenu:Object.keys(recipes).filter(id=>!recipes[id].clubOnly&&this.canPrepare(id)),recipe=ids[Math.floor(Math.random()*ids.length)];
  const aisle=table?.x>16.5?17.4:12.9,arrivalDuration=table?.floor?Math.min(30,this.waiterRouteLength(this.customerRoute({tableId:table.id}))/1.5):table?.upgrade?Math.min(30,(4.05+Math.abs(aisle-6)+Math.abs(table.z-5.25)+Math.abs(table.x-.78-aisle))/1.5):3;
  s.orders.push({id:s.nextId++,name:names[Math.floor(Math.random()*names.length)],recipe,patience:100,tableId:table?.id??null,slot:table?null:freeSlots[0],phase:table?'awaiting-order':'preparing',...(table?.upgrade?{arrivalDuration}:{}),arrivalRemaining:arrivalDuration,drinkRemaining:0,paymentMethod:Math.random()<.5?'cash':'card',due:0,tender:0,cardRemaining:0});
  s.spawn=crowd.spawnInterval;
 }
 tick(dt){let s=this.s;if(!Number.isFinite(dt))return;dt=Math.min(.1,Math.max(0,dt));for(let d of s.deliveries){d.remaining-=dt;if(d.remaining<=0)s.reserve[d.key]+=ingredients[d.key].pack}s.deliveries=s.deliveries.filter(d=>d.remaining>0);if(!s.open)return;
  if(s.management.assistant){s.management.restockTimer+=dt;if(s.management.restockTimer>=12-1e-9){s.management.restockTimer=Math.max(0,s.management.restockTimer-12);for(const key of ingredientKeys)this.restock(key)}}
  if(s.prep?.pouring&&this.isPour()){s.prep.amount=Math.min(recipes[s.prep.recipe].target*1.6,s.prep.amount+recipes[s.prep.recipe].speed*dt)}if(!(s.developer?.enabled&&s.developer.clockPaused))s.time+=dt*serviceSchedule.minutesPerSecond;if(s.time>=serviceSchedule.closesAt-1e-9){s.time=Math.max(s.time,serviceSchedule.closesAt);s.closing=true;}
  for(const order of [...s.orders]){
   if(order.arrivalRemaining>0){order.arrivalRemaining=Math.max(0,order.arrivalRemaining-dt);continue}
   const phase=this.orderPhase(order);
   if(phase==='awaiting-order'||phase==='preparing'){order.patience-=dt*(s.management.floorManager?.8:1)*(s.management.host?.85:1);if(order.patience<=0){this.removeOrder(order);s.lost++}}
   else if(phase==='drinking'){order.drinkRemaining=Math.max(0,(order.drinkRemaining||0)-dt);if(order.drinkRemaining<=1e-9)order.phase='payment'}
   else if(phase==='card-processing'){order.cardRemaining=Math.max(0,(order.cardRemaining||0)-dt);if(order.cardRemaining<=1e-9)this.finishPayment(order,'card')}
  }
  this.staffTick(dt);
  // Do not accumulate missed arrivals while all available seats are occupied.
  s.spawn=Math.max(0,s.spawn-dt);if(!s.closing&&s.spawn<=1e-9)this.spawnCustomer();if(s.closing&&s.orders.length===0)return this.end()}
}
const api={Game,ingredients,recipes,serviceSchedule,formatServiceTime,serviceInfo,serviceCapacities,managementUpgrades,isValidStock,tables,counterSeats,crowdStages,MAX_CUSTOMERS,registerPosition,preparationLayout,preparationSlots,buildingLayout,buildingZones,availableTables,decorCatalog,decorStyle};if(typeof module!=='undefined')module.exports=api;root.BarEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
