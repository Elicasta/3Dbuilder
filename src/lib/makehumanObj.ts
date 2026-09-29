import { BufferGeometry, Float32BufferAttribute } from 'three';

/** Minimal OBJ reader for the MakeHuman canonical body. Keeps source vertex IDs stable. */
export function parseMakeHumanObj(text: string): BufferGeometry {
  const positions:number[]=[];
  const indices:number[]=[];
  for(const raw of text.split(/\r?\n/)){
    const line=raw.trim();
    if(line.startsWith('v ')){
      const p=line.split(/\s+/);
      if(p.length>=4){
        const x=Number(p[1]), y=Number(p[2]), z=Number(p[3]);
        // MakeHuman OBJ is Z-up. 3D Builder/Three is Y-up.
        positions.push(x,z,-y);
      }
    } else if(line.startsWith('f ')){
      const refs=line.slice(2).trim().split(/\s+/).map(x=>Number.parseInt(x.split('/')[0],10)-1);
      for(let i=1;i+1<refs.length;i++) indices.push(refs[0],refs[i],refs[i+1]);
    }
  }
  if(!positions.length || !indices.length) throw new Error('MakeHuman OBJ contains no usable geometry.');
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
