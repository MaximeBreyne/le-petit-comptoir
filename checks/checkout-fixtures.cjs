'use strict';
const assert=require('node:assert/strict');
// Advance the movement subsystem only when a financial fixture already starts
// with a finished drink. Full journeys and staff timing have integration tests.
function reachCheckout(game,order){
 game.checkoutTick(0);
 for(let step=0;step<1800;step++){
  const info=game.checkoutInfo(order);
  if(info&&!info.seated&&!info.moving)return info;
  game.checkoutTick(.1);
 }
 assert.fail('Customer '+order.id+' did not reach the checkout queue');
}
module.exports={reachCheckout};
