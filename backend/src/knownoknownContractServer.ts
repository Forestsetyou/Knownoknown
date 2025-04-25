import { KnownoknownContract, DAGProver, DAGCid, AccountUpdate, Field, Mina, PrivateKey, PublicKey } from 'knownoknown-contract';
import { CID } from 'multiformats/cid';

// issues: [
//      https://github.com/o1-labs/o1js/issues/1651
// ]

interface ContractWorkerParams {
    operationType: 'initialize' | 'contractTest',
    // dagProver?: DAGProver,
    // senderPrivateKey?: PrivateKey,
    // initKnowledgeEntryMerkleRoot?: Field,   // 初始化知识条目Merkle根
    // initApplicationEntryMerkleRoot?: Field, // 初始化应用条目Merkle根
}

const ADMIN_FEE = 1e11;

class KnownoknownContractServer {
    private adminKey: PrivateKey;
    private adminAccount: PublicKey;

    // for deploy
    private proofsEnabled: boolean;
    private initAccount: Mina.TestPublicKey;
    private deployerKey: PrivateKey;
    private senderAccount: Mina.TestPublicKey;
    private senderKey: PrivateKey;
    private zkAppAddress: PublicKey;
    private zkAppPrivateKey: PrivateKey;
    private zkApp: KnownoknownContract;

    constructor() {
        this.proofsEnabled = true;
        this.adminKey = PrivateKey.fromBase58("EKFQAj8PJksEZA4Rs3diU8tyAeNDXGD4YjMbpwEDPwzfCWe5CWCp");
        this.adminAccount = this.adminKey.toPublicKey();
    }

    async contractCompile() {
        if (this.proofsEnabled) {
            const compile_time_start = performance.now();
            await KnownoknownContract.compile();
            const compile_time_end = performance.now();
            console.log(`compile time: ${compile_time_end - compile_time_start}ms`);
        }
    }

    async initialize() {
        await this.contractCompile();
        const Local = await Mina.LocalBlockchain({ proofsEnabled: this.proofsEnabled });
        Mina.setActiveInstance(Local);
        [this.initAccount, this.senderAccount] = Local.testAccounts;
        this.deployerKey = this.initAccount.key;
        this.senderKey = this.senderAccount.key;

        const adminTxn = await Mina.transaction(this.initAccount, async () => {
            AccountUpdate.createSigned(this.initAccount).send({to: this.adminAccount, amount: ADMIN_FEE});
            AccountUpdate.fundNewAccount(this.initAccount);
        });
        await adminTxn.prove();
        const adminTxn_send = await adminTxn.sign([this.deployerKey]).send();
        if(await this.txn_res_check(adminTxn_send)) {
            console.log("admin account created");
        } else {
            console.log("admin account creation failed");
        }
        this.zkAppPrivateKey = PrivateKey.random();
        this.zkAppAddress = this.zkAppPrivateKey.toPublicKey();
        this.zkApp = new KnownoknownContract(this.zkAppAddress);

        await this.deploy();
    }

    private async deploy() {
        const txn = await Mina.transaction(this.adminAccount, async () => {
            AccountUpdate.fundNewAccount(this.adminAccount);
            await this.zkApp.deploy();
        });
        await txn.prove();
        // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
        await txn.sign([this.adminKey, this.zkAppPrivateKey]).send();
        const knowledgeEntryMerkleRoot = this.zkApp.knowledgeEntryMerkleRoot.get();
        if(knowledgeEntryMerkleRoot.equals(Field(0))) {
            console.log("contract deployed");
        } else {
            console.log("contract deployment failed");
        }
    }

    async contractTest(): Promise<boolean> {        
        const dagRoot = DAGProver.getEmptyTreeRoot();
        // update transaction
        console.log("--------------- initApplicationEntryMerkleRoot Begin ---------------");
        const txn = await Mina.transaction(this.adminAccount, async () => {
        await this.zkApp.initApplicationEntryMerkleRoot(dagRoot);
        });
        const start_1 = performance.now();
        await txn.prove();
        const end_1 = performance.now();
        console.log(`initApplicationEntryMerkleRoot time: ${end_1 - start_1}ms`);
        await txn.sign([this.adminKey]).send();
        const updatedApplicationEntryCidHash = this.zkApp.applicationEntryMerkleRoot.get();
        if(updatedApplicationEntryCidHash.equals(dagRoot)) {
            // console.log("initApplicationEntryMerkleRoot success");
        } else {
            console.log("initApplicationEntryMerkleRoot failed");
        }
        console.log("--------------- initApplicationEntryMerkleRoot End ---------------");

        console.log("--------------- submitApplicationPublish_1 Begin ---------------");
        const testCid = CID.parse("bafkreiadvrtuefxt4fohmhxbuxrfl4dhsu3chsftrc2elhqt7f4npscg6q");
        const testDagCid = DAGCid.parseCID(testCid);

        const txn_2 = await Mina.transaction(this.senderAccount, async () => {
        await this.zkApp.submitApplicationPublish(testDagCid.toHash());
        });
        const start_2 = performance.now();
        await txn_2.prove();
        const end_2 = performance.now();
        console.log(`submitApplicationPublish time: ${end_2 - start_2}ms`);
        await txn_2.sign([this.senderKey]).send();
        console.log("--------------- submitApplicationPublish_1 End ---------------");

        console.log("--------------- proveApplicationPublish_1 Begin ---------------");
        const dagProver_1 = DAGProver.structProver([], 0, testDagCid);
        const offStart_1 = performance.now();
        const newDagRoot_1 = dagProver_1.proveDagPublic(testDagCid.toHash(), dagRoot);
        const offEnd_1 = performance.now();
        console.log(`offchain proveDagPublic time: ${offEnd_1 - offStart_1}ms`);
        const txn_3 = await Mina.transaction(this.adminAccount, async () => {
            await this.zkApp.proveApplicationPublish(dagProver_1);
        });
        const start_3 = performance.now();
        await txn_3.prove();
        const end_3 = performance.now();
        console.log(`proveApplicationPublish time: ${end_3 - start_3}ms`);
        await txn_3.sign([this.adminKey]).send();
        if(this.zkApp.applicationEntryMerkleRoot.get().equals(newDagRoot_1)) {
            console.log("proveApplicationPublish success");
        } else {
            console.log("proveApplicationPublish failed");
        }
        console.log("--------------- proveApplicationPublish_1 End ---------------");

        console.log("--------------- submitApplicationUpdate_1 Begin ---------------");
        const testCid_2 = CID.parse("bafyreiam22nvyixmudlem4dcmh2krnx4tnnobdxe6lpqdmpvfd2ozn74pq");
        const testDagCid_2 = DAGCid.parseCID(testCid_2);
        const txn_4 = await Mina.transaction(this.senderAccount, async () => {
            await this.zkApp.submitApplicationUpdate(testDagCid.toHash(), testDagCid_2.toHash());
        });
        const start_4 = performance.now();
        await txn_4.prove();
        const end_4 = performance.now();
        console.log(`submitApplicationUpdate time: ${end_4 - start_4}ms`);
        await txn_4.sign([this.senderKey]).send();
        console.log("--------------- submitApplicationUpdate_1 End ---------------");

        console.log("--------------- proveApplicationUpdate_1 Begin ---------------");
        const dagProver_2 = DAGProver.structProver([DAGCid.parseCID(testCid)], 0, testDagCid_2);
        const txn_5 = await Mina.transaction(this.adminAccount, async () => {
            await this.zkApp.proveApplicationUpdate(dagProver_2);
        });
        const start_5 = performance.now();
        await txn_5.prove();
        const end_5 = performance.now();
        console.log(`proveApplicationUpdate time: ${end_5 - start_5}ms`);
        await txn_5.sign([this.adminKey]).send();
        const offStart_5 = performance.now();
        const newDagRoot_2 = dagProver_2.proveDagUpdate(DAGCid.parseCID(testCid).toHash(), testDagCid_2.toHash(), newDagRoot_1);
        const offEnd_5 = performance.now();
        console.log(`offchain proveDagUpdate time: ${offEnd_5 - offStart_5}ms`);
        if(this.zkApp.applicationEntryMerkleRoot.get().equals(newDagRoot_2)) {
            // console.log("proveApplicationUpdate success");
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

}

export { KnownoknownContractServer, ContractWorkerParams };