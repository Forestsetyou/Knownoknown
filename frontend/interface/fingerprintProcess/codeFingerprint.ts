/**
 * 计算两段代码的相似度（Jaccard 相似度）
 * @param fp1 指纹集 1
 * @param fp2 指纹集 2
 * @returns 相似度（0-1）
 */
function CodeSimilarity(fp1: number[], fp2: number[]): number[] {
    const set1 = new Set(fp1);
    const set2 = new Set(fp2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return [intersection.size / union.size, intersection.size / set1.size, intersection.size / set2.size];
}

/**
 * 转换为 10 分制评分
 * @param sim Jaccard 相似度（0-1）
 * @returns 0-10 分
 */
function CodeScore(sim: number): number {
    return Math.round((1-sim) * 1000)/10;
}

export { CodeSimilarity, CodeScore };