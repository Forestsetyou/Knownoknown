import { Knownoknown_Entry, Knowledge_List_Entry, Notice_Entry, Application_Entry, Comment_Entry, Star_Enrty, Knowledge_Comment_Index_Entry, Fingerprint_Index_Entry, Knowledge_Metadata_Index_Entry, Knowledge_Checkreport_Index_Entry, Knownoknown_Metadata } from './knownoknownDagInterface';
import { HeliaLibp2p } from 'helia';
import { Libp2p } from 'libp2p';
import { ServiceMap } from '@libp2p/interface';
import { unixfs, UnixFS } from '@helia/unixfs'
import { dagCbor, DAGCBOR } from '@helia/dag-cbor'
import { car, Car } from '@helia/car'
import { CID } from 'multiformats/cid'

interface KnownoknownDagManagerInterface {
    knownoknown_entry?: Knownoknown_Entry;
    knowledge_list_entry?: Knowledge_List_Entry;
    notice_entry?: Notice_Entry;
    application_entry?: Application_Entry;
    comment_entry?: Comment_Entry;
    star_entry?: Star_Enrty;
    knowledge_comment_index_entry?: Knowledge_Comment_Index_Entry;
    fingerprint_index_entry?: Fingerprint_Index_Entry;
    knowledge_metadata_index_entry?: Knowledge_Metadata_Index_Entry;
    knowledge_checkreport_index_entry?: Knowledge_Checkreport_Index_Entry;
}

class KnownoknownDagManager implements KnownoknownDagManagerInterface {

    knownoknown_entry?: Knownoknown_Entry;
    knowledge_list_entry?: Knowledge_List_Entry;
    notice_entry?: Notice_Entry;
    application_entry?: Application_Entry;
    comment_entry?: Comment_Entry;
    star_entry?: Star_Enrty;
    knowledge_comment_index_entry?: Knowledge_Comment_Index_Entry;
    fingerprint_index_entry?: Fingerprint_Index_Entry;
    knowledge_metadata_index_entry?: Knowledge_Metadata_Index_Entry;
    knowledge_checkreport_index_entry?: Knowledge_Checkreport_Index_Entry;

    constructor() {}

    async initialize() {

    }

    static createNewKnownoknown_Metadata(): Knownoknown_Metadata { // 创建新的平台元数据
        return {
            knowledge_num: 0,
            free_num: 0,
            report_num: 0,
            notices_num: 0,
            comment_num: 0,
            application_num: 0
        }
    }
}

export { KnownoknownDagManager };
