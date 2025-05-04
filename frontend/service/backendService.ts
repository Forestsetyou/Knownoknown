import { createContext } from 'react';

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
    if (checkResult) {
        return {
            status: this.status,
            knownoknownEntryCID: this.knownoknownEntryCID,
            contractAddress: this.contractAddress,
            ipfsGatewayRoutingURL: this.ipfsGatewayRoutingURL,
            ipfsStatusFlagCID: this.ipfsStatusFlagCID,
        }
    } else {
        const errorBackendServiceStatus = {
            status: BackendServerStatus.OFFLINE,
            knownoknownEntryCID: this.knownoknownEntryCID,
            contractAddress: this.contractAddress,
            ipfsGatewayRoutingURL: this.ipfsGatewayRoutingURL,
            ipfsStatusFlagCID: this.ipfsStatusFlagCID,
        }
        return errorBackendServiceStatus;
    }
  }
}

const BackendContext = createContext<LocalBackendService | undefined>(undefined);

export { LocalBackendService, BackendContext, BackendServerStatus };
export type { BackendServiceStatus };