import { describe, expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { geometryToObj } from './makehumanCharacter';

describe('MakeHuman production character contract', () => {
  it('exports indexed production geometry without renumbering vertices', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([0,0,0, 1,0,0, 0,1,0], 3));
    geometry.setIndex([0,1,2]);
    const obj = geometryToObj(geometry, 'TestBody');
    expect(obj).toContain('o TestBody');
    expect(obj.match(/^v /gm)).toHaveLength(3);
    expect(obj).toContain('f 1 2 3');
  });
});
