import type { EngineDefinition } from '../types/engine';

export const ENGINES: EngineDefinition[] = [
  {
    id: 'makehuman',
    name: 'MakeHuman hm08 Assets',
    role: 'body-prior',
    repository: 'https://github.com/makehumancommunity/makehuman.git',
    researchOnly: false,
    summary: 'Production human base topology and sparse morph-target library.',
    bestFor: 'Stable canonical human mesh, body/face morph data, fitting helpers.',
    runtime: 'Native asset data',
    priority: 'core'
  },
  {
    id: 'mpfb',
    name: 'MPFB / MakeHuman',
    role: 'body-prior',
    repository: 'https://github.com/makehumancommunity/mpfb2.git',
    researchOnly: false,
    summary: 'Parametric human base-body and Blender character workflow.',
    bestFor: 'Canonical topology, morph targets, rig-ready base humans.',
    runtime: 'Blender',
    priority: 'core'
  },
  {
    id: 'triposr',
    name: 'TripoSR',
    role: 'reconstruction',
    repository: 'https://github.com/VAST-AI-Research/TripoSR.git',
    researchOnly: false,
    summary: 'Fast single-image reconstruction used as a local geometry candidate.',
    bestFor: 'Fast prototype meshes and fallback reconstruction.',
    runtime: 'Python / PyTorch',
    priority: 'core'
  },
  {
    id: 'charactergen',
    name: 'CharacterGen',
    role: 'human-reconstruction',
    repository: 'https://github.com/zjp-shadow/CharacterGen.git',
    researchOnly: false,
    summary: 'Character-focused image-to-3D pipeline with canonicalized views.',
    bestFor: 'Primary character reconstruction experiments.',
    runtime: 'Python / CUDA recommended',
    priority: 'core'
  },
  {
    id: 'econ',
    name: 'ECON',
    role: 'human-reconstruction',
    repository: 'https://github.com/YuliangXiu/ECON.git',
    researchOnly: true,
    summary: 'Research pipeline for reconstructing clothed humans.',
    bestFor: 'Loose clothing and human-specific geometry experiments.',
    runtime: 'Python / CUDA',
    priority: 'gpu-lab'
  },
  {
    id: 'icon',
    name: 'ICON',
    role: 'human-reconstruction',
    repository: 'https://github.com/YuliangXiu/ICON.git',
    researchOnly: true,
    summary: 'Implicit clothed-human reconstruction research.',
    bestFor: 'Human prior comparison and surface reconstruction experiments.',
    runtime: 'Python / CUDA',
    priority: 'gpu-lab'
  },
  {
    id: 'instantmesh',
    name: 'InstantMesh',
    role: 'reconstruction',
    repository: 'https://github.com/TencentARC/InstantMesh.git',
    researchOnly: false,
    summary: 'Multi-view diffusion plus sparse-view reconstruction.',
    bestFor: 'Alternative generic reconstruction candidate.',
    runtime: 'Python / CUDA recommended',
    priority: 'optional'
  },
  {
    id: 'trellis2',
    name: 'TRELLIS.2',
    role: 'reconstruction',
    repository: 'https://github.com/microsoft/TRELLIS.2.git',
    researchOnly: false,
    summary: 'High-end 3D asset generation path for a dedicated NVIDIA worker.',
    bestFor: 'High-quality geometry and material experiments on a GPU box.',
    runtime: 'Linux / NVIDIA GPU',
    priority: 'gpu-lab'
  }
];
