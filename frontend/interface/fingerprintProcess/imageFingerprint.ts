const MAX_DISTANCE = 64

function ImageSimilarity(hashA: string, hashB: string): number {
    let distance = 0;
    for (let i = 0; i < hashA.length; i++) {
        if (hashA[i] !== hashB[i]) distance++;
    }
    return distance;
}

function ImageScore(distance: number): number {
    return Math.round((distance / MAX_DISTANCE) * 1000)/10;
}

export { ImageSimilarity, ImageScore };