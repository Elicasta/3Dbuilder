import type { BufferGeometry } from 'three';

export interface MeshProfile {
  widthAt:(fraction:number)=>number|null;
  depthAt:(fraction:number)=>number|null;
}
function spanAt(geometry:BufferGeometry,fraction:number,axis:'x'|'z'){
  geometry.computeBoundingBox();
  const box=geometry.boundingBox;if(!box)return null;
  const p=geometry.getAttribute('position');
  const height=Math.max(.001,box.max.y-box.min.y);
  const y=box.max.y-height*fraction;
  const band=height*.012;
  const samples:number[]=[];
  for(let i=0;i<p.count;i++){
    if(Math.abs(p.getY(i)-y)<=band)samples.push(axis==='x'?p.getX(i):p.getZ(i));
  }
  if(samples.length<6)return null;
  samples.sort((a,b)=>a-b);
  // Ignore isolated helper/extreme vertices. A trimmed span is more stable than min/max.
  const lo=samples[Math.floor(samples.length*.03)];
  const hi=samples[Math.ceil(samples.length*.97)-1];
  return (hi-lo)/height;
}
export function measureCanonicalMesh(geometry:BufferGeometry):MeshProfile{
  return {widthAt:(f)=>spanAt(geometry,f,'x'),depthAt:(f)=>spanAt(geometry,f,'z')};
}
export interface ProfileResidual {
  shoulder:number;chest:number;waist:number;hip:number;
  chestDepth:number;waistDepth:number;hipDepth:number;
  total:number;valid:number;
}
function residual(model:number|null,target:number|null){
  if(model===null||target===null||target<=0)return null;
  return (target-model)/Math.max(target,.001);
}
export function compareProfiles(mesh:MeshProfile,front:{shoulderWidth:number|null;chestWidth:number|null;waistWidth:number|null;hipWidth:number|null}|null,side:{chestWidth:number|null;waistWidth:number|null;hipWidth:number|null}|null):ProfileResidual{
  const raw={
    shoulder:residual(mesh.widthAt(.29),front?.shoulderWidth??null),
    chest:residual(mesh.widthAt(.39),front?.chestWidth??null),
    waist:residual(mesh.widthAt(.50),front?.waistWidth??null),
    hip:residual(mesh.widthAt(.59),front?.hipWidth??null),
    chestDepth:residual(mesh.depthAt(.39),side?.chestWidth??null),
    waistDepth:residual(mesh.depthAt(.50),side?.waistWidth??null),
    hipDepth:residual(mesh.depthAt(.59),side?.hipWidth??null)
  };
  const values=Object.values(raw).filter((v):v is number=>v!==null);
  return {
    shoulder:raw.shoulder??0,chest:raw.chest??0,waist:raw.waist??0,hip:raw.hip??0,
    chestDepth:raw.chestDepth??0,waistDepth:raw.waistDepth??0,hipDepth:raw.hipDepth??0,
    total:values.length?values.reduce((s,v)=>s+Math.abs(v),0)/values.length:1,
    valid:values.length
  };
}
