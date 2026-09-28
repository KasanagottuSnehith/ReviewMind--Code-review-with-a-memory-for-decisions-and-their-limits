import {db,query,rpc} from '../apps/api/src/db.js';
import {seedEvents,INITIAL_TIME} from '../fixtures/demo.js';
const password=process.env.DEMO_PASSWORD;
if(!password||password.length<12){console.error('Set DEMO_PASSWORD locally to at least 12 characters.');process.exit(1);}
try{
 const existing=await query<any[]>(db().from('workspaces').select('*').eq('name','ReviewMind Demo'));
 const workspace=existing[0]??await query(db().from('workspaces').insert({name:'ReviewMind Demo'}).select().single());
 const repos=await query<any[]>(db().from('repositories').select('*').eq('workspace_id',workspace.id).eq('name','democart-integrations').eq('is_evaluation',false));
 const repo=repos[0]??await query(db().from('repositories').insert({workspace_id:workspace.id,name:'democart-integrations'}).select().single());
 const listed=await db().auth.admin.listUsers({perPage:1000});if(listed.error)throw listed.error;
 let maintainer='';
 for(const role of ['maintainer','contributor','viewer']){
  const email=role==='maintainer'?(process.env.DEMO_EMAIL||'maintainer@reviewmind.example'):role+'@reviewmind.example';
  let user=listed.data.users.find(u=>u.email===email);
  if(!user){const result=await db().auth.admin.createUser({email,password,email_confirm:true});if(result.error)throw result.error;user=result.data.user;}
  await query(db().from('memberships').upsert({workspace_id:workspace.id,user_id:user.id,role}));
  if(role==='maintainer')maintainer=user.id;
  console.log('Demo account ready: '+email+' ('+role+')');
 }
 if(!repo.active_run_id){
  const run=await rpc('create_demo_run',{p_repo:repo.id,p_actor:maintainer,p_time:INITIAL_TIME});
  for(const [type,text]of seedEvents)await rpc('rm_event',{r:repo.id,run:run.run_id,a:maintainer,t:type,p:{synthetic:true,text},at_time:INITIAL_TIME});
 }
 console.log('Seed complete. No wrapper exception is pre-approved. Start the API worker to ingest seed history.');
}catch{console.error('Seed failed; verify migration, account settings and server credentials. No secret values printed.');process.exitCode=1;}
