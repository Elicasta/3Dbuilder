import { describe, expect, it } from 'vitest';
import { parseMakeHumanObj } from './makehumanObj';

describe('MakeHuman OBJ adapter', () => {
  it('preserves source vertex indices and triangulates quads', () => {
    const g=parseMakeHumanObj('v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4\n');
    expect(g.getAttribute('position').count).toBe(4);
    expect(g.getIndex()?.count).toBe(6);
  });
  it('converts MakeHuman Z-up positions to builder Y-up', () => {
    const g=parseMakeHumanObj('v 1 2 3\nv 0 0 0\nv 0 1 0\nf 1 2 3\n');
    const p=g.getAttribute('position');
    expect([p.getX(0),p.getY(0),p.getZ(0)]).toEqual([1,3,-2]);
  });
});
