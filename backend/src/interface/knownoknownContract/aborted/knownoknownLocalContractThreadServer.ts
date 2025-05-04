import * as Comlink from "comlink";
import { Worker } from 'worker_threads';
import nodeEndpoint from 'comlink/dist/umd/node-adapter.js';

// issues: wasm_bindgen_worker_ready 
//  D:\Festu\Lessons\Graduation_Project\Projects\Knownoknown\contract\node_modules\o1js\dist\node\bindings\js\node\node-backend.js 

class KnownoknownLocalContractThreadServer {
  // ---------------------------------------------------------------------------------------
  worker: Worker;
  // Proxy to interact with the worker's methods as if they were local
  remoteApi: Comlink.Remote<import('./knownoknownLocalContractWorker').KnownoknownLocalContractWorker>;
  initialized: boolean;

  constructor() {
    // Initialize the worker from the zkappWorker module
    const checkInitialized = (message: any) => {
        console.log(JSON.stringify(message));
        if (message.type === 'ready') {
          this.initialized = true;
          this.worker.off('message', checkInitialized);
          console.log("initialized");
        }
    }
    this.worker = new Worker(new URL('./knownoknownLocalContractWorker.js', import.meta.url), {
        workerData: {
            memory: new WebAssembly.Memory({
                initial: 20,
                maximum: 65536,
                shared: true,
            }),
        },
    }).on('message', checkInitialized);;
    // Wrap the worker with Comlink to enable direct method invocation
    this.remoteApi = Comlink.wrap(nodeEndpoint(this.worker));
    this.initialized = false;
    console.log("KnownoknownLocalContractThreadServer constructor");
  }

  async waitInitialized() {
    while (!this.initialized) { // 等待初始化完成
        await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async initialize() {
    return this.remoteApi.initialize();
  }

  async getLocalContractAddress() {
    return this.remoteApi.getLocalContractAddress();
  }

  async contractTest() {
    return this.remoteApi.contractTest();
  }

  async getContractFields(contractAddress: string) {
    return this.remoteApi.getContractFields(contractAddress);
  }

  async getLocalAccountsInfo() {
    return this.remoteApi.getLocalAccountsInfo();
  }

  async getLocalAccountInfo(account: string) {
    return this.remoteApi.getLocalAccountInfo(account);
  }

  async submitUpdate(type: 'knowledge' | 'application', updateFromCid: string, updateToCid: string, senderKey: string) {
    return this.remoteApi.submitUpdate(type, updateFromCid, updateToCid, senderKey);
  }

  async submitPublish(type: 'knowledge' | 'application', publishCid: string, senderKey: string) {
    return this.remoteApi.submitPublish(type, publishCid, senderKey);
  }
}

export { KnownoknownLocalContractThreadServer };
