import * as THREE from './vendor/three.module.min.js';

/* All positions stay in world coordinates (z is up). Perspective, lighting,
   depth testing, and mesh arrowheads supply the missing spatial cues. */
class VectorScene {
 constructor(canvas,labels){
  this.labels=labels;this.canvas=canvas;
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  this.renderer.setClearColor(0xf9fbfa,1);
  this.scene=new THREE.Scene();
  this.scene.add(new THREE.AmbientLight(0xffffff,2));
  const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(5,-8,12);this.scene.add(key);
  this.perspective=new THREE.PerspectiveCamera(40,1,.1,250);
  this.orthographic=new THREE.OrthographicCamera(-5,5,5,-5,.1,250);
  this.perspective.up.set(0,0,1);this.orthographic.up.set(0,0,1);
  this.group=new THREE.Group();this.scene.add(this.group);this.tags=[];
 }
 begin(state,width,height){
  this.group.traverse(obj=>{obj.geometry?.dispose();if(obj.material)for(const m of [].concat(obj.material))m.dispose();});
  this.group.clear();this.tags=[];this.labels.replaceChildren();this.width=width;this.height=height;this.state=state;
  if(this.canvas.width!==Math.round(width*this.renderer.getPixelRatio())||this.canvas.height!==Math.round(height*this.renderer.getPixelRatio()))this.renderer.setSize(width,height,false);
  const aspect=width/height,distance=15*Math.max(1,1/aspect)*48/state.zoom;
  this.camera=state.cameraView&&state.cameraView!=='perspective'?this.orthographic:this.perspective;
  if(this.camera===this.orthographic){const half=distance*Math.tan(20*Math.PI/180);Object.assign(this.camera,{left:-half*aspect,right:half*aspect,top:half,bottom:-half});}
  else this.camera.aspect=aspect;
  const elev=state.pitch,az=state.yaw;
  this.camera.position.set(distance*Math.cos(elev)*Math.cos(az),distance*Math.cos(elev)*Math.sin(az),distance*Math.sin(elev));
  this.camera.up.set(0,0,1);this.camera.lookAt(0,0,0);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
 }
 color(value){return {color:value.slice(0,7),opacity:value.length===9?parseInt(value.slice(7),16)/255:1};}
 line(a,b,value,width=1,dash=[]){
  const style=this.color(value),geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]);
  const material=dash.length?new THREE.LineDashedMaterial({...style,dashSize:.12,gapSize:.09,transparent:style.opacity<1,depthWrite:false}):new THREE.LineBasicMaterial({...style,transparent:style.opacity<1,depthWrite:false});
  const object=new THREE.Line(geometry,material);if(dash.length)object.computeLineDistances();this.group.add(object);
 }
 segment(a,b,radius,material){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),dir=end.clone().sub(start),length=dir.length();if(length<1e-8)return;
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12),material);
  mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());this.group.add(mesh);
 }
 arrow(v,value,label,origin=[0,0,0],dashed=false){
  const start=new THREE.Vector3(...origin),dir=new THREE.Vector3(...v),length=dir.length();if(length<1e-7)return;
  dir.normalize();const end=start.clone().addScaledVector(dir,length),head=Math.min(.24,length*.3),style=this.color(value);
  const mat=new THREE.MeshPhongMaterial({...style,transparent:style.opacity<1,shininess:35,depthWrite:style.opacity>.9});
  const shaftEnd=end.clone().addScaledVector(dir,-head);
  if(dashed){for(let t=0;t<length-head;t+=.22){const a=start.clone().addScaledVector(dir,t),b=start.clone().addScaledVector(dir,Math.min(t+.12,length-head));this.segment(a.toArray(),b.toArray(),.018,mat.clone());}mat.dispose();}
  else this.segment(start.toArray(),shaftEnd.toArray(),.025,mat);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(Math.min(.085,length*.12),head,18),new THREE.MeshPhongMaterial({...style,transparent:style.opacity<1,shininess:35}));
  cone.position.copy(end).addScaledVector(dir,-head*.5);cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);this.group.add(cone);
  if(label)this.label(end.toArray(),label,style.color,[11,-13],true);
 }
 plane(q1,q2){
  // A finite patch represents the infinite subspace. Always include the
  // projected vector and the basis tips so no on-plane point appears outside it.
  const extent=Math.max(4,...[this.state.v,this.state.u,this.state.b].flatMap(v=>[q1,q2].map(q=>Math.abs(v.reduce((s,x,i)=>s+x*q[i],0)))))+.5;
  const points=[[-extent,-extent],[extent,-extent],[extent,extent],[-extent,extent]].map(([a,b])=>q1.map((x,i)=>x*a+q2[i]*b));
  const geom=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([points[0],points[1],points[2],points[0],points[2],points[3]].flat(),3));geom.computeVertexNormals();
  const mesh=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color:0x3c80bd,opacity:.13,transparent:true,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));mesh.renderOrder=-1;this.group.add(mesh);
  const combine=(a,b)=>q1.map((x,j)=>x*a+q2[j]*b);
  for(let i=Math.ceil(-extent);i<=Math.floor(extent);i++){this.line(combine(-extent,i),combine(extent,i),'#3c80bd40');this.line(combine(i,-extent),combine(i,extent),'#3c80bd40');}
  points.forEach((p,i)=>this.line(p,points[(i+1)%4],'#3c80bd90'));
  this.label(combine(-extent*.75,extent*.75),'W','#3c80bd');
 }
 guide(v){
  if(Math.abs(v[2])<1e-5)return;
  const floor=[v[0],v[1],0];this.line(v,floor,'#adbac180',1,[4,4]);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.045,10,8),new THREE.MeshBasicMaterial({color:0x95a9a0}));dot.position.set(...floor);this.group.add(dot);
 }
 label(position,text,color,offset=[8,-8],important=false){this.tags.push({position,text,color,offset,important});}
 end(){
  this.renderer.render(this.scene,this.camera);
  const boxes=[];
  // Reserve the camera controls and keep labels attached to their actual marks.
  for(const tag of this.tags.sort((a,b)=>Number(b.important)-Number(a.important))){
   const p=new THREE.Vector3(...tag.position).project(this.camera);if(p.z>1||p.z< -1||Math.abs(p.x)>.96||Math.abs(p.y)>.95)continue;
   const x=(p.x+1)*this.width/2,y=(1-p.y)*this.height/2,el=document.createElement('span');
   el.className='world-label';el.style.color=tag.color;
   const tex=tag.text==='remainder'?'\\text{remainder}':tag.text.replace(/[₀₁₂₃]/g,x=>'_'+['₀','₁','₂','₃'].indexOf(x));
   el.innerHTML=mathHTML(tex);this.labels.appendChild(el);
   const w=el.offsetWidth,h=el.offsetHeight;let chosen=null;
   for(const [dx,dy] of [tag.offset,[12,8],[-w-10,-h-6],[10,-h-25],[-w-10,12],[18,25]]){
    const b={x:x+dx,y:y+dy,w,h};if(b.x<5||b.y<5||b.x+w>this.width-5||b.y+h>this.height-5)continue;
    if(!boxes.some(a=>b.x<a.x+a.w+4&&b.x+w+4>a.x&&b.y<a.y+a.h+3&&b.y+h+3>a.y)){chosen=b;break;}
   }
   if(!chosen){el.remove();continue;}boxes.push(chosen);el.style.left=chosen.x+'px';el.style.top=chosen.y+'px';
  }
 }
}
try{window.vectorScene=new VectorScene(document.getElementById('canvas3d'),document.getElementById('labels3d'));}
catch(error){console.error('3D renderer unavailable:',error);document.getElementById('webgl-message').textContent='3D rendering requires WebGL. Try enabling hardware acceleration in your browser; the 2D examples remain available.';}
window.dispatchEvent(new Event('scene3d-ready'));
