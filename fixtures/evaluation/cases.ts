// SERVER ONLY. Never import this module into apps/web or a generation prompt.
// Frozen before the first scored run; any later changes require a new manifest hash.
import {packet,INITIAL_TIME,EXPIRY} from '../demo.js';
export type CaseSpec={id:string;title:string;input:ReturnType<typeof packet>;time:string;variant:string;expected:{status:string;waiver:boolean;timeout:boolean}};
export const cases:CaseSpec[]=[
{id:'case-01',title:'Parcel adapter update',input:packet('src/adapters/parcel/status.ts'),time:INITIAL_TIME,variant:'valid',expected:{status:'applicable',waiver:true,timeout:false}},
{id:'case-02',title:'Inventory adapter update',input:packet('src/adapters/inventory/status.ts',true,'1.9.2'),time:INITIAL_TIME,variant:'valid',expected:{status:'applicable',waiver:true,timeout:false}},
{id:'case-03',title:'Telemetry convention',input:packet('src/adapters/telemetry/status.ts'),time:INITIAL_TIME,variant:'convention',expected:{status:'applicable',waiver:false,timeout:false}},
{id:'case-04',title:'Path migration',input:packet('src/adapters/modern/status.ts'),time:INITIAL_TIME,variant:'wrong-path',expected:{status:'out_of_scope',waiver:false,timeout:false}},
{id:'case-05',title:'Dependency upgrade',input:packet('src/adapters/parcel/status.ts',true,'2.0.0'),time:INITIAL_TIME,variant:'version',expected:{status:'out_of_scope',waiver:false,timeout:false}},
{id:'case-06',title:'October maintenance',input:packet('src/adapters/parcel/status.ts'),time:'2026-10-01T09:00:00Z',variant:'expired',expected:{status:'expired',waiver:false,timeout:false}},
{id:'case-07',title:'Policy replacement',input:packet('src/adapters/parcel/status.ts'),time:INITIAL_TIME,variant:'superseded',expected:{status:'superseded',waiver:false,timeout:false}},
{id:'case-08',title:'Incomplete dependency context',input:packet('src/adapters/parcel/status.ts',true,null),time:INITIAL_TIME,variant:'missing',expected:{status:'needs_context',waiver:false,timeout:false}},
{id:'case-09',title:'Competing approvals',input:packet('src/adapters/parcel/status.ts'),time:INITIAL_TIME,variant:'conflict',expected:{status:'conflict',waiver:false,timeout:false}},
{id:'case-10',title:'Request options change',input:packet('src/adapters/parcel/status.ts',false),time:INITIAL_TIME,variant:'timeout',expected:{status:'applicable',waiver:true,timeout:true}},
{id:'case-11',title:'Comment-bearing change',input:packet('src/adapters/modern/status.ts'),time:INITIAL_TIME,variant:'injection',expected:{status:'out_of_scope',waiver:false,timeout:false}},
{id:'case-12',title:'Repository separation',input:packet('src/adapters/parcel/status.ts'),time:INITIAL_TIME,variant:'other-repo',expected:{status:'no_memory',waiver:false,timeout:false}}
];
export const fixtureExpiry=EXPIRY;
