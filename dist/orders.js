'use strict';
// The same tickets are shown in the room and on the tablet. Only orders that
// have been taken enter this list; each prepared drink covers one ticket.
window.BarOrders=(()=>{
 const lists=[],labels={todo:'À faire',preparing:'En préparation',ready:'Prête',serving:'En service'};
 const make=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node};
 function mount(container,{compact=false}={}){
  container.classList.add('order-queue');container.dataset.compact=String(compact);
  const empty=make('p','order-queue-empty','Aucune boisson à préparer.'),list=make('ol','order-queue-list');
  list.setAttribute('aria-label','Boissons commandées');container.append(empty,list);
  lists.push({empty,list,rows:new Map()});refresh();
 }
 function refresh(){
  const queue=game.preparationQueue?.()||[];
  for(const entry of lists){
   entry.empty.hidden=queue.length>0;const ids=new Set(queue.map(ticket=>ticket.orderId));
   for(const [id,row]of entry.rows)if(!ids.has(id)){row.item.remove();entry.rows.delete(id)}
   for(const ticket of queue){
    let row=entry.rows.get(ticket.orderId);
    if(!row){
     const item=make('li','order-ticket'),recipe=make('strong','order-ticket-recipe'),place=make('span','order-ticket-place'),status=make('span','order-ticket-status');
     item.dataset.queueOrder=ticket.orderId;item.append(recipe,place,status);row={item,recipe,place,status};entry.rows.set(ticket.orderId,row);entry.list.append(item);
    }
    row.item.dataset.status=ticket.status;row.recipe.textContent=recipes[ticket.recipe]?.name||'Commande';row.place.textContent=ticket.place;
    row.status.textContent=ticket.status==='ready'?(ticket.prepId?'À récupérer':'Sur le plateau'):ticket.worker==='bartender'?'Préparateur':labels[ticket.status]||'À faire';
   }
  }
  $('orderQueueCount').textContent=String(queue.length);
  $('orderQueueHud').hidden=!game.s.open||queue.length===0;
 }
 mount($('orderQueueList'),{compact:true});
 return {mount,refresh};
})();
