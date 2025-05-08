import { createHeliaHTTP } from '@helia/http'
import { unixfs } from '@helia/unixfs'
import { dagCbor } from '@helia/dag-cbor'
import { car } from '@helia/car'
import { CID } from 'multiformats/cid'
import { readFileSync } from 'fs'
import { PHash, ImageSimilarity, ImageScore } from './imageFingerprint.js'
import { streamToBuffer } from '../../utils.js'
import { CarReader } from '@ipld/car'

const helia = await createHeliaHTTP()

const fs = unixfs(helia)
const c = car(helia)
const dc = dagCbor(helia)

const imagePath1 = new URL('../../../src/images/系统架构图100.drawio.png', import.meta.url)
const imagePath2 = new URL('../../../src/images/系统架构图100-wtm.drawio.png', import.meta.url)
const imageData1 = readFileSync(imagePath1)
const imageData2 = readFileSync(imagePath2)
// const cid1 = await fs.addBytes(imageData1)
// const cid2 = await fs.addBytes(imageData2)
// const cid3 = await dc.add({
//     image1: cid1
// })
// const chunks: Uint8Array[] = []
// for await (const buf of c.stream(cid3)) {
//     chunks.push(buf)
// }
// const carBuffer = Buffer.concat(chunks)
// await helia.gc()
// console.log(`${await helia.blockstore.has(cid1)}, ${await helia.blockstore.has(cid2)}, ${await helia.blockstore.has(cid3)}`)
// const carReader = await CarReader.fromBytes(carBuffer)
// const lCid = await carReader.getRoots()

// await c.import(carReader)
// console.log(`${await helia.blockstore.has(cid1)}, ${await helia.blockstore.has(cid2)}, ${await helia.blockstore.has(cid3)}`)
// const dagIndex = (await dc.get(lCid[0])) as any
// const lCid1 = dagIndex.image1
// const lCid2 = dagIndex.image2


// const imageDataReader1 = await fs.cat(lCid1)
// const imageDataReader2 = await fs.cat(lCid2)
// let imageBuffer1 = await streamToBuffer(imageDataReader1)
// let imageBuffer2 = await streamToBuffer(imageDataReader2)
const hash1 = await PHash(imageData1, '系统架构图100.drawio.png')
const hash2 = await PHash(imageData2, '系统架构图100-wtm.drawio.png')
const sim = ImageSimilarity(hash1, hash2)
const score = ImageScore(sim)
console.log(`"系统架构图.png"指纹: ${hash1}`)
console.log(`"系统架构图-水印版.png"指纹: ${hash2}`)
console.log(`相似度: ${1-sim/64}, 原创性得分: ${score}`)


await helia.stop()
