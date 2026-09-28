import {app,finishRoutes} from './app.js';
import {startWorker} from './worker.js';
import {startEvaluationWorker} from './evaluation.js';
import {config,configurationStatus} from './config.js';
import {PROMPT_VERSION} from '../../../packages/reviewer/src/index.js';
finishRoutes();
const stopWorker=startWorker(),stopEvaluation=startEvaluationWorker();
const server=app.listen(config.port,process.env.HOST||'0.0.0.0',()=>console.log(JSON.stringify({service:'reviewmind',port:config.port,prompt_version:PROMPT_VERSION,configuration:configurationStatus()})));
function shutdown(){stopWorker();stopEvaluation();server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),5000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
