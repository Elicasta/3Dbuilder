export type PosePreset = 'tPose' | 'aPose' | 'relaxed' | 'elbowTest' | 'kneeTest' | 'shoulderTest';

export interface PoseState {
  leftShoulderZ: number;
  rightShoulderZ: number;
  leftElbowZ: number;
  rightElbowZ: number;
  leftHipX: number;
  rightHipX: number;
  leftKneeX: number;
  rightKneeX: number;
}

export const POSES: Record<PosePreset, PoseState> = {
  tPose: { leftShoulderZ:0,rightShoulderZ:0,leftElbowZ:0,rightElbowZ:0,leftHipX:0,rightHipX:0,leftKneeX:0,rightKneeX:0 },
  aPose: { leftShoulderZ:-0.42,rightShoulderZ:0.42,leftElbowZ:0,rightElbowZ:0,leftHipX:0,rightHipX:0,leftKneeX:0,rightKneeX:0 },
  relaxed: { leftShoulderZ:-1.18,rightShoulderZ:1.18,leftElbowZ:-0.12,rightElbowZ:0.12,leftHipX:0,rightHipX:0,leftKneeX:0,rightKneeX:0 },
  elbowTest: { leftShoulderZ:-0.32,rightShoulderZ:0.32,leftElbowZ:-1.18,rightElbowZ:1.18,leftHipX:0,rightHipX:0,leftKneeX:0,rightKneeX:0 },
  kneeTest: { leftShoulderZ:-0.42,rightShoulderZ:0.42,leftElbowZ:0,rightElbowZ:0,leftHipX:-0.12,rightHipX:0.12,leftKneeX:0.72,rightKneeX:0.72 },
  shoulderTest: { leftShoulderZ:-0.88,rightShoulderZ:0.88,leftElbowZ:0,rightElbowZ:0,leftHipX:0,rightHipX:0,leftKneeX:0,rightKneeX:0 }
};

export const POSE_LABELS: Record<PosePreset,string> = {
  tPose:'T Pose', aPose:'A Pose', relaxed:'Relaxed', elbowTest:'Elbow Test', kneeTest:'Knee Test', shoulderTest:'Shoulder Test'
};
