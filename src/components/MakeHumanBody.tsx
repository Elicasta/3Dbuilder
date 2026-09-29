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
type RiggedBody={
  geometry:BufferGeometry;
  mesh:import('three').SkinnedMesh;
  bones:import('three').Bone[];
  anatomyAnchor:[number,number,number];
};

const isHairPath=(path:string)=>{
  const lower=path.toLowerCase();
  return (lower.includes('/hair/')||lower.includes('hair'))&&!lower.includes('eyebrow')&&!lower.includes('brow');
};
const isAnatomyPath=(path:string)=>/genital|penis|vulva|vagina|labia/i.test(path);

function HairMaterial({color}:{color:string}) {
  return <meshStandardMaterial color={color} roughness={.86} metalness={0}/>;
}

function FallbackHair({ character }: { character:CharacterState }) {
  const {hair:color,hairStyle}=character.appearance;
  const length=character.appearance.hairLength ?? .35;
  const volume=character.appearance.hairVolume ?? .45;
  const inflate=.92+volume*.18;
  const cap=<mesh position={[0,1.87,-.015]} scale={[.32*inflate,.205*inflate,.31*inflate]} castShadow>
    <sphereGeometry args={[1,32,20,0,Math.PI*2,0,Math.PI/2]} />
    <HairMaterial color={color}/>
  </mesh>;

  if(hairStyle==='buzz') return <group>{cap}</group>;
  if(hairStyle==='short') return <group>
    {cap}
    <mesh position={[-.10,1.82,.255]} rotation={[.18,0,-.18]} scale={[.16,.075,.09]} castShadow>
      <sphereGeometry args={[1,20,12]}/><HairMaterial color={color}/>
    </mesh>
    <mesh position={[.12,1.84,.245]} rotation={[.12,0,.12]} scale={[.14,.065,.085]} castShadow>
      <sphereGeometry args={[1,20,12]}/><HairMaterial color={color}/>
    </mesh>
  </group>;
  if(hairStyle==='sidePart') return <group>
    {cap}
    <mesh position={[-.12,1.84,.245]} rotation={[.12,-.08,-.42]} scale={[.23,.08,.095]} castShadow>
      <sphereGeometry args={[1,24,14]}/><HairMaterial color={color}/>
    </mesh>
    <mesh position={[.245,1.70,-.01]} scale={[.07,.17+.08*length,.16]} castShadow>
      <sphereGeometry args={[1,20,14]}/><HairMaterial color={color}/>
    </mesh>
  </group>;

  const sideLength=hairStyle==='long' ? .34+.46*length : .20+.20*length;
  return <group>
    {cap}
    <mesh position={[-.285,1.67-sideLength*.28,-.015]} scale={[.09,sideLength,.16]} castShadow>
      <sphereGeometry args={[1,24,16]}/><HairMaterial color={color}/>
    </mesh>
    <mesh position={[.285,1.67-sideLength*.28,-.015]} scale={[.09,sideLength,.16]} castShadow>
      <sphereGeometry args={[1,24,16]}/><HairMaterial color={color}/>
    </mesh>
    <mesh position={[0,1.65-sideLength*.32,-.245]} scale={[.26,sideLength*.95,.075]} castShadow>
      <sphereGeometry args={[1,24,16]}/><HairMaterial color={color}/>
    </mesh>
  </group>;
}

function AnatomyFallback({character,anchor}:{character:CharacterState;anchor:[number,number,number]}) {
  if(character.lane==='alien'||character.anatomy.mode==='off') return null;
  const detailed=character.anatomy.mode==='detailed';
  const [x,y,z]=anchor;
  const skin=character.appearance.skinSecondary||character.appearance.skin;
  if(character.lane==='male'){
    const length=.09+(character.anatomy.penisLength??.5)*.18;
    const radius=.018+(character.anatomy.penisGirth??.5)*.022;
    const testicle=.032+(character.anatomy.testicleSize??.5)*.026;
    return <group position={[x,y+.07,z+.16]}>
      <mesh position={[0,-.015,length*.48]} rotation={[Math.PI/2,0,0]} castShadow>
        <cylinderGeometry args={[radius*.86,radius,length,20]}/>
        <meshStandardMaterial color={skin} roughness={.72}/>
      </mesh>
      {detailed && <mesh position={[0,-.015,length+.005]} scale={[radius*1.08,radius*1.08,radius*1.18]} castShadow>
        <sphereGeometry args={[1,20,14]}/><meshStandardMaterial color={skin} roughness={.7}/>
      </mesh>}
      <mesh position={[-testicle*.62,-.075,.015]} scale={[testicle*.8,testicle,testicle*.82]} castShadow>
        <sphereGeometry args={[1,20,14]}/><meshStandardMaterial color={skin} roughness={.76}/>
      </mesh>
      <mesh position={[testicle*.62,-.075,.015]} scale={[testicle*.8,testicle,testicle*.82]} castShadow>
        <sphereGeometry args={[1,20,14]}/><meshStandardMaterial color={skin} roughness={.76}/>
      </mesh>
    </group>;
  }

  const width=.035+(character.anatomy.vulvaWidth??.5)*.035;
  const outer=.018+(character.anatomy.labiaMajora??.5)*.02;
  const inner=.009+(character.anatomy.labiaMinora??.5)*.014;
  const clitoral=.006+(character.anatomy.clitoralSize??.5)*.009;
  return <group position={[x,y+.08,z+.155]}>
    <mesh position={[-width*.52,-.018,0]} scale={[outer,.065,.024]} rotation={[0,0,-.08]} castShadow>
      <sphereGeometry args={[1,20,14]}/><meshStandardMaterial color={skin} roughness={.73}/>
    </mesh>
    <mesh position={[width*.52,-.018,0]} scale={[outer,.065,.024]} rotation={[0,0,.08]} castShadow>
      <sphereGeometry args={[1,20,14]}/><meshStandardMaterial color={skin} roughness={.73}/>
    </mesh>
    {detailed && <>
      <mesh position={[-width*.25,-.018,.023]} scale={[inner,.050,.012]} rotation={[0,0,-.06]} castShadow>
        <sphereGeometry args={[1,18,12]}/><meshStandardMaterial color={character.appearance.lips} roughness={.68}/>
      </mesh>
      <mesh position={[width*.25,-.018,.023]} scale={[inner,.050,.012]} rotation={[0,0,.06]} castShadow>
        <sphereGeometry args={[1,18,12]}/><meshStandardMaterial color={character.appearance.lips} roughness={.68}/>
      </mesh>
      <mesh position={[0,.043,.032]} scale={[clitoral,clitoral*.8,clitoral]} castShadow>
        <sphereGeometry args={[1,16,10]}/><meshStandardMaterial color={character.appearance.lips} roughness={.68}/>
      </mesh>
    </>}
  </group>;
}

export default function MakeHumanBody({ objText, character, poseName='bind' }: { objText: string; character: CharacterState; poseName?: string }) {
  const neutral = useMemo(() => {
    const geometry=parseMakeHumanObj(objText); normalizeMakeHumanForViewport(geometry); return geometry;
  }, [objText]);
  const [geometry,setGeometry]=useState<BufferGeometry>(()=>neutral.clone());
  const [rigged,setRigged]=useState<RiggedBody|null>(null);
  const [assets,setAssets]=useState<FittedAsset[]>([]);
  const hasHairAsset=assets.some((asset)=>isHairPath(asset.path));
  const hasAnatomyAsset=assets.some((asset)=>isAnatomyPath(asset.path));

  useEffect(() => {
    let cancelled=false;
    void evaluateMakeHumanGeometry(objText,character).then(async ({geometry:body})=>{
      let selected=[...(character.equippedAssets ?? [])];
      if(!character.appearance.hairEnabled) selected=selected.filter(path=>!isHairPath(path));
      if(character.anatomy.mode==='off') selected=selected.filter(path=>!isAnatomyPath(path));
      else if(character.anatomy.mode==='detailed'&&!selected.some(isAnatomyPath)){
        try{
          const catalog=await getMakeHumanAssetCatalog();
          const installed=catalog.find(item=>item.kind!=='material'&&isAnatomyPath(item.relativePath));
          if(installed)selected.push(installed.relativePath);
        }catch{
          // Procedural anatomy remains available when no installed asset exists.
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
      const hips=normalizedDefs.filter(d=>d.name==='upperleg01.L'||d.name==='upperleg01.R');
      const anatomyAnchor:[number,number,number]=hips.length
        ? [hips.reduce((s,d)=>s+d.head[0],0)/hips.length,hips.reduce((s,d)=>s+d.head[1],0)/hips.length,hips.reduce((s,d)=>s+d.head[2],0)/hips.length]
        : [0,-.62,0];
      normalizeMakeHumanForViewport(body);
      const skinned=skinMakeHumanGeometry(body,normalizedDefs,weights);
      if(cancelled){body.dispose();fitted.forEach((item)=>item.geometry.dispose());return;}
      setRigged(previous=>{previous?.geometry.dispose();return {geometry:body,mesh:skinned.mesh,bones:skinned.bones,anatomyAnchor}});
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
      {character.appearance.hairEnabled && !hasHairAsset && <FallbackHair character={character}/>}
      {rigged && !hasAnatomyAsset && <AnatomyFallback character={character} anchor={rigged.anatomyAnchor}/>}
      {assets.map((asset)=>{
        const lower=asset.path.toLowerCase();
        const material=asset.materialText ? parseMakeHumanMaterial(asset.materialText) : null;
        const fallback=isHairPath(asset.path) ? character.appearance.hair :
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
