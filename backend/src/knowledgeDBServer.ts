// import { pinDatabase } from './pinDatabase.js';
import { HeliaLibp2p, Pin } from 'helia';
import { Libp2p } from 'libp2p';
import { ServiceMap } from '@libp2p/interface';
import { unixfs, UnixFS } from '@helia/unixfs'
import { dagCbor, DAGCBOR } from '@helia/dag-cbor'
import { car, Car } from '@helia/car'
import { createMyHelia } from './utils.js';
import { CID } from 'multiformats/cid'
import { Knownoknown_Entry, Knowledge_List_Entry, Notice_Entry, Application_Entry, Comment_Entry, Star_Enrty, Knowledge_Comment_Index_Entry, Fingerprint_Index_Entry, Knowledge_Metadata_Index_Entry, Knowledge_Checkreport_Index_Entry, Knownoknown_Metadata } from './interface/knownoknownDag/knownoknownDagInterface.js';
import { KnownoknownDagManager } from './interface/knownoknownDag/knownoknownDagManager.js';
import { DAGCid } from 'knownoknown-contract';

export class KnowledgeDBServer {
    private helia: HeliaLibp2p<Libp2p<ServiceMap>>;
    private fs: UnixFS;
    private dagCbor: DAGCBOR;
    private car: Car;
    private statusFlagCID: CID;
    private knownoknownDagManager: KnownoknownDagManager;

    constructor() {}

    async initialize() {
        this.helia = await createMyHelia();
        this.fs = unixfs(this.helia)
        this.dagCbor = dagCbor(this.helia)
        this.car = car(this.helia)
        this.knownoknownDagManager = new KnownoknownDagManager(this.helia);
        await this.addTrustlessGatewayExampleData();
        await this.initDB();
        // ... 其他初始化逻辑 ...
    }
    
    // 以下是初始化 knowledge_db 的方法
    private async createStatusFlag() {
        const statusFlag = "KnownoknownStatusFlag";
        const statusFlagCID = await this.fs.addBytes(new TextEncoder().encode(statusFlag));
        for await (const pinnedCID of this.helia.pins.add(statusFlagCID, {
            metadata: {
                name: "statusFlag",
                description: "Knownoknown status flag",
                timestamp: Date.now(),
            },
        })) {
            console.log("StatusFlagAdded:", pinnedCID);
        }
        this.statusFlagCID = statusFlagCID;
    }

    private async initDB() {
        const pinList: Array<Pin> = []
        for await (const pinnedCID of this.helia.pins.ls()) {
            pinList.push(pinnedCID)
            console.log("pinnedCID:", pinnedCID);
        }
        if (pinList.length > 0) {
            await this.loadDB(pinList)
            const statusFlag = "KnownoknownStatusFlag";
            const statusFlagCID = await this.fs.addBytes(new TextEncoder().encode(statusFlag));
            this.statusFlagCID = statusFlagCID;
        } else {
            await this.createNewDB()
            await this.createStatusFlag();
        }
    }

    private async loadDB(pinList: Array<Pin>) {
        console.log("--------------load db--------------");
        await this.knownoknownDagManager.loadFromPinList(pinList)
        console.log("--------------load db end--------------");
    }

    private async createNewDB() {   // 创建新的、完整的 Knowledge Dag Storage
        console.log("--------------create new db--------------");
        const star_entry: Star_Enrty = {
            star_list: {}
        };   // 初始化收藏记录
        const comment_entry: Comment_Entry = {
            comment_list: []
        };   // 初始化评论记录
        const application_entry: Application_Entry = {
            application_list: []
        };   // 初始化请求记录
        const notice_entry: Notice_Entry = {   // 初始化通知记录
            user_notice_list: {},   // 用户通知列表
            platform_notice_list: []   // 平台通知列表
        }
        const knowledge_list_entry: Knowledge_List_Entry = {
            knowledge_entry_list: []
        };   // 初始化知识列表
        const fingerprint_index_entry: Fingerprint_Index_Entry = {   // 初始化指纹索引
            pure_text_fingerprint: [],
            code_section_fingerprint: [],
            image_fingerprint: [],
        }
        const knowledge_metadata_index_entry: Knowledge_Metadata_Index_Entry = {
            knowledge_metadata_index_list: []
        };   // 初始化知识元数据索引
        const knowledge_checkreport_index_entry: Knowledge_Checkreport_Index_Entry = {
            knowledge_checkreport_index_list: []
        };   // 初始化知识检测报告索引
        const knowledge_comment_index_entry: Knowledge_Comment_Index_Entry = {
            knowledge_comment_index_list: []
        };   // 初始化知识评论索引
        const metadata_cid: Knownoknown_Metadata = {
            knowledge_num: 0,
            free_num: 0,
            report_num: 0,
            notices_num: 0,
            comment_num: 0,
            application_num: 0
        };
        await this.knownoknownDagManager.setMetadata(await this.dagCbor.add(metadata_cid));
        await this.knownoknownDagManager.setKnowledgeListEntry(await this.dagCbor.add(knowledge_list_entry));
        await this.knownoknownDagManager.setNoticeEntry(await this.dagCbor.add(notice_entry));
        await this.knownoknownDagManager.setApplicationEntry(await this.dagCbor.add(application_entry));
        await this.knownoknownDagManager.setCommentEntry(await this.dagCbor.add(comment_entry));
        await this.knownoknownDagManager.setStarEntry(await this.dagCbor.add(star_entry));
        await this.knownoknownDagManager.setKnowledgeCommentIndexEntry(await this.dagCbor.add(knowledge_comment_index_entry));
        await this.knownoknownDagManager.setFingerprintIndexEntry(await this.dagCbor.add(fingerprint_index_entry));
        await this.knownoknownDagManager.setKnowledgeMetadataIndexEntry(await this.dagCbor.add(knowledge_metadata_index_entry));
        await this.knownoknownDagManager.setKnowledgeCheckreportIndexEntry(await this.dagCbor.add(knowledge_checkreport_index_entry));

        const knownoknown_entry: Knownoknown_Entry = {
            base_entry: {
                metadata: this.knownoknownDagManager.getCidMetadata(),
                knowledge_list_entry: this.knownoknownDagManager.getCidKnowledgeListEntry(),
                notice_entry: this.knownoknownDagManager.getCidNoticeEntry(),
                application_entry: this.knownoknownDagManager.getCidApplicationEntry(),
                comment_entry: this.knownoknownDagManager.getCidCommentEntry(),
                star_entry: this.knownoknownDagManager.getCidStarEntry(),
            },
            index_entry: {
                fingerprint_index_entry: this.knownoknownDagManager.getCidFingerprintIndexEntry(),
                knowledge_metadata_index_entry: this.knownoknownDagManager.getCidKnowledgeMetadataIndexEntry(),
                knowledge_comment_index_entry: this.knownoknownDagManager.getCidKnowledgeCommentIndexEntry(),
                knowledge_checkreport_index_entry: this.knownoknownDagManager.getCidKnowledgeCheckreportIndexEntry(),
            },
        }
        const newEntryCID = await this.dagCbor.add(knownoknown_entry)
        await this.knownoknownDagManager.setKnownoknownEntry(newEntryCID);
        console.log("--------------create new db end--------------");
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

    // 以下是合约电路需要的方法
    async generateDAGCidArray(type: 'knowledge' | 'application'): Promise<Array<DAGCid>> {
        switch (type) {
            case 'knowledge': {
                const knowledgeListEntry: Knowledge_List_Entry = await this.dagCbor.get(this.knownoknownDagManager.getCidKnowledgeListEntry())
                const dagCidArray: Array<DAGCid> = [];
                for (const knowledgeCID of knowledgeListEntry.knowledge_entry_list) {
                    const dagCid = DAGCid.parseCID(knowledgeCID)
                    dagCidArray.push(dagCid)
                }
                return dagCidArray;
            }
            case 'application': {
                const applicationEntry: Application_Entry = await this.dagCbor.get(this.knownoknownDagManager.getCidApplicationEntry())
                const dagCidArray: Array<DAGCid> = [];
                for (const applicationCID of applicationEntry.application_list) {
                    const dagCid = DAGCid.parseCID(applicationCID)
                    dagCidArray.push(dagCid)
                }
                return dagCidArray;
            }
            default: {
                throw new Error('Invalid type');
            }
        }
    }

    // 以下是合约与管理员后端需要的方法
    async getKnownoknown_Entry_CID(): Promise<CID> {
        return this.knownoknownDagManager.getCidKnownoknownEntry();
    }

    getStatusFlagCID(): CID {
        return this.statusFlagCID;
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