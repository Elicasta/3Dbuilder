import { describe, expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { makeHumanBones, makeHumanSkinWeights } from './makehumanRig';
import { applyMakeHumanPose, MAKEHUMAN_POSES, skinMakeHumanGeometry } from './makehumanSkinning';

describe('MakeHuman production skinning',()=>{
  it('binds imported influences and preserves normalized skin attributes',()=>{
    const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([0,0,0,0,1,0,.2,1,0],3));
    const defs=makeHumanBones(g,JSON.stringify({bones:{root:{head:'a',tail:'b',parent:null}},joints:{a:[0],b:[1]}}));
    const weights=makeHumanSkinWeights(JSON.stringify({weights:{root:[[0,1],[1,1],[2,1]]}}),3);
    const r=skinMakeHumanGeometry(g,defs,weights);
    expect(r.mesh.isSkinnedMesh).toBe(true);expect(g.getAttribute('skinIndex').count).toBe(3);expect(g.getAttribute('skinWeight').getX(2)).toBeCloseTo(1);
    r.geometry?.dispose?.();
  });
  it('pose battery never writes non-finite bone transforms',()=>{
    const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([0,0,0,0,1,0],3));
    const defs=makeHumanBones(g,JSON.stringify({bones:{root:{head:'a',tail:'b',parent:null}},joints:{a:[0],b:[1]}}));
    const weights=makeHumanSkinWeights(JSON.stringify({weights:{root:[[0,1],[1,1]]}}),2);
    const r=skinMakeHumanGeometry(g,defs,weights);
    for(const pose of Object.values(MAKEHUMAN_POSES)){applyMakeHumanPose(r.bones,pose);for(const b of r.bones)expect([b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w].every(Number.isFinite)).toBe(true)}
    g.dispose();
  });
});
