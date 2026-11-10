'use strict';
const assert=require('node:assert/strict');
const {recipes,preparationLayout}=require('../dist/engine.js');
const staff={x:6,z:1.55};
const approach=point=>({x:point.x,z:Math.min(2.15,Math.max(1.35,point.z))});
const stationPosition=(game,id)=>approach(game.preparationStation(id));
function gather(game,id){
 game.start(id,staff);assert.equal(game.s.prep?.recipe,id,'Preparation starts for '+id);
 game.takeVessel(approach(preparationLayout.vessels));
 const station=stationPosition(game,id);game.placeHeld(station);
 for(const key of Object.keys(recipes[id].ingredients).filter(key=>key!=='beer')){
  game.takeIngredient(key,approach(preparationLayout.ingredients[key]));
  assert.equal(game.s.prep.held?.key,key,'The ingredient is held: '+key);game.placeHeld(station);
 }
 assert.equal(game.isPour(),true);return station;
}
function prepare(game,id,quality=100){
 const station=gather(game,id);game.setPour(true,station);game.s.prep.amount=quality===100?recipes[id].target:0;
 game.finishPour(station);if(Number.isInteger(recipes[id].finishStep))game.finishMix(station);game.plate(station);
}
module.exports={staff,approach,stationPosition,gather,prepare};
