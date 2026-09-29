# Integration-first build policy

3D Builder is an orchestrator, not a research reimplementation project.

Before implementing a new subsystem, research maintained/open components that already solve it. Prefer integration when licensing, platform support, output quality, and deterministic interoperability fit the product.

## Canonical human: MakeHuman system assets

Production human topology moves to the MakeHuman hm08 asset family.

Why:
- stable, mature human topology
- CC0 core graphical assets
- existing body and face target library
- existing helper geometry for fitting clothing
- existing rigs and skinning workflows through MPFB
- target files are deterministic vertex-index offsets, which map naturally to 3D Builder recipes

The procedural TypeScript cage is frozen as `procedural-cage-v1`. It remains a fallback/test fixture, not the production human topology.

## Architecture

```text
3D Builder UI / recipe
        |
        +-- MakeHuman hm08 + targets ---- canonical human body
        |          |
        |          +-- MPFB/Blender ----- rig, proxies, clothes, export
        |
        +-- front/side/back ------------ fitting measurements
        |
        +-- TripoSR/CharacterGen/etc --- reference geometry candidates
        |
        +-- Blender -------------------- final assembly
        |
        +-- GLB / FBX / Unreal
```

## Integration rules

1. Research before coding a subsystem.
2. Record license and runtime constraints before adding it.
3. Keep third-party engines behind adapters.
4. Prefer data/assets over embedding GPL/AGPL code when the asset license permits it.
5. AI geometry is a fitting/reference source, not the deforming topology master.
6. Keep deterministic recipes so the same inputs rebuild the same character.
7. Preserve an offline/local path for core character creation.
8. Do not claim compatibility (MetaHuman, ARKit, etc.) until round-trip tests prove it.

## Next integrations

1. MakeHuman hm08 base mesh + system targets.
2. Map 3D Builder body/face sliders to MakeHuman target weights.
3. MPFB Blender finalizer for rigging and asset fitting.
4. MakeHuman proxy/clothing asset adapter.
5. Multi-view measurements drive target weights rather than procedural geometry.
6. AI candidates refine target values / textures.
7. Export validation for GLB and Unreal-oriented FBX.

## License boundary

Keep a machine-readable manifest for every imported component. Core MakeHuman graphical assets are intended for the canonical-data layer; MPFB/MakeHuman source code remains an external adapter/runtime rather than copied into the application core.
