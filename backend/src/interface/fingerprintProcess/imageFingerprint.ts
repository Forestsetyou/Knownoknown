import sharp from 'sharp';
import { imageHash } from 'image-hash';

const MAX_DISTANCE = 64

async function PHash(imageData: Buffer, imageName: string): Promise<string | null> {
    try {
      // 预处理：统一缩放为256x256并转为灰度图
      const imageDOB = {
        data: await sharp(imageData)
        .resize(512, 512)
        .grayscale().toBuffer(),
      }

      return new Promise((resolve) => {
        imageHash(imageDOB, 16, true, (err: Error | null, hash: string) => {
          if (err) {
            console.error(`Error hashing image: ${imageName}`, err);
            resolve(null);
          } else {
            resolve(hash);
          }
        });
      });
    } catch (err) {
      console.error(`Error processing image: ${imageName}`, err);
      return null;
    }
}

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

export { PHash, ImageSimilarity, ImageScore };