import { CID } from 'multiformats/cid';
import { Knowledge_Entry, Knowledge_ID, Md_Data, Pure_Text_Fingerprint, Code_Section_Fingerprint, Image_Fingerprint, Knowledge_Metadata, Checkreport, Public_Order } from './knowledgeEntryDagInterface';
import { User_Publickey, CID_Str } from './utils';

type Notice_ID = number;
type Application_ID = number;
type Comment_ID = number;
type Transaction_Hash = CID_Str;

interface Knowledge_List_Entry {
    knowledge_entry_list: Array<CID>, // cid-> Knowledge_Entry
};

interface Knownoknown_Metadata {	// 平台 metadata
	knowledge_num: number,	// 已创作且记录的知识实体的数量
    free_num: number,	// 已免费的知识实体数量
    report_num: number,	// 已生成查重检测报告的知识实体数量
    notices_num: number,	// 通知总数
    comment_num: number,	// 评论总数
    application_num: number,	// 请求事件总数
}

type Notice_Record = {
    id: Notice_ID,	// 消息 ID
    content: string, // 通知内容
    timestamp: number, // 通知时间
}

type User_Notice = {	// user_notice
    user: User_Publickey,	// 用户地址
	notice_list: Array<Notice_Record>
}

interface Notice_Entry {	// notice_entry
	user_notice_list: Record<User_Publickey, User_Notice>, // 按照用户罗列通知信息
    platform_notice_list: Array<Notice_Record> // 针对所有用户的消息通知
}

enum Application_Type {
    Buy_Knowledge = 'Buy_Knowledge',
    Claim_Income = 'Claim_Income',
}

type Application_Buy_Knowledge_Record_data = {
    purchaser: User_Publickey,
    knowledge_id: Knowledge_ID,
    author: User_Publickey,
    transaction_hash: Transaction_Hash,
    cost: number,   // 付款金额
}

type Application_Claim_Income_Record_data = {
    purchaser: User_Publickey,
    author: User_Publickey,
    knowledge_id: Knowledge_ID,
    user_decrypter_cid: CID_Str,
    transaction_hash?: Transaction_Hash,
    income: number,   // 提款金额
}

type Application_Buy_Knowledge_Record = {
    id: Application_ID,
    done: boolean,
    type: Application_Type.Buy_Knowledge,
    data: Application_Buy_Knowledge_Record_data,
}

type Application_Claim_Income_Record = {
    id: Application_ID,
    done: boolean,
    type: Application_Type.Claim_Income,
    data: Application_Claim_Income_Record_data,
}

interface Application_Entry {
    application_list: Array<CID>, // cid-> Application_Claim_Income_Record | Application_Buy_Knowledge_Record
};

interface Comment_Record {	// comment_record
    comment_id: Comment_ID,	// 评论的id, 即comment在comment_entry中的位序
    knowledge_id: Knowledge_ID,	// 所评论的知识的id
    commenter: User_Publickey,	// 评论者的地址
    comment_text: string,	// 评论内容
}

interface Comment_Entry {
    comment_list: Array<CID>, // cid-> Comment_Record
};

// [	// knowledge_comment_index_entry
//     [	// 对应于public_order=0的knowledge的comment的伪索引
//     <CID_Str>,
//     ...
//     ],
//     [],	// 表示id=1的knowledge无评论
//     ...
// ]
interface Knowledge_Comment_Index_Entry {
    knowledge_comment_index_list: Array<Array<CID_Str>> // cid->comment_record
};

interface Star_Enrty {
    star_list: Record<User_Publickey, Array<Public_Order>> // cid->star_record
};

// {	// fingerprint_index_entry
// 	simhash: [
//         <CID_Str>,	// simhash指纹数据的CID_Str, 数组位序表示对应知识的public_order
//         ...
//     ],
//     minhash: [
//         <CID_Str>,	// minhash指纹数据的CID_Str, 数组位序表示对应知识的public_order
//         ...
//     ],
//     phash: [
//         <CID_Str>,	// phash指纹数据的CID_Str, 数组位序表示对应知识的public_order
//     	...
//     ],
//     winnowing: [
//         <CID_Str>,	// winnowing指纹数据的CID_Str, 数组位序表示对应知识的public_order
//         ...
//     ],
// }
interface Fingerprint_Index_Entry {	// fingerprint_index_entry
	pure_text_fingerprint: Array<CID_Str>,  // cid-> Pure_Text_Fingerprint
    code_section_fingerprint: Array<CID_Str>, // cid-> Code_Section_Fingerprint
    image_fingerprint: Array<CID_Str>, // cid-> Image_Fingerprint
}


// [	// knowledge_metadata_index_entry
// 	<CID_Str>,	// public_order 对应的 knowledge 的 metadata 的 CID_Str
//     ...
// ]
interface Knowledge_Metadata_Index_Entry {
    knowledge_metadata_index_list: Array<CID_Str> // cid-> Knowledge_Metadata
};

// [	// knowledge_checkreport_index_entry
// 	<CID_Str>,	// public_order 对应的 knowledge 的 checkreport 的 CID_Str
//     ...
// ]
interface Knowledge_Checkreport_Index_Entry {
    knowledge_checkreport_index_list: Array<CID_Str> // cid-> Checkreport
};

interface Knownoknown_Entry {	// KnowNoKnownEntry
    base_entry: {	// 系统各存储部分的entry
        metadata: CID, // 平台元数据, cid-> Knownoknown_Metadata
        knowledge_list_entry: CID, // 索引所有知识实体, cid-> Knowledge_List_Entry
        notice_entry: CID, // 存储针对用户的通知信息, cid-> Notice_Entry
    	application_entry: CID, // 存储请求事件，是一个常更新文件, cid-> Application_Entry
        comment_entry: CID, // 存储针对知识的评论, cid-> Comment_Entry
        star_entry: CID, // 存储收藏记录, cid-> Star_Enrty
    },
    index_entry: { // 专用于快速索引的entry，内部使用伪索引
        fingerprint_index_entry: CID,	// 知识指纹, cid-> Fingerprint_Index_Entry
        knowledge_metadata_index_entry: CID,	// 知识元数据与简介, cid-> Knowledge_Metadata_Index_Entry
        knowledge_comment_index_entry: CID,	// 知识评论, cid-> Knowledge_Comment_Index_Entry
        knowledge_checkreport_index_entry: CID,	// 知识检测报告, cid-> Knowledge_Checkreport_Index_Entry
    },
}

export type { Knownoknown_Entry, Knowledge_List_Entry, Notice_Entry, Application_Entry, Comment_Entry, Star_Enrty, Knowledge_Comment_Index_Entry, Fingerprint_Index_Entry, Knowledge_Metadata_Index_Entry, Knowledge_Checkreport_Index_Entry, Knownoknown_Metadata };
