export interface MakeHumanTargetDelta {
  vertex: number;
  x: number;
  y: number;
  z: number;
}

/**
 * hm08 .target rows serialize the MakeHuman displacement in the same effective
 * X/Y-up/Z-depth space as base.obj, despite the historical X/Z/Y naming used
 * by Blender-facing documentation. Keep the three numeric components in file
 * order so targets deform the Y-up hm08 basemesh along the correct axes.
 */
export function parseMakeHumanTarget(text: string): MakeHumanTargetDelta[] {
  const deltas: MakeHumanTargetDelta[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('"')) continue;
    const parts = line.split(/\s+/);
    if (parts.length !== 4) continue;
    const vertex = Number.parseInt(parts[0], 10);
    const x = Number(parts[1]);
    const y = Number(parts[2]);
    const z = Number(parts[3]);
    if (![vertex, x, y, z].every(Number.isFinite) || vertex < 0) continue;
    deltas.push({ vertex, x, y, z });
  }
  return deltas;
}

export function applyMakeHumanTarget(
  base: Float32Array,
  deltas: readonly MakeHumanTargetDelta[],
  weight: number
): Float32Array {
  const result = new Float32Array(base);
  for (const delta of deltas) {
    const i = delta.vertex * 3;
    if (i + 2 >= result.length) continue;
    result[i] += delta.x * weight;
    result[i + 1] += delta.y * weight;
    result[i + 2] += delta.z * weight;
  }
  return result;
}
