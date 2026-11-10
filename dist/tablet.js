'use strict';
// A single catalogue and management screen; adding recipes never needs a new key.
window.BarTablet=(()=>{
 const sections={service:['Service','La salle et les commandes'],orders:['À préparer','Les boissons commandées'],register:['Caisse','Encaissements & terminal'],reserve:['Réserve','Stocks & fournisseur'],building:['Bâtiment','Votre établissement'],licenses:['Licences','Développer la carte'],team:['Équipe','Les personnes derrière le bar']};
 let current='orders',upgradesSignature='',lastRefresh=0;
 const stockRows=new Map(),upgradeCards=new Map();
 const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node};
 const number=value=>Number(value||0).toLocaleString('fr-BE',{maximumFractionDigits:1});
 const iconPaths={service:'M3 11h18M5 11v10m14-10v10M8 3h8v5H8zM2 5v4m20-4v4',register:'M4 13h16v8H4zM6 13l2-6h9l2 6M9 2h9v5H9zM7 17h10M10 10h1m3 0h1',orders:'M6 2h12l-1 10a5 5 0 0 1-10 0L6 2zm6 15v5m-4 0h8',reserve:'M3 7l9-5 9 5v12l-9 4-9-4V7zm0 0 9 5 9-5m-9 5v11',building:'M3 22V7l9-5 9 5v15M8 22v-7h8v7M7 8h2m6 0h2M7 11h2m6 0h2',licenses:'M6 2h12v15l-6-3-6 3V2zm3 5h6M9 10h6M7 17v5l5-3 5 3v-5',team:'M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8-7a3 3 0 0 1 0 6M1 22v-3a6 6 0 0 1 12 0v3m3-7a5 5 0 0 1 6 5v2'};
 function icon(name){const node=document.createElementNS('http://www.w3.org/2000/svg','svg');node.setAttribute('viewBox','0 0 24 24');node.setAttribute('aria-hidden','true');node.innerHTML=`<path d="${iconPaths[name]||iconPaths.orders}"/>`;return node}
 function button(text,action,className=''){const node=make('button',className,text);node.type='button';if(action)node.dataset.tabletAction=action;return node}
 const dialog=make('dialog','tablet-device');dialog.id='tabletModal';dialog.setAttribute('aria-labelledby','tabletTitle');
 const screen=make('div','tablet-screen');dialog.append(screen);
 const top=make('div','tablet-top');
 const brand=make('div','tablet-brand');const logo=make('img');logo.src='assets/brand/logo-128.png';logo.alt='';logo.width=36;logo.height=36;
 const identity=make('div');identity.append(make('strong',null,'LE PETIT COMPTOIR'),make('span',null,'TABLETTE DE GESTION'));brand.append(logo,identity);
 const status=make('div','tablet-live');const serviceStatus=make('span','tablet-service-state');const cash=make('strong','tablet-cash');status.append(serviceStatus,cash);
 const closeButton=button('Ranger · Tab','close','tablet-close');closeButton.setAttribute('aria-label','Ranger la tablette et reprendre la caméra');
 top.append(brand,status,closeButton);screen.append(top);
 const layout=make('div','tablet-layout'),nav=make('nav','tablet-nav'),main=make('main','tablet-main');nav.setAttribute('aria-label','Applications de la tablette');
 const navButtons=new Map();
 for(const [key,[label]]of Object.entries(sections)){const item=button('',null,'tablet-nav-button');item.dataset.tabletTab=key;item.append(icon(key),make('span',null,label));nav.append(item);navButtons.set(key,item)}
 const navFoot=make('p','tablet-nav-note','Votre bar, à portée de main.');nav.append(navFoot);
 const heading=make('div','tablet-page-heading'),headingText=make('div');const eyebrow=make('p','tablet-eyebrow'),title=make('h2');title.id='tabletTitle';headingText.append(eyebrow,title);
 const location=make('span','tablet-location');heading.append(headingText,location);main.append(heading);
 const pages=new Map();for(const key of Object.keys(sections)){const page=make('section','tablet-page');page.dataset.tabletPage=key;page.hidden=true;pages.set(key,page);main.append(page)}
 layout.append(nav,main);screen.append(layout);
 const bottom=make('div','tablet-bottom');const feedback=make('span','tablet-feedback');feedback.id='tabletFeedback';feedback.setAttribute('role','status');
 bottom.append(feedback,make('span','tablet-time-note','Le service continue pendant la consultation.'));screen.append(bottom);document.body.append(dialog);

 // Fixed seating cards keep their controls stable as customers arrive and leave.
 const service=pages.get('service'),serviceNote=make('div','tablet-reserve-note');
 const roomServiceNotice=make('div','tablet-service-notice'),roomServiceText=make('p'),roomServiceAction=button('Ouvrir le bar','service','tablet-button');roomServiceAction.id='tabletServiceToggle';roomServiceNotice.append(roomServiceText,roomServiceAction);
 const roomSummary=make('div','tablet-service-summary');service.append(roomServiceNotice,serviceNote,roomSummary);
 const crowdPanel=make('div','tablet-crowd'),crowdTitle=make('strong'),crowdDetail=make('p'),crowdProgress=make('progress','tablet-unlock-progress');
 crowdPanel.dataset.crowdProgress='';crowdProgress.setAttribute('aria-label','Progression vers la prochaine place au comptoir');crowdPanel.append(crowdTitle,crowdDetail,crowdProgress);service.append(crowdPanel);
 const tableGrid=make('div','tablet-service-grid'),counterGrid=make('div','tablet-service-grid');
 service.append(make('h3','tablet-group-title','Tables de la salle'),tableGrid,make('h3','tablet-group-title','Au comptoir'),counterGrid);
 const seats=new Map();let selectedOrderId=null;
 const phaseNames={'awaiting-order':'Commande à prendre',preparing:'À préparer',drinking:'Dégustation',payment:'Paiement attendu','cash-collected':'Passage en caisse','change-ready':'Monnaie à remettre','card-processing':'Carte en cours'};
 function seatCard(key,titleText,grid){
  const card=make('article','tablet-service-card');card.dataset.serviceSeat=key;card.tabIndex=-1;
  const head=make('div','tablet-service-card-head'),place=make('h4',null,titleText),badge=make('span','tablet-order-badge');head.append(place,badge);
  const customer=make('strong','tablet-order-customer'),detail=make('p','tablet-order-detail'),bill=make('p','tablet-order-bill'),proximity=make('p','tablet-order-proximity');
  const patience=make('progress','tablet-order-patience');patience.max=100;patience.setAttribute('aria-label','Patience du client');
  const actions=make('div','tablet-order-actions'),buttons={};
  for(const [action,label]of [['take','Prendre la commande']]){
   const item=button(label,null,'tablet-button');item.dataset.tabletOrderAction=action;actions.append(item);buttons[action]=item;
  }
  card.append(head,customer,detail,bill,patience,proximity,actions);grid.append(card);seats.set(key,{card,badge,customer,detail,bill,proximity,patience,buttons});
 }
 for(const table of BarEngine.tables||[{id:1},{id:2},{id:3},{id:4}])seatCard('table:'+table.id,'Table '+table.id,tableGrid);
 for(const {slot}of BarEngine.counterSeats)seatCard('counter:'+slot,'Comptoir '+(slot+1),counterGrid);
 function orderPlace(order){return order.tableId?'Table '+order.tableId:'Comptoir '+((order.slot??0)+1)}
 function reachOrder(order){return !!game.canReachOrder?.(order.id,camera)}
 function refreshService(s){
  const payments=s.payments||{},orders=s.orders||[],crowd=game.crowdInfo();
  serviceNote.textContent='Approchez-vous d’un client pour noter sa commande ici. Choisissez ensuite sa boisson au rangement des verres derrière le bar. Le service et les paiements se font directement auprès du client avec E.';
  roomServiceText.textContent=s.gameOver?'Votre trésorerie est épuisée. La rubrique Bâtiment permet de commencer un nouveau bar.':s.closing?'Les nouvelles arrivées sont arrêtées. Terminez les commandes et encaissez les derniers clients.':s.open?'Le bar accueille les clients. Lancez la dernière tournée lorsque vous souhaitez terminer le service.':'Le bar est fermé. Ouvrez le service pour accueillir vos premiers clients.';
  const count=orders.length,unpaid=orders.filter(order=>['payment','cash-collected','change-ready','card-processing'].includes(order.phase)).length;
  roomSummary.textContent=`${count} / ${crowd.capacity} clients · ${unpaid} règlement${unpaid>1?'s':''} en cours · Terminal ${payments.terminalWithWaiter?'avec le serveur':payments.terminalCarried?'avec vous':'au comptoir'}`;
  crowdTitle.textContent=`Fréquentation · ${crowd.counterSeatsUnlocked} / ${BarEngine.counterSeats.length} places au comptoir`;
  crowdDetail.textContent=crowd.nextThreshold===null?'Toutes les places sont débloquées. Votre bar peut accueillir jusqu’à '+crowd.capacity+' clients à la fois.':`${crowd.totalSold} / ${crowd.nextThreshold} clients encaissés · Une place supplémentaire au prochain palier. Le déblocage est automatique.`;
  crowdProgress.hidden=crowd.nextThreshold===null;crowdProgress.max=Math.max(1,(crowd.nextThreshold??crowd.currentThreshold)-crowd.currentThreshold);crowdProgress.value=crowd.totalSold-crowd.currentThreshold;
  crowdProgress.setAttribute('aria-valuetext',crowd.nextThreshold===null?'Toutes les places sont débloquées':`${crowd.totalSold} clients encaissés sur ${crowd.nextThreshold}`);
  const counterOrders=orders.filter(order=>!order.tableId);
  for(const [key,entry]of seats){
   const [kind,index]=key.split(':'),order=kind==='table'?orders.find(order=>order.tableId===Number(index)):counterOrders.find((order,i)=>(order.slot??i)===Number(index));
   const locked=kind==='counter'&&!order&&Number(index)>=crowd.counterSeatsUnlocked;
   entry.card.dataset.serviceLocked=String(locked);
   entry.card.classList.toggle('tablet-seat-empty',!order);entry.card.classList.toggle('tablet-order-selected',!!order&&order.id===selectedOrderId);
   for(const item of Object.values(entry.buttons)){item.hidden=true;item.disabled=true;if(order)item.dataset.orderId=order.id;else delete item.dataset.orderId;}
   if(!order){
    delete entry.card.dataset.serviceOrder;entry.badge.textContent=locked?'À débloquer':'Libre';entry.badge.dataset.phase=locked?'locked':'free';entry.customer.textContent=locked?'La clientèle grandit avec votre bar':'Place disponible';
    const threshold=locked?BarEngine.crowdStages.find(stage=>stage.counterSeatsUnlocked>Number(index))?.threshold:null;
    entry.detail.textContent=locked?`Ce tabouret accueillera des clients à partir de ${threshold} clients encaissés.`:kind==='table'?'Un client pourra s’y installer.':'Les clients s’installent sur ce tabouret et annoncent leur commande.';
    entry.bill.hidden=entry.proximity.hidden=entry.patience.hidden=true;continue;
   }
   entry.card.dataset.serviceOrder=order.id;const phase=order.phase||'preparing',arriving=(order.arrivalRemaining||0)>0,near=reachOrder(order);
   entry.badge.textContent=arriving?'S’installe…':phaseNames[phase]||'En service';entry.badge.dataset.phase=phase;
   entry.customer.textContent=order.name||'Client';
   const known=phase!=='awaiting-order',recipe=recipes[order.recipe];
   entry.detail.textContent=arriving?'Le client rejoint sa place.':!known?'Approchez-vous pour lui demander ce qu’il souhaite.':recipe?.name||'Commande en cours';
   if(phase==='drinking')entry.detail.textContent=`${recipe?.name||'Boisson'} · dégustation, ${Math.ceil(order.drinkRemaining||0)} s`;
   if(phase==='card-processing')entry.detail.textContent=`Validation du terminal · ${Math.ceil(order.cardRemaining||0)} s`;
   if(phase==='cash-collected')entry.detail.textContent=`${money(order.tender||0)} reçus. Rejoignez la caisse pour préparer la monnaie.`;
   if(phase==='change-ready')entry.detail.textContent=`Rapportez ${money(Math.max(0,(order.tender||0)-(order.due||0)))} de monnaie et le ticket au client.`;
   const job=s.staff?.bartender,waiter=s.staff?.waiter,beingServed=phase==='preparing'&&waiter?.task==='serve'&&waiter.orderId===order.id;
   if(phase==='preparing'&&job?.orderId===order.id)entry.detail.textContent+=` · préparateur, ${Math.ceil(job.remaining)} s`;
   if(beingServed){entry.badge.textContent='Serveur en route';entry.detail.textContent=`${recipe?.name||'Boisson'} · apportée par le serveur, ${Math.ceil(waiter.remaining)} s`;}
   entry.bill.hidden=!['payment','cash-collected','change-ready','card-processing'].includes(phase);
   entry.bill.textContent=`À régler : ${money(order.due||0)} · ${order.paymentMethod==='cash'?'Espèces':'Carte bancaire'}`;
   entry.patience.hidden=arriving||!['awaiting-order','preparing'].includes(phase);entry.patience.value=Math.max(0,order.patience||0);
   entry.proximity.hidden=arriving||beingServed||['drinking','card-processing'].includes(phase);entry.proximity.textContent=near?'Vous êtes à portée du client.':`Rejoignez ${order.tableId?'la table '+order.tableId:'ce client au comptoir'} pour intervenir.`;entry.proximity.dataset.near=String(near);
   const enable=(name,allowed,label)=>{const item=entry.buttons[name];item.hidden=false;item.disabled=!allowed||arriving||s.gameOver;if(label)item.textContent=label;};
   if(phase==='awaiting-order')enable('take',near);
   if(phase==='preparing'&&!beingServed){
    const ticket=game.preparationQueue().find(ticket=>ticket.orderId===order.id);
    entry.detail.textContent=recipe.name+' · '+({todo:'À préparer',preparing:'En préparation',ready:ticket?.prepId?'Prête au poste':'Prête sur le plateau',serving:'En service'}[ticket?.status]||'À préparer');
    entry.proximity.textContent=ticket?.status==='ready'?'Prenez la boisson et regardez le client avec E pour servir.':'Choisissez la boisson au rangement des verres, derrière le bar.';
   }
   if(phase==='payment'||phase==='cash-collected'||phase==='change-ready')entry.proximity.textContent='Regardez le client avec E pour le règlement ; la monnaie se prépare à la caisse derrière le bar.';
   const paymentStatus=game.waiterPaymentStatus?.(order.id);
   if(game.paymentHandledByWaiter?.(order.id)){
    entry.badge.textContent=paymentStatus?.blocked?'Serveur en attente':'Encaissement par le serveur';
    entry.detail.textContent=waiterPaymentMessage(paymentStatus);entry.proximity.hidden=false;
    entry.proximity.textContent=paymentStatus?.blocked==='change'?'Alimentez le fond de caisse pour permettre au serveur de rendre la monnaie.':'Le serveur termine ce règlement ; vous pouvez continuer le service.';
    for(const item of Object.values(entry.buttons))item.disabled=true;
   }else if(paymentStatus?.blocked==='terminal'&&phase==='payment')entry.proximity.textContent=waiterPaymentMessage(paymentStatus);
  }
 }

 // The register remains a physical station: remote consultation never authorizes a payment.
 const register=pages.get('register'),registerNote=make('div','tablet-reserve-note'),finance=make('div','tablet-finance-summary');
 const amounts={};for(const [key,label]of [['till','Dans le tiroir'],['bank','Trésorerie hors caisse'],['cash','Espèces encaissées'],['card','Cartes encaissées']]){const item=make('div');amounts[key]=make('strong');item.append(make('span',null,label),amounts[key]);finance.append(item);}
 const terminalPanel=make('div','tablet-terminal-panel'),terminalCopy=make('div'),terminalState=make('strong'),terminalDetail=make('p');terminalCopy.append(terminalState,terminalDetail);
 const terminalActions=make('div','tablet-terminal-actions'),pickupTerminal=button('Prendre le terminal','terminal-pickup','tablet-button'),returnTerminal=button('Reposer le terminal','terminal-return','tablet-button tablet-button-subtle'),fundTill=button('Alimenter le tiroir','fund-till','tablet-button tablet-button-subtle');
 const fundControls=make('div','tablet-fund-controls'),fundAmount=make('input');fundAmount.type='number';fundAmount.min='.01';fundAmount.step='.01';fundAmount.value='20';fundAmount.id='tabletFundAmount';fundAmount.setAttribute('aria-label','Montant en euros à ajouter au tiroir');fundAmount.addEventListener('input',()=>refresh(true));fundControls.append(fundAmount,fundTill);terminalActions.append(pickupTerminal,returnTerminal,fundControls);terminalPanel.append(terminalCopy,terminalActions);
 const cashHeading=make('h3','tablet-group-title','Espèces à traiter'),cashEmpty=make('p','tablet-empty','Aucune somme à compter. Prenez les espèces auprès d’un client qui a terminé sa boisson.'),cashList=make('div','tablet-cash-list');
 const receiptsHeading=make('h3','tablet-group-title','Derniers encaissements'),receipts=make('div','tablet-receipts');register.append(registerNote,finance,terminalPanel,cashHeading,cashEmpty,cashList,receiptsHeading,receipts);
 const cashCards=new Map();let receiptsSignature='';
 function cashCard(order){
  const card=make('article','tablet-cash-card');card.dataset.cashOrder=order.id;card.tabIndex=-1;
  const title=make('h4'),details=make('p','tablet-cash-details'),expected=make('strong','tablet-change-due');
  const coins=make('div','tablet-denominations');coins.setAttribute('aria-label','Pièces et billets à rendre');
  for(const value of [.05,.1,.2,.5,1,2,5,10,20]){const item=button(money(value),null,'tablet-denomination');item.dataset.changeCoin=value;item.dataset.orderId=order.id;item.dataset.banknote=String(value>=5);coins.append(item);}
  const controls=make('div','tablet-change-controls'),label=make('label'),input=make('input');input.type='number';input.min='0';input.step='.01';input.value='0';input.id='change-'+order.id;input.dataset.changeInput=order.id;label.htmlFor=input.id;label.append(make('span',null,'Monnaie sélectionnée'),input);
  const reset=button('Recommencer',null,'tablet-button tablet-button-subtle');reset.dataset.changeReset=order.id;
  const confirm=button('Préparer la monnaie',null,'tablet-button');confirm.dataset.changeConfirm=order.id;controls.append(label,reset,confirm);
  const hint=make('p','tablet-change-hint');card.append(title,details,expected,coins,controls,hint);cashList.append(card);
  const entry={card,title,details,expected,coins,input,reset,confirm,hint};cashCards.set(order.id,entry);return entry;
 }
 function refreshRegister(s){
  const payments=s.payments||{},near=!!game.nearRegister?.(camera),bank=game.availableBank?.()??Math.max(0,s.cash-(payments.till||0)),terminalReserved=s.staff.waiter?.task==='pickup-terminal';
  registerNote.textContent=near?'Vous êtes devant la caisse. Comptez la monnaie, rechargez le tiroir ou prenez le terminal.':'Rejoignez la caisse derrière le bar pour manipuler l’argent ou prendre le terminal sans fil.';registerNote.classList.toggle('tablet-reserve-present',near);
  amounts.till.textContent=money(payments.till||0);amounts.bank.textContent=money(bank);amounts.cash.textContent=money(payments.cashRevenue||0);amounts.card.textContent=money(payments.cardRevenue||0);
  terminalState.textContent=payments.terminalWithWaiter?'Terminal sans fil : avec le serveur':terminalReserved?'Terminal réservé : le serveur arrive':payments.terminalOrderId?'Terminal : paiement en cours':payments.terminalCarried?'Terminal sans fil : avec vous':'Terminal sans fil : sur son socle';
  terminalDetail.textContent=payments.terminalWithWaiter?'Le serveur encaisse par carte puis rapporte le terminal sur son socle.':payments.terminalCarried?'Présentez-le directement au client, puis reposez-le sur son socle pour le partager avec le serveur.':'Le terminal est partagé avec le serveur. Il le prend pour les cartes et le rapporte après chaque encaissement.';
  pickupTerminal.hidden=!!payments.terminalCarried;returnTerminal.hidden=!payments.terminalCarried;
  pickupTerminal.disabled=!near||s.gameOver||payments.terminalWithWaiter||terminalReserved;returnTerminal.disabled=!near||!!payments.terminalOrderId||s.gameOver;fundAmount.disabled=!near||s.gameOver;const funding=Number(fundAmount.value);fundTill.disabled=!near||s.gameOver||!Number.isFinite(funding)||funding<=0||bank<funding||!game.fundTill;
  const pending=s.orders.filter(order=>order.phase==='cash-collected'),ids=new Set(pending.map(order=>order.id));
  for(const [id,entry]of cashCards)if(!ids.has(id)){entry.card.remove();cashCards.delete(id);}
  cashEmpty.hidden=pending.length>0;
  for(const order of pending){
   const entry=cashCards.get(order.id)||cashCard(order),change=Math.round(((order.tender||0)-(order.due||0))*100)/100;
   entry.card.classList.toggle('tablet-order-selected',order.id===selectedOrderId);entry.title.textContent=`${orderPlace(order)} · ${order.name||'Client'}`;
   entry.details.textContent=`Addition : ${money(order.due||0)} · Espèces reçues : ${money(order.tender||0)}`;entry.expected.textContent=`À rendre : ${money(change)}`;
   const handled=game.paymentHandledByWaiter?.(order.id);
   entry.input.disabled=entry.reset.disabled=entry.confirm.disabled=!near||s.gameOver||handled;for(const item of entry.coins.children)item.disabled=!near||s.gameOver||handled;
   entry.hint.textContent=!near?'Rejoignez la caisse pour compter la monnaie.':change>(payments.till||0)?'Le tiroir manque de monnaie. Ajoutez-y de la trésorerie avant de continuer.':'Sélectionnez les pièces et billets, puis rapportez la monnaie et le ticket au client.';
   if(handled)entry.hint.textContent=waiterPaymentMessage(game.waiterPaymentStatus(order.id));
  }
  const history=payments.receipts||[],signature=JSON.stringify(history);if(signature!==receiptsSignature){receiptsSignature=signature;receipts.replaceChildren();if(!history.length)receipts.append(make('p','tablet-empty','Aucun règlement encaissé pour le moment.'));for(const receipt of history.slice(0,10)){const row=make('div','tablet-receipt');row.append(make('span',null,`${receipt.customerName||'Client'} · ${receipt.tableId?'Table '+receipt.tableId:'Comptoir'}`),make('span',null,receipt.method==='card'?'Carte bancaire':'Espèces'),make('strong',null,money(receipt.amount||0)));receipts.append(row);}}
 }

 // Order tickets replace the old recipe-launch catalogue.
 const orders=pages.get('orders');
 orders.append(make('p','tablet-order-note','Les commandes prises apparaissent ici et dans votre vue du bar. Au rangement des verres, appuyez sur E pour choisir la boisson et son récipient. Posez-le au poste indiqué ; vous pouvez laisser plusieurs préparations en cours.'));
 const orderList=make('div');orderList.id='tabletOrderQueue';orders.append(orderList);BarOrders.mount(orderList);

 // Deliveries go to the physical storeroom. Only a player in that room can refill the bar.
 const reserve=pages.get('reserve'),reserveNote=make('div','tablet-reserve-note');reserve.append(reserveNote);
 const stockTable=make('div','tablet-stock-table');stockTable.setAttribute('role','table');stockTable.setAttribute('aria-label','Inventaire et réapprovisionnement');
 const stockHeading=make('div','tablet-stock-heading');stockHeading.setAttribute('role','row');for(const label of ['Ingrédient','Au comptoir','En réserve','Approvisionnement']){const cell=make('span',null,label);cell.setAttribute('role','columnheader');stockHeading.append(cell)}stockTable.append(stockHeading);
 for(const [key,ingredient]of Object.entries(ingredients)){
  const row=make('div','tablet-stock-row');row.setAttribute('role','row');row.dataset.stockKey=key;
  const name=make('div','tablet-stock-name'),licenseNote=make('small','tablet-stock-license');name.append(make('strong',null,ingredient.name),make('small',null,`Lot de ${number(ingredient.pack)} ${ingredient.unit}`),licenseNote);
  const service=make('div','tablet-stock-value'),serviceAmount=make('strong'),capacity=make('small');service.append(serviceAmount,capacity);
  const stored=make('div','tablet-stock-value'),reserveAmount=make('strong'),delivery=make('small');stored.append(reserveAmount,delivery);
  const actions=make('div','tablet-stock-actions'),refill=button('Réapprovisionner',null,'tablet-button tablet-button-subtle'),buy=button(`Commander · ${money(ingredient.cost)}`,null,'tablet-button');refill.dataset.tabletRestock=key;buy.dataset.tabletBuy=key;actions.append(refill,buy);
  for(const cell of [name,service,stored,actions]){cell.setAttribute('role','cell');row.append(cell)}stockTable.append(row);stockRows.set(key,{serviceAmount,capacity,reserveAmount,delivery,refill,buy,licenseNote});
 }
 reserve.append(stockTable,make('p','tablet-section-note','Les commandes arrivent dans la réserve après 10 secondes de jeu. Rejoignez la pièce derrière le bar pour apporter les ingrédients au comptoir.'));

 const building=pages.get('building');
 const summary=make('div','tablet-building-summary');summary.append(make('span','tablet-eyebrow','VOTRE ADRESSE'),make('h3',null,'Un bar de quartier à faire grandir.'),make('p',null,'Une salle ouverte aux clients, un comptoir équipé et une réserve séparée pour organiser le service.'));building.append(summary);
 const licenses=pages.get('licenses'),team=pages.get('team');
 const licenseIntro=make('div','tablet-management-intro');licenseIntro.append(icon('licenses'),make('div',null));licenseIntro.lastChild.append(make('h3',null,'Une carte qui grandit avec votre réputation.'),make('p',null,'La carte de base est incluse. Servez des clients pour débloquer les licences suivantes, puis achetez-les ici.'));licenses.append(licenseIntro);
 const teamIntro=make('div','tablet-management-intro');teamIntro.append(icon('team'),make('div',null));teamIntro.lastChild.append(make('h3',null,'Un coup de main pendant le service.'),make('p',null,'Confiez les stocks et la préparation à votre équipe. Le serveur prend les commandes, apporte les boissons et encaisse les espèces comme les cartes. Il partage le terminal avec vous.'));team.append(teamIntro);
 const upgradeLists=new Map();for(const key of ['building','licenses','team']){const list=make('div','tablet-upgrade-list');pages.get(key).append(list);upgradeLists.set(key,list)}
 for(const key of ['building','licenses','team'])pages.get(key).append(make('p','tablet-section-note','Les déblocages dépendent du nombre total de clients servis. Les achats et recrutements sont conservés dans votre sauvegarde.'));
 const newBarNotice=make('div','tablet-service-notice'),newBarAction=button('Nouveau bar','new-bar','tablet-button tablet-button-subtle');
 newBarNotice.append(make('p',null,'Recommencez avec un nouveau bar. Une confirmation protège la partie actuelle ; vos sauvegardes manuelles restent disponibles.'),newBarAction);building.append(newBarNotice);
 function syncUpgrades(){
  const catalog=BarEngine.managementUpgrades||{},signature=JSON.stringify(catalog);if(signature===upgradesSignature)return;upgradesSignature=signature;
  for(const list of upgradeLists.values())list.replaceChildren();upgradeCards.clear();
  for(const [id,offer]of Object.entries(catalog)){
   const list=upgradeLists.get(offer.category);if(!list)continue;
   const card=make('article','tablet-upgrade-card');card.dataset.upgrade=id;
   const copy=make('div','tablet-upgrade-copy'),topLine=make('div','tablet-upgrade-top'),name=make('h3'),owned=make('span','tablet-owned');topLine.append(name,owned);copy.append(topLine);
   const description=make('p'),statusText=make('p','tablet-upgrade-status');const progress=make('progress','tablet-unlock-progress');progress.setAttribute('aria-label','Clients servis pour débloquer cette amélioration');copy.append(description);
   if(offer.category==='licenses'){const menu=Object.values(recipes).filter(recipe=>recipe.license===id).map(recipe=>recipe.name);copy.append(make('p','tablet-license-menu',`À la carte : ${menu.join(' · ')}`));}
   copy.append(statusText,progress);
   const purchase=button('',null,'tablet-button');purchase.dataset.tabletUpgrade=id;card.append(copy,purchase);list.append(card);upgradeCards.set(id,{card,name,owned,description,statusText,progress,purchase});
  }
 }

 function setTab(key){current=Object.hasOwn(sections,key)?key:'orders';for(const [id,page]of pages)page.hidden=id!==current;for(const [id,item]of navButtons){item.classList.toggle('active',id===current);if(id===current)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current')}eyebrow.textContent=sections[current][0];title.textContent=sections[current][1];feedback.textContent='';main.scrollTop=0;refresh(true)}
 function refresh(force=false){
  if(!dialog.open&&!force)return;const now=performance.now();if(!force&&now-lastRefresh<200)return;lastRefresh=now;
  const s=game.s,inReserve=!!BarScene.inStockroom?.(camera);syncUpgrades();BarOrders.refresh();cash.textContent=money(s.cash);serviceStatus.textContent=s.gameOver?'Partie terminée':s.closing?'Dernière tournée':s.open?'Service ouvert':'Service fermé';serviceStatus.dataset.open=String(s.open&&!s.closing);
  refreshService(s);refreshRegister(s);
  location.textContent=inReserve?'Dans la réserve':game.canWork(camera)?'Derrière le bar':'Dans la salle';location.dataset.reserve=String(inReserve);
  roomServiceAction.hidden=false;roomServiceAction.disabled=s.closing||s.gameOver;roomServiceAction.textContent=s.open?'Dernière tournée':'Ouvrir le bar';
  newBarAction.disabled=!GameMenu.hasSession()||GameMenu.getMode()!=='play'||paused;
  reserveNote.textContent=inReserve?'Vous êtes dans la réserve. Réapprovisionnez le comptoir avec les ingrédients disponibles.':'Pour réapprovisionner le comptoir, rejoignez la réserve derrière le bar puis appuyez sur E.';reserveNote.classList.toggle('tablet-reserve-present',inReserve);
  for(const [key,row]of stockRows){const ingredient=ingredients[key],stored=s.reserve?.[key]||0,limit=game.serviceCapacity(key);row.serviceAmount.textContent=`${number(s.stock[key])} ${ingredient.unit}`;row.capacity.textContent=`Capacité : ${number(limit)} ${ingredient.unit}`;row.reserveAmount.textContent=`${number(stored)} ${ingredient.unit}`;const deliveries=s.deliveries.filter(d=>d.key===key);row.delivery.textContent=deliveries.length?`${deliveries.length} lot${deliveries.length>1?'s':''} en route · ${Math.ceil(Math.min(...deliveries.map(d=>d.remaining)))} s`:'Aucune livraison en cours';row.refill.disabled=!inReserve||s.gameOver||stored<=0||s.stock[key]>=limit;row.refill.title=!inReserve?'Rejoignez la réserve pour transférer les ingrédients.':'';const licensed=game.canBuy(key);row.buy.disabled=s.gameOver||s.cash<ingredient.cost||!licensed;row.licenseNote.hidden=licensed;row.licenseNote.textContent=licensed?'':`${BarEngine.managementUpgrades[ingredient.license]?.name||'Licence'} requise`;row.buy.title=licensed?'':row.licenseNote.textContent;}
  for(const [id,entry]of upgradeCards){
   const offer=game.upgradeInfo(id);entry.name.textContent=offer.name;entry.description.textContent=offer.description;entry.owned.hidden=!offer.owned;entry.owned.textContent=offer.category==='team'?'Recruté':'Acquis';entry.card.classList.toggle('tablet-upgrade-owned',offer.owned);entry.progress.hidden=offer.owned||s.totalSold>=offer.requiredSales;entry.progress.max=Math.max(1,offer.requiredSales);entry.progress.value=Math.min(offer.requiredSales,s.totalSold);
   const requirements=[];if(s.totalSold<offer.requiredSales)requirements.push(`${s.totalSold} / ${offer.requiredSales} clients servis pour débloquer`);if(offer.unmetPrerequisites?.length)requirements.push('À acheter d’abord : '+offer.unmetPrerequisites.map(key=>BarEngine.managementUpgrades[key].name).join(', '));
   entry.statusText.textContent=offer.owned?(offer.category==='team'?`${s.open?'En poste':'Prêt pour le prochain service'} · ${money(offer.salary||0)} de salaire par soir`:'Disponible pour tous les prochains services'):requirements.length?requirements.join(' · '):(s.cash<offer.cost?`Débloqué · Il manque ${money(offer.cost-s.cash)}`:'Débloqué · Achat disponible');entry.purchase.disabled=offer.owned||!offer.unlocked||s.cash<offer.cost||s.gameOver;entry.purchase.textContent=offer.owned?(offer.category==='team'?'Dans votre équipe':'Déjà acquis'):`${offer.category==='team'?'Recruter':'Acheter'} · ${money(offer.cost)}`;
  }
  for(const id of ['bartender','waiter']){const job=s.staff?.[id],entry=upgradeCards.get(id);if(!job||!entry)continue;const order=s.orders.find(order=>order.id===job.orderId);entry.statusText.textContent=`${id==='bartender'?'Prépare '+(recipes[job.recipe]?.name||'une boisson'):job.task==='take-order'?'Prend une commande':job.task==='serve'?'Apporte une boisson':waiterPaymentMessage(game.waiterPaymentStatus?.())}${order?' · '+orderPlace(order):''} · ${Math.ceil(job.remaining)} s`;}
  if(s.management.waiter&&!s.staff.waiter){const waiting=game.waiterPaymentStatus?.();if(waiting)upgradeCards.get('waiter').statusText.textContent=waiterPaymentMessage(waiting);}
 }
 function focusOrder(id){selectedOrderId=Number.isSafeInteger(id)?id:null;refresh(true);const entry=[...seats.values()].find(entry=>Number(entry.card.dataset.serviceOrder)===selectedOrderId);const card=current==='register'?cashCards.get(selectedOrderId)?.card:entry?.card;if(card){card.focus({preventScroll:true});card.scrollIntoView({block:'nearest'});}}
 function open(tab='orders',orderId){
  if(!window.GameMenu?.hasSession()||GameMenu.getMode()!=='play'||paused||$('modal').open||$('settingsModal').open)return false;
  keys={};game.setPour(false);window.BarInput?.suspend();selectedOrderId=Number.isSafeInteger(orderId)?orderId:null;setTab(tab);
  if(!dialog.open)dialog.showModal();document.body.dataset.tabletOpen='true';refresh(true);
  navButtons.get(current)?.focus({preventScroll:true});if(selectedOrderId!==null)focusOrder(selectedOrderId);return true;
 }
 function close({resumeLook=true,suspend=false}={}){
  if(!dialog.open)return false;dialog.close();document.body.dataset.tabletOpen='false';keys={};game.setPour(false);
  if(suspend||paused||GameMenu.getMode()!=='play')window.BarInput?.suspend();else if(resumeLook)window.BarInput?.enterLook();else window.BarInput?.enterCursor();return true;
 }
 function toggle(){return dialog.open?close():open()}
 function handleEscape(){if(!dialog.open)return false;close();return true}
 function reset(){close({suspend:true});selectedOrderId=null;for(const entry of cashCards.values())entry.card.remove();cashCards.clear();receiptsSignature='';setTab('orders')}
 dialog.addEventListener('cancel',event=>{event.preventDefault();handleEscape()});
 dialog.addEventListener('close',()=>{document.body.dataset.tabletOpen=String(dialog.open)});
 dialog.addEventListener('click',event=>{
  if(!dialog.open||!window.GameMenu?.hasSession()||GameMenu.getMode()!=='play'||paused||$('modal').open||$('settingsModal').open)return;
  const target=event.target.closest('button');if(!target||target.disabled)return;
  if(target.dataset.tabletTab){setTab(target.dataset.tabletTab);return}
  if(target.dataset.tabletLicense){const id=target.dataset.tabletLicense;setTab('licenses');const entry=upgradeCards.get(id);if(entry){entry.card.tabIndex=-1;entry.card.focus({preventScroll:true});entry.card.scrollIntoView({block:'center'});}return;}
  const actAndRefresh=fn=>{let message;act(()=>{message=fn();return message});feedback.textContent=message||'';refresh(true);};
  if(target.dataset.tabletOrderAction){
   const id=Number(target.dataset.orderId),order=game.s.orders.find(order=>order.id===id);if(!order){feedback.textContent='Ce client a quitté sa place.';refresh(true);return;}
   selectedOrderId=id;
   if(target.dataset.tabletOrderAction==='take')actAndRefresh(()=>game.takeOrder(id,camera));
   return;
  }
  if(target.dataset.changeCoin!==undefined){const entry=cashCards.get(Number(target.dataset.orderId));if(entry&&!entry.input.disabled){const currentAmount=Number(entry.input.value)||0;entry.input.value=(Math.round((currentAmount+Number(target.dataset.changeCoin))*100)/100).toFixed(2);}return;}
  if(target.dataset.changeReset){const entry=cashCards.get(Number(target.dataset.changeReset));if(entry)entry.input.value='0';return;}
  if(target.dataset.changeConfirm){const id=Number(target.dataset.changeConfirm),entry=cashCards.get(id);if(entry)actAndRefresh(()=>game.prepareChange(id,Number(entry.input.value),camera));return;}
  if(target.dataset.tabletBuy){let message;act(()=>{message=game.buy(target.dataset.tabletBuy);return message});feedback.textContent=message||'Commande enregistrée.';refresh(true);return}
  if(target.dataset.tabletRestock){if(!BarScene.inStockroom?.(camera)){feedback.textContent='Rejoignez la réserve pour réapprovisionner le comptoir.';refresh(true);return}const key=target.dataset.tabletRestock;let message;act(()=>{message=game.restock(key);return message});feedback.textContent=message||'Comptoir réapprovisionné.';refresh(true);return}
  if(target.dataset.tabletUpgrade){let message;act(()=>{message=game.purchaseUpgrade(target.dataset.tabletUpgrade);return message});feedback.textContent=message||'Amélioration acquise.';refresh(true);return}
  switch(target.dataset.tabletAction){case'close':close();break;case'service':actAndRefresh(()=>game.s.open?game.close():game.open());break;case'new-bar':GameMenu.newGame();break;case'terminal-pickup':actAndRefresh(()=>game.pickupTerminal(camera));break;case'terminal-return':actAndRefresh(()=>game.returnTerminal(camera));break;case'fund-till':actAndRefresh(()=>game.fundTill(Number(fundAmount.value),camera));break}
 });
 return {open,close,toggle,isOpen:()=>dialog.open,refresh,handleEscape,reset,getTab:()=>current,focusOrder};
})();
