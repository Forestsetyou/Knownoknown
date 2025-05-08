import { CID } from 'multiformats/cid'
import { User_Publickey, CID_Str } from './utils';
// 按照设计层次划分，被直接设计的dag结构使用interface，被间接设计的dag结构使用type

// md内部数据
type Code_Section_Data = string;    // 代码块数据
type Image_Data = Uint8Array;       // 图片数据
const IMAGE_DATA_TYPE = 'image/jpeg';   // 图片数据类型

// 指纹相似度
type Simhash_Similarity = number;
type Winnowing_Similarity = number;
type Phash_Similarity = number;

// 指纹数据
type Simhash_Fingerprint = string;
type Winnowing_Fingerprint = number[];
type Phash_Fingerprint = string;

// 加密密钥
type Decryption_Key = {
    key: Uint8Array,
    nonce: Uint8Array
};   // 对称加密密钥
type Mix_Decryption_Key = {
    publicKey: Array<string>,
    cipherText: Array<Array<string>>,
    messageLength: number,
}   // 混合加密密钥

type Md_Data = string;
type Knowledge_ID = CID_Str;
type Public_Order = number; // 知识发布顺序

// 自定义外链格式
enum Custom_Link_Format {
    IMAGE = '<KnownoknownImage:CID>',   // ![](<KnownoknownImage:CID>)
    CODE = '![<KnownoknownCode:type>](CID)',
}

enum Code_Type {
    JAVA = 'java',
    C = 'c',
    CPP = 'cpp',
    PYTHON = 'python',
    JAVASCRIPT = 'javascript'
}

const Image_Link_Format_Regex = /!\[([^\]]*)\]\(<KnownoknownImage:([^>]+)>\)/g;

const Code_Link_Format_Regex = new RegExp(`!\\[<KnownoknownCode:(${Object.values(Code_Type).join("|")})>]\\(([^)]+)\\)`, "g");

const Code_Section_Regex = new RegExp(`\\\`\\\`\\\`(${Object.values(Code_Type).join("|")})\\\n([\\s\\S]*?)\\\n\\\`\\\`\\\``, "g");

// 识别图片外链
function Find_Image_Link(md_data: Md_Data) {
    const matches = Array.from(md_data.matchAll(Image_Link_Format_Regex));
    const image_link_data: Array<string> = [];

    if (matches) {
        matches.forEach(match => {
            image_link_data.push(match[1]);
        });
    }

    return image_link_data;
}

// 识别代码块外链
function Find_Code_Link(md_data: Md_Data) {
    const matches = Array.from(md_data.matchAll(Code_Link_Format_Regex));
    const code_link_data: Array<{cid: string, type: Code_Type}> = [];

    if (matches) {
        matches.forEach(match => {
            code_link_data.push({
                type: match[1] as Code_Type,
                cid: match[2],
            })
        });
    }

    return code_link_data;
}

// 提取代码块为外链
function Extract_Code_Link(md_data: Md_Data) {
    const matches = Array.from(md_data.matchAll(Code_Section_Regex));
    const code_section_data: Array<{code: string, type: Code_Type}> = [];

    if (matches) {
        matches.forEach(match => {
            code_section_data.push({
                type: match[1] as Code_Type,
                code: match[2],
            })
        });
    }
    
    return code_section_data;
}

interface Tmp_Image_Pack {
    id: number,
    images: Record<string, CID>
}

interface Knowledge_Chapter_Data {    // 知识章节数据
    id: number, // 章节id 随机时间序列
    chapter_title: string, // 章节标题
    ipfs_markdown_data: Md_Data, // ipfs特殊支持 的章节 markdown 数据
    code_section_num: number, // 代码段数量
    code_sections: Record<string, CID>, // 代码段外链:代码段cid, cid-> Code_Section_Data
    image_num: number, // 图片数量
    images: Record<string, CID> // 图片外链:图片cid, cid-> Image_Data
}

interface Knowledge_Data {	// 具体某个知识的图谱数据
    chapter_num: number, // 章节数量
    chapters: Array<CID> // 各章节cid, cid-> Knowledge_Chapter_Data
}

type Pure_Text_Similarity_Record = {
    origin_knowledge_id: Knowledge_ID, // 本知识的id
    compared_knowledge_id: Knowledge_ID, // 被比较知识的id
    compared_knowledge_title: string, // 被比较知识的标题
    text_cid: CID_Str, // 本知识的纯文本cid
    compared_text_cid: CID_Str, // 被比较知识的纯文本cid
    similarity: Simhash_Similarity,	// 内部指纹数组位序表示被比较知识的public_order
    score: number, // 相似度得分
}

type Code_Section_Similarity_Record = {
    origin_knowledge_id: Knowledge_ID, // 本知识的id
    compared_knowledge_id: Knowledge_ID, // 被比较知识的id
    compared_knowledge_title: string, // 被比较知识的标题
    code_section_cid: CID_Str, // 本知识的代码块cid
    compared_code_section_cid: CID_Str, // 被比较知识的代码块cid
    similarity: Winnowing_Similarity, // 比较结果
    score: number, // 相似度得分
}

type Image_Similarity_Record = {
    origin_knowledge_id: Knowledge_ID, // 本知识的id
    compared_knowledge_id: Knowledge_ID, // 被比较知识的id
    compared_knowledge_title: string, // 被比较知识的标题
    image_cid: CID_Str, // 本知识的图片cid
    compared_image_cid: CID_Str, // 被比较知识的图片cid
    similarity: Phash_Similarity, // 比较结果
    score: number, // 相似度得分
}

interface Checkreport {	// check_report
    pure_text_similarity: Array<Pure_Text_Similarity_Record>,
    pure_text_score: number,	// 文本检测分数
    code_section_similarity: Array<Code_Section_Similarity_Record>,
	code_section_score: number,	// 代码块检测分数
    image_similarity: Array<Image_Similarity_Record>,
	image_score: number,	// 图片检测分数
    fingerprint_data_cid_str: string, // 报告对应的指纹数据cid_str
}	


// code_section_fingerprint: {	// code_section_fingerprint, 代码块的指纹数据, minhash
//     <CID_Str>: {
//         type: '<CodeType>',
//         fingerprint: [	// winnowing 指纹
//             ...
//         ]
//     },
//     ...
// },

type Code_Section_Fingerprint_Record = {
    type: Code_Type, // <CodeType>, 代码类型
    fingerprint: Winnowing_Fingerprint // <winnowing_fingerprint>, 指纹数据
}
type Code_Section_Fingerprint = {
    fingerprint: Record<
        CID_Str, // <CID_Str>, 代码块cid_Str
        Code_Section_Fingerprint_Record
    >,
    self_description: string,   // 默认为 "Code_Section_Fingerprint"
    knowledge_id: Knowledge_ID, // 知识id
};

type Image_Fingerprint = {
    fingerprint: Record<
        CID_Str, // 图片cid
        Phash_Fingerprint // 指纹数据
    >,
    self_description: string,   // 默认为 "Image_Fingerprint"
    knowledge_id: Knowledge_ID, // 知识id
};

type Pure_Text_Fingerprint = {
    fingerprint: Record<
        CID_Str, // 纯文本cid, cid -> ipfs_markdown_data
        Simhash_Fingerprint
    >,
    self_description: string,   // 默认为 "Pure_Text_Fingerprint"
    knowledge_id: Knowledge_ID, // 知识id
};

interface Fingerprint_Data {	// fingerprint_data
    code_section_fingerprint: CID,	// 代码块指纹数据cid, cid-> Code_Section_Fingerprint
    image_fingerprint: CID,	// 图片指纹数据cid, cid-> Image_Fingerprint
    pure_text_fingerprint: CID, // 纯文本指纹数据cid, cid-> Pure_Text_Fingerprint
    knowledge_data_cid_str: string, // 对应知识数据的cid_str
}

type Intro_Interface = {
    content: string, // 简介正文
    image: CID // 简介的封面图片数据，索引地址只能是CID
}

interface Decryption_Keys {	// 混合加密密钥
    free: Decryption_Key | null,	// 免费后才有的对称加密密钥, 可以为null
    specialized: Record<User_Publickey, Mix_Decryption_Key>	// 每个公钥对应的混合密钥
}

interface Knowledge_Metadata {	// 'metadata' for knowledge
	id: Knowledge_ID, // 知识ID, 现决定使用本知识的knowledge_data_cid的cid_str来标识该id
    public_order: Public_Order,	// 在整个知识档案中本知识的发布位序，即第几个发布，同时也是报告生成位序，决定其需要比较的指纹组数。
    title: string, // 知识实体标题
    author: User_Publickey, // 创作者的账户地址, PublicKey
    price: number, // Mina定价 2e9 Mina = 2 Mina
    sales: number, // 发售量，购买该知识的用户数量
    sale_volume: number, // 发售容量，发售数量达到该容量后知识内容将被公开
    intro: Intro_Interface,
    tags: Array<string>, // 知识标签
    decryption_keys: Decryption_Keys,	// 混合加密密钥
    timestamp: number, // 知识发布时间
}

interface Knowledge_Entry {
	metadata: CID,	// 包括knowledge intro, cid-> Metadata
    encrypted_car_knowledge_data: CID,	// 混合加密后的知识car数据, cid-> Encrypted_Car_Knowledge_Data
	fingerprint_data: CID, // 知识指纹数据, cid-> Fingerprint_Data
    check_report: CID,	// 知识的查重报告的CID, 生成报告后添加CID, 无报告的知识只能浏览简介, 无法被购买, 可以为null, cid-> Check_Report
}

interface Knowledge_Check_Pack {    // 专用于创建知识和管理员查验知识，将待发布知识与明文内容打包在一起
    knowledge_entry: CID,
    knowledge_data: CID,
}

interface Temp_Image_Pack { // 临时图片包，用于渲染
    id: number,
    user: User_Publickey,
    images: Record<string, CID>
}

interface Temp_Key_Pack {
    key: Uint8Array,
    nonce: Uint8Array,
    public_order: Public_Order,
}

export type { Knowledge_Entry, Knowledge_ID, Md_Data, Pure_Text_Fingerprint, Code_Section_Fingerprint, Image_Fingerprint, Knowledge_Metadata, Checkreport, Public_Order, Knowledge_Check_Pack, Knowledge_Chapter_Data, Code_Section_Data, Image_Data, Tmp_Image_Pack, Fingerprint_Data, Temp_Image_Pack, Decryption_Keys, Temp_Key_Pack};

export { Custom_Link_Format, Code_Type, IMAGE_DATA_TYPE, Image_Link_Format_Regex, Code_Link_Format_Regex, Code_Section_Regex };