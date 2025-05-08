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
  ROUTER_PUBLISH_KNOWLEDGE="/admin/publish-knowledge",
  ROUTER_SET_TEMP_IMG_PACK="/admin/tempImg/set",
  ROUTER_DEL_TEMP_IMG_PACK="/admin/tempImg/del/:cid",
  ROUTER_GET_TEMP_IMG_URLS="/admin/tempImg/get/:cid",
  ROUTER_CHANGE_STAR="/admin/service/change-star",
  ROUTER_GET_DECRYPTED_KNOWLEDGE_CAR_Bytes="/admin/service/decrypt-knowledge",
}

const TIMEOUT = 10000;  // 10 seconds
const LONG_TIMEOUT = 60000;  // 60 seconds
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

  async publishKnowledge(knowledgeCheckPackCarBytes: Uint8Array) {
    const submitPublishKnowledgeCheckPack_url = backendUrl.BASE_URL+backendUrl.ROUTER_PUBLISH_KNOWLEDGE;
    const rep = await fetch(submitPublishKnowledgeCheckPack_url, {
      method: "POST",
      body: knowledgeCheckPackCarBytes,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      signal: AbortSignal.timeout(LONG_TIMEOUT),
    })
    if (!rep.ok) throw new Error(await rep.text());
    const repBody = await rep.json();
    return {success: repBody.success, newMerkleRoot: repBody.newMerkleRoot, oldMerkleRoot: repBody.oldMerkleRoot};
  }

  async setTempImgPack(tempImgPackCarBytes: Uint8Array) {
    const setTempImgPack_url = backendUrl.BASE_URL+backendUrl.ROUTER_SET_TEMP_IMG_PACK;
    const rep = await fetch(setTempImgPack_url, {
      method: "POST",
      body: tempImgPackCarBytes,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!rep.ok) throw new Error(await rep.text());
    const repBody = await rep.json();
    return {success: repBody.success, cid: repBody.cid};
  }

  async delTempImgPack(tempImgPackCid: string) {
    const delTempImgPack_url = backendUrl.BASE_URL+backendUrl.ROUTER_DEL_TEMP_IMG_PACK.replace(":cid", tempImgPackCid);
    const rep = await fetch(delTempImgPack_url, {
      method: "GET",
    })
    if (!rep.ok) throw new Error(await rep.text());
    const repBody = await rep.json();
    return {success: repBody.success};
  }

  async getTempImgTempLinks(images: any) {
    const tempImgTempLinks: any = {};
    for (const image_link in images) {
      const cidStr = images[image_link].toString();
      const image_url = backendUrl.BASE_URL+backendUrl.ROUTER_GET_TEMP_IMG_URLS.replace(":cid", cidStr);
      const temp_link = `![](${image_url})`;
      tempImgTempLinks[image_link] = temp_link;
    }
    return tempImgTempLinks;
  }

  async changeStar(public_order: string, pbk: string) {
    const changeStar_url = backendUrl.BASE_URL+backendUrl.ROUTER_CHANGE_STAR;
    const rep = await fetch(changeStar_url, {
      method: "POST",
      body: JSON.stringify({public_order, pbk}),
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!rep.ok) throw new Error(await rep.text());
    const repBody = await rep.json();
    return {success: repBody.success};
  }

  async getDecryptedKnowledgeCarBytes(tempKeyPackCarBytes: Uint8Array) {
    const getDecryptedKnowledgeCarBytes_url = backendUrl.BASE_URL+backendUrl.ROUTER_GET_DECRYPTED_KNOWLEDGE_CAR_Bytes;
    const rep = await fetch(getDecryptedKnowledgeCarBytes_url, {
      method: "POST",
      body: tempKeyPackCarBytes,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!rep.ok) throw new Error(await rep.text());
    const decryptedKnowledgeCarBytes = new Uint8Array(await rep.arrayBuffer());
    return decryptedKnowledgeCarBytes;
  }
}

export { LocalBackendService, BackendServerStatus };
export type { BackendServiceStatus };