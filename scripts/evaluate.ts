import { mkdir, writeFile } from 'node:fs/promises';
import { db, query } from '../apps/api/src/db.js';

const runs = await query<any[]>(
  db().from('evaluation_runs').select('id,case_id,mode,status,manifest_hash,result,review_id,created_at').order('created_at',{ascending:true})
);
const summary = {
  exported_at: new Date().toISOString(),
  total: runs.length,
  completed: runs.filter(r=>r.status==='complete').length,
  failed: runs.filter(r=>r.status==='failed').length,
  pending: runs.filter(r=>!['complete','failed'].includes(r.status)).length,
  invalid_waivers: runs.reduce((n,r)=>n+(r.result?.invalid_waivers??0),0),
  unsupported_citations: runs.reduce((n,r)=>n+(r.result?.unsupported_citations??0),0),
  human_finding_precision: 'not assessed',
  runs
};
await mkdir('docs/evidence',{recursive:true});
await writeFile('docs/evidence/evaluation.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({total:summary.total,completed:summary.completed,failed:summary.failed,pending:summary.pending}));
