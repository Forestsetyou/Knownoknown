// import { pinDatabase } from './pinDatabase.js';
import { Helia } from '@helia/http';
import { unixfs, UnixFS } from '@helia/unixfs'
import { dagCbor, DAGCBOR } from '@helia/dag-cbor'
import { car, Car } from '@helia/car'
import { CID } from 'multiformats/cid'
import { CarReader } from '@ipld/car'
import { createMyHeliaHTTP, streamToUint8Array } from '../interface/utils';
import { Knownoknown_Entry, Knowledge_List_Entry, Notice_Entry, Application_Entry, Comment_Entry, Star_Enrty, Knowledge_Comment_Index_Entry, Fingerprint_Index_Entry, Knowledge_Metadata_Index_Entry, Knowledge_Checkreport_Index_Entry, Knownoknown_Metadata } from '../interface/knownoknownDag/knownoknownDagInterface';
import { Knowledge_Chapter_Data, Custom_Link_Format, Code_Type, Image_Link_Format_Regex, Code_Link_Format_Regex, Code_Section_Regex, Code_Section_Data, Md_Data } from '../interface/knownoknownDag/knowledgeEntryDagInterface';
import { KnownoknownDagManagerClient, KnowledgeCheckPackManagerClient } from '../interface/knownoknownDag/knownoknownDagManager';
import { DAGCid } from 'knownoknown-contract';
import { TextSimilarity, TextScore } from '../interface/fingerprintProcess/textFingerprint';
import { CodeSimilarity, CodeScore } from '../interface/fingerprintProcess/codeFingerprint';
import { ImageSimilarity, ImageScore } from '../interface/fingerprintProcess/imageFingerprint';
import { gcm } from '@noble/ciphers/aes';


const TIMEOUT = 10000;  // 10 seconds
interface IpfsServiceInit {
    httpGatewayRoutingURL: string;
    knownoknownEntryCID: string;
    statusFlagCID: string;
}

enum IpfsServerStatus {
    UNKNOWN = 'unknown',
    ONLINE = 'online',
    OFFLINE = 'offline',
}

interface IpfsServiceStatus {
    status: IpfsServerStatus;
    httpGatewayRoutingURL: string;
    statusFlagCID: string;
    knownoknownEntryCID: string;
}

class IpfsService {
    private helia: Helia;
    private fs: UnixFS;
    private dagCbor: DAGCBOR;
    private car: Car;
    private httpGatewayRoutingURL: string;
    private statusFlagCID: string;
    
    private knownoknownDagManager: KnownoknownDagManagerClient;
    private knowledgeCheckPackManager: KnowledgeCheckPackManagerClient;

    constructor() {}

    async parseCodeLink(md_data: Md_Data, code_link_cids: Record<string, CID>) {
        let new_data = md_data;
        for (const code_link in code_link_cids) {
            const code_data_reader = this.fs.cat(code_link_cids[code_link]);
            const code_data_uint8array = await streamToUint8Array(code_data_reader);
            const localRegex = new RegExp(Code_Link_Format_Regex.source, 'g');
            const code_type = localRegex.exec(code_link)?.[1];
            if (!code_type) {
                console.log('code_link', code_link);
                throw new Error('Invalid code link');
            }
            const code_data = `\`\`\`${code_type}\n${new TextDecoder().decode(code_data_uint8array)}\n\`\`\``;
            new_data = new_data.replace(code_link, code_data);
        }
        return new_data;
    }

    async extractCodeLink(md_data: Md_Data) {
        console.log('extractCodeLink', md_data);
        const localRegex = new RegExp(Code_Section_Regex.source, 'g');
        const matches = md_data.matchAll(localRegex);
        const code_link_cids: Record<string, CID> = {};

        let new_data = md_data;
        for (const match of matches) {
            const code_type = match[1];
            const code_data = match[2];
            const code_cid = await this.fs.addBytes(new TextEncoder().encode(code_data));
            const code_link = Custom_Link_Format.CODE.replace('CID', code_cid.toString()).replace('type', code_type);
            code_link_cids[code_link] = code_cid;
            new_data = new_data.replace(match[0], code_link);
        }
        return [new_data, code_link_cids];
    }

    async extractImageLink(md_data: Md_Data) {
        const localRegex = new RegExp(Image_Link_Format_Regex.source, 'g');
        const matches = md_data.matchAll(localRegex);
        const image_link_cids: Record<string, CID> = {};

        for (const match of matches) {
            const image_description = match[1];
            const image_cid = match[2];
            const image_link = match[0];
            image_link_cids[image_link] = CID.parse(image_cid);
        }
        return image_link_cids;
    }

    async initialize(init: IpfsServiceInit) {
        this.httpGatewayRoutingURL = init.httpGatewayRoutingURL;
        if (this.helia) {
            await this.helia.stop();
        }
        this.helia = await createMyHeliaHTTP(this.httpGatewayRoutingURL);
        this.statusFlagCID = init.statusFlagCID;
        this.fs = unixfs(this.helia)
        this.dagCbor = dagCbor(this.helia)
        this.car = car(this.helia)
        this.knownoknownDagManager = new KnownoknownDagManagerClient(this.helia);
        this.knowledgeCheckPackManager = new KnowledgeCheckPackManagerClient(this.helia);

        const knownoknownEntryCID = CID.parse(init.knownoknownEntryCID);
        await this.dagCborGet(knownoknownEntryCID);
        await this.knownoknownDagManager.setKnownoknownEntry(knownoknownEntryCID);
        this.helia.gc()
    }

    async resetKnownoknownDag(knownoknownEntryCIDStr: string) {
        await this.knownoknownDagManager.reset();
        const knownoknownEntryCID = CID.parse(knownoknownEntryCIDStr);
        await this.dagCborGet(knownoknownEntryCID);
        await this.knownoknownDagManager.setKnownoknownEntry(knownoknownEntryCID);
        this.helia.gc()
    }

    async getStatus() {
        const url = this.httpGatewayRoutingURL + '/ipfs/' + this.statusFlagCID;
        let ipfsServiceStatus: IpfsServiceStatus;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/vnd.ipld.raw',
                },
                signal: AbortSignal.timeout(TIMEOUT),
            });
            if (response.status !== 200) {
                ipfsServiceStatus = {
                    status: IpfsServerStatus.OFFLINE,
                    httpGatewayRoutingURL: this.httpGatewayRoutingURL,
                    statusFlagCID: this.statusFlagCID,
                    knownoknownEntryCID: this.knownoknownDagManager.getKnownoknownEntryCID()!.toString(),
                }
                return ipfsServiceStatus;
            }
            ipfsServiceStatus = {
                status: IpfsServerStatus.ONLINE,
                httpGatewayRoutingURL: this.httpGatewayRoutingURL,
                statusFlagCID: this.statusFlagCID,
                knownoknownEntryCID: this.knownoknownDagManager.getKnownoknownEntryCID()!.toString(),
            }
            return ipfsServiceStatus;
        } catch (error) {
            ipfsServiceStatus = {
                status: IpfsServerStatus.OFFLINE,
                httpGatewayRoutingURL: this.httpGatewayRoutingURL,
                statusFlagCID: this.statusFlagCID,
                knownoknownEntryCID: this.knownoknownDagManager.getKnownoknownEntryCID()!.toString(),
            }
            return ipfsServiceStatus;
        }
    }

    async getKnowledgeIdTitles() {
        const knownoknownEntryCID = this.knownoknownDagManager.getKnownoknownEntryCID()!;
        const knownoknownEntry = (await this.dagCborGet(knownoknownEntryCID)) as any;
        const knowledgeMetadataIndexEntryCid = knownoknownEntry.index_entry.knowledge_metadata_index_entry;
        const knowledgeMetadataIndexEntry = (await this.dagCborGet(knowledgeMetadataIndexEntryCid)) as any;
        const knowledgeIdTitleMap: Record<string, string> = {};
        for (const knowledgeMetadataCIDStr of knowledgeMetadataIndexEntry.knowledge_metadata_index_list) {
            const knowledgeMetadataCID = CID.parse(knowledgeMetadataCIDStr);
            const knowledgeMetadata = (await this.dagCborGet(knowledgeMetadataCID)) as any;
            knowledgeIdTitleMap[knowledgeMetadata.id] = knowledgeMetadata.title;
        }
        return knowledgeIdTitleMap;
    }

    // 以下是创建新知识用到的函数

    async exportKnowledgeCheckPackManager() {   // 导出知识创建工作流数据
        let knowledgeCheckPackManagerBak;
        if (await this.checkKnowledgeBuilded()) {
            knowledgeCheckPackManagerBak = await this.knowledgeCheckPackManager.exportKnowledgeCheckPackManagerBakPack();
        } else {
            knowledgeCheckPackManagerBak = await this.knowledgeCheckPackManager.exportKnowledgeCheckPackManagerBak();
        }
        const knowledgeCheckPackManagerBakCid = await this.dagCbor.add(knowledgeCheckPackManagerBak);
        await this.knowledgeCheckPackManager.pinAdd(knowledgeCheckPackManagerBakCid);
        const carStreamReader = this.car.stream(knowledgeCheckPackManagerBakCid!);
        const carBytes = await streamToUint8Array(carStreamReader);
        await this.knowledgeCheckPackManager.pinRm(knowledgeCheckPackManagerBakCid);

        const knowledgeMetadataCID = this.knowledgeCheckPackManager.getKnowledgeMetadata();
        let carName = '';
        if (knowledgeMetadataCID) {
            const knowledgeMetadata = (await this.dagCbor.get(knowledgeMetadataCID!)) as any;
            if (knowledgeMetadata.title) {
                carName = `${knowledgeMetadata.title}.car`;
            } else {
                carName = `${knowledgeCheckPackManagerBakCid.toString()}.car`;
            }
        } else {
            carName = `${knowledgeCheckPackManagerBakCid.toString()}.car`;
        }

        return {carName, carBytes};
    }

    async importKnowledgeCheckPackManager(carBytes: Uint8Array) {
        const carReader = await CarReader.fromBytes(carBytes);
        const knowledgeCheckPackManagerBakCid = (await carReader.getRoots())[0];
        if (knowledgeCheckPackManagerBakCid) {
            await this.car.import(carReader);
            console.log("importKnowledgeCheckPackManager pinAdd")
            await this.knowledgeCheckPackManager.pinAdd(knowledgeCheckPackManagerBakCid);
            const knowledgeCheckPackManagerBak = (await this.dagCbor.get(knowledgeCheckPackManagerBakCid)) as any;
            if (knowledgeCheckPackManagerBak.knowledge_check_pack_cid) {
                console.log("importKnowledgeCheckPackManagerBakPack", knowledgeCheckPackManagerBak);
                await this.knowledgeCheckPackManager.importKnowledgeCheckPackManagerBakPack(knowledgeCheckPackManagerBak);
            } else {
                console.log("importKnowledgeCheckPackManagerBak", knowledgeCheckPackManagerBak);
                await this.knowledgeCheckPackManager.importKnowledgeCheckPackManagerBak(knowledgeCheckPackManagerBak);
            }
            console.log("importKnowledgeCheckPackManager pinRm")
            await this.knowledgeCheckPackManager.pinRm(knowledgeCheckPackManagerBakCid);
        } else {
            throw new Error('知识创建工作流数据导入失败');
        }
    }

    async createNewKnowledge(walletAddress: string) {
        console.log("createNewKnowledge");
        await this.knowledgeCheckPackManager.reset();
        const newKnowledgeMetadata = {
            id: '',
            public_order: 0,
            title: '',
            author: walletAddress,
            price: 0,
            sales: 0,
            sale_volume: 0,
            intro: {
                image: null,
                content: '',
            },
            tags: [],
        };
        const newKnowledgeMetadataCID = await this.dagCbor.add(newKnowledgeMetadata);
        await this.knowledgeCheckPackManager.setKnowledgeMetadata(newKnowledgeMetadataCID);
        const newKnowledgeChapterData = {
            id: new Date().getTime(),
            chapter_title: '',
            ipfs_markdown_data: '',
            code_section_num: 0,
            code_sections: [],
            image_num: 0,
            images: [],
        }
        const newKnowledgeChapterDataCID = await this.dagCbor.add(newKnowledgeChapterData);
        await this.knowledgeCheckPackManager.addChapterData(newKnowledgeChapterDataCID);
    }

    async setKnowledgeMetadata(newMetadata: any) {
        let metadata:any = await this.getKnowledgeMetadata();
        const newKnowledgeMetadataCID = await this.dagCbor.add({
            ...metadata,
            ...newMetadata,
        });
        await this.knowledgeCheckPackManager.setKnowledgeMetadata(newKnowledgeMetadataCID);
    }

    async getKnowledgeMetadata() {
        const knowledgeMetadataCID = this.knowledgeCheckPackManager.getKnowledgeMetadata();
        return await this.dagCbor.get(knowledgeMetadataCID!);
    }

    async getKnowledgeChapterData(chapterIndex: number) {
        const knowledgeChapterDataCID = this.knowledgeCheckPackManager.getChapterData(chapterIndex);
        const knowledgeChapterData = (await this.dagCbor.get(knowledgeChapterDataCID)) as any;
        knowledgeChapterData.ipfs_markdown_data = await this.parseCodeLink(knowledgeChapterData.ipfs_markdown_data, knowledgeChapterData.code_sections);
        return knowledgeChapterData;
    }

    async addKnowledgeChapterData(newKnowledgeChapterData: any) {
        const newKnowledgeChapterDataCID = await this.dagCbor.add(newKnowledgeChapterData);
        await this.knowledgeCheckPackManager.addChapterData(newKnowledgeChapterDataCID);
    }

    async createNewChapterData() {
        const newKnowledgeChapterData = {
            id: new Date().getTime(),
            chapter_title: '',
            ipfs_markdown_data: '',
            code_section_num: 0,
            code_sections: [],
            image_num: 0,
            images: [],
        }
        const newKnowledgeChapterDataCID = await this.dagCbor.add(newKnowledgeChapterData);
        await this.knowledgeCheckPackManager.addChapterData(newKnowledgeChapterDataCID);
        return newKnowledgeChapterData;
    }

    async setKnowledgeChapterData(chapterIndex: number, newKnowledgeChapterData: any) {
        const [new_ipfs_markdown_data, code_link_cids] = await this.extractCodeLink(newKnowledgeChapterData.ipfs_markdown_data);
        newKnowledgeChapterData.ipfs_markdown_data = new_ipfs_markdown_data;
        newKnowledgeChapterData.code_sections = code_link_cids;
        const image_link_cids = await this.extractImageLink(newKnowledgeChapterData.ipfs_markdown_data);
        newKnowledgeChapterData.images = image_link_cids;
        newKnowledgeChapterData.code_section_num = Object.keys(code_link_cids).length;
        newKnowledgeChapterData.image_num = Object.keys(image_link_cids).length;
        console.log('newKnowledgeChapterData', newKnowledgeChapterData);
        const newKnowledgeChapterDataCID = await this.dagCbor.add(newKnowledgeChapterData);
        await this.knowledgeCheckPackManager.setChapterData(newKnowledgeChapterDataCID, chapterIndex);
    }

    async upKnowledgeChapterData(chapterIndex: number) {
        await this.knowledgeCheckPackManager.upChapterData(chapterIndex);
    }

    async downKnowledgeChapterData(chapterIndex: number) {
        await this.knowledgeCheckPackManager.downChapterData(chapterIndex);
    }

    async rmKnowledgeChapterData(chapterIndex: number) {
        await this.knowledgeCheckPackManager.rmChapterData(chapterIndex);
    }

    async getKnowledgeChapterDatas() {
        const knowledgeChapterDataCIDArr = this.knowledgeCheckPackManager.getChapterDatas();
        const knowledgeChapterDataArray: Array<any> = [];
        for (const knowledgeChapterDataCID of knowledgeChapterDataCIDArr) {
            const knowledgeChapterData = (await this.dagCbor.get(knowledgeChapterDataCID!)) as any;
            knowledgeChapterData.ipfs_markdown_data = await this.parseCodeLink(knowledgeChapterData.ipfs_markdown_data, knowledgeChapterData.code_sections);
            knowledgeChapterDataArray.push(knowledgeChapterData);
        }
        return knowledgeChapterDataArray;
    }

    async getKnowledgeChapterTitles() {
        const knowledgeChapterDataCIDArr = this.knowledgeCheckPackManager.getChapterDatas();
        const knowledgeChapterTitlesArray: Array<any> = [];
        for (const knowledgeChapterDataCID of knowledgeChapterDataCIDArr) {
            const knowledgeChapterData = (await this.dagCbor.get(knowledgeChapterDataCID!)) as any;
            knowledgeChapterTitlesArray.push(knowledgeChapterData.chapter_title);
        }
        console.log('knowledgeChapterTitlesArray', knowledgeChapterTitlesArray);
        return knowledgeChapterTitlesArray;
    }

    async getKnowledgeChapterDatasLength() {
        const length = this.knowledgeCheckPackManager.getChapterDatasLength();
        return length;
    }

    async getTempImgPackCarBytes(chapterIndex: number, walletAddress: string) {
        const chapterDataCID = this.knowledgeCheckPackManager.getChapterData(chapterIndex);
        const chapterData = (await this.dagCbor.get(chapterDataCID!)) as any;
        const tempImgPack = {
            id: new Date().getTime(),
            user: walletAddress,
            images: chapterData.images,
        }
        const tempImgPackCID = await this.dagCbor.add(tempImgPack);
        const carStreamReader = this.car.stream(tempImgPackCID!);
        const carBytes = await streamToUint8Array(carStreamReader);
        return carBytes;
    }

    async checkKnowledgeDataPacked() {  // 检查知识数据是否打包
        const knowledgeDataCID = this.knowledgeCheckPackManager.getKnowledgeData();
        if (!knowledgeDataCID) {
            return false;
        }
        const knowledgeData = (await this.dagCbor.get(knowledgeDataCID)) as any;
        const chapterDataCIDArr = knowledgeData.chapters.map((chapterCID: CID) => chapterCID.toString());
        const nowChapterDataCIDArr = (this.knowledgeCheckPackManager.getChapterDatas()).map((chapterDataCID: CID) => chapterDataCID.toString());
        if (chapterDataCIDArr.length !== nowChapterDataCIDArr.length) {
            return false;
        }
        for (const chapterDataCID of chapterDataCIDArr) {
            if (!nowChapterDataCIDArr.includes(chapterDataCID)) {
                return false;
            }
        }
        return true;
    }

    async packKnowledgeData() {
        const knowledgeData = {
            chapters: this.knowledgeCheckPackManager.getChapterDatas(),
            chapter_num: this.knowledgeCheckPackManager.getChapterDatasLength(),
        }
        const knowledgeDataCID = await this.dagCbor.add(knowledgeData);
        await this.knowledgeCheckPackManager.setKnowledgeData(knowledgeDataCID);
        const metadata = (await this.getKnowledgeMetadata()) as any;
        metadata.id = knowledgeDataCID.toString();
        const metadataCID = await this.dagCbor.add(metadata);
        await this.knowledgeCheckPackManager.setKnowledgeMetadata(metadataCID);
    }

    async checkFingerprintData() {
        if (!this.checkKnowledgeDataPacked()) {
            return false;
        }
        const fingerprintDataCID = this.knowledgeCheckPackManager.getFingerprintData();
        if (!fingerprintDataCID) {
            return false;
        }
        const fingerprintData = (await this.dagCbor.get(fingerprintDataCID)) as any;
        if (fingerprintData.knowledge_data_cid_str !== this.knowledgeCheckPackManager.getKnowledgeData()!.toString()) {
            return false;
        }
        return true;
    }

    async getKnowledgeDataCarBytes() {
        const knowledgeDataCID = this.knowledgeCheckPackManager.getKnowledgeData();
        const carStreamReader = this.car.stream(knowledgeDataCID!);
        const carBytes = await streamToUint8Array(carStreamReader);
        return carBytes;
    }
    
    async generateFingerprintDataFromCarBytes(fingerprintDataCarBytes: Uint8Array) {
        const carReader = await CarReader.fromBytes(fingerprintDataCarBytes);
        const fingerprintDataCID = (await carReader.getRoots())[0];
        await this.car.import(carReader);
        await this.knowledgeCheckPackManager.setFingerprintData(fingerprintDataCID);
        await this.getFingerprintData();
    }

    async getFingerprintData() {
        if (!(await this.checkFingerprintData())) {
            throw new Error('Fingerprint not synced');
        }
        const fingerprintDataCID = this.knowledgeCheckPackManager.getFingerprintData();
        const fingerprintData = (await this.dagCbor.get(fingerprintDataCID!)) as any;
        console.log('fingerprintData', fingerprintData);
        const pureTextFingerprintCid = fingerprintData.pure_text_fingerprint;
        const imageFingerprintCid = fingerprintData.image_fingerprint;
        const codeSectionFingerprintCid = fingerprintData.code_section_fingerprint;
        const pureTextFingerprint = await this.dagCbor.get(pureTextFingerprintCid);
        const imageFingerprint = await this.dagCbor.get(imageFingerprintCid);
        const codeSectionFingerprint = await this.dagCbor.get(codeSectionFingerprintCid);
        console.log('pureTextFingerprint', pureTextFingerprint);
        console.log('imageFingerprint', imageFingerprint);
        console.log('codeSectionFingerprint', codeSectionFingerprint);
        return {
            knowledge_data_cid_str: fingerprintData.knowledge_data_cid_str,
            pureTextFingerprint: pureTextFingerprint as any,
            imageFingerprint: imageFingerprint as any,
            codeSectionFingerprint: codeSectionFingerprint as any,
        }
    }

    async generateCheckReport() {
        if (!(await this.checkKnowledgeDataPacked()) || !(await this.checkFingerprintData())) {
            throw new Error('Knowledge data or fingerprint data not synced');
        }
        const fingerprintDataCID = this.knowledgeCheckPackManager.getFingerprintData();
        const knownoknownEntryCID = this.knownoknownDagManager.getKnownoknownEntryCID()!;
        console.log("knownoknownEntryCID:", knownoknownEntryCID.toString());
        const knownoknownEntry = (await this.dagCborGet(knownoknownEntryCID)) as any;
        const checkReport = {
            pure_text_similarity: [] as Array<any>,
            pure_text_score: 100,	// 文本检测分数
            code_section_similarity: [] as Array<any>,
            code_section_score: 100,	// 代码块检测分数
            image_similarity: [] as Array<any>,
            image_score: 100,	// 图片检测分数
            fingerprint_data_cid_str: fingerprintDataCID!.toString(), // 报告对应的指纹数据cid_str
        }
        const { pureTextFingerprint, imageFingerprint, codeSectionFingerprint, knowledge_data_cid_str: knowledgeID } = await this.getFingerprintData();
        const fingerprintIndexEntry = (await this.dagCborGet(knownoknownEntry.index_entry.fingerprint_index_entry)) as any;
        console.log('fingerprintIndexEntry', fingerprintIndexEntry);
        const knowledgeIdTitleMap = await this.getKnowledgeIdTitles();
        
        // 文本检测
        for (const pureTextCidStr in pureTextFingerprint.fingerprint) {
            const pureTextFingerprintData = pureTextFingerprint.fingerprint[pureTextCidStr];
            for (const comparedKnowledgeID in fingerprintIndexEntry.pure_text_fingerprint) {
                const comparedPureTextFingerprintCidStr = fingerprintIndexEntry.pure_text_fingerprint[comparedKnowledgeID];
                const comparedPureTextFingerprintCid = CID.parse(comparedPureTextFingerprintCidStr);
                const comparedPureTextFingerprint = (await this.dagCbor.get(comparedPureTextFingerprintCid)) as any;
                for (const comparedPureTextCidStr in comparedPureTextFingerprint.fingerprint) {
                    const comparedPureTextFingerprintData = comparedPureTextFingerprint.fingerprint[comparedPureTextCidStr];
                    const textSimilarity = TextSimilarity(pureTextFingerprintData, comparedPureTextFingerprintData as any);
                    const pureTextScore = TextScore(textSimilarity);
                    const pureTextSimilarityRecord = {
                        origin_knowledge_id: knowledgeID,
                        compared_knowledge_id: comparedKnowledgeID,
                        compared_knowledge_title: knowledgeIdTitleMap[comparedKnowledgeID],
                        text_cid: pureTextCidStr,
                        compared_text_cid: comparedPureTextCidStr,
                        similarity: textSimilarity,
                        score: pureTextScore,
                    }
                    if (pureTextScore < checkReport.pure_text_score) {
                        checkReport.pure_text_score = pureTextScore;
                    }
                    checkReport.pure_text_similarity.push(pureTextSimilarityRecord);
                }
            }
        }

        // 代码块检测
        console.log("codeSectionFingerprint", codeSectionFingerprint);
        for (const codeSectionCidStr in codeSectionFingerprint.fingerprint) {
            const codeSectionFingerprintData = codeSectionFingerprint.fingerprint[codeSectionCidStr].fingerprint;
            const codeSectionType = codeSectionFingerprint.fingerprint[codeSectionCidStr].type;
            console.log("codeSectionType", codeSectionType);
            for (const comparedKnowledgeID in fingerprintIndexEntry.code_section_fingerprint) {
                const comparedCodeSectionFingerprintCidStr = fingerprintIndexEntry.code_section_fingerprint[comparedKnowledgeID];
                const comparedCodeSectionFingerprintCid = CID.parse(comparedCodeSectionFingerprintCidStr);
                const comparedCodeSectionFingerprint = (await this.dagCbor.get(comparedCodeSectionFingerprintCid)) as any;
                console.log("comparedCodeSectionFingerprint", comparedCodeSectionFingerprint);
                for (const comparedCodeSectionCidStr in comparedCodeSectionFingerprint.fingerprint) {
                    const comparedCodeSectionFingerprintData = comparedCodeSectionFingerprint.fingerprint[comparedCodeSectionCidStr].fingerprint;
                    const comparedCodeSectionType = comparedCodeSectionFingerprint.fingerprint[comparedCodeSectionCidStr].type;
                    if (codeSectionType !== comparedCodeSectionType) {
                        console.log("codeSectionType !== comparedCodeSectionType", codeSectionType, comparedCodeSectionType);
                        continue;
                    }
                    const [codeSectionSimilarity, codeSectionSimilarityA, codeSectionSimilarityB] = CodeSimilarity(codeSectionFingerprintData, comparedCodeSectionFingerprintData as any);
                    const codeSectionScore = CodeScore(codeSectionSimilarity);
                    const codeSectionSimilarityRecord = {
                        origin_knowledge_id: knowledgeID,
                        compared_knowledge_id: comparedKnowledgeID,
                        compared_knowledge_title: knowledgeIdTitleMap[comparedKnowledgeID],
                        code_section_cid: codeSectionCidStr,
                        compared_code_section_cid: comparedCodeSectionCidStr,
                        similarity: codeSectionSimilarity,
                        score: codeSectionScore,
                    }
                    if (codeSectionScore < checkReport.code_section_score) {
                        checkReport.code_section_score = codeSectionScore;
                    }
                    checkReport.code_section_similarity.push(codeSectionSimilarityRecord);
                }
            }
        }
        
        // 图片检测
        for (const imageCidStr in imageFingerprint.fingerprint) {
            const imageFingerprintData = imageFingerprint.fingerprint[imageCidStr];
            for (const comparedKnowledgeID in fingerprintIndexEntry.image_fingerprint) {
                const comparedImageFingerprintCidStr = fingerprintIndexEntry.image_fingerprint[comparedKnowledgeID];
                const comparedImageFingerprintCid = CID.parse(comparedImageFingerprintCidStr);
                const comparedImageFingerprint = (await this.dagCbor.get(comparedImageFingerprintCid)) as any;
                for (const comparedImageCidStr in comparedImageFingerprint.fingerprint) {
                    const comparedImageFingerprintData = comparedImageFingerprint.fingerprint[comparedImageCidStr];
                    const imageSimilarity = ImageSimilarity(imageFingerprintData, comparedImageFingerprintData as any);
                    const imageScore = ImageScore(imageSimilarity);
                    const imageSimilarityRecord = {
                        origin_knowledge_id: knowledgeID,
                        compared_knowledge_id: comparedKnowledgeID,
                        compared_knowledge_title: knowledgeIdTitleMap[comparedKnowledgeID],
                        image_cid: imageCidStr,
                        compared_image_cid: comparedImageCidStr,
                        similarity: imageSimilarity,
                        score: imageScore,
                    }
                    if (imageScore < checkReport.image_score) {
                        checkReport.image_score = imageScore;
                    }
                    checkReport.image_similarity.push(imageSimilarityRecord);
                }
            }
        }

        console.log('checkReport', checkReport);
        const checkReportCID = await this.dagCbor.add(checkReport);
        await this.knowledgeCheckPackManager.setCheckReport(checkReportCID);
    }

    async getCheckReport() {
        const checkReportCID = this.knowledgeCheckPackManager.getCheckReport();
        console.log("getCheckReport: checkReportCID", checkReportCID?.toString());
        if (!checkReportCID) {
            return null;
        }
        const checkReport = (await this.dagCbor.get(checkReportCID!)) as any;
        return checkReport;
    }

    async checkCheckReport() {
        if (!(await this.checkKnowledgeDataPacked()) || !(await this.checkFingerprintData())) {
            console.log("checkCheckReport: knowledge data or fingerprint data not synced");
            return false;
        }
        const checkReportCID = this.knowledgeCheckPackManager.getCheckReport();
        if (!checkReportCID) {
            console.log("checkCheckReport1: check report not synced");
            return false;
        }
        const checkReport = (await this.dagCbor.get(checkReportCID!)) as any;
        if (checkReport.fingerprint_data_cid_str !== this.knowledgeCheckPackManager.getFingerprintData()!.toString()) {
            console.log("checkCheckReport2: check report not synced");
            return false;
        }
        return true;
    }

    async encryptCarKnowledgeData(keys: any) {
        const { key, nonce } = keys;
        const carBytes = await this.getKnowledgeDataCarBytes();
        const encryptedCarKnowledgeData = gcm(key, nonce).encrypt(carBytes);
        const encryptedCarKnowledgeDataCID = await this.dagCbor.add(encryptedCarKnowledgeData);
        return encryptedCarKnowledgeDataCID;
    }

    async buildKnowledge(keys: any, encryptedKeys: any, publicKey: string) {
        if (!(await this.checkKnowledgeDataPacked()) || !(await this.checkFingerprintData()) || !(await this.checkCheckReport())) {
            throw new Error('Knowledge data or fingerprint data or check report not synced');
        }
        const knowledgeMetadataCID = this.knowledgeCheckPackManager.getKnowledgeMetadata();
        const knowledgeMetadata = (await this.dagCbor.get(knowledgeMetadataCID!)) as any;
        const decryptionKeys = {
            free: null,
            specialized: {
                [publicKey]: encryptedKeys,
            },
        }
        if (knowledgeMetadata.sale_volume === 0) {
            decryptionKeys.free = keys;
        }
        const encryptedCarKnowledgeDataCID = await this.encryptCarKnowledgeData(keys);
        await this.knowledgeCheckPackManager.pinAdd(encryptedCarKnowledgeDataCID);
        const fingerprintDataCID = this.knowledgeCheckPackManager.getFingerprintData();
        const checkReportCID = this.knowledgeCheckPackManager.getCheckReport();
        const knowledgeDataCID = this.knowledgeCheckPackManager.getKnowledgeData();
        const knowledgeEntry = {
            metadata: knowledgeMetadataCID,
            encrypted_car_knowledge_data: encryptedCarKnowledgeDataCID,
            decryption_keys: decryptionKeys,
            fingerprint_data: fingerprintDataCID,
            check_report: checkReportCID,
        }
        const knowledgeEntryCID = await this.dagCbor.add(knowledgeEntry);
        await this.knowledgeCheckPackManager.pinAdd(knowledgeEntryCID);
        await this.knowledgeCheckPackManager.pinRm(encryptedCarKnowledgeDataCID);
        const knowledgeCheckPack = {
            knowledge_entry: knowledgeEntryCID,
            knowledge_data: knowledgeDataCID,
        }
        const knowledgeCheckPackCID = await this.dagCbor.add(knowledgeCheckPack);
        await this.knowledgeCheckPackManager.setKnowledgeCheckPack(knowledgeCheckPackCID);
        await this.knowledgeCheckPackManager.pinRm(knowledgeEntryCID);
        console.log('knowledgeEntry', knowledgeEntry)
        console.log('knowledgeCheckPack', knowledgeCheckPack)
    }

    async checkKnowledgeBuilded() {
        if (!(await this.checkKnowledgeDataPacked()) || !(await this.checkFingerprintData()) || !(await this.checkCheckReport())) {
            return false;
        }
        const knowledgeCheckPackCID = this.knowledgeCheckPackManager.getKnowledgeCheckPack();
        if (!knowledgeCheckPackCID) {
            return false;
        }
        const knowledgeCheckPack = (await this.dagCborGet(knowledgeCheckPackCID!)) as any;
        const knowledgeEntryCID = knowledgeCheckPack.knowledge_entry;
        const knowledgeEntry = (await this.dagCborGet(knowledgeEntryCID!)) as any;
        if (knowledgeEntry.metadata.toString() !== this.knowledgeCheckPackManager.getKnowledgeMetadata()!.toString()) {
            return false;
        }
        if (knowledgeEntry.fingerprint_data.toString() !== this.knowledgeCheckPackManager.getFingerprintData()!.toString()) {
            return false;
        }
        if (knowledgeEntry.check_report.toString() !== this.knowledgeCheckPackManager.getCheckReport()!.toString()) {
            return false;
        }
        console.log('build check knowledgeEntry', knowledgeEntry)
        console.log('build check knowledgeCheckPack', knowledgeCheckPack)
        return true;
    }

    async ipfsTestFucntion() {
        const chapterDataCIDArr = this.knowledgeCheckPackManager.getChapterDatas()
        console.log("chapterDataCIDArr", chapterDataCIDArr.map((chapterDataCID: CID) => chapterDataCID.toString()));
        for await ( const pin of this.helia.pins.ls() ) {
            console.log("pin info:", {
                cid: pin.cid.toString(),
                depth: pin.depth,
            });
        }
        console.log("reset knowledgeCheckPackManager");
        const knowledgeDataCID = this.knowledgeCheckPackManager.getKnowledgeData();
        const knowledgeData = (await this.dagCbor.get(knowledgeDataCID!)) as any;
        console.log("knowledgeData", knowledgeData);
        if (knowledgeDataCID) {  // 移除知识数据
            console.log("pinRm knowledge_data_cid", knowledgeDataCID.toString());
            await this.knowledgeCheckPackManager.pinRm(knowledgeDataCID);
        }
        for (const chapter_data_cid of chapterDataCIDArr) {    // 移除所有章节数据
            console.log("pinRm chapter_data_cid", chapter_data_cid.toString());
            await this.knowledgeCheckPackManager.pinRm(chapter_data_cid);
        }
        const knowledgeMetadataCID = this.knowledgeCheckPackManager.getKnowledgeMetadata();
        if (knowledgeMetadataCID) {  // 移除知识元数据
            console.log("pinRm knowledge_metadata_cid", knowledgeMetadataCID.toString());
            await this.knowledgeCheckPackManager.pinRm(knowledgeMetadataCID);
        }
        const fingerprintDataCID = this.knowledgeCheckPackManager.getFingerprintData();
        if (fingerprintDataCID) {  // 移除指纹数据
            console.log("pinRm fingerprint_data_cid", fingerprintDataCID.toString());
            await this.knowledgeCheckPackManager.pinRm(fingerprintDataCID);
        }
        const checkReportCID = this.knowledgeCheckPackManager.getCheckReport();
        if (checkReportCID) {  // 移除查重报告
            console.log("pinRm check_report_cid", checkReportCID.toString());
            await this.knowledgeCheckPackManager.pinRm(checkReportCID);
        }
        const knowledgeCheckPackCID = this.knowledgeCheckPackManager.getKnowledgeCheckPack();
        if (knowledgeCheckPackCID) {  // 移除知识查验包
            console.log("pinRm knowledge_check_pack_cid", knowledgeCheckPackCID.toString());
            await this.knowledgeCheckPackManager.pinRm(knowledgeCheckPackCID);
        }
        return {} as any;
    }

    async getKnowledgePublishCID() {
        if (!(await this.checkKnowledgeBuilded())) {
            throw new Error('Knowledge data or fingerprint data or check report not synced');
        }
        const knowledgeCheckPackCID = this.knowledgeCheckPackManager.getKnowledgeCheckPack();
        const knowledgeCheckPack = (await this.dagCborGet(knowledgeCheckPackCID!)) as any;
        const knowledgeEntryCID = knowledgeCheckPack.knowledge_entry;
        return knowledgeEntryCID.toString();
    }

    async getKnowledgeCheckPackCarBytes() {
        if (!(await this.checkKnowledgeBuilded())) {
            throw new Error('Knowledge data or fingerprint data or check report not synced');
        }
        const knowledgeCheckPackCID = this.knowledgeCheckPackManager.getKnowledgeCheckPack();
        const carStreamReader = this.car.stream(knowledgeCheckPackCID!);
        const carBytes = await streamToUint8Array(carStreamReader);
        console.log('knowledgeCheckPackCarBytesLength', carBytes.length);
        return carBytes;
    }

    // 以下是临时图片管理方法
    async addTempImage(image_data: Uint8Array, mimeType: string) {
        const image_cid = await this.fs.addBytes(image_data);
        await this.knowledgeCheckPackManager.addTempImage(image_cid);
        const customLink = Custom_Link_Format.IMAGE.replace('CID', image_cid.toString());
        console.log('addTempImage', image_cid.toString());
        return customLink;
    }

    async getTempImage(image_cid: string): Promise<Uint8Array | null> {
        try {
            console.log('getTempImage', image_cid);
            const tempImageReader = this.fs.cat(CID.parse(image_cid));
            const tempImageUint8Array = await streamToUint8Array(tempImageReader);
            return tempImageUint8Array;
        } catch (error) {
            console.error('Invalid image cid:', error);
            return null;
        }
    }

    // 以下是合约电路需要的方法
    async generateDAGCidArray(type: 'knowledge' | 'application'): Promise<Array<DAGCid>> {
        const knownoknownEntryCID = this.knownoknownDagManager.getKnownoknownEntryCID()!;
        const knownoknownEntry: Knownoknown_Entry = await this.dagCbor.get(knownoknownEntryCID);
        switch (type) {
            case 'knowledge': {
                const knowledgeListEntry: Knowledge_List_Entry = await this.dagCborGet(knownoknownEntry.base_entry.knowledge_list_entry) as Knowledge_List_Entry;
                const dagCidArray: Array<DAGCid> = [];
                for (const knowledgeCID of knowledgeListEntry.knowledge_entry_list) {
                    const dagCid = DAGCid.parseCID(knowledgeCID)
                    dagCidArray.push(dagCid)
                }
                return dagCidArray;
            }
            case 'application': {
                const applicationEntry: Application_Entry = await this.dagCborGet(knownoknownEntry.base_entry.application_entry) as Application_Entry;
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

    // 以下是包装helia后的安全方法
    async dagCborGet(cid: CID) {
        const dagCborObj = await this.dagCbor.get(cid, {
            signal: AbortSignal.timeout(TIMEOUT),
        });
        return dagCborObj;
    }
}

export { IpfsService, IpfsServerStatus };
export type { IpfsServiceStatus, IpfsServiceInit };