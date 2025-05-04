import { PrivateKey } from 'knownoknown-contract';
import { parentPort } from 'worker_threads';

const originParentPort = parentPort;
console.log(originParentPort);

function doMath() {
    return 1 + 1;
}

parentPort.on('message', (message) => {
    if (message.type === 'doMath') {
        const result = doMath();
        parentPort.postMessage({
            type: 'doMath',
            result: result,
        });
    }
});

parentPort.postMessage({
    type: 'ready',
});

const tmpAccount = PrivateKey.random();
console.log(tmpAccount);

export const TestWorker = {
    doMath: doMath,
}
