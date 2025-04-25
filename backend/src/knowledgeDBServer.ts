// import { pinDatabase } from './pinDatabase.js';
import { HeliaLibp2p } from 'helia';
import { Libp2p } from 'libp2p';
import { ServiceMap } from '@libp2p/interface';
import { unixfs, UnixFS } from '@helia/unixfs'
import { dagCbor, DAGCBOR } from '@helia/dag-cbor'
import { car, Car } from '@helia/car'
import { createMyHelia } from './utils.js';
import { CID } from 'multiformats/cid'
import { Knownoknown_Entry, Knowledge_List_Entry, Notice_Entry, Application_Entry, Comment_Entry, Star_Enrty, Knowledge_Comment_Index_Entry, Fingerprint_Index_Entry, Knowledge_Metadata_Index_Entry, Knowledge_Checkreport_Index_Entry, Knownoknown_Metadata } from './interface/knownoknownDag/knownoknownDagInterface.js';

export class KnowledgeDBServer {
    private helia: HeliaLibp2p<Libp2p<ServiceMap>>;
    private fs: UnixFS;
    private dagCbor: DAGCBOR;
    private car: Car;
    
    private knownoknown_entry?: Knownoknown_Entry;
    private knowledge_list_entry?: Knowledge_List_Entry;
    private notice_entry?: Notice_Entry;
    private application_entry?: Application_Entry;
    private comment_entry?: Comment_Entry;
    private star_entry?: Star_Enrty;
    private knowledge_comment_index_entry?: Knowledge_Comment_Index_Entry;
    private fingerprint_index_entry?: Fingerprint_Index_Entry;
    private knowledge_metadata_index_entry?: Knowledge_Metadata_Index_Entry;
    private knowledge_checkreport_index_entry?: Knowledge_Checkreport_Index_Entry;

    private knownoknown_entry_cid?: CID;

    constructor() {}

    async initialize() {
        this.helia = await createMyHelia();
        this.fs = unixfs(this.helia)
        this.dagCbor = dagCbor(this.helia)
        this.car = car(this.helia)
        await this.addTrustlessGatewayExampleData();
        await this.createNewDB();
        
        // ... 其他初始化逻辑 ...
    }

    private async createNewDB() {   // 创建新的、完整的 Knowledge Dag Storage
        console.log("--------------create new db--------------");
        
        this.star_entry = {};   // 初始化收藏记录
        this.comment_entry = [];   // 初始化评论记录
        this.application_entry = [];   // 初始化请求记录
        this.notice_entry = {   // 初始化通知记录
            user_notice_list: {},   // 用户通知列表
            platform_notice_list: []   // 平台通知列表
        }
        this.knowledge_list_entry = [];   // 初始化知识列表
        this.fingerprint_index_entry = {   // 初始化指纹索引
            pure_text_fingerprint: [],
            code_section_fingerprint: [],
            image_fingerprint: [],
        }
        this.knowledge_metadata_index_entry = [];   // 初始化知识元数据索引
        this.knowledge_checkreport_index_entry = [];   // 初始化知识检测报告索引
        this.knowledge_comment_index_entry = [];   // 初始化知识评论索引
        
        this.knownoknown_entry = {
            base_entry: {
                metadata: await this.dagCbor.add({
                    knowledge_num: 0,
                    free_num: 0,
                    report_num: 0,
                    notices_num: 0,
                    comment_num: 0,
                    application_num: 0
                }),
                knowledge_list_entry: await this.dagCbor.add(this.knowledge_list_entry),
                notice_entry: await this.dagCbor.add(this.notice_entry),
                application_entry: await this.dagCbor.add(this.application_entry),
                comment_entry: await this.dagCbor.add(this.comment_entry),
            },
            index_entry: {
                fingerprint_index_entry: await this.dagCbor.add(this.fingerprint_index_entry),
                knowledge_metadata_index_entry: await this.dagCbor.add(this.knowledge_metadata_index_entry),
                knowledge_comment_index_entry: await this.dagCbor.add(this.knowledge_comment_index_entry),
                knowledge_checkreport_index_entry: await this.dagCbor.add(this.knowledge_checkreport_index_entry),
            },
        }
        this.knownoknown_entry_cid = await this.dagCbor.add(this.knownoknown_entry)
        
        for await (const pinnedCID of this.helia.pins.add(this.knownoknown_entry_cid, {
            metadata: {
                name: "knownoknown_entry",
                description: "create new knownoknown_entry",
                type: "dag-cbor",
                timestamp: Date.now(),
            }
        })) {
            console.log("pinnedCID:", pinnedCID);
        }

        console.log("--------------create new db end--------------");
    }

    // 以下是初始化 knowledge_db 的方法
    async createNewKnownoknown_Metadata(): Promise<CID> {
        const metadataCID = await this.dagCbor.add({
            knowledge_num: 0,
            free_num: 0,
            report_num: 0,
            notices_num: 0,
            comment_num: 0,
            application_num: 0
        })
        return metadataCID;
    }

    private async addTrustlessGatewayExampleData() {
        console.log("--------------add example data--------------");
        const test_cid_1 = await this.fs.addBytes(new TextEncoder().encode("hello world 1"))
        console.log("test_1_data:", "hello world 1");
        console.log("test_1_cid:", test_cid_1);
        const test_cid_2 = await this.fs.addBytes(new TextEncoder().encode("hello world 2"))
        console.log("test_2_data:", "hello world 2");
        console.log("test_2_cid:", test_cid_2);
        const dag_1 = {
            data1: test_cid_1,
        }
        const dagCid_1 = await this.dagCbor.add(dag_1)
        console.log("dag_1_data:", JSON.stringify(dag_1, null, 2));
        console.log("dag_1_cid:", dagCid_1);
        const dag_2 = {
            dataLink1: dagCid_1,
            data2: test_cid_2
        }
        const dagCid_2 = await this.dagCbor.add(dag_2)
        console.log("dag_2_data:", JSON.stringify(dag_2, null, 2));
        console.log("dag_2_cid:", dagCid_2);

        const dag_3 = {
            dataLink1: dagCid_1.toString(),
            data2: test_cid_2
        }
        const dagCid_3 = await this.dagCbor.add(dag_3)
        console.log("dag_3_data:", JSON.stringify(dag_3, null, 2));
        console.log("dag_3_cid:", dagCid_3);
        console.log("--------------add example data end--------------");
    }

    // 以下是合约需要的方法
    async getKnownoknown_Entry_CID(): Promise<CID> {
        return this.knownoknown_entry_cid;
    }

    // 以下是 trustless gateway 需要的方法, 本质是 helia 方法的封装
    async blockHas(cid: CID): Promise<boolean> {  // 获取block对象
        const hasBlock = await this.helia.blockstore.has(cid);
        return hasBlock;
    }

    async carGet(cid: CID): Promise<AsyncGenerator<Uint8Array>> {  // 获取car对象
        const carReadStream = await this.car.stream(cid);
        return carReadStream;
    }

    async blockGet(cid: CID): Promise<Uint8Array> {  // 获取block对象
        const rawBlock = await this.helia.blockstore.get(cid);
        return rawBlock;
    }

    async dagCborGet(cid: CID): Promise<any> {  // 获取dag-cbor对象, 需提前确定cid的code为dag-cbor
        const dagCborObj = await this.dagCbor.get(cid);
        return dagCborObj;
    }
}