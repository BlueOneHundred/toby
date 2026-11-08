export function setupChatSearch({root,input,count,previous,next,done,bar,menu}) {
 let index=0,matches=[];
 function select(offset=0,scroll=true){
  if(matches.length)index=(index+offset+matches.length)%matches.length;
  matches.forEach((mark,i)=>mark.classList.toggle('current-match',i===index));
  count.textContent=input.value.trim()?`${matches.length?index+1:0} of ${matches.length}`:'';
  previous.disabled=next.disabled=matches.length<2;
  if(scroll)matches[index]?.scrollIntoView({block:'center',behavior:'smooth'});
 }
 function refresh(scroll=false){
  const query=input.value.trim().toLocaleLowerCase();
  root.querySelectorAll('mark[data-search-match]').forEach(mark=>mark.replaceWith(document.createTextNode(mark.textContent)));
  root.normalize();matches=[];
  if(query){const nodes=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())if(!walker.currentNode.parentElement.closest('button,.speaker,.date-label'))nodes.push(walker.currentNode);
   for(const node of nodes){let text=node.textContent,at=text.toLocaleLowerCase().indexOf(query);if(at<0)continue;const fragment=document.createDocumentFragment();while(at>=0){fragment.append(document.createTextNode(text.slice(0,at)));const mark=document.createElement('mark');mark.dataset.searchMatch='';mark.textContent=text.slice(at,at+query.length);fragment.append(mark);matches.push(mark);text=text.slice(at+query.length);at=text.toLocaleLowerCase().indexOf(query);}fragment.append(document.createTextNode(text));node.replaceWith(fragment);}}
  index=Math.min(index,Math.max(0,matches.length-1));select(0,scroll);
 }
 function close(){input.value='';index=0;refresh();bar.hidden=true;document.body.classList.remove('searching-chat');input.blur();}
 function open(){menu.hidden=true;bar.hidden=false;document.body.classList.add('searching-chat');input.focus();refresh();}
 input.addEventListener('input',()=>{index=0;refresh(true);});input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();select(e.shiftKey?-1:1);}if(e.key==='Escape')close();});
 previous.onclick=()=>select(-1);next.onclick=()=>select(1);done.onclick=close;
 return{open,close,refresh};
}
