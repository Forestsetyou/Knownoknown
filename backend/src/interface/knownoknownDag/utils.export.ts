import { CID } from 'multiformats/cid'
import { CarReader } from '@ipld/car'
import { Car } from '@helia/car'
import { createReadStream, createWriteStream } from 'fs'
import { FsBlockstore } from 'blockstore-fs';
import { Buffer } from 'buffer';

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