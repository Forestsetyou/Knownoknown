import { SimHash, TextSimilarity, TextScore } from "./textFingerprint.js";
import fs from 'fs';

const text1 = fs.readFileSync("src/markdowns/文本1.md", "utf-8");
const hash1 = SimHash(text1);
console.log(`"文本1" 的SimHash: ${hash1}`);

// 示例2：计算文本相似度
const text2 = fs.readFileSync("src/markdowns/文本2.md", "utf-8");
const hash2 = SimHash(text2);
console.log(`"文本2" 的SimHash: ${hash2}`);

const distance = TextSimilarity(hash1, hash2);
const score = TextScore(distance);
console.log(`相似度: ${1-distance*2/64}, 原创性得分: ${score}`);

// fs.writeFileSync("text1.json", JSON.stringify({hash: hash1, text: text1}));
// fs.writeFileSync("text2.json", JSON.stringify({hash: hash2, text: text2}));

