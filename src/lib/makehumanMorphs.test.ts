import { describe, expect, it } from 'vitest';
import { BASE_MORPHS } from '../types/character';
import { resolveMakeHumanMorphTargets } from './makehumanMorphs';

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
});
