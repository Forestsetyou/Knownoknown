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

// 检查账户余额
async function checkAccountsBalance(network: any, publicKeys: PublicKey[], maxRetries = 30): Promise<Boolean> {
    let retries = 0;
    const retryInterval = 30000; // 30秒

    // await sleep(retryInterval); // 先等待再检查
    let checkResults:any[] = [];

    while (retries < maxRetries) {
        checkResults = [];
        for (const publicKey of publicKeys) {
            try {
                const account = await fetchAccount({publicKey: publicKey}, "https://api.minascan.io/node/devnet/v1/graphql");
                if (account.account !== undefined) {
                    checkResults.push(account.account.balance.toString());
                } else {
                    checkResults.push(false);
                }
            } catch (error) {
                console.log(error);
            }
        }

        console.log(`----第 ${retries + 1} 次检查结果 ----`)
        for (let i = 0; i < checkResults.length; i++) {
            console.log(`账户: ${publicKeys[i].toBase58()} 余额: ${checkResults[i]}`);
        }
        console.log('--------------------------------');

        console.log(checkResults);

        if(checkResults.every((result) => result !== false)) {  // 所有账户创建成功
            return true;
        } else {
            retries++;
            if (retries < maxRetries) {
                console.log(`等待 ${retryInterval/1000} 秒后重试...`);
                await sleep(retryInterval);
            }
        }
    }

    throw new Error(`在 ${maxRetries * retryInterval/1000} 秒内未能检测到账户创建`);
}

async function main() {
    console.log('检查账户创建...');
    
    // 连接到测试网络
    const networkId = "testnet";
    const network = Mina.Network({
      mina: 'https://api.minascan.io/node/devnet/v1/graphql',
      archive: 'https://api.minascan.io/archive/devnet/v1/graphql',
      networkId
    });
    
    Mina.setActiveInstance(network);

    let adminAccount:any;
    try {
        adminAccount = JSON.parse(readFileSync(join(__dirname, '../../keys/users/adminKey.json'), 'utf8'));
    } catch (error) {
        console.log(`管理员账户读取失败: ${error instanceof Error ? error.message : '未知错误'}`);
        return false
    }
    const adminPrivateKey = PrivateKey.fromBase58(adminAccount.adminPrivateKey);
    const adminPublicKey = PublicKey.fromBase58(adminAccount.adminPublicKey);

    let userAccounts:any;
    try {
        userAccounts = JSON.parse(readFileSync(join(__dirname, '../../keys/users/userKeys.json'), 'utf8'));
    } catch (error) {
        console.log(`用户账户读取失败: ${error instanceof Error ? error.message : '未知错误'}`);
        return false
    }

    let userPublicKeys:PublicKey[] = [];
    let userPrivateKeys:PrivateKey[] = [];
    for (const userPbk of userAccounts.userPublicKeys) {
        userPublicKeys.push(PublicKey.fromBase58(userPbk));
    }
    for (const userPvk of userAccounts.userPrivateKeys) {
        userPrivateKeys.push(PrivateKey.fromBase58(userPvk));
    }

    let validation = true;
    for (let i = 0; i < userPublicKeys.length; i++) {
        const tmp_validation = userPublicKeys[i].equals(userPrivateKeys[i].toPublicKey());
        console.log(`用户${i}公钥: ${userPublicKeys[i].toBase58()}, 私钥: ${userPrivateKeys[i].toBase58()} 匹配? ${tmp_validation}`);
        if (tmp_validation.not().toBoolean()) {
            validation = false;
        }
    }
    if (!validation) {
        console.log("用户公私钥不匹配");
        return false
    }

    const allPublicKeys = [adminPublicKey, ...userPublicKeys];
    await checkAccountsBalance(network, allPublicKeys);
}

main().catch((error) => {
    console.error('检查账户创建失败:', error);
    if (error instanceof Error) {
        console.error('错误详情:', error.message);
    }
});