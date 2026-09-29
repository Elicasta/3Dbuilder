import { describe, expect, it } from 'vitest';
import { canonicalJoints } from './canonicalRig';
import { POSES } from './pose';
import { DEFAULT_CHARACTER } from '../types/character';

describe('canonical character studio contract', () => {
  it('starts with one editable character state and non-destructive detail layers', () => {
    expect(DEFAULT_CHARACTER.details.length).toBeGreaterThan(0);
    expect(DEFAULT_CHARACTER.details[0].type).toBe('tattoo');
    expect(DEFAULT_CHARACTER.details[0].enabled).toBe(false);
    expect(DEFAULT_CHARACTER.anatomy.mode).toBe('off');
  });

  it('keeps the humanoid rig available across the character workflow', () => {
    const joints = canonicalJoints(DEFAULT_CHARACTER);
    expect(joints.length).toBeGreaterThanOrEqual(23);
    expect(joints.some((joint) => joint.name === 'pelvis')).toBe(true);
    expect(joints.some((joint) => joint.name === 'head')).toBe(true);
  });

  it('keeps every pose preset finite so pose QA cannot poison the viewport', () => {
    for (const pose of Object.values(POSES)) {
      for (const value of Object.values(pose)) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });
});
