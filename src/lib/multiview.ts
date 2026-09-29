import type { CharacterReferences } from '../types/character';
import type { MultiViewAnalysis, ViewAnalysis } from '../types/multiview';
import { anatomicalRowsFromPose, bodyRatiosFromPose, detectReferenceLandmarks, faceRatios, type ReferenceLandmarks } from './referenceLandmarks';

const SIZE = 384;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mapRatio(value: number | null, expected: number, min = 0.68, max = 1.38) {
  if (value === null || value <= 0) return 1;
  return clamp(value / expected, min, max);
}

function sampleBackground(data: Uint8ClampedArray, width: number, height: number) {
  const points = [
    [3, 3],
    [width - 4, 3],
    [3, height - 4],
    [width - 4, height - 4]
  ];

  const sums = [0, 0, 0];
  for (const [x, y] of points) {
    const index = (y * width + x) * 4;
    sums[0] += data[index];
    sums[1] += data[index + 1];
    sums[2] += data[index + 2];
  }

  return sums.map((value) => value / points.length);
}

function rowSegments(mask: Uint8Array, width: number, y: number) {
  const segments: Array<[number, number]> = [];
  let start = -1;

  for (let x = 0; x < width; x += 1) {
    const active = mask[y * width + x] === 1;
    if (active && start === -1) start = x;
    if ((!active || x === width - 1) && start !== -1) {
      const end = active && x === width - 1 ? x : x - 1;
      if (end - start >= 2) segments.push([start, end]);
      start = -1;
    }
  }

  return segments;
}

function centralWidth(mask: Uint8Array, width: number, y: number, centerX: number) {
  const segments = rowSegments(mask, width, y);
  if (!segments.length) return null;

  const containing = segments.find(([start, end]) => start <= centerX && end >= centerX);
  const chosen =
    containing ??
    segments.reduce((best, segment) => {
      const midpoint = (segment[0] + segment[1]) / 2;
      const bestMidpoint = (best[0] + best[1]) / 2;
      return Math.abs(midpoint - centerX) < Math.abs(bestMidpoint - centerX)
        ? segment
        : best;
    });

  return chosen[1] - chosen[0] + 1;
}

function supportedBodyWidth(
  mask: Uint8Array,
  width: number,
  height: number,
  y: number,
  centerX: number,
  verticalRadius: number
) {
  const supported: number[] = [];
  const y0 = Math.max(0, y - verticalRadius);
  const y1 = Math.min(height - 1, y + verticalRadius);
  const required = Math.max(2, Math.floor((y1 - y0 + 1) * 0.42));
  for (let x = 0; x < width; x += 1) {
    let count = 0;
    for (let yy = y0; yy <= y1; yy += 1) count += mask[yy * width + x];
    if (count >= required) supported.push(x);
  }
  if (!supported.length) return centralWidth(mask, width, y, centerX);
  const left = supported.filter((x) => x <= centerX);
  const right = supported.filter((x) => x >= centerX);
  if (!left.length || !right.length) return centralWidth(mask, width, y, centerX);
  return Math.max(...right) - Math.min(...left) + 1;
}

function anatomicalWidth(
  mask: Uint8Array,
  width: number,
  height: number,
  y: number,
  centerX: number,
  bodyHeight: number,
  supportFraction = 0.035
) {
  const radius = Math.max(3, Math.round(bodyHeight * supportFraction));
  const samples: number[] = [];
  for (let offset = -3; offset <= 3; offset += 1) {
    const yy = Math.max(0, Math.min(height - 1, y + offset));
    const value = supportedBodyWidth(mask, width, height, yy, centerX, radius);
    if (value && value > 2) samples.push(value);
  }
  if (!samples.length) return null;
  samples.sort((a,b)=>a-b);
  return samples[Math.floor(samples.length / 2)];
}

function nearestRowWidth(
  mask: Uint8Array,
  width: number,
  y: number,
  centerX: number
) {
  const samples: number[] = [];
  for (let offset = -5; offset <= 5; offset += 1) {
    const candidate = y + offset;
    if (candidate < 0 || candidate >= SIZE) continue;
    const value = centralWidth(mask, width, candidate, centerX);
    if (value && value > 2) samples.push(value);
  }
  if (!samples.length) return null;
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

function symmetryAt(mask: Uint8Array, width: number, y: number, centerX: number) {
  const segments = rowSegments(mask, width, y);
  const containing = segments.find(([start, end]) => start <= centerX && end >= centerX);
  if (!containing) return 0.5;
  const left = centerX - containing[0];
  const right = containing[1] - centerX;
  return 1 - Math.min(1, Math.abs(left - right) / Math.max(left, right, 1));
}

async function analyzeFile(file: File, landmarks?: ReferenceLandmarks | null): Promise<ViewAnalysis> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) throw new Error('Canvas analysis is unavailable.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, SIZE, SIZE);

  const scale = Math.min(SIZE / bitmap.width, SIZE / bitmap.height);
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;
  const dx = (SIZE - drawWidth) / 2;
  const dy = (SIZE - drawHeight) / 2;
  context.drawImage(bitmap, dx, dy, drawWidth, drawHeight);
  bitmap.close();

  const image = context.getImageData(0, 0, SIZE, SIZE);
  const background = sampleBackground(image.data, SIZE, SIZE);
  const mask = new Uint8Array(SIZE * SIZE);
  const semantic=landmarks?.segmentationMask ?? null;

  let minX = SIZE;
  let minY = SIZE;
  let maxX = -1;
  let maxY = -1;
  let foregroundPixels = 0;

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = (y * SIZE + x) * 4;
      const alpha = image.data[index + 3] / 255;
      const dr = image.data[index] - background[0];
      const dg = image.data[index + 1] - background[1];
      const db = image.data[index + 2] - background[2];
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      const sx=semantic?Math.min(semantic.width-1,Math.max(0,Math.floor((x-dx)/Math.max(drawWidth,1)*semantic.width))):0;
      const sy=semantic?Math.min(semantic.height-1,Math.max(0,Math.floor((y-dy)/Math.max(drawHeight,1)*semantic.height))):0;
      const insideDraw=x>=dx&&x<=dx+drawWidth&&y>=dy&&y<=dy+drawHeight;
      const semanticForeground=semantic&&insideDraw?semantic.values[sy*semantic.width+sx]>=0.5:false;
      const foreground = semantic ? semanticForeground : (alpha > 0.08 && distance > 34);

      if (foreground) {
        mask[y * SIZE + x] = 1;
        foregroundPixels += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    throw new Error(`Could not separate the character from the background in ${file.name}.`);
  }

  const bodyHeight = maxY - minY + 1;
  const bodyWidth = maxX - minX + 1;
  const centerX = Math.round((minX + maxX) / 2);

  const rowAt = (fraction: number) =>
    clamp(Math.round(minY + bodyHeight * fraction), minY, maxY);
  const poseRows=landmarks?.pose.length?anatomicalRowsFromPose(landmarks.pose):null;
  const imageRow=(normalized:number|null|undefined,fallback:number)=>{
    if(normalized===null||normalized===undefined)return rowAt(fallback);
    return clamp(Math.round(dy+normalized*drawHeight),minY,maxY);
  };

  // Semantic landmark bands. These deliberately sample the central connected
  // silhouette so horizontal T-pose arms do not become torso width.
  const headWidth = anatomicalWidth(mask, SIZE, SIZE, rowAt(0.12), centerX, bodyHeight, 0.018);
  const jawWidth = anatomicalWidth(mask, SIZE, SIZE, rowAt(0.205), centerX, bodyHeight, 0.015);
  const shoulderRow=imageRow(poseRows?.shoulder,0.29);
  const chestRow=imageRow(poseRows?.chest,0.39);
  const waistRow=imageRow(poseRows?.waist,0.50);
  const hipRow=imageRow(poseRows?.hip,0.59);
  const shoulderWidth = anatomicalWidth(mask, SIZE, SIZE, shoulderRow, centerX, bodyHeight, 0.055);
  const chestWidth = anatomicalWidth(mask, SIZE, SIZE, chestRow, centerX, bodyHeight);
  const waistWidth = anatomicalWidth(mask, SIZE, SIZE, waistRow, centerX, bodyHeight);
  const hipWidth = anatomicalWidth(mask, SIZE, SIZE, hipRow, centerX, bodyHeight);
  const kneeWidth = nearestRowWidth(mask, SIZE, rowAt(0.78), centerX);
  const ankleWidth = nearestRowWidth(mask, SIZE, rowAt(0.94), centerX);
  const symmetryRows = [0.12, 0.29, 0.39, 0.50, 0.59].map((fraction) =>
    symmetryAt(mask, SIZE, rowAt(fraction), centerX)
  );
  const silhouetteSymmetry =
    symmetryRows.reduce((sum, value) => sum + value, 0) / symmetryRows.length;

  let legSplitY: number | null = null;
  for (let y = rowAt(0.52); y < rowAt(0.82); y += 1) {
    const segments = rowSegments(mask, SIZE, y).filter(
      ([start, end]) => end - start > bodyHeight * 0.025
    );
    const left = segments.some(([, end]) => end < centerX - 2);
    const right = segments.some(([start]) => start > centerX + 2);
    if (left && right) {
      legSplitY = y;
      break;
    }
  }

  const expectedArea = bodyHeight * Math.max(bodyWidth, 1);
  const fillRatio = foregroundPixels / expectedArea;

  return {
    width: bodyWidth,
    height: bodyHeight,
    foregroundConfidence: clamp(fillRatio / 0.36, 0, 1),
    headWidth: headWidth ? headWidth / bodyHeight : null,
    jawWidth: jawWidth ? jawWidth / bodyHeight : null,
    shoulderWidth: shoulderWidth ? shoulderWidth / bodyHeight : null,
    chestWidth: chestWidth ? chestWidth / bodyHeight : null,
    waistWidth: waistWidth ? waistWidth / bodyHeight : null,
    hipWidth: hipWidth ? hipWidth / bodyHeight : null,
    kneeWidth: kneeWidth ? kneeWidth / bodyHeight : null,
    ankleWidth: ankleWidth ? ankleWidth / bodyHeight : null,
    legSplitY: legSplitY ? (legSplitY - minY) / bodyHeight : null,
    armSpan: bodyWidth / bodyHeight,
    shoulderY: (shoulderRow-minY)/bodyHeight,
    waistY: (waistRow-minY)/bodyHeight,
    hipY: (hipRow-minY)/bodyHeight,
    silhouetteSymmetry
  };
}

export async function analyzeMultiView(
  references: CharacterReferences,
  options: { landmarks?: boolean } = {}
): Promise<MultiViewAnalysis> {
  const useLandmarks=options.landmarks!==false;
  const landmarkSets = useLandmarks ? await Promise.all(
    (['front','side','back'] as const).map(async (view) => {
      const file=references[view];
      if(!file)return null;
      try{return await detectReferenceLandmarks(file);}catch{return null;}
    })
  ) : [null,null,null];
  const [frontLandmarks,sideLandmarks,backLandmarks]=landmarkSets;
  const [front,side,back]=await Promise.all([
    references.front?analyzeFile(references.front,frontLandmarks):Promise.resolve(null),
    references.side?analyzeFile(references.side,sideLandmarks):Promise.resolve(null),
    references.back?analyzeFile(references.back,backLandmarks):Promise.resolve(null)
  ]);

  const frontBack = [front, back].filter(Boolean) as ViewAnalysis[];

  const average = (
    values: Array<number | null>,
    fallback: number | null = null
  ) => {
    const valid = values.filter((value): value is number => value !== null);
    return valid.length
      ? valid.reduce((sum, value) => sum + value, 0) / valid.length
      : fallback;
  };

  const shoulders = average(frontBack.map((view) => view.shoulderWidth));
  const chest = average(frontBack.map((view) => view.chestWidth));
  const waist = average(frontBack.map((view) => view.waistWidth));
  const hips = average(frontBack.map((view) => view.hipWidth));
  const head = average(frontBack.map((view) => view.headWidth));
  const jaw = average(frontBack.map((view) => view.jawWidth));
  const armSpan = average(frontBack.map((view) => view.armSpan));
  const legSplit = average(frontBack.map((view) => view.legSplitY));

  const sideChest = side?.chestWidth ?? null;
  const sideWaist = side?.waistWidth ?? null;
  const sideHips = side?.hipWidth ?? null;
  const sideHead = side?.headWidth ?? null;

  // Conservative fitting is intentional here. Silhouette extraction tells us
  // useful relative proportions, but it is not yet semantic segmentation.
  // Keep the editable canonical body human while the AI candidate supplies
  // higher-frequency shape evidence in the viewport.
  const morphPatch = {
    shoulders: mapRatio(shoulders, 0.225, 0.86, 1.14),
    chest: mapRatio(chest, 0.205, 0.84, 1.16),
    chestDepth: mapRatio(sideChest, 0.13, 0.82, 1.18),
    // Waist uses MakeHuman's circumference measurement modifier. Blend the
    // front width with side depth instead of driving a fake waist-depth slider.
    waist: clamp(
      (mapRatio(waist, 0.15, 0.84, 1.16) + mapRatio(sideWaist, 0.115, 0.84, 1.16)) / 2,
      0.84,
      1.16
    ),
    hips: mapRatio(hips, 0.18, 0.84, 1.16),
    hipDepth: mapRatio(sideHips, 0.135, 0.82, 1.18),
    headScale: mapRatio(head, 0.125, 0.9, 1.12),
    faceWidth: mapRatio(head, 0.125, 0.90, 1.12),
    jawWidth: mapRatio(jaw, 0.105, 0.86, 1.16),
    eyeSpacing: 1,
    noseWidth: 1,
    mouthWidth: 1,
    noseLength: 1,
    noseProjection: 1,
    // Side head depth is intentionally conservative because hair, nose and
    // ears contaminate the silhouette. faceDepth maps to head-scale-depth.
    faceDepth: sideHead ? clamp(mapRatio(sideHead, 0.13, 0.94, 1.08), 0.94, 1.08) : 1,
    armLength: mapRatio(armSpan, 1.02, 0.9, 1.12),
    legLength: legSplit
      ? clamp((1 - legSplit) / 0.47, 0.9, 1.12)
      : 1,
    // Broad body mass estimate. Width and depth together are more stable than
    // either alone, and this feeds MakeHuman's weight/muscle macro pair.
    build: clamp(
      ((mapRatio(chest, 0.205, 0.82, 1.18) +
        mapRatio(waist, 0.15, 0.82, 1.18) +
        mapRatio(hips, 0.18, 0.82, 1.18) +
        mapRatio(sideWaist, 0.115, 0.82, 1.18)) / 4),
      0.78,
      1.22
    )
  };

  const frontBody=frontLandmarks?.pose.length ? bodyRatiosFromPose(frontLandmarks.pose) : null;
  const frontFace=frontLandmarks?.face.length ? faceRatios(frontLandmarks.face) : null;
  if(frontBody?.torso && frontBody.shoulder){
    const ratio=frontBody.shoulder/frontBody.torso;
    morphPatch.shoulders=clamp((morphPatch.shoulders+mapRatio(ratio,1.02,.86,1.14))/2,.86,1.14);
  }
  if(frontBody?.armLeft && frontBody.forearmLeft && frontBody.torso){
    const ratio=(frontBody.armLeft+frontBody.forearmLeft)/frontBody.torso;
    morphPatch.armLength=clamp((morphPatch.armLength+mapRatio(ratio,1.52,.90,1.12))/2,.90,1.12);
  }
  if(frontBody?.thighLeft && frontBody.shinLeft && frontBody.torso){
    const ratio=(frontBody.thighLeft+frontBody.shinLeft)/frontBody.torso;
    morphPatch.legLength=clamp((morphPatch.legLength+mapRatio(ratio,2.02,.90,1.12))/2,.90,1.12);
  }
  if(frontFace?.faceHeight){
    if(frontFace.eyeSpan) morphPatch.eyeSpacing=mapRatio(frontFace.eyeSpan/frontFace.faceHeight,.45,.90,1.12);
    if(frontFace.noseWidth) morphPatch.noseWidth=mapRatio(frontFace.noseWidth/frontFace.faceHeight,.18,.86,1.16);
    if(frontFace.mouthWidth) morphPatch.mouthWidth=mapRatio(frontFace.mouthWidth/frontFace.faceHeight,.34,.86,1.16);
    if(frontFace.noseLength) morphPatch.noseLength=mapRatio(frontFace.noseLength/frontFace.faceHeight,.23,.88,1.14);
    if(frontFace.jawSpan) morphPatch.jawWidth=clamp((morphPatch.jawWidth+mapRatio(frontFace.jawSpan/frontFace.faceHeight,.56,.86,1.16))/2,.86,1.16);
  }
  if(sideLandmarks?.face.length){
    const profile=faceRatios(sideLandmarks.face);
    if(profile.faceHeight && profile.noseLength) morphPatch.noseProjection=mapRatio(profile.noseLength/profile.faceHeight,.23,.90,1.12);
  }

  const detected=landmarkSets.filter(Boolean);
  const landmarkConfidence=detected.length
    ? detected.reduce((sum,item)=>sum+((item!.poseConfidence+item!.faceConfidence)/2),0)/detected.length
    : 0;

  const available = [front, side, back].filter(Boolean) as ViewAnalysis[];
  const confidence = available.length
    ? available.reduce((sum, view) => sum + view.foregroundConfidence, 0) /
      available.length
    : 0;

  // Fit quality is intentionally separate from mask confidence. It rewards
  // multiple views and front/back agreement, and never claims pixel-perfect fit.
  const pairAgreement = (key: 'headWidth' | 'shoulderWidth' | 'chestWidth' | 'waistWidth' | 'hipWidth') => {
    if (!front || !back || front[key] === null || back[key] === null) return 0.55;
    const a = front[key] as number, b = back[key] as number;
    return clamp(1 - Math.abs(a - b) / Math.max(a, b, 0.001), 0, 1);
  };
  const agreement = (['headWidth','shoulderWidth','chestWidth','waistWidth','hipWidth'] as const)
    .reduce((sum, key) => sum + pairAgreement(key), 0) / 5;
  const viewCoverage = available.length / 3;
  const symmetry = available.length
    ? available.reduce((sum, view) => sum + view.silhouetteSymmetry, 0) / available.length
    : 0;
  const fitQuality = clamp(
    confidence * 0.25 + agreement * 0.30 + viewCoverage * 0.25 + symmetry * 0.20,
    0,
    0.94
  );

  const notes: string[] = [];
  if (!front) notes.push('Front view missing.');
  if (!side) notes.push('Side view missing, depth morphs remain approximate.');
  if (!back) notes.push('Back view missing, rear silhouette is not cross-checked.');
  notes.push(!useLandmarks ? 'Fast diagnostics used silhouette measurements only.' : landmarkConfidence > 0 ? 'On-device pose/face landmarks refined anatomical proportions.' : 'Landmark model unavailable; using silhouette fallback.');
  notes.push('Fit writes supported editable character modifiers; every fitted value remains editable in Modeling.');
  if (confidence < 0.45) {
    notes.push('Low silhouette extraction confidence. Plain backgrounds and T-poses will fit better.');
  }

  return {
    front,
    side,
    back,
    morphPatch,
    confidence,
    landmarkConfidence,
    fitQuality,
    notes
  };
}
