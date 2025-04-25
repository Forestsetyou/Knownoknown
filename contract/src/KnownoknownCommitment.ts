import {
  Field,
  SmartContract,
  state,
  State,
  method,
  Provable,
  assert,
  PublicKey,
} from 'o1js';
import { DAGCid, DAGProver } from './DAGProver.js';

// 定义合约状态
export class KnownoknownCommitment extends SmartContract {
  // 链上状态
  // commitment 通过 merkle tree 生成
  @state(Field) knowledgeEntryMerkleRoot = State<Field>(); // 完整知识存储的 merkle dag 的 cid 的 Poseidon hash
  @state(Field) publishKnowledgeCidHash = State<Field>();    // 希望发布的知识 merkle dag 的 cid 的 Poseidon hash
  @state(Field) updateFromKnowledgeCidHash = State<Field>();    // 希望被更新的知识 merkle dag 的 cid 的 Poseidon hash
  @state(Field) updateToKnowledgeCidHash = State<Field>();    // 希望更新到的知识 merkle dag 的 cid 的 Poseidon hash

  @state(Field) applicationEntryMerkleRoot = State<Field>();    // 完整申请存储的 merkle dag 的 cid 的 Poseidon hash
  @state(Field) publishApplicationCidHash = State<Field>();    // 希望发布的申请 merkle dag 的 cid 的 Poseidon hash
  @state(Field) updateFromApplicationCidHash = State<Field>();    // 希望被更新的申请 merkle dag 的 cid 的 Poseidon hash
  @state(Field) updateToApplicationCidHash = State<Field>();    // 希望更新到的申请 merkle dag 的 cid 的 Poseidon hash
  AdminAddr = PublicKey.fromBase58("B62qnKaJUZLQPcvN1PTqzSFkpMS5VtoXCya6AgxWwhPZVQWf5DxRhi8");

  // 初始化合约
  init() {
    super.init();
    // 初始化状态
    this.knowledgeEntryMerkleRoot.set(Field(0));
    this.publishKnowledgeCidHash.set(Field(0));
    this.updateFromKnowledgeCidHash.set(Field(0));
    this.updateToKnowledgeCidHash.set(Field(0));
    this.applicationEntryMerkleRoot.set(Field(0));
    this.publishApplicationCidHash.set(Field(0));
    this.updateFromApplicationCidHash.set(Field(0));
    this.updateToApplicationCidHash.set(Field(0));
  }

  @method async initKnowledgeEntryMerkleRoot(knowledgeEntryMerkleRoot: Field): Promise<void> {
    const sender = this.sender.getAndRequireSignature();
    this.AdminAddr.assertEquals(sender);
    const currentKnowledgeEntryMerkleRoot = this.knowledgeEntryMerkleRoot.getAndRequireEquals();
    assert(currentKnowledgeEntryMerkleRoot.equals(Field(0)), "knowledgeEntryMerkleRoot init can only be called once");
    this.knowledgeEntryMerkleRoot.set(knowledgeEntryMerkleRoot);
  }
  
  @method async submitKnowledgePublish(newPublishKnowledgeCidHash: Field): Promise<void> {
    const publishKnowledgeCidHash = this.publishKnowledgeCidHash.getAndRequireEquals();
    assert(publishKnowledgeCidHash.equals(Field(0)), "submitKnowledgePublish can only be called without other publish submit");
    this.publishKnowledgeCidHash.set(newPublishKnowledgeCidHash);
  }
  
  @method async submitKnowledgeUpdate(newUpdateFromKnowledgeCidHash: Field, newUpdateToKnowledgeCidHash: Field): Promise<void> {
    const updateFromKnowledgeCidHash = this.updateFromKnowledgeCidHash.getAndRequireEquals();
    const updateToKnowledgeCidHash = this.updateToKnowledgeCidHash.getAndRequireEquals();
    assert(updateFromKnowledgeCidHash.equals(Field(0)), "submitKnowledgePublish can only be called without other update submit");
    assert(updateToKnowledgeCidHash.equals(Field(0)), "submitKnowledgePublish can only be called without other update submit");
    this.updateFromKnowledgeCidHash.set(newUpdateFromKnowledgeCidHash);
    this.updateToKnowledgeCidHash.set(newUpdateToKnowledgeCidHash);
  }
  
  @method async resetKnowledgePublish(): Promise<void> {
    const sender = this.sender.getAndRequireSignature();
    this.AdminAddr.assertEquals(sender);
    // 获取当前状态
    this.publishKnowledgeCidHash.getAndRequireEquals();
    this.publishKnowledgeCidHash.set(Field(0));
  }
  
  @method async resetKnowledgeUpdate(): Promise<void> {
    const sender = this.sender.getAndRequireSignature();
    this.AdminAddr.assertEquals(sender);
    // 获取当前状态
    this.updateFromKnowledgeCidHash.getAndRequireEquals();
    this.updateToKnowledgeCidHash.getAndRequireEquals();
    this.updateFromKnowledgeCidHash.set(Field(0));
    this.updateToKnowledgeCidHash.set(Field(0));
  }
  
  @method async proveKnowledgePublish(dagProver: DAGProver): Promise<void> {
    const sender = this.sender.getAndRequireSignature();
    this.AdminAddr.assertEquals(sender);
    // 获取当前状态
    const knowledgeEntryMerkleRoot = this.knowledgeEntryMerkleRoot.getAndRequireEquals();
    const publishKnowledgeCidHash = this.publishKnowledgeCidHash.getAndRequireEquals();
    const newKnowledgeEntryMerkleRoot = dagProver.proveDagPublic(publishKnowledgeCidHash, knowledgeEntryMerkleRoot);
    this.knowledgeEntryMerkleRoot.set(newKnowledgeEntryMerkleRoot);
    this.publishKnowledgeCidHash.set(Field(0));
  }
  
  @method async proveKnowledgeUpdate(dagProver: DAGProver): Promise<void> {
    const sender = this.sender.getAndRequireSignature();
    this.AdminAddr.assertEquals(sender);
    // 获取当前状态
    const knowledgeEntryMerkleRoot = this.knowledgeEntryMerkleRoot.getAndRequireEquals();
    const updateFromKnowledgeCidHash = this.updateFromKnowledgeCidHash.getAndRequireEquals();
    const updateToKnowledgeCidHash = this.updateToKnowledgeCidHash.getAndRequireEquals();
    const newKnowledgeEntryMerkleRoot = dagProver.proveDagUpdate(updateFromKnowledgeCidHash, updateToKnowledgeCidHash, knowledgeEntryMerkleRoot);
    this.knowledgeEntryMerkleRoot.set(newKnowledgeEntryMerkleRoot);
    this.updateFromKnowledgeCidHash.set(Field(0));
    this.updateToKnowledgeCidHash.set(Field(0));
  }

  @method async initApplicationEntryMerkleRoot(applicationEntryMerkleRoot: Field): Promise<void> {
    const sender = this.sender.getAndRequireSignature();
    this.AdminAddr.assertEquals(sender);
    const currentApplicationEntryMerkleRoot = this.applicationEntryMerkleRoot.getAndRequireEquals();
    assert(currentApplicationEntryMerkleRoot.equals(Field(0)), "applicationEntryMerkleRoot init can only be called once");
    this.applicationEntryMerkleRoot.set(applicationEntryMerkleRoot);
  }
  
  @method async submitApplicationPublish(newPublishApplicationCidHash: Field): Promise<void> {
    const publishApplicationCidHash = this.publishApplicationCidHash.getAndRequireEquals();
    assert(publishApplicationCidHash.equals(Field(0)), "submitApplicationPublish can only be called without other publish submit");
    this.publishApplicationCidHash.set(newPublishApplicationCidHash);
  }
  
  @method async submitApplicationUpdate(newUpdateFromApplicationCidHash: Field, newUpdateToApplicationCidHash: Field): Promise<void> {
    const updateFromApplicationCidHash = this.updateFromApplicationCidHash.getAndRequireEquals();
    const updateToApplicationCidHash = this.updateToApplicationCidHash.getAndRequireEquals();
    assert(updateFromApplicationCidHash.equals(Field(0)), "submitApplicationPublish can only be called without other update submit");
    assert(updateToApplicationCidHash.equals(Field(0)), "submitApplicationPublish can only be called without other update submit");
    this.updateFromApplicationCidHash.set(newUpdateFromApplicationCidHash);
    this.updateToApplicationCidHash.set(newUpdateToApplicationCidHash);
  }
  
  @method async resetApplicationPublish(): Promise<void> {
    const sender = this.sender.getAndRequireSignature();
    this.AdminAddr.assertEquals(sender);
    // 获取当前状态
    this.publishApplicationCidHash.getAndRequireEquals();
    this.publishApplicationCidHash.set(Field(0));
  }
  
  @method async resetApplicationUpdate(): Promise<void> {
    const sender = this.sender.getAndRequireSignature();
    this.AdminAddr.assertEquals(sender);
    // 获取当前状态
    this.updateFromApplicationCidHash.getAndRequireEquals();
    this.updateToApplicationCidHash.getAndRequireEquals();
    this.updateFromApplicationCidHash.set(Field(0));
    this.updateToApplicationCidHash.set(Field(0));
  }
  
  @method async proveApplicationPublish(dagProver: DAGProver): Promise<void> {
    const sender = this.sender.getAndRequireSignature();
    this.AdminAddr.assertEquals(sender);
    // 获取当前状态
    const applicationEntryMerkleRoot = this.applicationEntryMerkleRoot.getAndRequireEquals();
    const publishApplicationCidHash = this.publishApplicationCidHash.getAndRequireEquals();
    const newApplicationEntryMerkleRoot = dagProver.proveDagPublic(publishApplicationCidHash, applicationEntryMerkleRoot);
    this.applicationEntryMerkleRoot.set(newApplicationEntryMerkleRoot);
    this.publishApplicationCidHash.set(Field(0));
  }
  
  @method async proveApplicationUpdate(dagProver: DAGProver): Promise<void> {
    const sender = this.sender.getAndRequireSignature();
    this.AdminAddr.assertEquals(sender);
    // 获取当前状态
    const applicationEntryMerkleRoot = this.applicationEntryMerkleRoot.getAndRequireEquals();
    const updateFromApplicationCidHash = this.updateFromApplicationCidHash.getAndRequireEquals();
    const updateToApplicationCidHash = this.updateToApplicationCidHash.getAndRequireEquals();
    const newApplicationEntryMerkleRoot = dagProver.proveDagUpdate(updateFromApplicationCidHash, updateToApplicationCidHash, applicationEntryMerkleRoot);
    this.applicationEntryMerkleRoot.set(newApplicationEntryMerkleRoot);
    this.updateFromApplicationCidHash.set(Field(0));
    this.updateToApplicationCidHash.set(Field(0));
  }
  
  @method async proveContractAdmin(): Promise<void> {
    // 获取当前状态
    const sender = this.sender.getAndRequireSignature();
    Provable.log("sender", sender);
    this.AdminAddr.assertEquals(sender);
  }

} 