import { Field, Struct, Bool, Poseidon } from 'o1js';

import { CID } from 'multiformats/cid'

function uint8ArrayToBigInt(bytes: Uint8Array, bitLength = 256) {
    const byteLength = bitLength / 8;
    if (bytes.length > byteLength) {
        throw new Error(`Input array too long for ${bitLength}-bit integer`);
    }

    // 如果不足32字节，在前面补0
    const padded = new Uint8Array(byteLength);
    padded.set(bytes, byteLength - bytes.length);

    let result = 0n;
    for (let i = 0; i < byteLength; i++) {
        result = (result << 8n) | BigInt(padded[i]);
    }
    return result;
}

function uint256ToUint8Array(bigInt: BigInt) {
    if (typeof bigInt !== 'bigint' || bigInt < 0n) {
      throw new Error('Input must be a non-negative BigInt');
    }
  
    const result = new Uint8Array(32);
    for (let i = 31; i >= 0; i--) {
      result[i] = Number(bigInt & 0xffn);
      bigInt >>= 8n;
    }
    return result;
}

class EntryCid extends Struct ({
    // 总共72的CID_Hex, 分前 10 位和后 62 位存储，因为field装不下64位(255B<64H)的hex
    // prefix(cid_version+multicodec+hashfunc+hash_length)+first 1 byte of content hash
    CID_HEAD: Field,    
    // last 31 bytes of CID
    CID_TAIL: Field,
}) {
    constructor(cid_head: Field, cid_tail: Field) {
        super({
            CID_HEAD: cid_head,
            CID_TAIL: cid_tail
        });
    }

    static empty(): EntryCid {
        return new EntryCid(Field(0), Field(0));
    }
    
    static parseCID(cid: CID): EntryCid {
        const cid_head = Field(uint8ArrayToBigInt(cid.bytes.slice(0, 5), 248));
        const cid_tail = Field(uint8ArrayToBigInt(cid.bytes.slice(5), 248));
        return new EntryCid(cid_head, cid_tail);
    }
    
    static getCID(entryCid: EntryCid): CID {
        const head_arr = uint256ToUint8Array(entryCid.CID_HEAD.toBigInt());
        const tail_arr = uint256ToUint8Array(entryCid.CID_TAIL.toBigInt());
        const cid_arr = new Uint8Array(36);
        cid_arr.set(head_arr.slice(27), 0);
        cid_arr.set(tail_arr.slice(1), 5);
        return CID.decode(cid_arr);
    }

    static equals(entryCid1: EntryCid, entryCid2: EntryCid): Bool {
        return entryCid1.CID_HEAD.equals(entryCid2.CID_HEAD) && entryCid1.CID_TAIL.equals(entryCid2.CID_TAIL);
    }

    isEmpty(): Bool {
        return this.CID_HEAD.equals(Field(0)) && this.CID_TAIL.equals(Field(0));
    }

    toHash(): Field {
        return Poseidon.hash([this.CID_HEAD, this.CID_TAIL]);
    }
    
    getCID(): CID {
        const head_arr = uint256ToUint8Array(this.CID_HEAD.toBigInt());
        const tail_arr = uint256ToUint8Array(this.CID_TAIL.toBigInt());
        const cid_arr = new Uint8Array(36);
        cid_arr.set(head_arr.slice(27), 0);
        cid_arr.set(tail_arr.slice(1), 5);
        return CID.decode(cid_arr);
    }
}

export { EntryCid };