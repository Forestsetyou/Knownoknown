import { KnownoknownCommitment } from './KnownoknownCommitment';
import {
  Field,
  PrivateKey,
  PublicKey,
  Mina,
  AccountUpdate,
  UInt64,
  fetchAccount
} from 'o1js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 等待函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// fee
const fee = 1e8;

async function readDeployAccount() {
    let deployAccount:any;
    try {
        deployAccount = JSON.parse(readFileSync(join(__dirname, '../../keys/users/userKeys.json'), 'utf8'));
    } catch (error) {
        console.log(`部署账户读取失败: ${error instanceof Error ? error.message : '未知错误'}`);
        return ["",""]
    }
    return [deployAccount.userPrivateKeys[0].toBase58(), deployAccount.userPublicKeys[0].toBase58()];
}
// 检查账户余额
async function checkAccountBalance(network: any, publicKey: PublicKey, maxRetries = 30): Promise<UInt64> {
  let retries = 0;
  const retryInterval = 30000; // 30秒
  
  await sleep(retryInterval); // 先等待再检查
  
  while (retries < maxRetries) {
    try {
      const account = await fetchAccount({publicKey: publicKey}, "https://api.minascan.io/node/devnet/v1/graphql");
      if (account.account !== undefined) {
        console.log(`账户已创建，当前余额: ${account.account.balance.toString()}`);
        return account.account.balance;
      }
    } catch (error) {
      console.log(`第 ${retries + 1} 次检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    
    retries++;
    if (retries < maxRetries) {
      console.log(`等待 ${retryInterval/1000} 秒后重试...`);
      await sleep(retryInterval);
    }
  }
  
  throw new Error(`在 ${maxRetries * retryInterval/1000} 秒内未能检测到账户创建`);
}

// 等待账户有余额
async function waitForBalance(network: any, publicKey: PublicKey, minBalance: bigint = BigInt(0), maxRetries = 30): Promise<UInt64> {
  let retries = 0;
  const retryInterval = 30000; // 30秒

  while (retries < maxRetries) {
    try {
      const account = await fetchAccount({publicKey: publicKey}, "https://api.minascan.io/node/devnet/v1/graphql");
      if (account.account !== undefined) {
        const balance = account.account.balance;
        console.log(`当前余额: ${balance.toString()}`);
        
        if (balance.toBigInt() >= minBalance) {
          console.log('账户余额充足');
          return balance;
        }
      }
    } catch (error) {
      console.log(`第 ${retries + 1} 次检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    
    retries++;
    if (retries < maxRetries) {
      console.log(`等待 ${retryInterval/1000} 秒后重试...`);
      await sleep(retryInterval);
    }
  }
  
  throw new Error(`在 ${maxRetries * retryInterval/1000} 秒内账户余额未达到要求`);
}

// 检查合约部署状态
async function checkContractDeployment(contractPublicKey: PublicKey, maxRetries = 30): Promise<boolean> {
  let retries = 0;
  const retryInterval = 30000; // 30秒
  
  while (retries < maxRetries) {
    try {
      const account = await fetchAccount({publicKey: contractPublicKey}, "https://api.minascan.io/node/devnet/v1/graphql");
      if (account.account !== undefined && account.account.zkapp !== undefined) {
        console.log('合约已成功部署');
        return true;
      }
    } catch (error) {
      console.log(`第 ${retries + 1} 次检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    
    retries++;
    if (retries < maxRetries) {
      console.log(`等待 ${retryInterval/1000} 秒后重试...`);
      await sleep(retryInterval);
    }
  }
  
  throw new Error(`在 ${maxRetries * retryInterval/1000} 秒内未能检测到合约部署`);
}

async function main() {
  console.log('开始初始化开发网络...');
  
  // 连接到测试网络
  const networkId = "testnet";
  const network = Mina.Network({
    mina: 'https://api.minascan.io/node/devnet/v1/graphql',
    archive: 'https://api.minascan.io/archive/devnet/v1/graphql',
    networkId
  });
  
  Mina.setActiveInstance(network);
  
  // 读取部署者账户
  const [deployerPrivateKeyB58, deployerPublicKeyB58] = await readDeployAccount();
  if (deployerPrivateKeyB58 == "" || deployerPublicKeyB58 == "") {
    console.log('部署者账户读取失败');
    return false;
  }
  const deployerPrivateKey = PrivateKey.fromBase58(deployerPrivateKeyB58);
  const deployerPublicKey = PublicKey.fromBase58(deployerPublicKeyB58);
  
  console.log('部署者公钥:', deployerPublicKey.toBase58());
  console.log('部署者私钥:', deployerPrivateKey.toBase58());
  
//   try {
//     // 等待账户创建
//     await checkAccountBalance(network, deployerPublicKey);
    
//     // 等待测试币到账（至少1 MINA）
//     const deployerBalance = await waitForBalance(network, deployerPublicKey, BigInt(1000000000));
//     console.log('部署者账户余额充足:', deployerBalance.toString());
    
//     // 创建合约账户
//     const zkappPrivateKey = PrivateKey.random();
//     const zkappPublicKey = zkappPrivateKey.toPublicKey();
    
//     console.log('开始编译合约...');
    
//     // 编译合约
//     const compileResult = await KnownoknownCommitment.compile();
//     const { verificationKey, provers } = compileResult;
    
//     // 创建合约实例
//     console.log('部署合约...');
//     const knownoknownCommitment = new KnownoknownCommitment(zkappPublicKey);
    
//     // 部署交易
//     const deployTxn = await Mina.transaction({
//       sender: deployerPublicKey,
//       fee: fee
//     }, async () => {
//       AccountUpdate.fundNewAccount(deployerPublicKey);
//       knownoknownCommitment.deploy();
//     });
    
//     await deployTxn.prove();
//     await deployTxn.sign([deployerPrivateKey, zkappPrivateKey]).send();
    
//     console.log('等待合约部署确认...');
//     await checkContractDeployment(zkappPublicKey);
//     console.log('合约已部署到地址:', zkappPublicKey.toBase58());
    
//     // 读取初始状态
//     const entryCid = knownoknownCommitment.entryCid.get();
//     const knowledgeNum = knownoknownCommitment.knowledgeNum.get();
    
//     console.log('初始状态:');
//     console.log('- entryCid:', entryCid.toString());
//     console.log('- knowledgeNum:', knowledgeNum.toString());
    
//     // 创建输出目录
//     const outputDir = join(__dirname, 'build');
//     if (!existsSync(outputDir)) {
//       mkdirSync(outputDir);
//     }
    
//     // 保存验证密钥
//     writeFileSync(
//       join(outputDir, 'verification_key.json'),
//       JSON.stringify(verificationKey, null, 2)
//     );
    
//     // 创建符合前端接口的部署信息
//     const deploymentInfo = {
//       network: {
//         id: networkId,
//         name: 'testnet',
//         endpoints: {
//           mina: 'https://api.minascan.io/node/devnet/v1/graphql',
//           archive: 'https://api.minascan.io/archive/devnet/v1/graphql'
//         }
//       },
//       deployer: {
//         publicKey: deployerPublicKey.toBase58(),
//         privateKey: deployerPrivateKey.toBase58(),
//         balance: deployerBalance.toString()
//       },
//       contract: {
//         publicKey: zkappPublicKey.toBase58(),
//         privateKey: zkappPrivateKey.toBase58()
//       },
//       state: {
//         entryCid: entryCid.toString(),
//         knowledgeNum: knowledgeNum.toString()
//       },
//       timestamp: new Date().toISOString()
//     };
    
//     // 保存部署信息到文件
//     writeFileSync(
//       join(outputDir, 'deployment.json'),
//       JSON.stringify(deploymentInfo, null, 2)
//     );
//     console.log('部署信息已保存到:', join(outputDir, 'deployment.json'));
    
//     console.log('合约部署完成，信息已保存到 build/deployment.json');
//     console.log('请运行 npm run test 进行合约测试');
    
//   } catch (error) {
//     console.error('部署失败:', error);
//     if (error instanceof Error) {
//       console.error('错误详情:', error.message);
//       if (error.stack) {
//         console.error('错误堆栈:', error.stack);
//       }
//     }
//     process.exit(1);
//   }
}

main().catch((error) => {
  console.error('部署失败:', error);
  if (error instanceof Error) {
    console.error('错误详情:', error.message);
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
  }
  process.exit(1);
}); 