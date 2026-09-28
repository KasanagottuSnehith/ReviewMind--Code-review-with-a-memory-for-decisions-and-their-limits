import { z } from 'zod';

export const MAX_BYTES = 30_000;
export const roles = ['viewer', 'contributor', 'maintainer'] as const;
export type Role = typeof roles[number];
export const modes = ['generic', 'static', 'memory'] as const;
export const BASELINE_RULE = 'explicit-timeout';
export const WRAPPER_RULE = 'transport-wrapper';
export const utc = z.string().datetime({ offset: true });
export const scopeSchema = z.object({
  path_glob: z.string().min(1).max(250),
  dependency_name: z.string().min(1).max(100).nullable(),
  version_range: z.string().min(1).max(120).nullable(),
  effective_from: utc,
  expires_at: utc.nullable(),
  prerequisites: z.array(z.object({ kind: z.enum(['timeout_ms', 'context_source']), value: z.string().min(1).max(200) })).max(8).default([])
}).strict();
export const decisionContentSchema = z.object({
  kind: z.enum(['convention', 'temporary_exception', 'correction']),
  rule_key: z.string().regex(/^[a-z][a-z0-9-]{1,79}$/),
  scope: scopeSchema,
  rationale: z.string().trim().min(8).max(3000),
  source_event_ids: z.array(z.string().uuid()).min(1).max(20),
  supersedes_id: z.string().uuid().nullable()
}).strict();
export const decisionDraftJsonSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: ['convention', 'temporary_exception', 'correction'] },
    rule_key: { type: 'string' }, rationale: { type: 'string' },
    scope: { type: 'object', additionalProperties: false, properties: {
      // The configured Cloud endpoint returned 500 for array-valued types and
      // string nulls with anyOf. Keep nullable conversion at our boundary.
      path_glob: { type: 'string' }, dependency_name: { type: 'string', description: 'Dependency name, or an empty string when absent.' },
      version_range: { type: 'string', description: 'Semver range, or an empty string when absent.' }, effective_from: { type: 'string' },
      expires_at: { type: 'string', description: 'UTC ISO expiry, required for temporary exceptions. Empty string only for non-expiring decisions.' },
      prerequisites: { type: 'array', items: { type: 'object', additionalProperties: false,
        properties: { kind: { type: 'string', enum: ['timeout_ms', 'context_source'] }, value: { type: 'string' } },
        required: ['kind', 'value'] } }
    }, required: ['path_glob', 'dependency_name', 'version_range', 'effective_from', 'expires_at', 'prerequisites'] },
    source_event_ids: { type: 'array', minItems: 1, items: { type: 'string' }, description: 'The selected source event UUIDs, copied exactly and stated explicitly in the answer.' },
    supersedes_id: { type: 'string', description: 'UUID of an explicitly supplied predecessor, or an empty string when no predecessor is supplied.' }
  }, required: ['kind','rule_key','rationale','scope','source_event_ids','supersedes_id']
};
/** Translate only documented nullable wire fields; never invent missing sources. */
export function parseReflectedDecision(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return decisionContentSchema.safeParse(raw);
  const value={...raw} as Record<string,unknown>;
  const nullable=(v:unknown)=>v===''||v==='null'?null:v;
  value.supersedes_id=nullable(value.supersedes_id);
  if(value.scope && typeof value.scope==='object' && !Array.isArray(value.scope)) {
    const scope={...value.scope} as Record<string,unknown>;
    for(const key of ['dependency_name','version_range','expires_at'])scope[key]=nullable(scope[key]);
    value.scope=scope;
  }
  return decisionContentSchema.safeParse(value);
}
export type DecisionContent = z.infer<typeof decisionContentSchema>;
export type Decision = DecisionContent & {
  id: string; repo_id: string; demo_run_id: string; version: number;
  status: 'draft'|'approved'|'revoked'|'rejected';
  approved_by: string|null; approved_at: string|null;
  memory_status: string; approval_event_id: string|null;
  draft_status: string; created_at: string;
};
export const reviewInputSchema = z.object({
  repo_id: z.string().uuid(),
  mode: z.enum(modes).default('memory'),
  title: z.string().trim().min(1).max(160),
  diff: z.string().min(1),
  context_files: z.array(z.object({ path: z.string(), content: z.string() }).strict()).max(3).default([]),
  dependency_versions: z.record(z.string(), z.string()).default({}),
  demo_time: utc.optional()
}).strict();
export type ReviewInput = z.infer<typeof reviewInputSchema>;
export const feedbackSchema = z.object({
  finding_id: z.string().min(1).max(100).nullable(),
  disposition: z.enum(['accepted','incorrect','already_handled','temporary_exception','preference']),
  reason: z.string().trim().min(8).max(3000),
  proposed_scope: scopeSchema,
  rule_key: z.string().regex(/^[a-z][a-z0-9-]{1,79}$/).optional(),
  anchor: z.object({ file: z.string(), line: z.number().int().positive() }).optional(),
  source_reference: z.string().max(1000).default('')
}).strict();
export const findingSchema = z.object({
  id: z.string().optional(),
  category: z.enum(['reliability','convention','correctness','maintainability']),
  severity: z.enum(['low','medium','high']),
  file: z.string(), line_start: z.number().int().positive(), line_end: z.number().int().positive(),
  message: z.string().min(1).max(1500), suggestion: z.string().min(1).max(1500),
  evidence_refs: z.array(z.string()).max(20), rule_key: z.string().min(1).max(80)
}).strict();
export const reviewOutputSchema = z.object({
  summary: z.string().max(1500),
  findings: z.array(findingSchema).max(5),
  questions: z.array(z.string().max(1000)).max(10),
  limitations: z.array(z.string().max(1000)).max(10)
}).strict();
export type Finding = z.infer<typeof findingSchema>;
export type ReviewOutput = z.infer<typeof reviewOutputSchema>;
export type Applicability = 'applicable'|'out_of_scope'|'expired'|'future'|'superseded'|'conflict'|'needs_context'|'unapproved'|'revoked'|'pending'|'unverifiable';
export type Evidence = { decision: Decision; event_id: string; fact_id: string; fact_text: string; status: Applicability; reason: string; file: string };
export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400, public retryable = false, public field_errors?: Record<string,string>) { super(message); }
}
export function assertRole(role: Role, required: 'contributor'|'maintainer') {
  if (roles.indexOf(role) < roles.indexOf(required)) throw new AppError('FORBIDDEN', 'Your role cannot perform this action.', 403);
}
export function publicError(error: unknown) {
  if (error instanceof AppError) return { code: error.code, message: error.message, retryable: error.retryable, field_errors: error.field_errors };
  if (error instanceof z.ZodError) return { code: 'INVALID_INPUT', message: 'Check the highlighted fields.', retryable: false,
    field_errors: Object.fromEntries(error.issues.map(i => [i.path.join('.'),i.message])) };
  return { code: 'INTERNAL_ERROR', message: 'The operation failed. Your saved input is preserved.', retryable: false };
}
