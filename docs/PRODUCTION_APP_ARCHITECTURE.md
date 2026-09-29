# Production Application Architecture

3D Builder is a local-first character authoring application built around a stable MakeHuman hm08 canonical human.

## Product workspaces

1. **Fit** — front / side / back reference intake, alignment, silhouette measurements and fitting.
2. **Character** — MakeHuman-style modeling subtasks: phenotype, measurements, face, torso, arms/legs, materials, wardrobe and output.
3. **Engines** — installation and diagnostics for optional reconstruction providers.

The viewport remains persistent while workspaces change. Engine management is infrastructure and must not interrupt normal character authoring.

## Source of truth

A character recipe is the authoritative editable state. Macro phenotype variables, local MakeHuman modifiers, appearance, wardrobe and output intent live in the recipe. The evaluated mesh is derived data. AI meshes are evidence, never the editable topology master.

## Geometry contract

**Human production topology:** MakeHuman hm08. Vertex order remains stable while target deltas alter positions. This lets one system serve editing, fitting, rig weights, UVs, clothing conformation and export.

**Alien topology:** humanoid aliens stay on hm08 plus custom targets where possible. A different topology family is justified only when anatomy cannot be represented without changing connectivity.

## Modeling

Use native MakeHuman concepts instead of generic builder sliders. Macro/phenotype values remain independent. Universal modifiers map explicitly to known target paths. A UI control is not exposed unless its target mapping is verified. Large custom deformations must include helper/joint geometry when they affect rigging or clothing. The procedural cage is fallback/test geometry only.

## Reference matching

Reference fitting is deterministic and editable: normalize images, extract silhouette/landmarks, estimate macro measurements, solve supported MakeHuman modifiers, evaluate hm08, compare projected canonical silhouette to references, then refine parameters within safe bounds. The fitter writes the same state the manual editor uses. AI reconstruction can provide shape evidence after deterministic fitting, but must be registered to the canonical character rather than replacing it.

## Reconstruction providers

### Local Apple Silicon / ordinary desktop

- MakeHuman hm08: required canonical body and target data.
- deterministic multi-view fitter: primary matching path.
- TripoSR MPS on Apple Silicon: optional reference-geometry candidate.
- Blender: finalization/export backend.

### NVIDIA worker / research

CharacterGen, ECON, ICON, InstantMesh and TRELLIS-class systems are optional worker adapters. They must not become requirements for opening, editing, saving or exporting a canonical character. Provider adapters return artifacts into the job system. They do not mutate character state directly.

## Assets

Eyes, teeth, eyebrows, eyelashes, hair, clothing, footwear, accessories, gear and optional body parts are separate geometry assets. Assets carry metadata, materials, body-conformation data and optional rig/sub-rig data. The base body can be masked under clothing at export time without destructively deleting canonical vertices.

## Rigging

Keep a neutral canonical skeleton definition independent from animator controls. Use a MakeHuman-compatible skeleton for authoring/general export, a game-engine profile for Unreal/Unity-style interchange, and Rigify only as a Blender control-rig option. Asset sub-rigs are allowed for independently moving hair, cloth accessories and appendages.

## Materials

Viewport materials are previews. Production materials use a portable PBR contract: Base Color, Normal, Roughness, Metallic, AO where useful, and Opacity where required. Blender-only procedural materials must be baked or converted before portable export.

## Export

Export is a build step from the recipe, not a dump of the live Three.js scene: evaluate targets, apply assets, rig/weights, remove helpers as required, create an export copy, convert materials, validate scale/orientation/skeleton/mesh, then write the target format.

Profiles: Web/general uses GLB/glTF. Game/Unreal uses FBX plus PBR textures and a stable humanoid skeleton. Blender uses an editable BLEND handoff. Print is a separate watertight STL/3MF branch.

## Persistence and jobs

Recipes are small, versioned and deterministic. Heavy artifacts live in per-job folders. Jobs record recipe/version, references, engine/version, parameters, logs, produced artifacts and failure state. A failed engine/export can therefore be retried without corrupting the editable character.

## Reliability rules

- Local character editing works without network access.
- Missing optional engines degrade features, never the canonical editor.
- Unsupported hardware is reported before installation/inference.
- Every exposed modifier has a regression test.
- Every export profile gets structural validation.
- The production body never silently falls back to AI-generated topology.
