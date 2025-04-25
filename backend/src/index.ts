import { ExpressApp } from './expressApp.js';
import { Worker } from 'worker_threads';
import { ContractWorkerParams } from './knownoknownContractServer.js';

async function startServer() {
    const app = new ExpressApp();
    await app.init();
}
startServer();