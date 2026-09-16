// Optional deployment compatibility. Production continues to use Netlify.
export const vercelAdapter=handler=>async(req,res)=>{
 const origin='https://'+req.headers.host;
 const chunks=[];let size=0;
 if(req.body!==undefined){const chunk=Buffer.isBuffer(req.body)?req.body:Buffer.from(typeof req.body==='string'?req.body:JSON.stringify(req.body));chunks.push(chunk);size=chunk.length;}
 else for await(const chunk of req){size+=chunk.length;if(size>12000)break;chunks.push(chunk);}
 if(size>12000){res.statusCode=413;res.end('Request too large');return;}
 const request=new Request(new URL(req.url,origin),{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
 const response=await handler(request,{deploy:{context:process.env.VERCEL_ENV==='production'?'production':'deploy-preview',id:process.env.VERCEL_DEPLOYMENT_ID||'vercel-preview'}});
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
};
