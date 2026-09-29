import type { BufferGeometry } from 'three';

export interface MeshProfile {
  height:number;
  widthAt:(fraction:number)=>number|null;
  depthAt:(fraction:number)=>number|null;
}

function spanAt(geometry:BufferGeometry,fraction:number,axis:'x'|'z'){
  geometry.computeBoundingBox();
  const box=geometry.boundingBox;if(!box)return null;
  const p=geometry.getAttribute('position');
  const height=Math.max(.001,box.max.y-box.min.y);
  const y=box.max.y-height*fraction;
  const band=height*.008;
  let min=Infinity,max=-Infinity,count=0;
  for(let i=0;i<p.count;i++){
    if(Math.abs(p.getY(i)-y)>band)continue;
    const value=axis==='x'?p.getX(i):p.getZ(i);
    min=Math.min(min,value);max=Math.max(max,value);count++;
  }
  return count>=4?(max-min)/height:null;
}

export function measureCanonicalMesh(geometry:BufferGeometry):MeshProfile{
  geometry.computeBoundingBox();
  const box=geometry.boundingBox;
  const height=box?Math.max(.001,box.max.y-box.min.y):1;
  return {height,widthAt:(f)=>spanAt(geometry,f,'x'),depthAt:(f)=>spanAt(geometry,f,'z')};
}

export interface ProfileResidual {
  shoulder:number;chest:number;waist:number;hip:number;
  chestDepth:number;waistDepth:number;hipDepth:number;
  total:number;
}
function residual(model:number|null,target:number|null){
  if(model===null||target===null||target<=0)return 0;
  return (target-model)/Math.max(target,.001);
}
export function compareProfiles(mesh:MeshProfile,front:{shoulderWidth:number|null;chestWidth:number|null;waistWidth:number|null;hipWidth:number|null}|null,side:{chestWidth:number|null;waistWidth:number|null;hipWidth:number|null}|null):ProfileResidual{
  const r={
    shoulder:residual(mesh.widthAt(.29),front?.shoulderWidth??null),
    chest:residual(mesh.widthAt(.39),front?.chestWidth??null),
    waist:residual(mesh.widthAt(.50),front?.waistWidth??null),
    hip:residual(mesh.widthAt(.59),front?.hipWidth??null),
    chestDepth:residual(mesh.depthAt(.39),side?.chestWidth??null),
    waistDepth:residual(mesh.depthAt(.50),side?.waistWidth??null),
    hipDepth:residual(mesh.depthAt(.59),side?.hipWidth??null)
  };
  const values=Object.values(r);
  return {...r,total:values.reduce((s,v)=>s+Math.abs(v),0)/values.length};
}
