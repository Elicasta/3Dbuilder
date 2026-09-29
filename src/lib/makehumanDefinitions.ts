import type { ResolvedMorphTarget } from './makehumanMorphs';

export interface MakeHumanSlider {
  id: string;
  label: string;
  camera?: string;
  category: string;
  section: string;
  bipolar: boolean;
}

type SliderEntry = { mod: string; label?: string; cam?: string; enabledCondition?: string };
type SliderFile = Record<string, {
  label?: string;
  sortOrder?: number;
  modifiers?: Record<string, SliderEntry[]>;
}>;

export function parseMakeHumanSliders(text: string): MakeHumanSlider[] {
  const data = JSON.parse(text) as SliderFile;
  const sliders: MakeHumanSlider[] = [];
  for (const [categoryKey, category] of Object.entries(data)) {
    for (const [section, entries] of Object.entries(category.modifiers ?? {})) {
      for (const entry of entries) {
        if (!entry.mod || !entry.mod.includes('/')) continue;
        const leaf = entry.mod.split('/').pop() ?? entry.mod;
        if (/^(Gender|Age|Muscle|Weight|Height|BodyProportions|African|Asian|Caucasian|BreastSize|BreastFirmness)$/.test(leaf)) continue;
        sliders.push({
          id: entry.mod,
          label: entry.label ?? leaf.replace(/[-_]/g, ' '),
          camera: entry.cam,
          category: category.label ?? categoryKey,
          section,
          bipolar: entry.mod.includes('|')
        });
      }
    }
  }
  return sliders;
}

export function resolveNativeModifier(
  id: string,
  value: number,
  catalog: readonly string[]
): ResolvedMorphTarget[] {
  const exact = (path: string) => catalog.find((entry) => entry.toLowerCase() === path.toLowerCase()) ?? null;
  const slash = id.indexOf('/');
  if (slash < 1) return [];
  const group = id.slice(0, slash);
  const leaf = id.slice(slash + 1);

  if (!leaf.includes('|')) {
    if (value <= 0.0001) return [];
    const path = exact(`${group}/${leaf}.target`);
    return path ? [{ path, weight: Math.min(1, Math.max(0, value)) }] : [];
  }

  const pipe = leaf.lastIndexOf('|');
  const left = leaf.slice(0, pipe);
  const rightSuffix = leaf.slice(pipe + 1);
  const dash = left.lastIndexOf('-');
  if (dash < 0 || Math.abs(value) <= 0.0001) return [];
  const stem = left.slice(0, dash);
  const leftSuffix = left.slice(dash + 1);
  const suffix = value < 0 ? leftSuffix : rightSuffix;
  const path = exact(`${group}/${stem}-${suffix}.target`);
  return path ? [{ path, weight: Math.min(1, Math.abs(value)) }] : [];
}

export function resolveNativeModifiers(
  values: Readonly<Record<string, number>>,
  catalog: readonly string[]
): ResolvedMorphTarget[] {
  const merged = new Map<string, number>();
  for (const [id, value] of Object.entries(values)) {
    for (const target of resolveNativeModifier(id, value, catalog)) {
      merged.set(target.path, (merged.get(target.path) ?? 0) + target.weight);
    }
  }
  return [...merged].map(([path, weight]) => ({ path, weight }));
}
