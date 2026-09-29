import { BufferGeometry, Float32BufferAttribute } from 'three';

/**
 * Minimal OBJ reader for the MakeHuman hm08 canonical body.
 *
 * MakeHuman hm08 base.obj already uses the runtime convention we want:
 * X left/right, Y up, Z depth, front toward +Z. Keep source positions exactly
 * in that space so vertex IDs, morph targets, rig landmarks and MHCLO offsets
 * all share one coordinate contract.
 */
export function parseMakeHumanObj(text: string): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  let faceGroup = '';

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();

    if (line.startsWith('g ')) {
      faceGroup = line.slice(2).trim().toLowerCase();
      continue;
    }

    if (line.startsWith('v ')) {
      const p = line.split(/\s+/);
      if (p.length >= 4) {
        const x = Number(p[1]);
        const y = Number(p[2]);
        const z = Number(p[3]);
        positions.push(x, y, z);
      }
      continue;
    }

    if (!line.startsWith('f ')) continue;
    if (faceGroup.startsWith('joint') || faceGroup.startsWith('helper')) continue;

    const refs = line
      .slice(2)
      .trim()
      .split(/\s+/)
      .map((token) => Number.parseInt(token.split('/')[0], 10) - 1)
      .filter((index) => Number.isInteger(index) && index >= 0);

    for (let i = 1; i + 1 < refs.length; i += 1) {
      indices.push(refs[0], refs[i], refs[i + 1]);
    }
  }

  if (!positions.length || !indices.length) {
    throw new Error('MakeHuman OBJ contains no usable visible geometry.');
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
