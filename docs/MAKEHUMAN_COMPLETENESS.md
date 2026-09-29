# MakeHuman Completeness Pass

## Authoritative data

3D Builder consumes the installed MakeHuman hm08 data library rather than maintaining a parallel hand-authored modifier catalog.

- modeling_modifiers.json: modifier semantics
- modeling_sliders.json: task/category/label/camera metadata
- measurement_modifiers.json: anthropometric modifier semantics
- measurement_sliders.json: measurement task metadata
- bodyshapes definitions remain optional until their target family is promoted into the production UI

The Tauri bridge exposes only an allow-list of these definition files.

## Macro evaluation

Production human macro state keeps Age, Muscle, Weight and Body Proportions independent. Sex is selected by the human lane. Ethnic/ancestry blend weights are stored independently and normalized before target evaluation.

Age interpolation follows MakeHuman's hm08 landmarks: baby at 0, child at 0.1875, young at 0.5 and old at 1. Universal, height and proportions targets are resolved through the active age x muscle x weight dependency grid.

## Detail modifiers

Detailed modeling controls are generated from MakeHuman slider metadata. Recipe state stores the canonical modifier ID and a scalar value. Bipolar definitions such as nose/nose-scale-depth-decr|incr resolve to exactly one direction at a time. One-sided shape targets remain one-sided.

The legacy translated BodyMorph controls remain only where the reference fitter still needs a compact semantic parameter. They are not the source for the manual detail UI.

## Assets

The native asset catalog discovers MHCLO geometry, proxy and MHMAT files from installed MakeHuman data. Placeholder wardrobe cards are no longer the production geometry library.

The MakeHuman system source contains only a subset of useful body-part assets. Full production geometry should use the checked MakeHuman system asset pack and optional compatible packs. Asset selection must not be treated as complete until the MHCLO correspondence/refit evaluator is implemented.

## Next boundary

1. install/manage system asset packs in app data;
2. parse MHCLO correspondence and associated OBJ/material data;
3. fit selected assets to the currently evaluated hm08 body;
4. render eyes/teeth/hair/clothes as separate Three.js meshes;
5. persist selected asset IDs in recipes;
6. pass the same assets to Blender export;
7. add MHMAT/PBR material translation and texture loading;
8. add symmetry linking for paired left/right native modifiers;
9. connect the multi-view optimizer directly to native modifier IDs rather than legacy semantic aliases.
