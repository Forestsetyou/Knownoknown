import { createContext } from 'react';
import { PrivateKey } from 'knownoknown-contract';

interface WalletStatus {
  connected: boolean;
  connecting: boolean;
  address: string;
  key: string;
  balance?: string;
}

enum localWalletUrl {
  BASE_URL="http://localhost:12891",
  ROUTER_STATUS="/contract/status", 
  ROUTER_ACCOUNTSINFO="/contract/accountsInfo", 
  ROUTER_ACCOUNTINFO="/contract/accountInfo/:pvk",
}

const TIMEOUT = 10000;  // 10秒超时

class LocalWalletService {
  private address?: string; // 公钥
  private balance?: string; // 余额
  private key?: string; // 密钥

  constructor() {
    this.address = '';
    this.balance = undefined;
    this.key = '';
  }

  async checkLocalWalletStatus() {  // 检查测试服务状态
    try {
      const status_url = localWalletUrl.BASE_URL+localWalletUrl.ROUTER_STATUS;
      const rep = await fetch(status_url, {
          method: "GET",
          signal: AbortSignal.timeout(TIMEOUT),
      })
      if (!rep.ok) {
          throw new Error(`Request failed with status: ${rep.status}`);
      }
      const status = await rep.json()
      if (status.status !== "online") {
          throw new Error(`error within wallet server status: ${status.status}`);
      }
      return true;
    } catch (error) {
      console.error("checkLocalWalletStatus error", error);
      return false;
    }
  }


  async checkAccountValid(account: string) {  // 检查测试服务状态
    const status_url = localWalletUrl.BASE_URL+localWalletUrl.ROUTER_ACCOUNTSINFO;
    const rep = await fetch(status_url, {
        method: "GET",
        signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!rep.ok) {
        throw new Error(`Request failed with status: ${rep.status}`);
    }
    const accountsInfo = await rep.json()
    if (accountsInfo.success !== true) {
        throw new Error(`error within wallet server accountsInfo: ${accountsInfo.success}`);
    }
    const allAccounts:Array<any> = accountsInfo.accountsInfo;
    const accountInfo = allAccounts.find((item: any) => item.publicKey === account)
    return accountInfo;
  }

  async connectWallet() {
    if (await this.checkLocalWalletStatus()) {
      if ((window as any)?.mina) {
        const accounts = await (window as any).mina.requestAccounts();
        this.address = accounts[0];
        const accountInfo = await this.checkAccountValid(this.address!);
        if (accountInfo) {
          this.balance = accountInfo.balance;
        } else {
          console.log("Not valid account")
          return false;
        }
      } else {
        console.log("No wallet found");
        return false;
      }
      return true;
    } else {
      return false;
    }
  }

  disconnectWallet() {
    this.address = '';
    this.balance = undefined;
    this.key = '';
  }

  hasWalletConnected() {
    return this.address !== '';
  }

  hasWalletKey() {
    return this.key !== '';
  }

  setWalletKey(key: string) {
    this.key = key;
  }
  
  async validatePrivateKey(privateKey: string): Promise<boolean> {
    try {
      const pvk = PrivateKey.fromBase58(privateKey);
      const pubKey = pvk.toPublicKey();
      const address = pubKey.toBase58();
      if (address !== this.address) {
        throw new Error("Invalid private key");
      }
      return true; // 返回验证结果
    } catch (error) {
      console.error('验证私钥失败:', error);
      return false;
    }
  }

  getWalletAddress() {
    return this.address;
  }

  async getWalletBalance() {
    if (await this.checkLocalWalletStatus()) {
      const accountInfo = await this.checkAccountValid(this.address!);
      if (accountInfo) {
        this.balance = accountInfo.balance;
      }
    }
    return this.balance;
  }

  getWalletKey() {
    return this.key;
  }
}

const WalletContext = createContext<LocalWalletService | undefined>(undefined);

export { LocalWalletService, WalletContext };
export type { WalletStatus };