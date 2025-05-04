import * as Comlink from "comlink";
import { Worker } from 'worker_threads';
import nodeEndpoint from 'comlink/dist/umd/node-adapter.js';
import * as comlink from 'comlink';

class TestServer {
  // ---------------------------------------------------------------------------------------
  worker: Worker;
  // Proxy to interact with the worker's methods as if they were local
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
        if (message.type === 'doMath') {
            const result = message.result;
            console.log(result);
        }
    }
    this.worker = new Worker(new URL('./testWorker.js', import.meta.url), {
        workerData: {
            memory: new WebAssembly.Memory({
                initial: 19,
                maximum: 65536,
                shared: true,
            }),
        },
    }).on('message', checkInitialized);;
    // Wrap the worker with Comlink to enable direct method invocation
    this.initialized = false;
    console.log("TestServer constructor");
  }

  async waitInitialized() {
    while (!this.initialized) { // 等待初始化完成
        await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async doMath() {
    this.worker.postMessage({
      type: 'doMath',
    });
  }

}

export { TestServer };
