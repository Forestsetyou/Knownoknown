import { HeliaLibp2p, AddOptions, RmOptions, Helia } from 'helia';
import { Libp2p } from 'libp2p';
import { ServiceMap } from '@libp2p/interface';
import { CID } from 'multiformats/cid'

const PIN_TIMEOUT = 5000;  // 5秒

async function pinAdd(helia: HeliaLibp2p<Libp2p<ServiceMap>> | Helia, cid: CID, option: AddOptions = {}) {
    const pinOption = { // 添加定时
        ...option,
        signal: AbortSignal.timeout(PIN_TIMEOUT),
    }
    console.log("pinAdd:", cid.toString());
    for await (const pinnedCID of helia.pins.add(cid, pinOption)) {
        console.log("pinnedCID:", pinnedCID.toString());
    }
}

async function pinRm(helia: HeliaLibp2p<Libp2p<ServiceMap>> | Helia, cid: CID, option: RmOptions = {}) {
    const rmOption = { // 添加定时
        ...option,
        signal: AbortSignal.timeout(PIN_TIMEOUT),
    }
    console.log("pinRm:", cid.toString());
    for await (const rmPinnedCID of helia.pins.rm(cid, rmOption)) {
        console.log("rmPinnedCID:", rmPinnedCID.toString());
    }
}

class KnownoknownDagManagerClient {
    private helia: HeliaLibp2p<Libp2p<ServiceMap>> | Helia;

    private knownoknown_entry_cid?: CID;

    constructor(helia: HeliaLibp2p<Libp2p<ServiceMap>> | Helia) {
        this.helia = helia;
    }

    async reset() {
        if (this.knownoknown_entry_cid) {
            await this.pinRm(this.knownoknown_entry_cid);
        }
        this.knownoknown_entry_cid = undefined;
    }

    async pinAdd(cid: CID, option: AddOptions = {}) {
        await pinAdd(this.helia, cid, option);
    }

    async pinRm(cid: CID, option: RmOptions = {}) {
        await pinRm(this.helia, cid, option);
    }

    // 以下是管理 Knowledge_DB 的方法
    async setKnownoknownEntry(newEntryCID: CID) {
        if (this.knownoknown_entry_cid?.toString() === newEntryCID.toString()) {
            console.log("knownoknown_entry_cid is already set", this.knownoknown_entry_cid.toString())
            return;
        }
        await this.pinAdd(newEntryCID, {
            metadata: {
                name: "knownoknown_entry with depth 1",
                description: "update knownoknown_entry with depth 1",
            },
            depth: 1,
        });
        if (this.knownoknown_entry_cid) {
            await this.pinRm(this.knownoknown_entry_cid);
        }
        this.knownoknown_entry_cid = newEntryCID;
        console.log("knownoknown_entry_cid is set", this.knownoknown_entry_cid.toString())
    }

    getKnownoknownEntryCID() {
        return this.knownoknown_entry_cid;
    }
}

// 用于创建并管理新知识
class KnowledgeCheckPackManagerClient {
    private helia: HeliaLibp2p<Libp2p<ServiceMap>> | Helia;
    
    private chapter_data_cids: Array<CID>;  // 知识章节cid

    private knowledge_metadata_cid?: CID;   // 知识元数据cid

    private temp_image_cids: Array<CID>;  // 临时图片cid

    private knowledge_data_cid?: CID;  // 知识数据cid

    private fingerprint_data_cid?: CID;  // 指纹数据cid

    private check_report_cid?: CID;  // 查重报告cid

    private knowledge_check_pack_cid?: CID;  // 知识查验包cid


    constructor(helia: HeliaLibp2p<Libp2p<ServiceMap>> | Helia) {
        this.helia = helia;
        this.chapter_data_cids = [];
        this.knowledge_metadata_cid = undefined;
        this.temp_image_cids = [];
        this.knowledge_data_cid = undefined;
        this.fingerprint_data_cid = undefined;
        this.check_report_cid = undefined;
        this.knowledge_check_pack_cid = undefined;
    }

    async pinAdd(cid: CID, option: AddOptions = {}) {
        await pinAdd(this.helia, cid, option);
    }

    async pinRm(cid: CID, option: RmOptions = {}) {
        await pinRm(this.helia, cid, option);
    }

    async importKnowledgeCheckPackManagerBakPack(knowledgeCheckPackManagerBakPack: any) {
        await this.reset();
        console.log("importKnowledgeCheckPackManagerBakPack pinAdd:", knowledgeCheckPackManagerBakPack.knowledge_check_pack_cid.toString());
        await this.setKnowledgeCheckPack(knowledgeCheckPackManagerBakPack.knowledge_check_pack_cid);
        for (const chapter_data_cid_str of knowledgeCheckPackManagerBakPack.chapter_data_cid_strs) {
            await this.addChapterData(CID.parse(chapter_data_cid_str));
        }
        if (knowledgeCheckPackManagerBakPack.knowledge_metadata_cid_str) {
            await this.setKnowledgeMetadata(CID.parse(knowledgeCheckPackManagerBakPack.knowledge_metadata_cid_str));
        }
        // for (const temp_image_cid of knowledgeCheckPackManagerBak.temp_image_cids) {
        //     await this.addTempImage(temp_image_cid);
        // }
        if (knowledgeCheckPackManagerBakPack.knowledge_data_cid_str) {
            await this.setKnowledgeData(CID.parse(knowledgeCheckPackManagerBakPack.knowledge_data_cid_str));
        }
        if (knowledgeCheckPackManagerBakPack.fingerprint_data_cid_str) {
            await this.setFingerprintData(CID.parse(knowledgeCheckPackManagerBakPack.fingerprint_data_cid_str));
        }
        if (knowledgeCheckPackManagerBakPack.check_report_cid_str) {
            await this.setCheckReport(CID.parse(knowledgeCheckPackManagerBakPack.check_report_cid_str));
        }
    }

    async importKnowledgeCheckPackManagerBak(knowledgeCheckPackManagerBak: any) {
        await this.reset();
        for (const chapter_data_cid of knowledgeCheckPackManagerBak.chapter_data_cids) {
            await this.addChapterData(chapter_data_cid);
        }
        if (knowledgeCheckPackManagerBak.knowledge_metadata_cid) {
            await this.setKnowledgeMetadata(knowledgeCheckPackManagerBak.knowledge_metadata_cid);
        }
        // for (const temp_image_cid of knowledgeCheckPackManagerBak.temp_image_cids) {
        //     await this.addTempImage(temp_image_cid);
        // }
        if (knowledgeCheckPackManagerBak.knowledge_data_cid) {
            await this.setKnowledgeData(knowledgeCheckPackManagerBak.knowledge_data_cid);
        }
        if (knowledgeCheckPackManagerBak.fingerprint_data_cid) {
            await this.setFingerprintData(knowledgeCheckPackManagerBak.fingerprint_data_cid);
        }
        if (knowledgeCheckPackManagerBak.check_report_cid) {
            await this.setCheckReport(knowledgeCheckPackManagerBak.check_report_cid);
        }
    }

    async exportKnowledgeCheckPackManagerBakPack() {
        if (!this.knowledge_check_pack_cid) {
            throw new Error('知识查验包cid不存在');
        }
        // return knowledgeCheckPackManagerBakPack;
        
        let chapter_data_cid_strs: Array<string> = [];  // 知识章节cid
    
        let knowledge_metadata_cid_str: string | null = null;   // 知识元数据cid
    
        let temp_image_cid_strs: Array<string> = [];  // 临时图片cid
    
        let knowledge_data_cid_str: string | null = null;  // 知识数据cid
    
        let fingerprint_data_cid_str: string | null = null;  // 指纹数据cid
    
        let check_report_cid_str: string | null = null;  // 查重报告cid

        if (this.chapter_data_cids.length !== 0) {
            chapter_data_cid_strs = this.chapter_data_cids.map(cid => cid.toString());
        }
        if (this.knowledge_metadata_cid) {
            knowledge_metadata_cid_str = this.knowledge_metadata_cid.toString();
        }
        // if (this.temp_image_cids.length !== 0) {
        //     temp_image_cids = this.temp_image_cids;
        // }
        if (this.knowledge_data_cid) {
            knowledge_data_cid_str = this.knowledge_data_cid.toString();
        }
        if (this.fingerprint_data_cid) {
            fingerprint_data_cid_str = this.fingerprint_data_cid.toString();
        }
        if (this.check_report_cid) {
            check_report_cid_str = this.check_report_cid.toString();
        }
        return {
            chapter_data_cid_strs: chapter_data_cid_strs,
            knowledge_metadata_cid_str: knowledge_metadata_cid_str,
            temp_image_cid_strs: temp_image_cid_strs,
            knowledge_data_cid_str: knowledge_data_cid_str,
            fingerprint_data_cid_str: fingerprint_data_cid_str,
            check_report_cid_str: check_report_cid_str,
            knowledge_check_pack_cid: this.knowledge_check_pack_cid,
        }
    }

    async exportKnowledgeCheckPackManagerBak() {
    
        let chapter_data_cids: Array<CID> = [];  // 知识章节cid
    
        let knowledge_metadata_cid: CID | null = null;   // 知识元数据cid
    
        let temp_image_cids: Array<CID> = [];  // 临时图片cid
    
        let knowledge_data_cid: CID | null = null;  // 知识数据cid
    
        let fingerprint_data_cid: CID | null = null;  // 指纹数据cid
    
        let check_report_cid: CID | null = null;  // 查重报告cid

        if (this.chapter_data_cids.length !== 0) {
            chapter_data_cids = this.chapter_data_cids;
        }
        if (this.knowledge_metadata_cid) {
            knowledge_metadata_cid = this.knowledge_metadata_cid;
        }
        // if (this.temp_image_cids.length !== 0) {
        //     temp_image_cids = this.temp_image_cids;
        // }
        if (this.knowledge_data_cid) {
            knowledge_data_cid = this.knowledge_data_cid;
        }
        if (this.fingerprint_data_cid) {
            fingerprint_data_cid = this.fingerprint_data_cid;
        }
        if (this.check_report_cid) {
            check_report_cid = this.check_report_cid;
        }
        return {
            chapter_data_cids: chapter_data_cids,
            knowledge_metadata_cid: knowledge_metadata_cid,
            temp_image_cids: temp_image_cids,
            knowledge_data_cid: knowledge_data_cid,
            fingerprint_data_cid: fingerprint_data_cid,
            check_report_cid: check_report_cid,
        }
    }

    async pinLs() {
        for await (const pin of this.helia.pins.ls()) {
            console.log("pin info:", {
                cid: pin.cid.toString(),
                depth: pin.depth,
            });
        }
    }

    async reset() {
        console.log("reset knowledgeCheckPackManager");
        for (const chapter_data_cid of this.chapter_data_cids) {    // 移除所有章节数据
            console.log("pinRm chapter_data_cid", chapter_data_cid.toString());
            await this.pinRm(chapter_data_cid);
        }
        this.chapter_data_cids = [];
        if (this.knowledge_metadata_cid) {  // 移除知识元数据
            console.log("pinRm knowledge_metadata_cid", this.knowledge_metadata_cid.toString());
            await this.pinRm(this.knowledge_metadata_cid);
        }
        this.knowledge_metadata_cid = undefined;
        for (const temp_image_cid of this.temp_image_cids) {  // 移除所有临时图片
            console.log("pinRm temp_image_cid", temp_image_cid.toString());
            await this.pinRm(temp_image_cid);
        }
        this.temp_image_cids = [];
        if (this.knowledge_data_cid) {  // 移除知识数据
            console.log("pinRm knowledge_data_cid", this.knowledge_data_cid.toString());
            await this.pinRm(this.knowledge_data_cid);
        }
        this.knowledge_data_cid = undefined;
        if (this.fingerprint_data_cid) {  // 移除指纹数据
            console.log("pinRm fingerprint_data_cid", this.fingerprint_data_cid.toString());
            await this.pinRm(this.fingerprint_data_cid);
        }
        this.fingerprint_data_cid = undefined;
        if (this.check_report_cid) {  // 移除查重报告
            console.log("pinRm check_report_cid", this.check_report_cid.toString());
            await this.pinRm(this.check_report_cid);
        }
        this.check_report_cid = undefined;
        if (this.knowledge_check_pack_cid) {  // 移除知识查验包
            console.log("pinRm knowledge_check_pack_cid", this.knowledge_check_pack_cid.toString());
            await this.pinRm(this.knowledge_check_pack_cid);
        }
        this.knowledge_check_pack_cid = undefined;
    }

    async addTempImage(image_cid: CID) {
        for (const temp_image_cid of this.temp_image_cids) {
            if (temp_image_cid.toString() === image_cid.toString()) {
                return;
            }
        }
        await this.pinAdd(image_cid);
        this.temp_image_cids.push(image_cid);
    }

    async setKnowledgeCheckPack(knowledge_check_pack_cid: CID) {
        if (this.knowledge_check_pack_cid?.toString() === knowledge_check_pack_cid.toString()) {
            return;
        }
        await this.pinAdd(knowledge_check_pack_cid);
        if (this.knowledge_check_pack_cid) {
            await this.pinRm(this.knowledge_check_pack_cid);
        }
        this.knowledge_check_pack_cid = knowledge_check_pack_cid;
    }

    async setKnowledgeMetadata(knowledge_metadata_cid: CID) {
        if (this.knowledge_metadata_cid?.toString() === knowledge_metadata_cid.toString()) {
            return;
        }
        console.log("pinAdd knowledge_metadata", knowledge_metadata_cid.toString());
        await this.pinAdd(knowledge_metadata_cid);
        if (this.knowledge_metadata_cid) {
            await this.pinRm(this.knowledge_metadata_cid);
        }
        this.knowledge_metadata_cid = knowledge_metadata_cid;
    }

    async addChapterData(chapter_data_cid: CID) {
        console.log("pinAdd chapter_data", chapter_data_cid.toString());
        await this.pinAdd(chapter_data_cid);
        this.chapter_data_cids.push(chapter_data_cid);
    }

    async setChapterData(chapter_data_cid: CID, index: number) {
        if (index >= this.chapter_data_cids.length) {
            throw new Error("index out of range");
        }
        if (this.chapter_data_cids[index]?.toString() === chapter_data_cid.toString()) {
            return;
        }
        console.log("pinAdd chapter_data", chapter_data_cid.toString());
        await this.pinAdd(chapter_data_cid);
        await this.pinRm(this.chapter_data_cids[index]);
        this.chapter_data_cids[index] = chapter_data_cid;
    }

    async upChapterData(index: number) {
        if (index >= this.chapter_data_cids.length || index <= 0) {
            throw new Error("invalid index");
        }
        const new_chapter_data_cids = this.chapter_data_cids.slice(0, index - 1);
        new_chapter_data_cids.push(this.chapter_data_cids[index]);
        new_chapter_data_cids.push(this.chapter_data_cids[index - 1]);
        new_chapter_data_cids.push(...this.chapter_data_cids.slice(index + 1));
        this.chapter_data_cids = new_chapter_data_cids;
    }

    async downChapterData(index: number) {
        if (index < 0 || index >= this.chapter_data_cids.length - 1) {
            throw new Error("invalid index");
        }
        const new_chapter_data_cids = this.chapter_data_cids.slice(0, index);
        new_chapter_data_cids.push(this.chapter_data_cids[index + 1]);
        new_chapter_data_cids.push(this.chapter_data_cids[index]);
        new_chapter_data_cids.push(...this.chapter_data_cids.slice(index + 2));
        this.chapter_data_cids = new_chapter_data_cids;
    }

    async rmChapterData(index: number) {
        await this.pinRm(this.chapter_data_cids[index]);
        this.chapter_data_cids.splice(index, 1);
    }

    async setKnowledgeData(knowledge_data_cid: CID) {
        if (this.knowledge_data_cid?.toString() === knowledge_data_cid.toString()) {
            return;
        }
        console.log("pinAdd knowledge_data", knowledge_data_cid.toString());
        await this.pinAdd(knowledge_data_cid);
        if (this.knowledge_data_cid) {
            await this.pinRm(this.knowledge_data_cid);
        }
        this.knowledge_data_cid = knowledge_data_cid;
    }

    async setFingerprintData(fingerprint_data_cid: CID) {
        if (this.fingerprint_data_cid?.toString() === fingerprint_data_cid.toString()) {
            return;
        }
        console.log("pinAdd fingerprint_data", fingerprint_data_cid.toString());
        await this.pinAdd(fingerprint_data_cid);
        if (this.fingerprint_data_cid) {
            await this.pinRm(this.fingerprint_data_cid);
        }
        this.fingerprint_data_cid = fingerprint_data_cid;
    }

    async setCheckReport(check_report_cid: CID) {
        if (this.check_report_cid?.toString() === check_report_cid.toString()) {
            return;
        }
        console.log("pinAdd check_report", check_report_cid.toString());
        await this.pinAdd(check_report_cid);
        if (this.check_report_cid) {
            await this.pinRm(this.check_report_cid);
        }
        this.check_report_cid = check_report_cid;
    }

    getKnowledgeCheckPack() {
        return this.knowledge_check_pack_cid;
    }

    getChapterData(index: number) {
        if (index >= this.chapter_data_cids.length) {
            throw new Error("index out of range");
        }
        return this.chapter_data_cids[index];
    }
    
    getChapterDatas() {
        return this.chapter_data_cids;
    }

    getChapterDatasLength() {
        return this.chapter_data_cids.length;
    }

    getKnowledgeMetadata() {
        return this.knowledge_metadata_cid;
    }

    getKnowledgeData() {
        return this.knowledge_data_cid;
    }

    getFingerprintData() {
        return this.fingerprint_data_cid;
    }

    getCheckReport() {
        return this.check_report_cid;
    }

}

export { KnownoknownDagManagerClient, KnowledgeCheckPackManagerClient };
