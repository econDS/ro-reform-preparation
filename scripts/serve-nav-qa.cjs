'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),prefix='/ro-reform-preparation/';
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}
 const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)||'index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,bytes)=>{
 if(err){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'}).end(bytes);
 });
}).listen(4173,'127.0.0.1');
