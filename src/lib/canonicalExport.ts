import type { CharacterState } from '../types/character';
import { buildCanonicalGeometry } from '../components/CanonicalBody';
import { canonicalJoints } from './canonicalRig';

export function canonicalObj(character:CharacterState):string {
  const geometry=buildCanonicalGeometry(character);
  const position=geometry.getAttribute('position');
  const index=geometry.getIndex();
  const lines=['# 3D Builder Phase 2 canonical body','o CanonicalBody'];
  for(let i=0;i<position.count;i++) lines.push(`v ${position.getX(i)} ${position.getY(i)-0.2} ${position.getZ(i)}`);
  if(index){
    for(let i=0;i<index.count;i+=3) lines.push(`f ${index.getX(i)+1} ${index.getX(i+1)+1} ${index.getX(i+2)+1}`);
  }
  geometry.dispose();
  return lines.join('\n')+'\n';
}

export function phase2ExportRecipe(character:CharacterState){
  return {
    schema:'3dbuilder.character.v2',
    phase:2,
    coordinateSystem:'Y-up / meters / T-pose',
    character,
    rig:{joints:canonicalJoints(character)}
  };
}
