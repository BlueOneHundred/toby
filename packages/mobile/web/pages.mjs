import {animatedAvatar} from '../../../src/avatar-motion.mjs';
import {renderIcon} from '../../../src/assets/icons.mjs';

export function setupPhonePages({context, command, notice, canSend, editPage}) {
  const $ = id => document.getElementById(id);
  let current = null, libraryScope = null, editTarget = null;
  const previews=new Set(), previewViewports=new Set();
  const previewSizes=new ResizeObserver(entries=>{for(const {target,contentRect} of entries)target.style.setProperty('--preview-scale',String(contentRect.width/900));});
  let signature = '', avatarSignature = '', nonce = '', delivered = false;
  const pageLink = page => 'gratis://page/' + (page.remote || page.shared ? 'team/' : 'local/') + (page.remote ? page.id : page.shared?.id || page.id);
  function icon(name) { const span = document.createElement('span'); renderIcon(span, name); return span; }
  function renderLibrary(data) {
    const list = $('phone-page-list');
    list.replaceChildren();
    const pages = (data?.items || []).filter(page => !libraryScope?.botId || page.botId === libraryScope.botId || page.agent?.id === libraryScope.botId).sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0));
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
    let lastGroup;
    for (const page of pages) {
      const at=page.updatedAt||page.createdAt, date=new Date(at), valid=Number.isFinite(date.getTime());
      const group=!valid?'Pages':date>=today?'Today':date>=yesterday?'Yesterday':date.toLocaleDateString(undefined,{month:'short',day:'numeric',...(date.getFullYear()!==today.getFullYear()?{year:'numeric'}:{})});
      if(group!==lastGroup){const heading=document.createElement('p');heading.className='phone-library-date';heading.textContent=group;list.append(heading);lastGroup=group;}
      const button = document.createElement('button'); button.type = 'button'; button.className = 'phone-page-card';
      button.dataset.pageId = page.id; button.disabled = !canSend();
      const content = document.createElement('span'), title = document.createElement('strong'), detail = document.createElement('small');
      const minutes=Math.max(0,Math.floor((Date.now()-date.getTime())/60000));
      const age=!valid?'':minutes<1?'Now':minutes<60?minutes+'m':minutes<1440?Math.floor(minutes/60)+'h':Math.floor(minutes/1440)+'d';
      title.textContent = page.title; detail.textContent = 'Page · ' + (page.remote || page.shared ? 'Shared' : 'Private') + (age?' · '+age:'');
      content.append(title, detail); button.append(icon('copy'), content);
      button.onclick = () => void command('pages', undefined, undefined, {pages:{action:'open',id:page.id,remote:!!page.remote}});
      list.append(button);
    }
    for (const file of (libraryScope?.botId === data?.botId ? data?.files || [] : libraryScope?.files || [])) {
      const row = document.createElement('div'); row.className = 'phone-library-file'; row.append(icon('file'), document.createTextNode(file.name)); list.append(row);
    }
    $('phone-pages-empty').hidden = !!list.children.length;
  }
  function update() {
    for(const viewport of previewViewports)if(!viewport.isConnected){previewSizes.unobserve(viewport);previewViewports.delete(viewport);}
    const data = context();
    document.querySelectorAll('.phone-chat-page').forEach(button=>button.disabled=!canSend());
    $('phone-page-close').disabled=!canSend();$('phone-page-edit').disabled=!canSend();
    if ($('phone-pages-library').open) renderLibrary(data);
    const selected = data?.selected;
    if (!selected) {
      if (current) { $('phone-page-view').hidden = true; $('phone-page-frame').src = 'about:blank'; }
      current = null; signature = ''; avatarSignature = '';
      if (editTarget) { const target = editTarget; editTarget = null; editPage?.(target); }
      return;
    }
    current = selected; $('phone-pages-library').close(); $('phone-page-view').hidden = false;
    $('phone-page-title').textContent = selected.title;
    $('phone-page-view').setAttribute('aria-label', selected.title + ' by ' + selected.agent.name);
    const identity = JSON.stringify(selected.agent);
    if (identity !== avatarSignature) {
      avatarSignature = identity;
      $('phone-page-avatar').replaceChildren(animatedAvatar('phone-page-' + selected.agent.id, {shape:selected.agent.shape,color:selected.agent.color,photo:selected.agent.photo,mode:'idle'}));
    }
    const key = selected.id + ':' + selected.revision;
    if (key !== signature) {
      signature = key; nonce = crypto.randomUUID(); delivered = false;
      $('phone-page-frame').src = '/page-frame#' + nonce;
    }
    if ($('phone-page-sharing').open) {
      $('phone-page-address').value = pageLink(selected);
      $('phone-page-sharing').setAttribute('aria-label', 'Share ' + selected.title);for(const button of $('phone-page-access').children){const chosen=(selected.shared?.spaceId||'')===button.dataset.spaceId;button.setAttribute('aria-checked',String(chosen));button.querySelector('.page-access-check').hidden=!chosen;button.disabled=!!selected.remote||!canSend();}
    }
  }
  addEventListener('message', event => {
    for(const preview of previews){if(!preview.frame.isConnected){previews.delete(preview);continue;}if(event.source===preview.frame.contentWindow&&event.data?.type==='gratis-page-ready'&&event.data.nonce===preview.nonce){event.source.postMessage({type:'gratis-page-document',nonce:preview.nonce,document:preview.document},'*');previews.delete(preview);return;}}
    if (event.source !== $('phone-page-frame').contentWindow || delivered || event.data?.type !== 'gratis-page-ready' || event.data?.nonce !== nonce || !current) return;
    delivered = true; event.source.postMessage({type:'gratis-page-document',nonce,document:current.document}, '*');
  });
  function openLibrary(scope = null) { libraryScope = scope; $('menu').hidden = true; $('phone-pages-library').showModal(); update(); }
  $('open-phone-pages').onclick = () => openLibrary();
  $('phone-pages-close').onclick = () => $('phone-pages-library').close();
  $('phone-page-close').onclick = () => canSend() && command('pages', undefined, undefined, {pages:{action:'close'}});
  $('phone-page-share').onclick = () => {
    if (!current) return;
    $('phone-page-share-title').textContent = 'Share “' + current.title + '”';
    $('phone-page-address').value = pageLink(current);
    $('phone-page-share-result').textContent = '';
    $('phone-page-edit').hidden = !!current.remote;
    const spaces = (context()?.spaces || []).filter(s => ['owner','member'].includes(s.role));
    const access = $('phone-page-access'); access.replaceChildren();
    for (const option of [{id:'',name:'Only you',detail:'Only you can open this page'}, ...spaces.map(s => ({id:s.id,name:s.name,detail:'People in this team can open this page'}))]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'phone-page-access-row';
      const label = document.createElement('span'), name = document.createElement('strong'), detail = document.createElement('small');
      name.textContent = option.name; detail.textContent = option.detail; label.append(name,detail); button.append(label);
      const chosen = (current.shared?.spaceId || '') === option.id;button.dataset.spaceId=option.id;const check=icon('check');check.className='page-access-check';check.hidden=!chosen;button.append(check);
      button.setAttribute('role','radio'); button.setAttribute('aria-checked',String(chosen));
      button.disabled = !!current.remote || !canSend();
      button.onclick = async () => {
        if (!current || !canSend() || (current.shared?.spaceId||'')===option.id) return;
        if (await command('pages', undefined, undefined, {pages:{action:'share',id:current.id,spaceId:option.id || null,participants:null}})) $('phone-page-share-result').textContent = 'Updating access…';
      };
      access.append(button);
    }
    $('phone-page-sharing-note').textContent = current.remote ? 'The owner manages access. Recipients need access in Gratis.' : spaces.length ? 'Shared links require membership in the selected team space.' : 'Connect a team in desktop settings to share this page. Anonymous public links are not enabled.';
    $('phone-page-sharing').showModal();
  };
  $('phone-page-sharing-close').onclick = () => $('phone-page-sharing').close();
  $('phone-page-copy').onclick = async () => {
    if (!current) return;
    try { await navigator.clipboard.writeText(pageLink(current)); $('phone-page-share-result').textContent = 'Link copied'; }
    catch { notice('Copy is unavailable in this browser. Use Share on your desktop.'); }
  };
  $('phone-page-address-copy').onclick = () => $('phone-page-copy').click();
  $('phone-page-edit').onclick = async () => {
    if (!current || current.remote || !canSend()) return;
    editTarget = current; $('phone-page-sharing').close();
    if (!await command('pages', undefined, undefined, {pages:{action:'close'}})) editTarget = null;
  };
  function card(page){const button=document.createElement('button');button.type='button';button.className='phone-chat-page';button.setAttribute('aria-label','Open Page: '+page.title);const previewDocument=context()?.previews?.[page.id];if(previewDocument){const frame=window.document.createElement('iframe'),nonce=crypto.randomUUID();frame.title=page.title+' preview';frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('tabindex','-1');frame.setAttribute('aria-hidden','true');frame.src='/page-frame#'+nonce;const viewport=window.document.createElement('span');viewport.className='phone-page-preview';viewport.append(frame);previewSizes.observe(viewport);previewViewports.add(viewport);previews.add({frame,nonce,document:previewDocument});button.append(viewport);}const label=window.document.createElement('span'),title=window.document.createElement('strong'),caption=window.document.createElement('small');title.textContent=page.title;caption.textContent='Page';label.append(title,caption);button.append(icon('chart'),label);button.onclick=()=>void command('pages',undefined,undefined,{pages:{action:'open',id:page.id}});return button;}
  return {update, openLibrary, card};
}
