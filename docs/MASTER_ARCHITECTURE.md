# 3D Builder master architecture

## Product

3D Builder is a cross-platform character creation system for macOS and Windows.

It supports three starting character lanes:

- Male
- Female
- Alien

and three style families:

- Stylized
- Semi-real
- Real human

The builder owns a canonical editable character. AI engines provide measurements, geometry candidates, texture hints, and research outputs, but the product is not locked to any one model.

## Integration-first policy

Do not reimplement solved character technology unless integration fails a concrete requirement. Research existing components before each phase. The procedural TypeScript cage is now frozen as `procedural-cage-v1` and remains a fallback/test fixture.

The production human path is `makehuman-hm08-v1`: CC0 MakeHuman core graphical assets provide the base mesh and morph-target data, while MPFB/Blender remains an external adapter for rigging, proxy/clothing fitting, and finishing. See `docs/INTEGRATION_FIRST.md`.

## Character flow

```text
front + side + back
        ↓
multi-view silhouette fit
        ↓
MakeHuman hm08 canonical human / topology-family body
        ↓
AI reconstruction candidates
        ↓
geometry fitting / refinement
        ↓
appearance + wardrobe + gear
        ↓
rig + Blender finishing
        ↓
GLB / FBX / BLEND / STL
```

## Current canonical controls

Shared body controls include height, build, shoulders, chest width/depth, waist width/depth, hips width/depth, torso length, arm length/thickness, leg length/thickness, hand size, foot size, neck size, and head size.

Male adds jaw/cranium/eye shaping.

Female adds bust width/projection plus face shaping.

Alien starts humanoid but expands head, cranium, eye, limb, neck, skin, sclera, markings, and non-human proportion ranges.

## Appearance

The current shared appearance model includes:

- primary and secondary skin
- iris / eye color
- sclera
- hair
- brows
- lips
- markings
- skin roughness
- subsurface intent value
- freckles/detail amount
- marking opacity

The Three.js viewport previews the look. High-end skin shading will be authored in Blender and Unreal rather than treating the preview shader as final.

## Wardrobe / gear slots

The canonical body exposes:

- top
- bottom
- footwear
- outerwear
- headwear
- eyewear
- gloves
- belt
- gear

These remain separate objects from the body so they can be generated, fitted, rigged, replaced, or hidden independently.

## Real-human / Unreal target

The real-human lane is designed around a separate production mesh family over time rather than stretching the stylized mesh forever.

Target requirements:

- realistic face and deformation topology
- high-resolution UVs
- separate body / eye / hair / clothing material slots
- PBR base color / normal / roughness / AO
- skin shading values suitable for subsurface workflows
- retargetable humanoid skeleton
- FBX export
- Unreal-oriented naming and scale
- facial blendshape / ARKit-style target lane later
- hair cards first, groom/strand support later
- LOD generation later

## Multi-view

Multi-view is the default fitting philosophy.

The current first pass extracts silhouettes directly from the uploaded front, side, and back references and maps them into canonical body morphs.

This is intentionally separate from AI mesh generation:

```text
multi-view references → measurements → editable canonical body
front reference → TripoSR → raw AI geometry candidate
```

Next, CharacterGen and human-specific research engines will contribute candidate geometry and surface information that is fitted back into the canonical body.

## Engine policy

Every research model stays behind an adapter.

Current catalog:

- MPFB / MakeHuman
- TripoSR
- CharacterGen
- ECON
- ICON
- InstantMesh
- TRELLIS.2

Research-only tools are allowed in the current non-commercial project but must remain isolated so a future commercial build can disable or replace them without changing the app.

## Platform policy

macOS and Windows are first-class targets from the beginning.

GPU-heavy Linux/NVIDIA-only engines live behind optional worker adapters rather than forcing the desktop app onto Linux.
