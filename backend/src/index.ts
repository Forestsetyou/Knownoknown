import { ExpressApp } from './expressApp.js';
async function startServer() {
    const app = new ExpressApp();
    await app.init();
}
startServer();