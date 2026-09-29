import { describe, expect, it } from 'vitest';
import { parseMakeHumanSliders, resolveNativeModifier } from './makehumanDefinitions';

describe('MakeHuman native definitions', () => {
  it('parses official task-view slider metadata and excludes macro controls', () => {
    const sliders = parseMakeHumanSliders(JSON.stringify({
      Face: { modifiers: { nose: [
        { mod: 'nose/nose-scale-depth-decr|incr', label: 'Scale depth', cam: 'leftView' },
        { mod: 'macrodetails/Age', label: 'Age' }
      ] } }
    }));
    expect(sliders).toEqual([{
      id: 'nose/nose-scale-depth-decr|incr',
      label: 'Scale depth',
      camera: 'leftView',
      category: 'Face',
      section: 'nose',
      bipolar: true
    }]);
  });

  it('resolves both directions of an official bipolar modifier exactly', () => {
    const catalog = [
      'nose/nose-scale-depth-decr.target',
      'nose/nose-scale-depth-incr.target'
    ];
    expect(resolveNativeModifier('nose/nose-scale-depth-decr|incr', -0.4, catalog))
      .toEqual([{ path: 'nose/nose-scale-depth-decr.target', weight: 0.4 }]);
    expect(resolveNativeModifier('nose/nose-scale-depth-decr|incr', 0.7, catalog))
      .toEqual([{ path: 'nose/nose-scale-depth-incr.target', weight: 0.7 }]);
  });

  it('resolves one-sided shape targets without inventing a second target', () => {
    const catalog = ['head/head-round.target'];
    expect(resolveNativeModifier('head/head-round', 0.6, catalog))
      .toEqual([{ path: 'head/head-round.target', weight: 0.6 }]);
  });
});
