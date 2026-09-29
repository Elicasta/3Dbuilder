import { describe, expect, it } from 'vitest';
import { FIT_KEYS, FIT_LIMITS } from './profileOptimizer';

describe('optimizer safety invariants',()=>{
  it('declares a finite ordered bound for every fitted parameter',()=>{
    for(const key of FIT_KEYS){const [lo,hi]=FIT_LIMITS[key];expect(Number.isFinite(lo)).toBe(true);expect(Number.isFinite(hi)).toBe(true);expect(lo).toBeLessThan(hi);expect(1).toBeGreaterThanOrEqual(lo);expect(1).toBeLessThanOrEqual(hi)}
  });
  it('does not contain duplicate fitted parameter names',()=>{expect(new Set(FIT_KEYS).size).toBe(FIT_KEYS.length)});
});
