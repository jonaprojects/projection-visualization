const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('./dist/math.js');
const close=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
for(const dim of [2,3])for(let i=0;i<100;i++){
 const v=Array.from({length:3},(_,j)=>j<dim?Math.sin(i+j*2)*4:0),u=Array.from({length:3},(_,j)=>j<dim?Math.cos(i+j)*3:0);
 const p=M.project(v,u);close(M.dot(M.sub(v,p),u),0);close(M.norm(M.sub(M.add(p,M.sub(v,p)),v)),0);
 const {basis}=M.orthonormalize([u,v,...(dim===3?[[1,2,3]]:[])]);
 basis.forEach((q,j)=>{close(M.norm(q),1);basis.slice(0,j).forEach(r=>close(M.dot(q,r),0));});
 const shadow=basis.map(q=>M.mul(q,M.dot(v,q))).reduce(M.add,[0,0,0]);basis.forEach(q=>close(M.dot(M.sub(v,shadow),q),0));
}
assert.equal(M.project([1,2,0],[0,0,0]),null);
assert.equal(M.orthonormalize([[1,2,3],[2,4,6],[0,0,0]]).basis.length,1);
// Exercise all six views and every walkthrough stage using a DOM/canvas harness.
const elements=new Map(),context2d=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function element(id){if(!elements.has(id))elements.set(id,{id,value:0,style:{},dataset:{},classList:{toggle(){}},getContext:()=>context2d,getBoundingClientRect:()=>({width:750,height:445}),querySelectorAll:()=>[],addEventListener(){},setAttribute(){}});return elements.get(id);}
let commands=0;
const assertVector=a=>{assert.equal(a.length,3);a.forEach(x=>assert.ok(Number.isFinite(x)));};
const scene={begin(){},end(){},line(a,b){assertVector(a);assertVector(b);commands++;},label(a){assertVector(a);},arrow(v,c,l,a){assertVector(v);assertVector(a);commands++;},plane(a,b){assertVector(a);assertVector(b);commands++;},guide(a){assertVector(a);}};
const env={ProjectionMath:M,katex:require('./dist/vendor/katex.min.js'),document:{getElementById:element,querySelectorAll:()=>[]},window:{addEventListener(){},vectorScene:scene},devicePixelRatio:1,setInterval,clearInterval,console};vm.createContext(env);vm.runInContext(fs.readFileSync('./dist/math-ui.js','utf8'),env);vm.runInContext(fs.readFileSync('./dist/app.js','utf8'),env);
for(const dim of [2,3])for(const mode of ['vector','subspace','gram']){
 vm.runInContext(`state.dim=${dim};state.mode='${mode}';state.subdim=${dim===3?2:1};setup();`,env);
 assert.ok(element('equation').innerHTML||element('equation').textContent);
 if(mode==='gram')vm.runInContext('for(let i=0;i<steps.length;i++){state.step=i;update();}',env);
}
vm.runInContext("state.mode='gram';state.dim=3;state.u=[0,0,0];state.v=[0,0,0];state.c=[0,0,0];setup();for(let i=0;i<steps.length;i++){state.step=i;update();}",env);
assert.ok(element('warning').textContent.includes('dependent'));
vm.runInContext("state.mode='subspace';state.subdim=2;setup();",env);
assert.ok(element('equation').innerHTML.includes('katex'));
assert.ok(commands>100,'3D geometry was exercised');
console.log('Passed: 200 projection/orthogonality cases, zero/dependent inputs, all six views, every Gram–Schmidt stage, strict LaTeX rendering, and finite 3D geometry.');
