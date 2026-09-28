import {afterEach,describe,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {Reviewer,validateOutput} from '../packages/reviewer/src/index.js';
import {parseReviewInput} from '../packages/contracts/src/input.js';
import {packet,INITIAL_TIME} from '../fixtures/demo.js';
const parsed=parseReviewInput({...packet('src/adapters/legacy/status.ts'),repo_id:randomUUID()});
function output(refs:string[]){return {summary:'Review',findings:[{category:'convention',severity:'low',file:'src/adapters/legacy/status.ts',line_start:5,line_end:5,message:'Use the shared transport wrapper.',suggestion:'Review the repository transport convention.',rule_key:'transport-wrapper',evidence_refs:refs}],questions:[],limitations:[]};}
afterEach(()=>vi.unstubAllGlobals());
describe('generation citation contract',()=>{
 it('rejects rule names as citations but permits an uncited static guideline',()=>{
  expect(()=>validateOutput(output(['transport-wrapper']),parsed,[])).toThrow('Generated source is not permitted');
  expect(validateOutput(output([]),parsed,[]).findings).toHaveLength(1);
 });
 it('repairs an invented citation with explicit empty-source instructions',async()=>{
  const requests:any[]=[];
  vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{
   requests.push(JSON.parse(init.body));
   return Response.json({choices:[{message:{content:JSON.stringify(output(requests.length===1?['transport-wrapper']:[]))}}]});
  }));
  const result=await new Reviewer('https://provider.example','test-key','test-model').generate(parsed,[],INITIAL_TIME);
  expect(result.metadata.attempts).toBe(2);
  expect(requests[0].response_format.json_schema.schema.properties.findings.items.properties.evidence_refs.maxItems).toBe(0);
  expect(requests[1].messages.at(-1).content).toContain('Allowed evidence references: []');
  expect(result.output.findings[0].evidence_refs).toEqual([]);
 });
 it('still fails closed if the repair invents another citation',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({choices:[{message:{content:JSON.stringify(output(['transport-wrapper']))}}]})));
  await expect(new Reviewer('https://provider.example','test-key','test-model').generate(parsed,[],INITIAL_TIME)).rejects.toMatchObject({code:'GENERATION_VALIDATION_FAILED'});
 });
});
