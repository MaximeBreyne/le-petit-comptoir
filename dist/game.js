const $=id=>document.getElementById(id), money=n=>n.toLocaleString('fr-BE',{style:'currency',currency:'EUR'});
const {Game,ingredients,recipes}=BarEngine;
function controlName(action){return window.BarControls?.label(action)||preferences.bindings[action]?.label||{interact:'E',tablet:'Tab',manage:'R',pour:'Espace',sprint:'Maj'}[action]||action}
function controlMarkup(action){return controlName(action).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function waiterPaymentMessage(status){
 if(!status)return '';
 if(status.blocked==='change')return 'Le serveur attend : le fond de caisse manque de monnaie.';
 if(status.blocked==='terminal')return 'Le serveur attend le retour du terminal sur son socle.';
 return {'collect-cash':'Le serveur récupère les espèces.','prepare-change':'Le serveur prépare la monnaie à la caisse.','return-change':'Le serveur rapporte la monnaie et le ticket.','pickup-terminal':'Le serveur va chercher le terminal.','take-card':'Le serveur apporte le terminal au client.','wait-card':'Le serveur attend la confirmation bancaire.','return-terminal':'Le serveur rapporte le terminal sur son socle.'}[status.task]||'Le serveur s’occupe du règlement.';
}
// Keep unchanged DOM nodes: keyboard focus and held controls survive UI refreshes.
function updateHTML(element,html){if(element._html!==html){element.innerHTML=html;element._html=html}}
let saved=null;try{saved=JSON.parse(localStorage.getItem('comptoir-bar-v2'))}catch{}
const game=new Game(saved);let state=game.s,client=null,paused=false,last=performance.now(),elapsed=0,toastTimer,saveFailed=false;
function save(force=false){if(force!==true&&window.GameMenu&&!GameMenu.canAutosave())return;try{localStorage.setItem('comptoir-bar-v2',JSON.stringify(game.s));saveFailed=false;window.GameMenu?.didAutosave()}catch{if(!saveFailed){toast('Sauvegarde indisponible : vérifiez l’espace disque.');saveFailed=true}}}
function toast(message){if(!message)return;$('toast').textContent=message;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,4000)}
function modal(title,html){game.setPour(false);keys={};window.BarTablet?.close({suspend:true});if(window.BarInput)BarInput.suspend();else document.exitPointerLock?.();$('modalTitle').textContent=title;$('modalContent').innerHTML=html;$('modal').showModal()}
function act(fn){if(paused){toast('Reprenez la partie pour continuer.');return}const sales=game.s.totalSold,result=fn();toast(result);audio.chime(game.s.totalSold>sales?'sale':'click');state=game.s;save();ui()}
function ui(){state=game.s;syncBuilding();$('cash').textContent=money(state.cash);$('day').textContent='SOIR '+state.day;$('clock').textContent=BarEngine.formatServiceTime(state.time);$('pause').textContent=paused?'Reprendre':'Pause';
 const day=BarVenue.dayProgress(state),status=BarVenue.serviceState(state);
 $('serviceHud').dataset.state=status;
 $('serviceStatus').textContent={closed:'FERMÉ',open:'OUVERT',closing:'DERNIÈRE TOURNÉE'}[status];
 $('dayRemaining').textContent=day.text;$('dayProgress').max=day.duration;$('dayProgress').value=day.elapsed;
 $('dayProgress').setAttribute('aria-valuetext',day.text);
 $('register').textContent=state.payments?.terminalCarried?'Caisse · terminal en main':'Caisse';
 $('trayCount').textContent=`PLATEAU ${state.tray.length}/${state.capacity}`;
 window.BarPreparation?.refresh();
 window.BarOrders?.refresh();
 updateHTML($('tray'),state.tray.length?state.tray.map(t=>`<span class="drink">${recipes[t.recipe].name} ${t.quality}%</span>`).join(''):'<span class="empty">Plateau vide</span>');
 window.BarService?.refresh();
 window.BarTablet?.refresh();
 window.BarDeveloper?.refresh();
 if(window.BarInput&&typeof camera!=='undefined')BarInput.refresh();
}
$('tablet').onclick=()=>BarTablet.open('orders');$('register').onclick=()=>window.BarService?.openRegister();
$('close').onclick=()=>$('modal').close();
$('help').onclick=()=>modal('Bienvenue derrière le bar',`<p><strong>Ouvrir le bar.</strong> Regardez le panneau de la porte et appuyez sur ${controlMarkup('interact')}, ou utilisez Service sur la tablette.</p><p><strong>Commandes et service.</strong> Approchez-vous d’un client, regardez-le et appuyez sur ${controlMarkup('interact')} ou cliquez. Pour une commande à prendre, la tablette s’ouvre : validez la commande à proximité du client. Les boissons demandées apparaissent dans À préparer et dans votre vue du bar. Pour servir ou encaisser, interagissez directement avec le client.</p><p><strong>Préparer derrière le bar.</strong> Regardez le rangement des verres derrière le bar et appuyez sur ${controlMarkup('interact')}. Choisissez la boisson : vous prenez son récipient. Posez-le au poste indiqué. Cinq emplacements permettent de garder deux bières, un café et deux autres boissons en cours. Regardez une préparation laissée au poste et appuyez sur ${controlMarkup('interact')} pour la reprendre. Prenez chaque ingrédient dans les bouteilles ou bacs étiquetés avec ${controlMarkup('interact')}, puis utilisez-le au poste. Les quantités sont retirées du stock à la prise ; la bière au premier tirage.</p><p><strong>Doser et terminer.</strong> Restez près du poste et maintenez la touche de dosage. Regardez le verre et appuyez sur ${controlMarkup('interact')} pour valider, mélanger si nécessaire et prendre la boisson sur le plateau. S’éloigner arrête le versement. Pour abandonner, regardez le verre, utilisez la commande Gérer (${controlMarkup('manage')}, ou clic droit à la souris) et choisissez Jeter cette préparation. Sur le plateau, regardez une boisson et appuyez sur ${controlMarkup('interact')} pour ouvrir ses options. Un plateau plein laisse la boisson terminée au poste.</p><p><strong>Espèces.</strong> Prenez l’argent auprès du client avec ${controlMarkup('interact')}. Regardez l’écran de caisse derrière le bar pour l’ouvrir. Sélectionnez les pièces et billets à rendre, validez, puis rapportez la monnaie et le ticket au client avec ${controlMarkup('interact')}. Le paiement est enregistré une seule fois, à la fin.</p><p><strong>Carte bancaire.</strong> Prenez le terminal sur son socle près de la caisse avec ${controlMarkup('interact')}. Regardez le client pour lui présenter le terminal, puis attendez trois secondes. Reposez-le sur son socle après utilisation.</p><p><strong>Agrandir le bar.</strong> Dans Bâtiment, achetez les salons, puis l’étage accessible à pied par l’escalier et la boîte de nuit. Les tables s’achètent séparément : une salle vide n’ajoute pas de clients. L’établissement complet accueille seize tables et six places au comptoir. Fermez le bar et terminez le service avant les travaux. Les conditions de progression, de superficie et les prix figurent sur chaque offre.</p><p><strong>Étage et boîte de nuit.</strong> Prenez les commandes et servez les clients à leur étage. La préparation des boissons et la caisse restent au comptoir du rez-de-chaussée ; emportez le terminal sans fil pour les cartes. La licence des cocktails de nuit ajoute des boissons réservées à la clientèle de la boîte de nuit.</p><p><strong>Développer l’équipe.</strong> Les agrandissements permettent de recruter un responsable de salle, un second préparateur, un DJ et un agent d’accueil. Leurs effets et salaires sont détaillés dans Équipe. Deux préparateurs peuvent travailler sur des commandes différentes ; le serveur emprunte aussi l’escalier pour servir et encaisser à l’étage.</p><p><strong>Décoration.</strong> La rubrique Décoration de la tablette permet de changer les tables, les chaises, les murs, le plafond et le sol. Achetez les finitions débloquées, puis réappliquez gratuitement celles que vous possédez. Les changements se font entre deux services et sont conservés dans votre sauvegarde.</p><p><strong>Manette.</strong> Utilisez le stick gauche pour marcher et le droit pour regarder. Les menus se parcourent avec la croix directionnelle ou le stick gauche ; le bouton du bas valide et celui de droite revient en arrière. Le stick droit fait défiler les pages. Réglages permet de modifier les touches, les boutons, la sensibilité et la zone morte des sticks.</p><p><strong>Gestion.</strong> La tablette regroupe les commandes, la liste des boissons à préparer, les stocks, les licences, les améliorations et les employés. Les livraisons arrivent en réserve après dix secondes ; rejoignez cette pièce pour transférer les stocks. Le serveur prend les commandes, sert et encaisse les espèces et les cartes. Il compte la monnaie à la caisse et partage votre terminal : reposez-le sur son socle après utilisation. Si le fond de caisse manque de monnaie, il utilise la trésorerie disponible ou attend un réapprovisionnement.</p><p><strong>${controlMarkup('sprint')} : courir · ${controlMarkup('tablet')} : tablette · Échap : pause · F11 : plein écran.</strong> Le bilan attend la fin des commandes et des paiements. Charges de base : 35 € plus les salaires.</p>`);
// Static architecture and dynamic props use the same depth-tested scene.
const EYE_HEIGHT=1.68;
const canvas=$('world');let camera={...BarScene.playCamera},keys={};let boxes=BarScene.create(state);
BarVenue.addFrame(boxes);
let renderer=null,visualTime=0;const customerVisuals=new Map();
let waiterVisual=null;
try{renderer=new BarRenderer(canvas,boxes,{labels:[...BarVenue.labelTemplates,...(BarScene.terminalLabelTemplates||[])]})}catch(error){$('graphicsError').hidden=false;$('graphicsError').textContent=error.message;console.error(error)}
function buildingSignature(){const building=BarEngine.buildingLayout(state);return [building.level,!!building.upstairs,!!building.nightclub].join(',')+':'+game.activeTables().map(table=>table.id).join(',')+':'+Object.values(BarEngine.decorStyle?.(state)||{}).map(style=>style.id).join(',')}
let buildingKey=buildingSignature();
function syncBuilding(){
 const key=buildingSignature();if(key===buildingKey)return;
 boxes=BarScene.create(state);BarVenue.addFrame(boxes);
 obstacles=boxes.filter(b=>b.solid);
 renderer?.setScene(boxes);buildingKey=key;customerVisuals.clear();waiterVisual=null;
 // Loading a smaller bar or buying furniture must never trap the player.
 const floor=walkSurface(camera.x,camera.z,camera.y-EYE_HEIGHT);
 if(floor===null||Math.abs(floor-(camera.y-EYE_HEIGHT))>.25||collidesWithScene(camera.x,camera.z,floor))camera={...BarScene.playCamera};
 else camera.y=floor+EYE_HEIGHT;
}
function interactionTarget(){
 const direct=[window.BarPreparation?.target(camera),window.BarService?.target(camera)].filter(Boolean).sort((a,b)=>a.aimScore-b.aimScore||a.distance-b.distance);
 if(direct.length)return direct[0];
 if(BarVenue.aimedAtSign(camera))return {action:'service',label:'Tourner le panneau du service'};
 if(BarScene.inStockroom(camera))return {section:'reserve',label:'Gérer les stocks de la réserve'};
 return null;
}
function useInteraction(target=interactionTarget()){
 if(!target||paused||menusOpen()||BarTablet.isOpen())return false;
 if(target.action==='preparation')return BarPreparation.use(target);
 if(target.action==='direct-service')return BarService.use(target);
 if(target.action==='service'){
  if(!BarVenue.nearSign(camera))return false;
  if(state.closing)toast('Dernière tournée : terminez le service des clients présents.');
  else act(()=>state.open?game.close():game.open());
 }else if(target.section==='reserve'&&BarScene.inStockroom(camera))BarTablet.open('reserve');
 else return false;
 return true;
}
function routeLength(route){return route.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-route[i].x,(p.y||0)-(route[i].y||0),p.z-route[i].z),0)}
function alongRoute(route,progress){
 let distance=routeLength(route)*Math.max(0,Math.min(1,progress));
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],length=Math.hypot(b.x-a.x,(b.y||0)-(a.y||0),b.z-a.z);
  if(distance<=length||i===route.length-1){const t=length?Math.min(1,distance/length):1;return {x:a.x+(b.x-a.x)*t,y:(a.y||0)+((b.y||0)-(a.y||0))*t,z:a.z+(b.z-a.z)*t,angle:Math.atan2(a.x-b.x,a.z-b.z)}}distance-=length;
 }
 return {...route[0],angle:0};
}
function customerRoute(order){
 if(game.customerRoute)return game.customerRoute(order);
 const seat=BarScene.tableSeat(order.tableId);
 if(seat&&seat.x>12){const aisle=seat.x<16.5?12.9:17.4;return [{x:6,z:9.3},{x:6,z:5.25},{x:aisle,z:5.25},{x:aisle,z:seat.z},seat]}
 if(seat)return [{x:6,z:9.3},{x:6,z:seat.z+.65},{x:seat.x+(seat.x<6?.6:-.6),z:seat.z+.65},seat];
 const counter=BarScene.counterSeat(order.slot);
 // The central aisle and the gap in front of the tables stay clear at every seat.
 return [{x:6,z:9.3},{x:6,z:5.45},{x:counter.x,z:5.45},counter];
}
function renderStaff(dynamic){
 if(state.management?.assistant)BarScene.customer(dynamic,{x:3.0,z:-2.1,id:52,time:visualTime,moving:false,patience:100});
 if(state.management?.bartender)BarScene.customer(dynamic,{x:8.0,z:1.72,id:54,time:visualTime,moving:false,angle:Math.PI,staffKind:'bartender'});
 for(const member of extraStaffPositions())BarScene.customer(dynamic,{...member,time:visualTime,moving:false,patience:100});
 if(!state.management?.waiter){waiterVisual=null;return}
 const job=state.staff?.waiter,route=job?.route,progress=job?Math.max(0,Math.min(1,((job.total||0)-(job.remaining||0))/Math.max(.001,job.travel||0))):1;
 const point=state.staff?.waiterPosition||{x:1.05,z:4.5};
 const facing=route?.length>1?alongRoute(route,progress):{...point,angle:waiterVisual?.angle||0};
 const p={x:point.x,y:point.y||0,z:point.z,angle:facing.angle};
 const moving=!!job&&progress<1,terminal=!!state.payments.terminalWithWaiter;
 if(!moving){
  const order=job&&state.orders.find(order=>order.id===job.orderId),atCounter=['pickup-terminal','prepare-change','return-terminal'].includes(job?.task);
  const focus=atCounter?{x:3.0,z:2.65}:order?(BarScene.tableSeat(order.tableId)||BarScene.counterSeat(game.counterSeat(order).slot)):null;
  p.angle=focus?Math.atan2(point.x-focus.x,point.z-focus.z):waiterVisual?.angle||0;
 }
 waiterVisual={...p,progress,key:job?job.orderId+':'+job.task:'idle'};
 BarScene.customer(dynamic,{...p,id:55,time:visualTime,moving,staffKind:'waiter',carrying:job?.task==='serve',carryingTerminal:terminal});
 const bob=moving?Math.sin(visualTime*11+55)*.012:Math.sin(visualTime*1.7+55)*.006;
 if(job?.task==='serve'&&job.recipe){const g=BarScene.geometry(dynamic),x=p.x-Math.sin(p.angle)*.34,z=p.z-Math.cos(p.angle)*.34;g.cylinder(x,p.y+1.1+bob,z,.35,.025,.35,'#b6a77c',5);BarScene.glass(g,job.recipe,x,p.y+1.12+bob,z)}
 if(terminal)BarScene.terminal(dynamic,{x:p.x-Math.sin(p.angle)*.28,y:p.y+1.22+bob,z:p.z-Math.cos(p.angle)*.28,angle:p.angle,pitch:-.35,...terminalDisplay()});
}
function extraStaffPositions(){
 const positions={bartender2:{x:9.8,y:0,z:1.72,id:56,angle:Math.PI,staffKind:'bartender'},floorManager:{x:20.1,y:0,z:4.5,id:57,angle:Math.PI,staffKind:'manager'},dj:{x:28,y:0,z:4.3,id:58,angle:Math.PI,staffKind:'dj'},host:{x:24.8,y:0,z:4.55,id:59,angle:Math.PI,staffKind:'host'}};
 return Object.entries(positions).filter(([role])=>state.management?.[role]).map(([,point])=>point);
}
function terminalDisplay(){
 const payment=state.orders.find(order=>order.id===state.payments.terminalOrderId);
 if(payment)return {status:'processing',amount:payment.due};
 const receipt=state.payments.receipts.find(receipt=>receipt.method==='card'&&receipt.day===state.day&&state.time>=receipt.time&&state.time-receipt.time<6);
 return receipt?{status:'approved',amount:receipt.amount}:{status:'ready',amount:null};

}
function render(){if(!renderer)return;const dynamic=[];
 BarVenue.render(dynamic,state);
 BarScene.storageVisuals(dynamic,state);
 BarScene.preparationVisuals(dynamic,state,!window.GameMenu?.isHome()&&!window.BarTablet?.isOpen()&&!menusOpen()?camera:null);
 window.BarPreparation?.refreshPrompt();
 BarScene.registerVisuals(dynamic,state,{open:(window.BarService?.isRegisterOpen()||window.BarTablet?.isOpen()&&BarTablet.getTab()==='register')&&game.nearRegister(camera)});
 renderStaff(dynamic);
 const activeIds=new Set(state.orders.map(o=>o.id));
 for(const [id,v]of customerVisuals)if(!activeIds.has(id)&&v.active){v.active=false;v.left=visualTime;v.departure=[{x:v.x,y:v.y||0,z:v.z},...v.route.slice(0,-1).reverse()];v.departureTime=Math.max(3,routeLength(v.departure)/1.5)}
 for(const customer of state.orders){
  let v=customerVisuals.get(customer.id);if(!v){const slot=customer.slot??BarEngine.counterSeats.find(seat=>![...customerVisuals.values()].some(c=>c.active&&!c.tableId&&c.slot===seat.slot))?.slot??0;v={slot,tableId:customer.tableId,born:visualTime,active:true,route:customerRoute({...customer,slot})};customerVisuals.set(customer.id,v)}
  v.active=true;v.customer=customer;
 }
 for(const [id,v]of customerVisuals){
  if(!v.active&&visualTime-v.left>=v.departureTime){customerVisuals.delete(id);continue}
  const o=v.customer,duration=o.arrivalDuration||3,progress=Number.isFinite(o.arrivalRemaining)?1-o.arrivalRemaining/duration:Math.min(1,(visualTime-v.born)/duration);
  const p=v.active?alongRoute(v.route,progress):alongRoute(v.departure,(visualTime-v.left)/v.departureTime),seated=v.active&&progress>=1;
  const seat=BarScene.tableSeat(v.tableId)||BarScene.counterSeat(v.slot);
  v.x=p.x;v.y=p.y||0;v.z=p.z;
  BarScene.customer(dynamic,{...p,angle:seated?seat.angle:p.angle,id,time:visualTime,moving:progress<1||!v.active,seated,seatHeight:seat.seatHeight,patience:o.patience});
  if(v.active&&v.tableId&&!['awaiting-order','preparing'].includes(game.orderPhase(o))){const table=BarEngine.tables.find(t=>t.id===v.tableId);BarScene.glass(BarScene.geometry(dynamic),o.recipe,table.x,(table.y||0)+.788,table.z+.20,game.orderPhase(o)==='drinking'?.7:0)}
  if(v.active&&!v.tableId&&!['awaiting-order','preparing'].includes(game.orderPhase(o)))BarScene.glass(BarScene.geometry(dynamic),o.recipe,seat.x,1.133,3.48,game.orderPhase(o)==='drinking'?.7:0);
 }
 const props=BarScene.geometry(dynamic);
 for(const p of game.preparations())if(!p.physical||p.vesselPlaced){const {x,y,z,stream}=BarScene.prepStation(p);
  const recipe=recipes[p.recipe],volume=Object.entries(recipe.ingredients).reduce((sum,[key,amount])=>sum+(ingredients[key].unit==='cl'?amount:0),0);
  const pouredFraction=recipe.finishStep!==undefined&&volume?Math.min(1,recipe.target/volume):1;
  BarScene.glass(props,p.recipe,x,y,z,p.ready?1:Math.min(1,p.amount/recipe.target)*pouredFraction);
  if(p.pouring&&stream)props.cylinder(stream.x,stream.y,stream.z,.012,stream.h,.012,recipes[p.recipe].color,6);
 }
 state.tray.forEach((t,i)=>{const point=BarScene.trayPosition(i);BarScene.glass(props,t.recipe,point.x,point.y,point.z)});
 if(state.payments?.terminalCarried&&!window.GameMenu?.isHome()&&!window.BarTablet?.isOpen()){
  const cp=Math.cos(camera.pitch||0),sp=Math.sin(camera.pitch||0),f=.52*cp+.20*sp,r=.27;BarScene.terminal(dynamic,{x:camera.x+Math.sin(camera.a)*f+Math.cos(camera.a)*r,y:camera.y+.52*sp-.20*cp,z:camera.z+Math.cos(camera.a)*f-Math.sin(camera.a)*r,angle:camera.a,pitch:-.45-(camera.pitch||0),...terminalDisplay()});
 }
 const home=window.GameMenu?.isHome();renderer.render(home?BarScene.homeCamera:camera,dynamic,preferences,home?1020:state.time);
}
let obstacles=boxes.filter(b=>b.solid);
function walkSurface(x,z,feetY=camera.y-EYE_HEIGHT){
 return BarScene.walkSurfaceHeight?BarScene.walkSurfaceHeight(x,z,state,feetY):BarScene.containsWalkablePosition(x,z,state)?0:null;
}
function collidesWithScene(x,z,feetY=camera.y-EYE_HEIGHT){
 return obstacles.some(b=>{
  if(b.y-b.h/2>=feetY+1.7||b.y+b.h/2<=feetY+.2)return false;
  const angle=b.ry||0,c=Math.cos(angle),s=Math.sin(angle),px=x-b.x,pz=z-b.z;
  const localX=px*c-pz*s,localZ=px*s+pz*c;
  if(b.round)return Math.hypot(localX/(b.w/2+.2),localZ/(b.d/2+.2))<1;
  return Math.abs(localX)<b.w/2+.2&&Math.abs(localZ)<b.d/2+.2;
 });
}
function walk(dx,dz){
 if(!Number.isFinite(dx)||!Number.isFinite(dz))return;
 // Short steps prevent running through thin door frames and chair backs.
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
 for(let i=0;i<steps;i++){
  const nx=camera.x+dx/steps,nz=camera.z+dz/steps;
  const floor=walkSurface(nx,nz);
  if(floor===null||Math.abs(floor-(camera.y-EYE_HEIGHT))>.18)break;
  const nearPerson=(person,radius)=>Math.abs(floor-(person.y||0))<.8&&Math.hypot(nx-person.x,nz-person.z)<radius;
  const blocked=collidesWithScene(nx,nz,floor);
  if(blocked||(state.management?.assistant&&nearPerson({x:3,z:-2.1},.38))||(state.management?.bartender&&nearPerson({x:8,z:1.72},.36))||extraStaffPositions().some(person=>nearPerson(person,.36))||(waiterVisual&&nearPerson(waiterVisual,.32))||[...customerVisuals.values()].some(v=>v.active&&Number.isFinite(v.x)&&nearPerson(v,.38)))break;
  camera.x=nx;camera.z=nz;camera.y=floor+EYE_HEIGHT;
 }
}
function frame(now){const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;window.BarGamepad?.update(dt);if(!paused&&!menusOpen()){visualTime+=dt;movement(dt);if(state.prep?.pouring&&!game.nearPrepStation(camera))game.setPour(false);const orderId=state.nextId,sales=state.totalSold;const report=game.tick(dt);if(state.nextId>orderId)audio.chime('arrival');if(state.totalSold>sales){audio.chime('sale');toast(state.payments.receipts[0]?.method==='cash'?'Paiement en espèces encaissé.':'Paiement par carte confirmé.');save()}if(report){save();modal('Bilan du soir '+report.day,`<p>${report.sold} clients servis et encaissés · ${report.lost} clients perdus · ${report.waste} boissons jetées</p><p>Recettes et pourboires : ${money(report.revenue)} · espèces : ${money(report.cashRevenue||0)} · cartes : ${money(report.cardRevenue||0)}</p><p>Achats et améliorations : ${money(report.expenses)}</p><p>Charges : ${money(report.charges)}, dont ${money(report.salaries||0)} de salaires</p><h2>Résultat : ${money(report.profit)}</h2><p>${state.gameOver?'Trésorerie épuisée. Vous pouvez commencer un nouveau bar.':'Le prochain service commence à 17 h. Votre partie est sauvegardée.'}</p>`)}elapsed+=dt;if(elapsed>.12){ui();elapsed=0}}audio.setState(!paused&&!menusOpen()&&state.open,!!state.prep?.pouring);audio.setClubState?.(!paused&&!menusOpen()&&state.open&&!!state.management.dj,camera.x>=24&&camera.z>=4&&camera.y<3?1:.06);if(now-lastRender>=1000/preferences.fps-.5){render();lastRender=now}requestAnimationFrame(frame)}
ui();setInterval(save,5000);addEventListener('beforeunload',()=>{if(!window.GameMenu||GameMenu.hasSession())save(true)});
