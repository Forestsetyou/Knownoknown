import { TrustlessGatewayOptionsInterface, TrustlessGatewayFormatType, TrustlessGatewayDagScopeType, TrustlessGatewayResponseStatus, TrustlessGatewayCarVersionType, TrustlessGatewayCarDupsType, isValidEnumValue, TrustlessGatewayAcceptType, IPFSCarGetParams, TrustlessGatewayResponseHeaders, ipfsCodec } from './trustlessGatewayInterface.js';
import { Request } from 'express';
import { KnowledgeDBServer } from '../../knowledgeDBServer.js';
import { CID } from 'multiformats/cid';

// 基于 https://specs.ipfs.tech/http-gateways/trustless-gateway 标准
// 实现一个不完整的但符合我们项目需求的 TrustlessGateway
// 1. 目前 format 只支持 raw, car, 
//    不支持 ipns-record
// 2. 分别为 raw 和 car 提供不同的 options 类
//    由于路由设置, 我们约定对于 /:path 参数, raw 必须不携带, car 必须携带(尤其是'/'必须携带)

export const trustlessGatewayCorsOptions = {    // 零信任网关的 CORS 选项
    origin: '*',
    methods: ['GET', 'HEAD'],
    // allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
}

// Car Options
// 1. dag-scope 目前只支持all, 
//    不支持block, entity
//    因此也不支持query params 中的 entityBytes
// 2. car 信令只支持 car-version, car-dups
//    不支持 car-order
//    car 信令只能出现在 query params 中, 不能出现在 accept 头中
// 3. car-version 目前只支持 v2
//    car-dups 目前只支持 y(yes, true)

export class TrustlessGatewayCarOptions implements TrustlessGatewayOptionsInterface {
    // ----------------------------- Trustless Gateway Options -----------------------------
    // 依赖的 KnowledgeDB 实例
    knowledgeDB: KnowledgeDBServer;
    // req info
    protocol: string;
    hostname: string;
    baseUrl: string;

    // path params
    cid: string;    // *must
    path?: string;

    // query params
    format?: string;  
    dagScope?: string; // default: 'all'
    entityBytes?: string; // format: 'from:to'
    carVersion?: string; 
    carOrder?: string;
    carDups?: string;

    // request headers
    accept: string; // *must

    // response status code
    repStatusCode: number;

    // response headers
    contentType: string;
    contentTypeArray: string[];
    contentDisposition: string; // format: 'attachment; filename="filename.ext"'
    needContentLocation: boolean;
    contentLocation?: string;
    
    // ----------------------------- HTTPPath Gateway Options -----------------------------
    // response headers
    etag: string;
    cacheControl: string; // format: 'public, max-age=<ttl>'
    lastModified?: string; // almost aborted
    contentLength?: string;
    acceptRanges?: string; // format: 'none'
    location?: string;
    xIpfsPath: string;
    xIpfsRootsArray: string[];
    xIpfsRoots: string;
    xContentTypeOptions?: string;
    retryAfter?: number; // format: <delay-seconds>
    serverTiming?: string; // almost aborted
    traceparent?: string;
    tracestate?: string;

    constructor() {}

    parseParams(req: Request, knowledgeDB: KnowledgeDBServer) {
        this.repStatusCode = TrustlessGatewayResponseStatus.OK;
        this.checkMustParams(req);
        this.accept = req.headers.accept;
        this.handleAccept();
        this.cid = req.params.cid;
        this.handleCid();
        this.protocol = req.protocol;
        this.hostname = req.hostname;
        this.path = (req.params[0] || '').replace(/\/+$/g, '');    // 没有path时默认为空, 去除末尾的斜杠
        this.setXIpfsPath();
        this.setContentDisposition();   // 返回类型已经确定, 设置 contentDisposition
        this.handleFormat(req.query.format);
        this.handleDagScope(req.query.dagScope);
        this.handleCarOptions(req.query.carVersion, req.query.carDups);
        this.knowledgeDB = knowledgeDB;
    }

    checkMustParams(req: Request) { // 检查必填参数
        if (!req.params.cid) {
            this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
            throw new Error('cid is required');
        }
        if (!req.headers.accept) {
            this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
            throw new Error('accept header is required');
        }
    }

    handleCid() {
        try {
            CID.parse(this.cid);
        } catch (error) {
            this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
            throw new Error('cid is invalid');
        }
    }

    handleAccept() { // 检查 accept 参数的值
        if (!isValidEnumValue(TrustlessGatewayAcceptType, this.accept)) {
            this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
            throw new Error('accept header is invalid');
        }
        if (this.accept !== TrustlessGatewayAcceptType.Car) {
            this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
            throw new Error('only car is supported for path params');
        }
    }

    handleFormat(format: any) {
        this.format = TrustlessGatewayFormatType.Car;
        if (!format || !isValidEnumValue(TrustlessGatewayFormatType, format) || this.format !== format) {
             // format 为空 或者非法 或者和accept不一致，从 accept 中获取类型
            this.useContentLocation();  // 从 accept 中获取类型，必定会启用 contentLocation
        }
        // 向响应头 content-type 中添加类型说明
        this.updateContentTypeArray(TrustlessGatewayAcceptType.Car);
    }

    useContentLocation() {  // 启用 contentLocation 说明原 req query 是不规范的
        this.needContentLocation = true;
    }

    handleContentLocation() {
        if (this.path) {
            this.contentLocation = `${this.protocol}://${this.hostname}/ipfs/${this.cid}/${this.path}?format=${this.format}`;
        } else {
            this.contentLocation = `${this.protocol}://${this.hostname}/ipfs/${this.cid}?format=${this.format}`;
        }
        if (this.dagScope) this.contentLocation += `&dag-scope=${this.dagScope}`;
        if (this.carVersion) this.contentLocation += `&car-version=${this.carVersion}`;
        if (this.carDups) this.contentLocation += `&car-dups=${this.carDups}`;
    }

    getRepStatusCode() {    // 获取响应状态码
        return this.repStatusCode;
    }

    handleDagScope(dagScope: any) { // 处理 dag-scope
        if (dagScope) {
            if (isValidEnumValue(TrustlessGatewayDagScopeType, dagScope)) {
                this.dagScope = dagScope as TrustlessGatewayDagScopeType;
            } else {
                this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
                throw new Error('dag-scope is invalid, only all is supported');
            }
        } else {
            this.dagScope = TrustlessGatewayDagScopeType.All;
            this.useContentLocation();
        }
    }

    handleCarOptions(carVersion: any, carDups: any) {
        // 处理 car-version
        if (carVersion) {
            if (isValidEnumValue(TrustlessGatewayCarVersionType, carVersion)) {
                this.carVersion = carVersion as TrustlessGatewayCarVersionType;
            } else {
                this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
                throw new Error('car-version is invalid, only version=2 is supported');
            }
        } else {
            this.carVersion = TrustlessGatewayCarVersionType.V2;
            this.useContentLocation();
        }
        // 向响应头 content-type 中添加 car-version
        this.updateContentTypeArray(`verison=${this.carVersion}`);

        // 处理 car-dups
        if (carDups) {
            if (isValidEnumValue(TrustlessGatewayCarDupsType, carDups)) {
                this.carDups = carDups as TrustlessGatewayCarDupsType;
            } else {
                this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
                throw new Error('car-dups is invalid, only dups=y is supported');
            }
        } else {
            this.carDups = TrustlessGatewayCarDupsType.Y;
            this.useContentLocation();
        }
        // 向响应头 content-type 中添加 car-dups
        this.updateContentTypeArray(`dups=${this.carDups}`);
    }

    updateContentTypeArray(contentType: string) {
        if (!this.contentTypeArray) {
            this.contentTypeArray = [];
        }
        this.contentTypeArray.push(contentType);
    }

    setContentDisposition() {
        this.contentDisposition = `attachment; filename="${this.cid}.car"`;
    }

    setXIpfsPath() {
        if (this.path) {
            this.xIpfsPath = `/ipfs/${this.cid}/${this.path}`;
        } else {
            this.xIpfsPath = `/ipfs/${this.cid}`;
        }
    }

    updateXIpfsRootsArray(path: string) {
        if (!this.xIpfsRootsArray) {
            this.xIpfsRootsArray = [];
        }
        this.xIpfsRootsArray.push(path);
    }

    setContentLength(length: number) {
        this.contentLength = length.toString();
    }

    getResponseHeaders(): TrustlessGatewayResponseHeaders {
        this.contentType = this.contentTypeArray.join('; ');
        this.xIpfsRoots = this.xIpfsRootsArray.join(',');
        const headers: TrustlessGatewayResponseHeaders = {
            "Content-Type": this.contentType,
            "Content-Disposition": this.contentDisposition,
            "X-Ipfs-Path": this.xIpfsPath,
            "X-Ipfs-Roots": this.xIpfsRoots,
        }
        if (this.needContentLocation) {
            this.handleContentLocation();
            headers["Content-Location"] = this.contentLocation;
        }
        if (this.contentLength) {
            headers["Content-Length"] = this.contentLength;
        }
        return headers;
    }

    async getCar(): Promise<AsyncGenerator<Uint8Array>> {
        let cid = CID.parse(this.cid);
        const path = this.path;
        if (!!path) {   // 如果path不为空，则表示需要查询路径
            const paths = path.split('/');  // 将path按'/'分割成数组
            for (const [idx, subPath] of paths.entries()) {  // 遍历路径中的每个子路径
                if (cid.code !== ipfsCodec.dagCbor) {
                    this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
                    throw new Error("query path is wrong")
                }
                if (!(await this.knowledgeDB.blockHas(cid))) {   // 检查cid是否存在
                    this.repStatusCode = TrustlessGatewayResponseStatus.NotFound;
                    throw new Error("cid within path not found");
                }
                const dag_obj = await this.knowledgeDB.dagCborGet(cid);    // 获取cid的dagCbor数据
                if (subPath in dag_obj) {  // 检查路径是否有效，即subPath是否在dag_obj中
                    this.updateXIpfsRootsArray(cid.toString());
                    cid = dag_obj[subPath];
                    if (typeof cid === 'string') {  // 如果cid是字符串，则表示是fake link
                        this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
                        throw new Error("fake link is not supported to be used as path");
                    }
                } else {    // 路径无效，返回400
                    this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
                    throw new Error("query path is wrong");
                }
            }
        }
        if (!(await this.knowledgeDB.blockHas(cid))) {   // 检查cid是否存在
            this.repStatusCode = TrustlessGatewayResponseStatus.NotFound;
            throw new Error("target cid not found");
        }
        this.updateXIpfsRootsArray(cid.toString());
        const carReadStream = await this.knowledgeDB.carGet(cid);
        return carReadStream;
    }
}

export function checkReqType(req: Request) {
    if (req.headers.accept && isValidEnumValue(TrustlessGatewayAcceptType, req.headers.accept)) {
        if (req.headers.accept === TrustlessGatewayAcceptType.Car) {
            return 'car';
        } else if (req.headers.accept === TrustlessGatewayAcceptType.Raw) {
            return 'raw';
        }
    } else {
        throw new Error('accept header is invalid');
    }
}

// 理想的开发顺序是先开发 raw 的 options, 再开发 car 的 options 使其继承 raw 的 options
// Raw Options

export class TrustlessGatewayRawOptions implements TrustlessGatewayOptionsInterface {
    // ----------------------------- Trustless Gateway Options -----------------------------
    // 依赖的 KnowledgeDB 实例
    knowledgeDB: KnowledgeDBServer;
    // req info
    protocol: string;
    hostname: string;
    baseUrl: string;

    // path params
    cid: string;    // *must
    path?: string;

    // query params
    format?: string;  
    dagScope?: string; // default: 'all'
    entityBytes?: string; // format: 'from:to'
    carVersion?: string; 
    carOrder?: string;
    carDups?: string;

    // request headers
    accept: string; // *must

    // response status code
    repStatusCode: number;

    // response headers
    contentType: string;
    contentTypeArray: string[];
    contentDisposition: string; // format: 'attachment; filename="filename.ext"'
    needContentLocation: boolean;
    contentLocation?: string;
    
    // ----------------------------- HTTPPath Gateway Options -----------------------------
    // response headers
    etag: string;
    cacheControl: string; // format: 'public, max-age=<ttl>'
    lastModified?: string; // almost aborted
    contentLength?: string;
    acceptRanges?: string; // format: 'none'
    location?: string;
    xIpfsPath: string;
    xIpfsRootsArray: string[];
    xIpfsRoots: string;
    xContentTypeOptions?: string;
    retryAfter?: number; // format: <delay-seconds>
    serverTiming?: string; // almost aborted
    traceparent?: string;
    tracestate?: string;

    constructor() {}

    parseParams(req: Request, knowledgeDB: KnowledgeDBServer) {
        this.repStatusCode = TrustlessGatewayResponseStatus.OK;
        this.checkMustParams(req);
        this.accept = req.headers.accept;
        this.handleAccept();
        this.cid = req.params.cid;
        this.handleCid();
        this.protocol = req.protocol;
        this.hostname = req.hostname;
        this.path = '';
        this.setXIpfsPath();
        this.setContentDisposition();   // 返回类型已经确定, 设置 contentDisposition
        this.handleFormat(req.query.format);
        this.knowledgeDB = knowledgeDB;
    }

    checkMustParams(req: Request) { // 检查必填参数
        if (!req.params.cid) {
            this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
            throw new Error('cid is required');
        }
        if (!req.headers.accept) {
            this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
            throw new Error('accept header is required');
        }
    }

    handleCid() {
        try {
            CID.parse(this.cid);
        } catch (error) {
            this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
            throw new Error('cid is invalid');
        }
    }

    handleAccept() { // 检查 accept 参数的值
        if (!isValidEnumValue(TrustlessGatewayAcceptType, this.accept)) {
            this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
            throw new Error('accept header is invalid');
        }
        if (this.accept !== TrustlessGatewayAcceptType.Raw) {
            this.repStatusCode = TrustlessGatewayResponseStatus.BadRequest;
            throw new Error('something went wrong when deal with raw accept header');
        }
    }

    handleFormat(format: any) {
        this.format = TrustlessGatewayFormatType.Raw;
        if (!format || !isValidEnumValue(TrustlessGatewayFormatType, format) || this.format !== format) {
             // format 为空 或者非法 或者和accept不一致，从 accept 中获取类型
            this.useContentLocation();  // 从 accept 中获取类型，必定会启用 contentLocation
        }
        // 向响应头 content-type 中添加类型说明
        this.updateContentTypeArray(TrustlessGatewayAcceptType.Raw);
    }

    useContentLocation() {  // 启用 contentLocation 说明原 req query 是不规范的
        this.needContentLocation = true;
    }

    handleContentLocation() {
        this.contentLocation = `${this.protocol}://${this.hostname}/ipfs/${this.cid}?format=${this.format}`;
    }

    getRepStatusCode() {    // 获取响应状态码
        return this.repStatusCode;
    }

    updateContentTypeArray(contentType: string) {
        if (!this.contentTypeArray) {
            this.contentTypeArray = [];
        }
        this.contentTypeArray.push(contentType);
    }

    setContentDisposition() {
        this.contentDisposition = `attachment; filename="${this.cid}.bin"`;
    }

    setXIpfsPath() {
        this.xIpfsPath = `/ipfs/${this.cid}`;
    }

    updateXIpfsRootsArray(path: string) {
        if (!this.xIpfsRootsArray) {
            this.xIpfsRootsArray = [];
        }
        this.xIpfsRootsArray.push(path);
    }

    setContentLength(length: number) {
        this.contentLength = length.toString();
    }

    getResponseHeaders(): TrustlessGatewayResponseHeaders {
        this.contentType = this.contentTypeArray.join('; ');
        this.xIpfsRoots = this.xIpfsRootsArray.join(',');
        const headers: TrustlessGatewayResponseHeaders = {
            "Content-Type": this.contentType,
            "Content-Disposition": this.contentDisposition,
            "X-Ipfs-Path": this.xIpfsPath,
            "X-Ipfs-Roots": this.xIpfsRoots,
        }
        if (this.needContentLocation) {
            this.handleContentLocation();
            headers["Content-Location"] = this.contentLocation;
        }
        if (this.contentLength) {
            headers["Content-Length"] = this.contentLength;
        }
        return headers;
    }

    async getRaw(): Promise<Uint8Array> {
        let cid = CID.parse(this.cid);
        if (!(await this.knowledgeDB.blockHas(cid))) {   // 检查cid是否存在
            this.repStatusCode = TrustlessGatewayResponseStatus.NotFound;
            throw new Error("target cid not found");
        }
        this.updateXIpfsRootsArray(cid.toString());
        const rawBlock = await this.knowledgeDB.blockGet(cid);
        return rawBlock;
    }
}