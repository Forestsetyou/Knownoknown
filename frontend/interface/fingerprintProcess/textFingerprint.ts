const HASH_BITS = 64

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
    const half_distance = (distance+32 > 64) ? 64 : distance+32;
    return Math.round((half_distance / HASH_BITS) * 1000)/10;
}

export { TextSimilarity, TextScore }
