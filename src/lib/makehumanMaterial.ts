export interface MakeHumanMaterial {
  diffuseColor: string | null;
  roughness: number;
  opacity: number;
  transparent: boolean;
  diffuseTexture: string | null;
  normalTexture: string | null;
  aoTexture: string | null;
}

function hex(rgb:number[]){
  return '#'+rgb.slice(0,3).map((v)=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join('');
}

export function parseMakeHumanMaterial(text:string):MakeHumanMaterial{
  const result:MakeHumanMaterial={diffuseColor:null,roughness:.72,opacity:1,transparent:false,diffuseTexture:null,normalTexture:null,aoTexture:null};
  for(const raw of text.split(/\r?\n/)){
    const words=raw.trim().split(/\s+/); if(!words[0]||words[0].startsWith('#'))continue;
    const nums=words.slice(1).map(Number);
    if(words[0]==='diffuseColor'&&nums.length>=3&&nums.slice(0,3).every(Number.isFinite)) result.diffuseColor=hex(nums);
    else if(words[0]==='shininess'&&Number.isFinite(nums[0])) result.roughness=Math.max(.04,Math.min(1,1-nums[0]/128));
    else if(words[0]==='opacity'&&Number.isFinite(nums[0])) result.opacity=Math.max(0,Math.min(1,nums[0]));
    else if(words[0]==='transparent') result.transparent=words[1]?.toLowerCase()==='true';
    else if(words[0]==='diffuseTexture') result.diffuseTexture=words.slice(1).join(' ')||null;
    else if(words[0]==='normalmapTexture') result.normalTexture=words.slice(1).join(' ')||null;
    else if(words[0]==='aomapTexture') result.aoTexture=words.slice(1).join(' ')||null;
  }
  return result;
}
