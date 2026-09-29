import { describe, expect, it } from 'vitest';
import { BASE_MORPHS } from '../types/character';
import { resolveMakeHumanMacroTargets } from './makehumanMorphs';

describe('production morph invariants', () => {
  it('keeps macro resolution deterministic', () => {
    const catalog = [
      'macrodetails/caucasian-male-young.target',
      'macrodetails/asian-male-young.target',
      'macrodetails/african-male-young.target',
      'macrodetails/universal-male-young-averagemuscle-averageweight.target'
    ];
    expect(resolveMakeHumanMacroTargets('male', BASE_MORPHS, catalog))
      .toEqual(resolveMakeHumanMacroTargets('male', BASE_MORPHS, catalog));
  });
});
