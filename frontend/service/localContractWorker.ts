import * as Comlink from "comlink";
import { Mina, PublicKey, PrivateKey, AccountUpdate, Field, DAGProver, DAGCid, Encryption, Bytes, initializeBindings, Group } from 'knownoknown-contract'
import type { KnownoknownContract } from 'knownoknown-contract'
import { CID } from 'multiformats/cid'
import { ZkappFields } from "@/interface/utilTypes";

class KeyBytes extends Bytes(32) {}
class NonceBytes extends Bytes(12) {}

function serializeEncryptedBytes(encryptedBytes: any) {
    return {
        publicKey: encryptedBytes.publicKey.toFields().map((item: any, index: any) => item.toString()),
        cipherText: encryptedBytes.cipherText.map((item: any, index: any) => item.toFields().map((item: any, index: any) => item.toString())),
        messageLength: encryptedBytes.messageLength,
    }
}

function deserializeEncryptedBytes(serializedEncryptedBytes: any) {
    return {
        publicKey: Group.fromFields(serializedEncryptedBytes.publicKey.map((item: any, index: any) => Field.fromJSON(item))),
        cipherText: serializedEncryptedBytes.cipherText.map((item: any, index: any) => Field.fromJSON(item[0])),
        messageLength: serializedEncryptedBytes.messageLength,
    }
}

interface MinaAccount {
    privateKey: PrivateKey;
    publicKey: PublicKey;
}

const FUND_AMOUNT = 1e13;
const FAKE_CID = "bafyreiam22nvyixmudlem4dcmh2krnx4tnnobdxe6lpqdmpvfd2ozn74pq";

enum localContractUrl {
    BASE_URL="http://localhost:12891",
    ROUTER_STATUS="/contract/status", 
    ROUTER_FIELDS="/contract/fields/:contractAddress",
    ROUTER_ACCOUNTSINFO="/contract/accountsInfo", 
    ROUTER_ACCOUNTINFO="/contract/accountInfo/:pvk",
    ROUTER_PUBLISH="/contract/method/publish",
}

const SIMULATE_WAIT_TIME = 1000;

const state = {
    contractInstance: null as null | typeof KnownoknownContract,
    zkappInstance: null as null | KnownoknownContract,
    localContractAccount: null as null | {
        publicKey: PublicKey,
        privateKey: PrivateKey,
    },
    adminAccount: {
        publicKey: PublicKey.fromBase58("B62qnKaJUZLQPcvN1PTqzSFkpMS5VtoXCya6AgxWwhPZVQWf5DxRhi8"),
        privateKey: PrivateKey.fromBase58("EKFQAj8PJksEZA4Rs3diU8tyAeNDXGD4YjMbpwEDPwzfCWe5CWCp"),
    },
    senderAccount: null as null | { publicKey: PublicKey, privateKey: PrivateKey },
    remoteContractAddress: null as null | string,
    publishCID: '' as string,
    publishType: '' as string,
};

const TIMEOUT = 10000;  // 10秒超时
export const contractApi = {
    async setActiveInstanceToLocalnet() {
        const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
        Mina.setActiveInstance(Local);
        const [fundAccount_1, fundAccount_2] = Local.testAccounts;
        state.senderAccount = {
        publicKey: PublicKey.fromBase58(fundAccount_1.toBase58()),
        privateKey: fundAccount_1.key,
        };
        const fundAdminTxn = await Mina.transaction(fundAccount_2, async () => {
            AccountUpdate.createSigned(fundAccount_2).send({to: state.adminAccount.publicKey, amount: FUND_AMOUNT/1e2*5});
            AccountUpdate.fundNewAccount(fundAccount_2);
        });
        await fundAdminTxn.prove();
        await fundAdminTxn.sign([fundAccount_2.key]).send();
        console.log("setActiveInstanceToLocalnet")
    },
    async loadLocalContract(remoteContractAddress: string) {
        const { KnownoknownContract } = await import('knownoknown-contract');
        state.contractInstance = KnownoknownContract;

        // 读取远程地址
        const status_url = localContractUrl.BASE_URL+localContractUrl.ROUTER_STATUS;
        const rep = await fetch(status_url, {
            method: "GET",
            signal: AbortSignal.timeout(TIMEOUT),
        })
        if (!rep.ok) {
            throw new Error(`Request failed with status: ${rep.status}`);
        }
        const status = await rep.json()
        if (status.status !== "online") {
            throw new Error(`error within contract server status: ${status.status}`);
        }
        if (status.contractAddress !== remoteContractAddress) {
            throw new Error(`error within contract server address: ${status.contractAddress}`);
        }
        state.remoteContractAddress = remoteContractAddress;
        console.log("loadLocalContract")
    },
    async getCompileStatus() {
        return state.contractInstance!._verificationKey !== undefined;
    },
    async compileLocalContract() {
        if (await this.getCompileStatus()) {
            console.log("合约已编译")
            return true;
        }
        console.time("compileLocalContract")
        await state.contractInstance!.compile();
        console.timeEnd("compileLocalContract")
        return true;
    },
    async initLocalZkappInstance() {
        const privatekey = PrivateKey.random();
        state.localContractAccount = {
            privateKey: privatekey,
            publicKey: privatekey.toPublicKey(),
        }
        state.zkappInstance = new state.contractInstance!(state.localContractAccount.publicKey);
        console.log("initLocalZkappInstance")
    },
    async localContractDeploy() {
        const deployTxn = await Mina.transaction(state.adminAccount.publicKey, async () => {
            AccountUpdate.fundNewAccount(state.adminAccount.publicKey);
            await state.zkappInstance!.deploy();
        });
        console.time("localContractDeploy prove");
        await deployTxn.prove();
        console.timeEnd("localContractDeploy prove");
        // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
        console.time("localContractDeploy sign and send");
        await deployTxn.sign([state.adminAccount.privateKey, state.localContractAccount!.privateKey]).send();
        console.timeEnd("localContractDeploy sign and send");
        if(state.zkappInstance!.knowledgeEntryMerkleRoot.get().equals(Field(0))) {
            console.log("localContractDeploy");
        } else {
            console.log("localContractDeploy failed");
        }
    },
    async initLocalContract() {
        const initTxn = await Mina.transaction(state.adminAccount.publicKey, async () => {
            await state.zkappInstance!.initApplicationEntryMerkleRoot(DAGProver.getEmptyTreeRoot())
        });
        console.time("initLocalContract Prove")
        await initTxn.prove();
        console.timeEnd("initLocalContract Prove")
        // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
        await initTxn.sign([state.adminAccount.privateKey, state.localContractAccount!.privateKey]).send();
        if(state.zkappInstance?.knowledgeEntryMerkleRoot.get().equals(DAGProver.getEmptyTreeRoot())) {
            console.log("initLocalContract");
        } else {
            console.log("initLocalContract failed");
        }
    },
    async getLocalContractStatus() {
        const status_url = localContractUrl.BASE_URL+localContractUrl.ROUTER_STATUS;
        const rep = await fetch(status_url, {
            method: "GET",
            signal: AbortSignal.timeout(TIMEOUT),
        })
        if (!rep.ok) {
            throw new Error(`Request failed with status: ${rep.status}`);
        }
        const status = await rep.json()
        if (status.status !== "online") {
            throw new Error(`error within contract server status: ${status.status}`);
        }
        return status;
    },
    async getLocalContractFields() {
        try {
            const status_url = localContractUrl.BASE_URL+localContractUrl.ROUTER_FIELDS.replace(":contractAddress", state.remoteContractAddress as string);
            const rep = await fetch(status_url, {
                method: "GET",
                signal: AbortSignal.timeout(TIMEOUT),
            })
            if (!rep.ok) {
                throw new Error(`Request failed with status: ${rep.status}`);
            }
            const fields = await rep.json();
            if (!fields.success) {
                throw new Error(`Request failed with fields: ${fields.success}`);
            }
            // try {
            //     const zkappFieldsStatus = Object.entries(fields.fields).map(([k, v]) => [k, Field.fromJSON(v as string)]);
            //     const zkappFields: ZkappFields = Object.fromEntries(zkappFieldsStatus) as any;
            //     return zkappFields;
            // } catch (error) {
            //     console.error("getLocalContractFields error", error);
            //     return undefined;
            // }
            return fields.fields;
        } catch (error) {
            console.error("getLocalContractFields error", error);
            return undefined;
        }
    },

    async encryptKey(key: Uint8Array, nonce: Uint8Array, publicKeyStr: string) {
        const publicKey = PublicKey.fromBase58(publicKeyStr);
        const encryptedKey = Encryption.encryptBytes(KeyBytes.from(key), publicKey);
        const encryptedNonce = Encryption.encryptBytes(NonceBytes.from(nonce), publicKey);
        const serializedEncryptedKey = serializeEncryptedBytes(encryptedKey);
        const serializedEncryptedNonce = serializeEncryptedBytes(encryptedNonce);
        return { serializedEncryptedKey, serializedEncryptedNonce };
    },
    
    async decryptKey(serializedEncryptedKey: any, serializedEncryptedNonce: any, privateKeyStr: string) {
        const privateKey = PrivateKey.fromBase58(privateKeyStr);
        const encryptedKey = deserializeEncryptedBytes(serializedEncryptedKey);
        const encryptedNonce = deserializeEncryptedBytes(serializedEncryptedNonce);
        const decryptedKey = Uint8Array.from(Encryption.decryptBytes(encryptedKey, privateKey).bytes);
        const decryptedNonce = Uint8Array.from(Encryption.decryptBytes(encryptedNonce, privateKey).bytes);
        return { decryptedKey, decryptedNonce };
    },
    async simulateProofGenerate() {
        if (!(await this.getCompileStatus())) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return 1000;
        }
        const simulationTxn = await Mina.transaction(state.adminAccount.publicKey, async () => {
            await state.zkappInstance!.resetKnowledgePublish()
        });
        const startTime = Date.now();
        await simulationTxn.prove();
        const endTime = Date.now();
        // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
        await simulationTxn.sign([state.adminAccount.privateKey]).send();
        return endTime - startTime;
    },
    async publishToContract(type: string, publishCid: string, privateKeyStr: string) {
        const simulateTime = await this.simulateProofGenerate();
        const url = localContractUrl.BASE_URL+localContractUrl.ROUTER_PUBLISH;
        const body = { type, publishCid, pvk: privateKeyStr };
        console.log("publishToContract", body);
        const rep = await fetch(url, {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/json",
            }
        })
        if (!rep.ok) {
            throw new Error(`Request failed with status: ${rep.status}`);
        }
        const res = await rep.json();
        if (!res.success) {
            throw new Error(`Request failed with error: ${res.error}`);
        }
        state.publishCID = publishCid;
        state.publishType = type;
        return simulateTime;
    },
    async waitPublishToContract() {
        await new Promise(resolve => setTimeout(resolve, SIMULATE_WAIT_TIME));
        if (!(await this.getCompileStatus())) {
            state.publishCID = '';
            state.publishType = '';
            return true;
        } else {
            const cidHash = DAGCid.parseCID(CID.parse(state.publishCID)).toHash().toString();
            const fields = await this.getLocalContractFields();
            if (state.publishType === 'knowledge' && fields.publishKnowledgeCidHash === cidHash) {
                state.publishCID = '';
                state.publishType = '';
                return true;
            }
            if (state.publishType === 'application' && fields.publishApplicationCidHash === cidHash) {
                state.publishCID = '';
                state.publishType = '';
                return true;
            }
            state.publishCID = '';
            state.publishType = '';
            return false;
        }
    },

    async waitMerkleRoot(type: 'knowledge' | 'application', oldMerkleRoot: string, newMerkleRoot: string) {
        switch (type) {
            case 'knowledge': {
                while (true) {
                    const fields = await this.getLocalContractFields();
                    if (fields.knowledgeEntryMerkleRoot === oldMerkleRoot) {
                        await new Promise(resolve => setTimeout(resolve, SIMULATE_WAIT_TIME));
                        continue;
                    } else {
                        if (fields.knowledgeEntryMerkleRoot === newMerkleRoot) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                }
            };
            case 'application': {
                while (true) {
                    const fields = await this.getLocalContractFields();
                    if (fields.applicationEntryMerkleRoot === oldMerkleRoot) {
                        await new Promise(resolve => setTimeout(resolve, SIMULATE_WAIT_TIME));
                        continue;
                    } else {
                        if (fields.applicationEntryMerkleRoot === newMerkleRoot) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                }
            }
        }
    }
};

self.postMessage({
    type: 'ready',
});
// Expose the API to be used by the main thread
Comlink.expose(contractApi);
