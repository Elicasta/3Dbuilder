import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER } from '../types/character';
import { buildCanonicalGeometry } from '../components/CanonicalBody';
import { deformationReport, productionSkinWeights, validateSkinWeights } from './productionSkin';
import { POSES } from './pose';

describe('phase 3 production character contract',()=>{
  it('keeps topology vertex/index counts stable across body morphs',()=>{
    const base=buildCanonicalGeometry(DEFAULT_CHARACTER);
    const edited=buildCanonicalGeometry({...DEFAULT_CHARACTER,morphs:{...DEFAULT_CHARACTER.morphs,shoulders:1.25,hips:.82,armLength:1.18,legLength:.9}});
    expect(edited.getAttribute('position').count).toBe(base.getAttribute('position').count);
    expect(edited.getIndex()?.count).toBe(base.getIndex()?.count);
    base.dispose(); edited.dispose();
  });

  it('assigns normalized deterministic skin weights to every body vertex',()=>{
    const geometry=buildCanonicalGeometry(DEFAULT_CHARACTER);
    const weights=productionSkinWeights(DEFAULT_CHARACTER);
    expect(weights.length).toBe(geometry.getAttribute('position').count);
    expect(validateSkinWeights(weights)).toBe(true);
    expect(weights.every(v=>v.influences.length<=4)).toBe(true);
    geometry.dispose();
  });

  it('weights left and right extremities to their own side',()=>{
    const geometry=buildCanonicalGeometry(DEFAULT_CHARACTER);
    const position=geometry.getAttribute('position');
    const weights=productionSkinWeights(DEFAULT_CHARACTER);
    let left=-1,right=-1;
    for(let i=0;i<position.count;i++){
      if(position.getX(i)<-1.6 && left<0) left=i;
      if(position.getX(i)>1.6 && right<0) right=i;
    }
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(0);
    expect(weights[left].influences.some(x=>x.joint.endsWith('L'))).toBe(true);
    expect(weights[right].influences.some(x=>x.joint.endsWith('R'))).toBe(true);
    geometry.dispose();
  });

  it('keeps all six regression poses finite and free of collapsed triangles',()=>{
    const base=buildCanonicalGeometry(DEFAULT_CHARACTER,POSES.tPose);
    for(const [name,pose] of Object.entries(POSES)){
      const posed=buildCanonicalGeometry(DEFAULT_CHARACTER,pose);
      const report=deformationReport(base,posed,name);
      expect(report.finite,name).toBe(true);
      expect(report.collapsedTriangles,name).toBe(0);
      posed.dispose();
    }
    base.dispose();
  });

  it('blends shoulder and hip junctions instead of assigning a hard single-bone seam',()=>{
    const geometry=buildCanonicalGeometry(DEFAULT_CHARACTER);
    const p=geometry.getAttribute('position');
    const weights=productionSkinWeights(DEFAULT_CHARACTER);
    const blended=weights.filter((w,i)=>{
      const y=p.getY(i),x=Math.abs(p.getX(i));
      return w.influences.length>1 && ((y>1.65&&x>.3)||(y<1.0&&x>.12));
    });
    expect(blended.length).toBeGreaterThan(0);
    geometry.dispose();
  });
});
