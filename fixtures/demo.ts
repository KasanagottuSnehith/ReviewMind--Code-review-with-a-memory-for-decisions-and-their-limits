import {createTwoFilesPatch} from 'diff';
export const INITIAL_TIME='2026-09-29T09:00:00Z';
export const EXPIRY='2026-09-30T00:00:00Z';
export const helper={path:'src/lib/transport.ts',content:["// SYNTHETIC DEMO: invented bridge-client instrumentation.","import { request } from 'bridge-client';","export async function transport(url: string, options: { timeout: number }) {","  const started = Date.now();","  const response = await request(url, options);","  console.info('transport.duration', Date.now() - started);","  return response;","}",""].join('\n')};
export function packet(file:string,timeout=true,version:string|null='1.8.0',label='status'){
const content=["// SYNTHETIC DEMO — democart-integrations.","import { request } from 'bridge-client';","", "export async function loadStatus(orderId: string) {","  const response = await request('/orders/' + encodeURIComponent(orderId) + '/"+label+"', {","    headers: { 'X-Client': 'democart' }"+(timeout?",\n    timeout: 2000":""),"  });","  return response.json();","}",""].join('\n');
const before=content.replace("'/"+label+"'","'/health'");
return {title:'Read '+label+' from the partner adapter',diff:createTwoFilesPatch('a/'+file,'b/'+file,before,content,'','',{context:20}),context_files:[{path:file,content},helper],dependency_versions:version?{'bridge-client':version}:{},mode:'memory' as const};
}
export const demoFixtures=[
{id:'PR-A',label:'Legacy adapter',description:'Learn a wrapper exception, then recall it in a fresh session.',time:INITIAL_TIME,...packet('src/adapters/legacy/status.ts')},
{id:'PR-B',label:'New path',description:'A related approval does not extend to a new adapter.',time:INITIAL_TIME,...packet('src/adapters/new/status.ts')},
{id:'PR-D',label:'Timeout removed',description:'Wrapper approval cannot waive the timeout baseline.',time:INITIAL_TIME,...packet('src/adapters/legacy/status.ts',false)},
{id:'PR-E',label:'Version unknown',description:'Missing context means no exception eligibility.',time:INITIAL_TIME,...packet('src/adapters/legacy/status.ts',true,null)},
{id:'PR-C',label:'After expiry',description:'Advance to October 1. Prior approval remains history.',time:'2026-10-01T09:00:00Z',...packet('src/adapters/legacy/status.ts')}
];
export const seedEvents=[
['repository.convention','Use the shared transport wrapper for instrumentation. An explicit 2-second timeout remains mandatory.'],
['helper.explanation','src/lib/transport.ts instruments duration and passes options through. Inspect source; do not assume options.'],
['compatibility.note','Synthetic bridge-client 1.8.0 has a wrapper compatibility issue in src/adapters/legacy/**. This note is NOT approval.'],
['review.observation','Legacy direct calls with timeout: 2000 preserve timeout but still need wrapper review.'],
['feedback.example','A duplicate-timeout suggestion was incorrect when timeout: 2000 already existed. This is NOT permission to remove timeouts.'],
['unrelated.history','A documentation preference for docs/archive/** is unrelated to adapters. This history grants no authority.'],
['supersession.history','Historical naming guidance was replaced in an earlier isolated demo. This text is not an active decision.'],
['demo.instructions','No target wrapper exception has been pre-approved. New decisions require reflection and maintainer review.']
] as const;
