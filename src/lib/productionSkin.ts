import type { CharacterState } from '../types/character';
import { buildCanonicalGeometry } from '../components/CanonicalBody';
import { canonicalJoints, type JointName } from './canonicalRig';

export type VertexInfluence = { joint: JointName; weight: number };
export type VertexSkin = { vertex: number; influences: VertexInfluence[] };

const ARM_L: JointName[]=['clavicleL','upperArmL','lowerArmL','handL'];
const ARM_R: JointName[]=['clavicleR','upperArmR','lowerArmR','handR'];
const LEG_L: JointName[]=['pelvis','upperLegL','lowerLegL','footL'];
const LEG_R: JointName[]=['pelvis','upperLegR','lowerLegR','footR'];
const CORE: JointName[]=['pelvis','spine01','spine02','chest','neck'];

function distance(a:[number,number,number],b:[number,number,number]){
  return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
}
function smoothstep(a:number,b:number,x:number){
  const t=Math.max(0,Math.min(1,(x-a)/(b-a)));
  return t*t*(3-2*t);
}
function normalize(items: VertexInfluence[]): VertexInfluence[] {
  const merged=new Map<JointName,number>();
  for(const item of items) merged.set(item.joint,(merged.get(item.joint)??0)+Math.max(0,item.weight));
  const top=[...merged].map(([joint,weight])=>({joint,weight})).sort((a,b)=>b.weight-a.weight).slice(0,4);
  const total=top.reduce((s,x)=>s+x.weight,0) || 1;
  return top.map(x=>({...x,weight:x.weight/total}));
}
function chainWeights(p:[number,number,number],names:JointName[],joints:Map<JointName,[number,number,number]>){
  return normalize(names.map(joint=>{
    const d=Math.max(.045,distance(p,joints.get(joint)!));
    return {joint,weight:1/(d*d)};
  }));
}
function coreWeights(y:number,joints:Map<JointName,[number,number,number]>){
  const anchors=CORE.map(name=>({name,y:joints.get(name)![1]}));
  if(y<=anchors[0].y) return [{joint:'pelvis' as JointName,weight:1}];
  if(y>=anchors.at(-1)!.y) return [{joint:'neck' as JointName,weight:1}];
  for(let i=0;i<anchors.length-1;i++){
    const a=anchors[i],b=anchors[i+1];
    if(y<=b.y){
      const t=smoothstep(a.y,b.y,y);
      return normalize([{joint:a.name,weight:1-t},{joint:b.name,weight:t}]);
    }
  }
  return [{joint:'chest',weight:1}];
}

/**
 * Phase 3 deformation weights.
 * The master cage keeps stable vertex IDs while this profile adds broad,
 * smooth transition zones around shoulders, hips, elbows and knees.
 */
export function productionSkinWeights(character: CharacterState): VertexSkin[] {
  const geometry=buildCanonicalGeometry(character);
  const position=geometry.getAttribute('position');
  const joints=new Map(canonicalJoints(character).map(j=>[j.name,j.position] as const));
  const shoulderY=joints.get('upperArmL')![1];
  const hipY=joints.get('upperLegL')![1];
  const hipX=Math.abs(joints.get('upperLegR')![0]);
  const shoulderX=Math.abs(joints.get('upperArmR')![0]);

  const result: VertexSkin[]=[];
  for(let vertex=0;vertex<position.count;vertex++){
    const p:[number,number,number]=[position.getX(vertex),position.getY(vertex),position.getZ(vertex)];
    const ax=Math.abs(p[0]);
    let influences:VertexInfluence[];
    if(p[1] < hipY+.28 && ax>hipX*.38){
      const side=p[0]<0?LEG_L:LEG_R;
      const limb=chainWeights(p,side,joints);
      // Groin/glute transition stays pelvis-led and gradually hands off to thigh.
      const limbMix=smoothstep(hipX*.38,hipX*1.05,ax)*smoothstep(hipY+.26,hipY-.10,p[1]);
      influences=normalize([
        {joint:'pelvis',weight:1-limbMix},
        ...limb.map(x=>({...x,weight:x.weight*limbMix}))
      ]);
    } else if(p[1] > shoulderY-.46 && ax>shoulderX*.42){
      const side=p[0]<0?ARM_L:ARM_R;
      const limb=chainWeights(p,side,joints);
      // Preserve chest volume at the armpit and hand off through clavicle/deltoid.
      const limbMix=smoothstep(shoulderX*.42,shoulderX*.98,ax);
      influences=normalize([
        {joint:'chest',weight:1-limbMix},
        ...limb.map(x=>({...x,weight:x.weight*limbMix}))
      ]);
    } else {
      influences=coreWeights(p[1],joints);
    }
    result.push({vertex,influences});
  }
  geometry.dispose();
  return result;
}

export function validateSkinWeights(weights: VertexSkin[]) {
  return weights.every((skin,index)=>
    skin.vertex===index &&
    skin.influences.length>0 &&
    skin.influences.length<=4 &&
    skin.influences.every(x=>Number.isFinite(x.weight)&&x.weight>=0&&x.weight<=1) &&
    Math.abs(skin.influences.reduce((s,x)=>s+x.weight,0)-1)<1e-5
  );
}

export type DeformationReport={pose:string;finite:boolean;minTriangleArea:number;collapsedTriangles:number;invertedTriangles:number};

/** Geometry-level regression metric. It catches NaNs, collapsed triangles and
 * winding inversions without depending on the Three.js renderer. */
export function deformationReport(base:import('three').BufferGeometry,posed:import('three').BufferGeometry,pose:string):DeformationReport{
  const a=base.getAttribute('position'),b=posed.getAttribute('position'),index=base.getIndex();
  if(!index||!posed.getIndex()) throw new Error('Canonical geometry must remain indexed');
  let finite=true,minTriangleArea=Infinity,collapsedTriangles=0,invertedTriangles=0;
  const tri=(attr:typeof a,ia:number,ib:number,ic:number)=>{
    const ax=attr.getX(ib)-attr.getX(ia),ay=attr.getY(ib)-attr.getY(ia),az=attr.getZ(ib)-attr.getZ(ia);
    const bx=attr.getX(ic)-attr.getX(ia),by=attr.getY(ic)-attr.getY(ia),bz=attr.getZ(ic)-attr.getZ(ia);
    const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
    return [nx,ny,nz,Math.hypot(nx,ny,nz)*.5] as const;
  };
  for(let i=0;i<b.count;i++) finite&&=Number.isFinite(b.getX(i))&&Number.isFinite(b.getY(i))&&Number.isFinite(b.getZ(i));
  for(let i=0;i<index.count;i+=3){
    const ia=index.getX(i),ib=index.getX(i+1),ic=index.getX(i+2);
    const t0=tri(a,ia,ib,ic),t1=tri(b,ia,ib,ic);
    minTriangleArea=Math.min(minTriangleArea,t1[3]);
    if(t1[3]<1e-7) collapsedTriangles++;
    if(t0[0]*t1[0]+t0[1]*t1[1]+t0[2]*t1[2]<0) invertedTriangles++;
  }
  return {pose,finite,minTriangleArea,collapsedTriangles,invertedTriangles};
}
