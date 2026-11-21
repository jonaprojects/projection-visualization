const {add,sub,mul,dot,norm,project,orthonormalize}=ProjectionMath;
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d');
const colors={v:'#9562cb',u:'#3c80bd',p:'#16846a',r:'#dc8950',q:'#16846a',grid:'#e4ebe7',axis:'#99afa5'};
let state={mode:'vector',dim:2,v:[3,3,4],u:[4,1,1],b:[-1,3,1],c:[1,-1,3],step:0,subdim:2,yaw:-.9,pitch:.55,zoom:48,depthGuides:true};
const viewport=$('viewport');
let use3D=false;
let timer=null,steps=[],geometry={},width=600,height=445,drag=null,hitTargets=[];
const fmt=x=>Math.abs(x)<.0005?'0':Number(x.toFixed(3)).toString();
const vec=v=>'('+v.slice(0,state.dim).map(fmt).join(', ')+')';
const active=v=>v.map((x,i)=>i<state.dim?x:0);
const metric=(a,b)=>`<div class="metric"><span>${a}</span><b>${b}</b></div>`;
const row=(name,key,color)=>`<div class="vector-row"><div class="vector-label" style="color:${color}"><span>${name}</span><span>coordinates</span></div><div class="coords">${['x','y','z'].slice(0,state.dim).map((axis,i)=>`<label>${axis}<input aria-label="${name} ${axis}" type="number" min="-8" max="8" step="0.25" data-key="${key}" data-index="${i}" value="${state[key][i]}"></label>`).join('')}</div></div>`;
function stop(){clearInterval(timer);timer=null;$('play').textContent='Play steps';}
function setup(){
 stop();state.step=0;
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===state.mode);b.setAttribute('aria-pressed',b.dataset.mode===state.mode);});
 document.querySelectorAll('[data-dim]').forEach(b=>{const on=+b.dataset.dim===state.dim;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});
 $('space-label').innerHTML=mathHTML(`\\mathbb{R}^{${state.dim}}`);
 $('camera-tools').hidden=state.dim!==3;
 viewport.style.cursor=state.dim===3?'grab':'default';
 $('hint').textContent=state.dim===2?'Drag vector tips to explore':'Drag to orbit · scroll to zoom · edit coordinates';
 $('stepper').hidden=state.mode!=='gram';
 $('inputs').dataset.gram=String(state.mode==='gram');
 if(state.mode==='vector'){
  $('scene-title').textContent='A vector and its shadow';$('chapter').textContent='THE PROJECTION';$('panel-title').textContent='How much of v is along u?';
  $('explanation').innerHTML=`Drop a perpendicular from ${mathHTML('v')} to the line through ${mathHTML('u')}. Its foot is the projection ${mathHTML('p')}; the leftover is ${mathHTML('r=v-p')}.`;
  $('inputs').innerHTML=row('v · source','v',colors.v)+row('u · target direction','u',colors.u);
 }else if(state.mode==='subspace'){
  $('scene-title').textContent='The closest vector in a subspace';$('chapter').textContent='THE SUBSPACE';$('panel-title').textContent='A shadow on a whole space';
  $('explanation').textContent='The basis vectors span W through the origin. We first orthonormalize the basis so the projection terms add correctly, even for a nonorthogonal basis.';
  if(state.dim===2)state.subdim=1;
  $('inputs').innerHTML=row('v · source','v',colors.v)+(state.dim===3?'<label class="vector-label">Subspace<select id="subdim"><option value="1">Line · span(b₁)</option><option value="2">Plane · span(b₁, b₂)</option></select></label>':'')+row('b₁ · basis vector','u',colors.u)+(state.subdim===2?row('b₂ · basis vector','b',colors.blue||colors.u):'');
  if($('subdim')){$('subdim').value=state.subdim;$('subdim').onchange=e=>{state.subdim=+e.target.value;setup();};}
 }else{
  $('scene-title').textContent='From independent to orthonormal';$('chapter').textContent='GRAM–SCHMIDT';$('panel-title').textContent='Remove. Normalize. Repeat.';
  $('explanation').textContent='Keep the new direction in each vector: subtract its projections onto the existing q vectors, then divide the remainder by its length.';
  $('inputs').innerHTML=row('v₁ · first vector','u',colors.u)+row('v₂ · second vector','v',colors.v)+(state.dim===3?row('v₃ · third vector','c',colors.r):'');
 }
 $('inputs').querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>{
  if(input.value===''||!Number.isFinite(input.valueAsNumber))return;
  state[input.dataset.key][+input.dataset.index]=Math.max(-8,Math.min(8,input.valueAsNumber));stop();update();
 }));update();
}
function buildSteps(records){
 const output=[{title:'Start with the original vectors',copy:'These vectors may overlap in direction. Build q₁, q₂, … one at a time.',formula:'uₖ = vₖ − Σⱼ₍ⱼ<ₖ₎ ⟨vₖ, qⱼ⟩qⱼ',kind:'start'}];
 let count=0;
 records.forEach((r,k)=>{
  const n=k+1;output.push({title:`Take v${subscript(n)}`,copy:count?`Find what v${subscript(n)} contributes beyond the ${count} direction${count>1?'s':''} already found.`:'Begin with the first vector. There are no previous directions to remove.',formula:`u${subscript(n)} = v${subscript(n)}`,kind:'take',k,removed:0});
  r.parts.forEach((p,j)=>output.push({title:`Subtract projection ${j+1} from v${subscript(n)}`,copy:`Remove the component along q${subscript(j+1)}. The dashed vector shows that projection; the orange arrow is the remaining vector.`,formula:`u${subscript(n)} = v${subscript(n)} − ${r.parts.slice(0,j+1).map((_,i)=>`⟨v${subscript(n)}, q${subscript(i+1)}⟩q${subscript(i+1)}`).join(' − ')}`,kind:'subtract',k,removed:j+1}));
  output.push({title:r.dependent?`v${subscript(n)} adds no new direction`:`Normalize to get q${subscript(count+1)}`,copy:r.dependent?'The remainder has length zero. This vector is dependent on the previous ones, so skip it.':`The remainder is perpendicular to all earlier q vectors. Divide by ${fmt(r.length)} to make its length 1.`,formula:r.dependent?'‖u‖ = 0 · skip this vector':`q${subscript(count+1)} = u${subscript(n)} / ‖u${subscript(n)}‖ = ${vec(r.q)}`,kind:'normalize',k,removed:r.parts.length});
  if(r.q)count++;
 });
 output.push({title:'An orthonormal system',copy:'Every green vector has length 1 and is perpendicular to all the others. Projections onto their span add: projW(v) = Σⱼ ⟨v, qⱼ⟩qⱼ.',formula:'⟨qᵢ, qⱼ⟩ = 0 (i ≠ j) · ‖qᵢ‖ = 1',kind:'done'});return output;
}
function subscript(n){return ['₀','₁','₂','₃'][n]||n;}
function update(){
 const v=active(state.v),u=active(state.u);$('warning').textContent='';geometry={v,u};
 if(state.mode==='vector'){
  const p=project(v,u);geometry.p=p;geometry.r=p?sub(v,p):null;
  $('equation').innerHTML=mathBlock(String.raw`p=\operatorname{proj}_u(v)=\frac{\langle v,u\rangle}{\langle u,u\rangle}u`)+(p?'<div class="equation-divider"></div>'+mathBlock('v=p+r')+mathBlock(`${columnTex(v.slice(0,state.dim))}=${columnTex(p.slice(0,state.dim))}+${columnTex(geometry.r.slice(0,state.dim))}`):'');
  $('metrics').innerHTML=p?metric('Projection length',mathHTML(`\\lVert p\\rVert=${fmt(norm(p))}`))+metric('Remainder length',mathHTML(`\\lVert r\\rVert=${fmt(norm(geometry.r))}`))+metric('Perpendicular',mathHTML(`\\langle r,u\\rangle=${fmt(dot(geometry.r,u))}`)):'';
  if(!p)$('warning').textContent='The target direction u is zero. Give it a nonzero coordinate to define a line.';
  legend([['Source v',colors.v],['Direction u',colors.u],['Projection p',colors.p],['Remainder r',colors.r]]);
 }else if(state.mode==='subspace'){
  const basis=[u,...(state.subdim===2?[active(state.b)]:[])],result=orthonormalize(basis);
  const parts=result.basis.map(q=>mul(q,dot(v,q))),p=parts.reduce(add,[0,0,0]);
  Object.assign(geometry,{p,r:sub(v,p),basis:result.basis,rawBasis:basis,parts});
  $('equation').innerHTML=mathBlock(String.raw`p=\operatorname{proj}_W(v)=\sum_{j=1}^{d}\langle v,q_j\rangle q_j`)+`<small>${mathHTML('q_1,\\ldots,q_d')} form an orthonormal basis for ${mathHTML('W')}.</small><div class="equation-divider"></div>`+mathBlock(`p=${parts.map(p=>columnTex(p.slice(0,state.dim))).join('+')||columnTex([0,0].slice(0,state.dim))}`)+mathBlock(`p=${columnTex(p.slice(0,state.dim))}`);
  $('metrics').innerHTML=metric('Actual dimension',mathHTML(`\\dim W=${result.basis.length}`))+metric('Distance to W',mathHTML(`\\lVert r\\rVert=${fmt(norm(geometry.r))}`))+metric('Orthogonality error',mathHTML(`\\max_j |\\langle r,q_j\\rangle|=${fmt(Math.max(0,...result.basis.map(q=>Math.abs(dot(geometry.r,q)))))}`));
  if(result.basis.length<basis.length)$('warning').textContent='The supplied basis is dependent. Its actual span is shown; redundant directions are skipped.';
  legend([['Source v',colors.v],['Subspace W',colors.u],['Projection sum p',colors.p],['Remainder r',colors.r]]);
 }else{
  const vectors=[u,v,...(state.dim===3?[active(state.c)]:[])],result=orthonormalize(vectors);steps=buildSteps(result.records);
  state.step=Math.min(state.step,steps.length-1);const step=steps[state.step];Object.assign(geometry,{vectors,result,step});
  $('step-range').max=steps.length-1;$('step-range').value=state.step;$('step-count').textContent=`Step ${state.step+1} of ${steps.length}`;$('step-title').textContent=step.title;$('step-copy').textContent=step.kind==='done'?'Every green vector has length 1 and is perpendicular to all the others. Together they form an orthonormal basis for the span of the inputs.':step.copy;$('equation').innerHTML=mathBlock(gramTex(step,result.records));
  if(step.kind==='done')$('equation').innerHTML+=mathBlock(String.raw`\operatorname{proj}_W(v)=\sum_j\langle v,q_j\rangle q_j`);
  $('prev').disabled=state.step===0;$('next').disabled=state.step===steps.length-1;
  const q=result.basis,maxError=Math.max(0,...q.flatMap((a,i)=>q.map((b,j)=>Math.abs(dot(a,b)-(i===j?1:0)))));
  $('metrics').innerHTML=metric('Independent directions',q.length+' / '+state.dim)+metric('Final orthonormal error',maxError<1e-10?'< 10⁻¹⁰':fmt(maxError));
  if(q.length<state.dim)$('warning').textContent='The inputs are dependent. Gram–Schmidt produces a basis for their span, with fewer directions.';
  legend([['Original vectors',colors.v],['Projection to remove',colors.u],['Remainder',colors.r],['Unit vectors qⱼ',colors.q]]);
 }
 draw();
}
function legend(items){$('legend').innerHTML=items.map(([name,c])=>`<span><i style="--c:${c}"></i>${name}</span>`).join('');}
function screen(v){
 let x=v[0],y=v[1],z=v[2]||0;
 if(state.dim===3){const a=state.yaw,b=state.pitch;const xx=Math.cos(a)*x-Math.sin(a)*y,yy=Math.sin(a)*x+Math.cos(a)*y;x=xx;y=Math.cos(b)*z-Math.sin(b)*yy;}
 return [width*.47+x*state.zoom,height*.55-y*state.zoom];
}
function line(a,b,color,w=1,dash=[]){if(use3D){window.vectorScene.line(a,b,color,w,dash);return;}const p=screen(a),q=screen(b);ctx.beginPath();ctx.setLineDash(dash);ctx.moveTo(...p);ctx.lineTo(...q);ctx.strokeStyle=color;ctx.lineWidth=w;ctx.stroke();ctx.setLineDash([]);}
function textAt(v,label,color,offset=[10,-10]){if(use3D){window.vectorScene.label(v,label,color,offset);return;}const p=screen(v);ctx.font='600 14px DM Sans, sans-serif';ctx.fillStyle=color;ctx.fillText(label,Math.max(6,Math.min(width-65,p[0]+offset[0])),Math.max(18,Math.min(height-7,p[1]+offset[1])));}
function arrow(v,color,label,origin=[0,0,0],dashed=false,handle=null){
 if(use3D){window.vectorScene.arrow(v,color,label,origin,dashed);return;}
 const end=add(origin,v),a=screen(origin),b=screen(end);line(origin,end,color,2.5,dashed?[6,5]:[]);
 const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);if(Math.hypot(b[0]-a[0],b[1]-a[1])>3){ctx.beginPath();ctx.moveTo(...b);ctx.lineTo(b[0]-10*Math.cos(angle-.38),b[1]-10*Math.sin(angle-.38));ctx.lineTo(b[0]-10*Math.cos(angle+.38),b[1]-10*Math.sin(angle+.38));ctx.closePath();ctx.fillStyle=color;ctx.fill();}
 if(label)textAt(end,label,color);
 if(handle&&state.dim===2){ctx.beginPath();ctx.arc(...b,6,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=color;ctx.stroke();hitTargets.push({p:b,key:handle});}
}
function plane(q1,q2){if(use3D){window.vectorScene.plane(q1,q2);return;}const range=4.5;const points=[add(mul(q1,-range),mul(q2,-range)),add(mul(q1,range),mul(q2,-range)),add(mul(q1,range),mul(q2,range)),add(mul(q1,-range),mul(q2,range))];ctx.beginPath();points.map(screen).forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle='#3c80bd0e';ctx.fill();for(let i=-4;i<=4;i++){line(add(mul(q1,-range),mul(q2,i)),add(mul(q1,range),mul(q2,i)),'#3c80bd23');line(add(mul(q2,-range),mul(q1,i)),add(mul(q2,range),mul(q1,i)),'#3c80bd23');}textAt(add(mul(q1,3.5),mul(q2,3.5)),'W','#3c80bd');}
function draw(){
 hitTargets=[];ctx.clearRect(0,0,width,height);const extent=7;
 use3D=state.dim===3&&!!window.vectorScene;
 canvas.hidden=state.dim===3;$('canvas3d').hidden=!use3D;$('labels3d').hidden=!use3D;
 $('webgl-message').hidden=state.dim!==3||use3D;
 if(state.dim===3&&!use3D)return;
 if(use3D){window.vectorScene.begin(state,width,height);if(state.depthGuides){const vectors=geometry.vectors||[geometry.v,geometry.u,geometry.p].filter(Boolean);vectors.forEach(v=>window.vectorScene.guide(v));}}
 if(state.dim===2){for(let i=-extent;i<=extent;i++){line([i,-extent,0],[i,extent,0],colors.grid);line([-extent,i,0],[extent,i,0],colors.grid);if(i&&i%2===0){textAt([i,0,0],String(i),'#96a89f',[-4,18]);textAt([0,i,0],String(i),'#96a89f',[-20,5]);}}}else{for(let i=-5;i<=5;i++){line([i,-5,0],[i,5,0],colors.grid);line([-5,i,0],[5,i,0],colors.grid);}}
 for(let i=0;i<state.dim;i++){const a=[0,0,0],b=[0,0,0];a[i]=use3D?-4.5:-6;b[i]=use3D?5:6;const c=use3D?['#b46d68','#659a7e','#6a8eb4'][i]:colors.axis;line(a,[0,0,0],use3D?c+'60':c,1,[3,4]);line([0,0,0],b,c,1.2);textAt(b,['x','y','z'][i],c,[5,5]);}textAt([0,0,0],'0','#91a59a',[-13,18]);
 const g=geometry;
 if(state.mode!=='gram'){
  if(state.mode==='vector'&&norm(g.u)>1e-8){const q=mul(g.u,1/norm(g.u));line(mul(q,-10),mul(q,10),'#3c80bd55',1.5);}
  if(g.basis){if(g.basis.length===2)plane(...g.basis);else if(g.basis.length===1){line(mul(g.basis[0],-10),mul(g.basis[0],10),'#3c80bd80',3);textAt(mul(g.basis[0],4.5),'W',colors.u);}
   g.rawBasis.forEach((b,i)=>arrow(b,'#3c80bdbb',`b${subscript(i+1)}`,[0,0,0],false,i?'b':'u'));
  }else arrow(g.u,colors.u,'u',[0,0,0],false,'u');
  arrow(g.v,colors.v,'v',[0,0,0],false,'v');
  if(g.p){
   if(g.parts?.length>1){let start=[0,0,0];g.parts.forEach((p,i)=>{arrow(p,'#16846a88',`p${subscript(i+1)}`,start,true);start=add(start,p);});}
   arrow(g.p,colors.p,'p');arrow(g.r,colors.r,'r',g.p,true);
   if(norm(g.p)>.15&&norm(g.r)>.15){const a=mul(g.p,-.22/norm(g.p)),b=mul(g.r,.22/norm(g.r));line(add(g.p,a),add(add(g.p,a),b),'#648b78');line(add(add(g.p,a),b),add(g.p,b),'#648b78');}
  }
 }else{
  const {vectors,result,step}=g;
  if(step.kind!=='done')vectors.forEach((v,i)=>arrow(v,step.kind==='start'?[colors.u,colors.v,colors.r][i]:'#b5bfc066',`v${subscript(i+1)}`,[0,0,0],false,['u','v','c'][i]));
  const finished=step.kind==='done'?result.records.length:step.k??0;
  let qi=0;result.records.forEach((r,k)=>{if(r.q){qi++;if(k<finished||(step.kind==='normalize'&&step.k===k))arrow(r.q,colors.q,`q${subscript(qi)}`,[0,0,0],false);}});
  if(step.k!==undefined){const r=result.records[step.k];let remaining=r.v.slice(),sum=[0,0,0];r.parts.slice(0,step.removed).forEach((p,j)=>{arrow(p,colors.u,`p${subscript(j+1)}`,sum,true);sum=add(sum,p);remaining=sub(remaining,p);});
   if(step.removed){arrow(remaining,colors.r,'remainder',sum,true);arrow(remaining,colors.r,`u${subscript(step.k+1)}`);}
   if(step.kind==='take')arrow(r.v,colors.v,`v${subscript(step.k+1)}`);
   if(step.kind==='normalize'&&r.q)line(r.r,r.q,'#16846a88',1,[3,5]);
  }
 }
 if(use3D)window.vectorScene.end();
}
function resize(){const r=viewport.getBoundingClientRect();width=r.width;height=r.height;const d=devicePixelRatio||1;canvas.width=width*d;canvas.height=height*d;ctx.setTransform(d,0,0,d,0,0);draw();}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;setup();});
document.querySelectorAll('[data-dim]').forEach(b=>b.onclick=()=>{state.dim=+b.dataset.dim;state.subdim=state.dim===3?2:1;setup();});
$('reset').onclick=()=>{Object.assign(state,{v:[3,3,4],u:[4,1,1],b:[-1,3,1],c:[1,-1,3],yaw:-.9,pitch:.55,zoom:48,cameraView:'perspective'});$('zoom').value=48;$('camera-view').value='perspective';setup();};
$('view-reset').onclick=()=>{state.yaw=-.9;state.pitch=.55;state.cameraView='perspective';$('camera-view').value='perspective';const keys=state.mode==='gram'?['u','v',...(state.dim===3?['c']:[])]:['u','v',...(state.mode==='subspace'&&state.subdim===2?['b']:[])];const max=Math.max(1,...keys.map(k=>norm(active(state[k]))),geometry.p?norm(geometry.p):0);state.zoom=state.dim===3?Math.max(10,Math.min(75,220/max)):Math.max(10,Math.min(65,Math.min(width,height)*.36/max));$('zoom').value=state.zoom;draw();};
$('zoom').oninput=e=>{state.zoom=+e.target.value;draw();};
$('step-range').oninput=e=>{stop();state.step=+e.target.value;update();};
$('prev').onclick=()=>{stop();state.step=Math.max(0,state.step-1);update();};$('next').onclick=()=>{stop();state.step=Math.min(steps.length-1,state.step+1);update();};
$('play').onclick=()=>{if(timer){stop();return;}if(state.step===steps.length-1)state.step=0;$('play').textContent='Pause';update();timer=setInterval(()=>{state.step++;update();if(state.step>=steps.length-1)stop();},2200);};
viewport.onpointerdown=e=>{if(e.target.closest?.('#camera-tools'))return;const r=viewport.getBoundingClientRect(),p=[e.clientX-r.left,e.clientY-r.top];const hit=hitTargets.find(t=>Math.hypot(t.p[0]-p[0],t.p[1]-p[1])<15);if(state.dim===2&&!hit)return;drag={key:hit?.key,x:e.clientX,y:e.clientY};viewport.setPointerCapture(e.pointerId);viewport.style.cursor='grabbing';};
viewport.onpointermove=e=>{if(!drag)return;if(state.dim===3){state.cameraView='perspective';$('camera-view').value='perspective';state.yaw-=(e.clientX-drag.x)*.008;state.pitch=Math.max(-1.5,Math.min(1.5,state.pitch+(e.clientY-drag.y)*.008));drag.x=e.clientX;drag.y=e.clientY;draw();}else{const r=viewport.getBoundingClientRect();state[drag.key][0]=Math.max(-8,Math.min(8,Math.round((e.clientX-r.left-width*.47)/state.zoom*20)/20));state[drag.key][1]=Math.max(-8,Math.min(8,Math.round((height*.55-e.clientY+r.top)/state.zoom*20)/20));document.querySelectorAll(`[data-key="${drag.key}"]`).forEach(i=>i.value=state[drag.key][i.dataset.index]);stop();update();}};
viewport.onpointerup=viewport.onpointercancel=()=>{drag=null;viewport.style.cursor=state.dim===3?'grab':'default';};
viewport.addEventListener('wheel',e=>{if(e.target.closest?.('#camera-tools'))return;e.preventDefault();state.zoom=Math.max(10,Math.min(85,state.zoom-e.deltaY*.04));$('zoom').value=state.zoom;draw();},{passive:false});
$('camera-view').onchange=e=>{state.cameraView=e.target.value;const views={perspective:[-.9,.55],xy:[-Math.PI/2,Math.PI/2-.0001],xz:[-Math.PI/2,0],yz:[0,0]};[state.yaw,state.pitch]=views[state.cameraView];draw();};
$('depth-guides').onchange=e=>{state.depthGuides=e.target.checked;draw();};
viewport.onkeydown=e=>{if(e.target!==viewport||state.dim!==3)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();state.cameraView='perspective';$('camera-view').value='perspective';state.yaw+=(e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0);state.pitch=Math.max(-1.5,Math.min(1.5,state.pitch+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0)));draw();}if(['+','=','-'].includes(e.key)){e.preventDefault();state.zoom=Math.max(10,Math.min(85,state.zoom+(e.key==='-'?-4:4)));$('zoom').value=state.zoom;draw();}};
window.addEventListener('scene3d-ready',draw);window.addEventListener('resize',resize);setup();resize();document.fonts?.ready.then(draw);
