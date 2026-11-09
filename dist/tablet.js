'use strict';
// A single catalogue and management screen; adding recipes never needs a new key.
window.BarTablet=(()=>{
 const sections={drinks:['Boissons','La carte du comptoir'],reserve:['Réserve','Stocks & fournisseur'],building:['Bâtiment','Votre établissement'],licenses:['Licences','Développer la carte'],team:['Équipe','Les personnes derrière le bar']};
 let current='drinks',catalogueSignature='',upgradesSignature='',lastRefresh=0;
 const recipeCards=new Map(),stockRows=new Map(),upgradeCards=new Map();
 const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node};
 const number=value=>Number(value||0).toLocaleString('fr-BE',{maximumFractionDigits:1});
 const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const iconPaths={drinks:'M6 2h12l-1 10a5 5 0 0 1-10 0L6 2zm6 15v5m-4 0h8',reserve:'M3 7l9-5 9 5v12l-9 4-9-4V7zm0 0 9 5 9-5m-9 5v11',building:'M3 22V7l9-5 9 5v15M8 22v-7h8v7M7 8h2m6 0h2M7 11h2m6 0h2',licenses:'M6 2h12v15l-6-3-6 3V2zm3 5h6M9 10h6M7 17v5l5-3 5 3v-5',team:'M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8-7a3 3 0 0 1 0 6M1 22v-3a6 6 0 0 1 12 0v3m3-7a5 5 0 0 1 6 5v2'};
 function icon(name){const node=document.createElementNS('http://www.w3.org/2000/svg','svg');node.setAttribute('viewBox','0 0 24 24');node.setAttribute('aria-hidden','true');node.innerHTML=`<path d="${iconPaths[name]||iconPaths.drinks}"/>`;return node}
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

 // Drinks: keep controls and cards mounted so typing, focus and scrolling survive ticks.
 const drinks=pages.get('drinks'),notice=make('div','tablet-service-notice'),noticeText=make('p'),serviceAction=button('Ouvrir le bar','service','tablet-button');
 const returnPrep=button('Revenir à la préparation','prep','tablet-button tablet-button-subtle');notice.append(noticeText,serviceAction,returnPrep);drinks.append(notice);
 const filters=make('div','tablet-filters'),searchLabel=make('label','tablet-search-label');searchLabel.append(make('span',null,'Rechercher une boisson'));
 const search=make('input');search.id='tabletSearch';search.type='search';search.placeholder='Nom, ingrédient…';search.autocomplete='off';searchLabel.append(search);
 const stationLabel=make('label','tablet-station-label');stationLabel.append(make('span',null,'Poste de préparation'));
 const station=make('select');station.id='tabletStation';stationLabel.append(station);filters.append(searchLabel,stationLabel);drinks.append(filters);
 const catalogue=make('div','tablet-catalogue');catalogue.id='tabletCatalogue';const noResults=make('p','tablet-empty','Aucune boisson ne correspond à cette recherche.');noResults.hidden=true;drinks.append(catalogue,noResults);
 function syncCatalogue(){
  const signature=JSON.stringify(Object.entries(recipes));if(signature===catalogueSignature)return;catalogueSignature=signature;
  const selected=station.value;station.replaceChildren();const all=make('option',null,'Tous les postes');all.value='';station.append(all);
  for(const name of new Set(Object.values(recipes).map(recipe=>recipe.station))){const option=make('option',null,name);option.value=name;station.append(option)}station.value=[...station.options].some(option=>option.value===selected)?selected:'';
  catalogue.replaceChildren();recipeCards.clear();
  for(const [id,recipe]of Object.entries(recipes)){
   const card=make('article','tablet-recipe-card');card.dataset.catalogueRecipe=id;
   const head=make('div','tablet-recipe-head'),symbol=make('div','tablet-drink-symbol');symbol.dataset.drink=id;symbol.style.setProperty('--drink-color',recipe.color||'#b29a60');symbol.append(icon('drinks'));
   const description=make('div');description.append(make('span','tablet-recipe-station',recipe.station),make('h3',null,recipe.name));head.append(symbol,description,make('strong','tablet-recipe-price',money(recipe.price)));card.append(head);
   const list=make('ul','tablet-ingredients'),ingredientNodes=new Map();
   for(const [key,amount]of Object.entries(recipe.ingredients)){const row=make('li');row.append(make('span',null,ingredients[key]?.name||key),make('b',null,`${number(amount)} ${ingredients[key]?.unit||''}`));list.append(row);ingredientNodes.set(key,row)}card.append(list);
   const foot=make('div','tablet-recipe-foot'),availability=make('span','tablet-availability'),prepare=button('Préparer',null,'tablet-button');prepare.dataset.tabletRecipe=id;prepare.setAttribute('aria-label',`Préparer ${recipe.name}`);foot.append(availability,prepare);card.append(foot);catalogue.append(card);
   recipeCards.set(id,{card,availability,prepare,ingredientNodes,search:normalize(recipe.name+' '+recipe.station+' '+Object.keys(recipe.ingredients).map(key=>ingredients[key]?.name||key).join(' '))});
  }
  filterCatalogue();
 }
 function filterCatalogue(){const query=normalize(search.value.trim());let visible=0;for(const [id,entry]of recipeCards){entry.card.hidden=!!((query&&!entry.search.includes(query))||(station.value&&recipes[id].station!==station.value));if(!entry.card.hidden)visible++}noResults.hidden=visible!==0}
 search.addEventListener('input',filterCatalogue);station.addEventListener('change',filterCatalogue);

 // Deliveries go to the physical storeroom. Only a player in that room can refill the bar.
 const reserve=pages.get('reserve'),reserveNote=make('div','tablet-reserve-note');reserve.append(reserveNote);
 const stockTable=make('div','tablet-stock-table');stockTable.setAttribute('role','table');stockTable.setAttribute('aria-label','Inventaire et réapprovisionnement');
 const stockHeading=make('div','tablet-stock-heading');stockHeading.setAttribute('role','row');for(const label of ['Ingrédient','Au comptoir','En réserve','Approvisionnement']){const cell=make('span',null,label);cell.setAttribute('role','columnheader');stockHeading.append(cell)}stockTable.append(stockHeading);
 for(const [key,ingredient]of Object.entries(ingredients)){
  const row=make('div','tablet-stock-row');row.setAttribute('role','row');row.dataset.stockKey=key;
  const name=make('div','tablet-stock-name');name.append(make('strong',null,ingredient.name),make('small',null,`Lot de ${number(ingredient.pack)} ${ingredient.unit}`));
  const service=make('div','tablet-stock-value'),serviceAmount=make('strong'),capacity=make('small');service.append(serviceAmount,capacity);
  const stored=make('div','tablet-stock-value'),reserveAmount=make('strong'),delivery=make('small');stored.append(reserveAmount,delivery);
  const actions=make('div','tablet-stock-actions'),refill=button('Réapprovisionner',null,'tablet-button tablet-button-subtle'),buy=button(`Commander · ${money(ingredient.cost)}`,null,'tablet-button');refill.dataset.tabletRestock=key;buy.dataset.tabletBuy=key;actions.append(refill,buy);
  for(const cell of [name,service,stored,actions]){cell.setAttribute('role','cell');row.append(cell)}stockTable.append(row);stockRows.set(key,{serviceAmount,capacity,reserveAmount,delivery,refill,buy});
 }
 reserve.append(stockTable,make('p','tablet-section-note','Les commandes arrivent dans la réserve après 10 secondes de jeu. Rejoignez la pièce derrière le bar pour apporter les ingrédients au comptoir.'));

 const building=pages.get('building');
 const summary=make('div','tablet-building-summary');summary.append(make('span','tablet-eyebrow','VOTRE ADRESSE'),make('h3',null,'Un bar de quartier à faire grandir.'),make('p',null,'Une salle ouverte aux clients, un comptoir équipé et une réserve séparée pour organiser le service.'));building.append(summary);
 const licenses=pages.get('licenses'),team=pages.get('team');
 const licenseIntro=make('div','tablet-management-intro');licenseIntro.append(icon('licenses'),make('div',null));licenseIntro.lastChild.append(make('h3',null,'Une carte qui grandit avec votre réputation.'),make('p',null,'La carte de base est incluse. Servez des clients pour débloquer les licences suivantes, puis achetez-les ici.'));licenses.append(licenseIntro);
 const teamIntro=make('div','tablet-management-intro');teamIntro.append(icon('team'),make('div',null));teamIntro.lastChild.append(make('h3',null,'Un coup de main pendant le service.'),make('p',null,'Vous restez derrière le comptoir. Les employés recrutés vous accompagnent dans la gestion quotidienne du bar.'));team.append(teamIntro);
 const upgradeLists=new Map();for(const key of ['building','licenses','team']){const list=make('div','tablet-upgrade-list');pages.get(key).append(list);upgradeLists.set(key,list)}
 for(const key of ['building','licenses','team'])pages.get(key).append(make('p','tablet-section-note','Les déblocages dépendent du nombre total de clients servis. Les achats et recrutements sont conservés dans votre sauvegarde.'));
 function syncUpgrades(){
  const catalog=BarEngine.managementUpgrades||{},signature=JSON.stringify(catalog);if(signature===upgradesSignature)return;upgradesSignature=signature;
  for(const list of upgradeLists.values())list.replaceChildren();upgradeCards.clear();
  for(const [id,offer]of Object.entries(catalog)){
   const list=upgradeLists.get(offer.category);if(!list)continue;
   const card=make('article','tablet-upgrade-card');card.dataset.upgrade=id;
   const copy=make('div','tablet-upgrade-copy'),topLine=make('div','tablet-upgrade-top'),name=make('h3'),owned=make('span','tablet-owned');topLine.append(name,owned);copy.append(topLine);
   const description=make('p'),statusText=make('p','tablet-upgrade-status');const progress=make('progress','tablet-unlock-progress');progress.setAttribute('aria-label','Clients servis pour débloquer cette amélioration');copy.append(description,statusText,progress);
   const purchase=button('',null,'tablet-button');purchase.dataset.tabletUpgrade=id;card.append(copy,purchase);list.append(card);upgradeCards.set(id,{card,name,owned,description,statusText,progress,purchase});
  }
 }

 function setTab(key){current=Object.hasOwn(sections,key)?key:'drinks';for(const [id,page]of pages)page.hidden=id!==current;for(const [id,item]of navButtons){item.classList.toggle('active',id===current);if(id===current)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current')}eyebrow.textContent=sections[current][0];title.textContent=sections[current][1];feedback.textContent='';main.scrollTop=0;refresh(true)}
 function refresh(force=false){
  if(!dialog.open&&!force)return;const now=performance.now();if(!force&&now-lastRefresh<200)return;lastRefresh=now;
  const s=game.s,inReserve=!!BarScene.inStockroom?.(camera);syncCatalogue();syncUpgrades();cash.textContent=money(s.cash);serviceStatus.textContent=s.gameOver?'Partie terminée':s.closing?'Dernière tournée':s.open?'Service ouvert':'Service fermé';serviceStatus.dataset.open=String(s.open&&!s.closing);
  location.textContent=inReserve?'Dans la réserve':'Dans le bar';location.dataset.reserve=String(inReserve);
  noticeText.textContent=s.gameOver?'Votre trésorerie est épuisée. Retrouvez le menu pour commencer une nouvelle partie.':s.prep?`${recipes[s.prep.recipe].name} est en préparation. Terminez cette boisson au comptoir.`:!s.open?'Ouvrez le bar, puis choisissez une boisson à préparer.':s.closing?'Le bar termine son service. Préparez les dernières commandes.':'Choisissez une recette, puis préparez-la au comptoir.';
  serviceAction.hidden=!!s.prep||s.gameOver;serviceAction.disabled=s.closing;serviceAction.textContent=s.open?'Dernière tournée':'Ouvrir le bar';returnPrep.hidden=!s.prep;
  for(const [id,entry]of recipeCards){const recipe=recipes[id],licensed=game.canPrepare?game.canPrepare(id):true,available=game.canMake(id);entry.prepare.disabled=!s.open||s.gameOver||!!s.prep||!available||s.tray.length>=s.capacity;entry.availability.textContent=!licensed?'Licence requise · voir Licences':!available?'Stock au comptoir insuffisant':s.prep?.recipe===id?'En préparation':s.tray.length>=s.capacity?'Plateau plein':'Ingrédients disponibles';entry.availability.dataset.available=String(available);for(const [key,row]of entry.ingredientNodes)row.classList.toggle('missing',(s.stock[key]||0)<recipe.ingredients[key])}
  reserveNote.textContent=inReserve?'Vous êtes dans la réserve. Réapprovisionnez le comptoir avec les ingrédients disponibles.':'Pour réapprovisionner le comptoir, rejoignez la réserve derrière le bar puis appuyez sur E.';reserveNote.classList.toggle('tablet-reserve-present',inReserve);
  for(const [key,row]of stockRows){const ingredient=ingredients[key],stored=s.reserve?.[key]||0,limit=game.serviceCapacity?.(key)??BarEngine.serviceCapacities?.[key]??ingredient.pack*2;row.serviceAmount.textContent=`${number(s.stock[key])} ${ingredient.unit}`;row.capacity.textContent=`Capacité : ${number(limit)} ${ingredient.unit}`;row.reserveAmount.textContent=`${number(stored)} ${ingredient.unit}`;const deliveries=s.deliveries.filter(d=>d.key===key);row.delivery.textContent=deliveries.length?`${deliveries.length} lot${deliveries.length>1?'s':''} en route · ${Math.ceil(Math.min(...deliveries.map(d=>d.remaining)))} s`:'Aucune livraison en cours';row.refill.disabled=!inReserve||s.gameOver||stored<=0||s.stock[key]>=limit;row.refill.title=!inReserve?'Rejoignez la réserve pour transférer les ingrédients.':'';row.buy.disabled=s.gameOver||s.cash<ingredient.cost}
  for(const [id,entry]of upgradeCards){const offer=game.upgradeInfo(id);entry.name.textContent=offer.name;entry.description.textContent=offer.description;entry.owned.hidden=!offer.owned;entry.owned.textContent=offer.category==='team'?'Recruté':'Acquis';entry.card.classList.toggle('tablet-upgrade-owned',offer.owned);entry.progress.hidden=offer.owned||offer.unlocked;entry.progress.max=Math.max(1,offer.requiredSales);entry.progress.value=Math.min(offer.requiredSales,s.totalSold);entry.statusText.textContent=offer.owned?(offer.category==='team'?`${s.open?'En poste':'Prêt pour le prochain service'} · ${money(offer.salary||0)} de salaire par soir`:'Disponible pour tous les prochains services'):!offer.unlocked?`${s.totalSold} / ${offer.requiredSales} clients servis pour débloquer`:(s.cash<offer.cost?`Débloqué · Il manque ${money(offer.cost-s.cash)}`:'Débloqué · Achat disponible');entry.purchase.disabled=offer.owned||!offer.unlocked||s.cash<offer.cost||s.gameOver;entry.purchase.textContent=offer.owned?(offer.category==='team'?'Dans votre équipe':'Déjà acquis'):`${offer.category==='team'?'Recruter':'Acheter'} · ${money(offer.cost)}`}
 }
 function open(tab='drinks'){
  if(!window.GameMenu?.hasSession()||GameMenu.getMode()!=='play'||paused||$('modal').open||$('settingsModal').open)return false;
  keys={};game.setPour(false);window.BarInput?.suspend();setTab(tab);
  if(!dialog.open)dialog.showModal();document.body.dataset.tabletOpen='true';refresh(true);
  navButtons.get(current)?.focus({preventScroll:true});return true;
 }
 function close({resumeLook=true,suspend=false}={}){
  if(!dialog.open)return false;dialog.close();document.body.dataset.tabletOpen='false';keys={};game.setPour(false);
  if(suspend||paused||GameMenu.getMode()!=='play')window.BarInput?.suspend();else if(resumeLook)window.BarInput?.enterLook();else window.BarInput?.enterCursor();return true;
 }
 function toggle(){return dialog.open?close():open()}
 function handleEscape(){if(!dialog.open)return false;close();return true}
 function reset(){close({suspend:true});search.value='';station.value='';setTab('drinks')}
 dialog.addEventListener('cancel',event=>{event.preventDefault();handleEscape()});
 dialog.addEventListener('close',()=>{document.body.dataset.tabletOpen=String(dialog.open)});
 dialog.addEventListener('click',event=>{
  const target=event.target.closest('button');if(!target||target.disabled)return;
  if(target.dataset.tabletTab){setTab(target.dataset.tabletTab);return}
  if(target.dataset.tabletRecipe){const id=target.dataset.tabletRecipe;act(()=>game.start(id));if(game.s.prep?.recipe===id)close({resumeLook:false});else refresh(true);return}
  if(target.dataset.tabletBuy){let message;act(()=>{message=game.buy(target.dataset.tabletBuy);return message});feedback.textContent=message||'Commande enregistrée.';refresh(true);return}
  if(target.dataset.tabletRestock){if(!BarScene.inStockroom?.(camera)){feedback.textContent='Rejoignez la réserve pour réapprovisionner le comptoir.';refresh(true);return}const key=target.dataset.tabletRestock;let message;act(()=>{message=game.restock(key);return message});feedback.textContent=message||'Comptoir réapprovisionné.';refresh(true);return}
  if(target.dataset.tabletUpgrade){let message;act(()=>{message=game.purchaseUpgrade(target.dataset.tabletUpgrade);return message});feedback.textContent=message||'Amélioration acquise.';refresh(true);return}
  switch(target.dataset.tabletAction){case'close':close();break;case'prep':close({resumeLook:false});break;case'service':act(()=>game.s.open?game.close():game.open());refresh(true);break}
 });
 return {open,close,toggle,isOpen:()=>dialog.open,refresh,handleEscape,reset,getTab:()=>current};
})();
