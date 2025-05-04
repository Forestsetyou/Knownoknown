import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { WalletStatus, LocalWalletService } from '@/service/walletService'
import { Container, Alert } from 'react-bootstrap';
import { StatusChecker } from "@/interface/utilTypes";

interface WalletContextType {
    walletStatus: WalletStatus;
    connectWallet: () => Promise<boolean>;
    disconnectWallet: () => Promise<boolean>;
    getWalletBalance: () => Promise<number>;
    validatePrivateKey: (keyValue: string) => Promise<boolean>;
    setKey: (keyValue: string) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const defaultWalletState : WalletStatus = {
    connected: false,
    connecting: false,
    address: '',
    key: '',
    balance: '',
}


const WalletProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [walletStatus, setWalletStatus] = useState<WalletStatus>(defaultWalletState);
    const [localWalletService, setLocalWalletService] = useState<LocalWalletService>(new LocalWalletService());
  
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
            setInitialized(true);
        }
        if (!initialized) {
            init()
        }
    }, []);
    
    // 如果系统尚未初始化，显示加载中
    if (!initialized) {
      return (
        <html lang="zh">
          <head>
            <link
              rel="stylesheet"
              href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
              integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          </head>
          <body>
            <Container className="d-flex align-items-center justify-content-center" style={{ height: "100vh" }}>
              <div className="text-center">
                <h2>KnowNoKnown</h2>
                <p>基于Mina Protocol的知识付费平台</p>
                
                {initError ? (
                  <Alert variant="danger" className="mt-3">
                    <Alert.Heading>初始化错误</Alert.Heading>
                    <p>{initError}</p>
                    <p className="mb-0">
                      这可能是由于浏览器不支持某些功能所致。请检查控制台获取更多信息。
                    </p>
                    <button 
                      className="btn btn-outline-danger mt-3" 
                      onClick={()=>{}}
                    >
                      重试初始化
                    </button>
                  </Alert>
                ) : (
                  <>
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">{initializationStatus}</p>
                  </>
                )}
              </div>
            </Container>
          </body>
        </html>
      );
    }
    
    const connectWallet = async () => {
        try {
            setWalletStatus(prev => ({
                ...prev,
                connecting: true,
            }));
            
            if (await localWalletService.connectWallet()) {
                const balance = Number(await localWalletService.getWalletBalance() as unknown as string)/1e9;
                setWalletStatus(prev => ({
                    ...prev,
                    connected: true,
                    connecting: false,
                    address: (localWalletService.getWalletAddress()) as unknown as string,
                    key: (localWalletService.getWalletKey()) as unknown as string,
                    balance: `${balance}`,
                }));
                walletBalanceChecker = setInterval(getWalletBalance, 120000); // 120秒更新一次钱包余额
                return true
            } else {
                setWalletStatus(prev => ({
                    ...prev,
                    ...walletStatus!,
                    connecting: false
                }));
                return false
            }
        } catch (error) {
            setWalletStatus(prev => ({
                ...prev,
                connecting: false
            }));
            throw error;
        }
    }

    const disconnectWallet = async () => {
        try {
            localWalletService.disconnectWallet();
            setWalletStatus(prev => ({
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
      const balance = Number(await localWalletService.getWalletBalance() as unknown as string)/1e9;
      setWalletStatus(prev => ({
        ...prev,
        balance: `${balance}`,
      }));
      return balance;
    }

    const validatePrivateKey = async (keyValue: string) => {
        return await localWalletService.validatePrivateKey(keyValue);
    }

    const setKey = async (keyValue: string) => {
        try {
          localWalletService.setWalletKey(keyValue);

          // 更新钱包状态，添加密钥
          setWalletStatus({
          ...walletStatus!,
          key: keyValue
          });
          return true;
        } catch (error) {
          throw error;
        }
    }
  
    return (
      <WalletContext.Provider 
        value={{ 
          walletStatus, 
          connectWallet, 
          disconnectWallet, 
          getWalletBalance, 
          validatePrivateKey, 
          setKey, 
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

export { WalletContext, WalletProvider, useWallet }
export type { WalletContextType }
