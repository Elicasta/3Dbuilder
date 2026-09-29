import type { CharacterState } from '../types/character';
import { buildCanonicalGeometry } from '../components/CanonicalBody';
import { canonicalJoints } from './canonicalRig';
import { productionSkinWeights } from './productionSkin';

export function canonicalObj(character:CharacterState):string {
  const geometry=buildCanonicalGeometry(character);
  const position=geometry.getAttribute('position');
  const index=geometry.getIndex();
  const lines=['# 3D Builder Phase 3 production cage','o CanonicalBody'];
  for(let i=0;i<position.count;i++) lines.push(`v ${position.getX(i)} ${position.getY(i)-0.2} ${position.getZ(i)}`);
  if(index){
    for(let i=0;i<index.count;i+=3) lines.push(`f ${index.getX(i)+1} ${index.getX(i+1)+1} ${index.getX(i+2)+1}`);
  }
  geometry.dispose();
  return lines.join('\n')+'\n';
}

export function phase3ExportRecipe(character:CharacterState){
  return {
    schema:'3dbuilder.character.v3',
    phase:3,
    coordinateSystem:'Y-up / meters / T-pose',
    topology:{stableVertexIds:true,maxInfluences:4,subdivisionReady:true},
    character,
    rig:{joints:canonicalJoints(character),skin:productionSkinWeights(character)}
  };
}

// Compatibility alias while Phase 2 recipes already exist in user documents.
export const phase2ExportRecipe=phase3ExportRecipe;
