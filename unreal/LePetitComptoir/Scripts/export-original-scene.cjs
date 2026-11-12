'use strict';
// Reuse the original geometry generators; do not maintain a second room layout.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const sourceRoot = path.resolve(__dirname, '../SourceArt/Scene');
function exportScene() {
  const context = vm.createContext({});
  const hashes = {};
  for (const name of ['engine.js', 'scene.js', 'venue.js']) {
    const source = fs.readFileSync(path.join(sourceRoot, name), 'utf8');
    hashes[name] = crypto.createHash('sha256').update(source).digest('hex');
    vm.runInContext(source, context, {filename: name});
  }
  const scene = vm.runInContext('BarScene', context), venue = vm.runInContext('BarVenue', context);
  const game = new context.BarEngine.Game(), world = scene.create(game.s);
  venue.addFrame(world);
  scene.storageVisuals(world, game.s);
  scene.preparationVisuals(world, game.s);
  scene.registerVisuals(world, game.s);
  const seated = [], standing = [], glass = [], beer = [];
  const models = {};
  const pivots = {body:[0,0,0],legLeft:[-.105,.865,0],legRight:[.105,.865,0],armLeft:[-.245,1.31,0],armRight:[.245,1.31,0]};
  for(let variant=0;variant<3;variant++){
    const person=[];scene.customer(person,{x:0,z:0,id:variant+1,time:0,moving:false,angle:0});
    for(const [part,pivot] of Object.entries(pivots)) models[`ped${variant}_${part}`]=person.filter(s=>(s.part||'body')===part).map(s=>({...s,x:s.x-pivot[0],y:s.y-pivot[1],z:s.z-pivot[2]}));
  }
  for(let i=0;i<2;i++){models[`traffic${i}`]=[];scene.trafficCar(models[`traffic${i}`],0,0,i?'#7a5148':'#4c626a');}
  for(const [name,hinge] of [['doorLeft',4.55],['doorRight',7.45]])
    models[name]=world.filter(s=>s.door===name).map(s=>({...s,x:s.x-hinge,z:s.z-10.02}));
  scene.customer(seated, {x:0, z:0, id:1, time:0, seated:true, seatHeight:.84, angle:0});
  scene.customer(standing, {x:0, z:0, id:1, time:0, moving:false, angle:0});
  scene.glass(scene.geometry(glass), 'beer', 0, 0, 0, 0);
  scene.glass(scene.geometry(beer), 'beer', 0, 0, 0, 1);
  // Preserve original dimensions, angles, tapered cylinders, side colors and labels.
  const keys = ['x','y','z','w','h','d','c','mat','solid','roomFloor','round','shape','rx','ry','rz',
    'topRadius','bottomRadius','sideColor','label','labelFace','labelColor','exterior','streetFloor','assembly','venueName'];
  const clean = items => items.map(item => ({
    ...Object.fromEntries(keys.filter(k => item[k] !== undefined).map(k => [k,item[k]])),
    // The browser also constrained walking with walkSurfaceHeight. Unreal needs
    // physical support in the reserve and collision on the shopfront glazing.
    collision: !!(item.solid || item.roomFloor || item.streetFloor || (!item.exterior && item.mat===scene.materials.tile && item.y<0)
      || (item.mat===scene.materials.clearGlass && item.z>=9.9 && item.w>1))
  }));
  return {version:1, sourceSha256:hashes, camera:scene.playCamera,
    collections:{world:clean(world.filter(s=>!s.door)), customerSeated:clean(seated), customerStanding:clean(standing),
      glass:clean(glass), beer:clean(beer), ...Object.fromEntries(Object.entries(models).map(([key,items])=>[key,clean(items)]))}};
}
if (require.main === module) {
  const data = exportScene(), destination = path.join(__dirname, '../Content/OriginalData/scene.json');
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  // One shape per line keeps Git diffs useful without bloating the export.
  const text = JSON.stringify(data).replaceAll('},{', '},\n{') + '\n';
  fs.writeFileSync(destination, text);
  console.log(`Exported ${data.collections.world.length} original scene shapes to ${destination}`);
}
module.exports = {exportScene};
