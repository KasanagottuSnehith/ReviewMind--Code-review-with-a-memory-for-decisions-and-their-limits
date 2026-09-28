import {configurationStatus,config} from '../apps/api/src/config.js';
console.log(JSON.stringify({configuration:configurationStatus(),migration_access:!!config.databaseUrl,seed_password:!!process.env.DEMO_PASSWORD},null,2));
if(Object.values(configurationStatus()).some(v=>!v))process.exitCode=1;
