enum BackendServerStatus {
    ONLINE = "online",
    OFFLINE = "offline",
    UNKNOWN = "unknown",
}

interface BackendServiceStatus {
    status: BackendServerStatus;
    knownoknownEntryCID: string;
    contractAddress: string;
    ipfsGatewayRoutingURL: string;
    ipfsStatusFlagCID: string;
}

enum backendUrl {
  BASE_URL="http://localhost:12891",
  ROUTER_STATUS="/admin/status",
  ROUTER_EXTRACT_FINGERPRINT="/admin/extract-fingerprint",
}

const TIMEOUT = 10000;  // 10 seconds
class LocalBackendService {
    status: BackendServerStatus;
    knownoknownEntryCID: string;
    contractAddress: string;
    ipfsGatewayRoutingURL: string;
    ipfsStatusFlagCID: string;

  constructor() {
    this.status = BackendServerStatus.UNKNOWN;
    this.knownoknownEntryCID = '';
    this.contractAddress = ''; 
    this.ipfsGatewayRoutingURL = '';
    this.ipfsStatusFlagCID = '';
  }

  async checkBackendStatus() {
    try {
        const status_url = backendUrl.BASE_URL+backendUrl.ROUTER_STATUS;
        const rep = await fetch(status_url, {
            method: "GET",
            signal: AbortSignal.timeout(TIMEOUT),
        })
        if (!rep.ok) {
            throw new Error(`Request failed with status: ${rep.status}`);
        }
        const status = await rep.json()
        if (status.success !== true) {
            throw new Error(`error within backend service status: ${status.success}`);
        }
        this.status = status.status;
        this.knownoknownEntryCID = status.knownoknownEntryCID;
        this.contractAddress = status.contractAddress;
        this.ipfsGatewayRoutingURL = status.ipfsGatewayRoutingURL;
        this.ipfsStatusFlagCID = status.ipfsStatusFlagCID;
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
  }

  async getBackendStatus() {
    const checkResult = await this.checkBackendStatus();
    let backendServiceStatus: BackendServiceStatus;
    if (checkResult) {
        backendServiceStatus = {
            status: this.status,
            knownoknownEntryCID: this.knownoknownEntryCID,
            contractAddress: this.contractAddress,
            ipfsGatewayRoutingURL: this.ipfsGatewayRoutingURL,
            ipfsStatusFlagCID: this.ipfsStatusFlagCID,
        }
        return backendServiceStatus;
    } else {
        backendServiceStatus = {
            status: BackendServerStatus.OFFLINE,
            knownoknownEntryCID: this.knownoknownEntryCID,
            contractAddress: this.contractAddress,
            ipfsGatewayRoutingURL: this.ipfsGatewayRoutingURL,
            ipfsStatusFlagCID: this.ipfsStatusFlagCID,
        }
        return backendServiceStatus;
    }
  }

  async extractFingerprintData(knowledgeDataCarBytes: Uint8Array) {
    const extractFingerprintData_url = backendUrl.BASE_URL+backendUrl.ROUTER_EXTRACT_FINGERPRINT;
    const rep = await fetch(extractFingerprintData_url, {
      method: "POST",
      body: knowledgeDataCarBytes,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!rep.ok) throw new Error(await rep.text());
    const fingerprintDataCarBytes = new Uint8Array(await rep.arrayBuffer());
    return fingerprintDataCarBytes;
  }
}

export { LocalBackendService, BackendServerStatus };
export type { BackendServiceStatus };