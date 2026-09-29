import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER } from '../types/character';
import { canonicalJoints } from './canonicalRig';
import { posedJoints } from './posedRig';
import { POSES } from './pose';

describe('phase 2 canonical rig', () => {
  it('has a rooted humanoid hierarchy with unique joints', () => {
    const joints=canonicalJoints(DEFAULT_CHARACTER);
    expect(joints.length).toBe(23);
    expect(new Set(joints.map(j=>j.name)).size).toBe(joints.length);
    expect(joints.find(j=>j.name==='root')?.parent).toBeNull();
    const names=new Set(joints.map(j=>j.name));
    for(const joint of joints) if(joint.parent) expect(names.has(joint.parent)).toBe(true);
  });

  it('keeps left and right landmarks symmetric in T pose', () => {
    const map=new Map(canonicalJoints(DEFAULT_CHARACTER).map(j=>[j.name,j.position]));
    expect(map.get('upperArmL')![0]).toBeCloseTo(-map.get('upperArmR')![0],6);
    expect(map.get('lowerLegL')![0]).toBeCloseTo(-map.get('lowerLegR')![0],6);
    expect(map.get('handL')![1]).toBeCloseTo(map.get('handR')![1],6);
  });

  it('responds to body morphs without disconnecting the rig', () => {
    const wide={...DEFAULT_CHARACTER,morphs:{...DEFAULT_CHARACTER.morphs,shoulders:1.3,armLength:1.2}};
    const base=new Map(canonicalJoints(DEFAULT_CHARACTER).map(j=>[j.name,j.position]));
    const changed=new Map(canonicalJoints(wide).map(j=>[j.name,j.position]));
    expect(Math.abs(changed.get('upperArmR')![0])).toBeGreaterThan(Math.abs(base.get('upperArmR')![0]));
    expect(Math.abs(changed.get('handR')![0])).toBeGreaterThan(Math.abs(base.get('handR')![0]));
  });

  it('pose presets move the expected downstream joints', () => {
    const t=new Map(posedJoints(DEFAULT_CHARACTER,POSES.tPose).map(j=>[j.name,j.position]));
    const relaxed=new Map(posedJoints(DEFAULT_CHARACTER,POSES.relaxed).map(j=>[j.name,j.position]));
    expect(relaxed.get('handL')![1]).toBeLessThan(t.get('handL')![1]);
    expect(relaxed.get('handR')![1]).toBeLessThan(t.get('handR')![1]);

    const knees=new Map(posedJoints(DEFAULT_CHARACTER,POSES.kneeTest).map(j=>[j.name,j.position]));
    expect(Math.abs(knees.get('footL')![2])).toBeGreaterThan(0.01);
    expect(Math.abs(knees.get('footR')![2])).toBeGreaterThan(0.01);
  });

  it('ships the phase 2 face parameter set in default recipes', () => {
    const m=DEFAULT_CHARACTER.morphs;
    expect(m.faceWidth).toBe(1);
    expect(m.eyeSpacing).toBe(1);
    expect(m.noseProjection).toBe(1);
    expect(m.lipFullness).toBe(1);
  });
});
