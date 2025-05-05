import express from 'express';
import cors from 'cors';
import { TrustlessGatewayCarOptions, TrustlessGatewayRawOptions, trustlessGatewayCorsOptions, checkReqType } from './interface/trustlessGateway/trustlessGatewayOptions.js';
import { TrustlessGatewayResponseHeaders } from './interface/trustlessGateway/trustlessGatewayInterface.js';
import { KnowledgeDBServer } from './knowledgeDBServer.js';
import { KnownoknownLocalContractServer } from './interface/knownoknownContract/knownoknownLocalContractServer.js';
import { writeFileSync } from 'fs';

const adminServerCorsOptions = {    // 管理员服务器 CORS 选项
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    // credentials: true,
}

function setHeaders(res: express.Response, headers: TrustlessGatewayResponseHeaders) {
    for (const key in headers) {
        res.setHeader(key, headers[key]);
    }
    
    // console.log('------------- setted response headers -------------');
    // console.log(JSON.stringify(headers, null, 2));
    // console.log('------------- setted response headers end -------------');
    // console.log('------------- response headers -------------');
    // console.log(JSON.stringify(res.getHeaders(), null, 2));
    // console.log('------------- response headers end -------------');
}

export class ExpressApp {
    private app: express.Application;
    private knowledgeDB: KnowledgeDBServer;
    private reqCount: number;
    private knownoknownLocalContractServer: KnownoknownLocalContractServer;

    constructor() {
        this.app = express();
        this.knowledgeDB = new KnowledgeDBServer();
        this.reqCount = 0;
        this.knownoknownLocalContractServer = new KnownoknownLocalContractServer();
    }

    public async init() {
        await this.initPre(); // 初始化子成员
        this.initOptions(); // 初始化设置
        this.initMiddleware(); // 初始化中间件
        await this.initTrustlessGateway(); // 初始化无信任网关
        await this.initDelegatedRoutingV1HTTP(); // 初始化委托路由v1 HTTP
        await this.initAdminServer(); // 初始化管理服务器
        await this.initLocalContractServer(); // 初始化本地合约服务器
        this.start();
    }

    private async initPre() {
        await this.knowledgeDB.initialize();
        await this.knownoknownLocalContractServer.initialize(await this.knowledgeDB.generateDAGCidArray('application'), await this.knowledgeDB.generateDAGCidArray('knowledge'));
    }

    private start() {
        const PORT = process.env.PORT || 12891;
        this.app.listen(PORT, () => {
            console.log(`服务器已启动，监听端口 ${PORT}`);
        });
    }

    private initOptions() {
        this.app.disable('etag'); // 禁用 E-Tag
    }

    private initMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use((req, res, next) => {
            this.reqCount++;
            // 打印请求信息
            console.log(`------------- request ${this.reqCount} -------------`);
            console.log(`请求方法: ${req.method}`);
            console.log(`请求路径: ${req.path}`);
            console.log(`请求头: ${JSON.stringify(req.headers, null, 2)}`);
            console.log(`请求体: ${JSON.stringify(req.body, null, 2)}`);
            console.log(`------------- request ${this.reqCount} end -------------`);
            next()
        })
    }
    
    // routers for admin server
    private async initAdminServer() {
        this.app.get('/admin/status', cors(adminServerCorsOptions), async (req, res) => {
            res.json({
                success: true,
                status: 'online',
                ipfsGatewayRoutingURL: "http://127.0.0.1:12891",
                ipfsStatusFlagCID: (await this.knowledgeDB.getStatusFlagCID()).toString(),
                knownoknownEntryCID: (await this.knowledgeDB.getKnownoknown_Entry_CID()).toString(),
                contractAddress: (await this.knownoknownLocalContractServer.getLocalContractAddress()).toBase58(),
                version: '1.0.0'
            })
        })
        this.app.options('/admin/extract-fingerprint', cors(adminServerCorsOptions));
        // this.app.post('/admin/extract-fingerprint', cors(adminServerCorsOptions), async (req, res) => {
        //     try {
        //         if (!req.body || !req.body.knowledge_data_car) {
        //             console.log("req.body", req.body);
        //             return res.status(400).json({
        //                 success: false,
        //                 error: 'no knowledge data car provided'
        //             })
        //         }
        //         writeFileSync('body.json', JSON.stringify(req.body, null, 2));
        //         const knowledgeDataCarBytes = Uint8Array.from(req.body.knowledge_data_car);
        //         const fingerprintDataCarBytes = await this.knowledgeDB.extractFingerprintDataFromKnowledgeDataCar(knowledgeDataCarBytes);
        //         res.json({
        //             success: true,
        //             fingerprintDataCarBytes: fingerprintDataCarBytes
        //         })
        //     } catch (error) {
        //         console.log("error:", error);
        //         res.json({
        //             success: false,
        //             error: 'failed to extract fingerprint data'
        //         })
        //     }
        // })
        this.app.post('/admin/extract-fingerprint', 
            cors(adminServerCorsOptions),
            // 禁用 bodyParser 以直接处理二进制流
            express.raw({ type: 'application/octet-stream', limit: '500mb' }),
            async (req, res) => {
              try {
                if (!req.body || req.body.length === 0) {
                  return res.status(400).json({ success: false, error: 'Empty payload' });
                }
          
                // 直接获取 Uint8Array
                const knowledgeDataCarBytes = new Uint8Array(req.body);
                
                // 处理数据
                const fingerprintDataCarBytes = 
                  await this.knowledgeDB.extractFingerprintDataFromKnowledgeDataCar(knowledgeDataCarBytes);
          
                // 返回二进制响应
                res.setHeader('Content-Type', 'application/octet-stream');
                res.end(Buffer.from(fingerprintDataCarBytes));
              } catch (error) {
                console.error("Processing error:", error);
                res.status(500).json({ success: false, error: error.message });
              }
            }
          );
        // this.app.get('/admin/contractTest', cors(adminServerCorsOptions), async (req, res) => {
        //     const result = await this.knownoknownLocalContractServer.contractTest();
        //     if (result) {
        //         res.json({
        //             success: true,
        //         })
        //     } else {
        //         res.json({
        //             success: false,
        //         })
        //     }
        // })
    }
    
    // routers for local contract server
    private async initLocalContractServer() {
        this.app.get('/contract/status', cors(adminServerCorsOptions), async (req, res) => {
            res.json({
                success: true,
                status: 'online',
                contractAddress: (await this.knownoknownLocalContractServer.getLocalContractAddress()).toBase58(),
                version: '1.0.0'
            })
        })
        this.app.get('/contract/fields/:contractAddress', cors(adminServerCorsOptions), async (req, res) => {
            const contractAddress = req.params.contractAddress;
            const result = await this.knownoknownLocalContractServer.getContractFields(contractAddress);
            if (result) {
                res.json({
                    success: true,
                    fields: result
                })
            } else {
                res.json({
                    success: false,
                })
            }
        })
        this.app.get('/contract/accountsInfo', cors(adminServerCorsOptions), async (req, res) => {
            const result = await this.knownoknownLocalContractServer.getLocalAccountsInfo();
            if (result) {
                res.json({
                    success: true,
                    accountsInfo: result
                })
            } else {
                res.json({
                    success: false,
                })
            }
        })
        this.app.get('/contract/accountInfo/:pvk', cors(adminServerCorsOptions), async (req, res) => {
            const pvk = req.params.pvk;
            const result = await this.knownoknownLocalContractServer.getLocalAccountInfo(pvk);
            if (result) {
                res.json({
                    success: true,
                    accountInfo: result
                })
            } else {
                res.json({
                    success: false,
                })
            }
        })
        this.app.post('/contract/method/publish', cors(adminServerCorsOptions), async (req, res) => {
            const type = req.body.type;
            if ((type !== 'knowledge' && type !== 'application')) {
                res.json({
                    success: false,
                    error: 'invalid type'
                })
                return;
            }
            const pvk = req.body.pvk;
            const publishCid = req.body.publishCid;
            if (!pvk || !publishCid) {
                res.json({
                    success: false,
                    error: 'invalid params'
                })
                return;
            }
            const result = await this.knownoknownLocalContractServer.submitPublish(type, publishCid, pvk);
            if (result) {
                res.json({
                    success: true,
                })
            } else {
                res.json({
                    success: false,
                    error: 'failed to submit publish'
                })
            }
        })

        this.app.post('/contract/method/update', cors(adminServerCorsOptions), async (req, res) => {
            const type = req.body.type;
            if (type !== 'knowledge' && type !== 'application') {
                res.json({
                    success: false,
                    error: 'invalid type'
                })
                return;
            }
            const pvk = req.body.pvk;
            const updateFromCid = req.body.updateFromCid;
            const updateToCid = req.body.updateToCid;
            if (!pvk || !updateFromCid || !updateToCid) {
                res.json({
                    success: false,
                    error: 'invalid params'
                })
                return;
            }
            const result = await this.knownoknownLocalContractServer.submitUpdate(type, updateFromCid, updateToCid, pvk);
            if (result) {
                res.json({
                    success: true,
                })
            } else {
                res.json({
                    success: false,
                    error: 'failed to submit publish'
                })
            }
        })
    }

    // routers for trustless gateway
    async handleCarHead(req: express.Request, res: express.Response) { 
        let options = new TrustlessGatewayCarOptions();
        try {
            options.parseParams(req, this.knowledgeDB);
            const carReader = await options.getCar();
            res.status(options.getRepStatusCode());
            let totalSize = 0;
            for await (const buf of carReader) {
                totalSize += buf.length;
            }
            options.setContentLength(totalSize);
            setHeaders(res, options.getResponseHeaders());
            res.end();
        } catch (error) {
            console.log("error:", error.message);
            res.status(options.getRepStatusCode()).send(error.message);
        }
    }

    async handleCarGet(req: express.Request, res: express.Response) {
        let options = new TrustlessGatewayCarOptions();
        try {
            options.parseParams(req, this.knowledgeDB);
            const carReader = await options.getCar();
            setHeaders(res, options.getResponseHeaders());
            res.status(options.getRepStatusCode());
            for await (const buf of carReader) {
                res.write(buf);
            }
            res.end();
        } catch (error) {
            console.log("error:", error.message);
            res.status(options.getRepStatusCode()).send(error.message);
        }
    }
    
    async handleRawGet(req: express.Request, res: express.Response) {
        let options = new TrustlessGatewayRawOptions();
        try {
            options.parseParams(req, this.knowledgeDB);
            const rawBlock = await options.getRaw();
            setHeaders(res, options.getResponseHeaders());
            res.status(options.getRepStatusCode());
            res.write(rawBlock);
            res.end();
        } catch (error) {
            console.log("error:", error.message);
            res.status(options.getRepStatusCode()).send(error.message);
        }
    }

    async handleRawHead(req: express.Request, res: express.Response) { 
        let options = new TrustlessGatewayRawOptions();
        try {
            options.parseParams(req, this.knowledgeDB);
            const rawBlock = await options.getRaw();
            res.status(options.getRepStatusCode());
            let totalSize = rawBlock.length;
            options.setContentLength(totalSize);
            setHeaders(res, options.getResponseHeaders());
            res.end();
        } catch (error) {
            console.log("error:", error.message);
            res.status(options.getRepStatusCode()).send(error.message);
        }
    }

    private async initTrustlessGateway() {
        
        // head 与 options 比较特殊，必须定义在 get 等方法之前，否则会默认匹配到 get 等方法路由
        // work for car type request
        // 箭头函数是为了 bind this.
        this.app.head('/ipfs/:cid/*?', cors(trustlessGatewayCorsOptions), (req, res) => this.handleCarHead(req, res))

        // work for car type request
        this.app.get('/ipfs/:cid/*?', cors(trustlessGatewayCorsOptions), (req, res) => this.handleCarGet(req, res))

        this.app.head('/ipfs/:cid', cors(trustlessGatewayCorsOptions), (req, res) => {
            let reqType: string;
            try {   // 检查请求类型是 car 还是 raw
                reqType = checkReqType(req);
                if (reqType === 'car') {    // 处理 car 请求
                    this.handleCarHead(req, res);
                } else {    // 处理 raw 请求
                    this.handleRawHead(req, res);
                }
            } catch (error) {   // invalid accept header
                res.status(400).send(error.message);
            }
        })

        this.app.get('/ipfs/:cid', cors(trustlessGatewayCorsOptions), async (req, res) => {  // work for raw
            let reqType: string;
            try {   // 检查请求类型是 car 还是 raw
                reqType = checkReqType(req);
                if (reqType === 'car') {    // 处理 car 请求
                    this.handleCarGet(req, res);
                } else {    // 处理 raw 请求
                    this.handleRawGet(req, res);
                }
            } catch (error) {   // invalid accept header
                res.status(400).send(error.message);
            }
        })

        // this.app.get('/ipns/:key/?', (req, res) => {
        //     res.send("hi ipns!")
        // })

        // this.app.get('/ipns/:key/?', (req, res) => {
        //     res.sendStatus(200);
        // })
    }
    
    private async initDelegatedRoutingV1HTTP() {}
}
