import nodejieba from 'nodejieba';
import fs from 'fs';
// 初始化结巴分词
nodejieba.load();

async function loadStopWords(url: URL) {
    const data = fs.readFileSync(url, 'utf-8');
    return new Set(data.split('\n').map(w => w.trim()));
}

const STOP_WORDS = await loadStopWords((new URL('../../../keys/stop_words_cn.txt', import.meta.url)));
const HASH_BITS = 64

class SimHashTF {


    /**
     * 生成最终指纹
     */
    private static generateFingerprint(
        vectors: number[][], 
        hashBits: number
    ): string {
        // 合并所有向量
        const fingerprint = new Array(hashBits).fill(0);
        vectors.forEach(vec => {
            vec.forEach((val, i) => {
                fingerprint[i] += val;
            });
        });
        
        // 生成二进制指纹
        let result = 0n;
        fingerprint.forEach((sum, i) => {
            if (sum > 0) {
                result |= 1n << BigInt(i);
            }
        });
        
        // 转为16进制字符串
        return result.toString(16).padStart(hashBits / 4, '0');
    }
    
    /**
     * 计算文本的SimHash值
     * @param text 输入文本
     * @param hashBits 哈希位数（默认64位）
     * @returns 16进制字符串的SimHash
     */
    public static compute(text: string): string {
        // 1. 分词并计算词频
        const wordFreqs = this.getWordFrequencies(text);
        
        // 2. 计算每个词的加权哈希
        const hashVectors = this.calculateHashVectors(wordFreqs, HASH_BITS);
        
        // 3. 合并生成最终指纹
        return this.generateFingerprint(hashVectors, HASH_BITS);
    }
    
    /**
     * FNV-1a 哈希函数
     */
    private static fnv1aHash(str: string): number {
        const FNV_OFFSET_BASIS = 2166136261;
        const FNV_PRIME = 16777619;
        
        let hash = FNV_OFFSET_BASIS;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash *= FNV_PRIME;
        }
        
        return hash >>> 0; // 转为无符号32位整数
    }
    
    /**
     * 分词并计算词频（TF加权）
     */
    private static getWordFrequencies(text: string): Map<string, number> {
        // 使用结巴分词（精确模式）
        const words = nodejieba.cut(text, true);
        
        // 计算词频
        const freqMap = new Map<string, number>();
        words.forEach(word => {
            if (
                !STOP_WORDS.has(word) && 
                word.trim().length > 1) { // 过滤单字
                freqMap.set(word, (freqMap.get(word) || 0) + 1);
            }
        });
        // fs.writeFileSync(`wordFreqs${Date.now()}.json`, JSON.stringify(Object.fromEntries(freqMap.entries()), null, 2));
        return freqMap;
    }
    
    /**
     * 计算每个词的加权哈希向量
     */
    private static calculateHashVectors(
        wordFreqs: Map<string, number>,
        hashBits: number
    ): number[][] {
        const vectors: number[][] = [];
        
        wordFreqs.forEach((freq, word) => {
            // 1. 计算单词的哈希（使用简单的FNV哈希）
            const hash = this.fnv1aHash(word);
            
            // 2. 创建加权向量（词频作为权重）
            const vector = new Array(hashBits).fill(0);
            for (let i = 0; i < hashBits; i++) {
                const bit = (hash >> i) & 1;
                vector[i] = (bit === 1 ? freq : -freq);
            }
            
            vectors.push(vector);
        });
        
        return vectors;
    }
}

function SimHash(text: string) {
    return SimHashTF.compute(text);
}

function TextSimilarity(hash1: string, hash2: string): number {
    const num1 = BigInt(`0x${hash1}`);
    const num2 = BigInt(`0x${hash2}`);
    let xor = num1 ^ num2;
    console.log(`xor: ${xor}`);
    
    let distance = 0;
    while (xor > 0n) {
        distance += Number(xor & 1n);
        xor >>= 1n;
    }
    return distance;
}

function TextScore(distance: number): number {
    const half_distance = (distance*2 > 64) ? 64 : distance*2;
    return Math.round((half_distance / HASH_BITS) * 1000)/10;
}

export { SimHash, TextSimilarity, TextScore }
