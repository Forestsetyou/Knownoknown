// import { pinDatabase } from './pinDatabase.js';
import { HeliaLibp2p, Pin } from 'helia';
import { Libp2p } from 'libp2p';
import { ServiceMap } from '@libp2p/interface';
import { unixfs, UnixFS } from '@helia/unixfs'
import { dagCbor, DAGCBOR } from '@helia/dag-cbor'
import { car, Car } from '@helia/car'
import { createMyHelia } from './utils.js';
import { CID } from 'multiformats/cid'
import { Knownoknown_Entry, Knowledge_List_Entry, Notice_Entry, Application_Entry, Comment_Entry, Star_Enrty, Knowledge_Comment_Index_Entry, Fingerprint_Index_Entry, Knowledge_Metadata_Index_Entry, Knowledge_Checkreport_Index_Entry, Knownoknown_Metadata, Notice_Record, User_Notice } from './interface/knownoknownDag/knownoknownDagInterface.js';
import { KnownoknownDagManager, KnownoknownFingerprintGenerator, TempImgRManager } from './interface/knownoknownDag/knownoknownDagManager.js';
import { IMAGE_DATA_TYPE, Code_Link_Format_Regex, Knowledge_Check_Pack, Knowledge_Entry, Knowledge_Metadata, Fingerprint_Data } from './interface/knownoknownDag/knowledgeEntryDagInterface.js';
import { DAGCid, DAGProver, Field } from 'knownoknown-contract';
import { CarReader } from '@ipld/car'
import { SimHash, TextSimilarity, TextScore } from "./interface/fingerprintProcess/textFingerprint.js";
import { PHash, ImageSimilarity, ImageScore } from './interface/fingerprintProcess/imageFingerprint.js'
import { streamToBuffer } from './utils.js'
import { Winnowing, CodeSimilarity, CodeScore } from './interface/fingerprintProcess/codeFingerprint.js';

export class KnowledgeDBServer {
    private helia: HeliaLibp2p<Libp2p<ServiceMap>>;
    private fs: UnixFS;
    private dagCbor: DAGCBOR;
    private car: Car;
    private statusFlagCID: CID;
    private knownoknownDagManager: KnownoknownDagManager;
    private tempImgRManager: TempImgRManager;

    constructor() {}

    async initialize() {
        this.helia = await createMyHelia();
        this.fs = unixfs(this.helia)
        this.dagCbor = dagCbor(this.helia)
        this.car = car(this.helia)
        this.knownoknownDagManager = new KnownoknownDagManager(this.helia);
        this.tempImgRManager = new TempImgRManager(this.helia);
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
            pure_text_fingerprint: {},
            code_section_fingerprint: {},
            image_fingerprint: {},
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
    
    // 以下是知识数据管理方法

    async addUserNotice(notice_record: Notice_Record) {
        const noticeEntry: Notice_Entry = (await this.dagCborGet(this.knownoknownDagManager.getCidNoticeEntry())) as Notice_Entry;
        const userNoticeListCID = noticeEntry.user_notice_list[notice_record.user];
        if (!userNoticeListCID) {
            const newUserNoticeList = [notice_record];
            console.log("newUserNoticeList:", newUserNoticeList);
            const newUserNoticeListCID = await this.dagCbor.add(newUserNoticeList);
            noticeEntry.user_notice_list[notice_record.user] = newUserNoticeListCID;
        } else {
            const userNoticeList: User_Notice = await this.dagCbor.get(userNoticeListCID) as User_Notice;
            userNoticeList.push(notice_record);
            console.log("userNoticeList:", userNoticeList);
            const newUserNoticeListCID = await this.dagCbor.add(userNoticeList);
            noticeEntry.user_notice_list[notice_record.user] = newUserNoticeListCID;
        }
        const newNoticeEntryCID = await this.dagCbor.add(noticeEntry);
        await this.knownoknownDagManager.setNoticeEntry(newNoticeEntryCID);
        console.log("new noticeEntry:", noticeEntry);
        const metadata: Knownoknown_Metadata = (await this.dagCborGet(this.knownoknownDagManager.getCidMetadata())) as Knownoknown_Metadata;
        metadata.notices_num = metadata.notices_num + 1;
        const newMetadataCID = await this.dagCbor.add(metadata);
        await this.knownoknownDagManager.setMetadata(newMetadataCID);
        console.log("new metadata:", metadata);
    }

    async publishKnowledge(knowledgeCheckPackCarBytes: Uint8Array, publishedCIDHash: string) {
        // 读取知识数据
        const carReader = await CarReader.fromBytes(knowledgeCheckPackCarBytes);
        const knowledgeCheckPackCid = (await carReader.getRoots())[0];
        await this.car.import(carReader);
        await this.knownoknownDagManager.pinAdd(knowledgeCheckPackCid);
        // 省略校验知识数据的有效性
        // ...

        // 直接将知识归档发布
        // 读取知识数据
        const knowledgeCheckPack: Knowledge_Check_Pack = (await this.dagCborGet(knowledgeCheckPackCid)) as Knowledge_Check_Pack;
        const knowledgeEntryCID = knowledgeCheckPack.knowledge_entry;
        console.log("uploadCID:", knowledgeEntryCID.toString());
        const knowledgeEntry: Knowledge_Entry = (await this.dagCborGet(knowledgeEntryCID)) as Knowledge_Entry;
        const knowledgeMetadataCID = knowledgeEntry.metadata;
        const knowledgeMetadata: Knowledge_Metadata = (await this.dagCborGet(knowledgeMetadataCID)) as Knowledge_Metadata;
        const fingerprintDataCID = knowledgeEntry.fingerprint_data;
        const fingerprintData: Fingerprint_Data = (await this.dagCborGet(fingerprintDataCID)) as Fingerprint_Data;

        // 检查CIDHash
        const nowDAGCid = DAGCid.parseCID(knowledgeEntryCID)
        const nowCIDHash = nowDAGCid.toHash()
        if (nowCIDHash.toString() !== publishedCIDHash) {
            return {
                success: false,
                noticeRecord: null,
                newMerkleRoot: null,
                newDagProver: null,
            }
        }

        // 读取平台metadata
        const metadata: Knownoknown_Metadata = (await this.dagCborGet(this.knownoknownDagManager.getCidMetadata())) as Knownoknown_Metadata;

        // 生成发布数组
        const newDagArr = await this.generateDAGCidArray('knowledge');
        const newDagProver = DAGProver.structProver(newDagArr, metadata.knowledge_num, nowDAGCid);
        console.log("newDagArr:", newDagArr);
        console.log("index:", metadata.knowledge_num);
        console.log("structCid:", knowledgeEntryCID.toString());
        console.log("structCidHash:", nowDAGCid.toHash().toString());
        const newMerkleRoot = DAGProver.calculateNewMerkleRoot(newDagArr, metadata.knowledge_num, nowDAGCid);

        // 更新knowledgeListEntry
        const knowledgeListEntry: Knowledge_List_Entry = (await this.dagCborGet(this.knownoknownDagManager.getCidKnowledgeListEntry())) as Knowledge_List_Entry;
        knowledgeListEntry.knowledge_entry_list.push(knowledgeEntryCID);
        const newKnowledgeListEntryCID = await this.dagCbor.add(knowledgeListEntry);
        await this.knownoknownDagManager.setKnowledgeListEntry(newKnowledgeListEntryCID);
        await this.knownoknownDagManager.pinRm(knowledgeCheckPackCid);
        console.log("new knowledgeListEntry:", knowledgeListEntry);

        // 更新平台的metadata
        const knowledgeID = knowledgeMetadata.id;
        metadata.knowledge_num = metadata.knowledge_num + 1;
        if (knowledgeMetadata.sale_volume === 0) {
            metadata.free_num = metadata.free_num + 1;
        }
        const newMetadataCID = await this.dagCbor.add(metadata);
        await this.knownoknownDagManager.setMetadata(newMetadataCID);
        console.log("new metadata:", metadata);

        // 更新索引
        // 更新检测报告索引
        const knowledgeCheckreportIndexEntry: Knowledge_Checkreport_Index_Entry = (await this.dagCborGet(this.knownoknownDagManager.getCidKnowledgeCheckreportIndexEntry())) as Knowledge_Checkreport_Index_Entry;
        knowledgeCheckreportIndexEntry.knowledge_checkreport_index_list.push(knowledgeEntry.check_report.toString());
        const newKnowledgeCheckreportIndexEntryCID = await this.dagCbor.add(knowledgeCheckreportIndexEntry);
        await this.knownoknownDagManager.setKnowledgeCheckreportIndexEntry(newKnowledgeCheckreportIndexEntryCID);
        console.log("new knowledgeCheckreportIndexEntry:", knowledgeCheckreportIndexEntry);

        // 更新知识元数据索引
        const knowledgeMetadataIndexEntry: Knowledge_Metadata_Index_Entry = (await this.dagCborGet(this.knownoknownDagManager.getCidKnowledgeMetadataIndexEntry())) as Knowledge_Metadata_Index_Entry;
        knowledgeMetadataIndexEntry.knowledge_metadata_index_list.push(knowledgeMetadataCID.toString());
        const newKnowledgeMetadataIndexEntryCID = await this.dagCbor.add(knowledgeMetadataIndexEntry);
        await this.knownoknownDagManager.setKnowledgeMetadataIndexEntry(newKnowledgeMetadataIndexEntryCID);
        console.log("new knowledgeMetadataIndexEntry:", knowledgeMetadataIndexEntry);

        // 更新指纹索引
        const fingerprintIndexEntryCID = this.knownoknownDagManager.getCidFingerprintIndexEntry();
        const fingerprintIndexEntry: Fingerprint_Index_Entry = (await this.dagCborGet(fingerprintIndexEntryCID)) as Fingerprint_Index_Entry;
        fingerprintIndexEntry.pure_text_fingerprint[knowledgeID] = fingerprintData.pure_text_fingerprint.toString();
        fingerprintIndexEntry.code_section_fingerprint[knowledgeID] = fingerprintData.code_section_fingerprint.toString();
        fingerprintIndexEntry.image_fingerprint[knowledgeID] = fingerprintData.image_fingerprint.toString();
        const newFingerprintIndexEntryCID = await this.dagCbor.add(fingerprintIndexEntry);
        await this.knownoknownDagManager.setFingerprintIndexEntry(newFingerprintIndexEntryCID);
        console.log("new fingerprintIndexEntry:", fingerprintIndexEntry);

        // 更新总索引
        // 更新base_entry
        const knownoknownEntry: Knownoknown_Entry = (await this.dagCborGet(this.knownoknownDagManager.getCidKnownoknownEntry())) as Knownoknown_Entry;
        knownoknownEntry.base_entry.metadata = newMetadataCID;
        knownoknownEntry.base_entry.knowledge_list_entry = newKnowledgeListEntryCID;
        // 更新index_entry
        knownoknownEntry.index_entry.fingerprint_index_entry = newFingerprintIndexEntryCID;
        knownoknownEntry.index_entry.knowledge_metadata_index_entry = newKnowledgeMetadataIndexEntryCID;
        knownoknownEntry.index_entry.knowledge_checkreport_index_entry = newKnowledgeCheckreportIndexEntryCID;
        const newKnownoknownEntryCID = await this.dagCbor.add(knownoknownEntry);
        await this.knownoknownDagManager.setKnownoknownEntry(newKnownoknownEntryCID);
        console.log("new knownoknownEntry:", knownoknownEntry);

        const noticeRecord: Notice_Record = {
            id: metadata.notices_num,
            user: knowledgeMetadata.author,
            content: `您的知识实体《${knowledgeMetadata.title}》(${knowledgeID})已成功发布`,
            timestamp: Date.now()
        }

        return {
            success: true,
            noticeRecord: noticeRecord,
            newMerkleRoot: newMerkleRoot as Field,
            newDagProver: newDagProver,
        }
    }

    async extractFingerprintDataFromKnowledgeDataCar(knowledgeDataCarBytes: Uint8Array) {
        const carReader = await CarReader.fromBytes(knowledgeDataCarBytes);
        const knowledgeDataCid = (await carReader.getRoots())[0];
        await this.car.import(carReader);
        const knownoknownFingerprintGenerator = new KnownoknownFingerprintGenerator(this.helia, knowledgeDataCid);
        await knownoknownFingerprintGenerator.initialize();
        const knowledgeData = (await this.dagCbor.get(knowledgeDataCid)) as any;
        const pureTextArr: string[] = [];
        const imageFingerprint = {
            fingerprint: {},
            self_description: "Image_Fingerprint",
            knowledge_id: knowledgeDataCid.toString()
        }
        const codeFingerprint = {
            fingerprint: {},
            self_description: "Code_Section_Fingerprint",
            knowledge_id: knowledgeDataCid.toString()
        }
        for (const chapter of knowledgeData.chapters) {
            const chapterData = (await this.dagCbor.get(chapter)) as any;
            pureTextArr.push(chapterData.ipfs_markdown_data);
            for (const imageLink in chapterData.images) {
                const imageReader = this.fs.cat(chapterData.images[imageLink])
                const imageData = await streamToBuffer(imageReader);
                const imageFingerprintData = await PHash(imageData, `${imageLink}.${IMAGE_DATA_TYPE.split("/")[1]}`);
                imageFingerprint.fingerprint[chapterData.images[imageLink].toString()] = imageFingerprintData;
            }
            console.log("chapterData.code_sections:", chapterData.code_sections);
            for (const codeLink in chapterData.code_sections) {
                const codeReader = this.fs.cat(chapterData.code_sections[codeLink])
                const code = new TextDecoder().decode(await streamToBuffer(codeReader));
                const localRegex = new RegExp(Code_Link_Format_Regex, "g");
                const codeType = localRegex.exec(codeLink)?.[1];
                const codeFingerprintData = Winnowing(code, codeType);
                codeFingerprint.fingerprint[(chapterData.code_sections[codeLink]).toString()] = {
                    type: codeType,
                    fingerprint: codeFingerprintData
                };
            }
        }
        const pureText = pureTextArr.join("\n");
        const pureTextCID = await this.fs.addBytes(new TextEncoder().encode(pureText));
        const pureTextFingerprintData = SimHash(pureText);
        const pureTextFingerprint = {
            fingerprint: {
                [pureTextCID.toString()]: pureTextFingerprintData
            },
            self_description: "Pure_Text_Fingerprint",
            knowledge_id: knowledgeDataCid.toString()
        }
        const pureTextFingerprintCid = await this.dagCbor.add(pureTextFingerprint);
        await knownoknownFingerprintGenerator.setPureTextFingerprint(pureTextFingerprintCid);
        const imageFingerprintCid = await this.dagCbor.add(imageFingerprint);
        await knownoknownFingerprintGenerator.setImageFingerprint(imageFingerprintCid);
        const codeFingerprintCid = await this.dagCbor.add(codeFingerprint);
        console.log("codeFingerprint:", codeFingerprint);
        await knownoknownFingerprintGenerator.setCodeSectionFingerprint(codeFingerprintCid);
        const fingerprintData = {
            code_section_fingerprint: codeFingerprintCid,
            image_fingerprint: imageFingerprintCid,
            pure_text_fingerprint: pureTextFingerprintCid,
            knowledge_data_cid_str: knowledgeDataCid.toString()
        }
        const fingerprintDataCid = await this.dagCbor.add(fingerprintData);
        const carStreamReader = this.car.stream(fingerprintDataCid)
        const carBytes = new Uint8Array(await streamToBuffer(carStreamReader));
        await knownoknownFingerprintGenerator.clear();
        return carBytes;
    }

    async addTempImgPack(tempImgPackCarBytes: Uint8Array) {
        const carReader = await CarReader.fromBytes(tempImgPackCarBytes);
        const tempImgPackCid = (await carReader.getRoots())[0];
        await this.car.import(carReader);
        await this.tempImgRManager.addTempImgPack(tempImgPackCid);
        const tempImgPack = (await this.dagCbor.get(tempImgPackCid)) as any;
        console.log("add temp img pack success:", tempImgPackCid.toString());
        console.log("tempImgPack:", tempImgPack);
        return {
            success: true,
            cid: tempImgPackCid.toString(),
        };
    }

    async removeTempImgPack(tempImgPackCid: CID) {
        await this.tempImgRManager.removeTempImgPack(tempImgPackCid);
        return true;
    }

    // 以下是合约电路需要的方法
    async generateDAGCidArray(type: 'knowledge' | 'application'): Promise<Array<DAGCid>> {
        switch (type) {
            case 'knowledge': {
                const knowledgeListEntry: Knowledge_List_Entry = await this.dagCbor.get(this.knownoknownDagManager.getCidKnowledgeListEntry())
                const dagCidArray: Array<DAGCid> = [];
                for (const knowledgeCID of knowledgeListEntry.knowledge_entry_list) {
                    console.log("knowledgeCID:", knowledgeCID.toString());
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

    async fsCatBytes(cid: CID): Promise<Buffer> {  // 获取dag-cbor对象, 需提前确定cid的code为dag-cbor
        const fsBytesReader = this.fs.cat(cid, {
            signal: AbortSignal.timeout(3000)
        });
        const fsBytes = await streamToBuffer(fsBytesReader);
        return fsBytes;
    }
}