import { useEffect, useMemo, useState } from 'react';
import type { BufferGeometry } from 'three';
import type { CharacterState } from '../types/character';
import { getMakeHumanAssetBundle, getMakeHumanRigText } from '../lib/desktop';
import { fittedAssetFromTexts, normalizeAssetWithBody } from '../lib/makehumanAsset';
import { evaluateMakeHumanGeometry, normalizeMakeHumanForViewport } from '../lib/makehumanCharacter';
import { parseMakeHumanMaterial } from '../lib/makehumanMaterial';
import { parseMakeHumanObj } from '../lib/makehumanObj';
import { makeHumanBones, makeHumanSkinWeights } from '../lib/makehumanRig';
import { applyMakeHumanPose, MAKEHUMAN_POSES, skinMakeHumanGeometry } from '../lib/makehumanSkinning';

interface FittedAsset { path: string; geometry: BufferGeometry; materialText: string | null }
type RiggedBody={geometry:BufferGeometry;mesh:import('three').SkinnedMesh;bones:import('three').Bone[]};

export default function MakeHumanBody({ objText, character, poseName='bind' }: { objText: string; character: CharacterState; poseName?: string }) {
  const neutral = useMemo(() => {
    const geometry=parseMakeHumanObj(objText); normalizeMakeHumanForViewport(geometry); return geometry;
  }, [objText]);
  const [geometry,setGeometry]=useState<BufferGeometry>(()=>neutral.clone());
  const [rigged,setRigged]=useState<RiggedBody|null>(null);
  const [assets,setAssets]=useState<FittedAsset[]>([]);

  useEffect(() => {
    let cancelled=false;
    void evaluateMakeHumanGeometry(objText,character).then(async ({geometry:body})=>{
      // MHCLO fitting must happen against the evaluated body before viewport normalization.
      const fitted=await Promise.all((character.equippedAssets ?? []).map(async(path)=>{
        const bundle=await getMakeHumanAssetBundle(path);
        const asset=fittedAssetFromTexts(bundle.definitionText,bundle.objText,body);
        normalizeAssetWithBody(asset,body);
        return {path,geometry:asset,materialText:bundle.materialText};
      }));
      const [skeletonText,weightText]=await Promise.all([getMakeHumanRigText('default.mhskel'),getMakeHumanRigText('default_weights.mhw')]);
      const defs=makeHumanBones(body,skeletonText),weights=makeHumanSkinWeights(weightText,body.getAttribute('position').count);
      body.computeBoundingBox();
      const before=body.boundingBox!;
      const rawHeight=Math.max(.001,before.max.y-before.min.y),scale=4.05/rawHeight;
      const cx=(before.min.x+before.max.x)/2,cz=(before.min.z+before.max.z)/2;
      const normalizedDefs=defs.map(d=>({...d,
        head:[(d.head[0]-cx)*scale,(d.head[1]-before.min.y)*scale-2.03,(d.head[2]-cz)*scale] as [number,number,number],
        tail:[(d.tail[0]-cx)*scale,(d.tail[1]-before.min.y)*scale-2.03,(d.tail[2]-cz)*scale] as [number,number,number]
      }));
      normalizeMakeHumanForViewport(body);
      const skinned=skinMakeHumanGeometry(body,normalizedDefs,weights);
      if(cancelled){body.dispose();fitted.forEach((item)=>item.geometry.dispose());return;}
      setRigged(previous=>{previous?.geometry.dispose();return {geometry:body,mesh:skinned.mesh,bones:skinned.bones}});
      setGeometry((previous)=>{previous.dispose();return body.clone();});
      setAssets((previous)=>{previous.forEach((item)=>item.geometry.dispose());return fitted;});
    }).catch((error)=>console.warn('MakeHuman character/asset evaluation failed',error));
    return()=>{cancelled=true;};
  },[objText,character]);

  useEffect(()=>()=>{neutral.dispose();},[neutral]);
  useEffect(()=>{if(rigged)applyMakeHumanPose(rigged.bones,MAKEHUMAN_POSES[poseName]??MAKEHUMAN_POSES.bind)},[rigged,poseName]);
  useEffect(()=>()=>{assets.forEach((item)=>item.geometry.dispose());},[]);

  return (
    <group>
      {rigged ? <primitive object={rigged.mesh} castShadow receiveShadow>
        <meshStandardMaterial attach="material" color={character.appearance.skin} roughness={character.appearance.skinRoughness} metalness={0.01}/>
      </primitive> : <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={character.appearance.skin} roughness={character.appearance.skinRoughness} metalness={0.01}/>
      </mesh>}
      {assets.map((asset)=>{
        const lower=asset.path.toLowerCase();
        const material=asset.materialText ? parseMakeHumanMaterial(asset.materialText) : null;
        const fallback=lower.includes('hair')||lower.includes('eyebrow') ? character.appearance.hair :
          lower.includes('eye') ? character.appearance.sclera :
          lower.includes('teeth') ? '#e7e1d7' : character.appearance.shirt;
        return <mesh key={asset.path} geometry={asset.geometry} castShadow receiveShadow>
          <meshStandardMaterial color={material?.diffuseColor ?? fallback}
            roughness={material?.roughness ?? (lower.includes('eye')?0.28:0.72)}
            metalness={0.01} transparent={material?.transparent || (material?.opacity ?? 1)<1}
            opacity={material?.opacity ?? 1}/>
        </mesh>;
      })}
    </group>
  );
}
