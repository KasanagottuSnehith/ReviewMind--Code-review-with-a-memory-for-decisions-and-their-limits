import express from 'express';
import {randomUUID,createHash} from 'node:crypto';
import path from 'node:path';
import {z} from 'zod';
import {db,query,rpc} from './db.js';
import {config,configurationStatus} from './config.js';
import {AppError,publicError,assertRole,decisionContentSchema,feedbackSchema,type Role} from '../../../packages/contracts/src/index.js';
import {parseReviewInput,normalizePath} from '../../../packages/contracts/src/input.js';
import {validateDecision} from '../../../packages/decision-engine/src/index.js';
import {demoFixtures,seedEvents,INITIAL_TIME} from '../../../fixtures/demo.js';
import {memory} from './worker.js';
const uuid=z.string().uuid();
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const rates=new Map<string,{at:number;count:number}>();
export const app=express();
app.disable('x-powered-by');
app.use((req,res,next)=>{res.locals.requestId=randomUUID();res.setHeader('X-Request-Id',res.locals.requestId);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');next();});
app.use(express.json({limit:'40kb'}));
app.get('/health',(_req,res)=>res.json({status:'ok',service:'reviewmind',configuration:configurationStatus()}));
app.get('/api/config',(_req,res)=>res.json({request_id:res.locals.requestId,supabase_url:config.supabaseUrl,public_key:config.publicKey,configured:configurationStatus(),demo_mode:config.demo}));
app.get('/api/fixtures',(_req,res)=>res.json({request_id:res.locals.requestId,fixtures:demoFixtures}));
app.use('/api',async(req,res,next)=>{
 const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
 if(!token)throw new AppError('UNAUTHENTICATED','Sign in to access saved reviews and decisions.',401);
 const {data,error}=await db().auth.getUser(token);
 if(error||!data.user)throw new AppError('UNAUTHENTICATED','Your session is invalid or expired. Sign in again.',401);
 res.locals.user=data.user;next();
});
async function access(repoId:string,res:express.Response,required:'viewer'|'contributor'|'maintainer'='viewer'){
 const repo=await query(db().from('repositories').select('*').eq('id',uuid.parse(repoId)).maybeSingle());
 if(!repo)throw new AppError('NOT_FOUND','Resource not found.',404);
 const member=await query(db().from('memberships').select('role').eq('workspace_id',repo.workspace_id).eq('user_id',res.locals.user.id).maybeSingle());
 if(!member)throw new AppError('NOT_FOUND','Resource not found.',404);
 if(required!=='viewer')assertRole(member.role as Role,required);
 return {...repo,role:member.role as Role};
}
async function resource(table:string,id:string,res:express.Response,required:'viewer'|'contributor'|'maintainer'='viewer'){
 const row=await query(db().from(table).select('*').eq('id',uuid.parse(id)).maybeSingle());
 if(!row)throw new AppError('NOT_FOUND','Resource not found.',404);
 const repo=await access(row.repo_id,res,required);return {row,repo};
}
function send(res:express.Response,data:unknown,status=200){res.status(status).json({...data as object,request_id:res.locals.requestId});}
function rate(res:express.Response){
 const key=res.locals.user.id;const item=rates.get(key);const now=Date.now();
 if(!item||now-item.at>60000){rates.set(key,{at:now,count:1});return;}
 if(++item.count>6)throw new AppError('RATE_LIMITED','Wait a minute before starting more generation jobs.',429,true);
}
app.get('/api/bootstrap',async(_req,res)=>{
 const memberships=await query<any[]>(db().from('memberships').select('workspace_id,role').eq('user_id',res.locals.user.id));
 const repos=memberships.length?await query<any[]>(db().from('repositories').select('*').in('workspace_id',memberships.map(m=>m.workspace_id)).eq('is_evaluation',false)):[];
 const repositories=await Promise.all(repos.map(async r=>({...r,role:memberships.find(m=>m.workspace_id===r.workspace_id)!.role,
 run:r.active_run_id?await query(db().from('demo_runs').select('id,is_demo,review_time,created_at').eq('id',r.active_run_id).single()):null})));
 send(res,{user:{id:res.locals.user.id,email:res.locals.user.email},repositories,providers:configurationStatus()});
});
app.get('/api/dependencies',async(_req,res)=>{
 const checks:any={configuration:configurationStatus()};
 try{await query(db().from('workspaces').select('id').limit(1));checks.database='reachable';}catch{checks.database='failed';}
 try{const v=await memory().version();checks.memory={status:'reachable',version:v.api_version};}catch{checks.memory={status:'failed'};}
 checks.generation={status:configurationStatus().generation?'configured_unverified':'missing',model:config.model||null};
 send(res,checks);
});
app.post('/api/reviews',async(req,res)=>{
 const parsed=parseReviewInput(req.body);const repo=await access(parsed.input.repo_id,res,'contributor');rate(res);
 if(parsed.input.demo_time){assertRole(repo.role,'maintainer');if(!config.demo)throw new AppError('FORBIDDEN','Simulated time is disabled.',403);}
 send(res,await rpc('enqueue_review',{p_repo:repo.id,p_actor:res.locals.user.id,p_input:parsed.input,p_hash:hash(parsed.input)}),202);
});
app.get('/api/repos/:id/reviews',async(req,res)=>{
 const repo=await access(String(req.params.id),res);
 send(res,{reviews:await query(db().from('review_runs').select('id,title:input->>title,mode,status,created_at,review_time,demo_run_id,metadata').eq('repo_id',repo.id).order('created_at',{ascending:false}).limit(50))});
});
app.get('/api/reviews/:id',async(req,res)=>{const {row}=await resource('review_runs',String(req.params.id),res);delete row.lease_token;send(res,{review:row});});
app.post('/api/reviews/:id/feedback',async(req,res)=>{
 const {row:review}=await resource('review_runs',String(req.params.id),res,'contributor');
 const input=feedbackSchema.parse(req.body);const key=z.string().min(8).max(150).parse(req.headers['idempotency-key']);
 const parsed=parseReviewInput(review.input);let rule:string;
 if(input.finding_id){
  const finding=review.output?.findings?.find((f:any)=>f.id===input.finding_id)??review.output?.waived?.find((f:any)=>f.id===input.finding_id);
  if(!finding)throw new AppError('INVALID_FINDING','Finding does not belong to this review.',422);
  rule=finding.rule_key;
 }else{
  if(!input.anchor||!parsed.anchors.get(normalizePath(input.anchor.file))?.has(input.anchor.line))throw new AppError('INVALID_ANCHOR','Choose a supplied code line for your new convention.',422);
  if(input.proposed_scope.path_glob!==normalizePath(input.anchor.file))throw new AppError('INVALID_SCOPE','A new convention requires the exact anchored file path.',422);
  rule='custom-'+hash({review:review.id,actor:res.locals.user.id,key}).slice(0,16);
 }
 const payload={...input,rule_key:rule};
 send(res,await rpc('record_feedback',{p_review:review.id,p_actor:res.locals.user.id,p_payload:payload,p_key:key,p_hash:hash({review:review.id,...payload})}),201);
});
app.post('/api/decision-drafts',async(req,res)=>{
 const input=z.object({repo_id:uuid,feedback_ids:z.array(uuid).min(1).max(20)}).strict().parse(req.body);
 await access(input.repo_id,res,'contributor');rate(res);
 send(res,await rpc('create_decision_draft',{p_repo:input.repo_id,p_actor:res.locals.user.id,p_feedback:input.feedback_ids}),202);
});
app.get('/api/decisions/:id',async(req,res)=>{
 const {row,repo}=await resource('decisions',String(req.params.id),res);
 const ids=[...row.source_event_ids,...(row.approval_event_id?[row.approval_event_id]:[])];
 const sources=ids.length?await query(db().from('events').select('*').in('id',ids).eq('repo_id',row.repo_id).eq('demo_run_id',row.demo_run_id)):[];
 const jobs=ids.length?await query(db().from('memory_jobs').select('id,event_id,status,attempt_count,last_error,retained_at,ready_at,created_at').in('event_id',ids)):[];
 delete row.lease_token;send(res,{decision:row,sources,jobs,revision:repo.decision_revision});
});
app.get('/api/repos/:id/decisions',async(req,res)=>{
 const repo=await access(String(req.params.id),res);const cursor=req.query.cursor?z.string().datetime({offset:true}).parse(req.query.cursor):null;
 let q=db().from('decisions').select('*').eq('repo_id',repo.id).eq('demo_run_id',repo.active_run_id).order('created_at',{ascending:false}).limit(50);
 if(cursor)q=q.lt('created_at',cursor);
 const rows=await query<any[]>(q);for(const row of rows)delete row.lease_token;
 send(res,{decisions:rows,revision:repo.decision_revision,next_cursor:rows.length===50?rows.at(-1).created_at:null});
});
app.post('/api/decisions/:id/approve',async(req,res)=>{
 const {row}=await resource('decisions',String(req.params.id),res,'maintainer');
 const input=z.object({content:decisionContentSchema,expected_revision:z.number().int().nonnegative()}).strict().parse(req.body);
 validateDecision(input.content);send(res,await rpc('approve_decision',{p_decision:row.id,p_actor:res.locals.user.id,p_content:input.content,p_revision:input.expected_revision}));
});
app.post('/api/decisions/:id/revoke',async(req,res)=>{
 const {row}=await resource('decisions',String(req.params.id),res,'maintainer');
 const input=z.object({reason:z.string().trim().min(8).max(3000),expected_revision:z.number().int()}).strict().parse(req.body);
 send(res,await rpc('revoke_decision',{p_decision:row.id,p_actor:res.locals.user.id,p_reason:input.reason,p_revision:input.expected_revision}));
});
app.post('/api/decisions/:id/reject',async(req,res)=>{
 const {row}=await resource('decisions',String(req.params.id),res,'maintainer');
 const reason=z.string().trim().min(8).max(3000).parse(req.body.reason);
 const changed=await query<any[]>(db().from('decisions').update({status:'rejected',draft_payload:{...row.draft_payload,rejection_reason:reason},lease_token:null}).eq('id',row.id).eq('status','draft').select('id'));
 if(!changed.length)throw new AppError('REVISION_CONFLICT','This draft has already changed.',409);
 send(res,{decision_id:row.id,status:'rejected'});
});
app.get('/api/memory-jobs/:id',async(req,res)=>{const {row}=await resource('memory_jobs',String(req.params.id),res);delete row.lease_token;delete row.operation_id;send(res,{job:row});});
app.post('/api/memory-jobs/:id/retry',async(req,res)=>{
 const {row}=await resource('memory_jobs',String(req.params.id),res,'maintainer');
 if(!['failed','retry_wait'].includes(row.status))throw new AppError('JOB_NOT_RETRYABLE','Job is not failed or waiting for retry.',409);
 await query(db().from('memory_jobs').update({status:'queued',attempt_count:0,next_attempt_at:new Date().toISOString(),last_error:null}).eq('id',row.id).in('status',['failed','retry_wait']));
 send(res,{job_id:row.id,status:'queued'});
});
app.post('/api/demo/reset',async(req,res)=>{
 if(!config.demo)throw new AppError('FORBIDDEN','Demo controls are disabled.',403);
 const input=z.object({repo_id:uuid,fixture_set:z.literal('democart-v1')}).strict().parse(req.body);await access(input.repo_id,res,'maintainer');
 const run=await rpc('create_demo_run',{p_repo:input.repo_id,p_actor:res.locals.user.id,p_time:INITIAL_TIME});
 const jobs=[];for(const [type,text]of seedEvents)jobs.push(await rpc('rm_event',{r:input.repo_id,run:run.run_id,a:res.locals.user.id,t:type,p:{synthetic:true,text},at_time:INITIAL_TIME}));
 send(res,{...run,seed_event_ids:jobs},202);
});
app.post('/api/demo/clock',async(req,res)=>{
 if(!config.demo)throw new AppError('FORBIDDEN','Demo controls are disabled.',403);
 const input=z.object({repo_id:uuid,time:z.string().datetime({offset:true})}).strict().parse(req.body);await access(input.repo_id,res,'maintainer');
 send(res,await rpc('set_demo_time',{p_repo:input.repo_id,p_actor:res.locals.user.id,p_time:input.time}));
});
app.get('/api/events/:id',async(req,res)=>{const {row}=await resource('events',String(req.params.id),res);send(res,{event:row});});
// Evaluation routes are registered by the evaluation module before static serving.
export {access,send,rate};
export function finishRoutes(){
 app.use('/api',(_req,_res)=>{throw new AppError('NOT_FOUND','API route not found.',404);});
 app.use(express.static(path.resolve('dist/web')));
 app.get('/{*path}',(_req,res)=>res.sendFile(path.resolve('dist/web/index.html')));
 app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  const tooLarge=(error as any)?.type==='entity.too.large';const safe=tooLarge?new AppError('INPUT_TOO_LARGE','Request body is too large.',413):error;
  res.status(safe instanceof AppError?safe.status:safe instanceof z.ZodError?400:500).json({request_id:res.locals.requestId,error:publicError(safe)});
 });
}
