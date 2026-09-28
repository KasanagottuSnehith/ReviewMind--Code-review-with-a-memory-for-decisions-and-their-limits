create or replace function claim_job(p_kind text,p_lease_seconds int default 150) returns jsonb language plpgsql security definer set search_path=public as $$
declare j jsonb; token uuid:=gen_random_uuid();
begin
 -- Retired workers return no job; only the current deployment protocol may claim work.
 if p_kind not in ('v2:memory','v2:review','v2:draft') then return null; end if;
 p_kind := substring(p_kind from 4);
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
