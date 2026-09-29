# Phase 3 — Production Character System

Phase 2 proved the character recipe, humanoid hierarchy, morph controls, pose propagation and Blender handoff. Phase 3 turns that engineering cage into the reusable asset contract that every later fitting, AI, wardrobe and export system targets.

## Phase 3 execution map

### 3.1 Stable production topology
- One canonical vertex/index layout per topology family.
- Vertex IDs and index count stay invariant while body morphs change.
- Deformation loops are concentrated around shoulders, elbows, wrists, hips, knees, ankles, neck and face.
- No AI-generated topology becomes the deforming master mesh.
- The current generated cage remains the migration source until an authored production template replaces it.

**Gate:** topology invariance tests pass across extreme supported morphs.

### 3.2 Deterministic skinning
- Maximum four influences per body vertex.
- Every vertex has normalized weights.
- Left/right extremities are constrained to their own limb chain.
- Core vertices blend pelvis/spine/chest/neck.
- Recipes persist the weights so Blender, GLB and future Unreal export reproduce the same deformation.
- Blender automatic weights are legacy fallback only.

**Gate:** skin contract tests pass and Blender receives named vertex groups plus an armature modifier.

### 3.3 Deformation quality
- Add authored weight profiles around shoulder/armpit, elbow, hip/groin and knee.
- Add corrective shape data for high-angle shoulder, elbow, hip and knee poses.
- Keep the six Phase 2 pose presets as regression poses.
- Add deformation metrics for collapse, inversion and excessive volume loss.

**Gate:** T, A, Relaxed, Elbow, Knee and Shoulder poses survive without disconnection, inversion or severe volume collapse.

### 3.4 Integrated body parts
- Move neck, head, hands and feet from display primitives into the production topology family.
- Keep eyeballs, teeth/tongue and hair separate where appropriate.
- Preserve named facial landmarks for the existing face morph controls.
- Male first, then female, then alien topology family where anatomy requires divergence.

**Gate:** body exports as one skinned body surface plus intentional separate eye/hair/accessory objects.

### 3.5 UV and material contract
- Stable UV0 for body.
- Material regions: skin, eyes, mouth/teeth, hair and wardrobe.
- PBR slots: BaseColor, Normal, Roughness, Metallic, AO and Opacity when needed.
- 2K default, 4K Unreal/hero option.
- Tangent-safe export and consistent texel density.

**Gate:** a saved character can be reopened/exported without UV or material reassignment.

### 3.6 Reference fitting
- Front/side/back measurements drive morphs on the stable production mesh.
- Normalize views by body height.
- Front/back establish widths; side establishes depth.
- Reject outliers/asymmetry and report extraction confidence separately from fit quality.
- AI reconstruction is a shape/reference source, never the canonical topology.

**Gate:** the same recipe produces the same fitted body regardless of reconstruction engine availability.

### 3.7 Production export
- Recipe schema v3 stores topology contract, joints and deterministic skin weights.
- Blender import uses supplied weights instead of automatic weighting.
- GLB is the primary portable output.
- FBX profile preserves humanoid bone names and PBR material assignments for DCC/game use.
- Unreal profile remains retarget-friendly without claiming MetaHuman compatibility.
- Print export stays a separate later conversion path.

**Gate:** round-trip character -> Blender -> export preserves topology, rig, weights and materials.

## Implementation state

Implemented in the first Phase 3 push:
- v3 character recipe schema.
- Stable topology invariance contract test.
- Deterministic four-influence skin-weight generator.
- Weight normalization and left/right ownership tests.
- Skin weights persisted in saved/export recipes.
- Blender importer creates named vertex groups and armature modifier from recipe weights.
- Legacy automatic-weight fallback retained for v2 recipes.

Next implementation slice is deformation quality plus replacement of the generated cage with the authored production template. The data contract introduced here is intentionally independent of that mesh, so the template can replace the cage without changing saved character recipes or the rig API.
