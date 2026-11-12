'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({});for(const file of ['engine.js','scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
const Engine=context.BarEngine,Scene=vm.runInContext('BarScene',context),distance=(a,b)=>Math.hypot(a.x-b.x,(a.y||0)-(b.y||0),a.z-b.z);
function developed(){const game=new Engine.Game();game.s.totalSold=500;for(const [id,item]of Object.entries(Engine.managementUpgrades))if(item.requiresClosed)game.s.management[id]=true;game.open();game.s.spawn=99999;return game;}
function obstacleAt(box,point){
 if(!box.solid||box.y-box.h/2>=point.y+1.7||box.y+box.h/2<=point.y+.2)return false;
 const c=Math.cos(box.ry||0),s=Math.sin(box.ry||0),dx=point.x-box.x,dz=point.z-box.z,x=dx*c-dz*s,z=dx*s+dz*c;
 return box.round?Math.hypot(x/(box.w/2+.2),z/(box.d/2+.2))<1:Math.abs(x)<box.w/2+.2&&Math.abs(z)<box.d/2+.2;
}
function supported(state,boxes,point,seat){
 const p={...point,y:point.y||0},surface=Scene.walkSurfaceHeight(p.x,p.z,state,p.y);
 assert.ok(surface!==null&&Math.abs(surface-p.y)<.06,'Unsupported customer '+JSON.stringify(p));
 // Standing up starts inside the occupied chair; its first step clears the seat.
 if(seat&&distance(p,seat)<.7)return;
 const obstacle=boxes.find(box=>obstacleAt(box,p));assert.ok(!obstacle,'Customer crossed furniture '+JSON.stringify({point:p,obstacle}));
}
const seats=[...Engine.tables.map(table=>({tableId:table.id,slot:null})),...Engine.counterSeats.map(seat=>({tableId:null,slot:seat.slot}))];
for(const seating of seats)test('physical checkout and exit route from '+(seating.tableId?'table '+seating.tableId:'stool '+seating.slot),()=>{
 let game=developed(),order={id:1,name:'Client',recipe:'wine',phase:'drinking',drinkRemaining:0,patience:100,arrivalRemaining:0,paymentMethod:'cash',due:7,tender:10,...seating};game.s.orders=[order];game.s.nextId=2;
 const boxes=Scene.create(game.s),seat=Scene.tableSeat(seating.tableId)||Scene.counterSeat(seating.slot);let previous={...seat,y:seat.y||0},loaded=false,samples=0;
 for(let i=0;i<1600;i++){
  game.tick(.1);order=game.s.orders[0];assert.ok(order,'Customer cannot disappear before payment');const info=game.checkoutInfo(order);assert.ok(info);
  const point=info.position;supported(game.s,boxes,point,seat);assert.ok(distance(point,previous)<=.151,'Checkout movement teleported '+JSON.stringify({previous,point}));previous={...point};samples++;
  if(!loaded&&info.moving&&i>5){const copy=JSON.parse(JSON.stringify(game.s));game=new Engine.Game(copy);assert.ok(distance(game.checkoutInfo(1).position,point)<.000001,'Loading preserves the walking position');loaded=true;}
  if(info.ready)break;
 }
 assert.ok(game.checkoutInfo(1).ready,'Customer reached the cashier');assert.ok(loaded&&samples>1);assert.ok(game.canReachOrder(1,Engine.registerPosition));
 assert.equal(game.canReachOrder(1,{...seat,y:(seat.y||0)+1.68}),false,'The old seat cannot collect a payment');
 const route=game.customerExitRoute(order,previous);
 for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],steps=Math.max(1,Math.ceil(distance(a,b)/.035));for(let j=0;j<=steps;j++){const t=j/steps; supported(game.s,boxes,{x:a.x+(b.x-a.x)*t,y:(a.y||0)+((b.y||0)-(a.y||0))*t,z:a.z+(b.z-a.z)*t});}}
 assert.ok(distance(route.at(-1),{x:6,y:0,z:9.3})<.01,'The customer exits through the entrance');
});
