export enum TrustlessGatewayAcceptType {
    Raw = 'application/vnd.ipld.raw',
    Car = 'application/vnd.ipld.car',   // 暂不支持 accept 头标记 car 信令参数
    // IpnsRecord = 'application/vnd.ipfs.ipns-record',
}

export enum TrustlessGatewayFormatType {
    Raw = 'raw',
    Car = 'car',
    // IpnsRecord = 'ipns-record',
}

export enum TrustlessGatewayDagScopeType {
    // When present, returned Etag must include unique prefix based on the passed scope type.
    // 目前只支持all
    All = 'all',
    // Block = 'block',
    // Entity = 'entity',
}

export enum TrustlessGatewayCarVersionType {
    V2 = '2',
}

export enum TrustlessGatewayCarDupsType {
    Y = 'y',
}

export enum TrustlessGatewayResponseStatus {
    // 2xx
    OK = 200,
    PartialContent = 206,
    MovedPermanently = 301,
    // 4xx
    BadRequest = 400,
    NotFound = 404,
    Gone = 410,
    PreconditionFailed = 412,
    TooManyRequests = 429,
    UnavailableForLegalReasons = 451,
    // 5xx
    InternalServerError = 500,
    BadGateway = 502,
    GatewayTimeout = 504,
}

export enum ipfsCodec {
    dagPb = 112,
    bytes = 85,
    dagCbor = 113
}

export function isValidEnumValue<T extends Record<string, unknown>>(
    enumObj: T,
    value: unknown
): value is T[keyof T] {
    return Object.values(enumObj).includes(value);
}

export interface IPFSCarGetParams {
    cid: string,
    path?: string,
    format?: string,
    dagScope?: string,
    carVersion?: string,
    carDups?: string,
    statusCode?: number,
    // carOrder?: string,
    // entityBytes?: string,
}

export interface TrustlessGatewayResponseHeaders {
    "Content-Type": string,
    "Content-Disposition": string,
    "Content-Location"?: string,
    "Etag"?: string,
    "Cache-Control"?: string,
    "Location"?: string,
    "Content-Length"?: string,
    // lastModified?: string,
    // acceptRanges?: string,
    "X-Ipfs-Path": string,
    "X-Ipfs-Roots": string,
    // xContentTypeOptions?: string,
    // retryAfter?: number,
    // serverTiming?: string,
    // traceparent?: string,
    // tracestate?: string,
}

export interface TrustlessGatewayOptionsInterface {
    // ----------------------------- Trustless Gateway Options -----------------------------
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
    accept: string;    // *must

    // response headers
    contentType: string;
    contentDisposition: string; // format: 'attachment; filename="filename.ext"'
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
    xIpfsRoots: string;
    xContentTypeOptions?: string;
    retryAfter?: number; // format: <delay-seconds>
    serverTiming?: string; // almost aborted
    traceparent?: string;
    tracestate?: string;
}
