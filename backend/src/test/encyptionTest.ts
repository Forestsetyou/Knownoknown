import { PublicKey, PrivateKey, Encryption, Bytes, initializeBindings, Field, Group } from 'knownoknown-contract';
import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/hashes/utils';
import { writeFileSync, readFileSync } from 'fs';

class Byte32 extends Bytes(32) {}
class Byte12 extends Bytes(12) {}
// 生成随机密钥（AES-256 需要 32 字节）
const key = randomBytes(32);
const nonce = randomBytes(12); // GCM 推荐 12 字节 nonce

// 加密
const plaintext = '11111111111111111111111111111111112';
const encrypted = gcm(key, nonce).encrypt(
  new TextEncoder().encode(plaintext)
);

const minaKeys = {
    contractPrivateKey: "EKEH6CaiXK4LGwXNejEni3iC7uvWyLFgFKgRxuc9qzcJhoh3wpsC",
    contractPublicKey: "B62qpXm4xZZ1pAUWTQLXrkUJ4ahZg4GtYEyhm8dTm44XhAFiNrXLiVd"
}

await initializeBindings();
const keyBytes = Byte32.from(key);
const nonceBytes = Byte12.from(nonce);
// console.log(key);
// console.log(nonce);

function serializeEncryptedBytes(encryptedBytes: any) {
    return {
        publicKey: encryptedBytes.publicKey.toFields().map((item, index) => item.toString()),
        cipherText: encryptedBytes.cipherText.map((item, index) => item.toFields().map((item, index) => item.toString())),
        messageLength: encryptedBytes.messageLength,
    }
}

function deserializeEncryptedBytes(serializedEncryptedBytes: any) {
    return {
        publicKey: Group.fromFields(serializedEncryptedBytes.publicKey.map((item, index) => Field.fromJSON(item))),
        cipherText: serializedEncryptedBytes.cipherText.map((item, index) => Field.fromJSON(item[0])),
        messageLength: serializedEncryptedBytes.messageLength,
    }
}

const privateKey = PrivateKey.fromBase58(minaKeys.contractPrivateKey);
const publicKey = PublicKey.fromBase58(minaKeys.contractPublicKey);
const encryptedKeyBytes = Encryption.encryptBytes(keyBytes, publicKey);
const encryptedNonceBytes = Encryption.encryptBytes(nonceBytes, publicKey);

const tmpEncryptedKeyBytes = serializeEncryptedBytes(encryptedKeyBytes);
const tmpEncryptedNonceBytes = serializeEncryptedBytes(encryptedNonceBytes);
writeFileSync('tmpEncryptedKeyBytes.json', JSON.stringify(tmpEncryptedKeyBytes));
writeFileSync('tmpEncryptedNonceBytes.json', JSON.stringify(tmpEncryptedNonceBytes));

const newEncryptedKeyBytes = deserializeEncryptedBytes(tmpEncryptedKeyBytes);
const newEncryptedNonceBytes = deserializeEncryptedBytes(tmpEncryptedNonceBytes);

const decryptedKeyBytes = Encryption.decryptBytes(newEncryptedKeyBytes, privateKey);
const decryptedNonceBytes = Encryption.decryptBytes(newEncryptedNonceBytes, privateKey);

const decryptedKey = Uint8Array.from(decryptedKeyBytes.bytes);
const decryptedNonce = Uint8Array.from(decryptedNonceBytes.bytes);
console.log(decryptedKey);


// // 解密
const decrypted = gcm(decryptedKey, decryptedNonce).decrypt(encrypted);
console.log('解密结果:', new TextDecoder().decode(decrypted));
