import { HeliaLibp2p, AddOptions, RmOptions, Helia } from 'helia';
import { Libp2p } from 'libp2p';
import { ServiceMap } from '@libp2p/interface';
import { CID } from 'multiformats/cid'

const PIN_TIMEOUT = 20000;  // 20秒
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
        const pinOption = { // 添加定时
            ...option,
            signal: AbortSignal.timeout(PIN_TIMEOUT),
        }
        for await (const pinnedCID of this.helia.pins.add(cid, pinOption)) {
            console.log("pinnedCID:", pinnedCID);
        }
    }

    async pinRm(cid: CID, option: RmOptions = {}) {
        const rmOption = { // 添加定时
            ...option,
            signal: AbortSignal.timeout(PIN_TIMEOUT),
        }
        for await (const rmPinnedCID of this.helia.pins.rm(cid, rmOption)) {
            console.log("rmPinnedCID:", rmPinnedCID);
        }
        this.helia.gc();
    }

    // 以下是管理 Knowledge_DB 的方法
    async setKnownoknownEntry(newEntryCID: CID) {
        // if (this.knownoknown_entry_cid === newEntryCID) {
        //     return;
        // }
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


    constructor(helia: HeliaLibp2p<Libp2p<ServiceMap>> | Helia) {
        this.helia = helia;
        this.chapter_data_cids = [];
        this.knowledge_metadata_cid = undefined;
        this.temp_image_cids = [];
        this.knowledge_data_cid = undefined;
        this.fingerprint_data_cid = undefined;
        this.check_report_cid = undefined;
    }

    async reset() {
        for (const chapter_data_cid of this.chapter_data_cids) {    // 移除所有章节数据
            await this.pinRm(chapter_data_cid);
        }
        this.chapter_data_cids = [];
        if (this.knowledge_metadata_cid) {  // 移除知识元数据
            await this.pinRm(this.knowledge_metadata_cid);
        }
        this.knowledge_metadata_cid = undefined;
        for (const temp_image_cid of this.temp_image_cids) {  // 移除所有临时图片
            await this.pinRm(temp_image_cid);
        }
        this.temp_image_cids = [];
        if (this.knowledge_data_cid) {  // 移除知识数据
            await this.pinRm(this.knowledge_data_cid);
        }
        this.knowledge_data_cid = undefined;
        if (this.fingerprint_data_cid) {  // 移除指纹数据
            await this.pinRm(this.fingerprint_data_cid);
        }
        this.fingerprint_data_cid = undefined;
        if (this.check_report_cid) {  // 移除查重报告
            await this.pinRm(this.check_report_cid);
        }
        this.check_report_cid = undefined;
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

    async pinAdd(cid: CID, option: AddOptions = {}) {
        const pinOption = { // 添加定时
            ...option,
            signal: AbortSignal.timeout(PIN_TIMEOUT),
        }
        for await (const pinnedCID of this.helia.pins.add(cid, pinOption)) {
            console.log("pinnedCID:", pinnedCID);
        }
    }

    async pinRm(cid: CID, option: RmOptions = {}) {
        const rmOption = { // 添加定时
            ...option,
            signal: AbortSignal.timeout(PIN_TIMEOUT),
        }
        for await (const rmPinnedCID of this.helia.pins.rm(cid, rmOption)) {
            console.log("rmPinnedCID:", rmPinnedCID);
        }
        this.helia.gc();
    }

    async setKnowledgeMetadata(knowledge_metadata_cid: CID) {
        if (this.knowledge_metadata_cid === knowledge_metadata_cid) {
            return;
        }
        await this.pinAdd(knowledge_metadata_cid);
        if (this.knowledge_metadata_cid) {
            await this.pinRm(this.knowledge_metadata_cid);
        }
        this.knowledge_metadata_cid = knowledge_metadata_cid;
    }

    async addChapterData(chapter_data_cid: CID) {
        await this.pinAdd(chapter_data_cid);
        this.chapter_data_cids.push(chapter_data_cid);
    }

    async setChapterData(chapter_data_cid: CID, index: number) {
        if (index >= this.chapter_data_cids.length) {
            throw new Error("index out of range");
        }
        if (this.chapter_data_cids[index] === chapter_data_cid) {
            return;
        }
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
        if (this.knowledge_data_cid === knowledge_data_cid) {
            return;
        }
        await this.pinAdd(knowledge_data_cid);
        if (this.knowledge_data_cid) {
            await this.pinRm(this.knowledge_data_cid);
        }
        this.knowledge_data_cid = knowledge_data_cid;
    }

    async setFingerprintData(fingerprint_data_cid: CID) {
        if (this.fingerprint_data_cid === fingerprint_data_cid) {
            return;
        }
        await this.pinAdd(fingerprint_data_cid);
        if (this.fingerprint_data_cid) {
            await this.pinRm(this.fingerprint_data_cid);
        }
        this.fingerprint_data_cid = fingerprint_data_cid;
    }

    async setCheckReport(check_report_cid: CID) {
        if (this.check_report_cid === check_report_cid) {
            return;
        }
        await this.pinAdd(check_report_cid);
        if (this.check_report_cid) {
            await this.pinRm(this.check_report_cid);
        }
        this.check_report_cid = check_report_cid;
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
