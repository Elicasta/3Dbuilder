import { describe,expect,it } from 'vitest';
import { parseMakeHumanMaterial } from './makehumanMaterial';
describe('MakeHuman MHMAT',()=>{
  it('parses core surface and texture declarations',()=>{
    const m=parseMakeHumanMaterial(`diffuseColor 0.5 0.25 1
shininess 64
opacity 0.8
transparent true
diffuseTexture skin.png
normalmapTexture normal.png
aomapTexture ao.png`);
    expect(m.diffuseColor).toBe('#8040ff');
    expect(m.roughness).toBeCloseTo(.5);
    expect(m.opacity).toBe(.8);
    expect(m.transparent).toBe(true);
    expect(m.diffuseTexture).toBe('skin.png');
    expect(m.normalTexture).toBe('normal.png');
    expect(m.aoTexture).toBe('ao.png');
  });
});
