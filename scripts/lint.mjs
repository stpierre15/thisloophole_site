import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const roots=['assets','experiments','lib','netlify/functions','api','scripts','tests'];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())await walk(path);else if(entry.name.endsWith('.mjs'))execFileSync(process.execPath,['--check',path],{stdio:'inherit'})}}
for(const root of roots)await walk(root);
console.log('JavaScript syntax check passed.');
