import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
let pg:PGlite;
const actor=randomUUID(),viewer=randomUUID(),outsider=randomUUID(),workspace=randomUUID(),repo=randomUUID();
async function call(name:string,args:unknown[]){const r=await pg.query<any>('select '+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') as result',args);return r.rows[0].result;}
let run:string,review:string,feedback:string,draft:string;
beforeAll(async()=>{
 pg=new PGlite();
 await pg.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;");
 const source=(await readFile('supabase/migrations/001_reviewmind.sql','utf8')).replace('create extension if not exists pgcrypto;','');
 await pg.exec(source);
 await pg.query('insert into auth.users(id) values($1),($2),($3)',[actor,viewer,outsider]);
 await pg.query("insert into workspaces(id,name) values($1,'Test workspace')",[workspace]);
 await pg.query("insert into memberships values($1,$2,'maintainer'),($1,$3,'viewer')",[workspace,actor,viewer]);
 await pg.query("insert into repositories(id,workspace_id,name) values($1,$2,'Test repo')",[repo,workspace]);
 run=(await call('create_demo_run',[repo,actor,'2026-09-29T09:00:00Z'])).run_id;
 review=(await call('enqueue_review',[repo,actor,JSON.stringify({mode:'memory'}),'hash'])).review_id;
 await pg.query("update review_runs set status='complete' where id=$1",[review]);
},30000);
afterAll(async()=>{await pg?.close();});
describe('real local PostgreSQL transaction tests (not Supabase integration)',()=>{
 it('rejects viewer and outsider mutations',async()=>{await expect(call('create_demo_run',[repo,viewer])).rejects.toThrow('FORBIDDEN');await expect(call('create_demo_run',[repo,outsider])).rejects.toThrow('FORBIDDEN');});
 it('stores idempotent feedback exactly once and rejects changed payload',async()=>{
  const payload={finding_id:'finding',disposition:'temporary_exception',reason:'A synthetic compatibility limit.',rule_key:'transport-wrapper',proposed_scope:{}};
  const a=await call('record_feedback',[review,actor,JSON.stringify(payload),'same-key','hash']);feedback=a.feedback_id;
  const b=await call('record_feedback',[review,actor,JSON.stringify(payload),'same-key','hash']);expect(b.feedback_id).toBe(a.feedback_id);
  expect((await pg.query('select * from memory_jobs where event_id=$1',[a.event_id])).rows).toHaveLength(1);
  await expect(call('record_feedback',[review,actor,JSON.stringify(payload),'same-key','different'])).rejects.toThrow('IDEMPOTENCY_CONFLICT');
 });
 it('approves transactionally and rejects a competing revision',async()=>{
  draft=(await call('create_decision_draft',[repo,actor,[feedback]])).decision_id;
  await pg.query("update decisions set draft_status='ready' where id=$1",[draft]);
  const d=(await pg.query<any>('select * from decisions where id=$1',[draft])).rows[0];
  const revision=(await pg.query<any>('select decision_revision from repositories where id=$1',[repo])).rows[0].decision_revision;
  const content={kind:'temporary_exception',rule_key:'transport-wrapper',scope:{path_glob:'src/adapters/legacy/**',dependency_name:'bridge-client',version_range:'>=1.8.0 <2.0.0',effective_from:'2026-09-29T09:00:00Z',expires_at:'2026-09-30T00:00:00Z',prerequisites:[]},rationale:'Synthetic compatibility exception.',source_event_ids:d.source_event_ids,supersedes_id:null};
  const outcomes=await Promise.allSettled([call('approve_decision',[draft,actor,JSON.stringify(content),revision]),call('approve_decision',[draft,actor,JSON.stringify(content),revision])]);
  expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(outcomes.filter(r=>r.status==='rejected')).toHaveLength(1);
  const saved=(await pg.query<any>('select * from decisions where id=$1',[draft])).rows[0];expect(saved.memory_status).toBe('queued');
  expect((await pg.query('select * from memory_jobs where event_id=$1',[saved.approval_event_id])).rows).toHaveLength(1);
 });
 it('rejects in-flight review when revision changes',async()=>{
  const id=(await call('enqueue_review',[repo,actor,JSON.stringify({mode:'memory'}),'hash2'])).review_id;
  const job=await call('claim_job',['review',150]);expect(job.id).toBe(id);
  await pg.query('update repositories set decision_revision=decision_revision+1 where id=$1',[repo]);
  expect(await call('complete_review',[id,job.lease_token,'{}','{}'])).toBe(false);
  const saved=(await pg.query<any>('select * from review_runs where id=$1',[id])).rows[0];
  expect(saved.metadata.error.code).toBe('REVIEW_CONTEXT_CHANGED');
 });
 it('recovers an expired lease and fences stale completion',async()=>{
  const job=await call('claim_job',['memory',150]);
  await pg.query("update memory_jobs set lease_until=now()-interval '1 second' where id=$1",[job.id]);
  const recovered=await call('claim_job',['memory',150]);expect(recovered.id).toBe(job.id);expect(recovered.lease_token).not.toBe(job.lease_token);
  expect(await call('ready_memory',[job.id,job.lease_token])).toBe(false);
  expect(await call('ready_memory',[recovered.id,recovered.lease_token])).toBe(true);
 });
 it('preserves prior history on reset and rejects clock rewind',async()=>{
  const next=await call('create_demo_run',[repo,actor,'2026-10-01T09:00:00Z']);expect(next.run_id).not.toBe(run);
  expect((await pg.query('select * from demo_runs where id=$1',[run])).rows).toHaveLength(1);
  await expect(call('set_demo_time',[repo,actor,'2026-09-29T09:00:00Z'])).rejects.toThrow('CLOCK_REWIND_REQUIRES_RESET');
 });
 it('enforces RLS and hides bank IDs from authenticated clients',async()=>{
  await pg.exec("set role authenticated;select set_config('request.jwt.claim.sub','"+outsider+"',false)");
  expect((await pg.query('select * from decisions')).rows).toHaveLength(0);
  await expect(pg.query('select bank_id from demo_runs')).rejects.toThrow();
  await pg.exec('reset role');
 });
 it('prevents callers from forging privileged RPC actor IDs',async()=>{
  await pg.exec('set role authenticated');
  await expect(call('create_demo_run',[repo,actor])).rejects.toThrow();
  await pg.exec('reset role');
 });
 it('keeps events append-only',async()=>{await expect(pg.query("update events set type='tampered' where repo_id=$1",[repo])).rejects.toThrow('IMMUTABLE_EVENT');});
});
