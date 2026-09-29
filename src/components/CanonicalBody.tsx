import { useEffect, useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { CharacterState } from '../types/character';
import { POSES, type PoseState } from '../lib/pose';

type Ring = { y: number; rx: number; rz: number };
type ArmRing = { x: number; y: number; ry: number; rz: number };

function connectRings(indices: number[], a: number, b: number, segments: number, flip = false) {
  for (let s = 0; s < segments; s += 1) {
    const n = (s + 1) % segments;
    if (flip) indices.push(a+s, b+n, b+s, a+s, a+n, b+n);
    else indices.push(a+s, b+s, b+n, a+s, b+n, a+n);
  }
}

export function buildCanonicalGeometry(character: CharacterState, pose: PoseState = POSES.tPose) {
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
  const neckBaseY = 2.28*h*m.torsoLength;
  const neckTopY = 2.47*h*m.torsoLength + (m.neckLength-1)*.18;
  const headY = 2.72*h*m.torsoLength + (m.neckLength-1)*.18;
  const headRx = .44*m.headScale*m.faceWidth*(character.lane==='alien'?m.craniumScale*1.08:1);
  const headRy = .56*m.headScale*m.craniumScale;
  const headRz = .43*m.headScale*m.faceDepth*(character.lane==='alien'?m.craniumScale:1);

  const vertices: number[] = [];
  const indices: number[] = [];
  const armRanges: Array<{ start:number; end:number; sign:number }> = [];
  const legRanges: Array<{ start:number; end:number; sign:number }> = [];
  const addEllipsoid=(cx:number,cy:number,cz:number,rx:number,ry:number,rz:number,lat=12,lon=seg)=>{
    // Offset the poles by a tiny latitude ring instead of fanning every
    // longitude into one coincident point. This avoids zero-area pole faces
    // while preserving a fixed vertex/index count across every head morph.
    const rings:number[]=[];
    for(let y=0;y<=lat;y++){
      const phi=Math.PI*(y+.35)/(lat+.7), start=vertices.length/3; rings.push(start);
      for(let s=0;s<lon;s++){
        const a=s/lon*Math.PI*2;
        vertices.push(cx+Math.sin(phi)*Math.cos(a)*rx,cy+Math.cos(phi)*ry,cz+Math.sin(phi)*Math.sin(a)*rz);
      }
    }
    for(let y=0;y<rings.length-1;y++) connectRings(indices,rings[y],rings[y+1],lon);
  };

  // A single indexed surface. Torso, arms and legs are stitched through shared
  // junction loops instead of overlapping meshes, so shoulders and hips shade
  // as one body and this can become the stable deformation cage for rigging.
  const torso: Ring[] = [
    // Denser landmark loops make this useful as a deformation cage rather than
    // just a display shell. Extra loops sit around groin, waist, rib cage,
    // shoulder girdle and neck where a humanoid rig needs predictable bending.
    { y: 0.40*h, rx:.40*build*m.hips, rz:.29*build*m.hipDepth },
    { y: 0.48*h, rx:.48*build*m.hips, rz:.34*build*m.hipDepth },
    { y: 0.58*h, rx:.55*build*m.hips, rz:.39*build*m.hipDepth },
    { y: 0.72*h, rx:.58*build*m.hips, rz:.40*build*m.hipDepth },
    { y: 0.88*h, rx:.54*build*m.waist, rz:.36*build*m.waistDepth },
    { y: 1.04*h, rx:.49*build*m.waist, rz:.33*build*m.waistDepth },
    { y: 1.25*h*m.torsoLength, rx:.52*build*m.waist, rz:.36*build*m.waistDepth },
    { y: 1.47*h*m.torsoLength, rx:.63*build*m.chest, rz:.42*build*m.chestDepth },
    { y: 1.67*h*m.torsoLength, rx:.72*build*m.chest, rz:.46*build*m.chestDepth },
    { y: 1.84*h*m.torsoLength, rx:.77*build*m.chest*m.shoulders, rz:.46*build*m.chestDepth },
    { y: shoulderY, rx:.72*build*m.shoulders, rz:.42*build*m.chestDepth },
    { y: 2.12*h*m.torsoLength, rx:.60*build*m.shoulders, rz:.39*build*m.chestDepth },
    { y: 2.20*h*m.torsoLength, rx:.43*build*m.shoulders, rz:.34*build*m.chestDepth },
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

  // Phase 3.4: neck and head now belong to the exported canonical body instead
  // of existing only as viewport decoration. The neck uses predictable rings
  // and the head is a fixed-index ellipsoid so morphs never change topology.
  const neckStarts:number[]=[];
  [
    // torsoStarts[-1] already IS the neck base. Do not duplicate that ring:
    // connecting coincident 32-vertex loops produced exactly 64 zero-area faces.
    {y:(neckBaseY+neckTopY)*.5,rx:.275*m.neckThickness,rz:.245*m.neckThickness},
    {y:neckTopY,rx:.30*m.neckThickness,rz:.27*m.neckThickness}
  ].forEach(r=>{
    neckStarts.push(vertices.length/3);
    for(let s=0;s<seg;s++){const a=s/seg*Math.PI*2;vertices.push(Math.cos(a)*r.rx,r.y,Math.sin(a)*r.rz);}
  });
  connectRings(indices,torsoStarts[torsoStarts.length-1],neckStarts[0],seg);
  connectRings(indices,neckStarts[0],neckStarts[1],seg);
  addEllipsoid(0,headY,0,headRx,headRy,headRz,character.style==='realHuman'?16:12,seg);

  const addArm = (sign:number) => {
    const limbStart = vertices.length / 3;
    const rings: ArmRing[] = [
      {x:sign*shoulderX*.72,y:shoulderY-.03,ry:.29*armT,rz:.245*armT},
      {x:sign*shoulderX*.88,y:shoulderY+.015,ry:.275*armT,rz:.235*armT},
      {x:sign*shoulderX*1.02,y:shoulderY,ry:.25*armT,rz:.225*armT},
      {x:sign*(shoulderX+.30*m.armLength),y:shoulderY-.025,ry:.22*armT,rz:.205*armT},
      {x:sign*(elbowX-.13*m.armLength),y:shoulderY-.04,ry:.185*armT,rz:.175*armT},
      {x:sign*elbowX,y:shoulderY-.045,ry:.17*armT,rz:.165*armT},
      {x:sign*(elbowX+.13*m.armLength),y:shoulderY-.04,ry:.17*armT,rz:.16*armT},
      {x:sign*(elbowX+.40*m.armLength),y:shoulderY-.02,ry:.15*armT,rz:.145*armT},
      {x:sign*(wristX-.11*m.armLength),y:shoulderY-.005,ry:.13*armT,rz:.125*armT},
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
    const torsoStart=torsoStarts[10];
    for(let s=0;s<seg;s++){
      const n=(s+1)%seg;
      const ca=Math.cos(s/seg*Math.PI*2);
      const cn=Math.cos(n/seg*Math.PI*2);
      // The torso ring is parameterized with x = cos(angle) * radius.
      // Keep the hemisphere on the SAME side as the arm. The previous test was
      // reversed, which stitched each arm toward the opposite side of the chest
      // and produced the pinched/cross-body shoulder visible in profile views.
      if(sign>0 ? (ca<.18 || cn<.18) : (ca>-.18 || cn>-.18)) continue;
      const ta=torsoStart+s, tn=torsoStart+n;
      const aa=starts[0]+s, an=starts[0]+n;
      indices.push(ta,aa,an,ta,an,tn);
    }
    armRanges.push({ start: limbStart, end: vertices.length / 3, sign });
  };
  addArm(-1); addArm(1);

  const addLeg=(sign:number)=>{
    const limbStart = vertices.length / 3;
    const rings=[
      {y:hipY+.20,x:sign*hipX,rx:.30*legT,rz:.265*legT},
      {y:hipY+.06,x:sign*hipX,rx:.295*legT,rz:.26*legT},
      {y:hipY-.12,x:sign*hipX,rx:.275*legT,rz:.25*legT},
      {y:hipY-(hipY-kneeY)*.42,x:sign*hipX,rx:.245*legT,rz:.225*legT},
      {y:kneeY+.12,x:sign*hipX,rx:.19*legT,rz:.18*legT},
      {y:kneeY,x:sign*hipX,rx:.175*legT,rz:.17*legT},
      {y:kneeY-.12,x:sign*hipX,rx:.18*legT,rz:.17*legT},
      {y:(kneeY+ankleY)/2,x:sign*hipX,rx:.19*legT,rz:.18*legT},
      {y:ankleY+.10,x:sign*hipX,rx:.135*legT,rz:.13*legT},
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
    const pelvis=torsoStarts[2];
    for(let s=0;s<seg;s++){
      const n=(s+1)%seg;
      const x0=vertices[(pelvis+s)*3], x1=vertices[(pelvis+n)*3];
      if(sign>0 ? Math.max(x0,x1)<0 : Math.min(x0,x1)>0) continue;
      indices.push(pelvis+s,starts[0]+s,starts[0]+n,pelvis+s,starts[0]+n,pelvis+n);
    }
    legRanges.push({ start: limbStart, end: vertices.length / 3, sign });
  };
  addLeg(-1); addLeg(1);

  // Lightweight linear skinning for the generated cage. It is intentionally
  // deterministic and uses the same landmarks as the rig overlay. Phase 3 can
  // replace these procedural weights with authored/corrective weights without
  // changing the character recipe.
  const rotZ=(i:number,px:number,py:number,a:number)=>{
    const x=vertices[i]-px,y=vertices[i+1]-py,co=Math.cos(a),si=Math.sin(a);
    vertices[i]=px+x*co-y*si; vertices[i+1]=py+x*si+y*co;
  };
  const rotX=(i:number,py:number,pz:number,a:number)=>{
    const y=vertices[i+1]-py,z=vertices[i+2]-pz,co=Math.cos(a),si=Math.sin(a);
    vertices[i+1]=py+y*co-z*si; vertices[i+2]=pz+y*si+z*co;
  };
  // Pose only the actual limb vertex blocks. Earlier we selected vertices by
  // spatial proximity, which accidentally grabbed chest/shoulder and pelvis
  // vertices and produced the sharp collapsing wedges visible in pose tests.
  for(const range of armRanges){
    const side=range.sign;
    const shoulderAngle=side<0?pose.leftShoulderZ:pose.rightShoulderZ;
    const elbowAngle=side<0?pose.leftElbowZ:pose.rightElbowZ;
    const ex=side*elbowX, ey=shoulderY-.045;
    const dx=ex-side*shoulderX,dy=ey-shoulderY,co=Math.cos(shoulderAngle),si=Math.sin(shoulderAngle);
    const pex=side*shoulderX+dx*co-dy*si, pey=shoulderY+dx*si+dy*co;
    for(let v=range.start;v<range.end;v++){
      const i=v*3;
      const originalX=vertices[i];
      rotZ(i,side*shoulderX,shoulderY,shoulderAngle);
      if(Math.abs(originalX)>elbowX-.08) rotZ(i,pex,pey,elbowAngle);
    }
  }
  for(const range of legRanges){
    const side=range.sign;
    const hipAngle=side<0?pose.leftHipX:pose.rightHipX;
    const kneeAngle=side<0?pose.leftKneeX:pose.rightKneeX;
    const ky=hipY+(kneeY-hipY)*Math.cos(hipAngle);
    const kz=(kneeY-hipY)*Math.sin(hipAngle);
    for(let v=range.start;v<range.end;v++){
      const i=v*3;
      const originalY=vertices[i+1];
      rotX(i,hipY,0,hipAngle);
      if(originalY<kneeY+.12) rotX(i,ky,kz,kneeAngle);
    }
  }

  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export default function CanonicalBody({character,pose}:{character:CharacterState;pose:PoseState}){
  const geometry=useMemo(()=>buildCanonicalGeometry(character,pose),[character,pose]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow receiveShadow>
    <meshStandardMaterial color={character.appearance.skin} roughness={character.appearance.skinRoughness} metalness={0.02}/>
  </mesh>;
}
