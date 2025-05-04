// import { pinDatabase } from './pinDatabase.js';
import { Helia } from '@helia/http';
import { unixfs, UnixFS } from '@helia/unixfs'
import { dagCbor, DAGCBOR } from '@helia/dag-cbor'
import { car, Car } from '@helia/car'
import { CID } from 'multiformats/cid'
import { CarReader } from '@ipld/car'
import { createMyHeliaHTTP } from '../interface/utils';
import { Knownoknown_Entry, Knowledge_List_Entry, Notice_Entry, Application_Entry, Comment_Entry, Star_Enrty, Knowledge_Comment_Index_Entry, Fingerprint_Index_Entry, Knowledge_Metadata_Index_Entry, Knowledge_Checkreport_Index_Entry, Knownoknown_Metadata } from '../interface/knownoknownDag/knownoknownDagInterface';
import { KnownoknownDagManagerClient, KnowledgeCheckPackManagerClient } from '../interface/knownoknownDag/knownoknownDagManager';
import { createContext } from 'react';
import { DAGCid } from 'knownoknown-contract';

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
        this.knownoknownDagManager.reset();
        const knownoknownEntryCID = CID.parse(knownoknownEntryCIDStr);
        await this.dagCborGet(knownoknownEntryCID);
        this.knownoknownDagManager.setKnownoknownEntry(knownoknownEntryCID);
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

    async createNewKnowledge(walletAddress: string) {
        await this.knowledgeCheckPackManager.reset();
        const newKnowledgeMetadata = {
            id: '',
            public_order: 0,
            title: '',
            author: walletAddress,
            price: 0,
            sales: 0,
            sale_volume: 0,
        };
        const newKnowledgeMetadataCID = await this.dagCbor.add(newKnowledgeMetadata);
        await this.knowledgeCheckPackManager.setKnowledgeMetadata(newKnowledgeMetadataCID);
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
        const knowledgeMetadataCID = await this.knowledgeCheckPackManager.getKnowledgeMetadata();
        return await this.dagCbor.get(knowledgeMetadataCID!);
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