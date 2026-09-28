import dotenv from 'dotenv';
import { AppError } from '../../../packages/contracts/src/index.js';
dotenv.config({quiet:true});
export const config={port:Number(process.env.PORT||3001),origin:process.env.APP_ORIGIN||'http://localhost:5173',
demo:process.env.DEMO_MODE==='true',supabaseUrl:process.env.SUPABASE_URL||'',publicKey:process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'',serviceKey:process.env.SUPABASE_SERVICE_ROLE_KEY||'',databaseUrl:process.env.SUPABASE_DB_URL||'',hindsightUrl:process.env.HINDSIGHT_BASE_URL||'',hindsightKey:process.env.HINDSIGHT_API_KEY||'',llmUrl:process.env.LLM_BASE_URL||'',llmKey:process.env.LLM_API_KEY||'',model:process.env.LLM_MODEL||''};
export function configurationStatus(){return {database:!!(config.supabaseUrl&&config.publicKey&&config.serviceKey),memory:!!(config.hindsightUrl&&config.hindsightKey),generation:!!(config.llmUrl&&config.llmKey&&config.model)};}
export function requiredConfiguration(){if(!configurationStatus().database)throw new AppError('DATABASE_NOT_CONFIGURED','Supabase server configuration is missing.',503);}
