import { useEffect, useMemo, useState } from 'react';
import type { BufferGeometry } from 'three';
import type { CharacterState } from '../types/character';
import { getMakeHumanAssetBundle } from '../lib/desktop';
import { fittedAssetFromTexts, normalizeAssetWithBody } from '../lib/makehumanAsset';
import { evaluateMakeHumanGeometry, normalizeMakeHumanForViewport } from '../lib/makehumanCharacter';
import { parseMakeHumanMaterial } from '../lib/makehumanMaterial';
import { parseMakeHumanObj } from '../lib/makehumanObj';

interface FittedAsset { path: string; geometry: BufferGeometry; materialText: string | null }

export default function MakeHumanBody({ objText, character }: { objText: string; character: CharacterState }) {
  const neutral = useMemo(() => {
    const geometry=parseMakeHumanObj(objText); normalizeMakeHumanForViewport(geometry); return geometry;
  }, [objText]);
  const [geometry,setGeometry]=useState<BufferGeometry>(()=>neutral.clone());
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
      normalizeMakeHumanForViewport(body);
      if(cancelled){body.dispose();fitted.forEach((item)=>item.geometry.dispose());return;}
      setGeometry((previous)=>{previous.dispose();return body;});
      setAssets((previous)=>{previous.forEach((item)=>item.geometry.dispose());return fitted;});
    }).catch((error)=>console.warn('MakeHuman character/asset evaluation failed',error));
    return()=>{cancelled=true;};
  },[objText,character]);

  useEffect(()=>()=>{neutral.dispose();},[neutral]);
  useEffect(()=>()=>{assets.forEach((item)=>item.geometry.dispose());},[]);

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={character.appearance.skin} roughness={character.appearance.skinRoughness} metalness={0.01}/>
      </mesh>
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
