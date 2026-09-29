import { describe, expect, it } from 'vitest';
import { BASE_MORPHS } from '../types/character';
import { makeHumanAgeWeights, resolveMakeHumanAnatomyTargets, resolveMakeHumanMacroTargets, resolveMakeHumanMorphTargets } from './makehumanMorphs';

describe('MakeHuman modifier resolver', () => {
  it('uses exact MakeHuman measurement modifiers for body dimensions', () => {
    const catalog = [
      'measure/measure-shoulder-dist-decr.target',
      'measure/measure-shoulder-dist-incr.target',
      'measure/measure-waist-circ-decr.target',
      'measure/measure-waist-circ-incr.target'
    ];
    const targets = resolveMakeHumanMorphTargets(
      { ...BASE_MORPHS, shoulders: 1.2, waist: 0.8 },
      catalog
    );
    expect(targets.map((target) => target.path)).toEqual([
      'measure/measure-shoulder-dist-incr.target',
      'measure/measure-waist-circ-decr.target'
    ]);
  });

  it('uses paired in/out eye translations', () => {
    const catalog = [
      'eyes/l-eye-trans-in.target','eyes/r-eye-trans-in.target',
      'eyes/l-eye-trans-out.target','eyes/r-eye-trans-out.target'
    ];
    const targets = resolveMakeHumanMorphTargets(
      { ...BASE_MORPHS, eyeSpacing: 1.2 },
      catalog
    );
    expect(targets.map((target) => target.path).sort()).toEqual([
      'eyes/l-eye-trans-out.target','eyes/r-eye-trans-out.target'
    ]);
  });

  it('does not activate detailed targets at neutral values', () => {
    expect(resolveMakeHumanMorphTargets(BASE_MORPHS, [
      'head/head-scale-horiz-incr.target'
    ])).toEqual([]);
  });


  it('matches MakeHuman age interpolation landmarks', () => {
    expect(makeHumanAgeWeights(0)).toEqual([{ value: 'baby', weight: 1 }]);
    const child=makeHumanAgeWeights(0.1875);
    expect(child).toHaveLength(1);
    expect(child[0].value).toBe('child');
    expect(child[0].weight).toBeCloseTo(1,8);
    expect(makeHumanAgeWeights(0.5)).toEqual([{ value: 'young', weight: 1 }]);
    expect(makeHumanAgeWeights(1)).toEqual([{ value: 'old', weight: 1 }]);
  });

  it('selects different native macro targets for male and female', () => {
    const catalog = [
      'macrodetails/caucasian-male-young.target',
      'macrodetails/asian-male-young.target',
      'macrodetails/african-male-young.target',
      'macrodetails/caucasian-female-young.target',
      'macrodetails/asian-female-young.target',
      'macrodetails/african-female-young.target',
      'macrodetails/universal-male-young-averagemuscle-averageweight.target',
      'macrodetails/universal-female-young-averagemuscle-averageweight.target'
    ];
    const male = resolveMakeHumanMacroTargets('male', BASE_MORPHS, catalog);
    const female = resolveMakeHumanMacroTargets('female', BASE_MORPHS, catalog);
    expect(male.some((target) => target.path.includes('-male-young'))).toBe(true);
    expect(female.some((target) => target.path.includes('-female-young'))).toBe(true);
  });

  it('activates only maxheight at the maximum height endpoint', () => {
    const catalog = [
      'macrodetails/caucasian-male-young.target',
      'macrodetails/asian-male-young.target',
      'macrodetails/african-male-young.target',
      'macrodetails/universal-male-young-averagemuscle-averageweight.target',
      'macrodetails/height/male-young-averagemuscle-averageweight-maxheight.target',
      'macrodetails/height/male-young-averagemuscle-averageweight-minheight.target'
    ];
    const targets = resolveMakeHumanMacroTargets(
      'male',
      { ...BASE_MORPHS, height: 1.24, build: 1.38 },
      catalog
    );
    expect(targets.some((target) => target.path.endsWith('-maxheight.target'))).toBe(true);
    expect(targets.some((target) => target.path.endsWith('-minheight.target'))).toBe(false);
  });
  it('uses MakeHuman breast cup/firmness macro targets for female characters', () => {
    const catalog = [
      'macrodetails/caucasian-female-young.target',
      'macrodetails/asian-female-young.target',
      'macrodetails/african-female-young.target',
      'macrodetails/universal-female-young-averagemuscle-averageweight.target',
      'breast/female-young-averagemuscle-averageweight-maxcup-maxfirmness.target'
    ];
    const targets = resolveMakeHumanMacroTargets('female', BASE_MORPHS, catalog, {
      age:.5,muscle:.5,weight:.5,proportions:.5,breastSize:1,breastFirmness:1,
      african:1/3,asian:1/3,caucasian:1/3
    });
    expect(targets.some((target)=>target.path.startsWith('breast/female-young-'))).toBe(true);
  });


  it('resolves explicit male anatomy only through real MakeHuman target names', () => {
    const catalog=[
      'genitals/penis-length-incr.target',
      'genitals/penis-circ-decr.target',
      'genitals/penis-testicles-incr.target'
    ];
    const anatomy={
      mode:'detailed' as const,
      penisLength:1,penisGirth:0,testicleSize:.75,glansSize:.5,scrotumDrop:.5,
      vulvaWidth:.5,labiaMajora:.5,labiaMinora:.5,clitoralSize:.5,vaginalOpening:.5,monsPubis:.5
    };
    const targets=resolveMakeHumanAnatomyTargets('male',anatomy,catalog);
    expect(targets.map(t=>t.path).sort()).toEqual([
      'genitals/penis-circ-decr.target',
      'genitals/penis-length-incr.target',
      'genitals/penis-testicles-incr.target'
    ]);
  });

  it('keeps anatomy off and never invents native female genital targets', () => {
    const anatomy={
      mode:'off' as const,
      penisLength:1,penisGirth:1,testicleSize:1,glansSize:1,scrotumDrop:1,
      vulvaWidth:1,labiaMajora:1,labiaMinora:1,clitoralSize:1,vaginalOpening:1,monsPubis:1
    };
    expect(resolveMakeHumanAnatomyTargets('male',anatomy,['genitals/penis-length-incr.target'])).toEqual([]);
    expect(resolveMakeHumanAnatomyTargets('female',{...anatomy,mode:'detailed'},['genitals/penis-length-incr.target'])).toEqual([]);
  });

});