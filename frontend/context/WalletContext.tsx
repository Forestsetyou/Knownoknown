import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { WalletStatus, LocalWalletService } from '@/service/walletService'
import { Container, Alert, Spinner } from 'react-bootstrap';
import { StatusChecker } from "@/interface/utilTypes";

interface WalletContextType {
    walletStatus: WalletStatus;
    connectWallet: () => Promise<boolean>;
    disconnectWallet: () => Promise<boolean>;
    getWalletBalance: () => Promise<number>;
    validateWalletPrivateKey: (keyValue: string) => Promise<boolean>;
    setWalletKey: (keyValue: string) => Promise<boolean>;
    getWalletKey: () => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const defaultWalletStatus : WalletStatus = {
    connected: false,
    connecting: false,
    address: '',
    key: '',
    balance: '',
}


const WalletProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [walletStatus, setWalletStatus] = useState<WalletStatus>(defaultWalletStatus);
    const [localWalletService, setLocalWalletService] = useState<LocalWalletService | undefined>(undefined);
  
    // for initialization
    const [initialized, setInitialized] = useState(false);
    const [initializationStatus, setInitializationStatus] = useState('');
    const [initError, setInitError] = useState<string | null>(null);

    // 定时检查余额
    let walletBalanceChecker: StatusChecker | null = null;
    
    // 初始化
    useEffect(() => {
        const init = async () => {
            setInitializationStatus('初始化钱包...')
            const localWalletService = new LocalWalletService();
            setLocalWalletService(localWalletService);
            setInitialized(true);
        }
        if (!initialized) {
            init()
        }
    }, []);
    
    // 如果系统尚未初始化，显示加载中
    if (!initialized) {
      return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "50vh" }}>
          <div className="text-center">
            <h4>钱包服务</h4>
            
            {initError ? (
              <Alert variant="danger" className="mt-3">
                <Alert.Heading>初始化错误</Alert.Heading>
                <p>{initError}</p>
                <p className="mb-0">
                  这可能是由于浏览器不支持某些功能所致。请检查控制台获取更多信息。
                </p>
                <button 
                  className="btn btn-outline-danger mt-3" 
                  onClick={() => {}}
                >
                  重试初始化
                </button>
              </Alert>
            ) : (
              <>
                <Spinner animation="border" variant="danger" className="my-3" />
                <p>{initializationStatus}</p>
              </>
            )}
          </div>
        </Container>
      );
    }
    
    const connectWallet = async () => {
        try {
            setWalletStatus((prev:WalletStatus) => ({
                ...prev,
                connecting: true,
            }));
            
            if (await localWalletService!.connectWallet()) {
                const balance = Number(await localWalletService!.getWalletBalance() as unknown as string)/1e9;
                setWalletStatus((prev:WalletStatus) => ({
                    ...prev,
                    connected: true,
                    connecting: false,
                    address: (localWalletService!.getWalletAddress()) as unknown as string,
                    key: (localWalletService!.getWalletKey()) as unknown as string,
                    balance: `${balance}`,
                }));
                walletBalanceChecker = setInterval(getWalletBalance, 120000); // 120秒更新一次钱包余额
                return true
            } else {
                setWalletStatus((prev:WalletStatus) => ({
                    ...prev,
                    ...walletStatus!,
                    connecting: false
                }));
                return false
            }
        } catch (error) {
            setWalletStatus((prev:WalletStatus) => ({
                ...prev,
                connecting: false
            }));
            throw error;
        }
    }

    const disconnectWallet = async () => {
        try {
            localWalletService!.disconnectWallet();
            setWalletStatus((prev:WalletStatus) => ({
                ...prev,
                connected: false,
            }));
            if (walletBalanceChecker) {
                clearInterval(walletBalanceChecker);
                walletBalanceChecker = null;
            }
            return true;
        } catch (error) {
            throw error;
        }
    }

    const getWalletBalance = async () => {
      const balance = Number(await localWalletService!.getWalletBalance() as unknown as string)/1e9;
      setWalletStatus((prev:WalletStatus) => ({
        ...prev,
        balance: `${balance}`,
      }));
      return balance;
    }

    const validatePrivateKey = async (keyValue: string) => {
        return await localWalletService!.validatePrivateKey(keyValue);
    }

    const setKey = async (keyValue: string) => {
        try {
          localWalletService!.setWalletKey(keyValue);

          // 更新钱包状态，添加密钥
          setWalletStatus((prev:WalletStatus) => ({
            ...prev,
            key: keyValue
          }));
          return true;
        } catch (error) {
          throw error;
        }
    }

    const getWalletKey = async () => {
        return localWalletService!.getWalletKey();
    }
  
    return (
      <WalletContext.Provider 
        value={{ 
          walletStatus, 
          connectWallet, 
          disconnectWallet, 
          getWalletBalance, 
          validateWalletPrivateKey: validatePrivateKey, 
          setWalletKey: setKey, 
          getWalletKey,
        }}
      >
        {children}
      </WalletContext.Provider>
    );
};

// 自定义Hook，用于在组件中使用模态窗口上下文
const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}; 

export { WalletProvider, useWallet }
export type { WalletContextType, WalletStatus }
