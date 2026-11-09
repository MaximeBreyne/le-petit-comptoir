const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={};const el=()=>({style:{setProperty(){}},dataset:{},open:false,showModal(){this.open=true},close(){this.open=false},getContext(){return {}},setPointerCapture(){}});
const sandbox={document:{getElementById(id){return elements[id]??=el()},querySelectorAll(){return []},addEventListener(){},exitPointerLock(){}},localStorage:{getItem(){return null},setItem(k,v){JSON.parse(v)}},innerWidth:1280,innerHeight:800,performance:{now(){return 0}},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},setInterval(){},console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);
vm.runInContext(`
serve(); if(!state.open)throw Error('Ouverture');
client={name:'Test',item:0,qty:2,patience:45};serve();
if(state.cash!==374||state.stock[0]!==6||state.sales!==1)throw Error('Encaissement');
client={name:'Test',item:0,qty:99,patience:45};serve();
if(state.cash!==374||state.stock[0]!==6)throw Error('Stock insuffisant');
document.getElementById('modalContent').onclick({target:{matches(){return true},dataset:{buy:'1'}}});
if(state.cash!==362||state.stock[1]!==20)throw Error('Commande');
state.sales=5;document.getElementById('upgrade').onclick();
if(!state.coffee||state.cash!==182)throw Error('Amélioration');
endDay();if(state.day!==2||state.cash!==147||state.minute!==480||state.open)throw Error('Fin de journée');
`,sandbox);
console.log('OK : ouverture, vente, rupture de stock, commande, amélioration, fin de journée et sauvegarde.');
