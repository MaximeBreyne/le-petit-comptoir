(()=>{
  const check=(v,m)=>{if(!v)throw Error(m)};
  check(renderer,'Renderer initialized');GameMenu.newGame();if(GameMenu.getMode()==='confirm')document.querySelector('[data-menu-action="confirm"]').click();paused=false;preferences=defaultPreferences();
  game.s=new Game().s;state=game.s;game.open();ui();
  const a=camera.a;keys[preferences.bindings.turnLeft.code]=true;movement(.1);keys={};check(camera.a<a,'Left arrow turns left');
  keys[preferences.bindings.turnRight.code]=true;movement(.1);keys={};check(Math.abs(camera.a-a)<1e-9,'Right arrow turns right');
  Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>canvas});
  document.dispatchEvent(new MouseEvent('mousemove',{movementX:-30,movementY:0}));check(camera.a<a,'Mouse left looks left');
  document.dispatchEvent(new MouseEvent('mousemove',{movementX:30,movementY:0}));check(Math.abs(camera.a-a)<1e-9,'Mouse right looks right');
  delete document.pointerLockElement;
  game.s.orders=[{id:1,name:'Lucie',recipe:'beer',patience:90},{id:2,name:'Marc',recipe:'wine',patience:90}];ui();
  BarTablet.open('drinks');const recipe=document.querySelector('[data-tablet-recipe="beer"]');BarTablet.refresh(true);check(recipe&&recipe===document.querySelector('[data-tablet-recipe="beer"]'),'Stable tablet catalogue nodes');BarTablet.close();
  visualTime=0;customerVisuals.clear();render();visualTime=4;render();
  const previousCamera={...camera};camera.x=4.6;camera.z=4.85;walk(0,-.8);check(camera.z>=4.75&&camera.z<=4.85,'Swept movement stops at the waiting customer');camera=previousCamera;
  const slot=customerVisuals.get(2).slot;state.orders.shift();render();check(customerVisuals.get(2).slot===slot,'Waiting customer keeps place');
  visualTime=8;render();check(!customerVisuals.has(1),'Departed customer removed');
  const probe=document.createElement('canvas');probe.style.cssText='width:200px;height:200px';document.body.append(probe);
  const near={x:0,y:0,z:2,w:1,h:1,d:.3,c:'#ff0000',castShadow:false},far={x:0,y:0,z:4,w:4,h:4,d:.3,c:'#0000ff',castShadow:false};
  const r=new BarRenderer(probe,[near,far]),cam={x:0,y:0,z:0,a:0,pitch:0};
  const pixel=()=>{const p=new Uint8Array(4);r.gl.readPixels(100,100,1,1,r.gl.RGBA,r.gl.UNSIGNED_BYTE,p);return [...p]};
  r.render(cam,[],preferences);const first=pixel();check(first[0]>120&&first[2]<30,'Depth occlusion');
  r.setScene([far,near]);r.render(cam,[],preferences);check(JSON.stringify(pixel())===JSON.stringify(first),'Draw order independent');
  r.render({...cam,z:1.88},[],preferences);check(r.gl.getError()===0,'Near plane clips correctly');probe.remove();
  game.start('beer');game.step();game.setPour(true);game.tick(.1);render();check(renderer.gl.getError()===0,'Animated geometry renders');
  paused=true;camera={x:6,y:1.65,z:7,a:Math.PI,pitch:0};ui();render();
  return {mouse:'left/right OK',customers:'arrival, fixed places, departure OK',interface:'stable',webgl:renderer.gl.getError(),staticVertices:renderer.count};
 })()
