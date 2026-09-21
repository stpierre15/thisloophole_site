import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { metrics } from '../lib/api.mjs';
import { emailCapture, studioEvent } from '../lib/studio-api.mjs';
import { retiredTool } from '../lib/retired-api.mjs';
import { circularHandlers } from '../lib/circular-api.mjs';
import { autoHandlers } from '../lib/auto-api.mjs';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
process.env.LOOPHOLE_LOCAL_DATA_DIR ||= resolve(root,'.local-data');
const port = Number(process.env.PORT || 4174);
const types = {'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.svg':'image/svg+xml'};
const routes = {'/api/inspect-product':retiredTool,'/api/check-purchase':retiredTool,'/api/outcome':retiredTool,'/api/metrics':metrics,'/api/same-thing':retiredTool,'/api/email-capture':emailCapture,'/api/studio-event':studioEvent};
for(const name of ['search','identify','alert','outbound'])routes['/api/circular-'+name]=circularHandlers[name];
for(const [path,name] of Object.entries({'/api/vehicle-search':'search','/api/vehicle-detail':'detail','/api/vin-decode':'vin','/api/deal-plan-checkout':'checkout','/api/deal-plan':'deal'}))routes[path]=autoHandlers[name];
createServer(async (req,res) => {
  try {
    const origin = 'http://127.0.0.1:'+port;
    const url = new URL(req.url,origin);
    // Local-only responsive QA harness. Never copied into the production build.
    if (url.pathname === '/__layout') {
      const width = Math.max(320,Math.min(1920,Number(url.searchParams.get('width')) || 1440));
      const height = Math.max(600,Math.min(1200,Number(url.searchParams.get('height')) || 1000));
      res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
      res.end('<!doctype html><html><title>Loophole local layout test</title><body style="margin:0;width:'+width+'px"><iframe title="Loophole layout test" src="/" width="'+width+'" height="'+height+'" style="border:0;display:block"></iframe></body></html>');return;
    }
    if (routes[url.pathname]) {
      const body = []; let length=0;
      for await (const chunk of req) { length += chunk.length; if (length > 12000) { res.writeHead(413);res.end('Request too large');return; } body.push(chunk); }
      const request = new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(body)}:{})});
      const response = await routes[url.pathname](request,{local:true,ip:'127.0.0.1'});
      res.writeHead(response.status,Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    for(const name of ['cars','how-it-works','why-loophole'])if(pathname==='/'+name||pathname==='/'+name+'/')pathname='/'+name+'/index.html';
    if(pathname==='/car'||pathname==='/car/'||pathname.startsWith('/car/'))pathname='/car/index.html';
    if(pathname==='/deal-plan'||pathname==='/deal-plan/'||pathname.startsWith('/deal-plan/'))pathname='/deal-plan/index.html';
    if (['/purchase-checker','/samething','/experiments','/findings','/about','/playbook'].some(x=>pathname===x||pathname.startsWith(x+'/'))) {res.writeHead(302,{'Location':pathname.startsWith('/about')?'/why-loophole/':'/'});res.end();return;}
    if (!(/^\/(index\.html|privacy\.html)$/.test(pathname) || pathname==='/assets/auto.css'||pathname==='/assets/favicon.svg'||pathname==='/assets/auto/client.mjs'||/^\/(cars|car|deal-plan|how-it-works|why-loophole)\/index\.html$/.test(pathname))) { res.writeHead(404);res.end('Not found');return; }
    let file = resolve(root,'.'+pathname);
    if(pathname==='/assets/auto/client.mjs')file=resolve(root,'.generated/auto/client.mjs');
    if (!file.startsWith(root+sep)) { res.writeHead(404);res.end('Not found');return; }
    if ((await stat(file)).isDirectory()) file = resolve(file,'index.html');
    res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(await readFile(file));
  } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end('Request unavailable'); console.error(error.message); }
}).listen(port,'127.0.0.1',()=>console.log('LOOPHOLE studio: http://127.0.0.1:'+port+' (local file storage; no production data)'));
