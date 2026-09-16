import { mkdir, readFile, writeFile, cp, readdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import './validate-data.mjs';
import { priceGapEntries } from '../assets/price-gaps.mjs';
import { validatePriceGaps } from '../assets/price-gap-engine.mjs';
import { renderMonthlyPick, renderPriceBoard } from '../assets/price-gap-view.mjs';
validatePriceGaps(priceGapEntries);
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
const [home,same] = await Promise.all(['index.html','samething/index.html'].map(f=>readFile(f,'utf8')));
for (const [html,ids] of [[home,['experiments','manifesto','monthly-pick']],[same,['price-board']]]) for (const id of ids) {
  if (!html.includes('id="'+id+'"')) throw new Error('Missing required interface element '+id);
}
await rm('dist',{recursive:true,force:true});
await mkdir('dist/assets',{recursive:true});
for (const file of ['index.html','privacy.html','styles.css','playbook','samething']) await cp(file,'dist/'+file,{recursive:true});
for (const file of ['favicon.svg','studio.css','studio.mjs','experiments.mjs','samething.mjs','price-gaps.mjs','price-gap-engine.mjs','price-gap-view.mjs']) await cp('assets/'+file,'dist/assets/'+file);
await writeFile('dist/index.html',home.replace('<div id="monthly-pick" class="monthly-pick"></div>','<div id="monthly-pick" class="monthly-pick">'+renderMonthlyPick(priceGapEntries)+'</div>'));
await writeFile('dist/samething/index.html',same.replace('<section id="price-board" aria-label="Ranked price gaps"></section>','<section id="price-board" aria-label="Ranked price gaps">'+renderPriceBoard(priceGapEntries)+'</section>').replace('<noscript><p class="noscript">Enable JavaScript to view the sourced price leaderboard.</p></noscript>',''));
await writeFile('dist/robots.txt','User-agent: *\nAllow: /\nDisallow: /api/\n');
await writeFile('dist/404.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page not found — loophole</title><link rel="stylesheet" href="/assets/studio.css"><main class="site-main board-intro"><h1>Nothing here.</h1><p><a class="text-link" href="/">Find a loophole →</a></p></main></html>');
console.log('Built public-only dist/. Netlify bundles Functions separately.');
