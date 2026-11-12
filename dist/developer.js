'use strict';
// Developer tools belong to the current save, rather than global preferences.
window.BarDeveloper=(()=>{
 const section=document.createElement('section');section.id='developerSettings';section.setAttribute('aria-labelledby','developerTitle');
 section.innerHTML=`<h3 id="developerTitle">Mode développeur</h3>
 <p id="developerExplanation">Des outils pour tester votre bar. L’activation et les modifications sont enregistrées uniquement dans cette partie.</p>
 <label class="setting" for="developerEnabled">Activer pour cette partie<input id="developerEnabled" type="checkbox" aria-describedby="developerExplanation"></label>
 <p id="developerSessionNotice"></p>
 <div id="developerTools" hidden>
  <div class="developer-grid">
   <form id="developerMoneyForm" class="developer-card"><h4>Trésorerie</h4><p>Ajoutez un budget de test, sans modifier les recettes du service.</p><label for="developerMoneyAmount">Montant en euros</label><div class="developer-amount"><input id="developerMoneyAmount" type="number" inputmode="numeric" min="1" max="1000000" step="1" value="1000" required><button id="developerAddMoney" type="submit">Ajouter l’argent</button></div></form>
   <form id="developerProgressForm" class="developer-card"><h4>Progression</h4><p>Avancez les déblocages. Les achats et les prérequis du bâtiment restent nécessaires.</p><label for="developerProgressAmount">Clients encaissés à ajouter</label><div class="developer-amount"><input id="developerProgressAmount" type="number" inputmode="numeric" min="1" max="1000" step="1" value="25" required><button id="developerAddProgress" type="submit">Avancer</button></div></form>
  </div>
  <div class="developer-card developer-stock"><div><h4>Ingrédients</h4><p>Remplissez le comptoir et la réserve avec les produits déjà autorisés par vos licences.</p></div><button id="developerRefillStocks" type="button">Remplir les stocks</button></div>
  <div class="developer-card"><h4>Horloge du service</h4><p id="developerClock"></p><label class="setting" for="developerPauseClock">Geler l’horloge<input id="developerPauseClock" type="checkbox"></label><p>Les clients, les préparations et les employés continuent à fonctionner lorsque vous reprenez le jeu.</p><button id="developerAdvanceTime" type="button">Avancer d’une heure</button></div>
 </div>
 <p id="developerStatus" role="status" aria-live="polite"></p>`;
 $('settingsModal').insertBefore(section,$('settingsStatus'));
 const enabled=$('developerEnabled'),tools=$('developerTools'),notice=$('developerSessionNotice'),status=$('developerStatus'),pauseClock=$('developerPauseClock'),advance=$('developerAdvanceTime');
 let currentState=null;
 const activeSession=()=>!!window.GameMenu?.hasSession();
 function refresh(){
  const s=game.s,active=activeSession(),on=active&&s.developer?.enabled===true;
  if(currentState!==s){currentState=s;status.textContent=''}
  enabled.disabled=!active;enabled.checked=on;tools.hidden=!on;
  notice.hidden=active;notice.textContent=active?'':'Commencez ou chargez une partie pour utiliser ces outils.';
  for(const control of tools.querySelectorAll('input,button'))control.disabled=!on;
  pauseClock.checked=on&&s.developer.clockPaused===true;
  advance.disabled=!on||!s.open||s.closing;
  $('developerClock').textContent=!active?'':!s.open?'Le bar est fermé. Ouvrez le service pour avancer l’heure.':s.closing?'Dernière tournée : terminez les commandes et les paiements en cours.':`${BarEngine.formatServiceTime(s.time)} · ${pauseClock.checked?'Horloge gelée':'Horloge normale'} · Fermeture à ${BarEngine.formatServiceTime(BarEngine.serviceSchedule.closesAt)}.`;
 }
 function apply(action){
  if(!activeSession()||!$('settingsModal').open){refresh();return}
  const message=action();save(true);ui();refresh();
  status.textContent=message+(saveFailed?' La sauvegarde est indisponible pour le moment.':'');
 }
 enabled.addEventListener('change',()=>apply(()=>game.setDeveloperMode(enabled.checked)));
 function amountForm(formId,inputId,action){
  const form=$(formId),input=$(inputId);
  input.addEventListener('invalid',()=>{status.textContent=`Entrez un nombre entier entre ${Number(input.min).toLocaleString('fr-BE')} et ${Number(input.max).toLocaleString('fr-BE')}.`});
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;apply(()=>game.developerAction(action,input.valueAsNumber))});
 }
 amountForm('developerMoneyForm','developerMoneyAmount','addMoney');
 amountForm('developerProgressForm','developerProgressAmount','addProgress');
 $('developerRefillStocks').addEventListener('click',()=>apply(()=>game.developerAction('refillStocks')));
 pauseClock.addEventListener('change',()=>apply(()=>game.developerAction('pauseClock',pauseClock.checked)));
 advance.addEventListener('click',()=>apply(()=>game.developerAction('advanceTime',60)));
 refresh();return {refresh};
})();
