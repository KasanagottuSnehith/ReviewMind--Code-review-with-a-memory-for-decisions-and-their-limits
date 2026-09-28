import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {applicability,resolveDecisions,validateDecision,type Context} from '../packages/decision-engine/src/index.js';
import {checkTimeout} from '../packages/decision-engine/src/timeout.js';
import {parseReviewInput,normalizePath} from '../packages/contracts/src/input.js';
import {validateOutput,finalizeReview} from '../packages/reviewer/src/index.js';
import {assertRole,type Decision,type Evidence} from '../packages/contracts/src/index.js';
import {demoFixtures,packet,INITIAL_TIME,EXPIRY} from '../fixtures/demo.js';
const repo=randomUUID(),run=randomUUID();
function decision(overrides:Partial<Decision>={}):Decision{return {id:randomUUID(),repo_id:repo,demo_run_id:run,kind:'temporary_exception',rule_key:'transport-wrapper',scope:{path_glob:'src/adapters/legacy/**',dependency_name:'bridge-client',version_range:'>=1.8.0 <2.0.0',effective_from:INITIAL_TIME,expires_at:EXPIRY,prerequisites:[]},rationale:'Approved synthetic compatibility exception.',source_event_ids:[randomUUID()],supersedes_id:null,version:1,status:'approved',approved_by:randomUUID(),approved_at:INITIAL_TIME,memory_status:'ready',approval_event_id:randomUUID(),draft_status:'ready',created_at:INITIAL_TIME,...overrides};}
const ctx:Context={repoId:repo,runId:run,file:'src/adapters/legacy/status.ts',versions:{'bridge-client':'1.8.0'},time:INITIAL_TIME,contextSources:[]};
describe('deterministic authority boundaries',()=>{
 it('applies a fully verified ready decision',()=>expect(applicability(decision(),ctx).status).toBe('applicable'));
 it.each([['2026-09-29T23:59:59.999Z','applicable'],[EXPIRY,'expired'],['2026-10-01T00:00:00Z','expired'],['2026-09-29T08:59:59Z','future']])('exclusive time boundary %s',(time,status)=>expect(applicability(decision(),{...ctx,time}).status).toBe(status));
 it('rejects another path',()=>expect(applicability(decision(),{...ctx,file:'src/adapters/new/status.ts'}).status).toBe('out_of_scope'));
 it.each(['1.7.9','2.0.0'])('rejects version %s',v=>expect(applicability(decision(),{...ctx,versions:{'bridge-client':v}}).status).toBe('out_of_scope'));
 it.each([{}, {'bridge-client':'1.8.0-beta.1'}])('requires supported version',versions=>expect(applicability(decision(),{...ctx,versions:versions as Record<string,string>}).status).toBe('needs_context'));
 it.each(['draft','revoked'] as const)('rejects %s',status=>expect(applicability(decision({status}),ctx).status).not.toBe('applicable'));
 it('rejects retained but not ready',()=>expect(applicability(decision({memory_status:'retained'}),ctx).status).toBe('pending'));
 it('rejects another repository and run',()=>{expect(applicability(decision({repo_id:randomUUID()}),ctx).status).toBe('unverifiable');expect(applicability(decision({demo_run_id:randomUUID()}),ctx).status).toBe('unverifiable');});
 it('rejects absent provenance',()=>expect(applicability(decision({approval_event_id:null}),ctx).status).toBe('unverifiable'));
 it('requires prerequisites',()=>{const d=decision();d.scope.prerequisites=[{kind:'timeout_ms',value:'2000'}];expect(applicability(d,ctx).status).toBe('needs_context');expect(applicability(d,{...ctx,timeoutMs:2000}).status).toBe('applicable');});
 it('future successor does not retire predecessor early',()=>{const d=decision(),s=decision({supersedes_id:d.id});s.scope={...s.scope,effective_from:'2026-09-29T12:00:00Z'};expect(applicability(d,ctx,[d,s]).status).toBe('applicable');expect(applicability(d,{...ctx,time:'2026-09-29T12:00:00Z'},[d,s]).status).toBe('superseded');});
 it('different-scope successor cannot retire predecessor',()=>{const d=decision(),s=decision({supersedes_id:d.id});s.scope={...s.scope,path_glob:'src/other/**'};expect(applicability(d,ctx,[d,s]).status).toBe('applicable');});
 it('two and three competing decisions remain conflicts',()=>{for(const n of [2,3])expect(resolveDecisions(Array.from({length:n},()=>decision()),ctx).every(x=>x.status==='conflict')).toBe(true);});
 it('refuses baseline decisions, absent expiry and empty scope',()=>{expect(()=>validateDecision(decision({rule_key:'explicit-timeout'}))).toThrow();const d=decision();d.scope.expires_at=null;expect(()=>validateDecision(d)).toThrow();d.scope.path_glob='';expect(()=>validateDecision(d)).toThrow();});
});
describe('input and output validation',()=>{
 it.each(demoFixtures.map(f=>[f.id,f]))('parses original %s',(_id,f)=>expect(parseReviewInput({repo_id:repo,mode:f.mode,title:f.title,diff:f.diff,context_files:f.context_files,dependency_versions:f.dependency_versions})).toBeDefined());
 it.each(['../secret.ts','/etc/file.ts','C:\\secret.ts','src/../secret.ts','src/%2e%2e/file.ts','src//file.ts'])('rejects unsafe path %s',p=>expect(()=>normalizePath(p)).toThrow());
 it('normalizes Windows separators',()=>expect(normalizePath('src\\good.ts')).toBe('src/good.ts'));
 it('enforces 30 KB including context',()=>expect(()=>parseReviewInput({...packet('src/x.ts'),repo_id:repo,title:'a'.repeat(31000)})).toThrow());
 it('rejects malformed hunk counts',()=>expect(()=>parseReviewInput({...packet('src/x.ts'),repo_id:repo,diff:'--- a/x.ts\n+++ b/x.ts\n@@ -1,1 +1,2 @@\n-x\n+y\n'})).toThrow());
 it('rejects mismatching supplied post-change context',()=>{const p=packet('src/x.ts');p.context_files[0].content='wrong';expect(()=>parseReviewInput({...p,repo_id:repo})).toThrow();});
 it('rejects fabricated citation and anchor',()=>{const p=parseReviewInput({...packet('src/x.ts'),repo_id:repo});const f={category:'convention',severity:'medium',file:'src/x.ts',line_start:5,line_end:5,message:'Concern',suggestion:'Inspect wrapper',rule_key:'transport-wrapper',evidence_refs:['event:fake']};const output={summary:'',findings:[f],questions:[],limitations:[]};expect(()=>validateOutput(output,p,[])).toThrow();f.evidence_refs=[];f.line_start=f.line_end=999;expect(()=>validateOutput(output,p,[])).toThrow();});
 it('keeps timeout finding despite active wrapper exception',()=>{const p=parseReviewInput({...packet(ctx.file,false),repo_id:repo});const d=decision();const e:Evidence={decision:d,event_id:d.approval_event_id!,fact_id:'fact-real-in-test',fact_text:'Test double, not live memory',status:'applicable',reason:'test',file:ctx.file};const r=finalizeReview({summary:'',findings:[],questions:[],limitations:[]},p,[e]);expect(r.findings.some(f=>f.rule_key==='explicit-timeout')).toBe(true);expect(r.waived.some(f=>f.rule_key==='transport-wrapper')).toBe(true);});
 it('enforces roles in application code',()=>{expect(()=>assertRole('viewer','contributor')).toThrow();expect(()=>assertRole('contributor','maintainer')).toThrow();expect(()=>assertRole('maintainer','maintainer')).not.toThrow();});
});
describe('fixture-scoped timeout checks',()=>{
 it('verifies the explicit supported literal',()=>expect(checkTimeout(packet(ctx.file).context_files[0].content).status).toBe('present'));
 it('detects removed timeout',()=>expect(checkTimeout(packet(ctx.file,false).context_files[0].content).status).toBe('missing'));
 it('indirect options produce uncertainty',()=>expect(checkTimeout("import {request} from 'bridge-client'; request(url, options);").status).toBe('needs_context'));
 it('spread options produce uncertainty',()=>expect(checkTimeout("import {request} from 'bridge-client'; request(url, {timeout:2000,...options});").status).toBe('needs_context'));
 it('unknown patterns produce uncertainty',()=>expect(checkTimeout('client.get(url);').status).toBe('needs_context'));
});
