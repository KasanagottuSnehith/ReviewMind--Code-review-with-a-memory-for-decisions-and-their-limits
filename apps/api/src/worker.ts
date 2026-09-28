import {db,query,rpc} from './db.js';
import {config,configurationStatus} from './config.js';
import {AppError,publicError,type Decision,type Evidence} from '../../../packages/contracts/src/index.js';
import {parseReviewInput} from '../../../packages/contracts/src/input.js';
import {resolveDecisions,validateDecision} from '../../../packages/decision-engine/src/index.js';
import {checkTimeout} from '../../../packages/decision-engine/src/timeout.js';
import {MemoryAdapter,memoryError,type CanonicalEvent} from '../../../packages/memory/src/index.js';
import {Reviewer,PROMPT_VERSION} from '../../../packages/reviewer/src/index.js';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export function memory(){return new MemoryAdapter(config.hindsightUrl,config.hindsightKey);}
async function updateFenced(table:string,job:any,values:Record<string,unknown>){return query(db().from(table).update(values).eq('id',job.id).eq('lease_token',job.lease_token).select('id'));}
async function runMemory(job:any){
 const adapter=memory();
 const run=await query(db().from('demo_runs').select('*').eq('id',job.demo_run_id).single());
 const event=await query<CanonicalEvent>(db().from('events').select('*').eq('id',job.event_id).single());
 await adapter.ensureBank(run.bank_id);
 if(!job.retained_at){
  await adapter.retain(run.bank_id,event,job.operation_id);
  await updateFenced('memory_jobs',job,{retained_at:new Date().toISOString(),status:'retained'});
  await query(db().from('decisions').update({memory_status:'retained'}).eq('approval_event_id',event.id).neq('memory_status','ready'));
 }
 const until=Date.now()+85000;
 while(Date.now()<until){
  const operation=await adapter.operation(run.bank_id,job.operation_id);
  if(operation.status==='failed'||operation.status==='cancelled')throw new AppError('INGESTION_FAILED','Provider ingestion did not complete.',502,false);
  if(operation.status==='completed'){
   const recalled=await adapter.recall(run.bank_id,'Find the engineering event with source document event:'+event.id+' and its scope, rationale and conditions.',event.occurred_at,['event:'+event.id]);
   if(recalled.facts.some(f=>f.event_id===event.id)){await rpc('ready_memory',{p_id:job.id,p_token:job.lease_token});return;}
  }
  await delay(3000);
 }
 throw new AppError('MEMORY_NOT_VISIBLE','Ingestion remains pending or is not visible to recall.',503,true);
}
export async function reviewEvidence(job:any,parsed:ReturnType<typeof parseReviewInput>){
 if(job.mode!=='memory')return {evidence:[] as Evidence[],recall:{status:'skipped',retrieved:0,verified:0}};
 const run=await query(db().from('demo_runs').select('*').eq('id',job.demo_run_id).single());
 let response;
 try{response=await memory().recall(run.bank_id,'Engineering conventions, approved exceptions and corrections for '+parsed.files.join(', ')+'. Dependencies '+JSON.stringify(parsed.input.dependency_versions)+'. '+parsed.input.title+'. Include transport wrapper, legacy compatibility, timeout prerequisites and other relevant team conventions.',job.review_time);}catch(e){throw memoryError(e);}
 if(!response.facts.length)return {evidence:[] as Evidence[],recall:{status:'no_memory',retrieved:response.retrieved_count,verified:0}};
 const events=await query<any[]>(db().from('events').select('*').in('id',[...new Set(response.facts.map(f=>f.event_id))]).eq('repo_id',job.repo_id).eq('demo_run_id',job.demo_run_id).lte('occurred_at',job.review_time).lte('recorded_at',job.created_at));
 const approved=events.filter(e=>e.type==='decision.approved');
 if(!approved.length)return {evidence:[] as Evidence[],recall:{status:'no_approved_memory',retrieved:response.retrieved_count,verified:events.length}};
 const decisions=await query<Decision[]>(db().from('decisions').select('*').in('approval_event_id',approved.map(e=>e.id)).eq('repo_id',job.repo_id).eq('demo_run_id',job.demo_run_id));
 const chains=[...decisions];let frontier=decisions.map(d=>d.id);
 for(let depth=0;frontier.length&&depth<20;depth++){
  const children=await query<Decision[]>(db().from('decisions').select('*').in('supersedes_id',frontier).eq('repo_id',job.repo_id).eq('demo_run_id',job.demo_run_id));
  const next=children.filter(d=>!chains.some(c=>c.id===d.id));chains.push(...next);frontier=next.map(d=>d.id);
 }
 const evidence:Evidence[]=[];
 for(const file of parsed.files){
  const check=checkTimeout(parsed.sources.get(file));
  for(const r of resolveDecisions(decisions,{repoId:job.repo_id,runId:job.demo_run_id,file,versions:parsed.input.dependency_versions,time:job.review_time,timeoutMs:check.timeoutMs,contextSources:parsed.input.context_files.map(c=>c.path)},chains)){
   const fact=response.facts.find(f=>f.event_id===r.decision.approval_event_id)!;
   evidence.push({decision:r.decision,event_id:fact.event_id,fact_id:fact.fact_id,fact_text:fact.text,status:r.status,reason:r.reason,file});
  }
 }
 return {evidence,recall:{status:evidence.length?'retrieved':'no_approved_memory',retrieved:response.retrieved_count,verified:events.length}};
}
async function runReview(job:any){
 const started=Date.now();const parsed=parseReviewInput(job.input);const recalled=await reviewEvidence(job,parsed);
 await updateFenced('review_runs',job,{status:'generating',metadata:{recall:recalled.recall,started_at:new Date().toISOString()}});
 const reviewer=new Reviewer(config.llmUrl,config.llmKey,config.model);
 const result=await reviewer.generate(parsed,recalled.evidence,job.review_time,async payload=>{await query(db().from('provider_records').insert({review_id:job.id,payload:{...payload as object,reviewmind_prompt_version:PROMPT_VERSION}}));});
 await updateFenced('review_runs',job,{status:'validating'});
 await rpc('complete_review',{p_id:job.id,p_token:job.lease_token,p_output:{...result.output,evidence:recalled.evidence},p_metadata:{...result.metadata,recall:recalled.recall,review_ms:Date.now()-started,review_time:job.review_time,decision_revision:job.decision_revision}});
}
async function runDraft(job:any){
 const jobs=await query<any[]>(db().from('memory_jobs').select('event_id,status').in('event_id',job.source_event_ids));
 if(jobs.some(j=>j.status==='failed'))throw new AppError('SOURCE_INGESTION_FAILED','A selected feedback source failed ingestion. Retry that memory job first.',422);
 if(jobs.length!==job.source_event_ids.length||jobs.some(j=>j.status!=='ready')){
  await updateFenced('decisions',job,{draft_status:'queued',attempt_count:Math.max(0,job.attempt_count-1),lease_until:null,lease_token:null,next_attempt_at:new Date(Date.now()+4000).toISOString()});return;
 }
 const events=await query<CanonicalEvent[]>(db().from('events').select('*').in('id',job.source_event_ids).eq('repo_id',job.repo_id).eq('demo_run_id',job.demo_run_id));
 const run=await query(db().from('demo_runs').select('*').eq('id',job.demo_run_id).single());
 let response;try{response=await memory().reflect(run.bank_id,events,run.review_time);}catch(e){throw memoryError(e);}
 await query(db().from('provider_records').insert({decision_id:job.id,payload:response.raw}));
 if(!response.content){await updateFenced('decisions',job,{draft_status:'failed',draft_payload:{error:{code:response.error,message:'Reflection did not return a verifiable structured draft.',retryable:false},raw_text:response.raw.text},lease_token:null});return;}
 validateDecision(response.content);
 if(!events.some(e=>e.payload.rule_key===response.content!.rule_key))throw new AppError('REFLECT_RULE_CHANGED','Reflection changed the selected convention.',422);
 await updateFenced('decisions',job,{...response.content,draft_status:'ready',draft_payload:{raw_text:response.raw.text,usage:response.raw.usage},lease_until:null,lease_token:null});
}
async function fail(kind:string,job:any,error:unknown){
 const app=error instanceof AppError?error:kind==='review'?new AppError('REVIEW_FAILED','Review failed. Input is preserved.',503,true):memoryError(error);
 const retry=app.retryable&&job.attempt_count<3;
 const shared={lease_until:null,lease_token:null,next_attempt_at:new Date(Date.now()+Math.min(30000,2000*2**job.attempt_count)+Math.random()*1000).toISOString()};
 if(kind==='memory')await updateFenced('memory_jobs',job,{...shared,status:retry?'retry_wait':'failed',last_error:app.code});
 else if(kind==='review')await updateFenced('review_runs',job,{...shared,status:retry?'retry_wait':'failed',metadata:{...job.metadata,error:publicError(app)}});
 else await updateFenced('decisions',job,{...shared,draft_status:retry?'retry_wait':'failed',draft_payload:{...job.draft_payload,error:publicError(app)}});
}
export function startWorker(){
 const busy=new Set<string>();let stopped=false;
 async function tick(kind:string){
  if(stopped||busy.has(kind)||!configurationStatus().database)return;busy.add(kind);
  try{const job=await rpc('claim_job',{p_kind:'v2:'+kind,p_lease_seconds:150});if(job){try{await(kind==='memory'?runMemory:kind==='review'?runReview:runDraft)(job);}catch(e){await fail(kind,job,e);}}}
  catch{/* Errors are recorded per job; do not print secret-bearing provider messages. */}
  finally{busy.delete(kind);}
 }
 const timer=setInterval(()=>{for(const kind of ['memory','review','draft'])void tick(kind);},1000);
 return()=>{stopped=true;clearInterval(timer);};
}
