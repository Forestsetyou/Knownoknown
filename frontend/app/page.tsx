'use client';
import Head from 'next/head.js';
import Image from 'next/image.js';
import {useCallback, useEffect, useRef, useState} from 'react';
import GradientBG from '../components/GradientBG.js';
import styles from '../styles/Home.module.css';
import heroMinaLogo from '../public/assets/hero-mina-logo.svg';
import arrowRightSmall from '../public/assets/arrow-right-small.svg';
import {fetchAccount, Mina, PublicKey, PrivateKey, AccountUpdate, Field} from "o1js";
import { KnownoknownContract, DAGProver, DAGCid } from 'knownoknown-contract';
import { CID } from 'multiformats/cid';

// We've already deployed the Add contract on testnet at this address
// https://minascan.io/devnet/account/B62qnTDEeYtBHBePA4yhCt4TCgDtA4L2CGvK7PirbJyX4pKH8bmtWe5
const zkAppAddress = "B62qnTDEeYtBHBePA4yhCt4TCgDtA4L2CGvK7PirbJyX4pKH8bmtWe5";

export default function Home() {
  const zkApp = useRef<KnownoknownContract>(new KnownoknownContract(PublicKey.fromBase58(zkAppAddress)));

  const [transactionLink, setTransactionLink] = useState<string | null>(null);
  const [contractState, setContractState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // fetch the zkapp state when the page loads
  useEffect(() => {
    const setupZkApp = async () => {
      const proofsEnabled = true;
      const adminKey = PrivateKey.fromBase58("EKFQAj8PJksEZA4Rs3diU8tyAeNDXGD4YjMbpwEDPwzfCWe5CWCp");
      const adminAccount = adminKey.toPublicKey();
      console.log("start compile");
      const start_compile = performance.now();
      await KnownoknownContract.compile();
      const end_compile = performance.now();
      console.log(`compile time: ${end_compile - start_compile}ms`);
      const Local = await Mina.LocalBlockchain({ proofsEnabled: proofsEnabled });
      Mina.setActiveInstance(Local);
      let initAccount: Mina.TestPublicKey;
      let senderAccount: Mina.TestPublicKey;
      [initAccount, senderAccount] = Local.testAccounts;
      const deployerKey = initAccount.key;
      const senderKey = senderAccount.key;

      const adminTxn = await Mina.transaction(initAccount, async () => {
          AccountUpdate.createSigned(initAccount).send({to: adminAccount, amount: 1e11});
          AccountUpdate.fundNewAccount(initAccount);
      });
      await adminTxn.prove();
      const adminTxn_send = await adminTxn.sign([deployerKey]).send();
      const zkAppPrivateKey = PrivateKey.random();
      const zkAppAddress = zkAppPrivateKey.toPublicKey();
      const zkApp = new KnownoknownContract(zkAppAddress);
      const txn_deploy = await Mina.transaction(adminAccount, async () => {
          AccountUpdate.fundNewAccount(adminAccount);
          await zkApp.deploy();
      });
      await txn_deploy.prove();
      // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
      await txn_deploy.sign([adminKey, zkAppPrivateKey]).send();
      const knowledgeEntryMerkleRoot = zkApp.knowledgeEntryMerkleRoot.get();
      if(knowledgeEntryMerkleRoot.equals(Field(0))) {
          console.log("contract deployed");
      } else {
          console.log("contract deployment failed");
      }

      const dagRoot = DAGProver.getEmptyTreeRoot();
      // update transaction
      console.log("--------------- initApplicationEntryMerkleRoot Begin ---------------");
      const txn_initApplicationEntryMerkleRoot = await Mina.transaction(adminAccount, async () => {
      await zkApp.initApplicationEntryMerkleRoot(dagRoot);
      });
      const start_1 = performance.now();
      await txn_initApplicationEntryMerkleRoot.prove();
      const end_1 = performance.now();
      console.log(`initApplicationEntryMerkleRoot time: ${end_1 - start_1}ms`);
      await txn_initApplicationEntryMerkleRoot.sign([adminKey]).send();
      const updatedApplicationEntryCidHash = zkApp.applicationEntryMerkleRoot.get();
      if(updatedApplicationEntryCidHash.equals(dagRoot)) {
          console.log("initApplicationEntryMerkleRoot success");
      } else {
          console.log("initApplicationEntryMerkleRoot failed");
      }
      console.log("--------------- initApplicationEntryMerkleRoot End ---------------");

      console.log("--------------- submitApplicationPublish_1 Begin ---------------");
      const testCid = CID.parse("bafkreiadvrtuefxt4fohmhxbuxrfl4dhsu3chsftrc2elhqt7f4npscg6q");
      const testDagCid = DAGCid.parseCID(testCid);

      const txn_submitApplicationPublish = await Mina.transaction(senderAccount, async () => {
      await zkApp.submitApplicationPublish(testDagCid.toHash());
      });
      const start_2 = performance.now();
      await txn_submitApplicationPublish.prove();
      const end_2 = performance.now();
      console.log(`submitApplicationPublish time: ${end_2 - start_2}ms`);
      await txn_submitApplicationPublish.sign([senderKey]).send();
      console.log("--------------- submitApplicationPublish_1 End ---------------");

      console.log("--------------- proveApplicationPublish_1 Begin ---------------");
      const dagProver_1 = DAGProver.structProver([], 0, testDagCid);
      const offStart_1 = performance.now();
      const newDagRoot_1 = dagProver_1.proveDagPublic(testDagCid.toHash(), dagRoot);
      const offEnd_1 = performance.now();
      console.log(`offchain proveDagPublic time: ${offEnd_1 - offStart_1}ms`);
      const txn_proveApplicationPublish = await Mina.transaction(adminAccount, async () => {
          await zkApp.proveApplicationPublish(dagProver_1);
      });
      const start_3 = performance.now();
      await txn_proveApplicationPublish.prove();
      const end_3 = performance.now();
      console.log(`proveApplicationPublish time: ${end_3 - start_3}ms`);
      await txn_proveApplicationPublish.sign([adminKey]).send();
      if(zkApp.applicationEntryMerkleRoot.get().equals(newDagRoot_1)) {
          console.log("proveApplicationPublish success");
      } else {
          console.log("proveApplicationPublish failed");
      }
      console.log("--------------- proveApplicationPublish_1 End ---------------");

      console.log("--------------- submitApplicationUpdate_1 Begin ---------------");
      const testCid_2 = CID.parse("bafyreiam22nvyixmudlem4dcmh2krnx4tnnobdxe6lpqdmpvfd2ozn74pq");
      const testDagCid_2 = DAGCid.parseCID(testCid_2);
      const txn_submitApplicationUpdate = await Mina.transaction(senderAccount, async () => {
          await zkApp.submitApplicationUpdate(testDagCid.toHash(), testDagCid_2.toHash());
      });
      const start_4 = performance.now();
      await txn_submitApplicationUpdate.prove();
      const end_4 = performance.now();
      console.log(`submitApplicationUpdate time: ${end_4 - start_4}ms`);
      await txn_submitApplicationUpdate.sign([senderKey]).send();
      console.log("--------------- submitApplicationUpdate_1 End ---------------");

      console.log("--------------- proveApplicationUpdate_1 Begin ---------------");
      const dagProver_2 = DAGProver.structProver([DAGCid.parseCID(testCid)], 0, testDagCid_2);
      const txn_proveApplicationUpdate = await Mina.transaction(adminAccount, async () => {
          await zkApp.proveApplicationUpdate(dagProver_2);
      });
      const start_5 = performance.now();
      await txn_proveApplicationUpdate.prove();
      const end_5 = performance.now();
      console.log(`proveApplicationUpdate time: ${end_5 - start_5}ms`);
      await txn_proveApplicationUpdate.sign([adminKey]).send();
      const offStart_5 = performance.now();
      const newDagRoot_2 = dagProver_2.proveDagUpdate(DAGCid.parseCID(testCid).toHash(), testDagCid_2.toHash(), newDagRoot_1);
      const offEnd_5 = performance.now();
      console.log(`offchain proveDagUpdate time: ${offEnd_5 - offStart_5}ms`);
      if(zkApp.applicationEntryMerkleRoot.get().equals(newDagRoot_2)) {
          console.log("proveApplicationUpdate success");
      } else {
          console.log("proveApplicationUpdate failed");
      }
      console.log("--------------- proveApplicationUpdate_1 End ---------------");
      setContractState(`applicationEntryMerkleRoot: ${zkApp.applicationEntryMerkleRoot.get().toBigInt()}<br>knowledgeEntryMerkleRoot: ${zkApp.knowledgeEntryMerkleRoot.get().toBigInt()}`);
      setLoading(false);
    }
    console.log("start setupZkApp");
    setupZkApp();
  }, []);

  // const updateZkApp = useCallback(async () => {
  //   setTransactionLink(null);
  //   setLoading(true);

  //   try {
  //     // Retrieve Mina provider injected by browser extension wallet
  //     const mina = (window as any).mina;
  //     const walletKey: string = (await mina.requestAccounts())[0];
  //     console.log("Connected wallet address: " + walletKey);
  //     await fetchAccount({publicKey: PublicKey.fromBase58(walletKey)});

  //     // Execute a transaction locally on the browser
  //     const transaction = await Mina.transaction(async () => {
  //       console.log("Executing Add.update() locally");
  //       await zkApp.current.update();
  //     });

  //     // Prove execution of the contract using the proving key
  //     console.log("Proving execution of Add.update()");
  //     await transaction.prove();

  //     // Broadcast the transaction to the Mina network
  //     console.log("Broadcasting proof of execution to the Mina network");
  //     const {hash} = await mina.sendTransaction({transaction: transaction.toJSON()});

  //     // display the link to the transaction
  //     const transactionLink = "https://minascan.io/devnet/tx/" + hash;
  //     setTransactionLink(transactionLink);
  //   } catch (e: any) {
  //     console.error(e.message);
  //     let errorMessage = "";

  //     if (e.message.includes("Cannot read properties of undefined (reading 'requestAccounts')")) {
  //       errorMessage = "Is Auro installed?";
  //     } else if (e.message.includes("Please create or restore wallet first.")) {
  //       errorMessage = "Have you created a wallet?";
  //     } else if (e.message.includes("User rejected the request.")) {
  //       errorMessage = "Did you grant the app permission to connect?";
  //     } else {
  //       errorMessage = "An unknown error occurred.";
  //     }
  //     setError(errorMessage);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);

  return (
    <>
      <Head>
        <title>Mina zkApp UI</title>
        <meta name="description" content="built with o1js"/>
        <link rel="icon" href="/assets/favicon.ico"/>
      </Head>
      <GradientBG>
        <main className={styles.main}>
          <div className={styles.center}>
            <a
              href="https://minaprotocol.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                className={styles.logo}
                src={heroMinaLogo}
                alt="Mina Logo"
                width="191"
                height="174"
                priority
              />
            </a>
            <p className={styles.tagline}>
              built with
              <code className={styles.code}> o1js</code>
            </p>
          </div>
          <p className={styles.start}>
            Get started by editing
            <code className={styles.code}> app/page.tsx</code>
          </p>
          <div className={styles.state}>
            <div>
              <div>Contract State: <span className={styles.bold}>{contractState}</span></div>
              {error ? (
                <span className={styles.error}>Error: {error}</span>
              ) : (loading ?
                <div>Loading...</div> :
                (transactionLink ?
                  <a href={transactionLink} className={styles.bold} target="_blank" rel="noopener noreferrer">
                    View Transaction on MinaScan
                  </a> :
                  <button onClick={() => {}} className={styles.button}>Call Add.update()</button>))}
            </div>
          </div>
          <div className={styles.grid}>
            <a
              href="https://docs.minaprotocol.com/zkapps"
              className={styles.card}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>
                <span>DOCS</span>
                <div>
                  <Image
                    src={arrowRightSmall}
                    alt="Mina Logo"
                    width={16}
                    height={16}
                    priority
                  />
                </div>
              </h2>
              <p>Explore zkApps, how to build one, and in-depth references</p>
            </a>
            <a
              href="https://docs.minaprotocol.com/zkapps/tutorials/hello-world"
              className={styles.card}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>
                <span>TUTORIALS</span>
                <div>
                  <Image
                    src={arrowRightSmall}
                    alt="Mina Logo"
                    width={16}
                    height={16}
                    priority
                  />
                </div>
              </h2>
              <p>Learn with step-by-step o1js tutorials</p>
            </a>
            <a
              href="https://discord.gg/minaprotocol"
              className={styles.card}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>
                <span>QUESTIONS</span>
                <div>
                  <Image
                    src={arrowRightSmall}
                    alt="Mina Logo"
                    width={16}
                    height={16}
                    priority
                  />
                </div>
              </h2>
              <p>Ask questions on our Discord server</p>
            </a>
            <a
              href="https://docs.minaprotocol.com/zkapps/how-to-deploy-a-zkapp"
              className={styles.card}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>
                <span>DEPLOY</span>
                <div>
                  <Image
                    src={arrowRightSmall}
                    alt="Mina Logo"
                    width={16}
                    height={16}
                    priority
                  />
                </div>
              </h2>
              <p>Deploy a zkApp to Testnet</p>
            </a>
          </div>
        </main>
      </GradientBG>
    </>
  );
}
