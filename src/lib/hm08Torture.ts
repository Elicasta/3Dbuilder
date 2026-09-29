import type { CharacterState } from '../types/character';
import { evaluateMakeHumanGeometry } from './makehumanCharacter';
import { measureCanonicalMesh } from './meshProfile';
import { FIT_KEYS, FIT_LIMITS, type FitKey, type FitTarget, optimizeProfileFit, syntheticTargetFromGeometry } from './profileOptimizer';

export const OBSERVATION_NAMES=['shoulderWidth','chestWidth','waistWidth','hipWidth','chestDepth','waistDepth','hipDepth'] as const;
type ObservationName=typeof OBSERVATION_NAMES[number];
export interface JacobianColumn {parameter:FitKey;sensitivity:number;derivatives:Record<ObservationName,number>}
export interface Coupling {a:FitKey;b:FitKey;cosine:number}
export interface RecoveryCase {name:string;initialLoss:number;finalLoss:number;improvement:number;parameterError:number;converged:boolean}
export interface TortureReport {jacobian:JacobianColumn[];deadParameters:FitKey[];couplings:Coupling[];conditionWarning:boolean;recoveries:RecoveryCase[];passed:boolean}

function vectorFromTarget(t:FitTarget){
  return [t.front?.shoulderWidth,t.front?.chestWidth,t.front?.waistWidth,t.front?.hipWidth,t.side?.chestWidth,t.side?.waistWidth,t.side?.hipWidth].map(v=>v??0);
}
async function targetFor(obj:string,state:CharacterState){
  const e=await evaluateMakeHumanGeometry(obj,state);try{return syntheticTargetFromGeometry(e.geometry)}finally{e.geometry.dispose()}
}
function dot(a:number[],b:number[]){return a.reduce((s,v,i)=>s+v*b[i],0)}
function norm(a:number[]){return Math.sqrt(dot(a,a))}
function parameterError(a:CharacterState,b:CharacterState){
  return FIT_KEYS.reduce((s,k)=>s+Math.abs(a.morphs[k]-b.morphs[k]),0)/FIT_KEYS.length;
}
export async function runHm08TortureTest(obj:string,base:CharacterState):Promise<TortureReport>{
  const eps=.01;
  const jacobian:JacobianColumn[]=[];
  const vectors=new Map<FitKey,number[]>();
  for(const key of FIT_KEYS){
    const [lo,hi]=FIT_LIMITS[key];
    const minus={...base,morphs:{...base.morphs,[key]:Math.max(lo,base.morphs[key]-eps)}};
    const plus={...base,morphs:{...base.morphs,[key]:Math.min(hi,base.morphs[key]+eps)}};
    const [a,b]=await Promise.all([targetFor(obj,minus),targetFor(obj,plus)]);
    const va=vectorFromTarget(a),vb=vectorFromTarget(b),den=Math.max(1e-6,plus.morphs[key]-minus.morphs[key]);
    const d=vb.map((v,i)=>(v-va[i])/den);vectors.set(key,d);
    const derivatives=Object.fromEntries(OBSERVATION_NAMES.map((name,i)=>[name,d[i]])) as Record<ObservationName,number>;
    jacobian.push({parameter:key,sensitivity:norm(d),derivatives});
  }
  const maxSensitivity=Math.max(...jacobian.map(c=>c.sensitivity),1e-9);
  const deadParameters=jacobian.filter(c=>c.sensitivity<maxSensitivity*.02).map(c=>c.parameter);
  const couplings:Coupling[]=[];
  for(let i=0;i<FIT_KEYS.length;i++)for(let j=i+1;j<FIT_KEYS.length;j++){
    const a=vectors.get(FIT_KEYS[i])!,b=vectors.get(FIT_KEYS[j])!,den=norm(a)*norm(b);
    const cosine=den?Math.abs(dot(a,b)/den):0;
    if(cosine>.94)couplings.push({a:FIT_KEYS[i],b:FIT_KEYS[j],cosine});
  }
  const cases=[
    {name:'broad-from-neutral',truth:{shoulders:1.16,chest:1.14,waist:.86,hips:1.12,chestDepth:1.17,hipDepth:1.15},seed:{}},
    {name:'narrow-from-opposite',truth:{shoulders:.84,chest:.82,waist:1.18,hips:.83,chestDepth:.80,hipDepth:.81},seed:{shoulders:1.18,chest:1.20,waist:.80,hips:1.18,chestDepth:1.22,hipDepth:1.22}},
    {name:'mixed-asymmetric-axes',truth:{shoulders:1.10,chest:.88,waist:1.12,hips:.90,chestDepth:1.16,hipDepth:.84},seed:{shoulders:.84,chest:1.18,waist:.82,hips:1.16,chestDepth:.80,hipDepth:1.20}}
  ] as const;
  const recoveries:RecoveryCase[]=[];
  for(const test of cases){
    const truth={...base,morphs:{...base.morphs,...test.truth}},seed={...base,morphs:{...base.morphs,...test.seed}};
    const target=await targetFor(obj,truth);
    const solved=await optimizeProfileFit(obj,seed,target,12);
    const result={...seed,morphs:{...seed.morphs,...solved.patch}};
    recoveries.push({name:test.name,initialLoss:solved.report.initialLoss,finalLoss:solved.report.bestLoss,improvement:solved.report.initialLoss-solved.report.bestLoss,parameterError:parameterError(result,truth),converged:solved.report.converged});
  }
  const conditionWarning=deadParameters.length>0||couplings.length>0;
  const passed=!conditionWarning&&recoveries.every(r=>r.finalLoss<r.initialLoss*.45&&r.parameterError<.08);
  return {jacobian,deadParameters,couplings,conditionWarning,recoveries,passed};
}
