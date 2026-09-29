import type { BufferGeometry } from 'three';

export interface MakeHumanBone {
  name: string;
  parent: string | null;
  head: [number, number, number];
  tail: [number, number, number];
}

type SkeletonFile = {
  bones: Record<string, { head: string; tail: string; parent: string | null }>;
  joints: Record<string, number[]>;
  license?: string;
  name?: string;
  weights_file?: string;
};

type WeightFile = {
  weights: Record<string, Array<[number, number]>>;
  license?: string;
};

function averageVertices(
  geometry: BufferGeometry,
  vertices: readonly number[]
): [number, number, number] {
  const position = geometry.getAttribute('position');
  let x = 0, y = 0, z = 0, count = 0;
  for (const vertex of vertices) {
    if (vertex < 0 || vertex >= position.count) continue;
    x += position.getX(vertex);
    y += position.getY(vertex);
    z += position.getZ(vertex);
    count += 1;
  }
  if (!count) throw new Error('MakeHuman rig landmark has no valid vertices.');
  return [x / count, y / count, z / count];
}

export function makeHumanBones(
  geometry: BufferGeometry,
  skeletonText: string
): MakeHumanBone[] {
  const skeleton = JSON.parse(skeletonText) as SkeletonFile;
  return Object.entries(skeleton.bones).map(([name, bone]) => {
    const headVertices = skeleton.joints[bone.head];
    const tailVertices = skeleton.joints[bone.tail];
    if (!headVertices || !tailVertices) {
      throw new Error(`MakeHuman rig landmark missing for ${name}.`);
    }
    return {
      name,
      parent: bone.parent,
      head: averageVertices(geometry, headVertices),
      tail: averageVertices(geometry, tailVertices)
    };
  });
}

export function makeHumanSkinWeights(weightText: string, vertexCount: number) {
  const source = JSON.parse(weightText) as WeightFile;
  const vertices: Array<Array<{ joint: string; weight: number }>> =
    Array.from({ length: vertexCount }, () => []);

  for (const [joint, entries] of Object.entries(source.weights)) {
    for (const [vertex, weight] of entries) {
      if (vertex >= 0 && vertex < vertexCount && weight > 0) {
        vertices[vertex].push({ joint, weight });
      }
    }
  }

  return vertices.map((influences, vertex) => {
    const top = influences.sort((a, b) => b.weight - a.weight).slice(0, 4);
    const total = top.reduce((sum, influence) => sum + influence.weight, 0);
    return {
      vertex,
      influences: total > 0
        ? top.map((influence) => ({ ...influence, weight: influence.weight / total }))
        : []
    };
  });
}
