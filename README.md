# 3D Builder

A local-first desktop character builder for **macOS and Windows**.

V1 is being built as a real builder from the start:

- front / side / back reference intake
- live 3D viewport
- reusable character data model
- body proportion controls
- modular wardrobe slots
- native Blender detection
- native recipe saving
- Tauri desktop shell
- macOS + Windows build workflow

The AI reconstruction stage is the next engine layer. The current base character is procedural so the editor, data model, wardrobe system, native shell, and 3D viewport can be built and tested before we connect image-to-3D inference.

## Stack

- Tauri 2
- Rust
- React + TypeScript
- Three.js
- React Three Fiber
- Blender as the finishing / rig / export engine

## Development

### macOS

Prerequisites:

- Node.js 20+
- Rust stable
- Xcode Command Line Tools
- Blender optional for the current build, required for the Blender pipeline later

```bash
npm install
npm run tauri dev
```

### Windows

Prerequisites:

- Node.js 20+
- Rust stable using the MSVC toolchain
- Visual Studio Build Tools with Desktop development with C++
- Microsoft WebView2 Runtime
- Blender optional for the current build

```powershell
npm install
npm run tauri dev
```

## Production builds

```bash
npm run tauri build
```

GitHub Actions also builds:

- a universal macOS app / DMG
- Windows x64 installers

See `.github/workflows/desktop-build.yml`.

## V1 pipeline

```text
Reference images
  ↓
Reference alignment
  ↓
Base-character fitting
  ↓
Live builder
  ├─ body morphs
  ├─ appearance
  └─ wardrobe / gear slots
  ↓
Blender cleanup
  ↓
Rigging
  ↓
GLB / FBX / BLEND
```

## Current milestone

Implemented foundation:

- Tauri desktop app structure
- live orbitable 3D procedural character
- body morph sliders
- material colors
- shirt / pants / boots / vest slots
- reference-image previews
- cross-platform Blender detection
- native character-recipe saving
- macOS and Windows CI build definitions

Research engine layer now included:

- MPFB / MakeHuman body-prior adapter
- TripoSR local reconstruction candidate
- CharacterGen character reconstruction candidate
- ECON and ICON research lanes
- InstantMesh alternative reconstruction lane
- TRELLIS.2 GPU-worker lane
- cross-platform system capability detection
- source installer with an allow-listed engine catalog
- TripoSR runtime preparation
- first real AI build path: front reference → GLB
- one-click open generated mesh in Blender

See `docs/ENGINE_STACK.md`.

Next engine milestone:

**front / side / back reference images → multiple reconstruction candidates → canonical fitted base mesh**

The first AI lane is now wired end-to-end through TripoSR. On macOS the adapter automatically uses the Apple-Silicon-oriented TripoSR fork; Windows uses the official source. The multi-view fusion and canonical fitting layer is next.
