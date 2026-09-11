import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPurchase, captureOutcome, metrics, inspectProduct } from '../lib/api.mjs';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
process.env.LOOPHOLE_LOCAL_DATA_DIR ||= resolve(root,'.local-data');
const port = Number(process.env.PORT || 4174);
const types = {'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.svg':'image/svg+xml'};
const routes = {'/api/inspect-product':inspectProduct,'/api/check-purchase':checkPurchase,'/api/outcome':captureOutcome,'/api/metrics':metrics};
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
    if (!(/^\/(index\.html|privacy\.html|styles\.css)$/.test(pathname) || pathname.startsWith('/assets/') || pathname.startsWith('/playbook/'))) { res.writeHead(404);res.end('Not found');return; }
    let file = resolve(root,'.'+pathname);
    if (!file.startsWith(root+sep)) { res.writeHead(404);res.end('Not found');return; }
    if ((await stat(file)).isDirectory()) file = resolve(file,'index.html');
    res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(await readFile(file));
  } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end('Request unavailable'); console.error(error.message); }
}).listen(port,'127.0.0.1',()=>console.log('Loophole MVP: http://127.0.0.1:'+port+' (local file storage; no production data)'));
