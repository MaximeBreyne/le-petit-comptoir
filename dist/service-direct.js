'use strict';
// The same payment rules serve the tablet and the physical counter. Looking at
// a customer selects that customer; proximity alone never chooses their bill.
window.BarService=(()=>{
 const denominationCents=[1,2,5,10,20,50,100,200,500,1000,2000,5000];
 const cashCards=new Map();
 let registerRoot=null,registerFeedback=null,registerAmounts=null,fundInput=null,fundButton=null,cashEmpty=null,cashList=null,ticket=null;
 const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node};
 const button=(label,className='')=>{const node=make('button',className,label);node.type='button';return node};
 const cents=value=>Math.round(Number(value||0)*100);
 const atRegister=position=>!!position&&position.z<2.5&&game.nearRegister(position);
 const place=order=>order.tableId?'Table '+order.tableId:'Comptoir';
 const isRegisterOpen=()=>!!registerRoot&&$('modal').open&&registerRoot.isConnected&&$('modalContent').contains(registerRoot);
 function aim(position,point,radius,maxDistance){
  const dx=point.x-position.x,dy=point.y-position.y,dz=point.z-position.z,distance=Math.hypot(dx,dy,dz);
  const pitch=position.pitch||0,cp=Math.cos(pitch),projection=dx*Math.sin(position.a)*cp+dy*Math.sin(pitch)+dz*Math.cos(position.a)*cp;
  if(projection<=.1||distance>maxDistance)return null;
  const transverse=Math.sqrt(Math.max(0,distance*distance-projection*projection));
  return transverse<=radius?{aimScore:transverse/radius,distance}:null;
 }
 function customerLabel(order){
  const phase=game.orderPhase(order),location=place(order);
  const checkout=game.checkoutInfo(order);
  if(checkout&&!checkout.ready)return checkout.state==='walking'?'Le client rejoint la caisse':checkout.state==='queued'?'Dans la file de la caisse':'Attend son tour pour rejoindre la caisse';
  if(game.paymentHandledByWaiter?.(order.id))return waiterPaymentMessage(game.waiterPaymentStatus(order.id))+' · '+location;
  if(phase==='awaiting-order')return `Noter la commande sur la tablette · ${location}`;
  if(phase==='preparing'){
   if(game.s.staff.waiter?.task==='serve'&&game.s.staff.waiter.orderId===order.id)return `Serveur en route · ${location}`;
   return game.trayDrinkIndex(order)>=0?`Servir ${recipes[order.recipe].name} · ${location}`:`${location} : ${recipes[order.recipe].name} à préparer au bar`;
  }
  if(phase==='drinking')return `${location} : le client déguste sa boisson`;
  if(phase==='cash-collected')return 'Préparer la monnaie sur l’écran de caisse';
  if(phase==='change-ready')return `Remettre ${(order.change||0)>0?'la monnaie et le ticket':'le ticket'} · ${location}`;
  if(phase==='card-processing')return `Paiement par carte en cours · ${location}`;
  if(phase==='payment'&&order.paymentMethod==='cash')return `Prendre ${money(order.tender)} en espèces · ${location}`;
  if(phase==='payment')return game.s.payments.terminalCarried?`Présenter le terminal · ${location}`:`Paiement par carte · prenez le terminal au comptoir`;
  return location;
 }
 function target(position=camera){
  if(!position||!Number.isFinite(position.a))return null;
  const candidates=[];
  if(atRegister(position)){
   for(const [kind,point,radius,label]of [
    ['register',{x:2.65,y:1.39,z:2.94},.30,'Ouvrir la caisse'],
    ['terminal',{x:3.25,y:1.2,z:2.65},.16,game.s.payments.terminalWithWaiter?'Terminal utilisé par le serveur':game.s.staff.waiter?.task==='pickup-terminal'?'Le serveur vient chercher le terminal':game.s.payments.terminalCarried?'Reposer le terminal sur son socle':'Prendre le terminal sans fil'],
   ]){const hit=aim(position,point,radius,1.8);if(hit)candidates.push({action:'direct-service',kind,label,...hit});}
  }
  for(const order of game.s.orders){
   if(!game.canReachOrder(order.id,position))continue;
   const visual=typeof customerVisuals!=='undefined'?customerVisuals.get(order.id):null;
   const seat=order.tableId?BarScene.tableSeat(order.tableId):null;
   const counter=BarScene.counterSeat(game.counterSeat(order).slot);
   const checkout=game.checkoutInfo(order),point=checkout?{...checkout.position,y:checkout.position.y+1.65}:{x:visual?.x??seat?.x??counter.x,y:(visual?.y??seat?.y??0)+(order.tableId?1.25:1.5),z:visual?.z??seat?.z??counter.z};
   const hit=aim(position,point,.48,4);if(hit)candidates.push({action:'direct-service',kind:'customer',orderId:order.id,label:customerLabel(order),...hit});
  }
  return candidates.sort((a,b)=>a.aimScore-b.aimScore||a.distance-b.distance)[0]||null;
 }
 function use(request){
  if(paused||GameMenu.getMode()!=='play'||menusOpen()||window.BarTablet?.isOpen())return false;
  const current=target(camera);
  if(!current||current.kind!==request?.kind||current.orderId!==request?.orderId)return false;
  if(current.kind==='register')return openRegister();
  if(current.kind==='terminal'){
   if(game.s.payments.terminalWithWaiter||game.s.staff.waiter?.task==='pickup-terminal'){toast('Le serveur rapporte le terminal après son encaissement.');return true;}
   act(()=>game.s.payments.terminalCarried?game.returnTerminal(camera):game.pickupTerminal(camera));return true;
  }
  const order=game.s.orders.find(order=>order.id===current.orderId);if(!order)return false;
  if(game.paymentHandledByWaiter?.(order.id)){toast(waiterPaymentMessage(game.waiterPaymentStatus(order.id)));return true;}
  const phase=game.orderPhase(order);
  if(phase==='awaiting-order')BarTablet.open('service',order.id);
  else if(phase==='preparing')act(()=>game.serve(order.id,camera));
  else if(phase==='payment')act(()=>order.paymentMethod==='cash'?game.collectCash(order.id,camera):game.payCard(order.id,camera));
  else if(phase==='change-ready')act(()=>game.completeCash(order.id,camera));
  else if(phase==='cash-collected')openRegister();
  else if(phase==='card-processing')toast('Autorisation bancaire en cours…');
  else toast('Le client déguste sa boisson. Il rejoindra la caisse pour régler.');
  return true;
 }
 function transact(fn){
  if(!isRegisterOpen()||paused||!atRegister(camera)){toast('Rejoignez la caisse derrière le bar.');return;}
  let message;act(()=>{message=fn();return message});
  if(registerFeedback)registerFeedback.textContent=message||'';
  refresh();
 }
 function cashCard(order){
  const node=make('article','counter-cash-card');node.dataset.directOrder=order.id;
  const title=make('h3'),details=make('p'),due=make('strong','counter-change-due'),coins=make('div','counter-coins');coins.setAttribute('aria-label','Pièces et billets à rendre');
  const selected=[];
  for(const value of denominationCents){
   const coin=button(money(value/100),'counter-coin');coin.dataset.directCoin=value;coin.dataset.orderId=order.id;coin.dataset.banknote=String(value>=500);
   coin.onclick=()=>{if(!atRegister(camera)||paused||!isRegisterOpen())return;selected.push(value);refresh()};coins.append(coin);
  }
  const summary=make('div','counter-change-summary'),selectedValue=make('output'),remaining=make('span');selectedValue.dataset.directSelected=order.id;summary.append(selectedValue,remaining);
  const controls=make('div','counter-change-actions'),undo=button('Retirer la dernière pièce'),reset=button('Recommencer'),confirm=button('Préparer la monnaie','primary');
  undo.dataset.directUndo=order.id;reset.dataset.directReset=order.id;confirm.dataset.directConfirm=order.id;
  undo.onclick=()=>{selected.pop();refresh()};reset.onclick=()=>{selected.length=0;refresh()};
  confirm.onclick=()=>transact(()=>game.prepareChange(order.id,selected.reduce((a,b)=>a+b,0)/100,camera));
  controls.append(undo,reset,confirm);node.append(title,details,due,coins,summary,controls);cashList.append(node);
  const result={node,title,details,due,coins,selected,selectedValue,remaining,undo,reset,confirm};cashCards.set(order.id,result);return result;
 }
 function openRegister(){
  if(paused||GameMenu.getMode()!=='play'||$('settingsModal').open||$('modal').open&&!isRegisterOpen())return false;
  if(!atRegister(camera)){toast('Rejoignez la caisse derrière le bar pour utiliser le tiroir.');return false;}
  if(isRegisterOpen()){refresh();return true;}
  modal('Caisse · Le Petit Comptoir','');
  registerRoot=make('section','counter-register');cashCards.clear();
  const top=make('div','counter-pos-top'),brand=make('div');brand.append(make('strong',null,'COMPTOIR / ENCAISSEMENT'),make('span',null,'Poste 01 · Service en cours'));
  const queue=make('span','counter-pos-queue');queue.id='directCheckoutQueue';top.append(brand,queue);registerRoot.append(top);
  const layout=make('div','counter-pos-layout'),main=make('div','counter-pos-main'),side=make('aside','counter-pos-side');layout.append(main,side);registerRoot.append(layout);
  const slip=make('article','counter-ticket');slip.id='directCheckoutTicket';
  ticket={};for(const [key,tag,cls]of [['number','span','counter-ticket-number'],['customer','h3',''],['origin','p','counter-ticket-origin'],['status','p','counter-ticket-status']]){ticket[key]=make(tag,cls);slip.append(ticket[key]);}
  const row=make('div','counter-ticket-line');ticket.item=make('span');ticket.price=make('strong');row.append(ticket.item,ticket.price);slip.append(row);
  const tip=make('div','counter-ticket-tip');ticket.tipLabel=make('span',null,'Pourboire');ticket.tip=make('span');tip.append(ticket.tipLabel,ticket.tip);slip.append(tip);ticket.tipRow=tip;
  const total=make('div','counter-ticket-total');ticket.total=make('strong');total.append(make('span',null,'TOTAL À RÉGLER'),ticket.total);slip.append(total);
  ticket.method=make('p','counter-ticket-method');slip.append(ticket.method);main.append(slip);
  const actions=make('div','counter-pos-actions');ticket.collect=button('Prendre les espèces','primary');ticket.collect.id='directCollectCash';ticket.card=button('Présenter le terminal','primary');ticket.card.id='directPayCard';ticket.complete=button('Remettre la monnaie et le ticket','primary');ticket.complete.id='directCompleteCash';actions.append(ticket.collect,ticket.card,ticket.complete);main.append(actions);
  const actOnCurrent=action=>{const order=game.checkoutCustomer();if(order&&registerRoot.dataset.orderId===String(order.id))transact(()=>action(order));else refresh();};
  ticket.collect.onclick=()=>actOnCurrent(order=>game.collectCash(order.id,camera));ticket.card.onclick=()=>actOnCurrent(order=>game.payCard(order.id,camera));ticket.complete.onclick=()=>actOnCurrent(order=>game.completeCash(order.id,camera));
  cashEmpty=make('p','counter-empty');cashList=make('div','counter-cash-list');main.append(cashEmpty,cashList);
  const finance=make('div','counter-finance');registerAmounts={};
  for(const [key,label]of [['till','Dans le tiroir'],['bank','Trésorerie disponible']]){const row=make('div');registerAmounts[key]=make('strong');row.append(make('span',null,label),registerAmounts[key]);finance.append(row);}
  side.append(make('h3',null,'Tiroir-caisse'),finance);
  const funding=make('div','counter-funding'),fundLabel=make('label',null,'Ajouter au fond de caisse');fundInput=make('input');fundInput.type='number';fundInput.min='.01';fundInput.step='.01';fundInput.value='20';fundInput.id='directFundAmount';fundLabel.htmlFor=fundInput.id;
  fundButton=button('Alimenter le tiroir');fundButton.dataset.directFund='';fundButton.onclick=()=>transact(()=>game.fundTill(Number(fundInput.value),camera));fundInput.oninput=refresh;funding.append(fundLabel,fundInput,fundButton);side.append(funding);
  ticket.terminal=button('Prendre le terminal');ticket.terminal.id='directTerminal';ticket.terminal.onclick=()=>transact(()=>game.s.payments.terminalCarried?game.returnTerminal(camera):game.pickupTerminal(camera));
  ticket.terminalStatus=make('p','counter-terminal-note');side.append(make('h3','counter-terminal-heading','Terminal sans fil'),ticket.terminalStatus,ticket.terminal,make('p','counter-terminal-note','Le terminal reste partagé avec le serveur. Reposez-le après le règlement.'));
  registerFeedback=make('p','counter-register-feedback');registerFeedback.setAttribute('role','status');registerRoot.append(registerFeedback);
  $('modalContent').append(registerRoot);$('modal').classList.add('physical-register');refresh();return true;
 }
 function refresh(){
  if(!isRegisterOpen())return;
  const s=game.s,near=atRegister(camera)&&!paused,bank=game.availableBank();
  registerAmounts.till.textContent=money(s.payments.till);registerAmounts.bank.textContent=money(bank);
  const current=game.checkoutCustomer(),phase=current&&game.orderPhase(current),handled=current&&game.paymentHandledByWaiter?.(current.id),queue=s.orders.filter(order=>game.checkoutInfo(order));
  registerRoot.dataset.orderId=current?String(current.id):'';
  $('directCheckoutQueue').textContent=queue.length?`${queue.length} règlement${queue.length>1?'s':''} en attente`:'Caisse disponible';
  ticket.number.textContent=current?`TICKET ${String(current.id).padStart(4,'0')}`:'EN ATTENTE DU CLIENT';
  ticket.customer.textContent=current?.name||'Bienvenue au comptoir';ticket.origin.textContent=current?place(current):'Les clients rejoignent la caisse après leur dégustation.';
  ticket.status.textContent=current?(handled?waiterPaymentMessage(game.waiterPaymentStatus(current.id)):{payment:'Client présent · prêt à régler','cash-collected':`Reçu : ${money(current.tender)}`,'change-ready':'Monnaie préparée · remettre le ticket','card-processing':`Autorisation bancaire · ${Math.ceil(current.cardRemaining||0)} s`}[phase]):queue.some(order=>game.checkoutInfo(order).moving)?'Le prochain client rejoint le guichet.':'Aucun client au guichet.';
  ticket.item.textContent=current?'1 × '+recipes[current.recipe].name:'—';ticket.price.textContent=current?money(recipes[current.recipe].price):'—';ticket.tipRow.hidden=!current?.tip;ticket.tip.textContent=money(current?.tip||0);ticket.total.textContent=money(current?.due||0);ticket.method.textContent=current?(current.paymentMethod==='cash'?'ESPÈCES':'CARTE BANCAIRE'):'Les paiements sont traités un par un.';
  ticket.collect.hidden=phase!=='payment'||current?.paymentMethod!=='cash';ticket.card.hidden=phase!=='payment'||current?.paymentMethod!=='card';ticket.complete.hidden=phase!=='change-ready';
  for(const item of [ticket.collect,ticket.card,ticket.complete])item.disabled=!near||!current||handled||s.gameOver;
  ticket.collect.textContent=current?`Prendre ${money(current.tender)} en espèces`:'Prendre les espèces';ticket.complete.textContent=(current?.change||0)>0?'Remettre la monnaie et le ticket':'Remettre le ticket';ticket.card.disabled=ticket.card.disabled||!s.payments.terminalCarried;
  const terminalBusy=s.payments.terminalWithWaiter||s.staff.waiter?.task==='pickup-terminal'||s.payments.terminalOrderId!==null;
  ticket.terminal.textContent=s.payments.terminalCarried?'Reposer le terminal':'Prendre le terminal';ticket.terminal.disabled=!near||s.gameOver||terminalBusy;
  ticket.terminalStatus.textContent=s.payments.terminalWithWaiter?'Avec le serveur':s.payments.terminalOrderId!==null?'Autorisation en cours':s.payments.terminalCarried?'En main · prêt à présenter':'Sur son socle à droite de la caisse';
  const pending=current&&phase==='cash-collected'?[current]:[],ids=new Set(pending.map(order=>order.id));
  for(const [id,entry]of cashCards)if(!ids.has(id)){entry.node.remove();cashCards.delete(id);}
  cashEmpty.hidden=pending.length>0||!!current;cashEmpty.textContent=queue.length?'La file avance automatiquement. Les autres clients attendent leur tour.':'Les clients à table ou au comptoir viennent ici pour payer.';
  for(const order of pending){
   const entry=cashCards.get(order.id)||cashCard(order),expected=cents(order.tender)-cents(order.due),selected=entry.selected.reduce((a,b)=>a+b,0),left=expected-selected,handled=game.paymentHandledByWaiter?.(order.id);
   entry.title.textContent=`${place(order)} · ${order.name||'Client'}`;entry.details.textContent=`Addition : ${money(order.due)} · Reçu : ${money(order.tender)}`;entry.due.textContent=`À rendre : ${money(expected/100)}`;
   entry.selectedValue.textContent=`Sélection : ${money(selected/100)}`;
   entry.remaining.textContent=!near?'Rejoignez la caisse.':expected>cents(s.payments.till)?'Ajoutez des espèces au tiroir pour rendre la monnaie.':left>0?`Il reste ${money(left/100)} à sélectionner.`:left<0?`Retirez ${money(-left/100)}.`:'Le montant est exact.';
   entry.remaining.dataset.exact=String(left===0);
   if(handled)entry.remaining.textContent=waiterPaymentMessage(game.waiterPaymentStatus(order.id));
   for(const coin of entry.coins.children)coin.disabled=!near||s.gameOver||handled;
   entry.undo.disabled=entry.reset.disabled=!near||handled||!entry.selected.length;entry.confirm.disabled=!near||handled||s.gameOver||selected!==expected||expected>cents(s.payments.till);
   entry.confirm.textContent=expected===0?'Préparer le ticket':'Préparer la monnaie';
  }
  const funding=Number(fundInput.value);fundInput.disabled=!near||s.gameOver;fundButton.disabled=!near||s.gameOver||!Number.isFinite(funding)||funding<=0||Math.abs(cents(funding)-funding*100)>1e-7||funding>bank;
 }
 $('modal').addEventListener('close',()=>{$('modal').classList.remove('physical-register');registerRoot=null;ticket=null;cashCards.clear()});
 return {target,use,openRegister,isRegisterOpen,refresh};
})();
