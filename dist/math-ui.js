/* Keep the actual LaTeX source available for inspection and accessible MathML. */
const mathHTML=(tex,display=false)=>katex.renderToString(tex,{
 displayMode:display,throwOnError:true,strict:'error',trust:false,output:'htmlAndMathml'
});
const mathBlock=tex=>`<div class="math-block">${mathHTML(tex,true)}</div>`;
const columnTex=v=>`\\begin{pmatrix}${v.map(x=>Math.abs(x)<.0005?'0':Number(x.toFixed(3)).toString()).join('\\\\')}\\end{pmatrix}`;
function gramTex(step,records){
 if(step.kind==='start')return String.raw`u_k=v_k-\sum_{j=1}^{k-1}\langle v_k,q_j\rangle q_j`;
 if(step.kind==='done')return String.raw`\langle q_i,q_j\rangle=\begin{cases}1&i=j\\0&i\ne j\end{cases}`;
 const k=step.k+1,r=records[step.k];
 if(step.kind==='take')return `u_{${k}}=v_{${k}}`;
 if(step.kind==='subtract'){
  const term=j=>`\\langle v_{${k}},q_${j}\\rangle q_${j}`;
  if(step.removed===1)return `u_{${k}}=v_{${k}}-${term(1)}`;
  return `\\begin{aligned}u_{${k}}&=v_{${k}}-${term(1)}\\\\&\\quad-${term(2)}\\end{aligned}`;
 }
 if(r.dependent)return `\\lVert u_{${k}}\\rVert=0\\quad\\text{(skip)}`;
 const q=records.slice(0,step.k+1).filter(x=>x.q).length;
 return `q_{${q}}=\\frac{u_{${k}}}{\\lVert u_{${k}}\\rVert}=${columnTex(r.q.slice(0,state.dim))}`;
}
document.querySelectorAll('[data-tex]').forEach(el=>{el.innerHTML=mathHTML(el.dataset.tex);});
