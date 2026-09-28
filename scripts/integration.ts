import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {HindsightError} from '@vectorize-io/hindsight-client';
import {config,configurationStatus} from '../apps/api/src/config.js';
import {db,query,rpc} from '../apps/api/src/db.js';
import {MemoryAdapter,type CanonicalEvent} from '../packages/memory/src/index.js';
import {Reviewer} from '../packages/reviewer/src/index.js';
import {parseReviewInput} from '../packages/contracts/src/input.js';
import {validateDecision} from '../packages/decision-engine/src/index.js';
import {packet,INITIAL_TIME,EXPIRY} from '../fixtures/demo.js';
const report:any={started_at:new Date().toISOString(),kind:'real-provider-integration',status:'not_run',steps:[]};
let activeStep='configuration';
await mkdir('docs/evidence',{recursive:true});
try{
 if(Object.values(configurationStatus()).some(v=>!v)||!process.env.DEMO_PASSWORD)throw Object.assign(new Error('Required configuration is missing.'),{code:'CONFIGURATION_MISSING'});
 activeStep='supabase_auth';
 const auth=createClient(config.supabaseUrl,config.publicKey,{auth:{persistSession:false}});
 const signed=await auth.auth.signInWithPassword({email:process.env.DEMO_EMAIL||'maintainer@reviewmind.example',password:process.env.DEMO_PASSWORD});
 if(signed.error||!signed.data.user)throw Object.assign(new Error(),{code:'SUPABASE_AUTH_FAILED'});
 const actor=signed.data.user.id;report.steps.push({step:'supabase_auth',status:'passed'});
 activeStep='supabase_persistence_rls';
 const member=await query(db().from('memberships').select('workspace_id').eq('user_id',actor).eq('role','maintainer').limit(1).single());
 const repo=await query(db().from('repositories').insert({workspace_id:member.workspace_id,name:'integration-proof-'+randomUUID().slice(0,8),is_evaluation:true}).select().single());
 const created=await rpc('create_demo_run',{p_repo:repo.id,p_actor:actor,p_time:INITIAL_TIME});
 const run=await query(db().from('demo_runs').select('*').eq('id',created.run_id).single());
 const visible=await auth.from('repositories').select('id').eq('id',repo.id).single();
 if(visible.error)throw Object.assign(new Error(),{code:'SUPABASE_PERSISTENCE_FAILED'});
 report.steps.push({step:'supabase_persistence_rls',status:'passed',repo_id:repo.id});
 const id=await rpc('rm_event',{r:repo.id,run:run.id,a:actor,t:'feedback.recorded',at_time:INITIAL_TIME,p:{
  synthetic:true,approved:false,rule_key:'transport-wrapper',disposition:'temporary_exception',reason:'Synthetic bridge-client 1.8 wrapper incompatibility on legacy adapters; explicit timeout remains required.',
  proposed_scope:{path_glob:'src/adapters/legacy/**',dependency_name:'bridge-client',version_range:'>=1.8.0 <2.0.0',effective_from:INITIAL_TIME,expires_at:EXPIRY,prerequisites:[]}
 }});
 const event=await query<CanonicalEvent>(db().from('events').select('*').eq('id',id).single());
 const job=await query(db().from('memory_jobs').select('*').eq('event_id',id).single());
 const adapter=new MemoryAdapter(config.hindsightUrl,config.hindsightKey);
 activeStep='retain';
 await adapter.ensureBank(run.bank_id);
 const started=Date.now();await adapter.retain(run.bank_id,event,job.operation_id);
 report.steps.push({step:'retain',status:'passed',event_id:id,operation_id:job.operation_id});
 activeStep='fresh_client_recall_provenance';
 let visibleRecall=false;
 for(let attempt=0;attempt<30;attempt++){
  const operation=await adapter.operation(run.bank_id,job.operation_id);
  if(operation.status==='failed')throw Object.assign(new Error(),{code:'INGESTION_FAILED'});
  if(operation.status==='completed'){
   const recalled=await new MemoryAdapter(config.hindsightUrl,config.hindsightKey).recall(run.bank_id,'What is the proposed legacy transport-wrapper exception and its conditions?',INITIAL_TIME,['event:'+id]);
   if(recalled.facts.some(f=>f.event_id===id)){visibleRecall=true;report.steps.push({step:'fresh_client_recall_provenance',status:'passed',fact_ids:recalled.facts.map(f=>f.fact_id),event_id:id,ingestion_ready_ms:Date.now()-started});break;}
  }
  await new Promise(r=>setTimeout(r,2000));
 }
 if(!visibleRecall)throw Object.assign(new Error(),{code:'RECALL_NOT_READY'});
 activeStep='document_resolution';
 const doc=await adapter.document(run.bank_id,id);if(!doc)throw Object.assign(new Error(),{code:'DOCUMENT_MISSING'});
 report.steps.push({step:'document_resolution',status:'passed'});
 activeStep='reflect_structured_with_verified_sources';
 const reflected=await adapter.reflect(run.bank_id,[event],INITIAL_TIME);
 if(!reflected.content)throw Object.assign(new Error(),{code:reflected.error});
 validateDecision(reflected.content);report.steps.push({step:'reflect_structured_with_verified_sources',status:'passed',draft:reflected.content});
 activeStep='structured_generation';
 const reviewer=new Reviewer(config.llmUrl,config.llmKey,config.model);
 const generated=await reviewer.generate(parseReviewInput({...packet('src/adapters/legacy/status.ts'),repo_id:repo.id,mode:'generic'}),[],INITIAL_TIME);
 report.steps.push({step:'structured_generation',status:'passed',result:generated});
 report.status='passed';
}catch(error){report.status=report.steps.length?'failed':'blocked';report.error={code:error instanceof HindsightError?'HINDSIGHT_'+(error.statusCode??'NETWORK'):(error as any).code??'INTEGRATION_FAILED',step:activeStep,message:'Check configured accounts and the failed step. No provider secrets are recorded.'};process.exitCode=1;}
report.finished_at=new Date().toISOString();
await writeFile('docs/evidence/integration.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,completed_steps:report.steps.map((s:any)=>s.step),failed_step:report.error?.step??null,error:report.error?.code??null}));
