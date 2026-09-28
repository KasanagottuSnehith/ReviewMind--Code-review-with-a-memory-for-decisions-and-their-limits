import {describe,it,expect} from 'vitest';
import {parseReflectedDecision} from '../packages/contracts/src/index.js';
import {validateDecision} from '../packages/decision-engine/src/index.js';
const draft=()=>({kind:'temporary_exception',rule_key:'transport-wrapper',rationale:'A synthetic compatibility exception.',source_event_ids:['f0e70c10-68fc-4eb7-9bcb-6e1d8c3d4ea5'],supersedes_id:'',scope:{path_glob:'src/adapters/legacy/**',dependency_name:'bridge-client',version_range:'>=1.8.0 <2.0.0',effective_from:'2026-09-29T09:00:00Z',expires_at:'2026-09-30T00:00:00Z',prerequisites:[]}});
describe('Hindsight reflection wire boundary',()=>{
 it.each(['','null',null])('accepts absent predecessor encoding %s',value=>{const result=parseReflectedDecision({...draft(),supersedes_id:value});expect(result.success).toBe(true);if(result.success)expect(result.data.supersedes_id).toBeNull();});
 it('does not invent omitted or empty source evidence',()=>{expect(parseReflectedDecision({...draft(),source_event_ids:[]}).success).toBe(false);const {source_event_ids,...missing}=draft();expect(parseReflectedDecision(missing).success).toBe(false);});
 it('rejects malformed predecessor and additional fields',()=>{expect(parseReflectedDecision({...draft(),supersedes_id:'not-a-uuid'}).success).toBe(false);expect(parseReflectedDecision({...draft(),approved:true}).success).toBe(false);});
 it('keeps expiry mandatory for temporary exceptions',()=>{const d=draft();d.scope.expires_at='';const result=parseReflectedDecision(d);expect(result.success).toBe(true);if(result.success)expect(()=>validateDecision(result.data)).toThrow('expiry');});
 it('does not mutate the raw provider evidence',()=>{const d=draft();parseReflectedDecision(d);expect(d.supersedes_id).toBe('');});
});
