import { mkdir, readFile, writeFile, cp, readdir, rm } from 'node:fs/promises';
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
const pages=await Promise.all(['index.html','cars/index.html','car/index.html','deal-plan/index.html'].map(f=>readFile(f,'utf8')));
for (const [html,ids] of [[pages[0],['main']],[pages[1],['vehicle-search','make-options','model-options','inventory-mode','search-results']],[pages[2],['vehicle-detail']],[pages[3],['deal-plan']]]) for (const id of ids) {
  if (!html.includes('id="'+id+'"')) throw new Error('Missing required interface element '+id);
}
await rm('dist',{recursive:true,force:true});
await mkdir('dist/assets',{recursive:true});
for (const file of ['index.html','privacy.html','cars','car','deal-plan','how-it-works','why-loophole','dealership']) {
  await mkdir(resolve('dist/'+file,'..'),{recursive:true});
  await cp(file,'dist/'+file,{recursive:true});
}
await cp('assets/favicon.svg','dist/assets/favicon.svg');
await cp('assets/auto.css','dist/assets/auto.css');
await cp('assets/dealership','dist/assets/dealership',{recursive:true});
await mkdir('dist/assets/auto',{recursive:true});
await cp('.generated/auto/client.mjs','dist/assets/auto/client.mjs');
await writeFile('dist/robots.txt','User-agent: *\nAllow: /\nDisallow: /api/\n');
await writeFile('dist/404.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page not found — Loophole Auto</title><link rel="stylesheet" href="/assets/auto.css"><main class="prose"><h1>NOTHING HERE.</h1><p><a class="button" href="/cars/">FIND A CAR →</a></p></main></html>');
console.log('Built public-only dist/. Netlify bundles Functions separately.');
