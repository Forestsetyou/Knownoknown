import { AccountUpdate, Field, Mina, PrivateKey, PublicKey } from 'o1js';
import { KnownoknownCommitment } from './KnownoknownCommitment';
import { CID } from 'multiformats/cid';
import { DAGCid, DAGProver } from './DAGProver';
/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

const proofsEnabled = false;
const adminKey = PrivateKey.fromBase58("EKFQAj8PJksEZA4Rs3diU8tyAeNDXGD4YjMbpwEDPwzfCWe5CWCp");
const adminAccount = adminKey.toPublicKey();
const FEE = 1e11;

describe('KnownoknownCommitment', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: KnownoknownCommitment;

  beforeAll(async () => {
    const start = performance.now();
    if (proofsEnabled) await KnownoknownCommitment.compile();
    const end = performance.now();
    console.log(`compile time: ${end - start}ms`);
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;

    const adminTxn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.createSigned(deployerAccount).send({to: adminAccount, amount: FEE});
      AccountUpdate.fundNewAccount(deployerAccount);
    });
    await adminTxn.prove();
    await adminTxn.sign([deployerKey]).send();

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new KnownoknownCommitment(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    const txn_send = await txn.sign([deployerKey, zkAppPrivateKey]).send();
    if (txn_send.status === 'pending') {
        console.log('Transaction accepted for processing by the Mina daemon.');
        try {
          await txn_send.wait();
          console.log('Transaction successfully included in a block.');
        } catch (error) {
          console.error('Transaction was rejected or failed to be included in a block:', error);
        }
      } else {
        console.error('Transaction was not accepted for processing by the Mina daemon.');
      }
  }

  it('generates and deploys the `KnownoknownCommitment` smart contract', async () => {
    await localDeploy();
    const knowledgeEntryMerkleRoot = zkApp.knowledgeEntryMerkleRoot.get();
    expect(knowledgeEntryMerkleRoot).toEqual(Field(0));
  });

  // it('test contract admin', async () => {
  //   await localDeploy();
  //   // update transaction
  //   const txn = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveContractAdmin();
  //   });
  //   await txn.prove();
  //   await txn.sign([adminKey]).send();
  // });

  // it('prove enable test', async () => {
  //   await localDeploy();
  //   const dagRoot = DAGProver.getEmptyTreeRoot();
  //   // update transaction
  //   console.log("--------------- initApplicationEntryMerkleRoot Begin ---------------");
  //   const txn = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.initApplicationEntryMerkleRoot(dagRoot);
  //   });
  //   const start_1 = performance.now();
  //   await txn.prove();
  //   const end_1 = performance.now();
  //   console.log(`initApplicationEntryMerkleRoot time: ${end_1 - start_1}ms`);
  //   await txn.sign([adminKey]).send();
  //   const updatedApplicationEntryCidHash = zkApp.applicationEntryMerkleRoot.get();
  //   expect(updatedApplicationEntryCidHash).toEqual(dagRoot);
  //   console.log("--------------- initApplicationEntryMerkleRoot End ---------------");

  //   console.log("--------------- submitApplicationPublish_1 Begin ---------------");
  //   const testCid = CID.parse("bafkreiadvrtuefxt4fohmhxbuxrfl4dhsu3chsftrc2elhqt7f4npscg6q");
  //   const testDagCid = DAGCid.parseCID(testCid);

  //   const txn_2 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitApplicationPublish(testDagCid.toHash());
  //   });
  //   const start_2 = performance.now();
  //   await txn_2.prove();
  //   const end_2 = performance.now();
  //   console.log(`submitApplicationPublish time: ${end_2 - start_2}ms`);
  //   await txn_2.sign([senderKey]).send();
  //   console.log("--------------- submitApplicationPublish_1 End ---------------");

  //   console.log("--------------- proveApplicationPublish_1 Begin ---------------");
  //   const dagProver_1 = DAGProver.structProver([], 0, testDagCid);
  //   const offStart_1 = performance.now();
  //   const newDagRoot_1 = dagProver_1.proveDagPublic(testDagCid.toHash(), dagRoot);
  //   const offEnd_1 = performance.now();
  //   console.log(`offchain proveDagPublic time: ${offEnd_1 - offStart_1}ms`);
  //   const txn_3 = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveApplicationPublish(dagProver_1);
  //   });
  //   const start_3 = performance.now();
  //   await txn_3.prove();
  //   const end_3 = performance.now();
  //   console.log(`proveApplicationPublish time: ${end_3 - start_3}ms`);
  //   await txn_3.sign([adminKey]).send();
  //   expect(zkApp.applicationEntryMerkleRoot.get()).toEqual(newDagRoot_1);
  //   console.log("--------------- proveApplicationPublish_1 End ---------------");

  //   console.log("--------------- submitApplicationUpdate_1 Begin ---------------");
  //   const testCid_2 = CID.parse("bafyreiam22nvyixmudlem4dcmh2krnx4tnnobdxe6lpqdmpvfd2ozn74pq");
  //   const testDagCid_2 = DAGCid.parseCID(testCid_2);
  //   const txn_4 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitApplicationUpdate(testDagCid.toHash(), testDagCid_2.toHash());
  //   });
  //   const start_4 = performance.now();
  //   await txn_4.prove();
  //   const end_4 = performance.now();
  //   console.log(`submitApplicationUpdate time: ${end_4 - start_4}ms`);
  //   await txn_4.sign([senderKey]).send();
  //   console.log("--------------- submitApplicationUpdate_1 End ---------------");

  //   console.log("--------------- proveApplicationUpdate_1 Begin ---------------");
  //   const dagProver_2 = DAGProver.structProver([DAGCid.parseCID(testCid)], 0, testDagCid_2);
  //   const txn_5 = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveApplicationUpdate(dagProver_2);
  //   });
  //   const start_5 = performance.now();
  //   await txn_5.prove();
  //   const end_5 = performance.now();
  //   console.log(`proveApplicationUpdate time: ${end_5 - start_5}ms`);
  //   await txn_5.sign([adminKey]).send();
  //   const offStart_5 = performance.now();
  //   const newDagRoot_2 = dagProver_2.proveDagUpdate(DAGCid.parseCID(testCid).toHash(), testDagCid_2.toHash(), newDagRoot_1);
  //   const offEnd_5 = performance.now();
  //   console.log(`offchain proveDagUpdate time: ${offEnd_5 - offStart_5}ms`);
  //   expect(zkApp.applicationEntryMerkleRoot.get()).toEqual(newDagRoot_2);
  //   console.log("--------------- proveApplicationUpdate_1 End ---------------");
  // })

  // it('full test of knownoknowncommitment, including init, submit and prove of publish and update for application', async () => {
  //   await localDeploy();
  //   const dagRoot = DAGProver.getEmptyTreeRoot();
  //   // update transaction
  //   console.log("--------------- initApplicationEntryMerkleRoot Begin ---------------");
  //   const txn = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.initApplicationEntryMerkleRoot(dagRoot);
  //   });
  //   const start_1 = performance.now();
  //   await txn.prove();
  //   const end_1 = performance.now();
  //   console.log(`initApplicationEntryMerkleRoot time: ${end_1 - start_1}ms`);
  //   await txn.sign([adminKey]).send();
  //   const updatedApplicationEntryCidHash = zkApp.applicationEntryMerkleRoot.get();
  //   expect(updatedApplicationEntryCidHash).toEqual(dagRoot);
  //   console.log("--------------- initApplicationEntryMerkleRoot End ---------------");

  //   console.log("--------------- submitApplicationPublish_1 Begin ---------------");
  //   const testCid = CID.parse("bafkreiadvrtuefxt4fohmhxbuxrfl4dhsu3chsftrc2elhqt7f4npscg6q");
  //   const testDagCid = DAGCid.parseCID(testCid);

  //   const txn_2 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitApplicationPublish(testDagCid.toHash());
  //   });
  //   const start_2 = performance.now();
  //   await txn_2.prove();
  //   const end_2 = performance.now();
  //   console.log(`submitApplicationPublish time: ${end_2 - start_2}ms`);
  //   await txn_2.sign([senderKey]).send();
  //   console.log("--------------- submitApplicationPublish_1 End ---------------");

  //   console.log("--------------- proveApplicationPublish_1 Begin ---------------");
  //   const dagProver_1 = DAGProver.structProver([], 0, testDagCid);
  //   const offStart_1 = performance.now();
  //   const newDagRoot_1 = dagProver_1.proveDagPublic(testDagCid.toHash(), dagRoot);
  //   const offEnd_1 = performance.now();
  //   console.log(`offchain proveDagPublic time: ${offEnd_1 - offStart_1}ms`);
  //   const txn_3 = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveApplicationPublish(dagProver_1);
  //   });
  //   const start_3 = performance.now();
  //   await txn_3.prove();
  //   const end_3 = performance.now();
  //   console.log(`proveApplicationPublish time: ${end_3 - start_3}ms`);
  //   await txn_3.sign([adminKey]).send();
  //   expect(zkApp.applicationEntryMerkleRoot.get()).toEqual(newDagRoot_1);
  //   console.log("--------------- proveApplicationPublish_1 End ---------------");

  //   console.log("--------------- submitApplicationPublish_2 Begin ---------------");
  //   const testCid_2 = CID.parse("bafyreiam22nvyixmudlem4dcmh2krnx4tnnobdxe6lpqdmpvfd2ozn74pq");
  //   const testDagCid_2 = DAGCid.parseCID(testCid_2);

  //   const txn_4 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitApplicationPublish(testDagCid_2.toHash());
  //   });
  //   const start_4 = performance.now();
  //   await txn_4.prove();
  //   const end_4 = performance.now();
  //   console.log(`submitApplicationPublish time: ${end_4 - start_4}ms`);
  //   await txn_4.sign([senderKey]).send();
  //   console.log("--------------- submitApplicationPublish_2 End ---------------");

  //   console.log("--------------- proveApplicationPublish_2 Begin ---------------");
  //   const dagProver_2 = DAGProver.structProver([DAGCid.parseCID(testCid)], 1, testDagCid_2);
  //   const offStart_2 = performance.now();
  //   const newDagRoot_2 = dagProver_2.proveDagPublic(testDagCid_2.toHash(), newDagRoot_1);
  //   const offEnd_2 = performance.now();
  //   console.log(`offchain proveDagPublic time: ${offEnd_2 - offStart_2}ms`);
  //   const txn_5 = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveApplicationPublish(dagProver_2);
  //   });
  //   const start_5 = performance.now();
  //   await txn_5.prove();
  //   const end_5 = performance.now();
  //   console.log(`proveApplicationPublish time: ${end_5 - start_5}ms`);
  //   await txn_5.sign([adminKey]).send();
  //   expect(zkApp.applicationEntryMerkleRoot.get()).toEqual(newDagRoot_2);
  //   console.log("--------------- proveApplicationPublish_2 End ---------------");

  //   console.log("--------------- submitApplicationPublish_3 Begin ---------------");
  //   const testCid_3 = CID.parse("bafyreidwx2fvfdiaox32v2mnn6sxu3j4qoxeqcuenhtgrv5qv6litfnmoe");
  //   const testDagCid_3 = DAGCid.parseCID(testCid_3);

  //   const txn_6 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitApplicationPublish(testDagCid_3.toHash());
  //   });
  //   const start_6 = performance.now();
  //   await txn_6.prove();
  //   const end_6 = performance.now();
  //   console.log(`submitApplicationPublish time: ${end_6 - start_6}ms`);
  //   await txn_6.sign([senderKey]).send();
  //   console.log("--------------- submitApplicationPublish_3 End ---------------");

  //   console.log("--------------- proveApplicationPublish_3 Begin ---------------");
  //   const dagProver_3 = DAGProver.structProver([DAGCid.parseCID(testCid), DAGCid.parseCID(testCid_2)], 2, testDagCid_3);
  //   const offStart_3 = performance.now();
  //   const newDagRoot_3 = dagProver_3.proveDagPublic(testDagCid_3.toHash(), newDagRoot_2);
  //   const offEnd_3 = performance.now();
  //   console.log(`offchain proveDagPublic time: ${offEnd_3 - offStart_3}ms`);
  //   const txn_7 = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveApplicationPublish(dagProver_3);
  //   });
  //   const start_7 = performance.now();
  //   await txn_7.prove();
  //   const end_7 = performance.now();
  //   console.log(`proveApplicationPublish time: ${end_7 - start_7}ms`);
  //   await txn_7.sign([adminKey]).send();
  //   expect(zkApp.applicationEntryMerkleRoot.get()).toEqual(newDagRoot_3);
  //   console.log("--------------- proveApplicationPublish_3 End ---------------");

  //   console.log("--------------- submitApplicationPublish_4 Begin ---------------");
  //   const testCid_4 = CID.parse("bafyreibutzc3oxmiko2caho6ympbw2q7k6ybd5ag5v3eyfg2mveo6byfci");
  //   const testDagCid_4 = DAGCid.parseCID(testCid_4);

  //   const txn_8 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitApplicationPublish(testDagCid_4.toHash());
  //   });
  //   const start_8 = performance.now();
  //   await txn_8.prove();
  //   const end_8 = performance.now();
  //   console.log(`submitApplicationPublish time: ${end_8 - start_8}ms`);
  //   await txn_8.sign([senderKey]).send();
  //   console.log("--------------- submitApplicationPublish_4 End ---------------");

  //   console.log("--------------- proveApplicationPublish_4 Begin ---------------");
  //   const dagProver_4 = DAGProver.structProver([DAGCid.parseCID(testCid), DAGCid.parseCID(testCid_3), DAGCid.parseCID(testCid_2)], 3, testDagCid_4);
  //   try {
  //     const txn_9 = await Mina.transaction(adminAccount, async () => {
  //       await zkApp.proveApplicationPublish(dagProver_4);
  //     });
  //     const start_9 = performance.now();
  //     await txn_9.prove();
  //     const end_9 = performance.now();
  //     console.log(`proveApplicationPublish time: ${end_9 - start_9}ms`);
  //     await txn_9.sign([adminKey]).send();
  //     const offStart_4 = performance.now();
  //     const newDagRoot_4 = dagProver_4.proveDagPublic(testDagCid_4.toHash(), newDagRoot_3);
  //     const offEnd_4 = performance.now();
  //     console.log(`offchain proveDagPublic time: ${offEnd_4 - offStart_4}ms`);
  //     expect(zkApp.applicationEntryMerkleRoot.get()).toEqual(newDagRoot_4);
  //   } catch (error) {
  //     console.log(error);
  //     console.log("--------------- resetApplicationPublish_1 Begin ---------------");
  //     const txn_9 = await Mina.transaction(adminAccount, async () => {
  //       await zkApp.resetApplicationPublish();
  //     });
  //     const start_9 = performance.now();
  //     await txn_9.prove();
  //     const end_9 = performance.now();
  //     console.log(`proveApplicationPublish time: ${end_9 - start_9}ms`);
  //     await txn_9.sign([adminKey]).send();
  //     expect(zkApp.publishApplicationCidHash.get()).toEqual(Field(0));
  //     console.log("--------------- resetApplicationPublish_1 End ---------------");
  //   }
  //   console.log("--------------- proveApplicationPublish_4 End ---------------");

  //   console.log("--------------- submitApplicationUpdate_1 Begin ---------------");
  //   const txn_9 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitApplicationUpdate(testDagCid.toHash(), testDagCid_2.toHash());
  //   });
  //   const start_9 = performance.now();
  //   await txn_9.prove();
  //   const end_9 = performance.now();
  //   console.log(`submitApplicationUpdate time: ${end_9 - start_9}ms`);
  //   await txn_9.sign([senderKey]).send();
  //   console.log("--------------- submitApplicationUpdate_1 End ---------------");

  //   console.log("--------------- proveApplicationUpdate_1 Begin ---------------");
  //   const dagProver_5 = DAGProver.structProver([DAGCid.parseCID(testCid), DAGCid.parseCID(testCid_2), DAGCid.parseCID(testCid_3)], 0, testDagCid_2);
  //   const txn_10 = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveApplicationUpdate(dagProver_5);
  //   });
  //   const start_10 = performance.now();
  //   await txn_10.prove();
  //   const end_10 = performance.now();
  //   console.log(`proveApplicationUpdate time: ${end_10 - start_10}ms`);
  //   await txn_10.sign([adminKey]).send();
  //   const offStart_5 = performance.now();
  //   const newDagRoot_5 = dagProver_5.proveDagUpdate(DAGCid.parseCID(testCid).toHash(), testDagCid_2.toHash(), newDagRoot_3);
  //   const offEnd_5 = performance.now();
  //   console.log(`offchain proveDagUpdate time: ${offEnd_5 - offStart_5}ms`);
  //   expect(zkApp.applicationEntryMerkleRoot.get()).toEqual(newDagRoot_5);
  //   console.log("--------------- proveApplicationUpdate_1 End ---------------");

  //   console.log("--------------- submitApplicationUpdate_2 Begin ---------------");
  //   const txn_11 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitApplicationUpdate(testDagCid_3.toHash(), testDagCid.toHash());
  //   });
  //   const start_11 = performance.now();
  //   await txn_11.prove();
  //   const end_11 = performance.now();
  //   console.log(`submitApplicationUpdate time: ${end_11 - start_11}ms`);
  //   await txn_11.sign([senderKey]).send();
  //   console.log("--------------- submitApplicationUpdate_2 End ---------------");

  //   console.log("--------------- resetApplicationUpdate_1 Begin ---------------");
  //   try {
  //     const txn_9 = await Mina.transaction(senderAccount, async () => {
  //       await zkApp.resetApplicationUpdate();
  //     });
  //     const start_9 = performance.now();
  //     await txn_9.prove();
  //     const end_9 = performance.now();
  //     console.log(`proveApplicationUpdate time: ${end_9 - start_9}ms`);
  //     await txn_9.sign([senderKey]).send();
  //     expect(zkApp.updateFromApplicationCidHash.get()).toEqual(Field(0));
  //     expect(zkApp.updateToApplicationCidHash.get()).toEqual(Field(0));
  //     console.log("--------------- resetApplicationUpdate_1 End ---------------");
  //   } catch (error) {
  //     console.log(error);
  //     console.log("only admin can resetApplicationUpdate");
  //   }

  //   console.log("--------------- proveApplicationUpdate_2 Begin ---------------");
  //   const dagProver_6 = DAGProver.structProver([DAGCid.parseCID(testCid_2), DAGCid.parseCID(testCid_2), DAGCid.parseCID(testCid_3)], 2, testDagCid);
  //   const txn_12 = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveApplicationUpdate(dagProver_6);
  //   });
  //   const start_12 = performance.now();
  //   await txn_12.prove();
  //   const end_12 = performance.now();
  //   console.log(`proveApplicationUpdate time: ${end_12 - start_12}ms`);
  //   await txn_12.sign([adminKey]).send();
  //   const offStart_6 = performance.now();
  //   const newDagRoot_6 = dagProver_6.proveDagUpdate(DAGCid.parseCID(testCid_3).toHash(), testDagCid.toHash(), newDagRoot_5);
  //   const offEnd_6 = performance.now();
  //   console.log(`offchain proveDagUpdate time: ${offEnd_6 - offStart_6}ms`);
  //   expect(zkApp.applicationEntryMerkleRoot.get()).toEqual(newDagRoot_6);
  //   console.log("--------------- proveApplicationUpdate_2 End ---------------");
  // });

  // it('full test of knownoknowncommitment, including init, submit and prove of publish and update for knowledge', async () => {
  //   await localDeploy();
  //   const dagRoot = DAGProver.getEmptyTreeRoot();
  //   // update transaction
  //   console.log("--------------- initKnowledgeEntryMerkleRoot Begin ---------------");
  //   const txn = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.initKnowledgeEntryMerkleRoot(dagRoot);
  //   });
  //   const start_1 = performance.now();
  //   await txn.prove();
  //   const end_1 = performance.now();
  //   console.log(`initKnowledgeEntryMerkleRoot time: ${end_1 - start_1}ms`);
  //   await txn.sign([adminKey]).send();
  //   const updatedKnowledgeEntryCidHash = zkApp.knowledgeEntryMerkleRoot.get();
  //   expect(updatedKnowledgeEntryCidHash).toEqual(dagRoot);
  //   console.log("--------------- initKnowledgeEntryMerkleRoot End ---------------");

  //   console.log("--------------- submitKnowledgePublish_1 Begin ---------------");
  //   const testCid = CID.parse("bafkreiadvrtuefxt4fohmhxbuxrfl4dhsu3chsftrc2elhqt7f4npscg6q");
  //   const testDagCid = DAGCid.parseCID(testCid);

  //   const txn_2 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitKnowledgePublish(testDagCid.toHash());
  //   });
  //   const start_2 = performance.now();
  //   await txn_2.prove();
  //   const end_2 = performance.now();
  //   console.log(`submitKnowledgePublish time: ${end_2 - start_2}ms`);
  //   await txn_2.sign([senderKey]).send();
  //   console.log("--------------- submitKnowledgePublish_1 End ---------------");

  //   console.log("--------------- proveKnowledgePublish_1 Begin ---------------");
  //   const dagProver_1 = DAGProver.structProver([], 0, testDagCid);
  //   const offStart_1 = performance.now();
  //   const newDagRoot_1 = dagProver_1.proveDagPublic(testDagCid.toHash(), dagRoot);
  //   const offEnd_1 = performance.now();
  //   console.log(`offchain proveDagPublic time: ${offEnd_1 - offStart_1}ms`);
  //   const txn_3 = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveKnowledgePublish(dagProver_1);
  //   });
  //   const start_3 = performance.now();
  //   await txn_3.prove();
  //   const end_3 = performance.now();
  //   console.log(`proveKnowledgePublish time: ${end_3 - start_3}ms`);
  //   await txn_3.sign([adminKey]).send();
  //   expect(zkApp.knowledgeEntryMerkleRoot.get()).toEqual(newDagRoot_1);
  //   console.log("--------------- proveKnowledgePublish_1 End ---------------");

  //   console.log("--------------- submitKnowledgePublish_2 Begin ---------------");
  //   const testCid_2 = CID.parse("bafyreiam22nvyixmudlem4dcmh2krnx4tnnobdxe6lpqdmpvfd2ozn74pq");
  //   const testDagCid_2 = DAGCid.parseCID(testCid_2);

  //   const txn_4 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitKnowledgePublish(testDagCid_2.toHash());
  //   });
  //   const start_4 = performance.now();
  //   await txn_4.prove();
  //   const end_4 = performance.now();
  //   console.log(`submitKnowledgePublish time: ${end_4 - start_4}ms`);
  //   await txn_4.sign([senderKey]).send();
  //   console.log("--------------- submitKnowledgePublish_2 End ---------------");

  //   console.log("--------------- proveKnowledgePublish_2 Begin ---------------");
  //   const dagProver_2 = DAGProver.structProver([DAGCid.parseCID(testCid)], 1, testDagCid_2);
  //   const offStart_2 = performance.now();
  //   const newDagRoot_2 = dagProver_2.proveDagPublic(testDagCid_2.toHash(), newDagRoot_1);
  //   const offEnd_2 = performance.now();
  //   console.log(`offchain proveDagPublic time: ${offEnd_2 - offStart_2}ms`);
  //   const txn_5 = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveKnowledgePublish(dagProver_2);
  //   });
  //   const start_5 = performance.now();
  //   await txn_5.prove();
  //   const end_5 = performance.now();
  //   console.log(`proveKnowledgePublish time: ${end_5 - start_5}ms`);
  //   await txn_5.sign([adminKey]).send();
  //   expect(zkApp.knowledgeEntryMerkleRoot.get()).toEqual(newDagRoot_2);
  //   console.log("--------------- proveKnowledgePublish_2 End ---------------");

  //   console.log("--------------- submitKnowledgePublish_3 Begin ---------------");
  //   const testCid_3 = CID.parse("bafyreidwx2fvfdiaox32v2mnn6sxu3j4qoxeqcuenhtgrv5qv6litfnmoe");
  //   const testDagCid_3 = DAGCid.parseCID(testCid_3);

  //   const txn_6 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitKnowledgePublish(testDagCid_3.toHash());
  //   });
  //   const start_6 = performance.now();
  //   await txn_6.prove();
  //   const end_6 = performance.now();
  //   console.log(`submitKnowledgePublish time: ${end_6 - start_6}ms`);
  //   await txn_6.sign([senderKey]).send();
  //   console.log("--------------- submitKnowledgePublish_3 End ---------------");

  //   console.log("--------------- proveKnowledgePublish_3 Begin ---------------");
  //   const dagProver_3 = DAGProver.structProver([DAGCid.parseCID(testCid), DAGCid.parseCID(testCid_2)], 2, testDagCid_3);
  //   const offStart_3 = performance.now();
  //   const newDagRoot_3 = dagProver_3.proveDagPublic(testDagCid_3.toHash(), newDagRoot_2);
  //   const offEnd_3 = performance.now();
  //   console.log(`offchain proveDagPublic time: ${offEnd_3 - offStart_3}ms`);
  //   const txn_7 = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveKnowledgePublish(dagProver_3);
  //   });
  //   const start_7 = performance.now();
  //   await txn_7.prove();
  //   const end_7 = performance.now();
  //   console.log(`proveKnowledgePublish time: ${end_7 - start_7}ms`);
  //   await txn_7.sign([adminKey]).send();
  //   expect(zkApp.knowledgeEntryMerkleRoot.get()).toEqual(newDagRoot_3);
  //   console.log("--------------- proveKnowledgePublish_3 End ---------------");

  //   console.log("--------------- submitKnowledgePublish_4 Begin ---------------");
  //   const testCid_4 = CID.parse("bafyreibutzc3oxmiko2caho6ympbw2q7k6ybd5ag5v3eyfg2mveo6byfci");
  //   const testDagCid_4 = DAGCid.parseCID(testCid_4);

  //   const txn_8 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitKnowledgePublish(testDagCid_4.toHash());
  //   });
  //   const start_8 = performance.now();
  //   await txn_8.prove();
  //   const end_8 = performance.now();
  //   console.log(`submitKnowledgePublish time: ${end_8 - start_8}ms`);
  //   await txn_8.sign([senderKey]).send();
  //   console.log("--------------- submitKnowledgePublish_4 End ---------------");

  //   console.log("--------------- proveKnowledgePublish_4 Begin ---------------");
  //   const dagProver_4 = DAGProver.structProver([DAGCid.parseCID(testCid), DAGCid.parseCID(testCid_3), DAGCid.parseCID(testCid_2)], 3, testDagCid_4);
  //   try {
  //     const txn_9 = await Mina.transaction(adminAccount, async () => {
  //       await zkApp.proveKnowledgePublish(dagProver_4);
  //     });
  //     const start_9 = performance.now();
  //     await txn_9.prove();
  //     const end_9 = performance.now();
  //     console.log(`proveKnowledgePublish time: ${end_9 - start_9}ms`);
  //     await txn_9.sign([adminKey]).send();
  //     const offStart_4 = performance.now();
  //     const newDagRoot_4 = dagProver_4.proveDagPublic(testDagCid_4.toHash(), newDagRoot_3);
  //     const offEnd_4 = performance.now();
  //     console.log(`offchain proveDagPublic time: ${offEnd_4 - offStart_4}ms`);
  //     expect(zkApp.knowledgeEntryMerkleRoot.get()).toEqual(newDagRoot_4);
  //   } catch (error) {
  //     console.log(error);
  //     console.log("--------------- resetKnowledgePublish_1 Begin ---------------");
  //     const txn_9 = await Mina.transaction(adminAccount, async () => {
  //       await zkApp.resetKnowledgePublish();
  //     });
  //     const start_9 = performance.now();
  //     await txn_9.prove();
  //     const end_9 = performance.now();
  //     console.log(`proveKnowledgePublish time: ${end_9 - start_9}ms`);
  //     await txn_9.sign([adminKey]).send();
  //     expect(zkApp.publishKnowledgeCidHash.get()).toEqual(Field(0));
  //     console.log("--------------- resetKnowledgePublish_1 End ---------------");
  //   }
  //   console.log("--------------- proveKnowledgePublish_4 End ---------------");

  //   console.log("--------------- submitKnowledgeUpdate_1 Begin ---------------");
  //   const txn_9 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitKnowledgeUpdate(testDagCid.toHash(), testDagCid_2.toHash());
  //   });
  //   const start_9 = performance.now();
  //   await txn_9.prove();
  //   const end_9 = performance.now();
  //   console.log(`submitKnowledgeUpdate time: ${end_9 - start_9}ms`);
  //   await txn_9.sign([senderKey]).send();
  //   console.log("--------------- submitKnowledgeUpdate_1 End ---------------");

  //   console.log("--------------- proveKnowledgeUpdate_1 Begin ---------------");
  //   const dagProver_5 = DAGProver.structProver([DAGCid.parseCID(testCid), DAGCid.parseCID(testCid_2), DAGCid.parseCID(testCid_3)], 0, testDagCid_2);
  //   const txn_10 = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveKnowledgeUpdate(dagProver_5);
  //   });
  //   const start_10 = performance.now();
  //   await txn_10.prove();
  //   const end_10 = performance.now();
  //   console.log(`proveKnowledgeUpdate time: ${end_10 - start_10}ms`);
  //   await txn_10.sign([adminKey]).send();
  //   const offStart_5 = performance.now();
  //   const newDagRoot_5 = dagProver_5.proveDagUpdate(DAGCid.parseCID(testCid).toHash(), testDagCid_2.toHash(), newDagRoot_3);
  //   const offEnd_5 = performance.now();
  //   console.log(`offchain proveDagUpdate time: ${offEnd_5 - offStart_5}ms`);
  //   expect(zkApp.knowledgeEntryMerkleRoot.get()).toEqual(newDagRoot_5);
  //   console.log("--------------- proveKnowledgeUpdate_1 End ---------------");

  //   console.log("--------------- submitKnowledgeUpdate_2 Begin ---------------");
  //   const txn_11 = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.submitKnowledgeUpdate(testDagCid_3.toHash(), testDagCid.toHash());
  //   });
  //   const start_11 = performance.now();
  //   await txn_11.prove();
  //   const end_11 = performance.now();
  //   console.log(`submitKnowledgeUpdate time: ${end_11 - start_11}ms`);
  //   await txn_11.sign([senderKey]).send();
  //   console.log("--------------- submitKnowledgeUpdate_2 End ---------------");

  //   console.log("--------------- resetKnowledgeUpdate_1 Begin ---------------");
  //   try {
  //     const txn_9 = await Mina.transaction(senderAccount, async () => {
  //       await zkApp.resetKnowledgeUpdate();
  //     });
  //     const start_9 = performance.now();
  //     await txn_9.prove();
  //     const end_9 = performance.now();
  //     console.log(`proveKnowledgePublish time: ${end_9 - start_9}ms`);
  //     await txn_9.sign([senderKey]).send();
  //     expect(zkApp.updateFromKnowledgeCidHash.get()).toEqual(Field(0));
  //     expect(zkApp.updateToKnowledgeCidHash.get()).toEqual(Field(0));
  //     console.log("--------------- resetKnowledgeUpdate_1 End ---------------");
  //   } catch (error) {
  //     console.log(error);
  //     console.log("only admin can resetKnowledgeUpdate");
  //   }

  //   console.log("--------------- proveKnowledgeUpdate_2 Begin ---------------");
  //   const dagProver_6 = DAGProver.structProver([DAGCid.parseCID(testCid_2), DAGCid.parseCID(testCid_2), DAGCid.parseCID(testCid_3)], 2, testDagCid);
  //   const txn_12 = await Mina.transaction(adminAccount, async () => {
  //     await zkApp.proveKnowledgeUpdate(dagProver_6);
  //   });
  //   const start_12 = performance.now();
  //   await txn_12.prove();
  //   const end_12 = performance.now();
  //   console.log(`proveKnowledgeUpdate time: ${end_12 - start_12}ms`);
  //   await txn_12.sign([adminKey]).send();
  //   const offStart_6 = performance.now();
  //   const newDagRoot_6 = dagProver_6.proveDagUpdate(DAGCid.parseCID(testCid_3).toHash(), testDagCid.toHash(), newDagRoot_5);
  //   const offEnd_6 = performance.now();
  //   console.log(`offchain proveDagUpdate time: ${offEnd_6 - offStart_6}ms`);
  //   expect(zkApp.knowledgeEntryMerkleRoot.get()).toEqual(newDagRoot_6);
  //   console.log("--------------- proveKnowledgeUpdate_2 End ---------------");
  // });

  
});
