// Keep a submit tap across iOS keyboard changes, with a click fallback for
// accessibility and native event bridges that do not deliver PointerEvents.
export function retainSubmitGesture(button,form){let gesture,lastSubmit=0;
 function submit(){if(button.disabled||Date.now()-lastSubmit<600)return;lastSubmit=Date.now();form.requestSubmit();}
 button.addEventListener('pointerdown',event=>{if(event.button!==0||button.disabled)return;event.preventDefault();gesture={id:event.pointerId,x:event.clientX,y:event.clientY};button.setPointerCapture(event.pointerId);});
 button.addEventListener('pointerup',event=>{const start=gesture;gesture=null;if(!start||start.id!==event.pointerId)return;event.preventDefault();if(Math.hypot(event.clientX-start.x,event.clientY-start.y)<20)submit();});
 button.addEventListener('pointercancel',()=>{gesture=null;});
 button.addEventListener('click',event=>{event.preventDefault();submit();});
}
