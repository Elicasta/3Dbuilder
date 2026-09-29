import { describe, expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { makeHumanBones, makeHumanSkinWeights } from './makehumanRig';

describe('MakeHuman rig adapter', () => {
  it('derives bone endpoints from stable morphed vertex landmarks', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([
      0,0,0, 2,0,0, 0,2,0, 2,2,0
    ], 3));
    const skeleton = JSON.stringify({
      bones: { test: { head: 'h', tail: 't', parent: null } },
      joints: { h: [0,1], t: [2,3] }
    });
    expect(makeHumanBones(geometry, skeleton)[0]).toEqual({
      name: 'test', parent: null, head: [1,0,0], tail: [1,2,0]
    });
  });

  it('limits and normalizes imported influences', () => {
    const weights = JSON.stringify({ weights: {
      a: [[0,0.5]], b: [[0,0.25]], c: [[0,0.125]], d: [[0,0.0625]], e: [[0,0.01]]
    }});
    const skin = makeHumanSkinWeights(weights, 1)[0];
    expect(skin.influences).toHaveLength(4);
    expect(skin.influences.reduce((sum, item) => sum + item.weight, 0)).toBeCloseTo(1);
  });
});
