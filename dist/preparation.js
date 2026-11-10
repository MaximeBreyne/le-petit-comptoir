'use strict';
window.BarPreparation=(()=>{
 const layout=BarEngine.preparationLayout;
 const safe=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 function aim(point,position,radius=.19){
  const dx=point.x-position.x,dy=point.y-position.y,dz=point.z-position.z,cp=Math.cos(position.pitch||0);
  const distance=Math.hypot(dx,dy,dz),projection=dx*Math.sin(position.a)*cp+dy*Math.sin(position.pitch||0)+dz*Math.cos(position.a)*cp;
  const transverse=Math.sqrt(Math.max(0,distance*distance-projection*projection));
  return projection>.1&&distance<2.1&&transverse<radius?{aimScore:transverse/radius,distance}:null;
 }
 function target(position){
  if(!game.canWork(position))return null;
  const p=game.s.prep,status=game.preparationStatus(position),candidates=[];
  function add(point,radius,details){const hit=aim(point,position,radius);if(hit)candidates.push({action:'preparation',...details,...hit});}
  if(!p){
   for(const [station,point]of Object.entries(layout.stations))if(Math.hypot(position.x-point.x,position.z-point.z)<=layout.stationReach)add({...point,y:point.y+.15},.27,{kind:'choose',station,label:'Choisir une boisson'});
  }else{
   if(status.stage==='vessel'&&game.nearPreparationSource('vessels',position))add({...layout.vessels,y:layout.vessels.y+.12},.30,{kind:'vessel',label:'Prendre : '+recipes[p.recipe].glass});
   if(status.stage==='ingredient')for(const key of status.remaining){
    const point=layout.ingredients[key];if(point&&!point.fixed&&game.nearPreparationSource(key,position))add({...point,y:point.y+.13},point.kind==='bottle'?.16:.20,{kind:'ingredient',key,label:'Prendre : '+ingredients[key].name});
   }
   if(status.nearStation){
    const messages={
     'place-vessel':'Poser le récipient',
     'place-ingredient':p.held?.key?'Utiliser : '+ingredients[p.held.key].name:'Poser l’ingrédient',
     pour:p.amount>0?'Valider le dosage':'Maintenir '+preferences.bindings.pour.label+' pour '+(p.recipe==='coffee'?'extraire':'verser'),
     mix:'Mélanger et terminer',ready:'Prendre la boisson sur le plateau',
    };
    if(messages[status.stage])add({...status.station,y:status.station.y+.18},.28,{kind:status.stage,label:messages[status.stage]});
   }
  }
  return candidates.sort((a,b)=>a.aimScore-b.aimScore||a.distance-b.distance)[0]||null;
 }
 function use(item){
  if(paused||menusOpen()||BarTablet.isOpen())return false;
  const current=target(camera);if(!current||current.kind!==item.kind||current.key!==item.key)return false;
  if(current.kind==='choose'){BarTablet.open('drinks');return true;}
  act(()=>{
   switch(current.kind){
    case'vessel':return game.takeVessel(camera);
    case'ingredient':return game.takeIngredient(current.key,camera);
    case'place-vessel':case'place-ingredient':return game.placeHeld(camera);
    case'pour':if(game.s.prep.amount<=0)return 'Maintenez '+preferences.bindings.pour.label+' pour doser la boisson.';return game.finishPour(camera);
    case'mix':return game.finishMix(camera);
    case'ready':return game.plate(camera);
   }
  });return true;
 }
 function refresh(){
  const p=game.s.prep,status=game.preparationStatus(camera),inBar=game.canWork(camera);
  $('workbench').hidden=!inBar||!p&&!game.s.tray.length;
  if(!p){updateHTML($('prep'),'<p class="empty">Choisissez une recette sur la tablette, puis prenez un récipient au rangement derrière vous.</p>');return;}
  const r=recipes[p.recipe],held=p.held,ingredientNames=status.remaining.filter(key=>!layout.ingredients[key]?.fixed).map(key=>ingredients[key].name);
  let instruction={vessel:'Prenez un récipient au rangement derrière le bar.','place-vessel':'Apportez le récipient au poste de préparation.',ingredient:ingredientNames.length?'À prendre : '+ingredientNames.join(', '):'Rejoignez le poste de préparation.','place-ingredient':'Apportez '+(held?.key?ingredients[held.key].name.toLocaleLowerCase('fr-BE'):'l’ingrédient')+' au poste.',pour:'Au poste : maintenez '+preferences.bindings.pour.label+' pour doser, puis E pour valider.',mix:'Regardez le verre et appuyez sur E pour terminer.',ready:'Regardez la boisson et appuyez sur E pour la prendre sur le plateau.'}[status.stage]||'';
  if(!status.nearStation&&['pour','mix','ready'].includes(status.stage))instruction='Rejoignez '+r.station.toLocaleLowerCase('fr-BE')+' derrière le comptoir.';
  let html='<div class="sectionTitle"><strong>'+safe(r.name)+'</strong><span>'+safe(r.glass)+'</span></div><p class="prep-instruction">'+safe(instruction)+'</p>';
  if(held)html+='<p class="prep-held">En main : <strong>'+safe(held.kind==='vessel'?r.glass:ingredients[held.key].name)+'</strong></p>';
  if(status.stage==='pour')html+='<p>Objectif : '+r.target+' '+safe(r.unit)+' · <strong>'+p.amount.toFixed(1)+'</strong></p><div class="pourbar"><em></em><i style="width:'+Math.min(100,p.amount/(r.target*1.5)*100)+'%"></i></div>';
  if(p.ready)html+='<p>Dosage : <strong>'+p.quality+' %</strong></p>';
  updateHTML($('prep'),html);
 }
 function refreshPrompt(){
  const active=GameMenu.getMode()==='play'&&!paused&&!menusOpen()&&!BarTablet.isOpen();
  const item=active?interactionTarget():null,node=$('interactionPrompt');
  node.hidden=!item;if(item){const text='E · '+item.label.replace(/^E\s*:\s*/,'');if(node.textContent!==text)node.textContent=text;}
  $('aimDot').hidden=!active||!BarInput.isLooking();
 }
 refresh();return {target,use,refresh,refreshPrompt};
})();
