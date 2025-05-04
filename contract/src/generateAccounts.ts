import {
  PrivateKey,
  Mina
} from 'o1js';
import { writeFileSync, mkdirSync, existsSync, write } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  
  // 创建合约账户
  const contractPrivateKey = PrivateKey.random();
  const contractPublicKey = contractPrivateKey.toPublicKey();

  // 创建管理员账户
  const adminPrivateKey = PrivateKey.fromBase58("EKFQAj8PJksEZA4Rs3diU8tyAeNDXGD4YjMbpwEDPwzfCWe5CWCp");
  const adminPublicKey = adminPrivateKey.toPublicKey();

  // 创建用户账户
  const userPrivateKeys = [
    PrivateKey.random(),    // user1
    PrivateKey.random(),    // user2
    PrivateKey.random(),    // user3
  ]

  const userPublicKeys = [
    userPrivateKeys[0].toPublicKey(),
    userPrivateKeys[1].toPublicKey(),
    userPrivateKeys[2].toPublicKey(),
  ]

  const keysDir = join(__dirname, '../../keys');
  if (!existsSync(keysDir)) {
    mkdirSync(keysDir);
  }
  const userKeysDir = join(keysDir, 'users');
  if (!existsSync(userKeysDir)) {
    mkdirSync(userKeysDir);
  }

  writeFileSync(    // 保存合约私钥和公钥
    join(keysDir, 'contractKey.json'),
    JSON.stringify({
      contractPrivateKey: contractPrivateKey.toBase58(),
      contractPublicKey: contractPublicKey.toBase58()
    }, null, 2)
  );

  writeFileSync(    // 保存管理员私钥和公钥
    join(userKeysDir, 'adminKey.json'),
    JSON.stringify({
      adminPrivateKey: adminPrivateKey.toBase58(),
      adminPublicKey: adminPublicKey.toBase58()
    }, null, 2)
  );

  writeFileSync(    // 保存用户私钥和公钥
    join(userKeysDir, 'userKeys.json'),
    JSON.stringify({
      userPrivateKeys: userPrivateKeys.map(key => key.toBase58()),
      userPublicKeys: userPublicKeys.map(key => key.toBase58())
    }, null, 2)
  );
  console.log('请访问以下链接为新账户领取测试币:');
  console.log(`https://faucet.minaprotocol.com/?address=${adminPublicKey.toBase58()}`);
  for (const pbk of userPublicKeys) {
    console.log(`https://faucet.minaprotocol.com/?address=${pbk.toBase58()}`);
  }

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