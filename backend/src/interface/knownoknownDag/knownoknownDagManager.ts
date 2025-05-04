import { HeliaLibp2p, AddOptions, RmOptions, Helia, Pin } from 'helia';
import { Libp2p } from 'libp2p';
import { ServiceMap } from '@libp2p/interface';
import { CID } from 'multiformats/cid'

const PIN_TIMEOUT = 20000;  // 20秒
class KnownoknownDagManager {
    private helia: HeliaLibp2p<Libp2p<ServiceMap>> | Helia;

    private knownoknown_entry_cid?: CID;
    private metadata_cid?: CID;
    private knowledge_list_entry_cid?: CID;
    private notice_entry_cid?: CID;
    private application_entry_cid?: CID;
    private comment_entry_cid?: CID;
    private star_entry_cid?: CID;
    private knowledge_comment_index_entry_cid?: CID;
    private fingerprint_index_entry_cid?: CID;
    private knowledge_metadata_index_entry_cid?: CID;
    private knowledge_checkreport_index_entry_cid?: CID;

    constructor(helia: HeliaLibp2p<Libp2p<ServiceMap>> | Helia) {
        this.helia = helia;
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

    // 已有区块数据，从PinList中初始化
    async loadFromPinList(pinList: Array<Pin>) {
        for (const pin of pinList) {
            const pinCID = pin.cid
            const metadata = pin.metadata
            switch (metadata.name) {
                case "knownoknown_entry:1":
                    this.knownoknown_entry_cid = pinCID
                    console.log("knownoknown_entry_cid:", this.knownoknown_entry_cid)
                    break;
                case "metadata:infinite":
                    this.metadata_cid = pinCID
                    console.log("metadata_cid:", this.metadata_cid)
                    break;
                case "knowledge_list_entry:infinite":
                    this.knowledge_list_entry_cid = pinCID
                    console.log("knowledge_list_entry_cid:", this.knowledge_list_entry_cid)
                    break;
                case "notice_entry:infinite":
                    this.notice_entry_cid = pinCID
                    console.log("notice_entry_cid:", this.notice_entry_cid)
                    break;
                case "application_entry:infinite":
                    this.application_entry_cid = pinCID
                    console.log("application_entry_cid:", this.application_entry_cid)
                    break;
                case "comment_entry:infinite":
                    this.comment_entry_cid = pinCID
                    console.log("comment_entry_cid:", this.comment_entry_cid)
                    break;
                case "star_entry:infinite":
                    this.star_entry_cid = pinCID
                    console.log("star_entry_cid:", this.star_entry_cid)
                    break;
                case "knowledge_comment_index_entry:infinite":
                    this.knowledge_comment_index_entry_cid = pinCID
                    console.log("knowledge_comment_index_entry_cid:", this.knowledge_comment_index_entry_cid)
                    break;
                case "fingerprint_index_entry:infinite":
                    this.fingerprint_index_entry_cid = pinCID
                    console.log("fingerprint_index_entry_cid:", this.fingerprint_index_entry_cid)
                    break;
                case "knowledge_metadata_index_entry:infinite":
                    this.knowledge_metadata_index_entry_cid = pinCID
                    console.log("knowledge_metadata_index_entry_cid:", this.knowledge_metadata_index_entry_cid)
                    break;
                case "knowledge_checkreport_index_entry:infinite":
                    this.knowledge_checkreport_index_entry_cid = pinCID
                    console.log("knowledge_checkreport_index_entry_cid:", this.knowledge_checkreport_index_entry_cid)
                    break;
                case "statusFlag":
                    console.log("statusFlagCID:", pinCID)
                    break;
                default:
                    console.log(pin)
                    throw new Error(`Unknown metadata name: ${metadata.name}`);
            }
        }
    }


    // 以下是管理 Knowledge_DB 的方法
    async setKnownoknownEntry(newEntryCID: CID) {
        // if (this.knownoknown_entry_cid === newEntryCID) {
        //     return;
        // }
        await this.pinAdd(newEntryCID, {
            metadata: {
                name: "knownoknown_entry:1",
                description: "update knownoknown_entry with depth 1",
                timestamp: Date.now(),
            },
            depth: 1,
        });
        if (this.knownoknown_entry_cid) {
            await this.pinRm(this.knownoknown_entry_cid);
        }
        this.knownoknown_entry_cid = newEntryCID;
    }

    async setMetadata(newEntryCID: CID) {
        await this.pinAdd(newEntryCID, {
            metadata: {
                name: "metadata:infinite",
                description: "update metadata with infinite depth",
                timestamp: Date.now(),
            },
        });
        if (this.metadata_cid) {
            await this.pinRm(this.metadata_cid);
        }
        this.metadata_cid = newEntryCID;
    }

    async setKnowledgeListEntry(newEntryCID: CID) {
        await this.pinAdd(newEntryCID, {
            metadata: {
                name: "knowledge_list_entry:infinite",
                description: "update knowledge_list_entry with infinite depth",
                timestamp: Date.now(),
            },
        });
        if (this.knowledge_list_entry_cid) {
            await this.pinRm(this.knowledge_list_entry_cid);
        }
        this.knowledge_list_entry_cid = newEntryCID;
    }

    async setNoticeEntry(newEntryCID: CID) {
        await this.pinAdd(newEntryCID, {
            metadata: {
                name: "notice_entry:infinite",
                description: "update notice_entry with infinite depth",
                timestamp: Date.now(),
            },
        });
        if (this.notice_entry_cid) {
            await this.pinRm(this.notice_entry_cid);
        }
        this.notice_entry_cid = newEntryCID;
    }

    async setApplicationEntry(newEntryCID: CID) {
        await this.pinAdd(newEntryCID, {
            metadata: {
                name: "application_entry:infinite",
                description: "update application_entry with infinite depth",
                timestamp: Date.now(),
            },
        });
        if (this.application_entry_cid) {
            await this.pinRm(this.application_entry_cid);
        }
        this.application_entry_cid = newEntryCID;
    }

    async setCommentEntry(newEntryCID: CID) {
        await this.pinAdd(newEntryCID, {
            metadata: {
                name: "comment_entry:infinite",
                description: "update comment_entry with infinite depth",
                timestamp: Date.now(),
            },
        });
        if (this.comment_entry_cid) {
            await this.pinRm(this.comment_entry_cid);
        }
        this.comment_entry_cid = newEntryCID;
    }

    async setStarEntry(newEntryCID: CID) {
        await this.pinAdd(newEntryCID, {
            metadata: {
                name: "star_entry:infinite",
                description: "update star_entry with infinite depth",
                timestamp: Date.now(),
            },
        });
        if (this.star_entry_cid) {
            await this.pinRm(this.star_entry_cid);
        }
        this.star_entry_cid = newEntryCID;
    }

    async setKnowledgeCommentIndexEntry(newEntryCID: CID) {
        await this.pinAdd(newEntryCID, {
            metadata: {
                name: "knowledge_comment_index_entry:infinite",
                description: "update knowledge_comment_index_entry with infinite depth",
                timestamp: Date.now(),
            },
        });
        if (this.knowledge_comment_index_entry_cid) {
            await this.pinRm(this.knowledge_comment_index_entry_cid);
        }
        this.knowledge_comment_index_entry_cid = newEntryCID;
    }

    async setFingerprintIndexEntry(newEntryCID: CID) {
        await this.pinAdd(newEntryCID, {
            metadata: {
                name: "fingerprint_index_entry:infinite",
                description: "update fingerprint_index_entry with infinite depth",
                timestamp: Date.now(),
            },
        });
        if (this.fingerprint_index_entry_cid) {
            await this.pinRm(this.fingerprint_index_entry_cid);
        }
        this.fingerprint_index_entry_cid = newEntryCID;
    }

    async setKnowledgeMetadataIndexEntry(newEntryCID: CID) {
        await this.pinAdd(newEntryCID, {
            metadata: {
                name: "knowledge_metadata_index_entry:infinite",
                description: "update knowledge_metadata_index_entry with infinite depth",
                timestamp: Date.now(),
            },
        });
        if (this.knowledge_metadata_index_entry_cid) {
            await this.pinRm(this.knowledge_metadata_index_entry_cid);
        }
        this.knowledge_metadata_index_entry_cid = newEntryCID;
    }

    async setKnowledgeCheckreportIndexEntry(newEntryCID: CID) {
        await this.pinAdd(newEntryCID, {
            metadata: {
                name: "knowledge_checkreport_index_entry:infinite",
                description: "update knowledge_checkreport_index_entry with infinite depth",
                timestamp: Date.now(),
            },
        });
        if (this.knowledge_checkreport_index_entry_cid) {
            await this.pinRm(this.knowledge_checkreport_index_entry_cid);
        }
        this.knowledge_checkreport_index_entry_cid = newEntryCID;
    }

    getCidKnownoknownEntry() {
        return this.knownoknown_entry_cid;
    }

    getCidMetadata() {
        return this.metadata_cid;
    }

    getCidKnowledgeListEntry() {
        return this.knowledge_list_entry_cid;
    }

    getCidNoticeEntry() {
        return this.notice_entry_cid;
    }

    getCidApplicationEntry() {
        return this.application_entry_cid;
    }

    getCidCommentEntry() {
        return this.comment_entry_cid;
    }

    getCidStarEntry() {
        return this.star_entry_cid;
    }

    getCidKnowledgeCommentIndexEntry() {
        return this.knowledge_comment_index_entry_cid;
    }

    getCidFingerprintIndexEntry() {
        return this.fingerprint_index_entry_cid;
    }

    getCidKnowledgeMetadataIndexEntry() {
        return this.knowledge_metadata_index_entry_cid;
    }

    getCidKnowledgeCheckreportIndexEntry() {
        return this.knowledge_checkreport_index_entry_cid;
    }
}

export { KnownoknownDagManager };
