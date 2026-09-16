import { mkdir, readFile, writeFile, cp, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import './validate-data.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
process.chdir(root);
async function checkModules(dir) {
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const path=resolve(dir,entry.name);
    if(entry.isDirectory())await checkModules(path);
    else if(entry.name.endsWith('.mjs'))execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
  }
}
for (const dir of ['lib','assets','experiments','netlify/functions','scripts']) await checkModules(dir);
const [home,same,purchase] = await Promise.all(['index.html','samething/index.html','purchase-checker/index.html'].map(f=>readFile(f,'utf8')));
for (const [html,ids] of [[home,['experiments','manifesto','studio-email']],[same,['crack-form','demo-grid','same-result']],[purchase,['purchase-form','result','price','merchant','product','submit-btn']]]) for (const id of ids) {
  if (!html.includes('id="'+id+'"')) throw new Error('Missing required interface element '+id);
}
await mkdir('dist',{recursive:true});
for (const file of ['index.html','privacy.html','styles.css','assets','playbook','samething','purchase-checker']) await cp(file,'dist/'+file,{recursive:true});
await writeFile('dist/robots.txt','User-agent: *\nAllow: /\nDisallow: /api/\n');
await writeFile('dist/404.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page not found — LOOPHOLE</title><link rel="stylesheet" href="/assets/studio.css"><main class="manifesto"><div><p class="kicker">404 / ECONOMIC ANOMALY</p><h2>NOTHING<br>HERE.</h2><p><a href="/">Return to the studio →</a></p></div></main></html>');
console.log('Built public-only dist/. Netlify bundles Functions separately.');
