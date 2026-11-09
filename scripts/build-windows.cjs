const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
process.chdir(root);
const runtime=path.join(root,'.build','electron-runtime');
// Ship the game only; Electron's demonstration application is unnecessary.
fs.mkdirSync(runtime,{recursive:true});
fs.cpSync(path.join(root,'node_modules','electron','dist'),runtime,{recursive:true,filter:source=>path.basename(source)!=='default_app.asar'});
const cli=path.join(root,'node_modules','electron-builder','out','cli','cli.js');
const output=path.join(root,'release-final','build-'+Date.now());
const result=cp.spawnSync(process.execPath,[cli,'--win','nsis','--x64','--config.electronDist='+runtime,'--config.directories.output='+output],{stdio:'inherit',env:process.env});
if(result.status===0){
 for(const file of fs.readdirSync(output)){if(file.endsWith('.exe')||file.endsWith('.blockmap'))fs.copyFileSync(path.join(output,file),path.join(root,'release-final',file));}
 console.log('Installateur disponible dans release-final.');
}
process.exit(result.status??1);
