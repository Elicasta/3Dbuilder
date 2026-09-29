import { FaceLandmarker, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export interface LandmarkPoint { x:number; y:number; z:number; visibility?:number }
export interface ReferenceLandmarks {
  pose: LandmarkPoint[];
  face: LandmarkPoint[];
  poseConfidence: number;
  faceConfidence: number;
}

const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const POSE='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';
const FACE='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let engines:Promise<{pose:PoseLandmarker;face:FaceLandmarker}>|null=null;

async function getEngines(){
  if(!engines) engines=(async()=>{
    const vision=await FilesetResolver.forVisionTasks(WASM);
    const [pose,face]=await Promise.all([
      PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:POSE},runningMode:'IMAGE',numPoses:1,outputSegmentationMasks:true}),
      FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:FACE},runningMode:'IMAGE',numFaces:1,outputFaceBlendshapes:false,outputFacialTransformationMatrixes:true})
    ]);
    return {pose,face};
  })();
  return engines;
}

async function imageElement(file:File){
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();
    img.src=url;
    await img.decode();
    return img;
  }finally{
    // Decoded HTMLImageElement retains its decoded pixels after URL revocation.
    URL.revokeObjectURL(url);
  }
}

function confidence(points:LandmarkPoint[]){
  const visible=points.map((p)=>p.visibility).filter((v):v is number=>typeof v==='number');
  return visible.length?visible.reduce((a,b)=>a+b,0)/visible.length:(points.length?1:0);
}

export async function detectReferenceLandmarks(file:File):Promise<ReferenceLandmarks>{
  const {pose,face}=await getEngines();
  const image=await imageElement(file);
  const poseResult=pose.detect(image);
  const faceResult=face.detect(image);
  const posePoints=(poseResult.landmarks?.[0]??[]) as LandmarkPoint[];
  const facePoints=(faceResult.faceLandmarks?.[0]??[]) as LandmarkPoint[];
  return {pose:posePoints,face:facePoints,poseConfidence:confidence(posePoints),faceConfidence:facePoints.length?1:0};
}

export function bodyRatiosFromPose(points:LandmarkPoint[]){
  const d=(a:number,b:number)=>{
    const p=points[a],q=points[b]; if(!p||!q)return null;
    return Math.hypot(p.x-q.x,p.y-q.y);
  };
  const shoulder=d(11,12),hip=d(23,24),armLeft=d(11,13),forearmLeft=d(13,15),thighLeft=d(23,25),shinLeft=d(25,27);
  const torso=points[11]&&points[12]&&points[23]&&points[24]
    ? Math.hypot((points[11].x+points[12].x-points[23].x-points[24].x)/2,(points[11].y+points[12].y-points[23].y-points[24].y)/2):null;
  return {shoulder,hip,armLeft,forearmLeft,thighLeft,shinLeft,torso};
}

export function faceRatios(points:LandmarkPoint[]){
  const d=(a:number,b:number)=>{
    const p=points[a],q=points[b]; if(!p||!q)return null;
    return Math.hypot(p.x-q.x,p.y-q.y);
  };
  // Stable MediaPipe face-mesh anchors: outer eye corners, nose sides/tip,
  // mouth corners, chin and forehead center.
  return {
    eyeSpan:d(33,263),
    noseWidth:d(129,358),
    mouthWidth:d(61,291),
    faceHeight:d(10,152),
    noseLength:d(168,1),
    jawSpan:d(172,397)
  };
}
