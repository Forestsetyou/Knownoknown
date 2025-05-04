import { createHeliaHTTP } from '@helia/http'
import { unixfs } from '@helia/unixfs'
import { dagCbor } from '@helia/dag-cbor'
import { car } from '@helia/car'
import { CID } from 'multiformats/cid'
import { readFileSync } from 'fs'

const helia = await createHeliaHTTP()
const fs = unixfs(helia)
const dc = dagCbor(helia)
const c = car(helia)

const data_cid_0 = await fs.addBytes(new TextEncoder().encode('hello world!'))
const data_cid_1 = await fs.addBytes(new TextEncoder().encode('hello world! 1'))
const data_cid_2 = await fs.addBytes(new TextEncoder().encode('hello world! 2'))
console.log("data_cid_0:", data_cid_0)
console.log("data_cid_1:", data_cid_1)
console.log("data_cid_2:", data_cid_2)

const dag_cid_1 = await dc.add({
    data: data_cid_0,
})
console.log("dag_cid_1:", dag_cid_1)
const dag_cid_2 = await dc.add({
    dag: dag_cid_1,
    data: data_cid_1,
})
console.log("dag_cid_2:", dag_cid_2)
const dag_cid_3 = await dc.add({
    curse: {
        data: data_cid_2,
        curse: {
            index: dag_cid_2,
        }
    }
})
console.log("dag_cid_3:", dag_cid_3)
// await helia.gc()
try {
    for await (const pinnedCID of helia.pins.add(dag_cid_3, {
        metadata: {
            name: "dag_cid_3",
            description: "create new dag_cid_3",
            type: "dag-cbor",
            timestamp: Date.now(),
        },
        depth: 1,
        signal: AbortSignal.timeout(1000), // 10秒后超时
    })) {
        // console.log("pinnedCID:", pinnedCID);
    }
    for await (const pinnedCID of helia.pins.ls()) {
        console.log("pinnedCID:", pinnedCID.metadata);
    }
} catch (error) {
    console.error("error:", error);
}










