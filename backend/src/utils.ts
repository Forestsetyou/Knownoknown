import { createHelia, HeliaLibp2p } from 'helia';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createLibp2p, Libp2p } from 'libp2p';
import { ServiceMap } from '@libp2p/interface';
import { tcp } from '@libp2p/tcp';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import { LevelDatastore } from 'datastore-level';
import { FsBlockstore } from 'blockstore-fs';
import { Stream } from '@libp2p/interface'
import { pipe } from 'it-pipe'

// 获取当前文件的目录
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 设置数据库路径为当前目录下的 data/database.json
export const pathConfig = {
    dataDir: path.join(__dirname, 'data'),
    datastorePath: path.join(__dirname, 'data', 'datastore'),
    blockstorePath: path.join(__dirname, 'data', 'blockstore'),
}

// 检查并创建目录
function checkAndCreateDir() {
    for (const key in pathConfig) {
        const dirPath = pathConfig[key];
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
}

function setPinHandlers(helia: any){
    helia.libp2p.handle('/ipfs/pin/1.0.0', async ({ stream }: { stream: Stream }) => {
        try {
          // 读取请求数据
          let requestData = '';
          
          // 从流中读取所有数据
          for await (const chunk of stream.source) {
            const chunkStr = new TextDecoder().decode(chunk.subarray());
            console.log('接收到请求块:', chunkStr, '长度:', chunk.length);
            requestData += chunkStr;
          }
          
          console.log('完整请求数据:', requestData);
          
          // 解析 JSON
          let request: any;
          try {
            request = JSON.parse(requestData);
          } catch (parseError) {
            console.error('JSON 解析失败:', parseError, '原始数据:', requestData);
            
            // 发送错误响应
            const errorResponse = JSON.stringify({ 
              success: false, 
              error: 'Invalid JSON format' 
            });
            
            await pipe(
              [new TextEncoder().encode(errorResponse)],
              stream.sink
            );
            
            return;
          }
          
          const { cid, pin } = request;
          
          // 执行 pin 或 unpin 操作
          if (pin) {
            // await this.pinContent(cid);
            console.log(`已通过协议固定内容: ${cid}`);
          } else {
            // await this.unpinContent(cid);
            console.log(`已通过协议取消固定内容: ${cid}`);
          }
          
          // 发送响应
          const response = JSON.stringify({ success: true });
          console.log('发送响应:', response);
          
          await pipe(
            [new TextEncoder().encode(response)],
            stream.sink
          );
        } catch (error) {
          console.error('处理 pin 请求失败:', error);
          
          // 发送错误响应
          try {
            const errorResponse = JSON.stringify({ 
              success: false, 
              error: error.message || 'Unknown error' 
            });
            
            await pipe(
              [new TextEncoder().encode(errorResponse)],
              stream.sink
            );
          } catch (e) {
            console.error('发送错误响应失败:', e);
          }
        }
      });
}

function debugConsole(helia: any) {
    helia.libp2p.getMultiaddrs().forEach((addr: any) => {
        console.log(addr.toString());
    });
}

export async function createMyHelia(): Promise<HeliaLibp2p<Libp2p<ServiceMap>>> {

    // 检查并创建目录
    checkAndCreateDir();

    // 初始化 datastore 和 blockstore
    const datastore = new LevelDatastore(pathConfig.datastorePath);
    const blockstore = new FsBlockstore(pathConfig.blockstorePath);

    // 创建libp2p配置
    const libp2p = await createLibp2p({
        datastore,
        addresses: {
            listen: [
                '/ip4/0.0.0.0/tcp/0',  // 保留标准 TCP 端口
                '/ip4/0.0.0.0/tcp/0/ws' // 只保留一个 WebSocket 地址
            ]
        },
        transports: [
          tcp(),
          webSockets()
        ],
        connectionEncrypters: [
          noise()
        ],
        streamMuxers: [
          yamux()
        ],
        peerDiscovery: [
          bootstrap({
            list: [
                '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
                '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
                '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
                '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
            ]
          })
        ],
        services: {
            identify: identify()
        }
    })

    // 初始化 Helia 节点
    // 传入 libp2p obj 会直接覆盖配置，传入配置则会与默认配置合并：https://github.com/ipfs/helia/blob/7e3212331b1c0f74c424e300069f9f3d4445cb33/packages/helia/src/utils/libp2p-defaults.ts#L43
    const helia = await createHelia({
        datastore,
        blockstore,
        libp2p
    });

    // setPinHandlers(helia)
    debugConsole(helia)

    return helia
}
