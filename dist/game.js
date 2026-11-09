const $=id=>document.getElementById(id), money=n=>n.toLocaleString('fr-BE',{style:'currency',currency:'EUR'});
const {Game,ingredients,recipes}=BarEngine;
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const servicePhaseLabels={'awaiting-order':'Commande à prendre',preparing:'Boisson à préparer',drinking:'Déguste sa boisson',payment:'Attend l’addition','cash-collected':'Espèces reçues · allez à la caisse','change-ready':'Monnaie prête · retournez au client','card-processing':'Paiement par carte en cours'};
// Keep unchanged DOM nodes: keyboard focus and held controls survive UI refreshes.
function updateHTML(element,html){if(element._html!==html){element.innerHTML=html;element._html=html}}
let saved=null;try{saved=JSON.parse(localStorage.getItem('comptoir-bar-v2'))}catch{}
const game=new Game(saved);let state=game.s,client=null,paused=false,last=performance.now(),elapsed=0,toastTimer,saveFailed=false;
function save(force=false){if(force!==true&&window.GameMenu&&!GameMenu.canAutosave())return;try{localStorage.setItem('comptoir-bar-v2',JSON.stringify(game.s));saveFailed=false;window.GameMenu?.didAutosave()}catch{if(!saveFailed){toast('Sauvegarde indisponible : vérifiez l’espace disque.');saveFailed=true}}}
function toast(message){if(!message)return;$('toast').textContent=message;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,4000)}
function modal(title,html){game.setPour(false);keys={};window.BarTablet?.close({suspend:true});if(window.BarInput)BarInput.suspend();else document.exitPointerLock?.();$('modalTitle').textContent=title;$('modalContent').innerHTML=html;$('modal').showModal()}
function act(fn){if(paused){toast('Reprenez la partie pour continuer.');return}const sales=game.s.totalSold,result=fn();toast(result);audio.chime(game.s.totalSold>sales?'sale':'click');state=game.s;save();ui()}
function ui(){state=game.s;$('cash').textContent=money(state.cash);$('day').textContent='SOIR '+state.day;const t=Math.min(1440,state.time);$('clock').textContent=t>=1440?'00:00':String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');$('pause').textContent=paused?'Reprendre':'Pause';$('mission').textContent=state.gameOver?'Trésorerie épuisée. Commencez un nouveau bar.':state.totalSold<5?`Servez 5 clients pour agrandir le plateau (${state.totalSold}/5).`:`${state.totalSold} clients servis · Soignez le dosage pour gagner des pourboires.`;$('progress').style.setProperty('--progress',Math.min(100,state.totalSold*20)+'%');$('serviceStatus').textContent=state.closing?'DERNIÈRE TOURNÉE':state.open?'OUVERT':'FERMÉ';$('open').disabled=state.open||state.gameOver;$('open').textContent=state.open?'Service en cours':'Ouvrir le bar';$('end').disabled=!state.open||state.closing;
 updateHTML($('customers'),state.orders.length?state.orders.map(o=>{
  const phase=game.orderPhase(o),arriving=o.arrivalRemaining>0,known=phase!=='awaiting-order';
  const place=o.tableId?`Table ${o.tableId}`:'Comptoir',canServe=!arriving&&phase==='preparing'&&game.canReachOrder(o.id,camera)&&state.tray.some(t=>t.recipe===o.recipe&&(!t.orderId||t.orderId===o.id));
  return `<div class="customer"><strong>${escapeHTML(o.name)}</strong> · ${place}<small>${arriving?'Arrive dans le bar':servicePhaseLabels[phase]||phase}${known?' · '+escapeHTML(recipes[o.recipe].name):''}</small>${['awaiting-order','preparing'].includes(phase)?`<div class="patience"><i style="width:${Math.max(0,Math.ceil(o.patience))}%"></i></div>`:''}<button ${canServe?`data-serve="${o.id}"`:`data-service-order="${o.id}"`}>${canServe?'Servir la boisson':'Voir sur la tablette'}</button></div>`;
 }).join(''):'<p class="empty">'+(state.open?'Un instant de calme. Les clients peuvent s’installer aux tables ou au comptoir.':'Ouvrez à 17 h et accueillez vos premiers habitués.')+'</p>');
 $('register').textContent=state.payments?.terminalCarried?'Caisse · terminal en main':'Caisse';
 updateHTML($('stock'),Object.entries(ingredients).map(([k,i])=>`<div class="row"><span>${i.name}<br><small>Réserve : ${Math.round((state.reserve?.[k]||0)*10)/10} ${i.unit}</small></span><b>${Math.round(state.stock[k]*10)/10} ${i.unit}</b></div>`).join('')+state.deliveries.map(d=>`<p class="delivery">Vers la réserve : ${ingredients[d.key].name} · ${Math.ceil(d.remaining)} s</p>`).join(''));
 $('upgrade').disabled=false;$('upgrade').textContent='Gérer';$('upgradeText').textContent=state.upgraded?'Plateau de 4 boissons installé.':'Améliorations, licences et équipe dans la tablette.';$('trayCount').textContent=`PLATEAU ${state.tray.length}/${state.capacity}`;
 const p=state.prep;let html='<p class="empty">Choisissez une boisson. Sélectionnez le récipient, puis réalisez les étapes de la recette. Les ingrédients sont prélevés dès le début.</p>';
 if(p){let r=recipes[p.recipe];html=`<div class="sectionTitle"><strong>${r.name}</strong><span>${r.glass}</span></div><p class="steps">${r.steps.map((s,i)=>i===p.step?'<strong>'+s+'</strong>':s).join(' → ')}</p>`;
 if(p.ready)html+=`<p>Dosage : <strong>${p.quality}%</strong> · ${p.quality<40?'La boisson sera refusée.':p.quality>=85?'Excellent ! Pourboire possible.':'Boisson acceptable.'}</p><div class="actions"><button class="primary" data-action="plate">Poser sur le plateau</button>`;
 else if(game.isPour())html+=`<p>Objectif : ${r.target} ${r.unit} · <span class="amount" id="amount"></span></p><div class="pourbar"><em></em><i id="fill"></i></div><div class="actions"><button class="primary" id="pour" data-action="pour">Maintenir pour ${p.recipe==='coffee'?'extraire':'verser'}</button><button data-action="finish">Valider le dosage</button>`;
 else html+=`<div class="actions"><button class="primary" data-action="step">${p.recipe==='mojito'&&p.step===5?'Mélanger et terminer':r.steps[p.step]}</button>`;
 html+='<button data-action="discard">Jeter</button></div>'}
 // Preserve the held button during pouring; replace only when the preparation stage changes.
 const viewKey=p?`${p.recipe}:${p.step}:${p.ready}`:'empty';if($('prep').dataset.view!==viewKey){$('prep').innerHTML=html;$('prep').dataset.view=viewKey}
 if(p&&game.isPour()){$('amount').textContent=p.amount.toFixed(1)+' '+recipes[p.recipe].unit;$('fill').style.width=Math.min(100,p.amount/(recipes[p.recipe].target*1.5)*100)+'%'}
 updateHTML($('tray'),state.tray.length?state.tray.map((t,i)=>`<span class="drink">${recipes[t.recipe].name} · ${t.quality}% <button data-remove="${i}" aria-label="Jeter cette boisson">×</button></span>`).join(''):'<span class="empty">Plateau vide · Les boissons restent ici jusqu’au service.</span>');
 window.BarTablet?.refresh();
 if(window.BarInput&&typeof camera!=='undefined')BarInput.refresh();
}
$('open').onclick=()=>act(()=>game.open());$('end').onclick=()=>act(()=>game.close());$('upgrade').onclick=()=>BarTablet.open('building');$('chooseDrink').onclick=$('tablet').onclick=()=>BarTablet.open('drinks');$('register').onclick=()=>BarTablet.open('register');$('customers').onclick=e=>{let b=e.target.closest('[data-serve]');if(b)act(()=>game.serve(+b.dataset.serve,camera));else{b=e.target.closest('[data-service-order]');if(b)BarTablet.open('service',+b.dataset.serviceOrder)}};$('tray').onclick=e=>{let b=e.target.closest('[data-remove]');if(b)act(()=>game.discard(+b.dataset.remove))};
$('prep').onclick=e=>{const b=e.target.closest('[data-action]');if(!b||b.dataset.action==='pour')return;act(()=>{switch(b.dataset.action){case 'step':if(game.s.prep.recipe==='mojito'&&game.s.prep.step===5)game.finishMix();else game.step();break;case 'finish':game.finishPour();break;case 'plate':return game.plate();case 'discard':return game.discard()}})};
$('prep').onpointerdown=e=>{let b=e.target.closest('#pour');if(b&&!paused){b.setPointerCapture(e.pointerId);game.setPour(true);e.preventDefault()}};$('prep').onpointerup=$('prep').onpointercancel=()=>game.setPour(false);
function supplier(){BarTablet.open('reserve')}
$('order').onclick=supplier;$('close').onclick=()=>$('modal').close();
$('help').onclick=()=>modal('Bienvenue derrière le bar',`<p><strong>Tab : votre tablette. E : interagir à proximité.</strong> Les clients s’installent aux quatre tables numérotées ou au comptoir. Rejoignez une table et ouvrez Service pour prendre sa commande ; elle apparaît alors dans la tablette.</p><p><strong>Préparer et apporter.</strong> Choisissez la recette, suivez les étapes, maintenez la touche pour doser, validez et posez la boisson sur le plateau. Revenez près du client pour la servir. Cliquez sur le décor ou rangez la tablette pour reprendre la caméra.</p><p><strong>Espèces.</strong> Après la dégustation, prenez l’argent à la table. Rejoignez la caisse derrière le bar et appuyez sur E. Sélectionnez les pièces et billets à rendre, puis rapportez la monnaie et le ticket au client. Les recettes sont enregistrées une seule fois, à la fin de l’encaissement. Le fond de caisse fait partie de votre trésorerie.</p><p><strong>Carte bancaire.</strong> Prenez le terminal sans fil à la caisse, apportez-le au client et lancez son paiement depuis Service. Attendez trois secondes pour la confirmation. Le terminal reste avec vous jusqu’à son retour sur le socle.</p><p><strong>Votre équipe.</strong> Recrutez progressivement l’aide de réserve, le préparateur de boissons et le serveur. Le préparateur utilise vos ingrédients ; le serveur prend les commandes et apporte les boissons. Les paiements restent à votre charge. Chaque employé a un salaire par soir.</p><p><strong>Réserve.</strong> La pièce est derrière le bar, à gauche. E ouvre ses stocks ; les livraisons y arrivent après dix secondes et doivent être transférées au comptoir.</p><p><strong>Maj : courir · Échap : pause · F11 : plein écran.</strong> La tablette laisse le service continuer. Les paramètres mettent le jeu en pause ; « Revenir au jeu » reprend immédiatement la partie. Le bilan attend la fin des commandes et paiements. Charges de base : 35 € plus les salaires.</p>`);
// Static architecture and dynamic props use the same depth-tested scene.
const canvas=$('world');let camera={...BarScene.playCamera},keys={};const boxes=BarScene.create();
let renderer=null,visualTime=0;const customerVisuals=new Map();
let waiterVisual=null;
try{renderer=new BarRenderer(canvas,boxes)}catch(error){$('graphicsError').hidden=false;$('graphicsError').textContent=error.message;console.error(error)}
function interactionTarget(){
 if(BarScene.inStockroom(camera))return {section:'reserve',label:'E : gérer les stocks de la réserve.'};
 if(game.nearRegister(camera))return {section:'register',label:'E : utiliser la caisse et prendre le terminal.'};
 const near=state.orders.filter(order=>game.canReachOrder(order.id,camera)).sort((a,b)=>{
  const position=o=>BarEngine.tables.find(t=>t.id===o.tableId)||{x:4.6+(o.slot||0)*1.4,z:2.1};
  const p=position(a),q=position(b);return Math.hypot(camera.x-p.x,camera.z-p.z)-Math.hypot(camera.x-q.x,camera.z-q.z);
 })[0];
 if(near)return {section:'service',orderId:near.id,label:`E : ${near.tableId?'table '+near.tableId:'client au comptoir'} · commande, service et règlement.`};
 const table=BarEngine.tables.find(t=>Math.hypot(camera.x-t.x,camera.z-t.z)<1.7);
 if(table)return {section:'service',label:`E : consulter la table ${table.id}.`};
 return null;
}
function routeLength(route){return route.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-route[i].x,p.z-route[i].z),0)}
function alongRoute(route,progress){
 let distance=routeLength(route)*Math.max(0,Math.min(1,progress));
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],length=Math.hypot(b.x-a.x,b.z-a.z);
  if(distance<=length||i===route.length-1){const t=length?Math.min(1,distance/length):1;return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,angle:Math.atan2(a.x-b.x,a.z-b.z)}}distance-=length;
 }
 return {...route[0],angle:0};
}
function customerRoute(order){
 const seat=BarScene.tableSeat(order.tableId);
 if(seat)return [{x:6,z:9.3},{x:6,z:seat.z+.65},{x:seat.x+(seat.x<6?.6:-.6),z:seat.z+.65},seat];
 const x=4.6+(order.slot||0)*1.4;return [{x:6,z:9.3},{x,z:6},{x,z:4.3}];
}
function renderStaff(dynamic){
 if(state.management?.assistant)BarScene.customer(dynamic,{x:3.0,z:-2.1,id:52,time:visualTime,moving:false,patience:100});
 if(state.management?.bartender)BarScene.customer(dynamic,{x:8.0,z:1.72,id:54,time:visualTime,moving:false,angle:Math.PI,staffKind:'bartender'});
 if(!state.management?.waiter){waiterVisual=null;return}
 const job=state.staff?.waiter,order=job&&state.orders.find(o=>o.id===job.orderId),table=order&&BarEngine.tables.find(t=>t.id===order.tableId);
 const home={x:1.05,z:4.5},target=table?{x:table.x+(table.x<6?1.35:-1.35),z:table.z}:order?{x:4.6+(order.slot||0)*1.4,z:4.8}:home;
 if(!waiterVisual)waiterVisual={...home,at:visualTime,key:'home',progress:1,route:[home,home]};
 const v=waiterVisual,key=job?job.orderId+':'+job.task:'home';
 if(v.key!==key){const fromAisle=v.x<6?3.1:8.8,toAisle=target.x<6?3.1:8.8;v.key=key;v.progress=0;v.route=[{x:v.x,z:v.z},{x:fromAisle,z:v.z},{x:fromAisle,z:4.9},{x:toAisle,z:4.9},{x:toAisle,z:target.z},target]}
 const dt=Math.max(0,Math.min(.1,visualTime-v.at));v.at=visualTime;v.progress=Math.min(1,v.progress+dt*1.8/Math.max(.1,routeLength(v.route)));
 const p=alongRoute(v.route,v.progress);v.x=p.x;v.z=p.z;
 BarScene.customer(dynamic,{...p,id:55,time:visualTime,moving:v.progress<1,staffKind:'waiter',carrying:job?.task==='serve'});
 if(job?.task==='serve'&&job.recipe){const g=BarScene.geometry(dynamic),x=p.x-Math.sin(p.angle)*.34,z=p.z-Math.cos(p.angle)*.34,bob=v.progress<1?Math.sin(visualTime*11+55)*.012:Math.sin(visualTime*1.7+55)*.006;g.cylinder(x,1.1+bob,z,.35,.025,.35,'#b6a77c',5);BarScene.glass(g,job.recipe,x,1.12+bob,z)}
}
function render(){if(!renderer)return;const dynamic=[];
 BarScene.storageVisuals(dynamic,state);
 BarScene.registerVisuals(dynamic,state,{open:window.BarTablet?.isOpen()&&BarTablet.getTab()==='register'&&game.nearRegister(camera)});
 renderStaff(dynamic);
 const activeIds=new Set(state.orders.map(o=>o.id));
 for(const [id,v]of customerVisuals)if(!activeIds.has(id)&&v.active){v.active=false;v.left=visualTime;v.departure=[{x:v.x,z:v.z},...v.route.slice(0,-1).reverse()];v.departureTime=Math.max(3,routeLength(v.departure)/1.5)}
 for(const [i,customer]of state.orders.entries()){
  let v=customerVisuals.get(customer.id);if(!v){const slot=customer.slot??[0,1,2].find(slot=>![...customerVisuals.values()].some(c=>c.active&&!c.tableId&&c.slot===slot))??i;v={slot,tableId:customer.tableId,born:visualTime,active:true,route:customerRoute({...customer,slot})};customerVisuals.set(customer.id,v)}
  v.active=true;v.customer=customer;
 }
 for(const [id,v]of customerVisuals){
  if(!v.active&&visualTime-v.left>=v.departureTime){customerVisuals.delete(id);continue}
  const o=v.customer,progress=Number.isFinite(o.arrivalRemaining)?1-o.arrivalRemaining/3:Math.min(1,(visualTime-v.born)/3);
  const p=v.active?alongRoute(v.route,progress):alongRoute(v.departure,(visualTime-v.left)/v.departureTime),seated=!!v.tableId&&v.active&&progress>=1;
  v.x=p.x;v.z=p.z;
  BarScene.customer(dynamic,{...p,angle:seated?BarScene.tableSeat(v.tableId).angle:p.angle,id,time:visualTime,moving:progress<1||!v.active,seated,patience:o.patience});
  if(v.active&&v.tableId&&!['awaiting-order','preparing'].includes(game.orderPhase(o))){const table=BarEngine.tables.find(t=>t.id===v.tableId);BarScene.glass(BarScene.geometry(dynamic),o.recipe,table.x,.788,table.z+.20,game.orderPhase(o)==='drinking'?.7:0)}
 }
 const props=BarScene.geometry(dynamic),p=state.prep;
 if(p){const {x,y,z,stream}=BarScene.prepStation(p.recipe);
  BarScene.glass(props,p.recipe,x,y,z,Math.min(1,p.amount/recipes[p.recipe].target));
  if(p.pouring&&stream)props.cylinder(stream.x,stream.y,stream.z,.012,stream.h,.012,recipes[p.recipe].color,6);
 }
 state.tray.forEach((t,i)=>BarScene.glass(props,t.recipe,5.25+i*.28,1.102,3.15));
 if(state.payments?.terminalCarried&&!window.GameMenu?.isHome()&&!window.BarTablet?.isOpen()){
  const cp=Math.cos(camera.pitch||0),sp=Math.sin(camera.pitch||0),f=.52*cp+.20*sp,r=.27;BarScene.terminal(dynamic,{x:camera.x+Math.sin(camera.a)*f+Math.cos(camera.a)*r,y:camera.y+.52*sp-.20*cp,z:camera.z+Math.cos(camera.a)*f-Math.sin(camera.a)*r,angle:camera.a,pitch:-.45-(camera.pitch||0)});
 }
 renderer.render(window.GameMenu?.isHome()?BarScene.homeCamera:camera,dynamic,preferences);
}
const obstacles=boxes.filter(b=>b.solid&&b.y-b.h/2<1.7&&b.y+b.h/2>.2);
function walk(dx,dz){
 if(!Number.isFinite(dx)||!Number.isFinite(dz))return;
 // Short steps prevent running through thin door frames and chair backs.
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
 for(let i=0;i<steps;i++){
  const nx=camera.x+dx/steps,nz=camera.z+dz/steps;
  if(!BarScene.containsWalkablePosition(nx,nz))break;
  const blocked=obstacles.some(b=>{
   const angle=b.ry||0,c=Math.cos(angle),s=Math.sin(angle),px=nx-b.x,pz=nz-b.z;
   const localX=px*c-pz*s,localZ=px*s+pz*c;
   if(b.round)return Math.hypot(localX/(b.w/2+.2),localZ/(b.d/2+.2))<1;
   return Math.abs(localX)<b.w/2+.2&&Math.abs(localZ)<b.d/2+.2;
  });
  if(blocked||(state.management?.assistant&&Math.hypot(nx-3,nz+2.1)<.38)||(state.management?.bartender&&Math.hypot(nx-8,nz-1.72)<.36)||(waiterVisual&&Math.hypot(nx-waiterVisual.x,nz-waiterVisual.z)<.32)||[...customerVisuals.values()].some(v=>v.active&&Number.isFinite(v.x)&&Math.hypot(nx-v.x,nz-v.z)<.38))break;
  camera.x=nx;camera.z=nz;
 }
}
function frame(now){const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;if(!paused&&!menusOpen()){visualTime+=dt;movement(dt);const orderId=state.nextId,sales=state.totalSold;const report=game.tick(dt);if(state.nextId>orderId)audio.chime('arrival');if(state.totalSold>sales){audio.chime('sale');toast('Paiement par carte confirmé.');save()}if(report){save();modal('Bilan du soir '+report.day,`<p>${report.sold} clients servis et encaissés · ${report.lost} clients perdus · ${report.waste} boissons jetées</p><p>Recettes et pourboires : ${money(report.revenue)} · espèces : ${money(report.cashRevenue||0)} · cartes : ${money(report.cardRevenue||0)}</p><p>Achats et améliorations : ${money(report.expenses)}</p><p>Charges : ${money(report.charges)}, dont ${money(report.salaries||0)} de salaires</p><h2>Résultat : ${money(report.profit)}</h2><p>${state.gameOver?'Trésorerie épuisée. Vous pouvez commencer un nouveau bar.':'Le prochain service commence à 17 h. Votre partie est sauvegardée.'}</p>`)}elapsed+=dt;if(elapsed>.12){ui();elapsed=0}}audio.setState(!paused&&!menusOpen()&&state.open,!!state.prep?.pouring);if(now-lastRender>=1000/preferences.fps-.5){render();lastRender=now}requestAnimationFrame(frame)}
ui();setInterval(save,5000);addEventListener('beforeunload',()=>{if(!window.GameMenu||GameMenu.hasSession())save(true)});
