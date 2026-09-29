import { describe, expect, it } from 'vitest';
import { BASE_MORPHS } from '../types/character';
import { resolveMakeHumanMacroTargets, resolveMakeHumanMorphTargets } from './makehumanMorphs';

describe('MakeHuman morph resolver', () => {
  it('selects the correct directional target from a slider value', () => {
    const catalog = [
      'hip/hip-scale-horiz-decr.target',
      'hip/hip-scale-horiz-incr.target',
      'nose/nose-scale-depth-decr.target',
      'nose/nose-scale-depth-incr.target'
    ];
    const targets = resolveMakeHumanMorphTargets(
      { ...BASE_MORPHS, hips: 1.2, noseProjection: 0.8 },
      catalog
    );
    expect(targets.some((target) => target.path.endsWith('hip-scale-horiz-incr.target'))).toBe(true);
    expect(targets.some((target) => target.path.endsWith('nose-scale-depth-decr.target'))).toBe(true);
  });
  it('selects different native macro targets for male and female lanes', () => {
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
    expect(male.some((target) => target.path.includes('-female-young'))).toBe(false);
    expect(female.some((target) => target.path.includes('-female-young'))).toBe(true);
    expect(female.some((target) => target.path.includes('-male-young'))).toBe(false);
  });

  it('supports MakeHuman in/out directional controls such as eye spacing', () => {
    const catalog = [
      'eyes/l-eye-trans-in.target',
      'eyes/r-eye-trans-in.target',
      'eyes/l-eye-trans-out.target',
      'eyes/r-eye-trans-out.target'
    ];
    const targets = resolveMakeHumanMorphTargets({ ...BASE_MORPHS, eyeSpacing: 1.2 }, catalog);
    expect(targets.filter((target) => target.path.endsWith('-out.target'))).toHaveLength(2);
  });
});
