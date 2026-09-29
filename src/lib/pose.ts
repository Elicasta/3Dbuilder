export type PosePreset =
  | 'tPose'
  | 'aPose'
  | 'relaxed'
  | 'elbowTest'
  | 'kneeTest'
  | 'shoulderTest'
  | 'shoulderRaise'
  | 'elbowFlex'
  | 'hipFlex'
  | 'kneeFlex'
  | 'spineBend'
  | 'spineTwist'
  | 'neckExtreme';

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

const neutral: PoseState = {
  leftShoulderZ: 0,
  rightShoulderZ: 0,
  leftElbowZ: 0,
  rightElbowZ: 0,
  leftHipX: 0,
  rightHipX: 0,
  leftKneeX: 0,
  rightKneeX: 0
};

export const POSES: Record<PosePreset, PoseState> = {
  tPose: { ...neutral },
  aPose: { ...neutral, leftShoulderZ: 0.42, rightShoulderZ: -0.42 },
  relaxed: { ...neutral, leftShoulderZ: 1.18, rightShoulderZ: -1.18, leftElbowZ: -0.12, rightElbowZ: 0.12 },
  elbowTest: { ...neutral, leftShoulderZ: 0.32, rightShoulderZ: -0.32, leftElbowZ: -1.18, rightElbowZ: 1.18 },
  kneeTest: { ...neutral, leftShoulderZ: 0.42, rightShoulderZ: -0.42, leftHipX: -0.12, rightHipX: 0.12, leftKneeX: 0.72, rightKneeX: 0.72 },
  shoulderTest: { ...neutral, leftShoulderZ: 0.88, rightShoulderZ: -0.88 },
  shoulderRaise: { ...neutral, leftShoulderZ: -1.35, rightShoulderZ: 1.35 },
  elbowFlex: { ...neutral, leftShoulderZ: -0.35, rightShoulderZ: 0.35, leftElbowZ: -2.15, rightElbowZ: 2.15 },
  hipFlex: { ...neutral, leftHipX: -1.65, rightHipX: -1.65 },
  kneeFlex: { ...neutral, leftHipX: -0.55, rightHipX: -0.55, leftKneeX: 1.9, rightKneeX: 1.9 },
  spineBend: { ...neutral },
  spineTwist: { ...neutral },
  neckExtreme: { ...neutral }
};

export const POSE_LABELS: Record<PosePreset, string> = {
  tPose: 'T Pose',
  aPose: 'A Pose',
  relaxed: 'Relaxed',
  elbowTest: 'Elbow Test',
  kneeTest: 'Knee Test',
  shoulderTest: 'Shoulder Test',
  shoulderRaise: 'Shoulder Raise',
  elbowFlex: 'Elbow Flex',
  hipFlex: 'Hip Flex',
  kneeFlex: 'Knee Flex',
  spineBend: 'Spine Bend',
  spineTwist: 'Spine Twist',
  neckExtreme: 'Neck Test'
};
