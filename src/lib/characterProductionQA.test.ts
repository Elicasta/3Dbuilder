import { describe, expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { DEFAULT_CHARACTER } from '../types/character';
import { inspectMakeHumanProductionAsset } from './characterProductionQA';

function geometry(){
  const g=new BufferGeometry();
  const count=1200;
  const p=new Float32Array(count*3),uv=new Float32Array(count*2);
  for(let i=0;i<count;i++){p[i*3]=i%10;p[i*3+1]=Math.floor(i/10);uv[i*2]=(i%10)/9;uv[i*2+1]=(i%120)/119}
  g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));
  const idx:number[]=[];for(let i=0;i<1197;i+=3)idx.push(i,i+1,i+2);g.setIndex(idx);return g;
}
describe('studio production QA',()=>{
  it('refuses to mark an unrigged neutral mesh production-ready',()=>{
    const g=geometry();const r=inspectMakeHumanProductionAsset(g,DEFAULT_CHARACTER,null,null);g.dispose();
    expect(r.ready).toBe(false);expect(r.checks.find(c=>c.id==='skeleton')?.gate).toBe('fail');expect(r.checks.find(c=>c.id==='weights')?.gate).toBe('fail');
  });
  it('reports missing UVs as a hard failure',()=>{
    const g=geometry();g.deleteAttribute('uv');const r=inspectMakeHumanProductionAsset(g,DEFAULT_CHARACTER,null,null);g.dispose();
    expect(r.checks.find(c=>c.id==='uv')?.gate).toBe('fail');
  });
});
