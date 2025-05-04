type User_Publickey = string;
type CID_Str = string;
type Random_ID = string;

function generateRandomId(length: number = 16): Random_ID {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues); // 填充随机字节
  
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length]; // 映射到字符集
    }
    return result;
}
export type { User_Publickey, CID_Str, Random_ID };
export { generateRandomId };
