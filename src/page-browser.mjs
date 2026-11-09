import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {pageStandalone,PAGE_CSP} from './page-document.mjs';
export class PageBrowser{
 constructor(read){this.read=read;this.tickets=new Map();}
 async start(){if(this.server)return;this.server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),token=url.pathname.slice(1),entry=this.tickets.get(token);if(req.method!=='GET'||!entry||entry.expires<Date.now())throw Error('This page link expired. Open it again from Gratis.');const page=await this.read(entry.id,entry.shared,entry.revision);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':PAGE_CSP.replace("frame-src 'none'","frame-src 'self'"),'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(pageStandalone(page));}catch{res.writeHead(404,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('Page unavailable. Open it again in Gratis.');}});await new Promise(r=>this.server.listen(0,'127.0.0.1',r));this.port=this.server.address().port;this.server.unref();}
 async link(id,shared=false,revision){await this.start();for(const[k,v]of this.tickets)if(v.expires<Date.now())this.tickets.delete(k);if(this.tickets.size>100)this.tickets.delete(this.tickets.keys().next().value);const token=randomBytes(32).toString('hex');this.tickets.set(token,{id,shared,revision,expires:Date.now()+3600000});return 'http://127.0.0.1:'+this.port+'/'+token;}
 async close(){if(this.server)await new Promise(r=>{this.server.close(r);this.server.closeAllConnections();});this.tickets.clear();}
}
