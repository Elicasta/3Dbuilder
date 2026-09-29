import { useEffect, useMemo, useState } from 'react';
import type { BufferGeometry } from 'three';
import type { CharacterState } from '../types/character';
import { getMakeHumanAssetBundle, getMakeHumanAssetCatalog, getMakeHumanRigText } from '../lib/desktop';
import { fittedAssetFromTexts, normalizeAssetWithBody } from '../lib/makehumanAsset';
import { evaluateMakeHumanGeometry, normalizeMakeHumanForViewport } from '../lib/makehumanCharacter';
import { parseMakeHumanMaterial } from '../lib/makehumanMaterial';
import { parseMakeHumanObj } from '../lib/makehumanObj';
import { makeHumanBones, makeHumanSkinWeights } from '../lib/makehumanRig';
import { applyMakeHumanPose, MAKEHUMAN_POSES, skinMakeHumanGeometry } from '../lib/makehumanSkinning';

interface FittedAsset { path: string; geometry: BufferGeometry; materialText: string | null }
type RiggedBody={geometry:BufferGeometry;mesh:import('three').SkinnedMesh;bones:import('three').Bone[]};

function FallbackHair({ color, style }: { color:string; style:CharacterState['style'] }) {
  const sx=style==='stylized'?.44:style==='semiReal'?.41:.39;
  const sy=style==='stylized'?.34:style==='semiReal'?.31:.29;
  return <group>
    <mesh position={[0,1.72,-.02]} scale={[sx,sy,.41]} castShadow>
      <sphereGeometry args={[1,32,20,0,Math.PI*2,0,Math.PI*.58]} />
      <meshStandardMaterial color={color} roughness={.88} metalness={0} />
    </mesh>
    {style==='stylized' && <mesh position={[-.13,1.76,.29]} rotation={[0,0,-.28]} scale={[.16,.24,.12]} castShadow>
      <sphereGeometry args={[1,20,14]} />
      <meshStandardMaterial color={color} roughness={.9} metalness={0} />
    </mesh>}
  </group>;
}

function PresentationBaseLayer({ color }: { color:string }) {
  return <group>
    <mesh position={[0,-.48,.01]} scale={[.54,.29,.34]} castShadow receiveShadow>
      <sphereGeometry args={[1,32,18]} />
      <meshStandardMaterial color={color} roughness={.9} metalness={0} />
    </mesh>
    <mesh position={[0,-.28,0]} scale={[.56,.055,.35]} castShadow>
      <boxGeometry args={[2,1,2]} />
      <meshStandardMaterial color={color} roughness={.9} metalness={0} />
    </mesh>
  </group>;
}

export default function MakeHumanBody({ objText, character, poseName='bind' }: { objText: string; character: CharacterState; poseName?: string }) {
  const neutral = useMemo(() => {
    const geometry=parseMakeHumanObj(objText); normalizeMakeHumanForViewport(geometry); return geometry;
  }, [objText]);
  const [geometry,setGeometry]=useState<BufferGeometry>(()=>neutral.clone());
  const [rigged,setRigged]=useState<RiggedBody|null>(null);
  const [assets,setAssets]=useState<FittedAsset[]>([]);
  const hasHairAsset=assets.some((asset)=>{const lower=asset.path.toLowerCase();return (lower.includes('/hair/')||lower.includes('hair'))&&!lower.includes('eyebrow')&&!lower.includes('brow')});

  useEffect(() => {
    let cancelled=false;
    void evaluateMakeHumanGeometry(objText,character).then(async ({geometry:body})=>{
      // MHCLO fitting must happen against the evaluated body before viewport normalization.
      const isHair=(path:string)=>{const lower=path.toLowerCase();return (lower.includes('/hair/')||lower.includes('hair'))&&!lower.includes('eyebrow')&&!lower.includes('brow')};
      let selected=[...(character.equippedAssets ?? [])];
      if(!character.appearance.hairEnabled) selected=selected.filter(path=>!isHair(path));
      else if(!selected.some(isHair)){
        try{
          const catalog=await getMakeHumanAssetCatalog();
          const auto=catalog.find(item=>item.kind!=='material'&&isHair(item.relativePath));
          if(auto) selected.push(auto.relativePath);
        }catch{
          // Hair remains optional if the local MakeHuman asset catalog is unavailable.
        }
      }
      const fitted=await Promise.all(selected.map(async(path)=>{
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
      {character.lane!=='alien' && <PresentationBaseLayer color={character.appearance.underwear} />}
      {character.appearance.hairEnabled && !hasHairAsset && <FallbackHair color={character.appearance.hair} style={character.style} />}
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
