'use strict';
(()=>{
 const api=window.desktopUpdates;
 if(!api)return;
 const section=document.createElement('section');
 const title=document.createElement('h3');title.textContent='Mises à jour du jeu';
 const version=document.createElement('p');
 const status=document.createElement('p');status.setAttribute('role','status');
 const explanation=document.createElement('p');
 const source=document.createElement('p');source.style.overflowWrap='anywhere';
 const choose=document.createElement('button');choose.type='button';choose.textContent='Choisir le dossier des mises à jour';
 const button=document.createElement('button');button.type='button';button.textContent='Rechercher une mise à jour';
 section.append(title,version,status,explanation,source,choose,button);
 document.getElementById('settingsModal').append(section);
 let lastState;
 function show(value){
  if(!value)return;
  const development=value.isPackaged===false;
  version.textContent=(development?'Version de base du projet (développement) : ':'Version installée : ')+value.version;
  explanation.textContent=development
   ?'Vous jouez depuis les sources. Le numéro de base de package.json reste inchangé ; chaque fabrication réussie attribue son propre numéro à l’installateur. L’installation conserve ce numéro.'
   :'Le jeu recherche les nouvelles versions dans le dossier choisi sur votre PC. Fermez le jeu normalement pour les installer ; votre sauvegarde est conservée.';
  status.textContent=value.message||'Recherche automatique activée.';
  source.textContent=value.sourceDirectory?'Dossier : '+value.sourceDirectory:'Aucun dossier choisi.';
  if(value.state==='downloading'&&Number.isFinite(value.progress))status.textContent+=' '+Math.round(value.progress)+' %';
  button.disabled=['disabled','checking','downloading','ready'].includes(value.state);
  choose.disabled=['disabled','checking','downloading','ready'].includes(value.state);
  if(value.state==='ready'&&lastState!=='ready')toast('Une mise à jour est prête. Elle sera installée à la fermeture du jeu.');
  lastState=value.state;
 }
 const failure=()=>{status.textContent='La vérification est momentanément indisponible. Vous pouvez continuer à jouer.';button.disabled=false};
 button.onclick=async()=>{button.disabled=true;try{show(await api.check())}catch{failure()}};
 choose.onclick=async()=>{choose.disabled=true;try{show(await api.chooseSource())}catch{failure();choose.disabled=false}};
 api.onStatus(show);
 api.getStatus().then(show).catch(failure);
})();
