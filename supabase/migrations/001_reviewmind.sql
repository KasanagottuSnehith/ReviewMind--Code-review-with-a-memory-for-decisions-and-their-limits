-- ReviewMind: canonical ledger + transactional outbox. Apply using npm run migrate.
create extension if not exists pgcrypto;
create table if not exists workspaces(id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now());
create table if not exists memberships(workspace_id uuid references workspaces(id), user_id uuid references auth.users(id), role text not null check(role in ('viewer','contributor','maintainer')), primary key(workspace_id,user_id));
create table if not exists repositories(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id), name text not null, is_evaluation boolean not null default false, active_run_id uuid, decision_revision int not null default 0, unique(id,workspace_id));
create table if not exists demo_runs(id uuid primary key default gen_random_uuid(), repo_id uuid not null references repositories(id), bank_id text not null unique, is_demo boolean not null default true, review_time timestamptz not null default now(), created_at timestamptz not null default now(), unique(id,repo_id));
alter table repositories drop constraint if exists repositories_active_run_id_fkey;
alter table repositories add constraint repositories_active_run_id_fkey foreign key(active_run_id,id) references demo_runs(id,repo_id);
create table if not exists review_runs(
 id uuid primary key default gen_random_uuid(), repo_id uuid not null references repositories(id), demo_run_id uuid not null,
 created_by uuid not null references auth.users(id), mode text not null check(mode in ('generic','static','memory')), input jsonb not null,
 input_hash text not null, output jsonb, status text not null default 'queued', review_time timestamptz not null,
 decision_revision int not null, metadata jsonb not null default '{}', lease_until timestamptz, lease_token uuid,
 attempt_count int not null default 0, next_attempt_at timestamptz not null default now(), created_at timestamptz not null default now(),
 unique(id,repo_id,demo_run_id), foreign key(demo_run_id,repo_id) references demo_runs(id,repo_id)
);
create table if not exists events(
 id uuid primary key default gen_random_uuid(), repo_id uuid not null references repositories(id), demo_run_id uuid not null,
 actor_id uuid references auth.users(id), type text not null, payload jsonb not null,
 occurred_at timestamptz not null, recorded_at timestamptz not null default now(),
 unique(id,repo_id,demo_run_id), foreign key(demo_run_id,repo_id) references demo_runs(id,repo_id)
);
create table if not exists feedback(
 id uuid primary key default gen_random_uuid(), repo_id uuid not null references repositories(id), demo_run_id uuid not null,
 review_run_id uuid not null, finding_id text, actor_id uuid not null references auth.users(id),
 disposition text not null check(disposition in ('accepted','incorrect','already_handled','temporary_exception','preference')),
 reason text not null check(length(trim(reason))>=8), proposed_scope jsonb not null, rule_key text not null,
 idempotency_key text not null, payload_hash text not null, event_id uuid not null, created_at timestamptz not null default now(),
 unique(actor_id,idempotency_key), foreign key(review_run_id,repo_id,demo_run_id) references review_runs(id,repo_id,demo_run_id),
 foreign key(event_id,repo_id,demo_run_id) references events(id,repo_id,demo_run_id)
);
create table if not exists decisions(
 id uuid primary key default gen_random_uuid(), repo_id uuid not null references repositories(id), demo_run_id uuid not null,
 version int not null default 1, kind text not null default 'convention' check(kind in ('convention','temporary_exception','correction')),
 rule_key text not null default 'pending', scope jsonb not null default '{}', rationale text not null default '',
 source_event_ids uuid[] not null default '{}', status text not null default 'draft' check(status in ('draft','approved','revoked','rejected')),
 approved_by uuid references auth.users(id), approved_at timestamptz, supersedes_id uuid references decisions(id),
 approval_event_id uuid references events(id), memory_status text not null default 'pending',
 draft_payload jsonb, draft_status text not null default 'queued', created_by uuid not null references auth.users(id),
 lease_until timestamptz, lease_token uuid, attempt_count int not null default 0, next_attempt_at timestamptz not null default now(),
 created_at timestamptz not null default now(), unique(id,repo_id,demo_run_id),
 foreign key(demo_run_id,repo_id) references demo_runs(id,repo_id)
);
create table if not exists memory_jobs(
 id uuid primary key default gen_random_uuid(), repo_id uuid not null references repositories(id), demo_run_id uuid not null,
 event_id uuid not null unique, operation_id uuid not null default gen_random_uuid(),
 status text not null default 'queued', attempt_count int not null default 0, next_attempt_at timestamptz not null default now(),
 last_error text, lease_until timestamptz, lease_token uuid, retained_at timestamptz, ready_at timestamptz,
 created_at timestamptz not null default now(), foreign key(event_id,repo_id,demo_run_id) references events(id,repo_id,demo_run_id)
);
create table if not exists provider_records(
 id uuid primary key default gen_random_uuid(), review_id uuid references review_runs(id), decision_id uuid references decisions(id),
 payload jsonb not null, created_at timestamptz not null default now()
);
create table if not exists evaluation_runs(
 id uuid primary key default gen_random_uuid(), repo_id uuid not null references repositories(id), created_by uuid not null references auth.users(id),
 case_id text not null, mode text not null, review_id uuid references review_runs(id), status text not null default 'queued',
 manifest_hash text not null, result jsonb, created_at timestamptz not null default now()
);
create index if not exists reviews_repo_time on review_runs(repo_id,created_at desc);
create index if not exists decisions_repo_time on decisions(repo_id,created_at desc);
create index if not exists events_repo_time on events(repo_id,occurred_at,recorded_at);
create index if not exists memory_ready_queue on memory_jobs(status,next_attempt_at);
create index if not exists memberships_user on memberships(user_id,workspace_id);

create or replace function rm_member(r uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from memberships m join repositories p on p.workspace_id=m.workspace_id where p.id=r and m.user_id=auth.uid())
$$;
create or replace function rm_role(r uuid,a uuid,required text default 'viewer') returns text language plpgsql security definer set search_path=public as $$
declare v text;
begin
 select m.role into v from memberships m join repositories p on p.workspace_id=m.workspace_id where p.id=r and m.user_id=a;
 if v is null or (required='contributor' and v='viewer') or (required='maintainer' and v<>'maintainer') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 return v;
end $$;
do $$
declare t text;
begin
 foreach t in array array['repositories','review_runs','events','feedback','decisions','memory_jobs','evaluation_runs'] loop
  execute format('alter table %I enable row level security',t);
  execute format('drop policy if exists member_read on %I',t);
  if t='repositories' then execute format('create policy member_read on %I for select to authenticated using (rm_member(id))',t);
  else execute format('create policy member_read on %I for select to authenticated using (rm_member(repo_id))',t); end if;
  execute format('revoke all on %I from anon,authenticated',t);
  execute format('grant select on %I to authenticated',t);
 end loop;
end $$;
alter table memberships enable row level security;
alter table workspaces enable row level security;
alter table demo_runs enable row level security;
alter table provider_records enable row level security;
drop policy if exists own_memberships on memberships;
create policy own_memberships on memberships for select to authenticated using(user_id=auth.uid());
drop policy if exists own_workspaces on workspaces;
create policy own_workspaces on workspaces for select to authenticated using(exists(select 1 from memberships where workspace_id=workspaces.id and user_id=auth.uid()));
drop policy if exists member_read on demo_runs;
create policy member_read on demo_runs for select to authenticated using(rm_member(repo_id));
revoke all on workspaces,memberships,demo_runs,provider_records from anon,authenticated;
grant select on workspaces,memberships to authenticated;
grant select(id,repo_id,is_demo,review_time,created_at) on demo_runs to authenticated;

create or replace function rm_immutable_event() returns trigger language plpgsql as $$ begin raise exception 'IMMUTABLE_EVENT'; end $$;
drop trigger if exists immutable_events on events;
create trigger immutable_events before update or delete on events for each row execute function rm_immutable_event();

create or replace function rm_event(r uuid,run uuid,a uuid,t text,p jsonb,at_time timestamptz) returns uuid language plpgsql security definer set search_path=public as $$
declare e uuid;
begin
 insert into events(repo_id,demo_run_id,actor_id,type,payload,occurred_at) values(r,run,a,t,p,at_time) returning id into e;
 insert into memory_jobs(repo_id,demo_run_id,event_id) values(r,run,e);
 return e;
end $$;

create or replace function create_demo_run(p_repo uuid,p_actor uuid,p_time timestamptz default '2026-09-29T09:00:00Z') returns jsonb language plpgsql security definer set search_path=public as $$
declare run demo_runs; e uuid; repo repositories;
begin
 perform rm_role(p_repo,p_actor,'maintainer');
 select * into repo from repositories where id=p_repo for update;
 insert into demo_runs(repo_id,bank_id,review_time) values(p_repo,'reviewmind-'||replace(gen_random_uuid()::text,'-',''),p_time) returning * into run;
 update repositories set active_run_id=run.id,decision_revision=decision_revision+1 where id=p_repo;
 e:=rm_event(p_repo,run.id,p_actor,'run.created',jsonb_build_object('synthetic',true,'description','New isolated demonstration run. No wrapper exception is approved.'),p_time);
 return jsonb_build_object('run_id',run.id,'event_id',e);
end $$;

create or replace function set_demo_time(p_repo uuid,p_actor uuid,p_time timestamptz) returns jsonb language plpgsql security definer set search_path=public as $$
declare run demo_runs;
begin
 perform rm_role(p_repo,p_actor,'maintainer');
 perform 1 from repositories where id=p_repo for update;
 select d.* into run from demo_runs d join repositories r on r.active_run_id=d.id where r.id=p_repo for update of d;
 if not run.is_demo or p_time<run.review_time then raise exception 'CLOCK_REWIND_REQUIRES_RESET'; end if;
 update demo_runs set review_time=p_time where id=run.id;
 update repositories set decision_revision=decision_revision+1 where id=p_repo;
 return jsonb_build_object('review_time',p_time);
end $$;

create or replace function enqueue_review(p_repo uuid,p_actor uuid,p_input jsonb,p_hash text) returns jsonb language plpgsql security definer set search_path=public as $$
declare repo repositories; run demo_runs; v uuid;
begin
 perform rm_role(p_repo,p_actor,'contributor');
 select * into repo from repositories where id=p_repo for update;
 select * into run from demo_runs where id=repo.active_run_id;
 if run.id is null then raise exception 'RUN_REQUIRED'; end if;
 if p_input ? 'demo_time' and (p_input->>'demo_time')::timestamptz<>run.review_time then raise exception 'CLOCK_MISMATCH'; end if;
 insert into review_runs(repo_id,demo_run_id,created_by,mode,input,input_hash,review_time,decision_revision)
 values(p_repo,run.id,p_actor,p_input->>'mode',p_input,p_hash,case when run.is_demo then run.review_time else now() end,repo.decision_revision) returning id into v;
 return jsonb_build_object('review_id',v,'status','queued');
end $$;

create or replace function record_feedback(p_review uuid,p_actor uuid,p_payload jsonb,p_key text,p_hash text) returns jsonb language plpgsql security definer set search_path=public as $$
declare rv review_runs; f feedback; e uuid; rule text;
begin
 select * into rv from review_runs where id=p_review;
 perform rm_role(rv.repo_id,p_actor,'contributor');
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||p_key,0));
 select * into f from feedback where actor_id=p_actor and idempotency_key=p_key;
 if f.id is not null then
  if f.payload_hash<>p_hash then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='23505'; end if;
  return jsonb_build_object('feedback_id',f.id,'event_id',f.event_id,'duplicate',true);
 end if;
 if rv.status<>'complete' then raise exception 'REVIEW_NOT_COMPLETE'; end if;
 if not exists(select 1 from repositories where id=rv.repo_id and active_run_id=rv.demo_run_id) then raise exception 'RUN_CHANGED'; end if;
 rule:=p_payload->>'rule_key';
 if rule is null then raise exception 'NON_WAIVABLE'; end if;
 e:=rm_event(rv.repo_id,rv.demo_run_id,p_actor,'feedback.recorded',p_payload||jsonb_build_object('review_id',p_review,'approved',false),rv.review_time);
 insert into feedback(repo_id,demo_run_id,review_run_id,finding_id,actor_id,disposition,reason,proposed_scope,rule_key,idempotency_key,payload_hash,event_id)
 values(rv.repo_id,rv.demo_run_id,p_review,p_payload->>'finding_id',p_actor,p_payload->>'disposition',p_payload->>'reason',p_payload->'proposed_scope',rule,p_key,p_hash,e) returning * into f;
 return jsonb_build_object('feedback_id',f.id,'event_id',e,'duplicate',false);
end $$;

create or replace function create_decision_draft(p_repo uuid,p_actor uuid,p_feedback uuid[]) returns jsonb language plpgsql security definer set search_path=public as $$
declare run uuid; ids uuid[]; d uuid;
begin
 perform rm_role(p_repo,p_actor,'contributor');
 select active_run_id into run from repositories where id=p_repo;
 if cardinality(p_feedback)=0 or cardinality(p_feedback)>20 then raise exception 'INVALID_SOURCES'; end if;
 select array_agg(event_id) into ids from feedback where id=any(p_feedback) and repo_id=p_repo and demo_run_id=run;
 if cardinality(ids) is distinct from cardinality(p_feedback) then raise exception 'INVALID_SOURCES'; end if;
 insert into decisions(repo_id,demo_run_id,created_by,source_event_ids,draft_payload) values(p_repo,run,p_actor,ids,jsonb_build_object('feedback_ids',p_feedback)) returning id into d;
 return jsonb_build_object('decision_id',d,'status','queued');
end $$;

create or replace function approve_decision(p_decision uuid,p_actor uuid,p_content jsonb,p_revision int) returns jsonb language plpgsql security definer set search_path=public as $$
declare d decisions; repo repositories; s jsonb; ids uuid[]; predecessor decisions; e uuid; at_time timestamptz;
begin
 select * into d from decisions where id=p_decision;
 perform rm_role(d.repo_id,p_actor,'maintainer');
 select * into repo from repositories where id=d.repo_id for update;
 select * into d from decisions where id=p_decision for update;
 if repo.decision_revision<>p_revision then raise exception 'REVISION_CONFLICT' using errcode='40001'; end if;
 if d.demo_run_id<>repo.active_run_id then raise exception 'RUN_CHANGED'; end if;
 if d.status<>'draft' or d.draft_status<>'ready' then raise exception 'DRAFT_NOT_READY'; end if;
 s:=p_content->'scope';
 if nullif(trim(s->>'path_glob'),'') is null or nullif(trim(p_content->>'rationale'),'') is null or p_content->>'rule_key'='explicit-timeout' then raise exception 'INVALID_SCOPE'; end if;
 if p_content->>'kind'='temporary_exception' and (s->>'expires_at') is null then raise exception 'EXPIRY_REQUIRED'; end if;
 if (s->>'expires_at')::timestamptz <= (s->>'effective_from')::timestamptz then raise exception 'INVALID_EXPIRY'; end if;
 select array_agg(value::uuid) into ids from jsonb_array_elements_text(p_content->'source_event_ids');
 if coalesce(cardinality(ids),0)=0 or exists(select 1 from unnest(ids) src where not exists(select 1 from events where id=src and repo_id=d.repo_id and demo_run_id=d.demo_run_id)) then raise exception 'INVALID_SOURCES'; end if;
 if not ids <@ d.source_event_ids then raise exception 'INVALID_SOURCES'; end if;
 if p_content->>'supersedes_id' is not null then
  select * into predecessor from decisions where id=(p_content->>'supersedes_id')::uuid;
  if predecessor.id is null or predecessor.repo_id<>d.repo_id or predecessor.demo_run_id<>d.demo_run_id or predecessor.status<>'approved'
    or predecessor.rule_key<>p_content->>'rule_key' or predecessor.scope->>'path_glob'<>s->>'path_glob'
    or (predecessor.scope->>'dependency_name') is distinct from (s->>'dependency_name')
    or (predecessor.scope->>'version_range') is distinct from (s->>'version_range') then raise exception 'INVALID_SUPERSESSION'; end if;
 end if;
 select review_time into at_time from demo_runs where id=d.demo_run_id;
 if (s->>'effective_from')::timestamptz < at_time then raise exception 'BACKDATED_APPROVAL'; end if;
 e:=rm_event(d.repo_id,d.demo_run_id,p_actor,'decision.approved',p_content||jsonb_build_object('decision_id',d.id,'version',coalesce(predecessor.version+1,1),'approved_by',p_actor),at_time);
 update decisions set kind=p_content->>'kind',rule_key=p_content->>'rule_key',scope=s,rationale=p_content->>'rationale',
  source_event_ids=ids,status='approved',approved_by=p_actor,approved_at=at_time,approval_event_id=e,memory_status='queued',
  supersedes_id=predecessor.id,version=coalesce(predecessor.version+1,1) where id=d.id;
 update repositories set decision_revision=decision_revision+1 where id=repo.id;
 return jsonb_build_object('decision_id',d.id,'event_id',e,'job_id',(select id from memory_jobs where event_id=e),'revision',repo.decision_revision+1);
end $$;

create or replace function revoke_decision(p_decision uuid,p_actor uuid,p_reason text,p_revision int) returns jsonb language plpgsql security definer set search_path=public as $$
declare d decisions; repo repositories; at_time timestamptz; e uuid;
begin
 select * into d from decisions where id=p_decision;
 perform rm_role(d.repo_id,p_actor,'maintainer');
 select * into repo from repositories where id=d.repo_id for update;
 if repo.decision_revision<>p_revision then raise exception 'REVISION_CONFLICT' using errcode='40001'; end if;
 if d.status<>'approved' or length(trim(p_reason))<8 then raise exception 'INVALID_REVOCATION'; end if;
 select review_time into at_time from demo_runs where id=d.demo_run_id;
 e:=rm_event(d.repo_id,d.demo_run_id,p_actor,'decision.revoked',jsonb_build_object('decision_id',d.id,'reason',p_reason),at_time);
 update decisions set status='revoked' where id=d.id;
 update repositories set decision_revision=decision_revision+1 where id=repo.id;
 return jsonb_build_object('decision_id',d.id,'event_id',e,'revision',repo.decision_revision+1);
end $$;

-- Claims are fenced by a unique lease token. Recovered jobs cannot publish stale attempts.
create or replace function claim_job(p_kind text,p_lease_seconds int default 150) returns jsonb language plpgsql security definer set search_path=public as $$
declare j jsonb; token uuid:=gen_random_uuid();
begin
 if p_kind='memory' then
  with candidate as(select id from memory_jobs where ((status in ('queued','retry_wait') and next_attempt_at<=now()) or (status in ('running','retained') and (lease_until<now() or lease_until is null))) and attempt_count<3 order by created_at for update skip locked limit 1)
  update memory_jobs t set status='running',lease_token=token,lease_until=now()+make_interval(secs=>p_lease_seconds),attempt_count=attempt_count+1 from candidate where t.id=candidate.id returning to_jsonb(t) into j;
 elsif p_kind='review' then
  with candidate as(select id from review_runs where ((status in ('queued','retry_wait') and next_attempt_at<=now()) or (status in ('recalling','generating','validating') and lease_until<now())) and attempt_count<3 order by created_at for update skip locked limit 1)
  update review_runs t set status='recalling',lease_token=token,lease_until=now()+make_interval(secs=>p_lease_seconds),attempt_count=attempt_count+1 from candidate where t.id=candidate.id returning to_jsonb(t) into j;
 elsif p_kind='draft' then
  with candidate as(select id from decisions where status='draft' and ((draft_status in ('queued','retry_wait') and next_attempt_at<=now()) or (draft_status='running' and lease_until<now())) and attempt_count<3 order by created_at for update skip locked limit 1)
  update decisions t set draft_status='running',lease_token=token,lease_until=now()+make_interval(secs=>p_lease_seconds),attempt_count=attempt_count+1 from candidate where t.id=candidate.id returning to_jsonb(t) into j;
 end if;
 -- Exhausted crashed leases become visible failures instead of being silently stranded.
 update memory_jobs set status='failed',last_error='RETRY_EXHAUSTED',lease_token=null where status in ('running','retained') and (lease_until<now() or lease_until is null) and attempt_count>=3;
 update review_runs set status='failed',metadata=metadata||'{"error":{"code":"RETRY_EXHAUSTED","message":"Worker recovery attempts exhausted.","retryable":true}}'::jsonb where status in ('recalling','generating','validating') and lease_until<now() and attempt_count>=3;
 update decisions set draft_status='failed',draft_payload=coalesce(draft_payload,'{}')||'{"error":{"code":"RETRY_EXHAUSTED","message":"Draft recovery attempts exhausted.","retryable":true}}'::jsonb where draft_status='running' and lease_until<now() and attempt_count>=3;
 return j;
end $$;

create or replace function complete_review(p_id uuid,p_token uuid,p_output jsonb,p_metadata jsonb) returns boolean language plpgsql security definer set search_path=public as $$
declare rv review_runs; repo repositories;
begin
 select * into rv from review_runs where id=p_id;
 select * into repo from repositories where id=rv.repo_id for update;
 select * into rv from review_runs where id=p_id for update;
 if rv.lease_token is distinct from p_token or rv.lease_until<now() then return false; end if;
 if rv.decision_revision<>repo.decision_revision or rv.demo_run_id<>repo.active_run_id then
  update review_runs set status='failed',metadata=p_metadata||'{"error":{"code":"REVIEW_CONTEXT_CHANGED","message":"Approval context changed during review. Run the review again.","retryable":true}}'::jsonb,lease_token=null where id=p_id;
  return false;
 end if;
 update review_runs set output=p_output,status='complete',metadata=p_metadata,lease_token=null,lease_until=null where id=p_id;
 return true;
end $$;

create or replace function ready_memory(p_id uuid,p_token uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare j memory_jobs; changed int;
begin
 select * into j from memory_jobs where id=p_id;
 perform 1 from repositories where id=j.repo_id for update;
 select * into j from memory_jobs where id=p_id for update;
 if j.lease_token is distinct from p_token or j.lease_until<now() then return false; end if;
 update memory_jobs set status='ready',retained_at=coalesce(retained_at,now()),ready_at=now(),lease_until=null,lease_token=null where id=p_id;
 update decisions set memory_status='ready' where approval_event_id=j.event_id and memory_status<>'ready';
 get diagnostics changed=row_count;
 if changed>0 then update repositories set decision_revision=decision_revision+1 where id=j.repo_id; end if;
 return true;
end $$;

-- Only the server can invoke privileged routines. Browser requests cannot forge actor IDs.
do $$
declare f record;
begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('rm_role','rm_event','create_demo_run','set_demo_time','enqueue_review','record_feedback','create_decision_draft','approve_decision','revoke_decision','claim_job','complete_review','ready_memory') loop
  execute 'revoke all on function '||f.signature||' from public,anon,authenticated';
  execute 'grant execute on function '||f.signature||' to service_role';
 end loop;
end $$;
grant all on all tables in schema public to service_role;
