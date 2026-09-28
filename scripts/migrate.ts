import {readFile,readdir} from 'node:fs/promises';
import postgres from 'postgres';
import {config} from '../apps/api/src/config.js';
if(!config.databaseUrl){console.error('SUPABASE_DB_URL is missing. No migration applied.');process.exit(1);}
const sql=postgres(config.databaseUrl,{ssl:'require',max:1});
try{
 await sql`create table if not exists reviewmind_migrations(name text primary key, applied_at timestamptz default now())`;
 for(const name of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()){
  if((await sql`select name from reviewmind_migrations where name=${name}`).length)continue;
  const source=await readFile('supabase/migrations/'+name,'utf8');
  await sql.begin(async tx=>{await tx.unsafe(source);await tx`insert into reviewmind_migrations(name) values(${name})`;});
  console.log('Applied '+name);
 }
}catch{console.error('Migration failed. Check database access and SQL in a private console; credentials are not printed.');process.exitCode=1;}
finally{await sql.end();}
