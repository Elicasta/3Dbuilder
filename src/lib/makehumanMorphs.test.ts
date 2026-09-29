import { describe, expect, it } from 'vitest';
import { BASE_MORPHS } from '../types/character';
import { resolveMakeHumanMacroTargets, resolveMakeHumanMorphTargets } from './makehumanMorphs';

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
      'macrodetails/universal-male-young-maxmuscle-maxweight.target',
      'macrodetails/height/male-young-maxmuscle-maxweight-maxheight.target',
      'macrodetails/height/male-young-maxmuscle-maxweight-minheight.target'
    ];
    const targets = resolveMakeHumanMacroTargets(
      'male',
      { ...BASE_MORPHS, height: 1.24, build: 1.38 },
      catalog
    );
    expect(targets.some((target) => target.path.endsWith('-maxheight.target'))).toBe(true);
    expect(targets.some((target) => target.path.endsWith('-minheight.target'))).toBe(false);
  });
});
