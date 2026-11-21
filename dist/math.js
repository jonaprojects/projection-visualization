/* Euclidean vector operations, shared by the diagrams and numeric verification. */
(function(root){
 const add=(a,b)=>a.map((x,i)=>x+b[i]);
 const sub=(a,b)=>a.map((x,i)=>x-b[i]);
 const mul=(a,s)=>a.map(x=>x*s);
 const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
 const norm=a=>Math.sqrt(dot(a,a));
 const project=(v,u)=>dot(u,u)>1e-16?mul(u,dot(v,u)/dot(u,u)):null;
 function orthonormalize(vectors){
   const basis=[],records=[];
   vectors.forEach((v,index)=>{let r=v.slice();const parts=basis.map(q=>{const p=mul(q,dot(r,q));r=sub(r,p);return p;});
     const length=norm(r),dependent=length<1e-8*Math.max(1,norm(v));
     const q=dependent?null:mul(r,1/length);records.push({v,index,parts,r,length,q,dependent});if(q)basis.push(q);
   });return {basis,records};
 }
 root.ProjectionMath={add,sub,mul,dot,norm,project,orthonormalize};
 if(typeof module!=='undefined')module.exports=root.ProjectionMath;
})(typeof window!=='undefined'?window:globalThis);
