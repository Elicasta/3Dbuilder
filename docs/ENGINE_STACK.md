# 3D Builder research engine stack

3D Builder is intentionally **not** one monolithic model. It is an orchestration layer around several specialized engines plus a stable canonical character representation.

## Goal

The user experience stays simple:

```text
front + side + back
        ↓
   Build Character
        ↓
editable, riggable character
```

Internally we can run several candidates, compare them, and keep the useful parts.

## Core architecture

```text
References
   │
   ├─ landmarks / silhouette
   │
   ├─ parametric body prior ────────────── MPFB / MakeHuman
   │
   ├─ fast reconstruction candidate ────── TripoSR
   │
   ├─ character candidate ──────────────── CharacterGen
   │
   └─ research human candidates ────────── ECON / ICON
                    │
                    ↓
            Geometry fusion / fitting
                    │
                    ↓
             Canonical character
          topology · UV · skeleton
                    │
          ┌─────────┴─────────┐
          │                   │
      wardrobe             materials
          │                   │
          └─────────┬─────────┘
                    ↓
                  Blender
           cleanup · bake · rig
                    ↓
              GLB / FBX / BLEND
```

## Adapter rules

Every model lives behind an adapter. The application must never make the rest of the product depend directly on one research repository.

Each adapter will eventually expose:

- `probe()`
- `install()`
- `prepare()`
- `reconstruct(job)`
- `health()`
- `capabilities()`

Outputs are normalized to one job contract.

## Platform plan

### macOS

The desktop app and builder are native Tauri builds.

Apple Silicon-friendly engines can run locally when supported. CUDA-only research engines appear in Engine Lab but are not treated as required local dependencies.

### Windows

The desktop app is native Tauri.

CPU / DirectML / CUDA-capable adapters can run natively when supported. CUDA research engines can use the NVIDIA path. WSL2 can be added later as an alternate execution target.

### GPU worker

Linux + NVIDIA engines such as TRELLIS.2 can be attached as a high-quality worker without making the desktop app depend on Linux.

## Licensing

This project is currently research / non-commercial. That lets us experiment with research-only upstream models, but every adapter keeps its upstream repository and licensing separate.

Before any commercial release, the engine list must be audited and research-only adapters disabled or separately licensed.

## Immediate implementation order

1. Engine manager and hardware probe
2. MPFB / canonical base-body experiment
3. TripoSR adapter
4. CharacterGen adapter
5. Geometry fitting into canonical topology
6. ECON / ICON comparison lane
7. Blender cleanup and rigging worker
8. Remote TRELLIS.2 worker
