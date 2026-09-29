export type EngineRole = 'body-prior' | 'reconstruction' | 'human-reconstruction' | 'texture' | 'finishing';

export interface SystemCapabilities {
  platform: string;
  arch: string;
  blenderPath: string | null;
  pythonPath: string | null;
  gitPath: string | null;
  nvidiaSmiPath: string | null;
}

export interface EngineStatus {
  id: string;
  installed: boolean;
  prepared: boolean;
  sourcePath: string | null;
}

export interface EngineDefinition {
  id: string;
  name: string;
  role: EngineRole;
  repository: string;
  researchOnly: boolean;
  summary: string;
  bestFor: string;
  runtime: string;
  priority: 'core' | 'optional' | 'gpu-lab';
}
