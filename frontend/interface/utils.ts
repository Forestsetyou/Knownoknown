import { createHeliaHTTP, Helia } from '@helia/http'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import { trustlessGateway } from '@helia/block-brokers'
import { httpGatewayRouting } from '@helia/routers'
import imageCompression from 'browser-image-compression';

async function createMyHeliaHTTP(httpGatewayRoutingURL: string): Promise<Helia> {

    // 初始化 datastore 和 blockstore
    const datastore = new MemoryDatastore();
    const blockstore = new MemoryBlockstore();

    // 初始化 Helia 节点
    // 传入 libp2p obj 会直接覆盖配置，传入配置则会与默认配置合并：https://github.com/ipfs/helia/blob/7e3212331b1c0f74c424e300069f9f3d4445cb33/packages/helia/src/utils/libp2p-defaults.ts#L43
    const helia = await createHeliaHTTP({
        datastore,
        blockstore,
        blockBrokers: [
            trustlessGateway({
                allowInsecure: true,
                allowLocal: true
            })
        ],
        routers: [
            // delegatedHTTPRouting('http://127.0.0.1:3000'),
            httpGatewayRouting({
                gateways: [httpGatewayRoutingURL]
            })
        ]
    });

    return helia
}

/**
 * 处理图片文件：确保为JPEG格式且大小小于2MB
 * @param file 输入的图片文件
 * @returns 处理后的图片Uint8Array数据
 */
export async function processImageToJpegUint8(file: File): Promise<Uint8Array> {
  try {
    // 1. 检查文件类型
    let processedFile: File | Blob = file;
    const isJpeg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
    
    // 2. 如果不是JPEG，先转换为JPEG
    if (!isJpeg) {
      console.log('Converting non-JPEG image to JPEG format...');
      processedFile = await imageCompression(file, {
        fileType: 'image/jpeg',
        initialQuality: 0.9, // 初始转换质量
        maxIteration: 10,    // 最大压缩迭代次数
      });
    }

    // 3. 检查文件大小 (2MB = 2 * 1024 * 1024 bytes)
    const maxSizeBytes = 2 * 1024 * 1024;
    
    // 4. 如果大于2MB，则压缩
    if (processedFile.size > maxSizeBytes) {
      console.log('Compressing image to under 2MB...');
      processedFile = await imageCompression(processedFile as File, {
        fileType: 'image/jpeg',
        maxSizeMB: 2,       // 目标最大大小MB
        maxWidthOrHeight: 1920, // 最大尺寸
        useWebWorker: true,   // 使用WebWorker提高性能
        maxIteration: 15,     // 最大压缩迭代次数
      });
    }

    // 5. 转换为Uint8Array
    const arrayBuffer = await processedFile.arrayBuffer();
    return new Uint8Array(arrayBuffer);

  } catch (error) {
    console.error('Image processing failed:', error);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function streamToUint8Array(stream: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  // 单次遍历同时收集块和计算长度
  for await (const chunk of stream) {
      chunks.push(chunk);
      totalLength += chunk.length;

      // 如果单个块已经很大，可以立即合并以减少内存使用
      if (chunk.length > 1024 * 1024) { // 1MB
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          for (const c of chunks) {
              combined.set(c, offset);
              offset += c.length;
          }
          chunks.length = 0; // 清空数组
          chunks.push(combined); // 只保留合并后的块
      }
  }

  // 最终合并
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
  }

  return result;
}

// 使用示例
async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  try {
    const file = input.files[0];
    console.log('Original file:', {
      name: file.name,
      type: file.type,
      size: (file.size / 1024 / 1024).toFixed(2) + 'MB'
    });

    const processedUint8Array = await processImageToJpegUint8(file);
    
    console.log('Processed image Uint8Array:', processedUint8Array);
    console.log('Processed size:', (processedUint8Array.length / 1024 / 1024).toFixed(2) + 'MB');

    // 可以在这里上传到服务器或进行其他处理
  } catch (error) {
    console.error('Error processing image:', error);
  }
}
function checkImageWithTimeout(objectUrl:any, timeout = 3000) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = img.onerror = null;
      URL.revokeObjectURL(objectUrl);
      resolve(false); // 超时视为无效
    }, timeout);

    img.onload = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      resolve(false);
    };
    
    img.src = objectUrl;
  });
}
/**
 * 将 Uint8Array 转换为 Base64 数据 URL
 * @param uint8Array 二进制数据
 * @param mimeType 数据类型（如 'image/png'），默认 'application/octet-stream'
 * @returns Promise<string> 格式为 `data:{mimeType};base64,{base64String}`
 */
async function uint8ArrayToDataURL(
  uint8Array: Uint8Array,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // 1. 将 Uint8Array 转为 Blob
      const blob = new Blob([uint8Array], { type: mimeType });

      // 2. 使用 FileReader 读取为 Base64
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert to Base64: unexpected result type'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Unknown error'));
    }
  });
}

// HTML中使用
// <input type="file" accept="image/*" @change="handleFileUpload" />

export { createMyHeliaHTTP, handleFileUpload, streamToUint8Array, checkImageWithTimeout, uint8ArrayToDataURL };