import { mkdir, readFile, writeFile, cp, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import './validate-data.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
process.chdir(root);
for (const dir of ['lib','assets','netlify/functions','scripts']) {
  for (const file of await readdir(dir)) if (file.endsWith('.mjs')) execFileSync(process.execPath,['--check',resolve(dir,file)],{stdio:'inherit'});
}
const html = await readFile('index.html','utf8');
for (const id of ['purchase-form','result','price','merchant','product','submit-btn']) {
  if (!html.includes('id="'+id+'"')) throw new Error('Missing required interface element '+id);
}
await mkdir('dist',{recursive:true});
for (const file of ['index.html','privacy.html','styles.css','assets','playbook']) await cp(file,'dist/'+file,{recursive:true});
await writeFile('dist/robots.txt','User-agent: *\nAllow: /\nDisallow: /api/\n');
await writeFile('dist/404.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page not found — Loophole</title><link rel="stylesheet" href="/assets/purchase.css"><main class="privacy"><h1>Nothing here yet.</h1><p><a href="/">Check a purchase with Loophole →</a></p></main></html>');
console.log('Built public-only dist/. Netlify bundles Functions separately.');
