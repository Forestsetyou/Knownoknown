// import { workerData, parentPort } from "worker_threads";
// import { knownoknownContractServer } from "./knownoknownContractServer.js";
// https://blog.csdn.net/cucibala/article/details/114235063
// https://github.com/o1-labs/o1js/issues/995

// let env = {memory: null}
// async function main(): Promise<Boolean> {
//     switch (workerData.contractWorkerParams.operationType) {
//         case 'initialize':
//             await knownoknownContractServer.initialize();
//             break;
//         case 'contractTest':
//             await knownoknownContractServer.contractTest();
//             break;
//     }
//     return true;
// }

// env.memory = new WebAssembly.Memory({
//     initial: 20,
//     maximum: 65536,
//     shared: true,
// });
// const result = await main();
// if (result) {
//     parentPort.postMessage(`${workerData.contractWorkerParams.operationType} success`);
// } else {
//     parentPort.postMessage(`${workerData.contractWorkerParams.operationType} failed`);
// }