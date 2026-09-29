export interface MakeHumanTargetDelta {
  vertex: number;
  x: number;
  y: number;
  z: number;
}

/**
 * Parse the documented MakeHuman .target format into the Y-up coordinates used
 * by 3D Builder. Target rows are stored as vertex, X, Z, inverted-Y.
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
    const storedZ = Number(parts[2]);
    const storedY = Number(parts[3]);
    if (![vertex, x, storedZ, storedY].every(Number.isFinite) || vertex < 0) continue;
    deltas.push({ vertex, x, y: -storedY, z: storedZ });
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
