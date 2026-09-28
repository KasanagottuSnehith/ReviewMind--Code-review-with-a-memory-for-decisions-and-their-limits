import { createClient,type SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../../packages/contracts/src/index.js';
import { config,requiredConfiguration } from './config.js';
let client:SupabaseClient|undefined;
export function db(){requiredConfiguration();return client??=createClient(config.supabaseUrl,config.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});}
export function dbError(error:{message?:string;code?:string}){
const codes=['FORBIDDEN','REVISION_CONFLICT','IDEMPOTENCY_CONFLICT','REVIEW_CONTEXT_CHANGED','CLOCK_REWIND_REQUIRES_RESET','CLOCK_MISMATCH','RUN_CHANGED','RUN_REQUIRED','DRAFT_NOT_READY','INVALID_SOURCES','INVALID_SUPERSESSION','INVALID_SCOPE','INVALID_EXPIRY','EXPIRY_REQUIRED','BACKDATED_APPROVAL','REVIEW_NOT_COMPLETE','NON_WAIVABLE','INVALID_REVOCATION'];
const code=codes.find(c=>(error.message??'').includes(c));
return code?new AppError(code,code.replaceAll('_',' ').toLowerCase()+'.',code==='FORBIDDEN'?403:/CONFLICT|CHANGED/.test(code)?409:422):new AppError('DATABASE_ERROR','Database operation failed. Check migration and connectivity.',503,true);
}
export async function rpc<T=any>(name:string,args:Record<string,unknown>):Promise<T>{const {data,error}=await db().rpc(name,args);if(error)throw dbError(error);return data as T;}
export async function query<T=any>(promise:PromiseLike<{data:any;error:any}>):Promise<T>{const {data,error}=await promise;if(error)throw dbError(error);return data as T;}
