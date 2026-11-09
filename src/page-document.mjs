import {parseHTML} from 'linkedom';
// Generated code is allowed only inside an opaque, script-only sandbox. This
// document never receives the native preload or a token for the parent's APIs.
export const PAGE_CSP="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
export function pageDocument(page){
 const {document}=parseHTML('<!doctype html><html><head></head><body></body></html>');
 const incoming=parseHTML(page.html).document;
 const body=incoming.body?.innerHTML||page.html;
 document.body.innerHTML=body;
 if(incoming.head)for(const node of [...incoming.head.children])if(['STYLE','SCRIPT'].includes(node.tagName))document.head.append(node.cloneNode(true));
 for(const node of document.querySelectorAll('base,meta,link,iframe,frame,frameset,object,embed,form'))node.remove();
 for(const node of document.querySelectorAll('script[src],script[type=module]'))node.remove();
 for(const node of document.querySelectorAll('*'))for(const attr of [...node.attributes])if(['srcdoc','formaction','action','target','download'].includes(attr.name)||attr.name.startsWith('on')&&/load|error|message/i.test(attr.name))node.removeAttribute(attr.name);
 const meta=document.createElement('meta');meta.setAttribute('http-equiv','Content-Security-Policy');meta.setAttribute('content',PAGE_CSP);document.head.prepend(meta);
 const charset=document.createElement('meta');charset.setAttribute('charset','utf-8');document.head.prepend(charset);
 const viewport=document.createElement('meta');viewport.setAttribute('name','viewport');viewport.setAttribute('content','width=device-width,initial-scale=1');document.head.append(viewport);
 const style=document.createElement('style');style.textContent=':root{color-scheme:dark;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#1e1e1e;color:#eee}*{box-sizing:border-box}body{margin:0;padding:20px 28px 120px}button,input,select,textarea{font:inherit}img,svg,canvas{max-width:100%}a{color:#72b7fb}';document.head.prepend(style);
 const title=document.createElement('title');title.textContent=page.title;document.head.append(title);
 return '<!doctype html>'+document.documentElement.outerHTML;
}
export function pageStandalone(page){const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');const policy=PAGE_CSP.replace("frame-src 'none'","frame-src 'self'");return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="'+escape(policy)+'"><title>'+escape(page.title)+'</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;background:#1e1e1e}iframe{display:block}</style></head><body><iframe sandbox="allow-scripts" referrerpolicy="no-referrer" title="'+escape(page.title)+'" srcdoc="'+escape(pageDocument(page))+'"></iframe></body></html>';}
