import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER } from '../types/character';
import { defaultsForLane } from './characterProfiles';

describe('human lane baselines',()=>{
  it('starts male and female from visibly different editable silhouettes',()=>{
    const male=defaultsForLane('male','realHuman',DEFAULT_CHARACTER);
    const female=defaultsForLane('female','realHuman',DEFAULT_CHARACTER);
    expect(male.morphs.shoulders).toBeGreaterThan(female.morphs.shoulders);
    expect(female.morphs.hips).toBeGreaterThan(male.morphs.hips);
    expect(female.morphs.waist).toBeLessThan(male.morphs.waist);
    expect(female.morphs.bust).toBeGreaterThan(male.morphs.bust);
    expect(male.morphs.jawWidth).toBeGreaterThan(female.morphs.jawWidth);
  });
});
