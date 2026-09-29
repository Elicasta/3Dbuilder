import { BufferGeometry } from 'three';
import { parseMakeHumanObj } from './makehumanObj';

export interface MhcloScale { a: number; b: number; reference: number }
export interface MhcloVertexMap {
  vertices: [number, number, number];
  weights: [number, number, number];
  offset: [number, number, number];
}
export interface MhcloDefinition {
  objFile: string | null;
  material: string | null;
  uuid: string | null;
  name: string | null;
  xScale: MhcloScale | null;
  yScale: MhcloScale | null;
  zScale: MhcloScale | null;
  vertices: MhcloVertexMap[];
}

export function parseMhclo(text: string): MhcloDefinition {
  const result: MhcloDefinition = {
    objFile: null, material: null, uuid: null, name: null,
    xScale: null, yScale: null, zScale: null, vertices: []
  };
  let readingVertices = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) { readingVertices = false; continue; }
    const words = line.split(/\s+/);
    if (readingVertices && /^\d+$/.test(words[0])) {
      if (words.length === 1) {
        const v = Number(words[0]);
        result.vertices.push({ vertices: [v,v,v], weights: [1,0,0], offset: [0,0,0] });
      } else if (words.length >= 9) {
        result.vertices.push({
          vertices: [Number(words[0]),Number(words[1]),Number(words[2])],
          weights: [Number(words[3]),Number(words[4]),Number(words[5])],
          // Raw MHCLO offsets use MakeHuman axes. Convert to our X/Y-up/Z convention.
          offset: [Number(words[6]),Number(words[8]),-Number(words[7])]
        });
      }
      continue;
    }
    readingVertices = false;
    const scale = (): MhcloScale => ({ a:Number(words[1]), b:Number(words[2]), reference:Number(words[3]) });
    if (words[0] === 'verts') readingVertices = true;
    else if (words[0] === 'obj_file') result.objFile = words[1] ?? null;
    else if (words[0] === 'material') result.material = words[1] ?? null;
    else if (words[0] === 'uuid') result.uuid = words[1] ?? null;
    else if (words[0] === 'name') result.name = words.slice(1).join(' ') || null;
    else if (words[0] === 'x_scale') result.xScale = scale();
    else if (words[0] === 'y_scale') result.yScale = scale();
    else if (words[0] === 'z_scale') result.zScale = scale();
  }
  return result;
}

function axisScale(body: BufferGeometry, scale: MhcloScale | null, axis: 0|1|2): number {
  if (!scale || !Number.isFinite(scale.reference) || Math.abs(scale.reference) < 1e-8) return 1;
  const p = body.getAttribute('position');
  if (scale.a < 0 || scale.b < 0 || scale.a >= p.count || scale.b >= p.count) return 1;
  const value = (index:number) => axis === 0 ? p.getX(index) : axis === 1 ? p.getY(index) : p.getZ(index);
  return Math.abs(value(scale.a) - value(scale.b)) / Math.abs(scale.reference);
}

export function fitMhcloGeometry(
  definition: MhcloDefinition,
  objText: string,
  body: BufferGeometry
): BufferGeometry {
  const asset = parseMakeHumanObj(objText);
  const position = asset.getAttribute('position');
  const human = body.getAttribute('position');
  if (definition.vertices.length < position.count) {
    asset.dispose();
    throw new Error(`MHCLO maps ${definition.vertices.length} vertices but OBJ has ${position.count}.`);
  }
  const sx = axisScale(body, definition.xScale, 0);
  // MPFB swaps the legacy Y/Z scale references while converting MakeHuman to Blender.
  // Our parser has already converted MakeHuman Z-up OBJ coordinates to Y-up.
  const sy = axisScale(body, definition.zScale, 1);
  const sz = axisScale(body, definition.yScale, 2);
  const out = new Float32Array(position.count * 3);
  for (let i=0;i<position.count;i++) {
    const map=definition.vertices[i];
    let x=0,y=0,z=0;
    for(let j=0;j<3;j++) {
      const v=map.vertices[j], w=map.weights[j];
      if(v<0 || v>=human.count || !w) continue;
      x += human.getX(v)*w; y += human.getY(v)*w; z += human.getZ(v)*w;
    }
    out[i*3]=x+map.offset[0]*sx;
    out[i*3+1]=y+map.offset[1]*sy;
    out[i*3+2]=z+map.offset[2]*sz;
  }
  position.copyArray(out);
  position.needsUpdate=true;
  asset.computeVertexNormals(); asset.computeBoundingBox(); asset.computeBoundingSphere();
  return asset;
}

export function normalizeAssetWithBody(asset: BufferGeometry, bodyBeforeNormalization: BufferGeometry) {
  bodyBeforeNormalization.computeBoundingBox();
  const box=bodyBeforeNormalization.boundingBox;
  if(!box) return;
  const height=Math.max(0.001,box.max.y-box.min.y);
  const scale=4.05/height;
  const centerX=(box.min.x+box.max.x)*0.5;
  const centerZ=(box.min.z+box.max.z)*0.5;
  asset.scale(scale,scale,scale);
  asset.translate(-centerX*scale,-2.03-box.min.y*scale,-centerZ*scale);
  asset.computeVertexNormals(); asset.computeBoundingBox(); asset.computeBoundingSphere();
}

export function fittedAssetFromTexts(definitionText:string,objText:string,body:BufferGeometry){
  return fitMhcloGeometry(parseMhclo(definitionText),objText,body);
}
