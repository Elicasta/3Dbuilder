# Studio Character Acceptance Standard

3D Builder does not call a character production-ready because the neutral mesh resembles the reference. The asset must survive modeling, rigging, animation, shading and engine/DCC handoff.

## Neutral asset
- Stable production topology and UVs.
- Anatomical landmarks and joint placement follow the evaluated character, not a generic skeleton.
- Eyes are separate render/deformation objects. Hero/cinematic humans require teeth and tongue.
- No non-manifold, collapsed, inverted or non-finite production geometry.
- Character scale, axes and neutral pose are explicit and versioned.

## Deformation
- Every production vertex has normalized skin weights with the supported influence budget.
- Test shoulder raise/forward, elbow flex, wrist rotation, hip flex/abduction, knee flex, ankle, spine bend/twist and neck/head extremes.
- Measure triangle collapse/inversion and inspect volume loss at shoulders, hips, elbows, knees, neck and groin.
- Hero/cinematic characters require pose-space correctives where linear skinning cannot preserve volume.
- Face requires semantic animation controls, jaw, eyelids, eye aim coordination, lips/mouth interior and expression QA. Identity morphs alone are not a facial rig.

## Surface
- PBR texture images must actually load; parsed file names are not sufficient.
- Validate BaseColor, Normal, Roughness, Metallic/AO where applicable and opacity for hair/cards.
- Skin requires a target-renderer subsurface strategy. Eyes need cornea/sclera/iris behavior rather than ordinary opaque skin shading.
- Tangents, normals, UV seams and texture color spaces are validated at export.

## Hair and clothing
- Hair is a separate groom/cards/mesh asset with a scalp strategy and LOD policy.
- Clothing remains separate geometry, fitted to the evaluated body and deformation-tested.
- Hidden body regions may be masked/removed for runtime delivery, but the editable source body remains intact.

## LOD and runtime
- LODs are separate validated geometry/skin representations, not merely viewport decimation.
- Each delivery target declares triangle, joint, material, draw-call and texture-memory budgets.
- Silhouette, UV/material identity, skeleton compatibility and animation continuity are regression-tested across LODs.

## Handoff
- Recipe and exported geometry must reference the same skeleton/weights.
- Skeletal export must be smoke-tested by re-importing into the intended DCC/engine.
- Validate coordinate system, units, bind/rest pose, bone hierarchy, skin weights, materials, texture paths and at least one animation.
- Unreal compatibility is not claimed until a generated character passes an Unreal skeletal import test. MetaHuman compatibility is not claimed unless standard topology/UV/rig requirements are actually met.

## Delivery profiles

### Cinematic
Highest neutral/detail quality; complete face and mouth rig; corrective deformation; high-resolution textures; high-quality groom; shot-ready shading.

### Game hero
Animation-ready body/face; correctives where needed; LOD chain; engine-tested skeletal export; gameplay collision/physics profile; controlled runtime budgets.

### Crowd/background
Shared animation compatibility; aggressive LOD/material/groom reduction; explicit CPU/GPU/memory budgets; no unnecessary high-cost facial systems.

## Current release blockers
1. hm08 must render through the real skinning skeleton in-app.
2. hm08 deformation torture suite must cover production poses and correctives.
3. Actual PBR texture image loading and eye shading.
4. Production eye/teeth/tongue component policy.
5. Facial animation rig/expression layer.
6. LOD generation and regression validation.
7. Skeletal GLB/FBX export plus round-trip/engine import validation.
