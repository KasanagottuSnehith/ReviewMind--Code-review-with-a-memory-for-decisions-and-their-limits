import {createClient,type SupabaseClient} from '@supabase/supabase-js';
let auth:SupabaseClient|null=null;
export async function initialize(){const response=await fetch('/api/config');const config=await response.json();if(config.supabase_url&&config.public_key)auth=createClient(config.supabase_url,config.public_key);return config;}
export function authClient(){return auth;}
export async function api<T=any>(path:string,body?:unknown,headers:Record<string,string>={}):Promise<T>{
const session=await auth?.auth.getSession();const token=session?.data.session?.access_token;
const response=await fetch('/api'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error?.message??'Request failed'),{code:result.error?.code,fields:result.error?.field_errors});return result;
}
