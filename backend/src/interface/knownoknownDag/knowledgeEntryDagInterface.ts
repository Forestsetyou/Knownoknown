import { CID } from 'multiformats/cid'
import { CarReader } from '@ipld/car'
import { car, Car } from '@helia/car'
import { createReadStream, createWriteStream } from 'fs'
import { FsBlockstore } from 'blockstore-fs';
import { DAGCBOR } from '@helia/dag-cbor';
import { Buffer } from 'buffer';
import { User_Publickey, CID_Str } from './utils';
// 按照设计层次划分，被直接设计的dag结构使用interface，被间接设计的dag结构使用type

// md内部数据
type Code_Section_Data = string;    // 代码块数据
type Image_Data = Uint8Array;       // 图片数据

// 指纹相似度
type Simhash_Similarity = number;
type Minhash_Similarity = number;
type Winnowing_Similarity = number;
type Phash_Similarity = number;

// 指纹数据
type Simhash_Fingerprint = Uint8Array;
type Minhash_Fingerprint = Uint8Array;
type Winnowing_Fingerprint = Uint8Array;
type Phash_Fingerprint = Uint8Array;

// 加密密钥
type Decryption_Key = Uint8Array;   // 对称加密密钥
type Mix_Decryption_Key = Uint8Array;   // 混合加密密钥

type Md_Data = string;
type Knowledge_ID = CID_Str;
type Public_Order = number; // 知识发布顺序

// 将markdown数据从原始格式转换为支持ipfs的特殊格式, 即将原始的代码块与图片链接替换为本项目设计的特殊外链
function Convert_Md_From_Original_To_IPFS(md_data: Md_Data) {}
// 将markdown数据从支持ipfs的特殊格式转换为原始格式, 即将本项目设计的特殊外链替换为原始的代码块与图片链接
function Convert_Md_From_IPFS_To_Original(md_data: Md_Data) {}

interface Knowledge_Chapter_Data {    // 知识章节数据
    chapter_title: string, // 章节标题
    ipfs_markdown_data: Md_Data, // ipfs特殊支持 的章节 markdown 数据
    code_section_num: number, // 代码段数量
    code_sections: Array<CID>, // 代码段cid, cid-> Code_Section_Data
    image_num: number, // 图片数量
    images: Array<CID> // 图片cid, cid-> Image_Data
}

interface Knowledge_Data {	// 具体某个知识的图谱数据
    chapter_num: number, // 章节数量
    chapters: Array<CID> // 各章节cid, cid-> Knowledge_Chapter_Data
}

async function Import_Knowledge_Data_From_Car(cid: CID, bytes: Buffer, carDb: Car, blockstore: FsBlockstore): Promise<CID | null> {

    const reader = createReadStream(bytes)
    const carReader = await CarReader.fromIterable(reader)
    
    await carDb.import(carReader)
    if (blockstore.has(cid)) {
        return cid
    }
    return null
}

async function Export_Knowledge_Data_To_Car(export_knowledge_data_cid: CID, carDb: Car): Promise<Buffer> {

    const writer = createWriteStream('test.car')
    const bufferChunks: Buffer[] = []
    let resultBuffer: Buffer
    writer.on('finish', () => {
        // 合并所有 Buffer
        resultBuffer = Buffer.concat(bufferChunks);
        console.log('Buffer content:', resultBuffer); // 输出 Buffer 内容
    });
    for await (const buf of carDb.stream(export_knowledge_data_cid)) {
        writer.write(buf)
        bufferChunks.push(Buffer.from(buf))
    }
    writer.end()
    return resultBuffer
}

type Pure_Text_Similarity_Interface = {
    simhash: Array<Simhash_Similarity>,	// 内部指纹数组位序表示被比较知识的public_order
    top_5_minhash: Record<CID_Str, Minhash_Similarity>   // <KnowledgeID>: <ComparedRes>
}

// winnowing: {
//     <KnowledgeID>: {	// 被比较知识的id
//         <CID_Str>: {	// 本知识代码块的cid
//             // 被比较代码块的cid_str: res
//             <CID_Str>: <ComparedRes>,	
//         },
//     },
// }
type Code_Section_Similarity_Interface = {
    winnowing: Record<
        Knowledge_ID, // <KnowledgeID>, 被比较知识的id
        Record<
            CID_Str, // <CID_Str>, 本知识代码块的cid
            Record<
                CID_Str, // <CID_Str>, 被比较代码块的cid_str
                Winnowing_Similarity // <ComparedRes>, 比较结果res
            >
        >
    >
}


// image_similarity: {	// 图片比较
//     phash: {
//         <KnowledgeID>: {	// 被比较知识的id
//             <CID_Str>: {	// 本知识图片的cid
//                 // 被比较图片的cid_str: res
//                 <CID_Str>: <ComparedRes>,
//                 ...
//             },
//             ...
//         },
//         ...
//     }
// },
type Image_Similarity_Interface = {
    phash: Record<
        Knowledge_ID, // <KnowledgeID>, 被比较知识的id
        Record<
            CID_Str, // <CID_Str>, 本知识图片的cid
            Record<
                CID_Str, // <CID_Str>, 被比较图片的cid_str
                Phash_Similarity // <ComparedRes>, 比较结果res
            >
        >
    >
}

interface Checkreport {	// check_report
	score: number,	// 报告综合分数
    comment: string,	// 报告评语
    pure_text_similarity: Pure_Text_Similarity_Interface,
    pure_text_score: number,	// 文本检测分数
    code_section_similarity: Code_Section_Similarity_Interface,
	code_section_score: number,	// 代码块检测分数
    image_similarity: Image_Similarity_Interface,
	image_score: number,	// 图片检测分数
}	// 目前的报告格式仅用于测试，后续仍要修改


// code_section_fingerprint: {	// code_section_fingerprint, 代码块的指纹数据, minhash
//     <CID_Str>: {
//         type: '<CodeType>',
//         fingerprint: [	// winnowing 指纹
//             ...
//         ]
//     },
//     ...
// },
enum Code_Type {
    JAVA = 'java',
    C = 'c',
    CPP = 'cpp',
    PYTHON = 'python',
    JAVASCRIPT = 'javascript'
}

type Code_Section_Fingerprint_Record = {
    type: Code_Type, // <CodeType>, 代码类型
    fingerprint: Winnowing_Fingerprint // <winnowing_fingerprint>, 指纹数据
}
type Code_Section_Fingerprint = Record<
    CID_Str, // <CID_Str>, 代码块cid_Str
    Code_Section_Fingerprint_Record
>;

type Image_Fingerprint = Record<
    CID_Str, // 图片cid
    Phash_Fingerprint // 指纹数据
>;

type Pure_Text_Fingerprint_Data = {
    simhash: Simhash_Fingerprint,   // simhash指纹
    minhash: Minhash_Fingerprint    // minhash指纹
}

type Pure_Text_Fingerprint = Record<
    CID_Str, // 纯文本cid, cid -> ipfs_markdown_data
    Pure_Text_Fingerprint_Data
>

interface Fingerprint_Data {	// fingerprint_data
    code_section_fingerprint: CID,	// 代码块指纹数据cid, cid-> Code_Section_Fingerprint
    image_fingerprint: CID,	// 图片指纹数据cid, cid-> Image_Fingerprint
    pure_text_fingerprint: Pure_Text_Fingerprint // 纯文本指纹数据
}

type Intro_Interface = {
    content: string, // 简介正文
    images: Array<CID> // 简介的图片数据，索引地址只能是CID，图片顺序严格遵循数组顺序，最多三张
}

interface Knowledge_Metadata {	// 'metadata' for knowledge
	id: Knowledge_ID, // 知识ID, 现决定使用本知识的encrypted_car_knowledge_data_cid的cid_str来标识该id
    public_order: Public_Order,	// 在整个知识档案中本知识的发布位序，即第几个发布，同时也是报告生成位序，决定其需要比较的指纹组数。
    title: string, // 知识实体标题
    author: User_Publickey, // 创作者的账户地址, PublicKey
    price: number, // Mina定价 2e9 Mina = 2 Mina
    sales: number, // 发售量，购买该知识的用户数量
    sale_volume: number, // 发售容量，发售数量达到该容量后知识内容将被公开
    intro: Intro_Interface
}

interface Decryption_Keys {	// 混合加密密钥
    free: Decryption_Key | null,	// 免费后才有的对称加密密钥, 可以为null
    specialized: Record<User_Publickey, Mix_Decryption_Key>	// 每个公钥对应的混合密钥
}

interface Knowledge_Entry {
	metadata: CID,	// 包括knowledge intro, cid-> Metadata
    encrypted_car_knowledge_data: CID,	// 混合加密后的知识car数据, cid-> Encrypted_Car_Knowledge_Data
    decryption_keys: Decryption_Keys,	// 混合加密密钥
	fingerprint_data: CID, // 知识指纹数据, cid-> Fingerprint_Data
    check_report: CID | null,	// 知识的查重报告的CID, 生成报告后添加CID, 无报告的知识只能浏览简介, 无法被购买, 可以为null, cid-> Check_Report
}

export { Knowledge_Entry, Knowledge_ID, Md_Data, Pure_Text_Fingerprint, Code_Section_Fingerprint, Image_Fingerprint, Knowledge_Metadata, Checkreport, Public_Order };
