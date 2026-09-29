import { describe, expect, it } from 'vitest';
import type { CharacterState } from '../types/character';
import { FIT_KEYS, FIT_LIMITS } from './profileOptimizer';

function clamp(key:(typeof FIT_KEYS)[number],v:number){const [lo,hi]=FIT_LIMITS[key];return Math.max(lo,Math.min(hi,v))}
function surrogateWidths(m:CharacterState['morphs']){
  return {shoulder:.225*m.shoulders,chest:.205*m.chest,waist:.150*m.waist,hip:.180*m.hips,chestDepth:.130*m.chestDepth,hipDepth:.135*m.hipDepth};
}
function loss(a:ReturnType<typeof surrogateWidths>,b:ReturnType<typeof surrogateWidths>){
  const ks=Object.keys(a) as (keyof typeof a)[];return ks.reduce((s,k)=>s+Math.abs(a[k]-b[k])/Math.max(b[k],.001),0)/ks.length;
}
function optimizeSurrogate(seed:CharacterState['morphs'],truth:CharacterState['morphs'],noise=0){
  let cur={...seed},best=loss(surrogateWidths(cur),surrogateWidths(truth));
  for(let i=0;i<12;i++){
    const target=surrogateWidths(truth),got=surrogateWidths(cur);
    const errors={shoulders:(target.shoulder-got.shoulder)/target.shoulder,chest:(target.chest-got.chest)/target.chest,waist:(target.waist-got.waist)/target.waist,hips:(target.hip-got.hip)/target.hip,chestDepth:(target.chestDepth-got.chestDepth)/target.chestDepth,hipDepth:(target.hipDepth-got.hipDepth)/target.hipDepth};
    const gain=.34/Math.sqrt(i+1),next={...cur};
    for(const key of FIT_KEYS)next[key]=clamp(key,next[key]*(1+errors[key]*gain*(1+noise)));
    const l=loss(surrogateWidths(next),target);if(l>=best)break;cur=next;best=l;
  }
  return {morphs:cur,loss:best};
}
function base():CharacterState['morphs']{
  return {height:1,build:1,shoulders:1,chest:1,chestDepth:1,waist:1,waistDepth:1,hips:1,hipDepth:1,torsoLength:1,armLength:1,armThickness:1,legLength:1,legThickness:1,handSize:1,footSize:1,neckLength:1,neckThickness:1,headScale:1,craniumScale:1,faceWidth:1,faceDepth:1,jawWidth:1,jawHeight:1,chinWidth:1,chinProjection:1,cheekWidth:1,eyeScale:1,eyeSpacing:1,eyeHeight:1,browHeight:1,noseWidth:1,noseLength:1,noseProjection:1,mouthWidth:1,lipFullness:1,earSize:1,bust:1,bustProjection:1};
}
describe('profile optimizer torture invariants',()=>{
  it('recovers a broad legal body from a neutral seed in the linear identifiability surrogate',()=>{
    const truth={...base(),shoulders:1.16,chest:1.14,waist:.86,hips:1.12,chestDepth:1.17,hipDepth:1.15};
    const r=optimizeSurrogate(base(),truth);expect(r.loss).toBeLessThan(.025);
  });
  it('recovers a narrow legal body from the opposite side of parameter space',()=>{
    const truth={...base(),shoulders:.84,chest:.82,waist:1.18,hips:.83,chestDepth:.80,hipDepth:.81};
    const seed={...base(),shoulders:1.18,chest:1.20,waist:.80,hips:1.20,chestDepth:1.22,hipDepth:1.22};
    const r=optimizeSurrogate(seed,truth);expect(r.loss).toBeLessThan(.035);
  });
  it('never escapes declared parameter bounds under adversarial residuals',()=>{
    const truth={...base(),shoulders:3,chest:.1,waist:3,hips:.1,chestDepth:3,hipDepth:.1};
    const r=optimizeSurrogate(base(),truth,.5);
    for(const key of FIT_KEYS){const[lo,hi]=FIT_LIMITS[key];expect(r.morphs[key]).toBeGreaterThanOrEqual(lo);expect(r.morphs[key]).toBeLessThanOrEqual(hi)}
  });
  it('is invariant to global image scale because targets are dimensionless ratios',()=>{
    const truth={...base(),shoulders:1.1,chest:.9,waist:1.08,hips:.92,chestDepth:1.11,hipDepth:.89};
    const a=surrogateWidths(truth),scale=3.7;
    const normalized=Object.fromEntries(Object.entries(a).map(([k,v])=>[k,v*scale/scale]));
    expect(normalized).toEqual(a);
  });
});
