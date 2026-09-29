import { describe, expect, it } from 'vitest';
import { parseMakeHumanObj } from './makehumanObj';

describe('MakeHuman OBJ adapter', () => {
  it('preserves source vertex indices and triangulates quads', () => {
    const g=parseMakeHumanObj('v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4\n');
    expect(g.getAttribute('position').count).toBe(4);
    expect(g.getIndex()?.count).toBe(6);
  });
  it('filters MakeHuman helper and joint faces without renumbering vertices', () => {
    const g=parseMakeHumanObj([
      'v 0 0 0','v 1 0 0','v 1 1 0','v 0 1 0','v 0 0 1',
      'g body','f 1 2 3 4',
      'g helper-tights','f 1 2 5',
      'g joint-r-knee','f 2 3 5'
    ].join('\n'));
    expect(g.getAttribute('position').count).toBe(5);
    expect(g.getIndex()?.count).toBe(6);
  });
  it('preserves native MakeHuman Y-up coordinates', () => {
    const g=parseMakeHumanObj('v 1 2 3\nv 0 0 0\nv 0 1 0\nf 1 2 3\n');
    const p=g.getAttribute('position');
    expect([p.getX(0),p.getY(0),p.getZ(0)]).toEqual([1,2,3]);
  });
  it("keeps an upright body's dominant span on Y", () => {
    const g=parseMakeHumanObj('v -1 -2 -.4\nv 1 -2 .4\nv 0 2 .2\nf 1 2 3\n');
    g.computeBoundingBox(); const b=g.boundingBox!;
    expect(b.max.y-b.min.y).toBeGreaterThan(b.max.z-b.min.z);
  });
});
