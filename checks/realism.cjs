// Run with Node and Chrome installed; no npm dependencies required.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'comptoir-check-'));
const target=path.resolve('dist/.realism-check.html');
const expression=fs.readFileSync('checks/realism-browser.js','utf8');
const testScript=path.resolve('dist/.realism-check.js');fs.writeFileSync(testScript,`try{const result=${expression};document.body.dataset.checks=JSON.stringify(result)}catch(error){document.body.dataset.failure=error.stack}`);const script='<script src=".realism-check.js"></script>';
fs.writeFileSync(target,fs.readFileSync('dist/index.html','utf8').replace('</body>',script+'</body>'));
try{
 fs.mkdirSync('checks/artifacts',{recursive:true});
 const result=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu-sandbox','--no-first-run','--no-default-browser-check','--user-data-dir='+profile,'--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=1440,960','--timeout=15000','--virtual-time-budget=1500','--dump-dom','--screenshot='+path.resolve('checks/artifacts/realism-preview.png'),pathToFileURL(target).href],{windowsHide:true,encoding:'utf8',timeout:25000,maxBuffer:4*1024*1024});
 fs.writeFileSync('checks/artifacts/realism-result.html',result.stdout||'');
 const success=result.stdout?.match(/data-checks="([^"]*)"/),failure=result.stdout?.match(/data-failure="([^"]*)"/);
 if(!success)throw Error(failure?.[1]||result.error?.message||result.stderr||'Browser checks failed');
 console.log('REALISM OK',success[1].replaceAll('&quot;','"'));
}finally{fs.unlinkSync(target);fs.unlinkSync(testScript)}