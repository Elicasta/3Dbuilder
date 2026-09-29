# Reconstruction First

## Acceptance test

Given front, side and back T-pose references of one person, Build must produce a recognizable editable approximation of that same person. Asset breadth, clothing, export polish and alternate engines do not outrank this test.

## Architecture

1. Observation: segment each supplied view and detect body and face landmarks.
2. Shared identity solve: estimate one body/head identity across all views. Shape is shared; per-view camera alignment is not.
3. Parametric prior: optional neural predictors initialize body/head parameters. They never become editable topology.
4. Refinement loop: render the current canonical body into each view and minimize silhouette, landmark, proportion and profile losses.
5. Canonical transfer: express the solved identity on production editable topology.
6. Surface refinement: only after identity is recognizable, optionally use ECON/normal/depth-style systems for clothing/hair evidence.
7. Assets, rig, materials and export are downstream production stages.

## Recommended research stack

### Body initialization

SMPL-X is a useful research interchange prior because it represents body, face and hands in one parameterized model. PIXIE is a useful image-to-SMPL-X initializer and can incorporate DECA facial detail.

SMPL-X model assets have their own license and must remain an optional user-installed research engine. Do not bundle or silently redistribute them.

### Face

Use a dedicated FLAME/DECA-family face estimate rather than expecting whole-body silhouette fitting to recover identity-specific facial shape. Fuse front and side evidence into one neutral identity estimate.

### Multi-view optimization

Our input is sparse user-provided front/side/back imagery, not a calibrated mocap studio. Each view therefore needs its own weak-perspective camera/alignment variables while sharing identity parameters.

Loss priorities: face landmarks/profile, body landmarks, front/back silhouette, side silhouette/depth, cross-view proportions, neutral-pose symmetry and parameter regularization.

Do not use a raw generated mesh as the optimization target unless registered to the canonical body.

### Surface detail

ECON/ICON-class reconstruction is downstream. It is useful for clothed normals and high-frequency surface evidence, but it does not replace identity/body fitting.

## Hardware

### Mac M1

Run image preprocessing, masks, deterministic measurements, canonical evaluation and lightweight optimization locally. Keep the editor fully functional without CUDA.

### NVIDIA worker

Use the Legion as an optional worker for PIXIE/SMPL-X, DECA/FLAME, ECON-class refinement and future heavier models. Jobs return parameter/evidence artifacts, not authoritative application state.

## Current implementation

solveIdentityFromReferences is now the primary Build path for two or three views. It creates a single identity fit/objective and writes that fit into the editable character. TripoSR is only a one-view fallback.

This first solver still uses the existing silhouette analyzer. The next implementation milestone is landmark/mask extraction plus render-and-compare optimization.
