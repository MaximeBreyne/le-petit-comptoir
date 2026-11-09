const $=id=>document.getElementById(id), money=n=>n.toLocaleString('fr-BE',{style:'currency',currency:'EUR'});
const {Game,ingredients,recipes}=BarEngine;
// Keep unchanged DOM nodes: keyboard focus and held controls survive UI refreshes.
function updateHTML(element,html){if(element._html!==html){element.innerHTML=html;element._html=html}}
let saved=null;try{saved=JSON.parse(localStorage.getItem('comptoir-bar-v2'))}catch{}
const game=new Game(saved);let state=game.s,client=null,paused=false,last=performance.now(),elapsed=0,toastTimer,saveFailed=false;
function save(force=false){if(force!==true&&window.GameMenu&&!GameMenu.canAutosave())return;try{localStorage.setItem('comptoir-bar-v2',JSON.stringify(game.s));saveFailed=false;window.GameMenu?.didAutosave()}catch{if(!saveFailed){toast('Sauvegarde indisponible : vérifiez l’espace disque.');saveFailed=true}}}
function toast(message){if(!message)return;$('toast').textContent=message;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,4000)}
function modal(title,html){game.setPour(false);keys={};window.BarTablet?.close({suspend:true});if(window.BarInput)BarInput.suspend();else document.exitPointerLock?.();$('modalTitle').textContent=title;$('modalContent').innerHTML=html;$('modal').showModal()}
function act(fn){if(paused){toast('Reprenez la partie pour continuer.');return}const result=fn();toast(result);audio.chime(typeof result==='string'&&result.startsWith('Servi !')?'sale':'click');state=game.s;save();ui()}
function ui(){state=game.s;$('cash').textContent=money(state.cash);$('day').textContent='SOIR '+state.day;const t=Math.min(1440,state.time);$('clock').textContent=t>=1440?'00:00':String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');$('pause').textContent=paused?'Reprendre':'Pause';$('mission').textContent=state.gameOver?'Trésorerie épuisée. Commencez un nouveau bar.':state.totalSold<5?`Servez 5 clients pour agrandir le plateau (${state.totalSold}/5).`:`${state.totalSold} clients servis · Soignez le dosage pour gagner des pourboires.`;$('progress').style.setProperty('--progress',Math.min(100,state.totalSold*20)+'%');$('serviceStatus').textContent=state.closing?'DERNIÈRE TOURNÉE':state.open?'OUVERT':'FERMÉ';$('open').disabled=state.open||state.gameOver;$('open').textContent=state.open?'Service en cours':'Ouvrir le bar';$('end').disabled=!state.open||state.closing;
 updateHTML($('customers'),state.orders.length?state.orders.map(o=>`<div class="customer"><strong>${o.name}</strong> · ${recipes[o.recipe].name}<small>${money(recipes[o.recipe].price)} · ${Math.ceil(o.patience)} s de patience</small><div class="patience"><i style="width:${Math.max(0,Math.ceil(o.patience))}%"></i></div><button data-serve="${o.id}" ${!state.tray.some(t=>t.recipe===o.recipe)?'disabled':''}>Servir la boisson</button></div>`).join(''):'<p class="empty">'+(state.open?'Un instant de calme. Préparez votre prochain service.':'Ouvrez à 17 h et accueillez vos premiers habitués.')+'</p>');
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
$('open').onclick=()=>act(()=>game.open());$('end').onclick=()=>act(()=>game.close());$('upgrade').onclick=()=>BarTablet.open('building');$('chooseDrink').onclick=$('tablet').onclick=()=>BarTablet.open('drinks');$('customers').onclick=e=>{let b=e.target.closest('[data-serve]');if(b)act(()=>game.serve(+b.dataset.serve))};$('tray').onclick=e=>{let b=e.target.closest('[data-remove]');if(b)act(()=>game.discard(+b.dataset.remove))};
$('prep').onclick=e=>{const b=e.target.closest('[data-action]');if(!b||b.dataset.action==='pour')return;act(()=>{switch(b.dataset.action){case 'step':if(game.s.prep.recipe==='mojito'&&game.s.prep.step===5)game.finishMix();else game.step();break;case 'finish':game.finishPour();break;case 'plate':return game.plate();case 'discard':return game.discard()}})};
$('prep').onpointerdown=e=>{let b=e.target.closest('#pour');if(b&&!paused){b.setPointerCapture(e.pointerId);game.setPour(true);e.preventDefault()}};$('prep').onpointerup=$('prep').onpointercancel=()=>game.setPour(false);
function supplier(){BarTablet.open('reserve')}
$('order').onclick=supplier;$('close').onclick=()=>$('modal').close();
$('help').onclick=()=>modal('Bienvenue derrière le bar',`<p><strong>Tab : votre tablette.</strong> Ouvrez le service, cherchez une boisson dans la carte et choisissez « Préparer ». Le curseur est alors disponible pour suivre les étapes, doser et servir. Cliquez sur le décor pour reprendre la caméra.</p><p>Maintenez la touche de dosage puis relâchez à la quantité cible. Validez et posez la boisson sur le plateau avant de servir le client. Un dosage précis peut rapporter un pourboire.</p><p><strong>Maj : courir.</strong> La touche se personnalise dans les réglages. Échap ouvre la pause ; depuis la tablette, Échap la range. F11 bascule le plein écran.</p><p><strong>La réserve est derrière le bar.</strong> Passez par la porte à gauche des étagères, puis appuyez sur E pour gérer les stocks. Les commandes arrivent dans cette pièce après 10 secondes de jeu. Réapprovisionnez ensuite le comptoir pour pouvoir préparer les boissons.</p><p><strong>Faites progresser votre établissement.</strong> Les rubriques Bâtiment, Licences et Équipe indiquent le nombre de clients à servir et le prix de chaque achat. La licence cocktails débloque le mojito. Un employé de réserve peut réapprovisionner le bar automatiquement, avec un salaire par soir.</p><p>Le service continue pendant la consultation de la tablette. Le bar ferme à minuit ; les derniers clients doivent être servis ou partir avant le bilan. Charges de base : 35 € par soir, plus les éventuels salaires.</p>`);
// Static architecture and dynamic props use the same depth-tested scene.
const canvas=$('world');let camera={...BarScene.playCamera},keys={};const boxes=BarScene.create();
let renderer=null,visualTime=0;const customerVisuals=new Map();
try{renderer=new BarRenderer(canvas,boxes)}catch(error){$('graphicsError').hidden=false;$('graphicsError').textContent=error.message;console.error(error)}
function render(){if(!renderer)return;const dynamic=[];
 BarScene.storageVisuals(dynamic,state);
 if(state.management?.assistant)BarScene.customer(dynamic,{x:3.0,z:-2.1,id:52,time:visualTime,moving:false,patience:100});
 const activeIds=new Set(state.orders.map(o=>o.id));
 for(const [id,v]of customerVisuals)if(!activeIds.has(id)&&v.active){v.active=false;v.left=visualTime}
 for(const [i,customer]of state.orders.entries()){
  let v=customerVisuals.get(customer.id);if(!v){v={slot:[0,1,2].find(slot=>![...customerVisuals.values()].some(c=>c.active&&c.slot===slot))??i,born:visualTime,active:true};customerVisuals.set(customer.id,v)}
  v.active=true;
 }
 for(const [id,v]of customerVisuals){
  if(!v.active&&visualTime-v.left>3){customerVisuals.delete(id);continue}
  const progress=Math.min(1,(visualTime-v.born)/3),depart=v.active?0:Math.min(1,(visualTime-v.left)/3);
  const x=4.6+v.slot*1.4,z=4.3+(1-progress+depart)*4.5;
  const moving=progress<1||!v.active,bob=moving?Math.sin(visualTime*12+id)*.035:Math.sin(visualTime*1.8+id)*.009;
  BarScene.customer(dynamic,{x,z,id,time:visualTime,moving,departing:!v.active,patience:state.orders.find(o=>o.id===id)?.patience??100});
 }
 const props=BarScene.geometry(dynamic),p=state.prep;
 if(p){const {x,y,z,stream}=BarScene.prepStation(p.recipe);
  BarScene.glass(props,p.recipe,x,y,z,Math.min(1,p.amount/recipes[p.recipe].target));
  if(p.pouring&&stream)props.cylinder(stream.x,stream.y,stream.z,.012,stream.h,.012,recipes[p.recipe].color,6);
 }
 state.tray.forEach((t,i)=>BarScene.glass(props,t.recipe,5.25+i*.28,1.102,3.15));
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
  if(blocked||(state.management?.assistant&&Math.hypot(nx-3,nz+2.1)<.38)||[...customerVisuals.values()].some(v=>v.active&&visualTime-v.born>=3&&Math.hypot(nx-(4.6+v.slot*1.4),nz-4.3)<.45))break;
  camera.x=nx;camera.z=nz;
 }
}
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused&&!menusOpen()){visualTime+=dt;movement(dt);const orderId=state.nextId;const report=game.tick(dt);if(state.nextId>orderId)audio.chime('arrival');if(report){save();modal('Bilan du soir '+report.day,`<p>${report.sold} clients servis · ${report.lost} clients perdus · ${report.waste} boissons jetées</p><p>Recettes et pourboires : ${money(report.revenue)}</p><p>Achats et améliorations : ${money(report.expenses)}</p><p>Charges : ${money(report.charges)}</p><h2>Résultat : ${money(report.profit)}</h2><p>${state.gameOver?'Trésorerie épuisée. Vous pouvez commencer un nouveau bar.':'Le prochain service commence à 17 h. Votre partie est sauvegardée.'}</p>`)}elapsed+=dt;if(elapsed>.12){ui();elapsed=0}}audio.setState(!paused&&!menusOpen()&&state.open,!!state.prep?.pouring);if(now-lastRender>=1000/preferences.fps-.5){render();lastRender=now}requestAnimationFrame(frame)}
ui();setInterval(save,5000);addEventListener('beforeunload',()=>{if(!window.GameMenu||GameMenu.hasSession())save(true)});
