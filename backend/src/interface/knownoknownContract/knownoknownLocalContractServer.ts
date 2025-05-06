import { KnownoknownContract, DAGProver, DAGCid, AccountUpdate, Field, Mina, PrivateKey, PublicKey } from 'knownoknown-contract';
import { CID } from 'multiformats/cid';

import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// issues: [
//      https://github.com/o1-labs/o1js/issues/1651
// ]

interface ZkAppFields {
    knowledgeEntryMerkleRoot: string;
    publishKnowledgeCidHash: string;
    updateFromKnowledgeCidHash: string;
    updateToKnowledgeCidHash: string;
    applicationEntryMerkleRoot: string;
    publishApplicationCidHash: string;
    updateFromApplicationCidHash: string;
    updateToApplicationCidHash: string;
}

interface MinaAccount {
    privateKey: PrivateKey;
    publicKey: PublicKey;
}

interface localAccountInfo {
    // privateKey: PrivateKey;
    publicKey: PublicKey;
    balance: string;
}

async function readLocalAccounts() {
    // 获取当前文件的路径
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    let adminAccountInfo:any;
    let contractAccountInfo:any;
    let testAccountsInfo:any;
    try {
        adminAccountInfo = JSON.parse(fs.readFileSync(join(__dirname, '../../../keys/users/adminKey.json'), 'utf8'));
        contractAccountInfo = JSON.parse(fs.readFileSync(join(__dirname, '../../../keys/contractKey.json'), 'utf8'));
        testAccountsInfo = JSON.parse(fs.readFileSync(join(__dirname, '../../../keys/users/userKeys.json'), 'utf8'));
    } catch (error) {
        console.log(`部署账户读取失败: ${error instanceof Error ? error.message : '未知错误'}`);
        return [null, null, null]
    }
    const adminAccount: MinaAccount = {
        privateKey: PrivateKey.fromBase58(adminAccountInfo.adminPrivateKey),
        publicKey: PublicKey.fromBase58(adminAccountInfo.adminPublicKey)
    }
    const contractAccount: MinaAccount = {
        privateKey: PrivateKey.fromBase58(contractAccountInfo.contractPrivateKey),
        publicKey: PublicKey.fromBase58(contractAccountInfo.contractPublicKey)
    }
    const testAccounts: MinaAccount[] = [];
    for (let i = 0; i < testAccountsInfo.userPrivateKeys.length; i++) {
        testAccounts.push({
            privateKey: PrivateKey.fromBase58(testAccountsInfo.userPrivateKeys[i]),
            publicKey: PublicKey.fromBase58(testAccountsInfo.userPublicKeys[i])
        })
    }
    
    return [adminAccount, contractAccount, testAccounts];
}

const TXN_FEE = 1e7;
const FUND_AMOUNT = 1e13;

class KnownoknownLocalContractServer {
    private proofsEnabled: boolean;
    private adminAccount: MinaAccount;
    private contractAccount: MinaAccount;
    private testUserAccounts: MinaAccount[];
    private zkApp: KnownoknownContract;
    private knowledgeLock: boolean;
    private applicationLock: boolean;

    constructor() {
        this.proofsEnabled = false;
        this.knowledgeLock = false;
        this.applicationLock = false;
    }

    lockKnowledge() {
        this.knowledgeLock = true;
    }

    lockApplication() {
        this.applicationLock = true;
    }

    unlockKnowledge() {
        this.knowledgeLock = false;
    }

    unlockApplication() {
        this.applicationLock = false;
    }

    isKnowledgeLocked() {
        return this.knowledgeLock;
    }

    isApplicationLocked() {
        return this.applicationLock;
    }

    async checkPublish(type: 'knowledge' | 'application', newMerkleRoot: Field) {
        switch (type) {
            case 'knowledge': {
                while (!(this.zkApp.knowledgeEntryMerkleRoot.get().equals(newMerkleRoot).toBoolean())) {
                    await new Promise(resolve => setTimeout(resolve, 1000));    // 每1秒检查一次
                }
                this.unlockKnowledge();
                return true;
            }
            case 'application': {
                while (!(this.zkApp.applicationEntryMerkleRoot.get().equals(newMerkleRoot).toBoolean())) {
                    await new Promise(resolve => setTimeout(resolve, 1000));    // 每1秒检查一次
                }
                this.unlockApplication();
                return true;
            }
        }
    }

    async provePublish(type: 'knowledge' | 'application', dagProver: DAGProver, newMerkleRoot: Field) {
        let txn:any;
        switch (type) {
            case 'knowledge':
                this.lockKnowledge();
                txn = await Mina.transaction(this.adminAccount.publicKey, async () => {
                    await this.zkApp.proveKnowledgePublish(dagProver);
                });
                break;
            case 'application':
                this.lockApplication();
                txn = await Mina.transaction(this.adminAccount.publicKey, async () => {
                    await this.zkApp.proveApplicationPublish(dagProver);
                });
                break;
            default:
                throw new Error("invalid type");
        }
        await txn.prove();
        await txn.sign([this.adminAccount.privateKey]).send();
        await this.checkPublish(type, newMerkleRoot);
        return true;
    }

    async resetPublish(type: 'knowledge' | 'application') {
        let resetTxn:any;
        switch (type) {
            case 'knowledge':
                resetTxn = await Mina.transaction(this.adminAccount.publicKey, async () => {
                    await this.zkApp.resetKnowledgePublish();
                });
                break;
            case 'application':
                resetTxn = await Mina.transaction(this.adminAccount.publicKey, async () => {
                    await this.zkApp.resetApplicationPublish();
                });
                break;
            default:
                throw new Error("invalid type");
        }
        await resetTxn.prove();
        await resetTxn.sign([this.adminAccount.privateKey]).send();
    }

    async initLocalAccounts() {
        const [adminAccount, contractAccount, testAccounts] = await readLocalAccounts();
        if (adminAccount != null && contractAccount != null && testAccounts != null) {
            this.adminAccount = adminAccount as MinaAccount;
            this.contractAccount = contractAccount as MinaAccount;
            this.testUserAccounts = testAccounts as MinaAccount[];
        } else {
            throw new Error("admin account or contract account or test accounts is null");
        }
        // console.log("local accounts initialized");
        // console.log("admin account: ", this.adminAccount.publicKey.toBase58());
        // console.log("contract account: ", this.contractAccount.publicKey.toBase58());
        // console.log("test user accounts: ", this.testUserAccounts.map(account => account.publicKey.toBase58()));
    }

    async contractCompile() {
        if (this.proofsEnabled) {
            const compile_time_start = performance.now();
            await KnownoknownContract.compile();
            const compile_time_end = performance.now();
            console.log(`compile time: ${compile_time_end - compile_time_start}ms`);
        }
    }

    async initialize(applicationDagCidArray: Array<DAGCid>, knowledgeDagCidArray: Array<DAGCid>) {
        await this.initLocalAccounts();
        // await this.contractCompile();
        const Local = await Mina.LocalBlockchain({ proofsEnabled: this.proofsEnabled });
        Mina.setActiveInstance(Local);
        const [fundAccount_1, fundAccount_2, fundAccount_3, fundAccount_4] = Local.testAccounts;
        await this.fundLocalAccounts([fundAccount_1, fundAccount_2, fundAccount_3, fundAccount_4]);

        await this.localDeploy();
        await this.initContractFields(DAGProver.calculateMerkleRoot(applicationDagCidArray), DAGProver.calculateMerkleRoot(knowledgeDagCidArray));
    }
    
    private async fundLocalAccount (fundAccount: Mina.TestPublicKey, fundedAccount: PublicKey) {
        const fundTxn_1 = await Mina.transaction(fundAccount, async () => {
            AccountUpdate.createSigned(fundAccount).send({to: fundedAccount, amount: FUND_AMOUNT/1e2*5});
            AccountUpdate.fundNewAccount(fundAccount);
        });
        await fundTxn_1.prove();
        const fundTxn_send_1 = await fundTxn_1.sign([fundAccount.key]).send();
        if(await this.txn_res_check(fundTxn_send_1)) {
            console.log(`account ${fundedAccount.toBase58()} created: ${Mina.getBalance(fundedAccount)}`);
            // console.log(`account ${fundAccount.toBase58()} balance: ${Mina.getBalance(fundAccount)}`);
        } else {
            console.log(`account ${fundedAccount.toBase58()} creation failed`);
        }
    }

    private async fundLocalAccounts (fundAccounts: Mina.TestPublicKey[]) {
        const localAccounts = [this.adminAccount.publicKey, ...this.testUserAccounts.map(account => account.publicKey)];
        if (fundAccounts.length !== localAccounts.length) {
            throw new Error("fundAccounts length is not equal to localAccounts length");
        }
        for (let i = 0; i < fundAccounts.length; i++) {
            await this.fundLocalAccount(fundAccounts[i], localAccounts[i]);
        }

        this.zkApp = new KnownoknownContract(this.contractAccount.publicKey);
    }

    private async localDeploy() {
        const deployTxn = await Mina.transaction(this.adminAccount.publicKey, async () => {
            AccountUpdate.fundNewAccount(this.adminAccount.publicKey);
            await this.zkApp.deploy();
        });
        await deployTxn.prove();
        // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
        await deployTxn.sign([this.adminAccount.privateKey, this.contractAccount.privateKey]).send();
        const knowledgeEntryMerkleRoot = this.zkApp.knowledgeEntryMerkleRoot.get();
        if(knowledgeEntryMerkleRoot.equals(Field(0))) {
            console.log("local contract deployed");
        } else {
            console.log("local contract deployment failed");
        }
    }

    private async initContractFields(applicationDagRoot: Field, knowledgeDagRoot: Field) {
        const initTxn = await Mina.transaction(this.adminAccount.publicKey, async () => {
            await this.zkApp.initApplicationEntryMerkleRoot(applicationDagRoot);
            await this.zkApp.initKnowledgeEntryMerkleRoot(knowledgeDagRoot);
        });
        await initTxn.prove();
        await initTxn.sign([this.adminAccount.privateKey]).send();
        if(this.zkApp.applicationEntryMerkleRoot.get().equals(applicationDagRoot) && this.zkApp.knowledgeEntryMerkleRoot.get().equals(knowledgeDagRoot)) {
            console.log("initEntryMerkleRoot success");
        } else {
            console.log("initEntryMerkleRoot failed");
        }
    }

    async contractTest(): Promise<boolean> {        
        const dagRoot = DAGProver.getEmptyTreeRoot();
        const sender = this.testUserAccounts[0];

        // update transaction
        // console.log("--------------- initApplicationEntryMerkleRoot Begin ---------------");
        // const txn = await Mina.transaction(this.adminAccount.publicKey, async () => {
        // await this.zkApp.initApplicationEntryMerkleRoot(dagRoot);
        // });
        // const start_1 = performance.now();
        // await txn.prove();
        // const end_1 = performance.now();
        // console.log(`initApplicationEntryMerkleRoot time: ${end_1 - start_1}ms`);
        // await txn.sign([this.adminAccount.privateKey]).send();
        // const updatedApplicationEntryCidHash = this.zkApp.applicationEntryMerkleRoot.get();
        // if(updatedApplicationEntryCidHash.equals(dagRoot)) {
        //     // console.log("initApplicationEntryMerkleRoot success");
        // } else {
        //     console.log("initApplicationEntryMerkleRoot failed");
        // }
        // console.log("--------------- initApplicationEntryMerkleRoot End ---------------");

        console.log("--------------- submitApplicationPublish_1 Begin ---------------");
        const testCid = CID.parse("bafkreiadvrtuefxt4fohmhxbuxrfl4dhsu3chsftrc2elhqt7f4npscg6q");
        const testDagCid = DAGCid.parseCID(testCid);

        const txn_2 = await Mina.transaction(sender.publicKey, async () => {
        await this.zkApp.submitApplicationPublish(testDagCid.toHash());
        });
        const start_2 = performance.now();
        await txn_2.prove();
        const end_2 = performance.now();
        console.log(`submitApplicationPublish time: ${end_2 - start_2}ms`);
        await txn_2.sign([sender.privateKey]).send();
        console.log("--------------- submitApplicationPublish_1 End ---------------");

        console.log("--------------- proveApplicationPublish_1 Begin ---------------");
        const dagProver_1 = DAGProver.structProver([], 0, testDagCid);
        const offStart_1 = performance.now();
        const newDagRoot_1 = dagProver_1.proveDagPublic(testDagCid.toHash(), dagRoot);
        const offEnd_1 = performance.now();
        console.log(`offchain proveDagPublic time: ${offEnd_1 - offStart_1}ms`);
        const txn_3 = await Mina.transaction(this.adminAccount.publicKey, async () => {
            await this.zkApp.proveApplicationPublish(dagProver_1);
        });
        const start_3 = performance.now();
        await txn_3.prove();
        const end_3 = performance.now();
        console.log(`proveApplicationPublish time: ${end_3 - start_3}ms`);
        await txn_3.sign([this.adminAccount.privateKey]).send();
        if(this.zkApp.applicationEntryMerkleRoot.get().equals(newDagRoot_1)) {
            console.log("proveApplicationPublish success");
        } else {
            console.log("proveApplicationPublish failed");
        }
        console.log("--------------- proveApplicationPublish_1 End ---------------");

        console.log("--------------- submitApplicationUpdate_1 Begin ---------------");
        const testCid_2 = CID.parse("bafyreiam22nvyixmudlem4dcmh2krnx4tnnobdxe6lpqdmpvfd2ozn74pq");
        const testDagCid_2 = DAGCid.parseCID(testCid_2);
        const txn_4 = await Mina.transaction(sender.publicKey, async () => {
            await this.zkApp.submitApplicationUpdate(testDagCid.toHash(), testDagCid_2.toHash());
        });
        const start_4 = performance.now();
        await txn_4.prove();
        const end_4 = performance.now();
        console.log(`submitApplicationUpdate time: ${end_4 - start_4}ms`);
        await txn_4.sign([sender.privateKey]).send();
        console.log("--------------- submitApplicationUpdate_1 End ---------------");

        console.log("--------------- proveApplicationUpdate_1 Begin ---------------");
        const dagProver_2 = DAGProver.structProver([DAGCid.parseCID(testCid)], 0, testDagCid_2);
        const txn_5 = await Mina.transaction(this.adminAccount.publicKey, async () => {
            await this.zkApp.proveApplicationUpdate(dagProver_2);
        });
        const start_5 = performance.now();
        await txn_5.prove();
        const end_5 = performance.now();
        console.log(`proveApplicationUpdate time: ${end_5 - start_5}ms`);
        await txn_5.sign([this.adminAccount.privateKey]).send();
        const offStart_5 = performance.now();
        const newDagRoot_2 = dagProver_2.proveDagUpdate(DAGCid.parseCID(testCid).toHash(), testDagCid_2.toHash(), newDagRoot_1);
        const offEnd_5 = performance.now();
        console.log(`offchain proveDagUpdate time: ${offEnd_5 - offStart_5}ms`);
        if(this.zkApp.applicationEntryMerkleRoot.get().equals(newDagRoot_2)) {
            console.log("proveApplicationUpdate success");
        } else {
            console.log("proveApplicationUpdate failed");
        }
        console.log("--------------- proveApplicationUpdate_1 End ---------------");
        return true;
    }

    // contract util functions
    private async txn_res_check(txn_send: Mina.PendingTransaction): Promise<boolean> {
        if (txn_send.status === 'pending') {
            // console.log('Transaction accepted for processing by the Mina daemon.');
            try {
                await txn_send.wait();
                // console.log('Transaction successfully included in a block.');
                return true;
            } catch (error) {
                // console.error('Transaction was rejected or failed to be included in a block:', error);
                return false;
            }
        } else {
            // console.error('Transaction was not accepted for processing by the Mina daemon.');
            return false;
        }
    }

    // local contract server functions, 合约模拟
    async submitUpdate(type: 'knowledge' | 'application', updateFromCid: string, updateToCid: string, senderKey: string) {
        try {
            const updateToCidHash = DAGCid.parseCID(CID.parse(updateToCid)).toHash()
            const updateFromCidHash = DAGCid.parseCID(CID.parse(updateFromCid)).toHash()
            const senderPvk = PrivateKey.fromBase58(senderKey);
            const senderPbk = senderPvk.toPublicKey()
            let submitUpdateTxn;
            switch (type) {
                case 'knowledge': 
                    submitUpdateTxn = await Mina.transaction({
                        sender: senderPbk,
                        fee: TXN_FEE,
                    }, async () => {
                        await this.zkApp.submitKnowledgeUpdate(updateFromCidHash, updateToCidHash);
                    })
                    break;
                case 'application': 
                    submitUpdateTxn = await Mina.transaction({
                        sender: senderPbk,
                        fee: TXN_FEE,
                    }, async () => {
                        await this.zkApp.submitApplicationUpdate(updateFromCidHash, updateToCidHash);
                    })
                    break;
            }
            await submitUpdateTxn.prove();
            const pendingTxn = await submitUpdateTxn.sign([senderPvk]).send();
            if(await this.txn_res_check(pendingTxn)) {
                switch (type) {
                    case 'knowledge': 
                        if(this.zkApp.updateFromKnowledgeCidHash.get().equals(updateFromCidHash) && this.zkApp.updateToKnowledgeCidHash.get().equals(updateToCidHash)) {
                            console.log("submitKnowledgeUpdate success");
                        } else {
                            console.log("submitKnowledgeUpdate failed");
                        }
                        break;
                    case 'application': 
                        if(this.zkApp.updateFromApplicationCidHash.get().equals(updateFromCidHash) && this.zkApp.updateToApplicationCidHash.get().equals(updateToCidHash)) {
                            console.log("submitApplicationUpdate success");
                        } else {
                            console.log("submitApplicationUpdate failed");
                        }
                        break;
                }
            } else {
                console.log("submitUpdate failed");
            }
            return true;
        } catch (error) {
            console.log("error within params of request")
            return false;
        }
    }

    async submitPublish(type: 'knowledge' | 'application', publishCid: string, senderKey: string) {
        try {
            const publishCidHash = DAGCid.parseCID(CID.parse(publishCid)).toHash()
            const senderPvk = PrivateKey.fromBase58(senderKey);
            const senderPbk = senderPvk.toPublicKey()
            let submitPublishTxn;
            switch (type) {
                case 'knowledge': 
                    submitPublishTxn = await Mina.transaction({
                        sender: senderPbk,
                        fee: TXN_FEE,
                    }, async () => {
                        await this.zkApp.submitKnowledgePublish(publishCidHash);
                    })
                    break;
                case 'application': 
                    submitPublishTxn = await Mina.transaction({
                        sender: senderPbk,
                        fee: TXN_FEE,
                    }, async () => {
                        await this.zkApp.submitApplicationPublish(publishCidHash);
                    })
                    break;
            }
            await submitPublishTxn.prove();
            const pendingTxn = await submitPublishTxn.sign([senderPvk]).send();
            if(await this.txn_res_check(pendingTxn)) {
                switch (type) {
                    case 'knowledge': 
                        if(this.zkApp.publishKnowledgeCidHash.get().equals(publishCidHash)) {
                            console.log("submitKnowledgePublish success");
                        } else {
                            console.log("submitKnowledgePublish failed");
                        }
                        break;
                    case 'application': 
                        if(this.zkApp.publishApplicationCidHash.get().equals(publishCidHash)) {
                            console.log("submitApplicationPublish success");
                        } else {
                            console.log("submitApplicationPublish failed");
                        }
                        break;
                }
            } else {
                console.log("submitPublish failed");
            }
            return true;
        } catch (error) {
            console.log("error within params of request", error)
            return false;
        }
    }

    async getContractFields(contractAddress: string) {
        try {
            const contractAddressPbk = PublicKey.fromBase58(contractAddress);
            const someZkApp = new KnownoknownContract(contractAddressPbk);
            const zkAppFields: ZkAppFields = {
                knowledgeEntryMerkleRoot: someZkApp.knowledgeEntryMerkleRoot.get().toString(),
                publishKnowledgeCidHash: someZkApp.publishKnowledgeCidHash.get().toString(),
                updateFromKnowledgeCidHash: someZkApp.updateFromKnowledgeCidHash.get().toString(),
                updateToKnowledgeCidHash: someZkApp.updateToKnowledgeCidHash.get().toString(),
                applicationEntryMerkleRoot: someZkApp.applicationEntryMerkleRoot.get().toString(),
                publishApplicationCidHash: someZkApp.publishApplicationCidHash.get().toString(),
                updateFromApplicationCidHash: someZkApp.updateFromApplicationCidHash.get().toString(),
                updateToApplicationCidHash: someZkApp.updateToApplicationCidHash.get().toString(),
            }
            return zkAppFields;
        } catch (error) {
            console.log(`contract ${contractAddress} is invalid`);
            return null;
        }
    }

    async getLocalContractAddress() {
        return this.contractAccount.publicKey;
    }

    async getLocalAccountsInfo() {
        const localAccountsInfo: localAccountInfo[] = [];
        for (let i = 0; i < this.testUserAccounts.length; i++) {
            localAccountsInfo.push({
                // privateKey: this.testUserAccounts[i].privateKey,
                publicKey: this.testUserAccounts[i].publicKey,
                balance: Mina.getBalance(this.testUserAccounts[i].publicKey).toBigInt().toString()
            });
        }
        return localAccountsInfo;
    }
    
    async getLocalAccountInfo(account: string) {
        try {
            const accountPvk = PrivateKey.fromBase58(account);
            const accountPbk = accountPvk.toPublicKey();
            const localAccountInfo: localAccountInfo = {
                // privateKey: accountPvk,
                publicKey: accountPbk,
                balance: Mina.getBalance(accountPbk).toBigInt().toString()
            };
            return localAccountInfo;
        } catch (error) {
            console.log(`private key ${account} is invalid`);
            return null;
        }
    }
}

export { KnownoknownLocalContractServer };