import { createHeliaHTTP, Helia } from '@helia/http';
import { trustlessGateway } from '@helia/block-brokers'
import { httpGatewayRouting } from '@helia/routers'
import { unixfs, UnixFS } from '@helia/unixfs'

export class HeliaProver {
    helia: Helia;
    fs: UnixFS;

    constructor() {}
    async initialize() {
        this.helia = await createHeliaHTTP({
            blockBrokers: [
                trustlessGateway({
                    allowInsecure: true,
                    allowLocal: true
                })
            ],
            routers: [
                // delegatedHTTPRouting('http://127.0.0.1:3000'),
                httpGatewayRouting({
                gateways: ['http://127.0.0.1:3000']
                })
            ]
        })
        this.fs = unixfs(this.helia);
    }
}

const heliaProver = new HeliaProver();
heliaProver.initialize();

export { heliaProver };
