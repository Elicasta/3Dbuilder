import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { DEFAULT_CHARACTER } from '../types/character';
import { runHm08TortureTest } from './hm08Torture';

const fixture=process.env.HM08_OBJ_FIXTURE;
async function exists(path:string){try{await access(path);return true}catch{return false}}

describe.skipIf(!fixture)('real hm08 inverse-fit torture',()=>{
  it('has observable fitted parameters and recovers synthetic identities',async()=>{
    if(!fixture||!(await exists(fixture)))return;
    const obj=await readFile(fixture,'utf8');
    const report=await runHm08TortureTest(obj,DEFAULT_CHARACTER);
    expect(report.deadParameters,JSON.stringify(report,null,2)).toEqual([]);
    expect(report.couplings,JSON.stringify(report,null,2)).toEqual([]);
    expect(report.passed,JSON.stringify(report,null,2)).toBe(true);
  },120000);
});
