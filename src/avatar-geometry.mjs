// Isolated avatar geometry and motion mathematics from the authorized local reference.
// Contains no application, account, file, DOM, or network APIs. See evidence/avatar-motion-provenance.md.
function t(e){return e instanceof Error?e.name===`AbortError`||`code`in e&&e.code===`ABORT_ERR`:!1}
function d(e){if(!Number.isFinite(e)||e<0)throw RangeError(`delayMs must be a finite non-negative number`)}
var mr=e=>({x:e,v:0,t:e});
var hr=(e,t,n,r)=>{e.v+=(-2*n*t*e.v-t*t*(e.x-e.t))*r,e.x+=e.v*r,(!Number.isFinite(e.x)||!Number.isFinite(e.v))&&(e.x=e.t,e.v=0)};
var gr=1/120;
var _r=e=>Math.max(1,Math.ceil(e/gr));
var N=(e,t,n)=>Math.min(n,Math.max(t,e));
var vr=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2;
var xr=[.42,0,.58,1];
var Sr=[.4,.06,.18,1];
var Cr=.28;
var wr=.35;
var Tr=.26;
var Er=4.25/60;
var Dr=2/60;
var Or=1.06;
function kr(e,t,n){let r=1-e;return 3*r*r*e*t+3*r*e*e*n+e*e*e}
function Ar(e,t,n){let r=1-e;return 3*r*r*t+6*r*e*(n-t)+3*e*e*(1-n)}
function jr(e,t){let[n,r,i,a]=t,o=e;for(let t=0;t<8;t++){let t=kr(o,n,i)-e,r=Ar(o,n,i);if(Math.abs(t)<1e-6||Math.abs(r)<1e-6)break;o=Math.min(1,Math.max(0,o-t/r))}return kr(o,r,a)}
function Mr(e){let t=Math.min(1,Math.max(0,e));return t*t*(3-2*t)}
function Nr(e,t){let n=Math.min(.28,(e?Dr:Er)/Math.max(t,.05)),r=(1-n)*.42;return{u1:r,u2:r+n}}
function Pr(e){let t=Math.min(1,Math.max(0,e));if(t<.7){let e=t/.7;return(1-(1-e)*(1-e))*Or}return Or+-.06000000000000005*Mr((t-.7)/.3)}
function Fr(e,{u1:t,u2:n}){return e<t?Mr(e/t):e<=n?1:1-Mr((e-n)/Math.max(1e-6,1-n))}
var Ir=Math.PI/180;
function Lr(e,t){return[e[0]*t[0]-e[1]*t[1]-e[2]*t[2]-e[3]*t[3],e[0]*t[1]+e[1]*t[0]+e[2]*t[3]-e[3]*t[2],e[0]*t[2]-e[1]*t[3]+e[2]*t[0]+e[3]*t[1],e[0]*t[3]+e[1]*t[2]-e[2]*t[1]+e[3]*t[0]]}
function Rr(e,t){let n=Math.sin(t/2);return[Math.cos(t/2),e[0]*n,e[1]*n,e[2]*n]}
function zr(e){let t=Math.hypot(e[0],e[1],e[2],e[3])||1;return[e[0]/t,e[1]/t,e[2]/t,e[3]/t]}
function Br(e,t){return zr([1+(e[0]*t[0]+e[1]*t[1]+e[2]*t[2]),e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]])}
function Vr(e){let[t,n,r,i]=e;return[1-2*(r*r+i*i),2*(n*r-t*i),2*(n*i+t*r),2*(n*r+t*i),1-2*(n*n+i*i),2*(r*i-t*n),2*(n*i-t*r),2*(r*i+t*n),1-2*(n*n+r*r)]}
function Hr(e,t,n){return Lr(Rr([0,0,1],n),Lr(Rr([0,1,0],t),Rr([1,0,0],e)))}
function Ur(e){let t=e[0],n=e[3],r=e[5],i=e[4],a=e[6],o=e[7],s=e[8],c=Math.max(-1,Math.min(1,-a)),l=Math.asin(c);return Math.abs(c)>.999999?[Math.atan2(-r,i),l,0]:[Math.atan2(o,s),l,Math.atan2(n,t)]}
function Wr(e){return Ur(Vr(e))}
function Gr(e,t){return[e[0]*t[0]+e[1]*t[1]+e[2]*t[2],e[3]*t[0]+e[4]*t[1]+e[5]*t[2],e[6]*t[0]+e[7]*t[1]+e[8]*t[2]]}
var Kr=.1305;
var qr=[{A:[.01722,.45638,.88962],B:[.186,.20949,.95996],N:[.82924,.4906,-.26773]},{A:[.48863,.67924,.54762],B:[.65674,.43195,.61815],N:[.60389,.18972,-.77416]}];
function Jr(e){let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]}
var Yr=(()=>{let e=[0,0,0];for(let{A:t,B:n}of qr){let r=Jr([t[0]+n[0],t[1]+n[1],t[2]+n[2]]);e=[e[0]+r[0],e[1]+r[1],e[2]+r[2]]}return Jr(e)})();
var Xr=(()=>{let e=Br(Yr,[0,0,1]),t=Vr(e),n=0,r=0;for(let{A:e,B:i}of qr){let a=Gr(t,[i[0]-e[0],i[1]-e[1],i[2]-e[2]]);n+=a[0],r+=a[1]}return Lr(Rr([0,0,1],((Math.PI/2-Math.atan2(r,n)+Math.PI/2)%Math.PI+Math.PI)%Math.PI-Math.PI/2),e)})();
var Zr=(()=>{let e=Vr(Xr);return qr.map(({A:t,B:n,N:r})=>({A:Gr(e,t),B:Gr(e,n),N:Gr(e,r)}))})();
var Qr=[Xr[0],-Xr[1],-Xr[2],-Xr[3]];
var $r=(()=>{let e=({A:e,B:t})=>{let n=Jr([e[0]+t[0],e[1]+t[1],e[2]+t[2]]),r=t[0]*n[0]+t[1]*n[1]+t[2]*n[2],i=Jr([t[0]-r*n[0],t[1]-r*n[1],t[2]-r*n[2]]);i[1]<0&&(i=[-i[0],-i[1],-i[2]]);let a=[n[1]*i[2]-n[2]*i[1],n[2]*i[0]-n[0]*i[2],n[0]*i[1]-n[1]*i[0]];return a[0]*n[0]<0&&(a=[-a[0],-a[1],-a[2]]),{M:n,T:i,C:a}},[t,n]=Zr;if(t==null||n==null)throw Error(`Motion Lab defines exactly two eye capsules`);return[e(t),e(n)]})();
var ei=`sphere.cloud.square.sparkle.clover.heartChubby.starFlower.teardrop.tablet.wedge.house.star6.pebble.bean.egg.squircle.capsule.cylinder.hex.gem.crystal.shield.dome.arch.leaf.pumpkin`.split(`.`);
var ti=new Set([`pumpkin`]);
var ni=[`neutral`,`happy`,`surprised`,`sad`,`sleepy`,`squinted`,`calm`,`inspecting`,`confused`];
var ri=.26;
var ii=18;
var ai=new Map([[`thinking`,`sad`],[`strange`,`inspecting`],[`angry`,`neutral`],[`inspect`,`inspecting`],[`squint`,`squinted`],[`idle`,`neutral`],[`smile`,`happy`],[`sleep`,`sleepy`]]);
var oi=new Set([`sad`,`happy`,`confused`,`squinted`,`sleepy`]);
function si(e,t){return[e[t*6],e[t*6+1]]}
function ci(e,t,n){let r=n?4:2;return[e[t*6]+e[t*6+r],e[t*6+1]+e[t*6+r+1]]}
function li(e){let t=[],n=(e,n,r,i,a)=>{for(let o=a;o<11;o++){let a=o/10,s=1-a,c=s*s*s,l=3*s*s*a,u=3*s*a*a,d=a*a*a;t.push([c*e[0]+l*n[0]+u*r[0]+d*i[0],c*e[1]+l*n[1]+u*r[1]+d*i[1]])}};return n(si(e,0),ci(e,0,!0),ci(e,1,!1),si(e,1),0),n(si(e,1),ci(e,1,!0),ci(e,2,!1),si(e,2),1),t}
function ui({p0:e,p1:t,p2:n,isArc:r}){let[i,a]=e,[o,s]=t,[c,l]=n,u=Array(ii).fill(0),d=(e,t)=>{u[e*6]=t[0],u[e*6+1]=t[1]},f=(e,t)=>{u[e*6+2]=t[0]-u[e*6],u[e*6+3]=t[1]-u[e*6+1]},p=(e,t)=>{u[e*6+4]=t[0]-u[e*6],u[e*6+5]=t[1]-u[e*6+1]};if(r){let e=2*(i*(s-l)+o*(l-a)+c*(a-s));if(Math.abs(e)>1e-9){let t=i*i+a*a,n=o*o+s*s,r=c*c+l*l,m=(t*(s-l)+n*(l-a)+r*(a-s))/e,h=(t*(c-o)+n*(i-c)+r*(o-i))/e,g=Math.hypot(i-m,a-h),_=Math.atan2(a-h,i-m),v=Math.atan2(l-h,c-m),y=Math.atan2(s-h,o-m),b=Math.PI*2,x=(v-_+b)%b,S=(y-_+b)%b<=x?x:x-b,C=e=>[m+g*Math.cos(e),h+g*Math.sin(e)],w=e=>[-Math.sin(e),Math.cos(e)],T=S/2,E=4/3*Math.tan(T/4)*g,D=[_,_+T,_+S];for(let e=0;e<3;e++){let t=C(D[e]),n=w(D[e]);d(e,t),e>0&&f(e,[t[0]-E*n[0],t[1]-E*n[1]]),e<2&&p(e,[t[0]+E*n[0],t[1]+E*n[1]])}return u}let t=[(i+c)/2,(a+l)/2];return d(0,[i,a]),d(1,t),d(2,[c,l]),p(0,[i+(t[0]-i)/3,a+(t[1]-a)/3]),f(1,[t[0]-(t[0]-i)/3,t[1]-(t[1]-a)/3]),p(1,[t[0]+(c-t[0])/3,t[1]+(l-t[1])/3]),f(2,[c-(c-t[0])/3,l-(l-t[1])/3]),u}let m=[(i+o)/2,(a+s)/2],h=[(o+c)/2,(s+l)/2],g=[(m[0]+h[0])/2,(m[1]+h[1])/2];return d(0,[i,a]),d(1,g),d(2,[c,l]),p(0,[i+2/3*(m[0]-i),a+2/3*(m[1]-a)]),f(1,[g[0]+2/3*(m[0]-g[0]),g[1]+2/3*(m[1]-g[1])]),p(1,[g[0]+2/3*(h[0]-g[0]),g[1]+2/3*(h[1]-g[1])]),f(2,[c+2/3*(h[0]-c),l+2/3*(h[1]-l)]),u}
function di(e,t,n,r,i){let a=ui(r);return{off:e,tilt:t,wid:n,lidY:1,oval:i,ovalMix:0,pts:li(a),path:a,fillRing:null}}
function fi(e,t,n,r,i){let a=Math.max(0,(t-e)/2),o=n*Math.PI/180,s=Math.sin(o)*a,c=Math.cos(o)*a;return di(r,i,e/2,{p0:[-s,-c],p1:[0,0],p2:[s,c],isArc:!1},[0,0])}
function pi(e,t,n,r){return fi(e,t,n,[r,0],0)}
function mi(e,t,n){let r={p0:[-e,0],p1:[0,0],p2:[e,0],isArc:!1};return di([n,0],0,t,r,[e,t])}
function hi(e){return[e,e]}
var gi={neutral:hi(pi(ri,.57,0,0)),happy:hi(di([.03,.03],0,Kr,{p0:[.16,-.04],p1:[0,.12],p2:[-.16,-.04],isArc:!0},[0,0])),surprised:hi(pi(.42,.86,0,.03)),inspecting:[pi(.54,.54,0,.04),pi(.36,.36,0,.04)],sad:hi(pi(ri,.5,-28,-.05)),sleepy:hi(di([.01,0],0,ri/2,{p0:[-.11,.025],p1:[0,-.05],p2:[.11,.025],isArc:!1},[0,0])),squinted:hi(pi(ri,.5,90,.01)),calm:hi(mi(.296,.247,.05)),confused:hi(di([-.1,0],0,Kr,{p0:[.01,.16],p1:[-.17,0],p2:[.01,-.16],isArc:!1},[0,0]))};
function _i(e){return ni.some(t=>t===e)}
function vi(e){let t=e.trim().toLowerCase(),n=ai.get(t)??t;return _i(n)?n:`neutral`}
function yi(e){return oi.has(e)}
function bi(e){return!yi(e)&&!gi[e].some(Si)}
function F(e,t){return[t(e[0],0),t(e[1],1)]}
function xi(e){return{...e,ovalMix:0}}
function Si(e){return e.oval[0]>1e-4&&e.oval[1]>1e-4}
function Ci(e){if(Si(e)||e.pts.length<3)return!1;let t=e.pts[0],n=e.pts[e.pts.length-1],r=n[0]-t[0],i=n[1]-t[1],a=r*r+i*i;if(a<1e-8)return!1;let o=0;for(let n of e.pts){let e=((n[0]-t[0])*r+(n[1]-t[1])*i)/a,s=t[0]+e*r,c=t[1]+e*i,l=Math.hypot(n[0]-s,n[1]-c);l>o&&(o=l)}return o>Math.max(.012,e.wid*.2)}
var wi=.03;
var Ti=.42;
var Ei=20;
function Di(e,t,n){return e+(t-e)*n}
function Oi(e,t,n){return[Di(e[0],t[0],n),Di(e[1],t[1],n)]}
function ki(e,t,n){if(e.length===0)return[0,0];if(e.length===1||n<=1)return e[0];let r=t/(n-1)*(e.length-1),i=Math.min(Math.floor(r),e.length-2);return Oi(e[i],e[i+1],r-i)}
function Ai(e,t,n){let r={off:Oi(e.off,t.off,n),tilt:Di(e.tilt,t.tilt,n),wid:Di(e.wid,t.wid,n),lidY:Di(e.lidY,t.lidY,n),oval:Oi(e.oval,t.oval,n),ovalMix:0,fillRing:null};if(e.path&&t.path&&e.path.length===t.path.length){let i=t.path,a=e.path.map((e,t)=>Di(e,i[t],n));return{...r,path:a,pts:li(a)}}let i=Math.max(e.pts.length,t.pts.length,2),a=[];for(let r=0;r<i;r++)a.push(Oi(ki(e.pts,r,i),ki(t.pts,r,i),n));return{...r,path:null,pts:a}}
function ji(e){if(Si(e)){let[t,n]=e.oval;return{cx:e.off[0],cy:e.off[1],ang:t>=n?Math.PI/2:0,halfLen:Math.max(t,n),halfW:Math.min(t,n)}}let t=e.wid;if(e.pts.length<2)return{cx:e.off[0],cy:e.off[1],ang:e.tilt,halfLen:t,halfW:t};let n=e.pts[0],r=e.pts[e.pts.length-1];return{cx:e.off[0]+(n[0]+r[0])/2,cy:e.off[1]+(n[1]+r[1])/2,ang:Math.atan2(r[0]-n[0],r[1]-n[1])+e.tilt,halfLen:Math.hypot(r[0]-n[0],r[1]-n[1])/2+t,halfW:t}}
function Mi(e,t){let n=t.ang-e.ang;for(;n>Math.PI/2;)n-=Math.PI;for(;n<-Math.PI/2;)n+=Math.PI;return n}
function Ni(e,t,n){let r=Math.max(0,e-t),i=Math.max(0,Math.min(1,n)),a=[];for(let n=0;n<48;n++){let o=n/48*Math.PI*2,s=Math.cos(o),c=Math.sin(o),l=t*s,u=e*c,d=t/Math.max(Math.abs(s),1e-6),f;if(d*Math.abs(c)<=r+1e-6&&Number.isFinite(d))f=d;else{let e=(c>=0?1:-1)*r*c,n=Math.max(0,e*e-r*r+t*t);f=e+Math.sqrt(n)}let p=f*s,m=f*c;a.push([p+(l-p)*i,m+(u-m)*i])}return a}
function Pi(e,t,n,r){return fi(Math.max(e,1e-4),Math.max(t,e),0,r,n)}
function Fi(e,t,n){if(n<=1e-4)return xi(e);if(n>=.995)return xi(t);let r=ji(e),i=ji(t),a=Mi(r,i),o=Si(t),s=o?1-(1-n)**3:n*n*n,c=r.ang+a*n,l=Math.max(r.halfLen+(i.halfLen-r.halfLen)*n,1e-4),u=Math.max(r.halfW+(i.halfW-r.halfW)*n,1e-4),d=+!!Si(e),f=d+(+!!o-d)*s,p=Pi(2*u,2*l,c,[r.cx+(i.cx-r.cx)*n,r.cy+(i.cy-r.cy)*n]),m=f>1e-4;return{...p,oval:m?[u,l]:p.oval,ovalMix:m?f:0,fillRing:Ni(l,u,f)}}
function Ii(e,t,n){if(n>=.9999)return xi(t);let r=ji(e),i=ji(t),a=r.ang+Mi(r,i)*n,o=Math.max(1e-4,r.halfW+(i.halfW-r.halfW)*n),s=Math.max(0,r.halfLen-r.halfW)*(1-n)+Math.max(0,i.halfLen-i.halfW)*n,c=[r.cx+(i.cx-r.cx)*n,r.cy+(i.cy-r.cy)*n];return fi(2*o,2*(s+o),a*180/Math.PI,c,0)}
function Li(e){let t=Si(e);if(!(e.wid>0)&&!t)return null;let n=e.lidY,r=e.tilt*(180/Math.PI);if(t)return{width:2*e.oval[0],height:2*e.oval[1]*n,tilt:r,cx:e.off[0],cy:e.off[1]};if(e.pts.length<2)return null;let i=e.pts[0],a=e.pts[e.pts.length-1],o=a[0]-i[0],s=a[1]-i[1],c=Math.hypot(o,s),l=2*e.wid;return{width:l,height:(c+l)*n,tilt:180/Math.PI*Math.atan2(o,s)+r,cx:e.off[0]+(i[0]+a[0])/2,cy:e.off[1]+(i[1]+a[1])/2*n}}
function Ri(e){let t=Li(e);if(t==null)return{w:ri,h:.57,cx:e.off[0],cy:e.off[1]};let n=t.tilt*Math.PI/180,r=Math.abs(Math.cos(n)),i=Math.abs(Math.sin(n));return{w:t.width*r+t.height*i,h:t.width*i+t.height*r,cx:t.cx,cy:t.cy}}
function zi(e,t,n,r){return t>=e?Pi(e,t,0,[n,r]):Pi(t,e,Math.PI/2,[n,r])}
function Bi(e,t){if(t<=0)return e;let n=Math.min(1,t),r=Ri(e),i=Math.max(r.w,1e-4),a=Math.max(r.h,i);return zi(i,a+(i*Ti-a)*n,r.cx,r.cy)}
function Vi(e){return{...e,wid:0,oval:[0,0]}}
function Hi(e){let t,n;if(Si(e))t=-e.oval[1],n=e.oval[1];else{let r=1e9,i=-1e9;for(let t of e.pts)t[1]<r&&(r=t[1]),t[1]>i&&(i=t[1]);t=r-e.wid,n=i+e.wid}return t+.4*(n-t)}
function Ui(e){if(e.pts.length<2)return e;let t=e.pts[0],n=e.pts[e.pts.length-1],r=n[0]-t[0],i=n[1]-t[1];if(Math.abs(i)<Math.abs(r))return e;let a=Math.atan2(r,i);if(Math.abs(a)<1e-5)return e;let o=Math.cos(a),s=Math.sin(a);return{...e,tilt:e.tilt+a,pts:e.pts.map(e=>[e[0]*o-e[1]*s,e[0]*s+e[1]*o])}}
function Wi(e,t){if(t===0)return e;let n=Ui(e),r=Math.max(wi,1-t),i=Hi(n)*(1-r),a=Math.cos(-n.tilt),o=Math.sin(-n.tilt);return{...n,off:[n.off[0]-o*i,n.off[1]+a*i],lidY:n.lidY*r}}
function Gi(e,t,n,r){if(t<.001)return e;let i=n.isFollowingTurn?Math.min(1,Math.max(-1,r/Ei)):n.bias,[a,o]=gi.inspecting,s=Math.max(1e-4,a.wid),c=Math.max(1e-4,o.wid),l=(1+i)/2,u=(e,n)=>{let r=1+(n-1)*t;return{...xi(e),wid:e.wid*r,pts:e.pts.map(e=>[e[0]*r,e[1]*r])}};return[u(e[0],(c/s)**+l),u(e[1],(s/c)**+l)]}
function Ki(e){return+(e===`inspecting`)}
function qi(e,t,n){return!(e.some(Ci)||t.some(Ci))&&(e.some(Si)||t.some(Si))?`oval`:n?`spine`:`stadium`}
function Ji(e){return jr(Math.min(Math.max(e.t/e.dur,0),1),Sr)}
function Yi(){let e=`neutral`,t=F(gi.neutral,xi),n=0,r=null,i=()=>{if(r==null)return t;if(r.kind===`blink`)return r.from;if(r.kind===`morph`){let e=Math.max(0,Math.min(1,Ji(r))),{from:t,to:n,path:i}=r;return i===`oval`?F(t,(t,r)=>Fi(t,n[r],e)):i===`spine`?F(t,(t,r)=>Ai(t,n[r],e)):F(t,(t,r)=>Ii(t,n[r],e))}let e=Math.min(r.t/r.dur,1),{u1:n,u2:i}=Nr(!1,r.dur);if(e<n)return F(r.from,t=>Wi(t,Mr(e/n)));if(e<=i)return F(r.to,Vi);let a=Pr((e-i)/Math.max(1e-6,1-i));return F(r.to,e=>Wi(e,1-a))},a=()=>{if(r==null)return n;if(r.kind===`blink`)return r.fromInspect;let e=r.fromInspect,t=Ki(r.toName);if(r.kind===`morph`)return e+(t-e)*Ji(r);let i=Math.min(r.t/r.dur,1),{u1:a,u2:o}=Nr(!1,r.dur);return i<=a?e:i<o?0:t},o=t=>{let n=F(i(),xi),o=gi[t];r={kind:`morph`,path:qi(n,o,n.some(Ci)||o.some(Ci)||e===`sleepy`||t===`sleepy`),fromInspect:a(),toName:t,from:n,to:o,t:0,dur:Cr,isHeld:!1},e=t},s=t=>{r={kind:`lidMorph`,fromInspect:a(),toName:t,from:F(i(),xi),to:gi[t],t:0,dur:wr,isHeld:!1},e=t},c=()=>{(r==null||r.isHeld)&&(r={kind:`blink`,fromInspect:n,toName:e,from:F(t,xi),to:gi[e],t:0,dur:Tr,isHeld:!1})},l=t=>{(t.name!==e||r!=null&&r.toName!==t.name)&&(t.isThroughBlink&&!yi(t.name)&&!yi(e)?s(t.name):o(t.name))},u=(e,i)=>{i>=e.dur?(t=F(e.to,xi),n=Ki(e.toName),r=null):r=i<0?null:{...e,t:i}},d=e=>{r!=null&&(r={...r,isHeld:e})};return{get name(){return e},get isMorphing(){return r!=null&&r.kind!==`blink`&&!r.isHeld},eyes:i,inspectWeight:a,blinkAmount(){if(r?.kind!==`blink`||r.isHeld)return null;let e=Math.min(r.t/r.dur,1);return Math.min(1,Math.max(0,Fr(e,Nr(!0,r.dur))))},morph:o,lidMorph:s,blink:c,play:l,step(e){r!=null&&!r.isHeld&&u(r,r.t+e)},release(){d(!1)},seek(i,a){e=`neutral`,t=F(gi.neutral,xi),n=0,r=null;let o=0,s=e=>{r!=null&&u(r,e-o)};for(let e of i){if(e.t>a+1e-9)break;s(e.t),l(e),o=e.t}s(a),d(!0)}}}
var Zi=.9;
var Qi=.4;
var $i=.62;
var ea=.3;
var ta=.5;
var na=16;
function ra({poke:e,turns:t}){switch(e){case`spin`:return Zi+Qi*(t-1);case`bounce`:return $i;case`nod`:return ta;default:throw Error(`Unhandled case: ${String(e)}`)}}
function ia(e){let t=0,n=0,r=0,i=1,a=1;for(let o of e){let e=Math.min(1,o.t/ra(o));switch(o.poke){case`spin`:n+=180*o.turns*(1-Math.cos(Math.PI*e));break;case`nod`:t+=na*aa(e,0,1);break;case`bounce`:{let t=aa(e,0,.18)+aa(e,.82,1),n=aa(e,.18,.82);r+=ea*Math.sin(Math.PI*N((e-.14)/.72,0,1)),i*=1+.08*t-.04*n,a*=1-.1*t+.06*n;break}}}return{pitch:t,yaw:n,lift:r,squash:[i,a]}}
function aa(e,t,n){return e<=t||e>=n?0:Math.sin(Math.PI*(e-t)/(n-t))**2}
var oa=1/60;
var sa=.55;
var ca={heartChubby:.6,wedge:.55};
function ua(e){return 1-.86**(e/oa)}
function da(e,t,n){let r=e!==`sphere`,i=ca[e]??1;return{rx:-(r?19:14)*i*n,ry:(r?26:18)*i*t,px:(r?.07:.03)*t,py:(r?.055:.024)*n}}
var pa={thinking:`dots`,orbit:`orbit`,radar:`radar`,progress:`progress`,spawning:`gather`,dictating:`wave`,sending:`send`,receiving:`receive`,uploading:`dock`,bouncing:`ball`,writing:`pencil`,alerting:`bang`,"powering-down":`standby`};
var ma=Math.PI;
var ha=.1;
var ga=2654435769;
var _a=new Set([`progress`,`spawning`]);
var va={progress:2.5,spawning:2};
var ya=1.5;
function ba(e){let t=e|0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,t|1);return e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}
function xa(e){return va[e]??2.5}
function Sa(e={}){let t=e.isReducedMotion??!1,n=ba(e.seed??ga),r=mr(0),i=mr(1),a=mr(0),o=null,s=null,c=null,l=null,u=!1,d=0,f=0,p=1,m=!1,h=0,g=0,_=0,v=0,y=0,b=()=>{let e=o==null?null:pa[o],b=_;o!==s&&(s=o,o!=null&&(_=h,u=!1));let x=e!=null;o!=null&&_a.has(o)&&(!u&&h-_>xa(o)?(u=!0,d=h):u&&h-d>ya&&(u=!1,_=h),x=!u),r.t=+!!x,e!=null&&e!==c&&(c!=null&&r.x>.02?(l=c,v=g,y=b,i.x=+!!t):(l=null,i.x=1),i.v=0,i.t=1,c=e,g=h),e==null&&r.x<.004&&(c=null,l=null),i.x>.996&&(l=null),x!==m&&(x&&!t&&(p=n()<.5?1:-1),t||(f+=ma*p,a.t=f),m=x)};return{get target(){return o},set(e){o=e},advance(e){let n=e>0?Math.min(e,ha):0;h+=n,b();let o=_r(n),s=n/o;for(let e=0;e<o;e++)hr(r,14,1,s),hr(i,11,1,s),hr(a,14,1,s);t&&(i.x=1,a.x=a.t,r.x=r.t)},settle(){b();for(let e of[r,i,a])e.x=e.t,e.v=0;b()},snapshot(){return{amount:N(r.x,0,1),spin:a.x,kind:c,outgoing:l,swap:N(i.x,0,1),clock:{stateTime:h-g,shotTime:h-_},outgoingClock:{stateTime:h-v,shotTime:h-y},isReducedMotion:t,isSettled:Math.abs(r.x-r.t)<.001&&Math.abs(a.t-a.x)<.01&&i.x>.996}}}}
var Ca=new Map([[`position`,`position`],[`rotation`,`rotation`],[`squash`,`squash`],[`scale`,`zoom`],[`lids`,`lids`],[`expression`,`expression`],[`pos`,`position`],[`rot`,`rotation`],[`scl`,`squash`],[`zoom`,`zoom`],[`expr`,`expression`]]);
var wa=new Map([[`blob`,`sphere`],[`sphereWide`,`sphere`],[`arch`,`horseshoe`],[`spark`,`sparkle`],[`star`,`star6`],[`heart`,`heartChubby`],[`hexagon`,`hex`]]);
var Ta=[.4,0,.2,1];
var Ea=.6;
var Da=(()=>{let[e,t,n]=Wr(Qr);return[e/Ir,t/Ir,n/Ir]})();
var Oa={duration:10,body:null,squashAnchor:0,restTime:0,inspect:{},position:[],rotation:[],squash:[],zoom:[],lids:[],expression:[]};
var ka={...Oa,rotation:[{t:0,v:Da,ease:xr}]};
function Aa(e){return ei.some(t=>t===e)}
function ja(e){let t=wa.get(e)??e;return Aa(t)?t:`sphere`}
function Ma(e){return e!=null&&e.length===4}
function Na({t:e,v:t,ease:n}){return{t:e,v:typeof t==`string`?[]:t,ease:Ma(n)?n:xr}}
function Pa(e){return[{t:e,v:[0],ease:xr},{t:e+Tr*.45,v:[1],ease:xr},{t:e+Tr,v:[0],ease:xr}]}
function Fa({inspect:e}){let t=e?.bias;return{bias:t!==void 0&&Number.isFinite(t)?Math.min(1,Math.max(-1,t)):void 0,isFollowingTurn:e?.follow}}
function Ia(e){let t=new Map;for(let[n,r]of Object.entries(e.tracks)){let e=Ca.get(n);e!==void 0&&t.set(e,r)}let n=e=>(t.get(e)??[]).map(Na),r=n(`lids`),i=[],a=!1;for(let e of t.get(`expression`)??[])e.v===`blink`?(a=!0,r.push(...Pa(e.t))):i.push({t:e.t,name:typeof e.v==`string`?vi(e.v):`neutral`,isThroughBlink:e.cut===!1});return a&&r.sort((e,t)=>e.t-t.t),{duration:e.duration,body:ja(e.body??`sphere`),squashAnchor:e.squashAnchor??0,restTime:e.workArea?e.workArea.start:0,inspect:Fa(e),position:n(`position`),rotation:n(`rotation`),squash:n(`squash`),zoom:n(`zoom`),lids:r,expression:i}}
function La(e,t){if(e.length===0)return null;if(t<=e[0].t)return e[0].v;let n=e[e.length-1];if(t>=n.t)return n.v;let r=0;for(;r<e.length-2&&e[r+1].t<=t;)r++;let i=e[r],a=e[r+1],o=jr((t-i.t)/Math.max(a.t-i.t,1e-9),i.ease);return i.v.map((e,t)=>e+(a.v[t]-e)*o)}
function Ra(e){let t=e.restTime,n=La(e.rotation,t),r=La(e.position,t),i=La(e.squash,t),a=La(e.zoom,t),o=La(e.lids,t),s=`neutral`,c=!1;for(let n of e.expression)c||=(s=n.name,!0),n.t<=t+1e-9&&(s=n.name);return{rot:n?[n[0],n[1],n[2]]:[0,0,0],pos:r?[r[0],r[1]]:[0,0],scl:i?[i[0],i[1]]:[1,1],zoom:a?a[0]:Ea,lids:o?Math.min(1,Math.max(0,o[0])):0,expr:s,squashAnchor:e.squashAnchor}}
function za(e,t){return e+360*Math.round((t-e)/360)}
function Ba(e,t){return Math.abs(((e-t)%360+540)%360-180)}
function Va(e,t){return Ba(e.rot[0],t.rot[0])<4&&Ba(e.rot[1],t.rot[1])<4&&Ba(e.rot[2],t.rot[2])<4&&Math.abs(e.pos[0]-t.pos[0])<.015&&Math.abs(e.pos[1]-t.pos[1])<.015&&Math.abs(e.scl[0]-t.scl[0])<.02&&Math.abs(e.scl[1]-t.scl[1])<.02&&Math.abs(e.zoom-t.zoom)<.02&&Math.abs(e.lids-t.lids)<.05}
function Ha(e,t){let n=(e,t)=>[{t:0,v:e,ease:Ta},{t:wr,v:t,ease:xr}],r=[za(t.rot[0],e.rot[0]),za(t.rot[1],e.rot[1]),za(t.rot[2],e.rot[2])];return{...Oa,duration:wr,squashAnchor:e.squashAnchor,position:n(e.pos,t.pos),rotation:n(e.rot,r),squash:n(e.scl,t.scl),zoom:n([e.zoom],[t.zoom]),lids:e.lids===0&&t.lids===0?[]:n([e.lids],[t.lids])}}
var Ua={left:{rot:[0,-20,0],pos:[-.1,0]},right:{rot:[0,20,0],pos:[.1,0]},up:{rot:[-20,0,0],pos:[0,.1]},down:{rot:[20,0,0],pos:[0,-.1]},center:{rot:[0,0,0],pos:[0,0]}};
var Wa=[.42,0,.58,1];
var Ga=.5;
var Ka=.1;
var qa=10;
var Ja=1e-4;
var Ya=.5;
var Xa=.001;
var Za=`rest`;
function Qa(e){return 360*Math.round(e/360)}
function $a(e,t){let n=`neutral`;for(let r of e){if(r.t>t+1e-9)break;n=r.name}return n}
function eo(e={}){const isDirectGaze=e.gazeTracking===`direct`;let t=Math.min(3,Math.max(.2,e.zoomMul||1)),n=Yi(),r=e.body??`sphere`,i=e.body!==void 0,a=[],o=mr(1),s=Sa(),c=null,l=Da,u=[0,0],d=[1,1],f=0,p=Ea*t,m={bias:-1,isFollowingTurn:!0},h=null,g={isHeld:!1,isAlways:e.isGazeAlways??!1,x:0,y:0,cx:0,cy:0,hold:0},_=ka,v=0,y=!1,b=!0,x=!1,S=null,C=null,w=null,T=0,E=0,D=null,O=null,ee=!1,te=[],ne=()=>{let e=La(_.position,v);u=e?[e[0],e[1]]:[0,0];let n=La(_.rotation,v);l=n?[n[0],n[1],n[2]]:[0,0,0];let r=La(_.squash,v);d=r?[r[0],r[1]]:[1,1];let i=La(_.zoom,v);i&&(p=Math.min(2.5,Math.max(.25,i[0]))*t)},k=e=>{(n.blinkAmount()??j())>0?O=e:(e(),ae())},re=(e,t)=>{if(D==null)for(let r of _.expression)r.t<=e||r.t>t||k(()=>n.play(r))},ie=e=>{v=e,h=null,O=null,ne(),n.seek(_.expression,e),D!=null&&n.seek([{t:0,name:D,isThroughBlink:!1}],0)},A=()=>{let e=La(_.lids,v);return e?Math.min(1,Math.max(0,e[0])):0},j=()=>ee?0:A(),ae=()=>{!bi(n.name)||n.isMorphing?ee=!0:ee&&A()===0&&(ee=!1)},oe=()=>({rot:l,pos:u,scl:d,zoom:p/t,lids:j(),expr:n.name,squashAnchor:f}),se=e=>{y=!1,_=e,v=0,f=e.squashAnchor,e.body!=null&&!i&&(r=e.body),m={bias:e.inspect.bias??m.bias,isFollowingTurn:e.inspect.isFollowingTurn??m.isFollowingTurn}},ce=e=>{C=null,se(e.clip),S={clip:e.clip,name:e.name},b=!0,e.isPlaying?(y=!0,e.phase>0&&ie(e.phase*e.clip.duration),n.release(),e.phase<=0&&re(-1e-9,0)):(ie(0),e.isRest&&(g={...g,hold:0}))},le=e=>{let t=oe(),r=Ra(e.clip);C=e,se(Ha(t,r)),b=!1,y=!0,D==null&&t.expr!==r.expr&&k(()=>n.morph(r.expr))},ue=()=>C!=null||S==null||Va(oe(),Ra(S.clip))?!1:(le({...S,isPlaying:!0,phase:0,isRest:!1}),!0),de=e=>{let t=v,n=t+e;if(n>=_.duration){if(re(t,_.duration),b){if(E+=1,ue())return;n-=_.duration,n>=_.duration&&(n=0),re(-1e-9,n),v=n}else v=_.duration,y=!1,C!=null&&ce(C)}else re(t,n),v=n;h=null,ne()},fe=(e,t,n)=>{let r=e+(t-e)*n;return Math.abs(t-r)<Xa?t:r},pe=e=>{if(x||!g.isHeld&&g.hold===0)return;let t=ua(e);if(g={...g,cx:fe(g.cx,g.x,t),cy:fe(g.cy,g.y,t),hold:fe(g.hold,+!!g.isHeld,t)},y)return;ne();let n=da(r,g.cx,g.cy),{hold:i}=g;l=[l[0]+(n.rx-l[0])*i,l[1]+(n.ry-l[1])*i,l[2]*(1-i)],u=[u[0]+(n.px-u[0])*i,u[1]+(n.py-u[1])*i]},me=e=>{if(h==null)return;let t=h.t+e,n=Math.min(t/Ga,1),r=jr(n,Wa),{fromRot:i,toRot:a,fromPos:o,toPos:s}=h;l=[i[0]+(a[0]-i[0])*r,i[1]+(a[1]-i[1])*r,i[2]+(a[2]-i[2])*r],u=[o[0]+(s[0]-o[0])*r,o[1]+(s[1]-o[1])*r],n>=1?(l=a,u=s,h=null):h={...h,t}},he=()=>{if(a.length===0)return[{body:r,weight:1}];let e=vr(N(o.x,0,1)),t=new Map;for(let n of a)t.set(n.body,(t.get(n.body)??0)+n.weight*(1-e));t.set(r,(t.get(r)??0)+e);let n=[...t].filter(([,e])=>e>Ja),i=n.reduce((e,[,t])=>e+t,0);return n.map(([e,t])=>({body:e,weight:t/i}))},ge=e=>{e!==r&&(a=he(),r=e,o.x=0,o.v=0,o.t=1)},_e=e=>{if(a.length===0)return;let t=_r(e);for(let n=0;n<t;n++)hr(o,qa,1,e/t);Math.abs(o.x-1)<.001&&Math.abs(o.v)<.01&&(o.x=1,o.v=0,a=[])},ve=()=>n.blinkAmount()??j(),ye=(e,t)=>{let r=Gi(n.eyes(),t,m,e),i=ve();return i<=1e-4?r:[Bi(r[0],i),Bi(r[1],i)]};return{get isPlaying(){return y},get time(){return v},get duration(){return _.duration},get loopCount(){return E},get face(){return n.name},get isSettled(){let e=x||g.hold===+!!g.isHeld&&(!g.isHeld||g.cx===g.x&&g.cy===g.y);return!y&&te.length===0&&a.length===0&&h==null&&O==null&&!n.isMorphing&&n.blinkAmount()==null&&s.snapshot().isSettled&&e},load(e,{isPlaying:t=!0,transition:n=`bridge`,phase:r=0}={}){let i=e.name||S?.name||`recipe`,a={clip:Ia(e),name:i,isPlaying:t,phase:N(r,0,1)%1,isRest:!1};n===`bridge`&&S!=null&&(C!=null||S.name!==i)?le(a):ce(a)},play(){x=!1,y=!0},pause(){x=!0,y=!1},stop(){y=!1,ie(0)},rest(){x=!1;let e={clip:ka,name:Za,isPlaying:!1,phase:0,isRest:!0};C==null&&(S==null||S.name===Za)?S??ce(e):le(e)},seek:ie,setBody(e,{isInstant:t=!1}={}){i=!0,!t&&!ti.has(e)&&!ti.has(r)?ge(e):(r=e,a=[],o.x=1,o.v=0)},setMorph(e,{isInstant:t=!1}={}){s.set(e),t&&s.settle()},setExpression(e,{isThroughBlink:t=!1}={}){k(()=>{t&&!yi(e)&&!yi(n.name)?n.lidMorph(e):n.morph(e)})},holdFace(e){e!==D&&(D=e,k(()=>{let e=D??(C==null?$a(_.expression,v):$a(C.clip.expression,0));e!==n.name&&n.morph(e)}))},poke(e,{turns:t=1}={}){te=[...te,{poke:e,t:0,turns:Math.max(1,Math.round(t))}]},blink(){n.blink()},setInspect({bias:e,isFollowingTurn:t}){m={bias:e===void 0?m.bias:Math.min(1,Math.max(-1,e)),isFollowingTurn:t??m.isFollowingTurn}},setGaze(e,{immediate:t=!1}={}){if(e==null){g={...g,isHeld:!1};return}let n=N(e[0]||0,-1,1),r=N(e[1]||0,-1,1);g=t?{...g,isHeld:!0,x:n,y:r,cx:n,cy:r,hold:1}:g.hold===0?{...g,isHeld:!0,x:n,y:r,cx:n,cy:r}:{...g,isHeld:!0,x:n,y:r}},setGazeAlways(e){g={...g,isAlways:e}},look(e){let t=Ua[e];h={t:0,fromRot:l,toRot:t.rot,fromPos:u,toPos:t.pos}},setGlow(e){w=e},advance(e){let t=Math.min(e,Ka);pe(t);let r=1-s.snapshot().amount;if(y&&de(t*r),me(t),n.step(t),O!=null&&(n.blinkAmount()??j())===0){let e=O;O=null,e()}ae(),_e(t),te=te.map(e=>({...e,t:e.t+t})).filter(e=>e.t<ra(e)),s.advance(t);let i=s.snapshot();i.amount>0||!i.isSettled?c??=[Qa(l[0]),Qa(l[1]),Qa(l[2])]:c=null,T+=e},frame(){let aim=isDirectGaze&&g.hold>0?da(r,g.cx,g.cy):null,e=g.isAlways&&y&&!x?da(r,g.cx,g.cy):null,t=sa*g.hold,i=ia(te),a=aim?[l[0]*(1-g.hold)+aim.rx*g.hold+i.pitch,l[1]*(1-g.hold)+aim.ry*g.hold+i.yaw,l[2]*(1-g.hold)]:[l[0]+(e?e.rx*t:0)+i.pitch,l[1]+(e?e.ry*t:0)+i.yaw,l[2]],o=aim?[u[0]*(1-g.hold)+aim.px*g.hold,u[1]*(1-g.hold)+aim.py*g.hold+i.lift]:[u[0]+(e?e.px*t:0),u[1]+(e?e.py*t:0)+i.lift],m=[d[0]*i.squash[0],d[1]*i.squash[1]],h=n.inspectWeight(),_=s.snapshot(),v=1-_.amount,b=_.spin%(2*Math.PI)/Ir,S=c??[0,0,0],C=e=>S[e]+(a[e]-S[e])*v,E=C(1);return{body:r,quat:Hr(C(0)*Ir,(E+b)*Ir,C(2)*Ir),zoom:p,offset:v===1?o:[o[0]*v,o[1]*v],squash:v===1?m:[1+(m[0]-1)*v,1+(m[1]-1)*v],squashAnchor:f,eyes:_.amount>=Ya?null:ye(E,h),glow:w&&{...w,midT:.5+.5*Math.sin(T*1e3/860)},inspectWeight:h,bodies:he(),morph:_.kind===null&&_.isSettled?null:_}}}}
var to=.92;
function no(e){return e/Ea}
var _o=.26;
var vo=.57;
var yo=.64;
var bo=.04;
var xo=.12;
var So=11;
var Co=18;
var wo=48;
var To=10;
var Eo=64;
var Do={on:!1,oval:!1,width:0,height:0,tilt:0,cx:0,cy:0};
var Oo={cloud:{width:.21294,height:.4668299999999999,gap:.47001600000000004,shiftY:.06999999999999999},square:{width:.2553258426966292,height:.559752808988764,gap:.529408,shiftY:.12},sparkle:{width:.18381999999999998,height:.40298999999999996,gap:.41215999999999997,shiftY:0},clover:{width:.23296,height:.51072,gap:.559104,shiftY:-.020000000000000018},heartChubby:{width:.18657600000000002,height:.409032,gap:.44620799999999994,shiftY:.051999999999999935},starFlower:{width:.19292,height:.42294,gap:.38297600000000004,shiftY:.12},teardrop:{width:.20779200000000003,height:.455544,gap:.45260800000000007,shiftY:.18},tablet:{width:.2132,height:.4673999999999999,gap:.587776,shiftY:.01999999999999999},wedge:{width:.2132,height:.4673999999999999,gap:.46771199999999996,shiftY:.18},house:{width:.2295124,height:.5031617999999999,gap:.5125120000000001,shiftY:.18499534000463813},star6:{width:.184782,height:.44965988999999995,gap:.41913343999999997,shiftY:.12},pebble:{width:.23920000000000002,height:.5244,gap:.546304,shiftY:.12},bean:{width:.2028,height:.4446,gap:.4608,shiftY:.12},egg:{width:.23920000000000002,height:.5244,gap:.433664,shiftY:.11299906800092761},squircle:{width:.23920000000000002,height:.5244,gap:.5632,shiftY:.12},capsule:{width:.2106,height:.4617,gap:.36044800000000005,shiftY:.12},cylinder:{width:.23920000000000002,height:.5244,gap:.47872000000000003,shiftY:.12},hex:{width:.26,height:.57,gap:.64,shiftY:.12},gem:{width:.23920000000000002,height:.5244,gap:.501248,shiftY:.12},crystal:{width:.1612,height:.3534,gap:.3712,shiftY:.12},shield:{width:.26790400000000003,height:.5873280000000001,gap:.44492800000000005,shiftY:.12},dome:{width:.2132,height:.4673999999999999,gap:.47872000000000003,shiftY:.10599813600185524},arch:{width:.19240000000000002,height:.42179999999999995,gap:.44799999999999995,shiftY:.16},leaf:{width:.1872,height:.41039999999999993,gap:.44799999999999995,shiftY:.039999999999999994}};
function ko(e,t){let n=Oo[e],r=n.width/_o,i=n.height/vo,a=n.gap/yo;return t.every(e=>Go(e)&&!(e.fillRing!=null&&e.fillRing.length>0))?jo(No(t[0]),No(t[1]),n,r,i,a):{loops:Po(t,r,a,i,0,n.shiftY),shiftY:0}}
function Ao(e){return Po(e,1,1,1,bo,xo)}
function jo(e,t,n,r,i,a){let o=I(e.width*r),s=I(e.height*r),c=I(t.width*r),l=I(t.height*r),u=Math.max(0,I(Math.min(o,s))),d=Math.max(0,I(Math.max(o,s))),f=Math.max(0,I(Math.min(c,l))),p=Math.max(0,I(Math.max(c,l))),m=Math.max(0,I((yo+(e.on?I(e.cx):0)+(t.on?I(t.cx):0))*a,yo*a)),h=Math.max(.05,Math.min(1.8,m));return{loops:[Mo(-1,u,d,-I(I(e.tilt)+(o>=s?0:90)),h),Mo(1,f,p,I(I(t.tilt)+(c>=l?0:90)),h)],shiftY:I(n.shiftY+(I(e.cy)+I(t.cy))/2*i,n.shiftY)}}
function Mo(e,t,n,r,i){let a=Math.max(.01,Math.min(1,t))/2,o=Math.max(.02,Math.min(1.8,Math.max(n,t)))/2,s=-r*Math.PI/180,c=Math.cos(s),l=Math.sin(s);return Array.from({length:Eo},(t,n)=>{let r=2*Math.PI*n/Eo,s=e*o*Math.cos(r),u=a*Math.sin(r);return{x:s*c-u*l+e*i/2,y:s*l+u*c}})}
function No(e){let t=Go(e);if(!(e.wid>0)&&!t)return Do;let n=e.lidY||1,r=(e.tilt||0)*(180/Math.PI);if(t)return{on:!0,oval:!0,width:2*e.oval[0],height:2*e.oval[1]*n,tilt:r,cx:e.off[0],cy:e.off[1]};let i=e.pts;if(i.length<2)return{...Do,cx:e.off[0],cy:e.off[1]};let a=i[0],o=i[i.length-1],s=o[0]-a[0],c=o[1]-a[1],l=Math.hypot(s,c),u=2*e.wid;return{on:!0,oval:!1,width:u,height:(l+u)*n,tilt:180/Math.PI*Math.atan2(s,c)+r,cx:e.off[0]+(a[0]+o[0])/2,cy:e.off[1]+(a[1]+o[1])/2*n}}
function Po(e,t,n,r,i,a){let o=[],s=Math.sin(i),c=-Math.sin(a);return e.forEach((e,i)=>{let a=Go(e);if(!(e.wid>0)&&!a||!a&&e.pts.length<2)return;let l=i===0?-1:1,u=e.lidY||1,d=Math.cos(e.tilt||0),f=Math.sin(e.tilt||0),p=l*((yo/2+I(e.off[0]))*n)+s,m=c+I(e.off[1])*r,h=(e,n)=>{let r=e*d-n*f,i=e*f+n*d;return{x:p+l*r*t,y:m+i*t*u}};if(e.fillRing!=null&&e.fillRing.length>=3){let t=I(e.off[0]),n=I(e.off[1]);o.push(e.fillRing.map(([e,r])=>h(e-t,(r-n)*u)));return}if(a){let t=[];for(let n=0;n<wo;n++){let r=2*Math.PI*n/wo;t.push(h(e.oval[0]*Math.cos(r),e.oval[1]*u*Math.sin(r)))}o.push(t);return}let g=e.wid*t,_=e.path!=null&&e.path.length===Co?Io(e.path,h,g):Fo(e.pts.map(e=>h(e[0],e[1])),g);_.length>0&&o.push(_)}),o}
function Fo(e,t){let n=[];for(let t of e){let e=n.at(-1);(e==null||Math.hypot(t.x-e.x,t.y-e.y)>1e-6)&&n.push(t)}if(n.length===0||t<=0)return[];let r=zo(n,t);if(r!=null)return r;let i=n.length;if(i<2)return[];let a=[],o=[];for(let e=0;e<i;e++){let t=n[Math.max(0,e-1)],r=n[Math.min(i-1,e+1)],s=Math.hypot(r.x-t.x,r.y-t.y)||1,c=-(r.y-t.y)/s,l=(r.x-t.x)/s;e>0&&c*a[e-1]+l*o[e-1]<0&&(c=-c,l=-l),a.push(c),o.push(l)}return Lo(n,a,o,t,Wo(n[1].x-n[0].x,n[1].y-n[0].y),Wo(n[i-1].x-n[i-2].x,n[i-1].y-n[i-2].y))}
function Io(e,t,n){if(n<=0)return[];let r=[];for(let n=0;n<2;n++){let i=Bo(e,n),a=Vo(e,n,4),o=Vo(e,n+1,2),s=Bo(e,n+1);for(let e=n===0?0:1;e<So;e++){let n=e/10,c=Ho(i,a,o,s,n),l=Uo(i,a,o,s,n),u=t(c[0],c[1]),d=t(c[0]+l[0],c[1]+l[1]);r.push({x:u.x,y:u.y,tx:d.x-u.x,ty:d.y-u.y})}}let i=zo(r,n);if(i!=null)return i;let a=r.length,o=[],s=[];for(let e=0;e<a;e++){let t=Math.hypot(r[e].tx,r[e].ty)||1,n=-r[e].ty/t,i=r[e].tx/t;e>0&&n*o[e-1]+i*s[e-1]<0&&(n=-n,i=-i),o.push(n),s.push(i)}let c=r[0],l=r[a-1],u=Math.hypot(c.tx,c.ty)||1,d=Math.hypot(l.tx,l.ty)||1;return Lo(r,o,s,n,{x:c.tx/u,y:c.ty/u},{x:l.tx/d,y:l.ty/d})}
function Lo(e,t,n,r,i,a){let o=e.length,s=e.map((e,i)=>({x:e.x+t[i]*r,y:e.y+n[i]*r})),c=e.map((e,i)=>({x:e.x-t[i]*r,y:e.y-n[i]*r})),l={x:e[0].x-i.x*r,y:e[0].y-i.y*r},u={x:e[o-1].x+a.x*r,y:e[o-1].y+a.y*r};return[...s,...Ro(e[o-1],s[o-1],u,r),...[...c].reverse(),...Ro(e[0],c[0],l,r)]}
function Ro(e,t,n,r){let i=[],a=Math.atan2(t.y-e.y,t.x-e.x),o=Math.atan2(n.y-e.y,n.x-e.x)-a;for(;o>Math.PI;)o-=2*Math.PI;for(;o<-Math.PI;)o+=2*Math.PI;let s=o>=0?1:-1;for(let t=1;t<To;t++){let n=a+t/To*s*Math.PI;i.push({x:e.x+r*Math.cos(n),y:e.y+r*Math.sin(n)})}return i}
function zo(e,t){let n=0,r=0;for(let t of e)n+=t.x,r+=t.y;n/=e.length,r/=e.length;let i=0;for(let t of e)i=Math.max(i,Math.hypot(t.x-n,t.y-r));if(t<=i*1.05)return null;let a=[];for(let n=0;n<wo;n++){let r=2*Math.PI*n/wo,i=Math.cos(r),o=Math.sin(r),s=-1/0,c=0,l=0;for(let t of e){let e=t.x*i+t.y*o;e>s&&(s=e,c=t.x,l=t.y)}a.push({x:c+i*t,y:l+o*t})}return a}
function Bo(e,t){return[e[t*6],e[t*6+1]]}
function Vo(e,t,n){return[e[t*6]+e[t*6+n],e[t*6+1]+e[t*6+n+1]]}
function Ho(e,t,n,r,i){let a=1-i;return[a*a*a*e[0]+3*a*a*i*t[0]+3*a*i*i*n[0]+i*i*i*r[0],a*a*a*e[1]+3*a*a*i*t[1]+3*a*i*i*n[1]+i*i*i*r[1]]}
function Uo(e,t,n,r,i){let a=1-i;return[3*a*a*(t[0]-e[0])+6*a*i*(n[0]-t[0])+3*i*i*(r[0]-n[0]),3*a*a*(t[1]-e[1])+6*a*i*(n[1]-t[1])+3*i*i*(r[1]-n[1])]}
function Wo(e,t){let n=Math.hypot(e,t)||1;return{x:e/n,y:t/n}}
function Go(e){return e.oval[0]>1e-4&&e.oval[1]>1e-4}
function I(e,t=0){return Number.isFinite(e)?e:t}
var L=114.2705;
var os=[{x:.934475052698969,y:.004363180216799212},{x:.948891570423846,y:.039714756021395174},{x:.9608728659762679,y:.07607039935952659},{x:.9703302557200477,y:.11326502451357987},{x:.977189539605176,y:.15112675873557632},{x:.9813908922405818,y:.18947802927479046},{x:.9828887074578869,y:.2281365499571005},{x:.9816519990958227,y:.2669163757988432},{x:.9776625497902636,y:.30562830330137525},{x:.9709166586711733,y:.3440810419322467},{x:.9614266573440594,y:.3820827122339433},{x:.949221424670692,y:.41944230284893746},{x:.9343467338379507,y:.45597122804302315},{x:.9168643128164508,y:.49148439126889626},{x:.8968538338085426,y:.5258027955519334},{x:.8744135590875667,y:.5587560766363049},{x:.8496605481016927,y:.5901852347689388},{x:.8227287687893752,y:.6199442885313702},{x:.7937617531488526,y:.6478973166280976},{x:.762905919754175,y:.6739136951531549},{x:.7303134746505421,y:.6978700569784003},{x:.6961411032024281,y:.7196491755310737},{x:.6605596057818293,y:.7391502303914683},{x:.6237513457393834,y:.7562897143525837},{x:.5859073404691287,y:.7710015652906158},{x:.5472248974285161,y:.7832374824769789},{x:.507904865265839,y:.7929662862613107},{x:.4681494646643414,y:.8001734773422571},{x:.4281602030115182,y:.8048604074486263},{x:.38813613170852307,y:.8070434681543606},{x:.34827256966973696,y:.8067537475134688},{x:.3087597745583025,y:.8040363403785654},{x:.26978201344672026,y:.7989504065912386},{x:.23151662960878241,y:.7915694823366872},{x:.19413194481287305,y:.7819778247879767},{x:.1577852845947917,y:.7702630818507747},{x:.12262733079593371,y:.7565354795442158},{x:.08880015313138229,y:.7409422361214794},{x:.05642586889159421,y:.7236017950683938},{x:.02561647598492663,y:.704659966051552},{x:-.0036037810305528913,y:.6895105233164277},{x:-.03317542334906984,y:.7095400285365243},{x:-.06438496917371282,y:.7280864309789705},{x:-.0971349646590295,y:.7450166000084965},{x:-.13130575647382275,y:.7601465770772312},{x:-.16677330012669841,y:.7733777436363767},{x:-.20339569964825052,y:.7845796245158417},{x:-.24101725346433553,y:.7936313321637897},{x:-.27947704857143557,y:.8004456020397803},{x:-.3186049196302664,y:.8049436403918587},{x:-.35822225014656567,y:.8070572252942809},{x:-.398143514039767,y:.8067313311007664},{x:-.438177182680152,y:.8039242993502419},{x:-.478126841210925,y:.7986084072202804},{x:-.5177925726656645,y:.7907706714017452},{x:-.5569723963185897,y:.7804134068929688},{x:-.5954640748960385,y:.7675550146764192},{x:-.6330671972405764,y:.7522306880298593},{x:-.6695855487964426,y:.734492987733704},{x:-.7048299443180804,y:.714412410733904},{x:-.7386209319309059,y:.6920772477931056},{x:-.7707921245520308,y:.6675935661866239},{x:-.8011924150225685,y:.641083697347949},{x:-.8296683466506882,y:.612669941116809},{x:-.8560711521836232,y:.5824818706921402},{x:-.8802586099360401,y:.550657644865542},{x:-.9021016261853626,y:.5173474030319016},{x:-.921488351217944,y:.48271361643050537},{x:-.9383250626073236,y:.44692900756649523},{x:-.9525363976829352,y:.4101742582574272},{x:-.9640652637601566,y:.37263580242597466},{x:-.9728702117174652,y:.3345029815392968},{x:-.9789264673905609,y:.2959671170672982},{x:-.9822255348467005,y:.25722000690078245},{x:-.982774894246464,y:.21845258628445002},{x:-.9805967489497907,y:.17985349925722946},{x:-.9757258679433654,y:.1416078138454962},{x:-.9682107746348935,y:.1038965717106635},{x:-.9581143826889033,y:.06689596974801386},{x:-.9455146116784895,y:.03077634172969411},{x:-.9305051553319804,y:-.004299067407576291},{x:-.9131952327192244,y:-.038175545674491246},{x:-.8937019647378253,y:-.07070785611844921},{x:-.8721591451869681,y:-.10176130887451734},{x:-.8487362913086253,y:-.1312168064224554},{x:-.8236207468105732,y:-.15897343836917888},{x:-.7970979502287641,y:-.18497038865757742},{x:-.7710541733734617,y:-.2096139557882936},{x:-.7461193861529073,y:-.23320814197562353},{x:-.7221519248227056,y:-.2558870618710858},{x:-.6990265515010246,y:-.27776911859221876},{x:-.6766318459161248,y:-.29895980890191903},{x:-.6548676461286994,y:-.31955389248594185},{x:-.6336431338424889,y:-.3396372581810514},{x:-.6128753135059731,y:-.359288557412959},{x:-.5924873537443393,y:-.3785803988633805},{x:-.5724075923763201,y:-.3975806113171165},{x:-.5525683653066091,y:-.4163531831687479},{x:-.5329051623123328,y:-.43495923867716463},{x:-.5133556323648999,y:-.45345775659418885},{x:-.49385881021048816,y:-.47190633957419137},{x:-.4743544952965227,y:-.4903620705111528},{x:-.4547822689301765,y:-.5088820023697915},{x:-.43508096787875605,y:-.5275240823754965},{x:-.41518776564532156,y:-.5463477370262614},{x:-.39503744073179237,y:-.565414738403984},{x:-.37456138068841166,y:-.584789881188713},{x:-.3536868090571391,y:-.6045421927475639},{x:-.33233545822868515,y:-.6247456276706727},{x:-.31042247776931897,y:-.6454805113116225},{x:-.28785488995869934,y:-.6668347728530055},{x:-.26452992996104363,y:-.6889057008744045},{x:-.24032737271767535,y:-.7117848186103969},{x:-.21465925160321186,y:-.7340046463187382},{x:-.18703495679704094,y:-.7534714425430167},{x:-.15772553428835867,y:-.7700652053068575},{x:-.1270070450444056,y:-.7836711911119708},{x:-.0951684130469074,y:-.7942311382405959},{x:-.062495032850901626,y:-.8016579582061256},{x:-.02928242470209217,y:-.8059763869703366},{x:.00418250025635626,y:-.8071603933705995},{x:.03761179305139532,y:-.8051997052887491},{x:.07071763099568142,y:-.8001090083866196},{x:.10320959245128111,y:-.7918885098432591},{x:.134798677354145,y:-.7805799374564395},{x:.16519657722647352,y:-.7662371932046725},{x:.1941137081486192,y:-.748919054724023},{x:.22126182274327255,y:-.7287044591356419},{x:.24646172395988103,y:-.705992917688509},{x:.27042811605651085,y:-.6833113574191189},{x:.2935522498121435,y:-.6614269249128338},{x:.31594558408750634,y:-.6402340573221494},{x:.33770831010282365,y:-.6196380408622824},{x:.3589311734375708,y:-.5995528607013482},{x:.3796973337781967,y:-.579900027393222},{x:.40008347985475634,y:-.5606067493570983},{x:.4201613352275292,y:-.5416052696177914},{x:.4399985323371352,y:-.5228315569692281},{x:.4596595725296922,y:-.504224454308306},{x:.47920690986264164,y:-.4857251046289992},{x:.4987013585100146,y:-.46727574968264535},{x:.5182031792984406,y:-.44881937116377135},{x:.5377727619439542,y:-.4302988919363394},{x:.5574712942997964,y:-.41165639717445024},{x:.5773615598171413,y:-.39283243400856016},{x:.5975088031531646,y:-.3737652763272414},{x:.6179815681468954,y:-.3543900575947271},{x:.6388526754619042,y:-.3346378544777047},{x:.6602003073706015,y:-.3144346462096216},{x:.6821093031111911,y:-.2937001458611249},{x:.7046726622334125,y:-.2723464324690267},{x:.7279930725720649,y:-.25027624068777876},{x:.752199978996238,y:-.22738555814564856},{x:.7774207173704459,y:-.20355017023582161},{x:.8037647094696927,y:-.17862206250636986},{x:.8300422031017065,y:-.15219910918500412},{x:.8547554784773178,y:-.1240094996536292},{x:.8777124848745345,y:-.09414272665900433},{x:.8987592287763329,y:-.06270816362882596},{x:.9177264967761565,y:-.029827205842901418}];
var ss=Math.PI*2;
var R=e=>Math.round(e*100)/100;
var cs=(e,t,n)=>e<t?t:e>n?n:e;
var ls=class{d=``;move(e,t){return this.d+=`M${R(e)} ${R(t)}`,this}line(e,t){return this.d+=`L${R(e)} ${R(t)}`,this}curve(e,t,n,r,i,a){return this.d+=`C${R(e)} ${R(t)} ${R(n)} ${R(r)} ${R(i)} ${R(a)}`,this}corner(e,t,n,r){let i=(e,t)=>{let n=e[0]-t[0],r=e[1]-t[1],i=Math.hypot(n,r)||1;return[n/i,r/i]},a=i(e,t),o=i(n,t),s=[t[0]+a[0]*r,t[1]+a[1]*r],c=[t[0]+o[0]*r,t[1]+o[1]*r];return this.d?this.line(s[0],s[1]):this.move(s[0],s[1]),this.d+=`Q${R(t[0])} ${R(t[1])} ${R(c[0])} ${R(c[1])}`,this}arc(e,t,n,r,i,a){let o=Math.max(1,Math.ceil(Math.abs(a-i)/(Math.PI/2))),s=(a-i)/o,c=4/3*Math.tan(s/4),l=i;for(let i=0;i<o;i++){let i=l+s,a=[e+n*Math.cos(l),t+r*Math.sin(l)],o=[e+n*Math.cos(i),t+r*Math.sin(i)];this.curve(a[0]-c*n*Math.sin(l),a[1]+c*r*Math.cos(l),o[0]+c*n*Math.sin(i),o[1]-c*r*Math.cos(i),o[0],o[1]),l=i}return this}close(){return this.d+`Z`}};
var us=e=>{let t=e.length,n=`M${R(e[0][0])} ${R(e[0][1])}`;for(let r=0;r<t;r++){let i=e[(r-1+t)%t],a=e[r],o=e[(r+1)%t],s=e[(r+2)%t];n+=`C${R(a[0]+(o[0]-i[0])/6)} ${R(a[1]+(o[1]-i[1])/6)} ${R(o[0]-(s[0]-a[0])/6)} ${R(o[1]-(s[1]-a[1])/6)} ${R(o[0])} ${R(o[1])}`}return n+`Z`};
var ds=(e,t=128)=>{let n=[];for(let r=0;r<t;r++)n.push(e(r/t*ss));return us(n)};
var fs=(e,t)=>{let n=new ls,r=e.length;for(let i=0;i<r;i++){let a=typeof t==`number`?t:t[i%t.length];n.corner(e[(i-1+r)%r],e[i],e[(i+1)%r],a)}return n.close()};
var ps=(e,t,n,r=0)=>fs(Array.from({length:t},(n,i)=>{let a=r+i/t*ss;return[L+Math.cos(a)*e,L+Math.sin(a)*e]}),n);
var ms=(e,t=160)=>ds(t=>{let n=Math.cos(t),r=Math.sin(t),i=0;for(let[t,a,o]of e){let e=t-L,s=a-L,c=n*e+r*s,l=c*c-(e*e+s*s)+o*o;if(l<=0)continue;let u=c+Math.sqrt(l);u>i&&(i=u)}return[L+n*i,L+r*i]},t);
var hs=(e,t,n)=>ds(r=>{let i=Math.cos(r),a=Math.sin(r);return[L+Math.sign(i)*Math.abs(i)**(2/n)*e,L+Math.sign(a)*Math.abs(a)**(2/n)*t]});
var gs=(e,t)=>new ls().move(L-e+t,L-t).line(L+e-t,L-t).arc(L+e-t,L,t,t,-Math.PI/2,Math.PI/2).line(L-e+t,L+t).arc(L-e+t,L,t,t,Math.PI/2,Math.PI*3/2).close();
var _s=(e,t)=>new ls().move(L-e,L+t-e).line(L-e,L-t+e).arc(L,L-t+e,e,e,Math.PI,ss).line(L+e,L+t-e).arc(L,L+t-e,e,e,0,Math.PI).close();
var vs=(e,t,n)=>new ls().move(L-e,L-t+n).arc(L,L-t+n,e,n,Math.PI,ss).line(L+e,L+t-n).arc(L,L+t-n,e,n,0,Math.PI).close();
var ys=(e,t,n)=>{let r=L+t;return new ls().move(L-e,r-n).arc(L,r-n,e,2*t-n,Math.PI,ss).line(L+e,r-n).curve(L+e,r,L+e,r,L+e-n,r).line(L-e+n,r).curve(L-e,r,L-e,r,L-e,r-n).close()};
var bs=(e,t,n)=>{let r=L+t,i=L-t+e;return new ls().move(L-e,i).arc(L,i,e,e,Math.PI,ss).line(L+e,r-n).curve(L+e,r,L+e,r,L+e-n,r).line(L-e+n,r).curve(L-e,r,L-e,r,L-e,r-n).close()};
var xs=(e,t,n)=>{let r=L-t,i=L+t;return new ls().move(L-e,r+n).curve(L-e,r-2,L-e*.5,r-10,L,r-10).curve(L+e*.5,r-10,L+e,r-2,L+e,r+n).curve(L+e,L+t*.42,L+e*.62,i,L,i).curve(L-e*.62,i,L-e,L+t*.42,L-e,r+n).close()};
var Ss=(e,t,n)=>ds(r=>{let i=Math.cos(r),a=Math.sin(r),o=(1-a)/2;return[L+i*e*(1-n*o*o),L+a*t]});
var Cs=(e,t,n,r)=>{let i=cs(e/(n-t),-1,1),a=Math.sqrt(1-i*i),o=[L+e*a,n-e*i],s=[L-e*a,n-e*i],c=Math.atan2(o[1]-n,o[0]-L);return new ls().corner(o,[L,t],s,r).line(s[0],s[1]).arc(L,n,e,e,Math.PI-c,c).close()};
var ws=(e,t)=>fs([[L-e,L-e],[L+e,L-e],[L+e,L+e],[L-e,L+e]],t);
var Ts=(e,t,n,r)=>fs([[L-e,L+t],[L+e,L+t],[L+e,L-t+n],[L,L-t],[L-e,L-t+n]],r);
var Es=`M79.4511 11.5693C94.8767 -3.85636 119.887 -3.85622 135.312 11.5693C150.738 26.995 150.738 52.0049 135.312 67.4306L129.302 73.4404L129.303 73.4414L83.7724 118.972C81.8111 120.933 79.4309 122.22 76.9199 122.833C76.463 122.944 76.0018 123.034 75.538 123.101C74.1477 123.301 72.734 123.301 71.3437 123.101C70.8802 123.034 70.4194 122.944 69.9628 122.833C69.8486 122.805 69.7347 122.776 69.621 122.745C69.3938 122.684 69.1679 122.616 68.9433 122.544C67.4837 122.073 66.0831 121.367 64.8017 120.426C64.6047 120.281 64.4108 120.13 64.2197 119.975C63.837 119.662 63.466 119.328 63.1093 118.972L11.5693 67.4306C-3.85643 52.0049 -3.85642 26.995 11.5693 11.5693C26.995 -3.85643 52.0049 -3.85643 67.4306 11.5693L73.4404 17.579L79.4511 11.5693Z`;
var Ds=`M58.9438 9.25323C63.2492 -3.08441 80.6974 -3.08441 85.0027 9.25322L91.7612 28.6207C94.0136 35.0751 100.652 38.9078 107.368 37.6311L127.52 33.8004C140.357 31.3602 149.081 46.4708 140.549 56.3681L127.156 71.9049C122.692 77.0827 122.692 84.748 127.156 89.9258L140.549 105.463C149.081 115.36 140.357 130.471 127.52 128.03L107.368 124.2C100.652 122.923 94.0136 126.756 91.7612 133.21L85.0027 152.577C80.6974 164.915 63.2492 164.915 58.9438 152.577L52.1853 133.21C49.933 126.756 43.2946 122.923 36.5788 124.2L16.4268 128.03C3.58942 130.471 -5.1347 115.36 3.39733 105.463L16.7908 89.9258C21.2543 84.748 21.2543 77.0827 16.7908 71.9049L3.39734 56.3681C-5.13469 46.4708 3.58941 31.3602 16.4268 33.8004L36.5787 37.6311C43.2946 38.9078 49.933 35.0751 52.1853 28.6207L58.9438 9.25323Z`;
var Os=`M93.9365 0.100586C98.4439 -0.387322 102.691 0.897134 106.341 4.03418C111.502 8.47087 114.842 16.0545 116.636 25.2725C118.36 34.1341 118.716 44.8177 117.701 56.4346L117.707 56.4375L117.706 56.4443C122.25 58.5638 126.519 60.8171 130.449 63.168C130.485 63.1891 130.52 63.2103 130.556 63.2314C131.25 63.6478 131.934 64.067 132.607 64.4893C132.68 64.5349 132.753 64.5813 132.825 64.627C133.074 64.7838 133.322 64.941 133.567 65.0986C133.692 65.1787 133.816 65.2596 133.94 65.3398C134.138 65.4676 134.335 65.5954 134.53 65.7236C134.653 65.8039 134.775 65.8844 134.896 65.9648C135.112 66.1073 135.325 66.2506 135.538 66.3936C135.625 66.4522 135.713 66.5106 135.8 66.5693C138.866 68.645 141.667 70.7792 144.163 72.9502C149.754 77.8126 153.981 83.0002 156.136 88.2578C156.159 88.3133 156.181 88.3693 156.203 88.4248C156.268 88.5868 156.332 88.749 156.393 88.9111C156.435 89.0226 156.475 89.1346 156.516 89.2461C156.541 89.3175 156.566 89.3895 156.591 89.4609C157.443 91.8917 157.839 94.3199 157.696 96.7109C157.522 99.7997 156.469 102.655 154.613 105.192C154.236 105.709 153.826 106.208 153.388 106.692C153.365 106.717 153.343 106.742 153.32 106.767C153.171 106.93 153.019 107.091 152.863 107.25C152.844 107.27 152.824 107.29 152.804 107.311C152.3 107.822 151.762 108.316 151.191 108.79C151.168 108.81 151.144 108.83 151.12 108.85C150.952 108.988 150.781 109.125 150.607 109.261C150.558 109.299 150.509 109.337 150.46 109.375C150.282 109.512 150.101 109.648 149.917 109.781C149.903 109.792 149.888 109.801 149.874 109.812C149.255 110.26 148.605 110.689 147.926 111.1C147.795 111.179 147.662 111.256 147.528 111.334C147.41 111.403 147.292 111.473 147.173 111.541C146.915 111.687 146.653 111.832 146.388 111.974C146.316 112.012 146.243 112.047 146.171 112.085C145.978 112.186 145.783 112.287 145.586 112.386C145.459 112.449 145.331 112.511 145.203 112.573C145.048 112.649 144.891 112.723 144.733 112.797C144.614 112.853 144.494 112.909 144.373 112.964C144.198 113.044 144.021 113.122 143.843 113.2C143.722 113.253 143.6 113.306 143.478 113.358C143.288 113.439 143.096 113.519 142.903 113.598C142.836 113.625 142.769 113.655 142.701 113.683C142.662 113.698 142.622 113.712 142.583 113.728C142.371 113.812 142.156 113.895 141.94 113.978C141.847 114.013 141.753 114.051 141.658 114.086C140.71 114.441 139.731 114.771 138.725 115.078C138.613 115.112 138.502 115.145 138.39 115.179C138.257 115.218 138.123 115.26 137.989 115.299C137.911 115.322 137.831 115.343 137.752 115.365C137.61 115.406 137.467 115.446 137.324 115.485C137.095 115.549 136.863 115.611 136.63 115.672C136.52 115.701 136.41 115.73 136.3 115.759C136.064 115.819 135.827 115.879 135.588 115.938C135.451 115.971 135.314 116.004 135.177 116.037C134.975 116.085 134.772 116.131 134.568 116.178C134.312 116.236 134.054 116.294 133.795 116.35C133.535 116.406 133.274 116.461 133.011 116.515C132.85 116.547 132.688 116.578 132.525 116.61C132.333 116.648 132.14 116.686 131.946 116.723C131.689 116.771 131.43 116.818 131.17 116.864C131.075 116.881 130.979 116.898 130.884 116.914C130.595 116.964 130.304 117.012 130.012 117.06C129.932 117.073 129.851 117.085 129.771 117.098C129.484 117.143 129.196 117.188 128.906 117.23C128.818 117.243 128.729 117.256 128.641 117.269C127.33 117.457 125.983 117.62 124.601 117.755C124.468 117.768 124.336 117.782 124.203 117.794C123.92 117.82 123.636 117.845 123.351 117.869C123.24 117.878 123.13 117.888 123.02 117.897C122.701 117.923 122.381 117.948 122.059 117.971C121.967 117.977 121.874 117.984 121.782 117.99C121.463 118.012 121.143 118.033 120.82 118.053C120.73 118.058 120.639 118.063 120.549 118.068C119.546 118.126 118.527 118.171 117.492 118.202C117.322 118.207 117.151 118.213 116.979 118.218C116.785 118.223 116.59 118.225 116.395 118.229C116.147 118.235 115.899 118.24 115.65 118.244C115.415 118.248 115.178 118.25 114.94 118.252C114.688 118.254 114.435 118.256 114.181 118.257C114.008 118.257 113.835 118.257 113.662 118.257C113.32 118.256 112.976 118.255 112.631 118.252C112.503 118.251 112.375 118.25 112.247 118.248C111.858 118.243 111.466 118.237 111.073 118.229C110.984 118.227 110.894 118.226 110.804 118.224C107.734 118.154 104.558 117.977 101.289 117.69C96.3593 128.261 90.7082 137.338 84.7832 144.151C78.6204 151.238 71.9357 156.137 65.2471 157.399C60.5179 158.292 56.1975 157.281 52.5381 154.604C48.9431 151.975 46.1246 147.845 44.0479 142.691C40.0321 132.725 38.5457 118.333 40.043 101.281C40.0382 101.279 40.0331 101.277 40.0283 101.274C39.6986 101.121 39.3711 100.965 39.0449 100.811C38.8351 100.711 38.6254 100.612 38.417 100.512C38.0794 100.35 37.7438 100.186 37.4102 100.023C37.2392 99.9399 37.0684 99.8563 36.8984 99.7725C36.5886 99.6196 36.2801 99.4663 35.9736 99.3125C35.7564 99.2034 35.5398 99.0939 35.3242 98.9844C34.9817 98.8104 34.6409 98.636 34.3027 98.4609C34.2424 98.4297 34.1823 98.3975 34.1221 98.3662C19.2858 90.6566 8.70839 81.8767 3.56055 73.3232C3.50461 73.2303 3.44926 73.137 3.39453 73.0439C3.37308 73.0075 3.35134 72.971 3.33008 72.9346C3.19352 72.7003 3.06142 72.4652 2.93262 72.2305C2.19429 70.8865 1.58552 69.5375 1.11816 68.1895C1.10444 68.1499 1.09161 68.1099 1.07813 68.0703C1.04009 67.9586 1.00191 67.847 0.96582 67.7354C0.954674 67.7009 0.943578 67.6663 0.932617 67.6318C0.823298 67.2877 0.723275 66.9435 0.632813 66.5996C-0.103732 63.8123 -0.218301 61.0433 0.402344 58.3643C1.34437 54.2986 3.89972 50.7745 7.875 47.9023C7.90661 47.8794 7.93796 47.8559 7.96973 47.833C8.12646 47.7208 8.2852 47.6092 8.44629 47.499C8.57825 47.4084 8.71216 47.3194 8.84668 47.2305C8.87052 47.2148 8.89404 47.1983 8.91797 47.1826C10.608 46.0723 12.497 45.0908 14.5547 44.2324C14.6355 44.1986 14.7165 44.1643 14.7979 44.1309C14.8508 44.1092 14.9038 44.087 14.957 44.0654L15.25 43.9482C15.3501 43.9084 15.4509 43.8694 15.5518 43.8301C15.6093 43.8078 15.6668 43.7848 15.7246 43.7627C23.7646 40.6682 34.1765 39.3165 45.6846 39.4756C45.8574 39.4779 46.0307 39.4814 46.2041 39.4844C46.4305 39.4884 46.6576 39.4909 46.8848 39.4961C47.3568 39.5065 47.8313 39.5207 48.3076 39.5361C48.4142 39.5397 48.5212 39.5441 48.6279 39.5479C51.1795 39.6366 53.791 39.7967 56.4512 40.0293C63.6811 24.5137 72.1655 12.7934 80.627 6.1709C85.0025 2.74635 89.5085 0.57999 93.9365 0.100586Z`;
var ks=(e,t)=>ms([[L-e,L-e,t],[L+e,L-e,t],[L+e,L+e,t],[L-e,L+e,t]]);
var As=(e,t,n)=>ds(r=>{let i=Math.cos(r),a=Math.sin(r);return[L+i*e*Math.max(1-a*a,0)**(n/2-.5)*1,L+a*t]});
var js=(e,t,n,r)=>ds(i=>{let a=e=>{let t=Math.abs(((i-e+Math.PI)%ss+ss)%ss-Math.PI);return Math.exp(-(t*t)/.4232)},o=1-n*a(r)+n*.34*a(r+Math.PI);return[L+Math.cos(i)*e*o,L+Math.sin(i)*t*o]});
var Ms=(e,t,n)=>ds(r=>{let i=e*(1+t*(Math.sin(r*2+n)*.6+Math.sin(r*3-n)*.4));return[L+Math.cos(r)*i,L+Math.sin(r)*i*.98]});
var Ns=(e,t=4)=>{let n=e.match(/[MLCQZmlcqz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g)??[],r=[],i=0,a=``,o=0,s=0,c=0,l=0,u=()=>parseFloat(n[i++]),d=(e,n)=>{let i=Math.max(2,Math.ceil(n/t));for(let t=1;t<=i;t++)r.push(e(t/i))};for(;i<n.length;)if(/[a-z]/i.test(n[i])&&(a=n[i++].toUpperCase()),a===`Z`)Math.hypot(c-o,l-s)>.01&&d(e=>[o+(c-o)*e,s+(l-s)*e],Math.hypot(c-o,l-s)),o=c,s=l;else{if(i>=n.length)break;if(a===`M`)o=u(),s=u(),c=o,l=s,r.push([o,s]),a=`L`;else if(a===`L`){let e=u(),t=u();d(n=>[o+(e-o)*n,s+(t-s)*n],Math.hypot(e-o,t-s)),o=e,s=t}else if(a===`Q`){let e=u(),t=u(),n=u(),r=u(),i=o,a=s;d(o=>{let s=1-o;return[s*s*i+2*s*o*e+o*o*n,s*s*a+2*s*o*t+o*o*r]},Math.hypot(e-o,t-s)+Math.hypot(n-e,r-t)),o=n,s=r}else{let e=u(),t=u(),n=u(),r=u(),i=u(),a=u(),c=o,l=s;d(o=>{let s=1-o;return[s*s*s*c+3*s*s*o*e+3*s*o*o*n+o*o*o*i,s*s*s*l+3*s*s*o*t+3*s*o*o*r+o*o*o*a]},Math.hypot(e-o,t-s)+Math.hypot(n-e,r-t)+Math.hypot(i-n,a-r)),o=i,s=a}}return r};
var Ps=(e,t=160)=>{let n=1/0,r=-1/0;for(let t of e)t[1]<n&&(n=t[1]),t[1]>r&&(r=t[1]);let i=r-n,a=e=>n+i*(e+.5)/t,o=new Float64Array(t),s=new Float64Array(t),c=new Float64Array(t),l=new Float64Array(t);for(let n=0;n<t;n++){let t=a(n),r=-1/0,i=1/0,u=1/0,d=-1/0;for(let n=0;n<e.length;n++){let a=e[n],o=e[(n+1)%e.length];if(a[1]<=t==o[1]<=t)continue;let s=a[0]+(o[0]-a[0])*(t-a[1])/(o[1]-a[1]);s<=114.2705?s>r&&(r=s):s<i&&(i=s),s<u&&(u=s),s>d&&(d=s)}o[n]=Number.isFinite(r)?r:L,s[n]=Number.isFinite(i)?i:L,c[n]=Number.isFinite(u)?u:L,l[n]=Number.isFinite(d)?d:L}let u=(e,r)=>a=>{let o=cs((a-n)/i*t-.5,0,t-1),s=Math.floor(o),c=o-s,l=Math.min(s+1,t-1);return[e[s]+(e[l]-e[s])*c,r[s]+(r[l]-r[s])*c]};return{top:n,bottom:r,spanAt:u(o,s),outerAt:u(c,l)}};
var Fs=96;
var Is=e=>Array.from({length:Fs},(t,n)=>{let r=n/Fs*ss,i=Math.cos(r),a=Math.sin(r),o=0;for(let t=0;t<e.length;t++){let n=e[t],r=e[(t+1)%e.length],s=n[0]-L,c=n[1]-L,l=r[0]-L,u=r[1]-L,d=(l-s)*a-(u-c)*i;if(Math.abs(d)<1e-9)continue;let f=(s*a-c*i)/-d;if(f<0||f>1)continue;let p=(s+(l-s)*f)*i+(c+(u-c)*f)*a;p>o&&(o=p)}return[L+i*o,L+a*o]});
var Ls=(e,t,n,r)=>{let i=0;return e.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi,e=>{i^=1;let a=parseFloat(e)+(i?n:r);return String(R(L+(a-L)*t))})};
var Rs=228.44;
var zs=e=>{let t=1/0,n=-1/0,r=1/0,i=-1/0;for(let a of e)a[0]<t&&(t=a[0]),a[0]>n&&(n=a[0]),a[1]<r&&(r=a[1]),a[1]>i&&(i=a[1]);let a=L-(t+n)/2,o=L-(r+i)/2;return{k:cs(Rs/Math.max(n-t,i-r),.9,1.35),dx:a,dy:o}};
var Bs=(e,t)=>{let{k:n,dx:r,dy:i}=zs(t);return Math.abs(n-1)<.005&&Math.abs(r)<.5&&Math.abs(i)<.5?e:Ls(e,n,r,i)};
var Vs=e=>{let t=Bs(e,Ns(e)),n=Ns(t),{top:r,bottom:i,spanAt:a,outerAt:o}=Ps(n),s=0;for(let e=r;e<=i;e+=2){let[t,n]=o(e);s=Math.max(s,(n-t)/2)}return{path:t,ring:Is(n),top:R(r),bottom:R(i),spanAt:a,beltRadius:R(s)}};
var Hs={pebble:()=>Ms(108,.075,1.1),bean:()=>js(94,112,.34,Math.PI),egg:()=>Ss(98,113,.22),squircle:()=>hs(107,107,3.2),square:()=>ws(107,28),tablet:()=>gs(114,74),capsule:()=>_s(72,113),cylinder:()=>vs(94,110,48),hex:()=>ps(114,6,20,Math.PI/6),gem:()=>hs(112,113,1.5),shield:()=>xs(98,108,30),dome:()=>ys(114,82,26),arch:()=>bs(76,113,42),cloud:()=>ms([[L-62,L+26,56],[L+62,L+26,54],[L,L+34,62],[L-24,L-30,62],[L+38,L-26,54]]),leaf:()=>As(88,113,1.5),clover:()=>ks(38,58),house:()=>Ts(100,110,78,29),heart:()=>Es,sparkle:()=>Os,star6:()=>Ds};
var Us=new Map;
function Ws(e){let t=Us.get(e);if(t!=null)return t;let n=Vs(Hs[e]());return Us.set(e,n),n}
var z=(e,t=4)=>Ns(Ws(e).path,t);
var Gs=e=>Ns(e);
var Ks=(e,t)=>Vs(Cs(e,L-114,L+26,t));
var qs=(e,t)=>Vs(ps(130,3,[t,e,e],-Math.PI/2));
var Js=Math.PI*2;
var Ys=.36;
var Xs=.22;
var Zs=4;
var Qs=1e-12;
var $s=64;
var ec=33;
var tc=40;
var nc=.72;
var rc=16;
var ic=160;
var ac=180;
var oc=64;
var sc=1e-5;
var cc={pebble:()=>hc(1.2167999999999999,`pebble`),bean:()=>{let e=Fc(`bean`);return{size:1.17,silhouette:{kind:`solid`,samples:[],balls:e,isLoop:!1,yawPeriod:null},seat:xc(`bean`,e)}},egg:()=>hc(1.17,`egg`),squircle:()=>({size:1.17,silhouette:pc(Tc(`squircle`,.28,.11)),seat:{kind:`front`,faceZ:.28}}),tablet:()=>{let{x0:e,x1:t,y0:n,y1:r}=wc(`tablet`),i=(t-e)/2/L,a=(r-n)/2/L,o=Math.max(0,i-a);return{size:1.3922999999999999,silhouette:{kind:`solid`,samples:[],balls:Nc(`tablet`,`x`),isLoop:!1,yawPeriod:null},seat:{kind:`wrapX`,wrapR:a,wrapX0:-i+.02,wrapX1:i-.02,radiusAtX:e=>{let t=Math.abs(e)-o;return t<=0?a:Math.sqrt(Math.max(0,a*a-t*t))}}}},capsule:()=>{let e=Nc(`capsule`,`y`),{y0:t,y1:n}=wc(`capsule`),r=-(n-L)/L,i=-(t-L)/L,{hx:a,hz:o}=Pc(e);return{size:1.17,silhouette:{kind:`solid`,samples:[],balls:e,isLoop:!1,yawPeriod:null},seat:{kind:`wrap`,wrapR:Math.max(.35,(a+o)*.5),wrapY0:r,wrapY1:i,eyeY:(r+i)*.5}}},cylinder:()=>gc(`cylinder`,(e,t)=>(t+e)*.5),hex:()=>_c(1.2519,Cc(z(`hex`))),gem:()=>hc(1.17,`gem`),crystal:()=>({size:1.3805999999999998,silhouette:pc(Ec()),seat:{kind:`front`,faceZ:Math.sqrt(3)/2*.64}}),wedge:()=>{let e=qs(60,80),t=Gs(e.path),[n,r]=e.spanAt(e.top+(e.bottom-e.top)*.5),i=-(e.top-L)/L,a=-(e.bottom-L)/L;return{size:1.3590719999999998,silhouette:mc(kc(t)),seat:{kind:`wrap`,wrapR:Math.max(.2,(r-n)/2/L),wrapY0:a,wrapY1:i,eyeY:i+(a-i)*.5,radiusAt:Mc(t)}}},shield:()=>hc(1.17,`shield`),dome:()=>hc(1.17,`dome`),arch:()=>gc(`arch`,(e,t)=>e+(t-e)*.42),cloud:()=>bc(1.3455,Cc(z(`cloud`,1)),.72),teardrop:()=>{let e=Ks(88,48),t=Gs(e.path),[n,r]=e.spanAt(e.top+(e.bottom-e.top)*.62),i=-(e.bottom-L)/L,a=-(e.top-L)/L;return{size:1.318122,silhouette:mc(kc(t)),seat:{kind:`wrap`,wrapR:Math.max(.2,(r-n)/2/L),wrapY0:i,wrapY1:a,eyeY:(i+a)*.5,radiusAt:Mc(t)}}},leaf:()=>hc(1.17,`leaf`),square:()=>_c(1.0413,Cc(z(`square`))),starFlower:()=>_c(1.3922999999999999,Lc()),sparkle:()=>_c(1.521,Cc(z(`sparkle`))),clover:()=>_c(1.0881,Cc(z(`clover`))),heartChubby:()=>bc(1.3571999999999997,os,.62),house:()=>_c(1.17,Cc(z(`house`))),star6:()=>vc(1.4976,Cc(z(`star6`)),.3,.18)};
var lc=new Map;
function dc(e){let t=lc.get(e);if(t!=null)return t;let n=cc[e]();return lc.set(e,n),n}
function pc(e){return{kind:`solid`,samples:e,balls:[],isLoop:!1,yawPeriod:null}}
function mc(e){return{kind:`solid`,samples:e,balls:[],isLoop:!1,yawPeriod:360/$s}}
function hc(e,t){return{size:e,silhouette:mc(Oc(t)),seat:xc(t,[])}}
function gc(e,t){let n=Ws(e),r=-(n.top-L)/L,i=-(n.bottom-L)/L;return{size:1.17,silhouette:mc(Oc(e)),seat:{kind:`wrap`,wrapR:n.beltRadius/L,wrapY0:i,wrapY1:r,eyeY:t(r,i),radiusAt:jc(e)}}}
function _c(e,t){return vc(e,t,Ys,Xs)}
function vc(e,t,n,r){return{size:e,silhouette:{kind:`extrusion`,rings:Ic(t,n,r),isConvex:yc(t)},seat:{kind:`front`,faceZ:n}}}
function yc(e){let t=0;for(let n=0;n<e.length;n++){let r=e[n],i=e[(n+1)%e.length],a=e[(n+2)%e.length],o=(i.x-r.x)*(a.y-i.y)-(i.y-r.y)*(a.x-i.x);if(!(Math.abs(o)<Qs)){if(t===0)t=Math.sign(o);else if(Math.sign(o)!==t)return!1}}return!0}
function bc(e,t,n){let r=Rc(t,n);return{size:e,silhouette:{kind:`loft`,rings:r.rings},seat:{kind:`loft`,surfaceZ:zc(r)}}}
function xc(e,t){let n=Ws(e),r=-(n.bottom-L)/L,i=-(n.top-L)/L,a=jc(e),o=Math.min(i-.02,Math.max(r+.02,0));return{kind:`wrap`,wrapR:a(o),wrapY0:r,wrapY1:i,eyeY:o,radiusAt:a,puffAt:t.length>0?(e,n)=>Sc(t,e,n):void 0}}
function Sc(e,t,n){let r=e[0],i=-1/0,a=1/0,o=!1;for(let s of e){let e=Math.hypot(t-s[0],n-s[1]);if(e<s[3]){let t=s[2]+Math.sqrt(s[3]*s[3]-e*e);(!o||t>i)&&(o=!0,i=t,r=s)}else!o&&e-s[3]<a&&(a=e-s[3],r=s)}return{x:r[0],y:r[1],z:r[2],r:r[3]}}
function Cc(e){return e.map(([e,t])=>({x:(e-L)/L,y:-(t-L)/L,z:0}))}
function wc(e){let t=1/0,n=-1/0,r=1/0,i=-1/0;for(let[a,o]of Ws(e).ring)a<t&&(t=a),a>n&&(n=a),o<r&&(r=o),o>i&&(i=o);return{x0:t,x1:n,y0:r,y1:i}}
function Tc(e,t,n){let r=Ws(e).ring.map(([e,t])=>({x:(e-L)/L,y:-(t-L)/L})),i=r.length,a=[];for(let e=0;e<i;e++){let o=r[e],s=r[(e-1+i)%i],c=r[(e+1)%i],l=c.y-s.y,u=-(c.x-s.x),d=Math.hypot(l,u)||1;l/=d,u/=d,l*o.x+u*o.y<0&&(l=-l,u=-u);for(let e=0;e<=Zs;e++){let r=e/Zs*(Math.PI/2),i=n*(1-Math.cos(r)),s=t-n+n*Math.sin(r);a.push({x:o.x-l*i,y:o.y-u*i,z:s}),a.push({x:o.x-l*i,y:o.y-u*i,z:-s})}}return a}
function Ec(){let e=.12,t=[{x:0,y:1.04,z:0},{x:0,y:-1.04,z:0}],n=.52;for(let e of[-1,1])for(let r=0;r<6;r++){let i=r/6*Js;t.push({x:n*Math.cos(i),y:e*.51,z:n*Math.sin(i)})}let r=[];for(let n of t)for(let t=0;t<=8;t++){let i=t/8*Math.PI,a=Math.sin(i),o=t===0||t===8?1:14;for(let t=0;t<o;t++){let s=t/o*Js;r.push({x:n.x+e*a*Math.sin(s),y:n.y+e*Math.cos(i),z:n.z+e*a*Math.cos(s)})}}return r}
function Dc(e){let t=e.length,n=1/0,r=-1/0;for(let[,t]of e)t<n&&(n=t),t>r&&(r=t);n-=sc,r+=sc;let i=e=>Math.min(63,Math.floor((e-n)/(r-n)*oc)),a=Array.from({length:oc},()=>[]);for(let n=0;n<t;n++){let r=e[n][1],o=e[(n+1)%t][1],s=i(Math.max(r,o)+sc);for(let e=i(Math.min(r,o)-sc);e<=s;e++)a[e].push(n)}return o=>{let s=1/0,c=-1/0;if(!(o>=n&&o<=r))return c-s;for(let n of a[i(o)]){let[r,i]=e[n],[a,l]=e[(n+1)%t];if(Math.abs(l-i)<1e-9)Math.abs(i-o)<1e-6&&(s=Math.min(s,r,a),c=Math.max(c,r,a));else if(i<=o&&l>=o||l<=o&&i>=o){let e=r+(a-r)*(o-i)/(l-i);e<s&&(s=e),e>c&&(c=e)}}return c-s}}
function Oc(e){return kc(z(e))}
function kc(e){let t=1/0,n=-1/0;for(let[,r]of e)r<t&&(t=r),r>n&&(n=r);let r=[],i=-(t-L)/L,a=-(n-L)/L,o=Dc(e),s=e=>{let t=o(e);return t<0?0:t/2/L},c=n-t,l=(e,t)=>{if(s(e)>=.06)return null;let n=s(e),r=c*.02;for(let i=c/512;i<=c*.05;i+=c/512)if(Math.abs(s(e+t*i)-n)>1e-4){r=i;break}return{yEdge:e,sign:t,dJoin:r,rJoin:s(e+t*r)}},u=[l(t,1),l(n,-1)].filter(e=>e!==null),d=e=>{let t=s(e);for(let n of u){let r=(e-n.yEdge)*n.sign;r>=0&&r<n.dJoin&&(t=Math.min(t,n.rJoin*Math.sqrt(r/n.dJoin)))}return t},f=(e,t)=>{let n=d(t);n<.06?r.push({x:0,y:e,z:0}):r.push(...Ac(e,n))};f(i,t);for(let e=1;e<95;e++){let i=(1-Math.cos(e/95*Math.PI))/2,a=t+(n-t)*i,o=d(a),s=-(a-L)/L;o<1e-4?r.push({x:0,y:s,z:0}):r.push(...Ac(s,o))}return f(a,n),r}
function Ac(e,t){let n=[];for(let r=0;r<$s;r++){let i=r/$s*Js;n.push({x:t*Math.sin(i),y:e,z:t*Math.cos(i)})}return n}
function jc(e){return Mc(z(e))}
function Mc(e){let t=Dc(e),n=1/0,r=-1/0;for(let[,t]of e)t<n&&(n=t),t>r&&(r=t);return e=>{let i=Math.max(n,Math.min(r,L-e*L));return Math.max(.02,t(i)/2/L)}}
function Nc(e,t){let{x0:n,x1:r,y0:i,y1:a}=wc(e),o=(r-n)/2/L,s=(a-i)/2/L,c=t===`x`?s:o,l=Math.max(0,(t===`x`?o:s)-c),u=-l,d=[];for(let e=0;e<ec;e++){let n=u+(l-u)*(e/32);d.push(t===`x`?[n,0,0,c]:[0,n,0,c])}return d}
function Pc(e){let t=.55,n=.35;for(let[r,,i,a]of e)t=Math.max(t,Math.abs(r)+a),n=Math.max(n,Math.abs(i)+a);return{hx:t,hz:n}}
function Fc(e){let t=z(e),n=1/0,r=-1/0,i=1/0,a=-1/0;for(let[e,o]of t)n=Math.min(n,e),r=Math.max(r,e),i=Math.min(i,o),a=Math.max(a,o);let o=(e,n)=>{let r=!1,i=t.length;for(let a=0,o=i-1;a<i;o=a++){let[i,s]=t[a],[c,l]=t[o];s>n!=l>n&&e<i+(c-i)*(n-s)/(l-s)&&(r=!r)}return r},s=Math.max(r-n,a-i)/tc,c=[];for(let e=i+s/2;e<a;e+=s)for(let i=n+s/2;i<r;i+=s){if(!o(i,e))continue;let n=1/0;for(let[r,a]of t)n=Math.min(n,(r-i)**2+(a-e)**2);let r=Math.sqrt(n);r>s&&c.push({x:i,y:e,r})}c.sort((e,t)=>t.r-e.r);let l=[];for(let e of c)l.some(t=>Math.hypot(e.x-t.x,e.y-t.y)+e.r<=t.r+s*.25)||l.push(e);return l.map(e=>[(e.x-L)/L,-(e.y-L)/L,0,e.r/L])}
function Ic(e,t,n){let r=1/0,i=-1/0,a=1/0,o=-1/0;for(let t of e)r=Math.min(r,t.x),i=Math.max(i,t.x),a=Math.min(a,t.y),o=Math.max(o,t.y);let s=(r+i)/2,c=(a+o)/2,l=Math.max(1e-4,Math.min((i-r)/2,(o-a)/2)),u=(e,r)=>{let i=e/Zs*(Math.PI/2),a=t-n+n*Math.sin(i);return{z:r<0?-a:a,scale:1-n/l*(1-Math.cos(i))}},d=[];for(let e=Zs;e>=0;e--)d.push(u(e,-1));for(let e=0;e<=Zs;e++)d.push(u(e,1));return d.map(({z:t,scale:n})=>e.map(e=>({x:s+(e.x-s)*n,y:c+(e.y-c)*n,z:t})))}
function Lc(){let e=.58,t=[{x:0,y:0,r:.36}];for(let n=0;n<6;n++){let r=-Math.PI/2+n*Js/6;t.push({x:e*Math.cos(r),y:e*Math.sin(r),r:.33})}let n=[];for(let e=0;e<240;e++){let r=e/240*Js,i=Math.cos(r),a=Math.sin(r),o=0,s=.9099999999999999;for(let e=0;e<22;e++){let e=(o+s)/2,n=e*i,r=e*a;t.some(e=>(n-e.x)*(n-e.x)+(r-e.y)*(r-e.y)<=e.r*e.r)?o=e:s=e}n.push({x:o*i,y:o*a,z:0})}return n}
function Rc(e,t){let n=e.length/ic,r=n>1?Array.from({length:ic},(t,r)=>e[Math.floor(r*n)]):e,i=1/0,a=-1/0,o=1/0,s=-1/0;for(let e of r)i=Math.min(i,e.x),a=Math.max(a,e.x),o=Math.min(o,e.y),s=Math.max(s,e.y);let c={x:(i+a)/2,y:(o+s)/2},l=[];for(let e=0;e<=rc;e++){let n=-Math.PI/2+Math.PI*e/rc,i=Math.max(0,Math.cos(n))**+nc,a=t*Math.sin(n);l.push(r.map(e=>({x:c.x+(e.x-c.x)*i,y:c.y+(e.y-c.y)*i,z:a})))}return{rings:l,center:c,depth:t}}
function zc({rings:e,center:t,depth:n}){let r=e[Math.floor(e.length/2)],i=new Float64Array(ac);for(let e=0;e<ac;e++){let n=(e+.5)/ac*Math.PI*2,a=Math.cos(n),o=Math.sin(n),s=0;for(let e=0;e<r.length;e++){let n=r[e],i=r[(e+1)%r.length],c=i.x-n.x,l=i.y-n.y,u=a*l-o*c;if(Math.abs(u)<1e-9)continue;let d=n.x-t.x,f=n.y-t.y,p=(d*l-f*c)/u,m=(d*o-f*a)/u;p>s&&m>=0&&m<=1&&(s=p)}i[e]=s}let a=(e,n)=>{let r=e-t.x,a=n-t.y,o=Math.hypot(r,a);if(o<1e-8)return 0;let s=(Math.atan2(a,r)+Math.PI*2)%(Math.PI*2)/(Math.PI*2)*ac,c=Math.floor(s)%ac,l=s-Math.floor(s),u=i[c],d=i[(c+1)%ac];return Math.min(1,o/Math.max(1e-8,u*(1-l)+d*l))};return(e,t)=>n*Math.sqrt(Math.max(0,1-a(e,t)**(2/nc)))}
var Bc=Math.PI*2;
var Vc=.2;
var Hc=.36;
var Uc=1.18;
var Wc=160;
var B=480;
var Gc=Zc(Wc);
var Kc=Zc(B);
var qc=1.01;
var Jc=1e-5;
var Yc=.01;
var Xc=8;
function Zc(e){return Array.from({length:e},(t,n)=>{let r=n/e*Bc;return{x:Math.cos(r),y:Math.sin(r)}})}
function Qc(e,t){return Math.max(Vc,e.size)*(Hc*t/Uc)}
function $c(e,t,n){return ol(e.silhouette,nl(e,t,n)).flatMap(al)}
function el(e,t,n){let r=e.silhouette;if(r.kind!==`extrusion`||!r.isConvex)return $c(e,t,n);let{project:i}=nl(e,t,n);return al(cl(r.rings.flat().map(i)))}
function tl(e,t,n,r){return e.seat==null?[]:dl(e.seat,r,nl(e,t,n)).flatMap(al)}
function nl(e,t,n){let r=n/2,i=Qc(e,n),a=rl(t.yaw*Math.PI/180,t.pitch*Math.PI/180,t.roll*Math.PI/180);return{rotate:a,project:e=>{let t=a(e);return{x:r+i*t.x,y:r-i*t.y}},origin:{x:r,y:r},radius:i}}
function rl(e,t,n){let[r,i,a]=il(e),[o,s,c]=il(t),[l,u,d]=il(n);return({x:e,y:t,z:n})=>{let f=e*r+n*i,p=t*r+t*a,m=n*r-e*i,h=f*o+f*c,g=p*o-m*s,_=m*o+p*s;return{x:h*l-g*u,y:g*l+h*u,z:_*l+_*d}}}
function il(e){let t=Math.cos(e);return[t,Math.sin(e),1-t]}
function al(e){let[t]=e;if(e.length<2||!Number.isFinite(t.x)||!Number.isFinite(t.y))return[];let n=[];for(let t of e)Number.isFinite(t.x)&&Number.isFinite(t.y)&&n.push(t.x,t.y);return n.length>=6?[n]:[]}
function ol(e,t){if(e.kind===`loft`)return[ul(e.rings,t)];if(e.kind===`solid`)return[sl(e,t)];let n=e.rings.map(e=>e.map(t.project)),r=n[0],i=n[n.length-1],a=[i,r];for(let e=1;e<n.length;e++){let t=n[e-1],r=n[e];for(let e=0;e<r.length;e++){let n=(e+1)%i.length;a.push([t[e],t[n],r[n],r[e]])}}return a}
function sl(e,{project:t,origin:n,radius:r}){let i=[];for(let n of e.samples){let e=t(n);Number.isFinite(e.x)&&Number.isFinite(e.y)&&i.push(e)}if(e.isLoop)return i;if(e.balls.length===0)return cl(i);let a=e.balls.map(([e,n,i,a])=>({...t({x:e,y:n,z:i}),r:a*r})).filter(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&e.r>1e-6),o=n.x,s=n.y;if(a.length>0){o=0,s=0;for(let e of a)o+=e.x,s+=e.y;o/=a.length,s/=a.length}for(let{x:e,y:t}of Gc){let n=0;for(let r of a){let i=r.x-o,a=r.y-s,c=e*i+t*a,l=c*c-(i*i+a*a)+r.r*r.r;if(l<=0)continue;let u=c+Math.sqrt(l);u>n&&(n=u)}n>0&&i.push({x:o+e*n,y:s+t*n})}if(e.samples.length>0)return cl(i);if(i.length>=3)return i;for(let e of a)for(let t=0;t<48;t++){let n=t/48*Bc;i.push({x:e.x+e.r*Math.cos(n),y:e.y+e.r*Math.sin(n)})}return i.length>=3?cl(i):i}
function cl(e){let t=ll(e.filter(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)));if(t.length<3)return t;let n=(e,t,n)=>(t.x-e.x)*(n.y-e.y)-(t.y-e.y)*(n.x-e.x),r=[];for(let e of t){for(;r.length>=2&&n(r[r.length-2],r[r.length-1],e)<=0;)r.pop();r.push(e)}let i=[];for(let e=t.length-1;e>=0;e--){let r=t[e];for(;i.length>=2&&n(i[i.length-2],i[i.length-1],r)<=0;)i.pop();i.push(r)}return r.pop(),i.pop(),[...r,...i]}
function ll(e){let t=1/0,n=-1/0;for(let{x:r}of e)r<t&&(t=r),r>n&&(n=r);let r=Math.ceil(e.length/Xc),i=n>t?r/(n-t):0,a=e=>Math.min(r-1,Math.floor((e-t)*i)),o=new Int32Array(r+1);for(let{x:t}of e)o[a(t)+1]++;for(let e=0;e<r;e++)o[e+1]+=o[e];let s=o.slice(0,r),c=Array(e.length);for(let t of e)c[s[a(t.x)]++]=t;for(let e=0;e<r;e++)for(let t=o[e]+1;t<o[e+1];t++){let n=c[t],r=t-1;for(;r>=o[e]&&(c[r].x>n.x||c[r].x===n.x&&c[r].y>n.y);r--)c[r+1]=c[r];c[r+1]=n}return c}
function ul(e,{project:t,origin:n}){let r=e.map(e=>e.map(t)),i=e=>{let t=0,n=0;for(let r of e)t+=r.x,n+=r.y;return{x:t/e.length,y:n/e.length}},a=i(r[0]),o=i(r[r.length-1]);if(Math.hypot(o.x-a.x,o.y-a.y)<1e-4){let e=r[0],t=0;for(let n of r){let r=0;for(let e=0;e<n.length;e++){let t=n[e],i=n[(e+1)%n.length];r+=t.x*i.y-i.x*t.y}Math.abs(r)>t&&(e=n,t=Math.abs(r))}return e}let s=r.map(e=>e.map(({x:e,y:t})=>(e-n.x)*(e-n.x)+(t-n.y)*(t-n.y))),c=s.map(e=>Math.max(...e)),l=Jc*Math.max(...c)+Yc,u=(e,t)=>{let n=(t-l)/qc;return n>0&&e<n*n},d=r.map(e=>e.map(e=>{let t=(Math.atan2(e.y-n.y,e.x-n.x)+Bc)%Bc;return Math.floor(t/Bc*B)%B})),f=new Float64Array(B),p=0,m=(e,t,r,i,a)=>{if(u(a,p))return;let o=i-r;o>B/2?o-=B:o<-240&&(o+=B);let s=o<0?-1:1,c=Math.abs(o),l=1/0;for(let e=-1;e<=c+1;e++){let t=(r+s*e+B)%B;f[t]<l&&(l=f[t])}if(u(a,l))return;let d=t.x-e.x,m=t.y-e.y,h=e.x-n.x,g=e.y-n.y;for(let e=-1;e<=c+1;e++){let t=(r+s*e+B)%B,{x:n,y:i}=Kc[t],a=n*m-i*d;if(Math.abs(a)<1e-9)continue;let o=(h*m-g*d)/a,c=(h*i-g*n)/a;o>f[t]&&c>=0&&c<=1&&(f[t]=o)}},h=c.map((e,t)=>t).sort((e,t)=>c[t]-c[e]);for(let e of h){let t=r[e];for(let n=0;n<t.length;n++){let r=(n+1)%t.length;m(t[n],t[r],d[e][n],d[e][r],Math.max(s[e][n],s[e][r]))}p=Math.min(...f)}for(let e=0;e<r.length-1;e++){let t=r[e],n=r[e+1];for(let r=0;r<Math.min(t.length,n.length);r++)m(t[r],n[r],d[e][r],d[e+1][r],Math.max(s[e][r],s[e+1][r]))}return Kc.flatMap(({x:e,y:t},r)=>f[r]>0?[{x:n.x+e*f[r],y:n.y+t*f[r]}]:[])}
function dl(e,t,n){switch(e.kind){case`front`:return fl(e.faceZ,t,n);case`loft`:return pl(e.surfaceZ,t,n);case`wrap`:return ml(e,t,n);case`wrapX`:return hl(e,t,n);default:throw Error(`Unhandled case`)}}
function fl(e,{loops:t,shiftY:n},r){if(!(r.rotate({x:0,y:0,z:1}).z>.03))return[];let i=Math.sin(n);return t.filter(e=>e.length>=3).map(t=>t.map(t=>r.project({x:t.x,y:t.y-i,z:e})))}
function pl(e,{loops:t,shiftY:n},{rotate:r,project:i}){if(!(r({x:0,y:0,z:1}).z>=.05))return[];let a=Math.sin(n),o=[];for(let n of t){if(n.length<3)continue;let t=n.map(e=>({x:e.x,y:e.y-a})),s=0,c=0;for(let e of t)s+=e.x,c+=e.y;s/=t.length,c/=t.length;let l=.004,u=(e(s+l,c)-e(s-l,c))/(2*l),d=(e(s,c+l)-e(s,c-l))/(2*l),f=Math.hypot(u,d,1);if(r({x:-u/f,y:-d/f,z:1/f}).z<.12)continue;let p=e(s,c);o.push(t.map(e=>i({x:e.x,y:e.y,z:p+(e.x-s)*u+(e.y-c)*d})))}return o}
function ml(e,{loops:t,shiftY:n},{rotate:r,project:i}){let{wrapR:a,wrapY0:o,wrapY1:s,radiusAt:c,puffAt:l}=e,u=c?.02:.06,d=Math.min(s-u,Math.max(o+u,e.eyeY-n)),f=e=>Math.min(s,Math.max(o,e)),p=e=>{let t=[];for(let n of e){let e=f(d+n.y),l=c?c(e):a,u=Math.max(-2.6,Math.min(2.6,n.x/Math.max(.12,l))),p=0;if(c){let t=.012;p=-(c(Math.min(s,e+t))-c(Math.max(o,e-t)))/(2*t)}r({x:Math.sin(u),y:p,z:Math.cos(u)}).z>=.05&&t.push(i({x:l*Math.sin(u),y:e,z:l*Math.cos(u)}))}return t},m=e=>{if(!l||e.length===0)return[];let t=0,n=0;for(let r of e)t+=r.x,n+=r.y;let a=l(t/e.length,f(d+n/e.length)),o=r({x:0,y:0,z:1}).z,s=[];for(let t of e){let e=t.x-a.x,n=f(d+t.y)-a.y,c=Math.hypot(e,n),l=Math.min(c/a.r,Math.PI-.02),u=c>1e-9?e/c:1,p=c>1e-9?n/c:0,m=r({x:u,y:p,z:0}).z,h=e=>m*Math.sin(e)+o*Math.cos(e);if(h(l)<.06&&o>.06){let e=0,t=l;for(let n=0;n<20;n++){let n=(e+t)/2;h(n)>=.06?e=n:t=n}l=e}let g=a.r*Math.sin(l);r({x:u*Math.sin(l),y:p*Math.sin(l),z:Math.cos(l)}).z>=.05&&s.push(i({x:a.x+u*g,y:a.y+p*g,z:a.z+a.r*Math.cos(l)}))}return s},h=1/0,g=-1/0;for(let e of t)for(let t of e)t.y<h&&(h=t.y),t.y>g&&(g=t.y);let _=0;g-h<=s-o&&(d+h<o?_=o-(d+h):d+g>s&&(_=s-(d+g)));let v=_===0?t:t.map(e=>e.map(e=>({x:e.x,y:e.y+_}))),y=l?m:p;return v.map(y).filter(e=>e.length>2)}
function hl(e,{loops:t,shiftY:n},{rotate:r,project:i}){let{wrapR:a,wrapX0:o,wrapX1:s,radiusAtX:c}=e,l=Math.max(-2.4,Math.min(2.4,-n/a)),u=1/0,d=-1/0;for(let e of t)for(let t of e)t.x<u&&(u=t.x),t.x>d&&(d=t.x);let f=0;return d-u<=s-o&&(u<o?f=o-u:d>s&&(f=s-d)),(f===0?t:t.map(e=>e.map(e=>({x:e.x+f,y:e.y})))).map(e=>{let t=[];for(let n of e){let e=Math.min(s,Math.max(o,n.x)),u=c(e),d=l+Math.max(-2.6,Math.min(2.6,n.y/Math.max(.12,a))),f=.012;r({x:-(c(Math.min(s,e+f))-c(Math.max(o,e-f)))/(2*f),y:Math.sin(d),z:Math.cos(d)}).z>=.05&&t.push(i({x:e,y:u*Math.sin(d),z:u*Math.cos(d)}))}return t}).filter(e=>e.length>2)}
var Zl=1024;
var Ql=2**23;
var $l=2**25;
var eu=2**26;
var tu=class{xs=[];ys=[];#e=new Map;id(e,t){let n=(e+Ql)*$l+(t+Ql),r=this.#e.get(n);return r??(r=this.xs.length,this.xs.push(e),this.ys.push(t),this.#e.set(n,r)),r}};
function nu(e){let t=``;for(let n of e){t+=`M${gu(n[0])} ${gu(n[1])}`;for(let e=2;e<n.length;e+=2)t+=` ${gu(n[e])} ${gu(n[e+1])}`;t+=`Z`}return t}
function ru(e){let t=iu(e),n=au(t);return uu(lu(cu(t.flatMap(e=>ou(e,n)))))}
function iu(e){let t=new tu,n=new Map,r=[],i=[],a=e=>{let r=mu(e);if(r===0)return;let a=e.length/2;i.length=0;for(let n=0;n<a;n++){let o=r>0?n:a-1-n;i.push(t.id(e[2*o],e[2*o+1]))}for(let e=0;e<a;e++){let t=i[e],r=i[(e+1)%a];if(t===r)continue;let o=r*eu+t,s=n.get(o)??0;s>1?n.set(o,s-1):s===1?n.delete(o):n.set(t*eu+r,(n.get(t*eu+r)??0)+1)}};for(let t of e){r.length=t.length;for(let e=0;e<t.length;e++)r[e]=Math.round(t[e]*Zl);let e=r.length===8?du(r):null;if(e==null)a(r);else for(let t of e)a(t)}let{xs:o,ys:s}=t;return[...n].map(([e,t])=>{let n=Math.floor(e/eu),r=e-n*eu;return{ax:o[n],ay:s[n],bx:o[r],by:s[r],count:t}})}
function au(e){let t=new tu;for(let n of e)t.id(n.ax,n.ay),t.id(n.bx,n.by);let n=e.map((e,t)=>t).sort((t,n)=>hu(e[t])-hu(e[n]));n.forEach((r,i)=>{let a=e[r],o=Math.max(a.ax,a.bx);for(let r=i+1;r<n.length;r++){let i=e[n[r]];if(hu(i)>o)break;if(Math.min(i.ay,i.by)>Math.max(a.ay,a.by)||Math.max(i.ay,i.by)<Math.min(a.ay,a.by))continue;let s=Math.sign(pu(a.ax,a.ay,a.bx,a.by,i.ax,i.ay)),c=Math.sign(pu(a.ax,a.ay,a.bx,a.by,i.bx,i.by)),l=pu(i.ax,i.ay,i.bx,i.by,a.ax,a.ay),u=pu(i.ax,i.ay,i.bx,i.by,a.bx,a.by);if(s*c>=0||Math.sign(l)*Math.sign(u)>=0)continue;let d=l/(l-u);t.id(Math.round(a.ax+(a.bx-a.ax)*d),Math.round(a.ay+(a.by-a.ay)*d))}});let{xs:r,ys:i}=t;return r.map((e,t)=>({x:e,y:i[t]})).sort((e,t)=>e.x-t.x)}
function ou(e,t){let n=e.bx-e.ax,r=e.by-e.ay,i=Math.abs(n)+Math.abs(r),a=Math.min(e.ay,e.by)-.5,o=Math.max(e.ay,e.by)+.5,s=Math.max(e.ax,e.bx)+.5,c=[];for(let l=su(t,Math.min(e.ax,e.bx)-.5);l<t.length&&t[l].x<=s;l++){let{x:s,y:u}=t[l];u<a||u>o||2*Math.abs(pu(e.ax,e.ay,e.bx,e.by,s,u))>i||c.push({t:((s-e.ax)*n+(u-e.ay)*r)/(n*n+r*r),x:s,y:u})}c.sort((e,t)=>e.t-t.t);let l=[];for(let t=1;t<c.length;t++){let n=c[t-1],r=c[t];(n.x!==r.x||n.y!==r.y)&&l.push({ax:n.x,ay:n.y,bx:r.x,by:r.y,count:e.count})}return l}
function su(e,t){let n=0,r=e.length;for(;n<r;){let i=n+r>>1;e[i].x<t?n=i+1:r=i}return n}
function cu(e){let t=new tu,n=new Map;for(let r of e){let e=t.id(r.ax,r.ay),i=t.id(r.bx,r.by),a=Math.min(e,i)*eu+Math.max(e,i);n.set(a,(n.get(a)??0)+(e<i?r.count:-r.count))}let{xs:r,ys:i}=t,a=[];for(let[e,t]of n){if(t===0)continue;let n=Math.floor(e/eu),o=e-n*eu;a.push({ax:r[n],ay:i[n],bx:r[o],by:i[o],count:t})}return a}
function lu(e){let t=[];for(let n of e){let r=n.ax+n.bx,i=n.ay+n.by,a=0;for(let t of e){if(t===n)continue;let e=2*t.ay,o=2*t.by;e<=i?o>i&&pu(2*t.ax,e,2*t.bx,o,r,i)>0&&(a+=t.count):o<=i&&pu(2*t.ax,e,2*t.bx,o,r,i)<0&&(a-=t.count)}let o=n.ay<n.by||n.ay===n.by&&n.ax>n.bx?a+n.count:a,s=o-n.count;o!==0!=(s!==0)&&t.push(o===0?{ax:n.bx,ay:n.by,bx:n.ax,by:n.ay,count:1}:{...n,count:1})}return t}
function uu(e){let t=new tu,n=[];for(let r of e){let e=t.id(r.ax,r.ay),i=t.id(r.bx,r.by);for(;n.length<=Math.max(e,i);)n.push([]);for(let t=0;t<Math.abs(r.count);t++)r.count>0?n[e].push(i):n[i].push(e)}let{xs:r,ys:i}=t,a=``;return n.forEach((e,t)=>{for(;e.length>0;){a+=`M${gu(r[t]/Zl)} ${gu(i[t]/Zl)}`;let o=e.pop();for(;o!=null&&o!==t;)a+=` ${gu(r[o]/Zl)} ${gu(i[o]/Zl)}`,o=n[o].pop();a+=`Z`}}),a}
function du(e){let[t,n,r,i,a,o,s,c]=e,l=fu(t,n,r,i,a,o,s,c);if(l!=null)return[[t,n,l[0],l[1],s,c],[l[0],l[1],r,i,a,o]];let u=fu(r,i,a,o,s,c,t,n);return u==null?null:[[r,i,u[0],u[1],t,n],[u[0],u[1],a,o,s,c]]}
function fu(e,t,n,r,i,a,o,s){let c=Math.sign(pu(e,t,n,r,i,a)),l=Math.sign(pu(e,t,n,r,o,s)),u=pu(i,a,o,s,e,t),d=pu(i,a,o,s,n,r);if(!(c*l<0&&Math.sign(u)*Math.sign(d)<0))return null;let f=u/(u-d);return[Math.round(e+(n-e)*f),Math.round(t+(r-t)*f)]}
function pu(e,t,n,r,i,a){return(n-e)*(a-t)-(r-t)*(i-e)}
function mu(e){let t=0;for(let n=0;n<e.length;n+=2){let r=(n+2)%e.length;t+=e[n]*e[r+1]-e[r]*e[n+1]}return t}
function hu(e){return Math.min(e.ax,e.bx)}
function gu(e){return String(Math.round(e*100)/100)}
var {abs:Xu,floor:Zu,hypot:Qu,max:$u,min:ed,sqrt:td}=Math;
var nd=60;
var rd=256;
var id=24;
var ad=2e4;
var od=.2;
function sd(e,t,n){let r={field:e,tolerance:n,root:n.deviation*.001,reach:t.step*Qu(t.nx,t.ny)},i=[];for(let e of cd(r,t)){let t=md(ud(r,e),n);t.length>=3&&i.push(t)}return i}
function cd(e,t){let{field:n}=e,{x0:r,y0:i,step:a,nx:o,ny:s}=t,c=o+1,l=new Float64Array(c*(s+1));for(let e=0;e<=s;e++)for(let t=0;t<=o;t++)l[e*c+t]=n(r+t*a,i+e*a);let u=2*c*(s+1),d=new Int32Array(u).fill(-1),f=new Map,p=t=>{let n=f.get(t);if(n!==void 0)return n;let o=t>>1,s=t&1?o+c:o+1,u=r+o%c*a,d=i+Zu(o/c)*a,p=r+s%c*a,m=i+Zu(s/c)*a,h=ld(e,u,d,l[o],p,m,l[s]),g=[u+(p-u)*h,d+(m-d)*h];return f.set(t,g),g},m=[0,0,0,0],h=[0,0,0,0],g=[0,0,0,0],_=[!1,!1,!1,!1];for(let e=0;e<s;e++)for(let t=0;t<o;t++){let o=e*c+t;if(l[o]<0?l[o+1]<0&&l[o+1+c]<0&&l[o+c]<0:l[o+1]>=0&&l[o+1+c]>=0&&l[o+c]>=0)continue;m[0]=o,m[1]=o+1,m[2]=o+1+c,m[3]=o+c,h[0]=2*o,h[1]=2*(o+1)+1,h[2]=2*(o+c),h[3]=2*o+1;let s=0;for(let e=0;e<4;e++){let t=l[m[e]]<0;t!==l[m[e+1&3]]<0&&(g[s]=h[e],_[s]=t,s++)}if(s===2){let e=+!_[0];d[g[e]]=g[1-e]}else if(s===4){let o=n(r+(t+.5)*a,i+(e+.5)*a)<0;for(let e=0;e<4;e++)_[e]&&(d[g[e]]=g[e+(o?1:3)&3])}}let v=[],y=new Uint8Array(u);for(let e=0;e<u;e++){if(d[e]<0||y[e])continue;let t=[],n=e;for(;n>=0&&!y[n];)y[n]=1,t.push(p(n)),n=d[n];n===e&&v.push(t)}return v}
function ld(e,t,n,r,i,a,o){let s=0,c=r,l=1,u=o,d=0,f=0;for(let r=0;r<nd;r++){f=(s*u-l*c)/(u-c);let r=e.field(t+(i-t)*f,n+(a-n)*f);if(Xu(r)<=e.root||l-s<=1e-15)break;r<0==u<0?(l=f,u=r,d===-1&&(c/=2),d=-1):(s=f,c=r,d===1&&(u/=2),d=1)}return f}
function ud(e,t){let n=[];for(let r=0;r<t.length;r++){let i=t[r],a=t[(r+1)%t.length];(i[0]!==a[0]||i[1]!==a[1])&&(n.push(i),dd(e,i,a,0,n))}return n}
function dd(e,t,n,r,i){let a=n[0]-t[0],o=n[1]-t[1],s=td(a*a+o*o);if(s===0||r>=id||i.length>=ad)return;let c=(t[0]+n[0])/2,l=(t[1]+n[1])/2,u=e.field(c,l);if(!Number.isFinite(u))return;let d=u>0?1:-1,f=-o/s*d,p=a/s*d,m=pd(e,c,l,u,f,p);if(m===null||m<=e.tolerance.deviation/2&&s<=e.tolerance.edge)return;let h=u>0?fd(e,c,l,u,f,p,m):[c+f*m,l+p*m];dd(e,t,h,r+1,i),i.push(h),dd(e,h,n,r+1,i)}
function fd(e,t,n,r,i,a,o){let s=[t+i*o,n+a*o],c=o*.001,l=e.field(t+c,n)-e.field(t-c,n),u=e.field(t,n+c)-e.field(t,n-c),d=td(l*l+u*u);if(d===0)return s;let f=l*a-u*i<0?-1:1,p=-u/d*f,m=l/d*f;if(p*i+m*a<od)return s;let h=pd(e,t,n,r,p,m);return h===null||h*(p*i+m*a)<=o?s:[t+p*h,n+m*h]}
function pd(e,t,n,r,i,a){if(r===0)return 0;let o=0,s=r;for(let c=0;c<rd;c++){let c=o+$u(Xu(s),e.root);if(c>e.reach)return null;let l=t+i*c,u=n+a*c,d=e.field(l,u);if(d<0!=r<0)return o+(c-o)*ld(e,t+i*o,n+a*o,s,l,u,d);o=c,s=d}return null}
function md(e,t){let n=e.length;if(n<4)return e;let r=new Uint8Array(n),i=0,a=-1;for(let t=1;t<n;t++){let n=hd(e[0],e[t]);n>a&&(a=n,i=t)}r[0]=1,r[i]=1;let o=(i,a)=>{if(a-i<2)return;let s=e[i],c=e[a%n],l=-1,u=i;for(let t=i+1;t<a;t++){let n=gd(e[t],s,c);n>l&&(l=n,u=t)}let d=l>t.deviation/2;!d&&td(hd(s,c))<=t.edge||(d||(u=i+a>>1),r[u]=1,o(i,u),o(u,a))};return o(0,i),o(i,n),e.filter((e,t)=>r[t]===1)}
function hd(e,t){let n=t[0]-e[0],r=t[1]-e[1];return n*n+r*r}
function gd(e,t,n){let r=n[0]-t[0],i=n[1]-t[1],a=e[0]-t[0],o=e[1]-t[1],s=r*r+i*i,c=s>0?ed(1,$u(0,(a*r+o*i)/s)):0,l=a-r*c,u=o-i*c;return td(l*l+u*u)}
var {PI:H,abs:_d,acos:vd,asin:yd,atan2:bd,ceil:xd,cos:U,exp:Sd,floor:W,hypot:Cd,max:G,min:K,pow:wd,sin:q,sqrt:Td}=Math;
var Ed=[{fill:`#3d3d3d`,paints:new Set([1,2])},{fill:`#525252`,paints:new Set([2])}];
var Dd={deviation:.5,edge:4};
var Od=2;
var kd=4;
var Ad=8;
var jd=19*H/180;
var Md=.16;
var Nd=2.2;
var Pd=.9;
var Fd=1.08;
var Id=Fd*.84;
var Ld=-65*H/180;
var Rd=1.17;
var zd=.36;
var Bd=1.18;
var Vd=160;
var Hd=320;
var J=256;
var Ud=24;
var Wd=1.25;
var Gd=.015;
var Kd=1.002;
var qd=-.35;
var Jd=48;
var Yd=2.2;
var Xd=14;
var Zd=.03;
var Qd=.012;
var $d=48;
var ef=72;
var tf=8;
var nf=.115;
var rf=.08;
var af=.06;
var of=.09;
var sf=24;
var cf=32;
var lf=.6;
var uf=.012;
var df=.02;
var ff=128;
var pf=4096;
var mf=.05;
var hf=1.01;
var gf={x:0,y:0,z:1};
var _f={x:0,y:1,z:0};
var vf={x:1,y:0,z:0};
var yf=Array.from({length:J},(e,t)=>{let n=2*H*t/J;return{x:U(n),y:q(n)}});
var bf=Array.from({length:49},(e,t)=>{let n=(t-Ud)/Ud*Wd;return{lean:U(n),depth:q(n)}}).sort((e,t)=>t.lean-e.lean);
var xf=null;
var Sf=null;
var Cf=new Map;
var wf=new WeakMap;
function Tf(e,t,n){let r=1/wd(wd(Cd(e,n)/Fd,Nd)+wd(_d(t)/Id,Nd),1/Nd),i=_d(U(Ad*(bd(n,e)-H/2-jd)/2)),a=t<0?wd(G(0,1-t*t),.2):Td(G(0,1-t*t))*(1-.45*t),o=1-Md*(1-wd(i,.6))*a,s=wd(_d(U(3*yd(G(-1,K(1,t))))),.6),c=t<0?1:G(0,1-2.2*t),l=1-Md*.55*Pd*(1-s)*c,u=t>0?.11*Sd(-(1-t)/.02):.03*Sd(-(1+t)/.03);return r*o*l*(1-u)}
function Ef(){if(xf!=null)return xf;let e=new Float32Array(51681),t=new Float64Array(161).fill(1/0),n=new Float64Array(161),r=1/0,i=0;for(let a=0;a<=Vd;a++){let o=-H/2+a/Vd*H,s=U(o),c=q(o);for(let o=0;o<=Hd;o++){let l=-H+o/Hd*2*H,u=Tf(s*U(l),c,s*q(l)),d=a*321+o;e[d]=u,u<r&&(r=u),u>i&&(i=u),t[a]=K(t[a],e[d]),n[a]=G(n[a],e[d])}}let a=new Float64Array(pf),o=new Float64Array(pf);for(let e=0;e<pf;e++){let r=G(0,Df(e)-1),i=K(Vd,Df(e+1)+2);a[e]=K(...t.subarray(r,i+1))*.999999999,o[e]=G(...n.subarray(r,i+1))*1.000000001}return xf={radii:e,least:r,most:i,inner:K(...a),outer:G(...o),innerBands:a,outerBands:o},xf}
function Df(e){return W((yd(G(-1,K(1,-1+2*e/pf)))+H/2)/H*Vd)}
function Of(e){return K(4095,G(0,W((e+1)*(pf/2))))}
function kf(e,t,n){let{radii:r}=Ef(),i=(yd(G(-1,K(1,t/(Cd(e,t,n)||1))))+H/2)/H*Vd,a=(bd(n,e)+H)/(2*H)*Hd,o=K(159,G(0,W(i))),s=K(319,G(0,W(a))),c=i-o,l=a-s,u=o*321+s,d=u+Hd+1;return(r[u]*(1-l)+r[u+1]*l)*(1-c)+(r[d]*(1-l)+r[d+1]*l)*c}
function Af(e){let t=U(e);return{c:t,s:q(e),k:1-t}}
function jf({yaw:e,pitch:t,roll:n}){let r=e*H/180,i=t*H/180,a=n*H/180;return{toView:Mf(Af(r),Af(i),Af(a)),toBody:Nf(Af(-a),Af(-i),Af(-r))}}
function Mf(e,t,n){return(r,i,a)=>{let o=r*e.c+a*e.s,s=i*e.c+i*e.k,c=a*e.c-r*e.s,l=o*t.c+o*t.k,u=s*t.c-c*t.s,d=c*t.c+s*t.s;return{x:l*n.c-u*n.s,y:u*n.c+l*n.s,z:d*n.c+d*n.k}}}
function Nf(e,t,n){return(r,i,a)=>{let o=r*e.c-i*e.s,s=i*e.c+r*e.s,c=a*e.c+a*e.k,l=o*t.c+o*t.k,u=s*t.c-c*t.s,d=c*t.c+s*t.s;return{x:l*n.c+d*n.s,y:u*n.c+u*n.k,z:d*n.c-l*n.s}}}
function Pf(e){return Rd*(zd*e/Bd)}
function Ff(e,t){let n=`${t} ${e.yaw} ${e.pitch} ${e.roll}`,r=Cf.get(n);if(r!=null)return Cf.delete(n),Cf.set(n,r),r;let{toView:i,toBody:a}=jf(e),{outer:o,outerBands:s}=Ef(),c=t/2,l=Pf(t),u=new Float64Array(J),d=[];for(let e=0;e<J;e++){let t=yf[e],n=0;for(let{lean:e,depth:r}of bf){if(e*o<n)break;let{x:i,y:c,z:l}=a(t.x*e,t.y*e,r);e*s[Of(c)]<n||(n=G(n,kf(i,c,l)*e))}u[e]=n,d.push(c+l*n*t.x,c-l*n*t.y)}let f={reaches:u,body:d,stem:lp(i,a,t,u)};if(Cf.set(n,f),Cf.size>ff){let e=Cf.keys().next().value;e!==void 0&&Cf.delete(e)}return f}
function If(e,t,n,r){let{toView:i,toBody:a}=jf(t),o=n/2,s=Pf(n),c=e=>({x:o+s*e.x,y:o-s*e.y}),l=Yf(i,gf),u=Yf(i,_f),d=Yf(i,vf),f=[];for(let t of r){let n=$f(t.map(({x:e,y:t})=>Yf(i,Jf(e,t))),e=>{let n=Xf(e,l);if(n<=.02)return!1;let r=vd(G(-1,K(1,n))),i=q(r);return i<1e-8?op(t,{x:0,y:0}):op(t,{x:r*Xf(e,d)/i,y:r*Xf(e,u)/i})},e.reaches,a,o,s,c);n!=null&&f.push(n)}return np(f,e.reaches,o,s).map(sp)}
function Lf(e){if(e==null)return[];let t=wf.get(e);if(t!=null)return t;let n=Uf(e),r=Bf(e,n.nx+1,n.ny+1),i=Wf(n,Vf(r,e=>e!==0)),a=Ed.flatMap(({fill:t,paints:a})=>{let o=Rf(e,a)?i:zf(n,r,a),s=sd(Gf(n,o,i),n,Dd).map(e=>e.flatMap(([e,t])=>[e,t]));return s.length>0?[{fill:t,polygons:s}]:[]});return wf.set(e,a),a}
function Rf({paint:e},t){for(let n=0;n<e.length;n++)if(e[n]!==0&&!t.has(e[n]))return!1;return!0}
function zf(e,t,n){let r=Vf(t,e=>n.has(e)),i=Hf(r,e.nx+1,e.ny+1),a=r.slice();for(let e=0;e<a.length;e++)t[e]===0&&(a[e]|=i[e]);return Wf(e,a)}
function Bf(e,t,n){let r=new Uint8Array(t*n);for(let n=0;n<e.height;n++)r.set(e.paint.subarray(n*e.width,(n+1)*e.width),(n+kd)*t+kd);return r}
function Vf(e,t){let n=new Uint8Array(e.length);for(let r=0;r<e.length;r++)t(e[r])&&(n[r]=1);return n}
function Hf(e,t,n){let r=new Uint8Array(e.length);for(let i=0;i<n;i++)for(let n=0;n<t;n++)for(let a=-2;a<=Od;a++){let o=n+a;if(o>=0&&o<t&&e[i*t+o]===1){r[i*t+n]=1;break}}let i=new Uint8Array(e.length);for(let e=0;e<n;e++)for(let a=0;a<t;a++)for(let o=-2;o<=Od;o++){let s=e+o;if(s>=0&&s<n&&r[s*t+a]===1){i[e*t+a]=1;break}}return i}
function Uf(e){return{x0:e.left-kd+.5,y0:e.top-kd+.5,step:1,nx:e.width+8-1,ny:e.height+8-1}}
function Wf(e,t){let n=e.nx+1,r=e.ny+1;return qf(qf(Float32Array.from(t),n,r,1),n,r,n)}
function Gf(e,t,n){let r=e.nx+1;return(i,a)=>{let o=K(e.nx,G(0,i-e.x0)),s=K(e.ny,G(0,a-e.y0)),c=K(e.nx-1,W(o)),l=K(e.ny-1,W(s)),u=o-c,d=s-l,f=l*r+c;return G(Kf(t,f,r,u,d),Kf(n,f,r,u,d))}}
function Kf(e,t,n,r,i){let a=e[t]*(1-r)+e[t+1]*r,o=e[t+n]*(1-r)+e[t+n+1]*r;return .5-(a*(1-i)+o*i)}
function qf(e,t,n,r){let i=new Float32Array(e.length);for(let a=1;a<n-1;a++)for(let n=1;n<t-1;n++){let o=a*t+n;i[o]=(e[o-r]+2*e[o]+e[o+r])/4}return i}
function Jf(e,t){let n=Cd(e,t);if(n<1e-8)return gf;let r=q(n);return{x:e/n*r,y:t/n*r,z:U(n)}}
function Yf(e,{x:t,y:n,z:r}){return e(t,n,r)}
function Xf(e,t){return e.x*t.x+e.y*t.y+e.z*t.z}
function Zf(e,t){let n=Cd(e.x,e.y,e.z)||1,r={x:e.x/n,y:e.y/n,z:e.z/n},i=Yf(t,r),a=kf(i.x,i.y,i.z)*Kd;return{x:r.x*a,y:r.y*a,z:r.z*a}}
function Qf(e,t){let n=Cd(e.x,e.y,e.z)||1;if(e.z/n<qd)return!1;let{inner:r,outer:i,innerBands:a,outerBands:o}=Ef(),s=Zf(e,t);for(let e=1;e<=Jd;e++){let n=.01+e/Jd*Yd,c=s.x,l=s.y,u=s.z+n,d=Cd(c,l,u);if(d>Yd)break;if(d>i){if(u>=0)break;continue}if(d<r)return!1;let f=t(c/d,l/d,u/d),p=Of(f.y);if(!(d>o[p])&&(d<a[p]||d<kf(f.x,f.y,f.z)))return!1}return!0}
function $f(e,t,n,r,i,a,o){let s=e.map(e=>Qf(e,r));if(s.every(e=>!e))return null;if(s.every(e=>e))return e.map(e=>o(Zf(e,r)));let c=(e,t)=>{let n=0,i=1;for(let a=0;a<Xd;a++){let a=(n+i)/2;Qf(ep(e,t,a),r)?n=a:i=a}return Zf(ep(e,t,n),r)},l=e=>{let t=e/(2*H)*J;t=(t%J+J)%J;let r=W(t)%J,o=t-W(t),s=(n[r]*(1-o)+n[(r+1)%J]*o)*a;return{x:i+s*U(e),y:i-s*q(e)}},u=e.length,d=s.findIndex(e=>!e),f=[],p=null,m=0;for(let n=0;n<u;n++){let i=(d+n)%u,a=(i+1)%u;if(!s[i]&&s[a]){let t=c(e[a],e[i]);m=bd(t.y,t.x),p=[o(t)]}if(s[i]&&(p??=[],p.push(o(Zf(e[i],r)))),s[i]&&!s[a]&&p!=null){let n=c(e[i],e[a]);p.push(o(n));let r=bd(n.y,n.x),s=m-r;for(;s<=-H;)s+=2*H;for(;s>H;)s-=2*H;let u=r+s/2;if(t({x:U(u),y:q(u),z:0})){let e=G(2,xd(_d(s)/Zd));for(let t=1;t<e;t++)p.push(l(r+s*t/e))}p.length>2&&f.push(p),p=null}}return f.length===0?null:f.reduce((e,t)=>tp(t)>tp(e)?t:e)}
function ep(e,t,n){return{x:e.x+(t.x-e.x)*n,y:e.y+(t.y-e.y)*n,z:e.z+(t.z-e.z)*n}}
function tp(e){return _d(e.reduce((t,n,r)=>{let i=e[(r+1)%e.length];return t+n.x*i.y-i.x*n.y},0))}
function np(e,t,n,r){if(e.length===0)return[];let i=[];for(let e=0;e<J;e++){let a=2*H*e/J,o=G(.05,t[e]-Gd)*r;i.push({x:n+o*U(a),y:n-o*q(a)})}let a=rp(i),[o,s]=a,c=(s.x-o.x)*(n-o.y)-(s.y-o.y)*(n-o.x)>0?1:-1,l=[];for(let t of e){if(t.every(e=>op(a,e))){l.push(t);continue}let e=t;for(let t=0;t<a.length&&e.length>2;t++){let n=a[t],r=a[(t+1)%a.length];e=ip(e,e=>c*((r.x-n.x)*(e.y-n.y)-(r.y-n.y)*(e.x-n.x)))}(e.length>2?_d(ap(e)):0)>Qd*r*r&&l.push(e)}return l}
function rp(e){let t=e.slice().sort((e,t)=>e.x-t.x||e.y-t.y),n=(e,t,n)=>(t.x-e.x)*(n.y-e.y)-(t.y-e.y)*(n.x-e.x),r=[];for(let e of t){for(;r.length>=2&&n(r[r.length-2],r[r.length-1],e)<=0;)r.pop();r.push(e)}let i=[];for(let e=t.length-1;e>=0;e--){let r=t[e];for(;i.length>=2&&n(i[i.length-2],i[i.length-1],r)<=0;)i.pop();i.push(r)}return r.pop(),i.pop(),r.concat(i)}
function ip(e,t){let n=[];for(let r=0;r<e.length;r++){let i=e[r],a=e[(r+1)%e.length],o=t(i),s=t(a);if(o>=0&&n.push(i),o>=0!=s>=0){let e=o/(o-s);n.push({x:i.x+e*(a.x-i.x),y:i.y+e*(a.y-i.y)})}}return n}
function ap(e){let t=0;for(let n=0,r=e.length-1;n<e.length;r=n++)t+=(e[r].x+e[n].x)*(e[r].y-e[n].y);return t/2}
function op(e,t){let n=!1;for(let r=0,i=e.length-1;r<e.length;i=r++){let a=e[r],o=e[i];a.y>t.y!=o.y>t.y&&t.x<a.x+(t.y-a.y)*(o.x-a.x)/(o.y-a.y)&&(n=!n)}return n}
function sp(e){return e.flatMap(e=>[e.x,e.y])}
function cp(){if(Sf!=null)return Sf;let e=Tf(0,1,0),t=.6799999999999999,n=e=>Ld*wd(e,2.2),r=[],i=0,a=e-rf;for(let e=0;e<=ef;e++){let o=e/ef;if(r.push({x:i,y:a,angle:n(o)}),e===ef)break;for(let e=0;e<tf;e++){let r=n(o+(e+.5)/tf/ef);i+=q(r)*(t/ef/tf),a+=U(r)*(t/ef/tf)}}let o=e;for(let e=1;e<=sf;e++){let t=e/sf*lf;for(let e=0;e<cf;e++){let n=e*H/16,r=Tf(q(t)*U(n),U(t),q(t)*q(n))*U(t);r>o&&(o=r)}}let s=[];for(let e=0;e<=ef;e++){let t=e/ef,{x:n,y:i,angle:a}=r[e],c=G(0,K(1,1-(i-(o+.01))/of)),l=nf+.05500000000000001*(1-t)*(1-t)+af*c*c,u=U(a),d=-q(a);for(let e=0;e<$d;e++){let t=2*H*e/$d;s.push({x:n+l*U(t)*u,y:i+l*U(t)*d,z:l*q(t)})}}let c=s.length;s.push({x:r[ef].x,y:r[ef].y,z:0});let l=new Int32Array(27840),u=0,d=(e,t,n,r)=>{l.set([e,t,n,r],u),u+=4};for(let e=0;e<ef;e++)for(let t=0;t<$d;t++){let n=(t+1)%$d,r=e*$d,i=(e+1)*$d;d(r+t,r+n,i+n,1),d(r+t,i+n,i+t,1)}let f=3456;for(let e=0;e<$d;e++)d(c,f+e,f+(e+1)%$d,2);return Sf={vertices:s,triangles:l},Sf}
function lp(e,t,n,r){let{vertices:i,triangles:a}=cp(),o=n/2,s=Pf(n),c=i.map(t=>Yf(e,t)),l=c.map(e=>up(o+s*e.x,o-s*e.y)),u=n,d=n,f=0,p=0;for(let e of l)u=K(u,e.x-1),d=K(d,e.y-1),f=G(f,e.x+1),p=G(p,e.y+1);u=G(0,W(u)),d=G(0,W(d)),f=K(n,xd(f)),p=K(n,xd(p));let m=G(1,f-u),h=G(1,p-d);if(m<2||h<2)return null;let g=new Uint8Array(m*h),_=new Float32Array(m*h).fill(-1e9),v=fp(t,r);for(let e=0;e<a.length;e+=4){let t=l[a[e]],n=l[a[e+1]],r=l[a[e+2]],i=G(d,K(t.nearRow,n.nearRow,r.nearRow)),o=K(p-1,G(t.farRow,n.farRow,r.farRow));if(i>o)continue;let s=K(t.nearColumn,n.nearColumn,r.nearColumn),h=G(t.farColumn,n.farColumn,r.farColumn);if(s>h)continue;let y=(n.y-r.y)*(t.x-r.x)+(r.x-n.x)*(t.y-r.y);if(_d(y)<1e-8)continue;let b=c[a[e]],x=c[a[e+1]],S=c[a[e+2]],C=t,w=n,T=r;if(C.y>w.y&&(C=n,w=t),w.y>T.y&&(T=w,w=r),C.y>w.y){let e=w;w=C,C=e}for(let c=i;c<=o;c++){let i=c+.5,o=G(C.y,K(T.y,i)),l=dp(C,T,o),p=o<=w.y?dp(C,w,o):dp(w,T,o),E=G(u,W(K(l,p))-1,s),D=K(f-1,xd(G(l,p))+1,h);for(let o=E;o<=D;o++){let s=o+.5,l=((n.y-r.y)*(s-r.x)+(r.x-n.x)*(i-r.y))/y,f=((r.y-t.y)*(s-r.x)+(t.x-r.x)*(i-r.y))/y,p=1-l-f;if(l<0||f<0||p<0)continue;let h=l*b.z+f*x.z+p*S.z,C=(c-d)*m+(o-u);h<=_[C]||v(l*b.x+f*x.x+p*S.x,l*b.y+f*x.y+p*S.y,h)||(_[C]=h,g[C]=a[e+3])}}}return{left:u,top:d,width:m,height:h,paint:g}}
function up(e,t){return{x:e,y:t,nearRow:W(t-mf-.5)+1,farRow:xd(t+mf-.5)-1,nearColumn:W(e-mf-.5)+1,farColumn:xd(e+mf-.5)-1}}
function dp(e,t,n){return t.y-e.y<1e-9?t.x:e.x+(t.x-e.x)*(n-e.y)/(t.y-e.y)}
function fp(e,t){let{least:n,most:r,innerBands:i,outerBands:a}=Ef(),o=Yf(e,gf);return(s,c,l)=>{let u=s*s+c*c;if(u>=Fd*Fd)return!1;let d=(W(bd(c,s)/(2*H)*J)+J)%J,f=G(t[d],t[(d+1)%J])*hf;if(u>f*f)return!1;let p=e(s,c,0);for(let e=l+uf;e<=Fd;e+=df){let t=Cd(s,c,e);if(t<n)return!0;if(t>r){if(e>=0)return!1;continue}let l=p.y+e*o.y,u=Of(l/t);if(!(t>a[u])&&(t<=i[u]||t<=kf(p.x+e*o.x,l,p.z+e*o.z)))return!0}return!1}}
var vp=144;
var yp=184/256;
var bp=180/Math.PI;
var xp=16e6;
var Sp=.6;
var Cp=256;
var wp=new Set([`pumpkin`]);
var Tp=new Map;
var Ep=0;
var Dp=new Map;
var Op=new WeakMap;
function Ap(e,t){let n=Math.max(8,Math.round(t*e.zoom/yp)),r=Math.max(n,vp),i=Np(e,t),{body:a,eyes:o,stem:s}=Lp(e.body,i,r,e.eyes),[c,l,u,d]=Up(e,t,n,r),f=([e,t])=>[c*e+u,l*t+d],p=e=>Wp(e).map(e=>e.map(f)),m=s.map(e=>({fill:e.fill,loops:p(e.d)}));return{center:[c*r/2+u,l*r/2+d],radius:e.zoom*t/2,body:[...a.flatMap(p),...m.flatMap(({loops:e})=>e)],eyes:e.eyes==null?[]:o.flatMap(p),...m.length===0?{}:{painted:m}}}
function Mp(e,t=0){let n=Vr(e);return Pp(n[8]>=0?n:[-n[0],n[1],-n[2],-n[3],n[4],-n[5],-n[6],n[7],-n[8]],t)}
function Np(e,t){let n=Fp(t,e.zoom);return wp.has(e.body)?Pp(Vr(e.quat),n):Mp(e.quat,n)}
function Pp(e,t){let[n,r,i]=Ur(e),a=e=>t>0?Math.round(e/t)*t:e;return{yaw:Ip(a(r*bp)),pitch:Ip(a(n*bp)),roll:a(i*bp)}}
function Fp(e,t){let n=Sp/Math.max(e*t/2,1)*bp;return 2**Math.floor(Math.log2(n))}
function Ip(e){let t=(e%180+180)%180;return Math.abs(t-90)>=.5?e:e+(t<=90?89.5-t:90.5-t)}
function Lp(e,t,n,r){let i=r==null?[]:zp(e,t,n,r);return e===`pumpkin`?{...Rp(Ff(t,n)),eyes:i}:{body:Bp(e,t,n),eyes:i,stem:[]}}
function Rp(e){let t=Op.get(e);if(t!=null)return t;let n={body:[nu([e.body])],stem:Lf(e.stem).map(({fill:e,polygons:t})=>({d:nu(t),fill:e}))};return Op.set(e,n),n}
function zp(e,t,n,r){let i=`${e} ${n} ${t.yaw} ${t.pitch} ${t.roll} ${JSON.stringify(r)}`,a=Dp.get(i);if(a!=null)return Dp.delete(i),Dp.set(i,a),a;let o=(e===`pumpkin`?If(Ff(t,n),t,n,Ao(r)):tl(dc(e),t,n,ko(e,r))).map(e=>nu([e]));if(Dp.set(i,o),Dp.size>Cp)for(let e of Dp.keys()){Dp.delete(e);break}return o}
function Bp(e,t,n){let r=dc(e),i=r.silhouette.kind===`solid`?r.silhouette.yawPeriod:null,{pitch:a,roll:o}=t,s=i==null?t.yaw:t.yaw-i*Math.floor(t.yaw/i),c=`${e} ${n} ${s} ${a} ${o}`,l=Tp.get(c);if(l!=null)return Tp.delete(c),Tp.set(c,l),l;let u=Hp(el(r,{yaw:s,pitch:a,roll:o},n));Tp.set(c,u),Ep+=Vp(u);for(let[e,t]of Tp){if(Ep<=xp)break;Tp.delete(e),Ep-=Vp(t)}return u}
function Vp(e){return e.reduce((e,t)=>e+t.length,0)}
function Hp(e){if(e.length===1)return[nu(e)];let t=ru(e);return t===``?[]:[t]}
function Up(e,t,n,r){let i=t/2,a=i+e.offset[0]*e.zoom*i,o=i-e.offset[1]*e.zoom*i,s=o-e.squashAnchor*e.zoom*i,[c,l]=e.squash,u=n/r;return[c*u,l*u,a-c*n/2,s+l*(o-n/2-s)]}
function Wp(e){let t=[];for(let n of e.split(`Z`)){let e=n.replace(`M`,` `).trim().split(/\s+/).filter(e=>e!==``).map(Number);if(e.length<6)continue;let r=[];for(let t=0;t+1<e.length;t+=2)r.push([e[t],e[t+1]]);t.push(r)}return t}
var X=Math.PI*2;
function nm(e,t,n){let[r,i]=t;return Array.from({length:n},(t,a)=>{let o=a/n*X,s=Math.cos(o),c=Math.sin(o),l=r===0||i===0?0:1/Math.hypot(s/r,c/i);return[e[0]+s*l,e[1]+c*l]})}
function fm(e){return e.length===0?``:`M${e.map(([e,t])=>`${bm(e)} ${bm(t)}`).join(`L`)}Z`}
function bm(e){return String(Math.round(e*100)/100)}
var xm=[1,1];
function Sm(e,t){let n=e.length,r=-1;for(let t=0;t<n&&r<0;t++)e[t][2]<=0&&e[(t+1)%n][2]>0&&(r=t);if(r<0)return n===0||e[0][2]<=0?null:e.map(([e,t])=>({kind:`line`,to:[e,t]}));let i=[],a=[1,0],o=null;for(let s=0;s<n;s++){let c=e[(r+s)%n],l=e[(r+s+1)%n],u=c[2]>0,d=l[2]>0;if(u&&d)i.push({kind:`line`,to:[l[0],l[1]]});else if(u)o=Dm(c,l),i.push({kind:`line`,to:o});else if(d){let e=Dm(c,l);o===null?a=e:i.push(Om(o,e,t)),i.push({kind:`line`,to:[l[0],l[1]]})}}return o!==null&&i.push(Om(o,a,t)),i}
function Cm(e,t){let n=km(e,t),r=n.length;if(n.every(e=>e.isInside))return e;let i=-1;for(let e=0;e<r&&i<0;e++)n[e].isInside&&!n[(e+r-1)%r].isInside&&(i=e);if(i<0){let e=n.reduce((e,t)=>e+t.sweep,0);return Math.abs(e)>Math.PI?Tm(t,Math.sign(e)):null}let a=[],o=null,s=0;for(let e=0;e<r;e++){let c=n[(i+e)%r];c.isInside?(o!==null&&a.push({kind:`arc`,to:c.from,radii:t,sweep:s}),o=null,a.push(c.segment)):(o===null&&(o=c.from,s=0),s+=c.sweep)}return o!==null&&a.push({kind:`arc`,to:n[i].from,radii:t,sweep:s}),a}
function Tm(e,t){return[{kind:`arc`,to:[-e[0],0],radii:e,sweep:t*Math.PI},{kind:`arc`,to:[e[0],0],radii:e,sweep:t*Math.PI}]}
function Em(e,t){let n=Math.cos(t),r=Math.sin(t),i=1/Math.sqrt(n*n/(e[0]*e[0])+r*r/(e[1]*e[1]));return[i*n,i*r]}
function Dm(e,t){let n=e[2]/(e[2]-t[2]),r=e[0]+(t[0]-e[0])*n,i=e[1]+(t[1]-e[1])*n,a=Math.sqrt(r*r+i*i);return[r/a,i/a]}
function Om(e,t,n){return{kind:`arc`,to:t,radii:xm,sweep:Lm(Math.atan2(t[1],t[0])-n)-Lm(Math.atan2(e[1],e[0])-n)}}
function km(e,t){let n=1/(t[0]*t[0]),r=1/(t[1]*t[1]),i=e=>n*e[0]*e[0]+r*e[1]*e[1]-1,a=[],o=e[e.length-1].to;for(let t of e){if(t.kind===`line`){let e=Am(o,t.to,n,r),s=o;for(let n=0;n<=e.length;n++){let r=n===0?0:e[n-1],c=n===e.length?1:e[n],l=n===e.length?t.to:Im(o,t.to,c);a.push({from:s,segment:{kind:`line`,to:l},sweep:Math.atan2(s[0]*l[1]-s[1]*l[0],s[0]*l[0]+s[1]*l[1]),isInside:i(Im(o,t.to,(r+c)/2))<0}),s=l}}else{let e=t.radii[0],s=Math.atan2(o[1],o[0]),c=jm(e,s,t.sweep,n,r),l=o;for(let n=0;n<=c.length;n++){let r=n===0?0:c[n-1],o=n===c.length?1:c[n],u=s+t.sweep*o,d=n===c.length?t.to:[e*Math.cos(u),e*Math.sin(u)],f=s+t.sweep*(r+o)/2,p=t.sweep*(o-r);a.push({from:l,segment:{kind:`arc`,to:d,radii:t.radii,sweep:p},sweep:p,isInside:i([e*Math.cos(f),e*Math.sin(f)])<0}),l=d}}o=t.to}return a}
function Am(e,t,n,r){let i=t[0]-e[0],a=t[1]-e[1],o=n*i*i+r*a*a,s=n*e[0]*i+r*e[1]*a,c=n*e[0]*e[0]+r*e[1]*e[1]-1,l=s*s-o*c;if(o===0||l<=0)return[];let u=Math.sqrt(l),d=-(s+(s<0?-u:u));return[d/o,c/d].filter(e=>e>0&&e<1).sort((e,t)=>e-t)}
function jm(e,t,n,r,i){if(r===i||n===0)return[];let a=(1/(e*e)-i)/(r-i);if(!(a>0&&a<1))return[];let o=Math.acos(Math.sqrt(a)),s=[];for(let e of[o,-o,Math.PI-o,Math.PI+o]){let r=Rm(n>0?e-t:t-e)/Math.abs(n);r>0&&r<1&&s.push(r)}return s.sort((e,t)=>e-t)}
function Im(e,t,n){return[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n]}
function Lm(e){return e-2*Math.PI*Math.round(e/(2*Math.PI))}
function Rm(e){let t=e%(2*Math.PI);return t<0?t+2*Math.PI:t}
var zm=.02;
var Bm=16;
var Vm=.015;
var Hm=400;
var Um=512;
var Wm=5;
var Gm=new Map;
function Km(e,t){let n=Math.min(Bm,Math.max(0,Math.ceil(Math.log2(Math.max(t,1))))),r=`${n}|${e.wid}|${e.oval.join()}|${e.ovalMix}|${e.pts.join()}`,i=Gm.get(r);if(i!==void 0)return Gm.delete(r),Gm.set(r,i),i;let a=Xm(qm(e),zm/2**n);if(Gm.set(r,a),Gm.size>Um){let e=Gm.keys().next();e.done!==!0&&Gm.delete(e.value)}return a}
function qm(e){let[t,n]=e.oval,r=t>1e-5&&n>1e-5?e.ovalMix>1e-4?Math.min(1,e.ovalMix):Zm(0,.08,Math.min(t,n)):0,i=Math.max(0,e.pts.length-1),a=new Float64Array(i*Wm);for(let t=0;t<i;t++){let[n,r]=e.pts[t],i=e.pts[t+1][0]-n,o=e.pts[t+1][1]-r,s=i*i+o*o;a.set([n,r,i,o,s>0?1/s:0],t*Wm)}return{segments:a,halfWidth:e.wid>0?e.wid:-1,rx:t,ry:n,ellipseMix:r}}
function Jm(e,t,n){let r=Ym(e.segments,t,n)-e.halfWidth;if(e.ellipseMix===0)return r;let i=t/e.rx,a=n/e.ry,o=(Math.sqrt(i*i+a*a)-1)*Math.min(e.rx,e.ry);return r*(1-e.ellipseMix)+o*e.ellipseMix}
function Ym(e,t,n){let r=1e6;for(let i=0;i<e.length;i+=Wm){let a=t-e[i],o=n-e[i+1],s=e[i+2],c=e[i+3],l=(a*s+o*c)*e[i+4],u=l<0?0:l>1?1:l,d=a-s*u,f=o-c*u,p=d*d+f*f;p<r&&(r=p)}return Math.sqrt(r)}
function Xm(e,t){let n=1/0,r=1/0,i=-1/0,a=-1/0,o=1/0,{segments:s,halfWidth:c}=e;if(c>0&&e.ellipseMix<1&&s.length>0){for(let e=0;e<s.length;e+=Wm)for(let[t,o]of[[s[e],s[e+1]],[s[e]+s[e+2],s[e+1]+s[e+3]]])n=Math.min(n,t-c),r=Math.min(r,o-c),i=Math.max(i,t+c),a=Math.max(a,o+c);o=c}if(e.ellipseMix>0&&(n=Math.min(n,-e.rx),r=Math.min(r,-e.ry),i=Math.max(i,e.rx),a=Math.max(a,e.ry),o=Math.min(o,e.rx,e.ry)),!(i>n&&a>r))return[];let l=Math.max(Math.min(Vm,o/3),Math.max(i-n,a-r)/Hm);return sd((t,n)=>Jm(e,t,n),{x0:n-2*l,y0:r-2*l,step:l,nx:Math.ceil((i-n)/l)+4,ny:Math.ceil((a-r)/l)+4},{deviation:t,edge:Math.sqrt(4*t)})}
function Zm(e,t,n){let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)}
var ch=$r.map(_h);
var lh=192;
var uh=Math.PI/48;
function fh(e,t){if(e.eyes===null)return[];let n=Vr(e.quat),r=[Math.abs(e.squash[0]),Math.abs(e.squash[1])],i=r[0]<1||r[1]<1,a=[];return e.eyes.forEach((e,o)=>{for(let s of gh(e,$r[o],ch[o],n,t)){let e=i?Cm(s,r):s;e!==null&&a.push(e)}}),a}
function ph(e,t){let n=e.zoom*t/2,[r,i]=e.squash,a=[t/2+n*e.offset[0],t/2-n*(e.squashAnchor*(1-i)+e.offset[1])],o=Math.abs(n),s=([e,t])=>[a[0]+e*n,a[1]-t*n];return{center:a,radius:o,body:[nm(a,[Math.abs(r)*o,Math.abs(i)*o],lh)],eyes:fh(e,o).map(e=>mh(e).map(s))}}
function mh(e){let t=[],n=e[e.length-1]?.to??[0,0];for(let r of e){if(r.kind===`arc`){let e=Math.atan2(n[1],n[0]),i=Math.max(1,Math.ceil(Math.abs(r.sweep)/uh));for(let n=1;n<i;n++)t.push(Em(r.radii,e+r.sweep*n/i))}t.push(r.to),n=r.to}return t}
function gh(e,t,n,r,i){let a=Km(e,i*Math.max(1,e.lidY));if(a.length===0)return[];let o=Gr(r,t.M),s=Gr(r,t.C),c=Gr(r,t.T),l=Math.atan2(o[1],o[0]),u=Math.cos(e.tilt),d=Math.sin(e.tilt),[f,p]=e.off,m=([t,n])=>{let r=n*e.lidY,i=f+u*t+d*r,a=p-d*t+u*r,l=Math.sqrt(i*i+a*a),m=l>1e-12?Math.sin(l)/l:1,h=Math.cos(l);return[h*o[0]+m*(i*s[0]+a*c[0]),h*o[1]+m*(i*s[1]+a*c[1]),h*o[2]+m*(i*s[2]+a*c[2])]},h=[];for(let e of a){let t=e.map(m);n&&t.reverse();let r=Sm(t,l);r!==null&&h.push(r)}return h}
function _h({M:e,T:t,C:n}){let r=[n[1]*t[2]-n[2]*t[1],n[2]*t[0]-n[0]*t[2],n[0]*t[1]-n[1]*t[0]];return r[0]*e[0]+r[1]*e[1]+r[2]*e[2]<0}
function Hg(e,t,n){return t===`sphere`?ph({...e,body:t},n):Ap({...e,body:t},n)}
var s_=[0,0,0];
function c_(e,t){return t==null?{ink:s_,spot:s_,cutout:!0,inkPaint:e}:{ink:s_,spot:s_,cutout:!1,inkPaint:e,spotPaint:t}}

export { eo as createRig, Hg as contours, fm as polygonPath, no as extent, to as fill };
