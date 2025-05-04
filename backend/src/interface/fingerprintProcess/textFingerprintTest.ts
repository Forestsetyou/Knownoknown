import { SimHash, TextSimilarity, TextScore } from "./textFingerprint.js";
import fs from 'fs';

const text1 = fs.readFileSync("src/markdowns/knownoknown平台简介.md", "utf-8");
const hash1 = SimHash(text1);
console.log(`"text1" 的SimHash: ${hash1}`);

// 示例2：计算文本相似度
const text2 = fs.readFileSync("src/markdowns/CTF-Web入门.md", "utf-8");
const hash2 = SimHash(text2);
console.log(`"text2" 的SimHash: ${hash2}`);

const distance = TextSimilarity(hash1, hash2);
const score = TextScore(distance);
console.log(`汉明距离: ${distance} (值越小越相似), 相似度评分: ${score}`);

// fs.writeFileSync("text1.json", JSON.stringify({hash: hash1, text: text1}));
// fs.writeFileSync("text2.json", JSON.stringify({hash: hash2, text: text2}));

