import { createHeliaHTTP, Helia } from '@helia/http'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import { trustlessGateway } from '@helia/block-brokers'
import { httpGatewayRouting } from '@helia/routers'

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

export { createMyHeliaHTTP };