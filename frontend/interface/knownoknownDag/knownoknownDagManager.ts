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

    constructor(helia: HeliaLibp2p<Libp2p<ServiceMap>> | Helia) {
        this.helia = helia;
        this.chapter_data_cids = [];
        this.knowledge_metadata_cid = undefined;
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

    async rmChapterData(index: number) {
        await this.pinRm(this.chapter_data_cids[index]);
        this.chapter_data_cids.splice(index, 1);
    }

    async getChapterData(index: number) {
        return this.chapter_data_cids[index];
    }
    
    async getChapterDatas() {
        return this.chapter_data_cids;
    }

    async getChapterDatasLength() {
        return this.chapter_data_cids.length;
    }

    async getKnowledgeMetadata() {
        return this.knowledge_metadata_cid;
    }

}

export { KnownoknownDagManagerClient, KnowledgeCheckPackManagerClient };
