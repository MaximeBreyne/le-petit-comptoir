'use strict';
window.BarPreparation=(()=>{
 const layout=BarEngine.preparationLayout;
 const safe=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 let pickerRoot=null,pickerFeedback=null;const pickerCards=new Map();
 const isChoosingVessel=()=>!!pickerRoot&&$('modal').open&&pickerRoot.isConnected;
 const preparations=()=>game.preparations();
 const heldPreparation=()=>preparations().find(p=>p.held);
 function closePhysicalDialog(){
  $('modal').close();
  if(GameMenu.getMode()==='play'&&!paused)BarInput.enterLook();
 }
 function aim(point,position,radius=.19){
  const dx=point.x-position.x,dy=point.y-position.y,dz=point.z-position.z,cp=Math.cos(position.pitch||0);
  const distance=Math.hypot(dx,dy,dz),projection=dx*Math.sin(position.a)*cp+dy*Math.sin(position.pitch||0)+dz*Math.cos(position.a)*cp;
  const transverse=Math.sqrt(Math.max(0,distance*distance-projection*projection));
  return projection>.1&&distance<2.1&&transverse<radius?{aimScore:transverse/radius,distance}:null;
 }
 function target(position){
  if(!game.canWork(position))return null;
  const p=game.s.prep,status=game.preparationStatus(position),held=heldPreparation(),candidates=[];
  function add(point,radius,details){const hit=aim(point,position,radius);if(hit)candidates.push({action:'preparation',...details,...hit});}
  if(!held&&game.nearPreparationSource('vessels',position)){
   add({...layout.vessels,y:layout.vessels.y+.12},.36,p&&status.stage==='vessel'?{kind:'vessel',prepId:p.id,label:'Prendre : '+recipes[p.recipe].glass}:{kind:'choose',label:'Prendre un verre et choisir la boisson'});
  }
  if(p){
   if(status.stage==='ingredient')for(const key of status.remaining){
    const point=layout.ingredients[key];if(point&&!point.fixed&&game.nearPreparationSource(key,position))add({...point,y:point.y+.13},.18,{kind:'ingredient',prepId:p.id,key,label:'Prendre : '+ingredients[key].name});
   }
   if(status.nearStation){
    const messages={
     'place-vessel':'Poser le récipient · '+recipes[p.recipe].name,
     'place-ingredient':p.held?.key?'Utiliser : '+ingredients[p.held.key].name:'Poser l’ingrédient',
     pour:p.amount>0?'Valider le dosage · '+recipes[p.recipe].name:'Maintenir '+controlName('pour')+' pour '+(p.recipe==='coffee'?'extraire':'verser'),
     mix:'Mélanger et terminer · '+recipes[p.recipe].name,ready:'Prendre sur le plateau · '+recipes[p.recipe].name,
    };
    if(messages[status.stage])add({...status.station,y:status.station.y+.18},.17,{kind:status.stage,prepId:p.id,label:messages[status.stage]});
    else if(p.vesselPlaced&&!held)add({...status.station,y:status.station.y+.18},.17,{kind:'manage',prepId:p.id,label:'Voir la préparation · '+recipes[p.recipe].name});
   }
  }
  if(!held)for(const other of preparations()){
   if(other===p||!other.vesselPlaced)continue;
   const info=game.preparationStatus(position,other.id);
   if(info?.nearStation)add({...info.station,y:info.station.y+.18},.17,{kind:'select',prepId:other.id,label:'Reprendre · '+recipes[other.recipe].name});
  }
  game.s.tray.forEach((drink,index)=>{
   const point=BarScene.trayPosition(index);
   if(Math.hypot(position.x-point.x,position.z-point.z)<=layout.stationReach)add({...point,y:point.y+.14},.12,{kind:'tray',trayIndex:index,drink,label:'Voir sur le plateau · '+recipes[drink.recipe].name});
  });
  return candidates.sort((a,b)=>a.aimScore-b.aimScore||a.distance-b.distance)[0]||null;
 }
 function use(item){
  if(paused||menusOpen()||BarTablet.isOpen())return false;
  const current=target(camera);if(!current||current.kind!==item.kind||current.key!==item.key||current.prepId!==item.prepId||current.trayIndex!==item.trayIndex||current.drink!==item.drink)return false;
  if(current.kind==='choose')return openVessels();
  if(current.kind==='manage')return openPreparation(current.prepId);
  if(current.kind==='tray')return openTray(current.trayIndex);
  act(()=>{
   switch(current.kind){
    case'select':return game.selectPreparation(current.prepId,camera);
    case'vessel':return game.takeVessel(camera);
    case'ingredient':return game.takeIngredient(current.key,camera);
    case'place-vessel':case'place-ingredient':return game.placeHeld(camera);
    case'pour':if(game.s.prep.amount<=0)return 'Maintenez '+controlName('pour')+' pour doser la boisson.';return game.finishPour(camera);
    case'mix':return game.finishMix(camera);
    case'ready':return game.plate(camera);
   }
  });return true;
 }
 const vesselShapes={
  pint:'<path d="M15 8h34l-5 43H20Z"/><path class="vessel-liquid" d="m19 22 3 26h20l3-26Z"/>',
  highball:'<path d="M20 7h24l-2 45H22Z"/><path class="vessel-liquid" d="m23 23 1 26h16l1-26Z"/>',
  rocks:'<path d="M13 24h38l-4 28H17Z"/><path class="vessel-liquid" d="m17 34 2 15h26l2-15Z"/>',
  wine:'<path d="M20 7h24l3 17c1 9-7 14-15 14s-16-5-15-14Z"/><path class="vessel-liquid" d="M20 21c-2 9 2 14 12 14s14-5 12-14Z"/><path d="M32 38v16m-12 0h24"/>',
  coupe:'<path d="M10 17h44c0 13-10 19-22 19S10 30 10 17Z"/><path class="vessel-liquid" d="M14 23h36c-3 7-9 10-18 10S17 30 14 23Z"/><path d="M32 36v18m-12 0h24"/>',
  cup:'<path d="M13 18h31v22c0 8-31 8-31 0Zm31 4h5c10 0 10 14-5 14M8 52h45"/><path class="vessel-liquid" d="M17 22h23v6H17Z"/>',
 };
 function vesselIcon(recipe){return '<svg viewBox="0 0 64 64" aria-hidden="true" style="--vessel-fill:'+safe(recipe.color)+'">'+(vesselShapes[recipe.vessel]||vesselShapes.highball)+'</svg>';}
 function openVessels(){
  if(paused||GameMenu.getMode()!=='play'||$('modal').open||BarTablet.isOpen())return false;
  if(!game.nearPreparationSource('vessels',camera)){toast('Approchez-vous du rangement des verres derrière le bar.');return false;}
  if(heldPreparation()){toast('Posez d’abord ce que vous tenez à son poste.');return false;}
  modal('Choisir un verre et sa boisson','');$('modal').classList.add('vessel-picker');
  pickerRoot=document.createElement('section');pickerRoot.className='vessel-picker-content';pickerRoot.id='vesselPicker';
  const intro=document.createElement('p');intro.className='vessel-picker-intro';intro.textContent='Prenez le récipient adapté, puis apportez-le au poste indiqué. Les autres préparations restent sur le comptoir.';pickerRoot.append(intro);
  const grid=document.createElement('div');grid.className='vessel-grid';pickerRoot.append(grid);pickerCards.clear();
  for(const [id,recipe]of Object.entries(recipes)){
   const card=document.createElement('button');card.type='button';card.className='vessel-card';card.dataset.vesselRecipe=id;
   card.innerHTML=vesselIcon(recipe)+'<span class="vessel-card-copy"><span class="vessel-type">'+safe(recipe.glass)+'</span><strong>'+safe(recipe.name)+'</strong><span class="vessel-station">'+safe(recipe.station)+'</span><span class="vessel-pending"></span><span class="vessel-availability"></span></span>';
   card.onclick=()=>{
    if(!isChoosingVessel()||card.disabled||paused||GameMenu.getMode()!=='play')return;
    const previous=new Set(preparations().map(p=>p.id));let message;
    act(()=>{message=game.beginAtVessels(id,camera);return message});
    const p=game.s.prep;
    if(p?.recipe===id&&p.held?.kind==='vessel'&&!previous.has(p.id))closePhysicalDialog();
    else if(pickerFeedback)pickerFeedback.textContent=message||'Cette préparation ne peut pas être commencée.';
   };
   grid.append(card);pickerCards.set(id,{card,pending:card.querySelector('.vessel-pending'),availability:card.querySelector('.vessel-availability')});
  }
  pickerFeedback=document.createElement('p');pickerFeedback.className='vessel-feedback';pickerFeedback.setAttribute('role','status');pickerRoot.append(pickerFeedback);
  $('modalContent').append(pickerRoot);refreshPicker();grid.querySelector('button:not(:disabled)')?.focus();return true;
 }
 function refreshPicker(){
  if(!isChoosingVessel())return;
  const queue=game.preparationQueue();
  for(const [id,entry]of pickerCards){
   const message=game.preparationAvailability(id,camera),count=queue.filter(order=>order.recipe===id&&order.status==='todo').length;
   entry.card.disabled=!!message;entry.card.dataset.available=String(!message);entry.card.dataset.requested=String(count>0);
   entry.pending.textContent=count?count+' commande'+(count>1?'s':'')+' à préparer':'Aucune commande en attente';
   entry.availability.textContent=message||'Prendre ce verre';
  }
 }
 function openPreparation(id){
  if(paused||GameMenu.getMode()!=='play'||$('modal').open||BarTablet.isOpen())return false;
  const p=preparations().find(p=>p.id===id),status=p&&game.preparationStatus(camera,id);
  if(!p||!status?.nearStation)return false;
  if(heldPreparation()&&heldPreparation()!==p)return false;
  modal('Préparation · '+recipes[p.recipe].name,'');$('modal').classList.add('preparation-options');
  const copy=document.createElement('p');copy.textContent='Cette boisson reste à son poste pendant que vous vous occupez des autres commandes.';
  const actions=document.createElement('div');actions.className='preparation-options-actions';
  const resume=document.createElement('button');resume.type='button';resume.className='primary';resume.textContent='Continuer la préparation';resume.onclick=()=>{if(game.s.prep?.id!==id)act(()=>game.selectPreparation(id,camera));closePhysicalDialog()};
  const discard=document.createElement('button');discard.type='button';discard.dataset.discardPreparation=String(id);discard.textContent='Jeter cette préparation';
  discard.onclick=()=>{
   if(!$('modal').open||!discard.isConnected||paused||!game.preparationStatus(camera,id)?.nearStation)return;
   if(game.s.prep?.id!==id){game.selectPreparation(id,camera);if(game.s.prep?.id!==id)return;}
   act(()=>game.discard());closePhysicalDialog();
  };
  actions.append(resume,discard);$('modalContent').append(copy,actions);return true;
 }
 function openTray(index){
  if(paused||GameMenu.getMode()!=='play'||$('modal').open||BarTablet.isOpen())return false;
  const drink=game.s.tray[index],point=BarScene.trayPosition(index);
  const near=()=>game.canWork(camera)&&Math.hypot(camera.x-point.x,camera.z-point.z)<=layout.stationReach;
  if(!drink||!near())return false;
  modal('Sur le plateau · '+recipes[drink.recipe].name,'');$('modal').classList.add('preparation-options');
  const copy=document.createElement('p');copy.textContent='Dosage : '+drink.quality+' %. Gardez cette boisson pour la servir ou jetez-la. Les ingrédients jetés sont perdus.';
  const actions=document.createElement('div');actions.className='preparation-options-actions';
  const keep=document.createElement('button');keep.type='button';keep.className='primary';keep.textContent='Garder pour le service';keep.onclick=closePhysicalDialog;
  const discard=document.createElement('button');discard.type='button';discard.dataset.discardTray=String(index);discard.textContent='Jeter cette boisson';
  discard.onclick=()=>{
   if(!$('modal').open||!discard.isConnected||paused||!near()||game.s.tray[index]!==drink)return;
   act(()=>game.discard(index));closePhysicalDialog();
  };
  actions.append(keep,discard);$('modalContent').append(copy,actions);return true;
 }
 function handleEscape(){
  if(!$('modal').open||!$('modal').classList.contains('vessel-picker')&&!$('modal').classList.contains('preparation-options'))return false;
  closePhysicalDialog();return true;
 }
 $('modal').addEventListener('cancel',event=>{if(handleEscape())event.preventDefault()});
 $('modal').addEventListener('close',()=>{if($('modal').open&&(pickerRoot?.isConnected||$('modalContent').querySelector('.preparation-options-actions')))return;$('modal').classList.remove('vessel-picker','preparation-options');pickerRoot=null;pickerFeedback=null;pickerCards.clear()});
 $('prep').addEventListener('click',event=>{const button=event.target.closest('[data-open-preparation]');if(button&&!button.disabled)openPreparation(Number(button.dataset.openPreparation));});
 const managesVessel=item=>item?.action==='preparation'&&['select','manage','place-ingredient','pour','mix','ready'].includes(item.kind);
 canvas.addEventListener('contextmenu',event=>{
  if(paused||menusOpen()||BarTablet.isOpen()||GameMenu.getMode()!=='play')return;
  event.preventDefault();const item=interactionTarget();
  if(managesVessel(item))openPreparation(item.prepId);
  else if(item?.action==='preparation'&&item.kind==='tray')openTray(item.trayIndex);
 });
 function refresh(){
  refreshPicker();
  const p=game.s.prep,status=game.preparationStatus(camera),inBar=game.canWork(camera),count=preparations().length;
  $('workbench').hidden=!inBar||!count&&!game.s.tray.length;
  if(!p){updateHTML($('prep'),'<p class="empty">'+(count?count+' préparation'+(count>1?'s':'')+' sur le comptoir. Regardez un verre et appuyez sur '+safe(controlName('interact'))+' pour le reprendre.':'Regardez les verres derrière vous et appuyez sur '+safe(controlName('interact'))+' pour choisir une boisson.')+'</p>');return;}
  const r=recipes[p.recipe],held=p.held,ingredientNames=status.remaining.filter(key=>!layout.ingredients[key]?.fixed).map(key=>ingredients[key].name);
  let instruction={vessel:'Prenez un récipient au rangement derrière le bar.','place-vessel':'Apportez le récipient au poste indiqué.',ingredient:ingredientNames.length?'À prendre : '+ingredientNames.join(', '):'Rejoignez le poste de préparation.','place-ingredient':'Apportez '+(held?.key?ingredients[held.key].name.toLocaleLowerCase('fr-BE'):'l’ingrédient')+' à ce verre.',pour:'Au poste : maintenez '+controlName('pour')+' pour doser, puis '+controlName('interact')+' pour valider.',mix:'Regardez ce verre et appuyez sur '+controlName('interact')+' pour terminer.',ready:'Regardez la boisson et appuyez sur '+controlName('interact')+' pour la prendre sur le plateau.'}[status.stage]||'';
  if(!status.nearStation&&['pour','mix','ready'].includes(status.stage))instruction='Rejoignez '+(status.station.label||r.station).toLocaleLowerCase('fr-BE')+' derrière le comptoir.';
  let html='<div class="sectionTitle"><strong>'+safe(r.name)+'</strong><span>'+count+' préparation'+(count>1?'s':'')+' en cours</span></div><p class="prep-station">'+safe(status.station.label||r.station)+' · '+safe(r.glass)+'</p><p class="prep-instruction">'+safe(instruction)+'</p>';
  if(held)html+='<p class="prep-held">En main : <strong>'+safe(held.kind==='vessel'?r.glass:ingredients[held.key].name)+'</strong></p>';
  if(status.stage==='pour')html+='<p>Objectif : '+r.target+' '+safe(r.unit)+' · <strong>'+p.amount.toFixed(1)+'</strong></p><div class="pourbar"><em></em><i style="width:'+Math.min(100,p.amount/(r.target*1.5)*100)+'%"></i></div>';
  if(p.ready)html+='<p>Dosage : <strong>'+p.quality+' %</strong></p>';
  if(!held)html+='<p class="prep-parallel-hint">'+safe(controlName('interact'))+' sur un autre verre pour le reprendre · '+safe(controlName('interact'))+' au rangement pour une autre boisson.</p>';
  html+='<button class="prep-manage" data-open-preparation="'+p.id+'"'+(!status.nearStation?' disabled':'')+'>Gérer cette préparation</button>';
  updateHTML($('prep'),html);
 }
 function refreshPrompt(){
  const active=GameMenu.getMode()==='play'&&!paused&&!menusOpen()&&!BarTablet.isOpen();
  const item=active?interactionTarget():null,node=$('interactionPrompt');
  node.hidden=!item;if(item){const text=controlName('interact')+' · '+item.label.replace(/^E\s*:\s*/,'')+(managesVessel(item)?' · '+controlName('manage')+' : gérer':'');if(node.textContent!==text)node.textContent=text;}
  $('aimDot').hidden=!active||!BarInput.isLooking()&&!window.BarGamepad?.isActive();
 }
 refresh();return {target,use,refresh,refreshPrompt,openVessels,isChoosingVessel,handleEscape,openPreparation,openTray};
})();
