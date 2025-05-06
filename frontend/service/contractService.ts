import * as Comlink from "comlink";
import { createContext } from 'react';
import { ZkappFields } from "@/interface/utilTypes";
import { Field } from "knownoknown-contract";

interface ZkappStatus {
  compileStatus?: boolean;
  contractAddress?: string;
  zkappFields?: ZkappFields;
}

class LocalZkappService {
  // ---------------------------------------------------------------------------------------
  worker: Worker;
  // Proxy to interact with the worker's methods as if they were local
  remoteApi: Comlink.Remote<typeof import('./localContractWorker').contractApi>;
  initialized: boolean;

  constructor() {
    const initListener = (message: any) => {
      // console.log(message);
      const data = message.data;
      if (data.type === 'ready') {
        this.initialized = true;
      }
    }
    // Initialize the worker from the zkappWorker module
    this.worker = new Worker(new URL('./localContractWorker.ts', import.meta.url), { type: 'module' });
    this.worker.addEventListener('message', initListener);
    // Wrap the worker with Comlink to enable direct method invocation
    this.remoteApi = Comlink.wrap(this.worker);
    this.initialized = false;
  }

  async initThread() {
    while (!this.initialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  async initZkapp(zkappAddress: string) {
    await this.remoteApi.setActiveInstanceToLocalnet();
    await this.remoteApi.loadLocalContract(zkappAddress);
    await this.remoteApi.initLocalZkappInstance();
  }

  async getCompileStatus() {
    return this.remoteApi.getCompileStatus();
  }

  async compileZkapp() {
    await this.remoteApi.compileLocalContract();
    await this.remoteApi.localContractDeploy();
    await this.remoteApi.initLocalContract();
  }

  async getZkappStatus() {
    return this.remoteApi.getLocalContractStatus();
  }

  async getZkappFields() {
    const zkappFields = await this.remoteApi.getLocalContractFields();
    if (!zkappFields) {
      return undefined;
    }
    const zkappFieldsStatus = Object.entries(zkappFields).map(([k, v]) => [k, Field.fromJSON(v as string)]);
    return Object.fromEntries(zkappFieldsStatus) as any;
  }

  async encryptKey(key: Uint8Array, nonce: Uint8Array, publicKeyStr: string) {
    return this.remoteApi.encryptKey(key, nonce, publicKeyStr);
  }

  async decryptKey(serializedEncryptedKey: any, serializedEncryptedNonce: any, privateKeyStr: string) {
    return this.remoteApi.decryptKey(serializedEncryptedKey, serializedEncryptedNonce, privateKeyStr);
  }
  
  async publishToContract(type: string, publishCid: string, privateKeyStr: string) {
    return this.remoteApi.publishToContract(type, publishCid, privateKeyStr);
  }

  async waitPublishToContract() {
    return this.remoteApi.waitPublishToContract();
  }

  async waitMerkleRoot(type: 'knowledge' | 'application', oldMerkleRoot: string, newMerkleRoot: string) {
    return this.remoteApi.waitMerkleRoot(type, oldMerkleRoot, newMerkleRoot);
  }
}

const ZkappContext = createContext<LocalZkappService | undefined>(undefined);


export { LocalZkappService, ZkappContext };
export type { ZkappStatus };
