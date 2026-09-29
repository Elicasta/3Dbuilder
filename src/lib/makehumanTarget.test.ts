import { describe, expect, it } from 'vitest';
import { applyMakeHumanTarget, parseMakeHumanTarget } from './makehumanTarget';

describe('MakeHuman hm08 target adapter', () => {
  it('preserves target displacement in native MakeHuman runtime axes', () => {
    const target = parseMakeHumanTarget('# basemesh hm08\n293 -0.0102 0.0087 0.0269\n');
    expect(target).toEqual([{ vertex: 293, x: -0.0102, y: 0.0087, z: 0.0269 }]);
  });

  it('applies sparse weighted targets without changing vertex count', () => {
    const base = new Float32Array([0,0,0, 1,2,3]);
    const result = applyMakeHumanTarget(base, [{ vertex: 1, x: .5, y: -.25, z: 1 }], .5);
    expect(Array.from(result)).toEqual([0,0,0, 1.25,1.875,3.5]);
    expect(result.length).toBe(base.length);
  });
});
