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
    name: 'MPFB / Blender Finisher',
    role: 'body-prior',
    repository: 'https://github.com/makehumancommunity/mpfb2.git',
    researchOnly: false,
    summary: 'Blender-side finishing, proxy assets and rig workflow for the hm08 character.',
    bestFor: 'Final Blender handoff, clothing/proxies and production finishing.',
    runtime: 'Blender',
    priority: 'optional'
  },
  {
    id: 'triposr',
    name: 'TripoSR',
    role: 'reconstruction',
    repository: 'https://github.com/VAST-AI-Research/TripoSR.git',
    researchOnly: false,
    summary: 'Apple-Silicon-capable local image-to-3D candidate; never replaces hm08 topology.',
    bestFor: 'Local reference geometry when a photo contains shape detail the fitter cannot measure.',
    runtime: 'Python / PyTorch',
    priority: 'core'
  },
  {
    id: 'charactergen',
    name: 'CharacterGen',
    role: 'human-reconstruction',
    repository: 'https://github.com/zjp-shadow/CharacterGen.git',
    researchOnly: false,
    summary: 'GPU-worker character reconstruction candidate; not a local Apple-Silicon production dependency.',
    bestFor: 'NVIDIA worker experiments for character-specific geometry evidence.',
    runtime: 'Python / CUDA recommended',
    priority: 'gpu-lab'
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
