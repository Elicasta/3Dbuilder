# Production Character Milestone

This milestone replaces the prototype character path with one coherent production path. Do not split this into UI-only micro phases: every chunk must leave the desktop app runnable and preserve the same character recipe.

## Definition of done

A user can choose Male/Female, load front/side/back references, fit one editable MakeHuman hm08 character, refine it with live controls, inspect a matching humanoid rig, save/reopen the recipe, and send that same morphed body to Blender for GLB/FBX finishing. AI reconstruction remains an optional comparison/refinement source.

## Chunk A — canonical character core

- hm08 is the production human topology; procedural-cage-v1 is fallback/test only.
- MakeHuman macro values own gender, weight/muscle, height and body proportions.
- Builder controls resolve to installed MakeHuman targets.
- Target application is deterministic and shared by viewport, fitting and export.
- Male/Female use the same vertex/index topology.
- Character recipe persists canonical family, macro values and detailed morphs.
- Slider changes never alter vertex IDs.
- Human lane defaults are neutral and do not secretly stack sex-specific hand-authored offsets.

Gate: male/female and all exposed human controls visibly deform hm08 while topology tests remain invariant.

## Chunk B — multi-view fitting

- Normalize each usable reference by detected body height.
- Front/back establish widths and left/right symmetry.
- Side establishes chest, waist, hip and head depth.
- Extract shoulder, chest, waist, hip, limb and head measurements at stable normalized landmarks.
- Reject obvious background/outlier rows and report extraction confidence separately from fit quality.
- Solve measurements into the same canonical controls used by manual sliders.
- Never replace canonical topology with AI topology.
- Preserve manual editability after fitting.

Gate: front+side+back produce a deterministic MakeHuman morph recipe and repeated fitting of the same inputs produces the same result.

## Chunk C — production rig and export

- Remove procedural-cage export from the human production path.
- Export the actual morphed hm08 vertex positions and visible faces.
- Use MakeHuman/MPFB rig data or a tested compatible humanoid skeleton rather than guessing joints from the old cage.
- Rig overlay reads the same skeleton used by Blender export.
- Persist deterministic skinning/rig identity in the recipe.
- Blender handoff creates body, armature, material slots and armature binding from the production data.
- GLB is the portable default; FBX/Unreal profile preserves humanoid naming and scale.
- Do not claim MetaHuman compatibility.

Gate: viewport character -> Blender -> GLB/FBX preserves the same body shape and humanoid rig.

## Chunk D — production asset layer

- Preserve hm08 UV0 and material grouping.
- Separate body, eyes, hair and wardrobe objects.
- Base PBR contract: BaseColor, Normal, Roughness, Metallic, AO; Opacity when required.
- Underwear/minimal-clothing base is the default builder presentation.
- Wardrobe slots remain independent assets and can hide covered body regions later.
- AI reconstruction candidates may provide shape/texture hints but never become the deforming master topology.
- Add 2K default and 4K hero/Unreal material intent to export recipe.

Gate: a saved character reopens with the same body, appearance/material intent, wardrobe references and export profile.

## Deferred until this milestone is green

- Non-humanoid alien topology branches.
- ARKit facial blendshape set.
- Groom/strand hair.
- LOD generation.
- Print manifold conversion.
- MetaHuman-specific conversion.
- GPU-only reconstruction engines as required dependencies.

## Build order

A -> B -> C -> D, with tests at each boundary. The desktop app remains runnable after every commit and the canonical recipe is the contract between all four chunks.
