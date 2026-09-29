import { describe, expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { fitMhcloGeometry, parseMhclo } from './makehumanAsset';

describe('MakeHuman MHCLO fitting', () => {
  it('parses exact and barycentric vertex mappings', () => {
    const parsed=parseMhclo(`obj_file eyes.obj
x_scale 0 1 2
verts 0
0
0 1 2 0.5 0.25 0.25 1 2 3
`);
    expect(parsed.objFile).toBe('eyes.obj');
    expect(parsed.vertices[0]).toEqual({vertices:[0,0,0],weights:[1,0,0],offset:[0,0,0]});
    expect(parsed.vertices[1]).toEqual({vertices:[0,1,2],weights:[0.5,0.25,0.25],offset:[1,2,3]});
  });

  it('fits an asset vertex to the evaluated hm08 body mapping', () => {
    const body=new BufferGeometry();
    body.setAttribute('position',new Float32BufferAttribute([0,0,0, 2,0,0, 0,2,0],3));
    const definition=parseMhclo(`obj_file test.obj
x_scale 0 1 2
verts 0
0 1 2 0.5 0.25 0.25 1 0 0
`);
    const obj=`v 0 0 0
v 0 0 0
v 0 0 0
f 1 2 3
`;
    const fitted=fitMhcloGeometry(definition,obj,body);
    const p=fitted.getAttribute('position');
    // weighted base = (0.5,0.5,0); x scale = |0-2|/2 = 1; offset x = 1
    expect(p.getX(0)).toBeCloseTo(1.5);
    expect(p.getY(0)).toBeCloseTo(0.5);
    expect(p.getZ(0)).toBeCloseTo(0);
    fitted.dispose(); body.dispose();
  });
});
