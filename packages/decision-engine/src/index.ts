import { minimatch } from 'minimatch';
import semver from 'semver';
import { BASELINE_RULE, AppError, type Decision, type DecisionContent, type Applicability } from '../../contracts/src/index.js';
import { normalizePath, validateGlob } from '../../contracts/src/input.js';
export type Context = { repoId: string; runId: string; file: string; versions: Record<string,string>; time: string; timeoutMs?: number; contextSources: string[] };
export function validateDecision(content: DecisionContent) {
  validateGlob(content.scope.path_glob);
  const s = content.scope;
  if (content.rule_key === BASELINE_RULE) throw new AppError('NON_WAIVABLE','The fixed timeout baseline cannot be modified by decisions.',422);
  if (!!s.dependency_name !== !!s.version_range || (s.version_range && !semver.validRange(s.version_range))) throw new AppError('INVALID_SCOPE','Dependency and valid semver range must be supplied together.',422);
  if (!Number.isFinite(Date.parse(s.effective_from)) || (s.expires_at && (!Number.isFinite(Date.parse(s.expires_at)) || Date.parse(s.expires_at) <= Date.parse(s.effective_from)))) throw new AppError('INVALID_SCOPE','Expiry must be later than effective time.',422);
  if (content.kind === 'temporary_exception' && !s.expires_at) throw new AppError('EXPIRY_REQUIRED','Temporary exceptions require an expiry.',422);
  if (!content.rationale.trim() || !content.source_event_ids.length) throw new AppError('SOURCE_REQUIRED','Rationale and sources are required.',422);
  for (const p of s.prerequisites) if (p.kind === 'timeout_ms' && (!/^\d+$/.test(p.value) || Number(p.value) <= 0)) throw new AppError('INVALID_SCOPE','Timeout prerequisite must be a positive millisecond value.',422);
}
export function sameScope(a: Decision, b: Decision) {
  return a.rule_key === b.rule_key && a.scope.path_glob === b.scope.path_glob &&
    a.scope.dependency_name === b.scope.dependency_name && a.scope.version_range === b.scope.version_range;
}
export function applicability(d: Decision, ctx: Context, related: Decision[] = []): { status: Applicability; reason: string } {
  const answer = (status: Applicability, reason: string) => ({ status, reason });
  if (d.repo_id !== ctx.repoId || d.demo_run_id !== ctx.runId || !d.approval_event_id || !d.rationale.trim()) return answer('unverifiable','Source ownership or approval provenance is missing.');
  if (d.status === 'revoked') return answer('revoked','A maintainer revoked this decision.');
  if (d.status !== 'approved' || !d.approved_by || !d.approved_at) return answer('unapproved','This is not an approved decision.');
  const time = Date.parse(ctx.time);
  if (!Number.isFinite(time)) return answer('needs_context','Review time is unavailable.');
  if (time < Date.parse(d.scope.effective_from) || time < Date.parse(d.approved_at)) return answer('future','The decision was not effective and approved at this review time.');
  if (d.scope.expires_at && time >= Date.parse(d.scope.expires_at)) return answer('expired','The exclusive expiry boundary has passed.');
  const successor = related.find(x => x.supersedes_id === d.id && sameScope(x,d) && x.repo_id === d.repo_id && x.demo_run_id === d.demo_run_id && ['approved','revoked'].includes(x.status) && !!x.approved_at && Date.parse(x.approved_at) <= time && Date.parse(x.scope.effective_from) <= time);
  if (successor) return answer('superseded','An explicitly approved same-scope successor has taken effect.');
  if (d.memory_status !== 'ready') return answer('pending','Retention and recall visibility are not both confirmed.');
  let file: string;
  try { file = normalizePath(ctx.file); validateGlob(d.scope.path_glob); } catch { return answer('out_of_scope','Unsafe path or invalid scope.'); }
  if (!minimatch(file,d.scope.path_glob,{ dot: true, nocase: false, nonegate: true, noext: true })) return answer('out_of_scope','The approved path does not match this file.');
  if (d.scope.dependency_name) {
    const version = ctx.versions[d.scope.dependency_name];
    if (!version || !semver.valid(version) || semver.prerelease(version)) return answer('needs_context','Supply a stable version for '+d.scope.dependency_name+'.');
    if (!d.scope.version_range || !semver.satisfies(version,d.scope.version_range)) return answer('out_of_scope','Dependency version is outside the approved range.');
  }
  for (const pre of d.scope.prerequisites) {
    if (pre.kind === 'timeout_ms' && ctx.timeoutMs !== Number(pre.value)) return answer('needs_context','The required '+pre.value+' ms timeout is not established.');
    if (pre.kind === 'context_source' && !ctx.contextSources.includes(pre.value)) return answer('needs_context','Missing prerequisite context: '+pre.value);
  }
  return answer('applicable','Approval, readiness, path, version, time, and prerequisites match.');
}
export function resolveDecisions(decisions: Decision[], ctx: Context, chains: Decision[] = decisions) {
  const results = decisions.map(decision => ({ decision, ...applicability(decision,ctx,chains) }));
  const groups = new Map<string, typeof results>();
  for (const r of results.filter(x => x.status === 'applicable')) {
    const key = r.decision.rule_key + ':' + (r.decision.kind === 'temporary_exception' ? 'exception' : 'rule');
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const group of groups.values()) if (group.length > 1) for (const r of group) {
    r.status = 'conflict'; r.reason = 'Competing decisions have no explicit precedence.';
  }
  return results;
}
