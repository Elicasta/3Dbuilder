import { describe,expect,it } from 'vitest';
import { applyIdentityFit, type IdentityFit } from './reconstructionFit';
import { DEFAULT_CHARACTER } from '../types/character';

describe('shared identity fit',()=>{
  it('applies one fit to the editable canonical character',()=>{
    const fit={
      version:2,referenceCount:3,observations:[],
      macroPatch:{weight:.72},morphPatch:{shoulders:1.12,faceWidth:1.08},
      objective:{observation:.1,crossView:.08,confidence:.9,model:.06,total:.08},
      optimization:null,analysis:{}
    } as unknown as IdentityFit;
    const next=applyIdentityFit(DEFAULT_CHARACTER,fit);
    expect(next.macro.weight).toBe(.72);
    expect(next.morphs.shoulders).toBe(1.12);
    expect(next.morphs.faceWidth).toBe(1.08);
    expect(next.nativeModifiers).toEqual(DEFAULT_CHARACTER.nativeModifiers);
  });
});
