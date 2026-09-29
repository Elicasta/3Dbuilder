import { useEffect, useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { CharacterState } from '../types/character';

type Ring = { y: number; rx: number; rz: number };
type ArmRing = { x: number; y: number; ry: number; rz: number };

function connectRings(indices: number[], a: number, b: number, segments: number, flip = false) {
  for (let s = 0; s < segments; s += 1) {
    const n = (s + 1) % segments;
    if (flip) indices.push(a+s, b+n, b+s, a+s, a+n, b+n);
    else indices.push(a+s, b+s, b+n, a+s, b+n, a+n);
  }
}

function buildBody(character: CharacterState) {
  const { morphs: m } = character;
  const h = m.height;
  const build = m.build;
  const floor = -1.92;
  const footY = floor + 0.13*h;
  const hipY = 0.62*h;
  const kneeY = hipY - Math.max(1.25, hipY-footY)*m.legLength*0.52;
  const ankleY = footY + 0.18;
  const shoulderY = 2.02*h*m.torsoLength;
  const hipX = 0.34*m.hips*build;
  const shoulderX = 0.70*m.shoulders*build;
  const elbowX = shoulderX + 0.72*m.armLength;
  const wristX = elbowX + 0.68*m.armLength;
  const armT = 0.82*m.armThickness*build;
  const legT = 0.92*m.legThickness*build;
  const seg = character.style === 'realHuman' ? 40 : 32;

  const vertices: number[] = [];
  const indices: number[] = [];

  // A single indexed surface. Torso, arms and legs are stitched through shared
  // junction loops instead of overlapping meshes, so shoulders and hips shade
  // as one body and this can become the stable deformation cage for rigging.
  const torso: Ring[] = [
    { y: 0.43*h, rx:.43*build*m.hips, rz:.30*build*m.hipDepth },
    { y: 0.56*h, rx:.53*build*m.hips, rz:.37*build*m.hipDepth },
    { y: 0.72*h, rx:.58*build*m.hips, rz:.40*build*m.hipDepth },
    { y: 0.98*h, rx:.50*build*m.waist, rz:.34*build*m.waistDepth },
    { y: 1.28*h*m.torsoLength, rx:.52*build*m.waist, rz:.36*build*m.waistDepth },
    { y: 1.52*h*m.torsoLength, rx:.67*build*m.chest, rz:.43*build*m.chestDepth },
    { y: 1.78*h*m.torsoLength, rx:.76*build*m.chest*m.shoulders, rz:.46*build*m.chestDepth },
    { y: shoulderY, rx:.72*build*m.shoulders, rz:.42*build*m.chestDepth },
    { y: 2.16*h*m.torsoLength, rx:.50*build*m.shoulders, rz:.37*build*m.chestDepth },
    { y: 2.28*h*m.torsoLength, rx:.29*m.neckThickness, rz:.25*m.neckThickness }
  ];

  const torsoStarts: number[] = [];
  torso.forEach(r => {
    torsoStarts.push(vertices.length/3);
    for (let s=0;s<seg;s++) {
      const a=s/seg*Math.PI*2;
      vertices.push(Math.cos(a)*r.rx,r.y,Math.sin(a)*r.rz);
    }
  });
  for(let r=0;r<torsoStarts.length-1;r++) connectRings(indices,torsoStarts[r],torsoStarts[r+1],seg);

  const addArm = (sign:number) => {
    const rings: ArmRing[] = [
      {x:sign*shoulderX*.78,y:shoulderY-.01,ry:.27*armT,rz:.235*armT},
      {x:sign*shoulderX*.98,y:shoulderY,ry:.25*armT,rz:.225*armT},
      {x:sign*(shoulderX+.36*m.armLength),y:shoulderY-.025,ry:.215*armT,rz:.20*armT},
      {x:sign*elbowX,y:shoulderY-.045,ry:.17*armT,rz:.165*armT},
      {x:sign*(elbowX+.34*m.armLength),y:shoulderY-.025,ry:.155*armT,rz:.15*armT},
      {x:sign*wristX,y:shoulderY,ry:.12*armT,rz:.115*armT}
    ];
    const starts:number[]=[];
    rings.forEach(r=>{
      starts.push(vertices.length/3);
      for(let s=0;s<seg;s++){
        const a=s/seg*Math.PI*2;
        vertices.push(r.x,r.y+Math.cos(a)*r.ry,Math.sin(a)*r.rz);
      }
    });
    for(let r=0;r<starts.length-1;r++) connectRings(indices,starts[r],starts[r+1],seg,sign<0);
    // Shoulder bridge closes into the upper torso rather than leaving a visible
    // sphere/tube intersection. The inset keeps the armpit readable in T-pose.
    const torsoStart=torsoStarts[7];
    for(let s=0;s<seg;s++){
      const n=(s+1)%seg;
      const ca=Math.cos(s/seg*Math.PI*2);
      const cn=Math.cos(n/seg*Math.PI*2);
      if(sign>0 ? (ca>-.18 || cn>-.18) : (ca<.18 || cn<.18)) continue;
      const ta=torsoStart+s, tn=torsoStart+n;
      const aa=starts[0]+s, an=starts[0]+n;
      indices.push(ta,aa,an,ta,an,tn);
    }
  };
  addArm(-1); addArm(1);

  const addLeg=(sign:number)=>{
    const rings=[
      {y:hipY+.18,x:sign*hipX,rx:.29*legT,rz:.255*legT},
      {y:hipY-.10,x:sign*hipX,rx:.27*legT,rz:.25*legT},
      {y:hipY-(hipY-kneeY)*.54,x:sign*hipX,rx:.245*legT,rz:.23*legT},
      {y:kneeY,x:sign*hipX,rx:.175*legT,rz:.17*legT},
      {y:(kneeY+ankleY)/2,x:sign*hipX,rx:.19*legT,rz:.18*legT},
      {y:ankleY,x:sign*hipX,rx:.125*legT,rz:.12*legT}
    ];
    const starts:number[]=[];
    rings.forEach(r=>{
      starts.push(vertices.length/3);
      for(let s=0;s<seg;s++){
        const a=s/seg*Math.PI*2;
        vertices.push(r.x+Math.cos(a)*r.rx,r.y,Math.sin(a)*r.rz);
      }
    });
    for(let r=0;r<starts.length-1;r++) connectRings(indices,starts[r],starts[r+1],seg);
    // Fan the top thigh into the pelvis center. This creates an actual crotch/
    // glute transition instead of two cylinders disappearing into the torso.
    const pelvis=torsoStarts[1];
    for(let s=0;s<seg;s++){
      const n=(s+1)%seg;
      const x0=vertices[(pelvis+s)*3], x1=vertices[(pelvis+n)*3];
      if(sign>0 ? Math.max(x0,x1)<0 : Math.min(x0,x1)>0) continue;
      indices.push(pelvis+s,starts[0]+s,starts[0]+n,pelvis+s,starts[0]+n,pelvis+n);
    }
  };
  addLeg(-1); addLeg(1);

  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export default function CanonicalBody({character}:{character:CharacterState}){
  const geometry=useMemo(()=>buildBody(character),[character]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow receiveShadow>
    <meshStandardMaterial color={character.appearance.skin} roughness={character.appearance.skinRoughness} metalness={0.02}/>
  </mesh>;
}
