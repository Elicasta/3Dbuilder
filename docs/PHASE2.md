# Phase 2 — Character Core

Phase 2 moves 3D Builder from reconstruction prototype to deterministic character system.

## Acceptance criteria

- Canonical body remains editable independently of AI topology.
- Front/side/back fitting reports mask confidence separately from body-fit quality.
- Canonical humanoid joints are derived from the same morph state as the body.
- Pose tests exercise shoulders, elbows, hips and knees.
- Canonical cage deforms from pose state.
- Face has an editable parameter set rather than a fixed primitive head.
- AI candidate can be inspected independently or overlaid against the canonical body.
- Character recipes persist morphs, appearance, wardrobe and canonical rig data.
- Blender handoff exports the canonical body plus humanoid armature.
- Frontend character-core tests and Rust tests run on macOS and Windows CI.

## Phase 2 output contract

A saved Phase 2 recipe uses schema `3dbuilder.character.v2` and is the source of truth for the editable character. AI meshes are evidence/candidates, not the deforming topology.

The canonical export uses Y-up meters internally. Blender import converts the body and joint scaffold to Blender coordinates and attempts automatic armature weighting. Production corrective weights, fingers, facial bones/blendshapes, authored UVs and final Unreal retarget profiles belong to Phase 3.

## Phase 3 entry gate

Phase 3 starts after the Phase 2 CI matrix is green and the pose-test UI has been visually checked on a representative male, female and alien profile.
