import Parser, { Query } from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import Python from 'tree-sitter-python';
import CPP from 'tree-sitter-cpp';
import C from 'tree-sitter-c';
import Java from 'tree-sitter-java';
import * as crypto from 'crypto';

// https://tree-sitter.github.io/tree-sitter/7-playground.html
// https://zhuanlan.zhihu.com/p/716273346

const NODE_RANGE_PATTERN = "beg_row,beg_col-end_row,end_col";
const COMMENT_FLAG = "<*comment*>";
const NONE_POS = -1;
const QUERY_PATTERN_EXTRACT = {
    python: {
        class: (match: Parser.QueryMatch) => match.pattern === 0,
        method: (match: Parser.QueryMatch) => match.pattern === NONE_POS,
        property: (match: Parser.QueryMatch) => match.pattern === NONE_POS,
        func: (match: Parser.QueryMatch) => match.pattern === 1,
        call: (match: Parser.QueryMatch) => match.pattern === 2,    // pure function call and class method invoke
        var: (match: Parser.QueryMatch) => match.pattern === 3,
        comment: (match: Parser.QueryMatch) => match.pattern === 4,
    },
    javascript: {
        class: (match: Parser.QueryMatch) => match.pattern === 0,
        method: (match: Parser.QueryMatch) => match.pattern === 1 && match.captures[0].node.text !== "constructor",
        property: (match: Parser.QueryMatch) => match.pattern === 2 || match.pattern === 3,
        func: (match: Parser.QueryMatch) => match.pattern === 4,
        call: (match: Parser.QueryMatch) => match.pattern === 5,
        var: (match: Parser.QueryMatch) => match.pattern === 6,
        comment: (match: Parser.QueryMatch) => match.pattern === 7,
    },
    cpp: {
        class: (match: Parser.QueryMatch) => match.pattern === 0 || match.pattern === 1 || match.pattern === 2,
        method: (match: Parser.QueryMatch) => match.pattern === 3,
        property: (match: Parser.QueryMatch) => match.pattern === 4 || match.pattern === 5,
        func: (match: Parser.QueryMatch) => match.pattern === 6,
        call: (match: Parser.QueryMatch) => match.pattern === 7,
        var: (match: Parser.QueryMatch) => match.pattern === 8,
        comment: (match: Parser.QueryMatch) => match.pattern === 9,
    },
    c: {
        class: (match: Parser.QueryMatch) => match.pattern === 0,
        method: (match: Parser.QueryMatch) => match.pattern === 1,
        property: (match: Parser.QueryMatch) => match.pattern === 2 || match.pattern === 3,
        func: (match: Parser.QueryMatch) => match.pattern === 4,
        call: (match: Parser.QueryMatch) => match.pattern === 5,
        var: (match: Parser.QueryMatch) => match.pattern === 6,
        comment: (match: Parser.QueryMatch) => match.pattern === 7,
    },
    java: {
        class: (match: Parser.QueryMatch) => match.pattern === 0 || match.pattern === 1,
        method: (match: Parser.QueryMatch) => match.pattern === 2,
        property: (match: Parser.QueryMatch) => match.pattern === 3,
        func: (match: Parser.QueryMatch) => match.pattern === NONE_POS,
        call: (match: Parser.QueryMatch) => match.pattern === 4,
        var: (match: Parser.QueryMatch) => match.pattern === 5,
        comment: (match: Parser.QueryMatch) => match.pattern === 6,
    },
}
const QUERY_PATTERNs = {
    python: `
(class_definition
name: (identifier) @class.name)
(function_definition
name: (identifier) @func.name)
(call
function: (identifier) @call.name)
(identifier) @var
(comment) @comment
`,
    javascript: `
(class_declaration
name: (identifier) @class.name)
(method_definition
name: (property_identifier) @class.method)
(field_definition
property: (property_identifier) @class.property)
(member_expression
property: (property_identifier) @class.property)
(function_declaration
name: (identifier) @func.name)
(call_expression
function: (identifier) @call.name)
(identifier) @var
(comment) @comment
`,
    cpp: `
(class_specifier
name: (type_identifier) @class.name)
(type_identifier) @class.name
(namespace_identifier) @class.name
(function_declarator
declarator: (field_identifier) @class.method)
(field_declaration
declarator: (field_identifier) @class.property)
(field_identifier) @class.property
(function_declarator
declarator: (identifier) @func.name)
(call_expression
function: (identifier) @call.name)
(identifier) @var
(comment) @comment
`,
    c: `
(type_identifier) @class.name
(function_declarator
declarator: (field_identifier) @class.method)
(field_declaration
declarator: (field_identifier) @class.property)
(field_identifier) @class.property
(function_declarator
declarator: (identifier) @func.name)
(call_expression
function: (identifier) @call.name)
(identifier) @var
(comment) @comment
`,  
    java: `
(class_declaration
name: (identifier) @class.name)
(type_identifier) @class.name
(method_declaration
name: (identifier) @class.method)
(field_declaration
declarator: (variable_declarator
name: (identifier) @class.property))
(method_invocation
name: (identifier) @call)
(identifier) @var
(line_comment) @comment
`,
};
const NORM_PARM = {
    var: "_VAR_<:Number>",
    func: "_FUNC_<:Number>",
    call: "_CALL_<:Number>",
    class: "_CLASS_<:Number>",
    property: "_PROPERTY_<:Number>",
    method: "_METHOD_<:Number>",
}

interface NormParamCount {
    var: number;
    func: number;
    call: number;
    class: number;
    property: number;
    method: number;
}

interface NodeInfo {
    name: string;   // node.text
    range: string;  // example: 1,7-2,10 | 'beg_row,beg_col-end_row,end_col'
}

interface NodeRange {
    beg_row: number;
    beg_col: number;
    end_row: number;
    end_col: number;
}

function extractNodeInfo(node: any) {
    const range = NODE_RANGE_PATTERN.replace("beg_row", node.startPosition.row)
        .replace("beg_col", node.startPosition.column)
        .replace("end_row", node.endPosition.row)
        .replace("end_col", node.endPosition.column);
    const nodeinfo: NodeInfo = {
        name: node.text,
        range,
    }
    return nodeinfo;
}

function extractNodeRange(range_str: string) {
    const [beg, end] = range_str.split("-");
    const [beg_row, beg_col] = beg.split(",").map(Number);
    const [end_row, end_col] = end.split(",").map(Number);
    const nodeRange: NodeRange = {
        beg_row,
        beg_col,
        end_row,
        end_col,
    }
    return nodeRange;
}

/*
    NormMap: {
        "1,1-1,2": "n"
    }
*/
type VarMap = Record<string, string>;
type NormMap = Record<string, string>;

class CodeNormalizer {
    private code_rows: string[];
    private language: string;
    private parser: Parser;
    private tree: any;
    private query: Query;
    private normParamCount: NormParamCount;
    private varMap?: VarMap;
    private normMap?: NormMap;

    constructor(code: string, language: string) {
        this.code_rows = code.replace(/\r/g, "").split("\n");
        this.language = language;
        this.parser = new Parser();
        switch (language) {
            case 'python':
                this.parser.setLanguage(Python);
                this.query = new Query(Python, QUERY_PATTERNs.python);
                break;
            case 'javascript':
                this.parser.setLanguage(JavaScript);
                this.query = new Query(JavaScript, QUERY_PATTERNs.javascript);
                break;
            case 'cpp':
                this.parser.setLanguage(CPP);
                this.query = new Query(CPP, QUERY_PATTERNs.cpp);
                break;
            case 'c':
                this.parser.setLanguage(C);
                this.query = new Query(C, QUERY_PATTERNs.c);
                break;
            case 'java':
                this.parser.setLanguage(Java);
                this.query = new Query(Java, QUERY_PATTERNs.java);
                break;
            default:
                throw new Error(`Unsupported language: ${language}`);
        }
        this.tree = this.parser.parse(code);
        this.normParamCount = {
            var: 0,
            func: 0,
            call: 0,
            class: 0,
            property: 0,
            method: 0,
        }
    }
    
    private getVarArrByRow(row: number) {
        const varArr = [];
        Object.keys(this.varMap).forEach((range) => {
            const nodeRange = extractNodeRange(range);
            if (nodeRange.beg_row === row) {
                varArr.push({
                    ...nodeRange,
                    origin_name: this.varMap[range],
                });
            }
        });
        varArr.sort((a, b) => a.beg_col - b.beg_col);
        return varArr;
    }

    private parseMultiLineRange(range: string) {
        const multiLineRange = [];
        const nodeRange = extractNodeRange(range);
        let idx = nodeRange.beg_col;
        for (let i = nodeRange.beg_row; i <= nodeRange.end_row; i++) {
            const row_range = `${i},${idx}-${i},${this.code_rows[i].length}`;
            idx = 0;
            multiLineRange.push(row_range);
        }
        return multiLineRange;
    }

    private structNormMap() {
        const varMap: VarMap = {};
        const normMap: NormMap = {};
        const matches = this.query.matches(this.tree.rootNode);
        const ptn_extract = QUERY_PATTERN_EXTRACT[this.language];
        const class_matches = matches.filter((match) => ptn_extract.class(match));
        const method_matches = matches.filter((match) => ptn_extract.method(match));
        const property_matches = matches.filter((match) => ptn_extract.property(match));
        const function_matches = matches.filter((match) => ptn_extract.func(match));
        const call_matches = matches.filter((match) => ptn_extract.call(match));
        const var_matches = matches.filter((match) => ptn_extract.var(match));
        const comment_matches = matches.filter((match) => ptn_extract.comment(match));
        for (const match of class_matches) {
            const nodeinfo = extractNodeInfo(match.captures[0].node);
            if (!normMap[nodeinfo.name]) {
                const norm_name = NORM_PARM.class.replace("<:Number>", this.normParamCount.class.toString());
                normMap[nodeinfo.name] = norm_name;
                this.normParamCount.class++;
            }
            varMap[nodeinfo.range] = nodeinfo.name;
        }
        for (const match of method_matches) {
            const nodeinfo = extractNodeInfo(match.captures[0].node);
            if (!normMap[nodeinfo.name]) {
                const norm_name = NORM_PARM.method.replace("<:Number>", this.normParamCount.method.toString());
                normMap[nodeinfo.name] = norm_name;
                this.normParamCount.method++;
            }
            varMap[nodeinfo.range] = nodeinfo.name;
        }
        for (const match of property_matches) {
            const nodeinfo = extractNodeInfo(match.captures[0].node);
            if (!normMap[nodeinfo.name]) {
                const norm_name = NORM_PARM.property.replace("<:Number>", this.normParamCount.property.toString());
                normMap[nodeinfo.name] = norm_name;
                this.normParamCount.property++;
            }
            varMap[nodeinfo.range] = nodeinfo.name;
        }
        for (const match of function_matches) {
            const nodeinfo = extractNodeInfo(match.captures[0].node);
            if (!normMap[nodeinfo.name]) {
                const norm_name = NORM_PARM.func.replace("<:Number>", this.normParamCount.func.toString());
                normMap[nodeinfo.name] = norm_name;
                this.normParamCount.func++;
            }
            varMap[nodeinfo.range] = nodeinfo.name;
        }
        for (const match of call_matches) {
            const nodeinfo = extractNodeInfo(match.captures[0].node);
            if (!normMap[nodeinfo.name]) {
                const norm_name = NORM_PARM.call.replace("<:Number>", this.normParamCount.call.toString());
                normMap[nodeinfo.name] = norm_name;
                this.normParamCount.call++;
            }
            varMap[nodeinfo.range] = nodeinfo.name;
        }
        for (const match of var_matches) {
            const nodeinfo = extractNodeInfo(match.captures[0].node);
            if (!normMap[nodeinfo.name]) {
                const norm_name = NORM_PARM.var.replace("<:Number>", this.normParamCount.var.toString());
                normMap[nodeinfo.name] = norm_name;
                this.normParamCount.var++;
            }
            if (!varMap[nodeinfo.range]) {  // 如果该节点没有被标准化过
                varMap[nodeinfo.range] = nodeinfo.name;
            }
        }
        normMap[COMMENT_FLAG] = ""; // 添加注释标志,将其置空
        for (const match of comment_matches) {
            const nodeinfo = extractNodeInfo(match.captures[0].node);
            const multiLineRange = this.parseMultiLineRange(nodeinfo.range);
            multiLineRange.forEach((range) => {
                varMap[range] = COMMENT_FLAG;
            });
        }
        this.varMap = varMap;
        this.normMap = normMap;
    }

    normalize() {
        this.structNormMap();
        const code_rows_len = this.code_rows.length;
        const norm_code_rows = [];
        for (let i = 0; i < code_rows_len; i++) {
            const var_arr = this.getVarArrByRow(i);
            const origin_row = this.code_rows[i];
            let code_row = '';
            let idx = 0;
            for (const norm of var_arr) {
                const beg = norm.beg_col;
                const end = norm.end_col;
                code_row += origin_row.slice(idx, beg) + this.normMap[norm.origin_name];
                idx = end;
            }
            code_row +=origin_row.slice(idx);
            code_row = code_row.replace(/\s+$/g, "");
            norm_code_rows.push(code_row);
        }
        // console.log(this.varMap);
        return norm_code_rows.join("\n");
    }
}
/**
 * Winnowing 算法实现
 * @param norm_text 输入文本/代码
 * @param k k-gram 大小（推荐 5-10）
 * @param w 窗口大小（推荐 4-10）
 * @returns 指纹数组（哈希值）
 */
function Winnowing(text: string, language: string, k: number = 5, w: number = 4): number[] {
    
    const normalizer = new CodeNormalizer(text, language);
    const norm_text = normalizer.normalize();
    // console.log(norm_text);
    // 1. 生成 k-gram 哈希序列
    const hashes: number[] = [];
    for (let i = 0; i <= norm_text.length - k; i++) {
        const kgram = norm_text.slice(i, i + k);
        // const hash = parseInt(
        //     crypto.createHash('sha256').update(kgram).digest('hex').slice(0, 8),
        //     16
        // ); // 取 MD5 前 32bit
        const hash = parseInt(
            crypto.createHash('sha256').update(kgram).digest('hex').slice(0, 32),
            16
        ); // 取 SHA256 前 128bit
        hashes.push(hash);
    }

    // 2. 选取局部最小哈希指纹
    const fingerprints: number[] = [];
    for (let i = 0; i <= hashes.length - w; i++) {
        const window = hashes.slice(i, i + w);
        const minHash = Math.min(...window);
        const minPos = i + window.lastIndexOf(minHash); // 取最右侧的最小值
        if (!fingerprints.includes(minPos)) {
            fingerprints.push(hashes[minPos]);
        }
    }

    return fingerprints;
}

/**
 * 计算两段代码的相似度（Jaccard 相似度）
 * @param fp1 指纹集 1
 * @param fp2 指纹集 2
 * @returns 相似度（0-1）
 */
function CodeSimilarity(fp1: number[], fp2: number[]): number[] {
    const set1 = new Set(fp1);
    const set2 = new Set(fp2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return [intersection.size / union.size, intersection.size / set1.size, intersection.size / set2.size];
}

/**
 * 转换为 10 分制评分
 * @param sim Jaccard 相似度（0-1）
 * @returns 0-10 分
 */
function CodeScore(sim: number): number {
    return Math.round((1-sim) * 1000)/10;
}

export { Winnowing, CodeSimilarity, CodeScore };