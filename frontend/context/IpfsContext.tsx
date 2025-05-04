import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { StatusChecker } from "@/interface/utilTypes";
import { IpfsService, IpfsServiceInit, IpfsServiceStatus, IpfsServerStatus } from "@/service/ipfsService";
import { useBackend, BackendServiceStatus, BackendServerStatus } from '@/context/BackendContext';

interface IpfsContextType {
    ipfsStatus: IpfsServiceStatus;
    getIpfsStatus: () => Promise<IpfsServiceStatus>;
    ipfsCreateNewKnowledge: (address: string) => Promise<void>;
    ipfsGetKnowledgeMetadata: () => Promise<any>;
    ipfsSetKnowledgeMetadata: (metadata: any) => Promise<void>;
}

const IpfsContext = createContext<IpfsContextType | undefined>(undefined);

const defaultIpfsStatus : IpfsServiceStatus = {
    status: IpfsServerStatus.UNKNOWN,
    httpGatewayRoutingURL: '',
    statusFlagCID: '',
    knownoknownEntryCID: '',
}


const IpfsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [ipfsStatus, setIpfsStatus] = useState<IpfsServiceStatus>(defaultIpfsStatus);
    const [localIpfsService, setLocalIpfsService] = useState<IpfsService>(new IpfsService());

    // sync with backend status
    const { backendStatus, getBackendStatus } = useBackend();
  
    // for initialization
    const [initialized, setInitialized] = useState(false);
    const [initializationStatus, setInitializationStatus] = useState('');
    const [initError, setInitError] = useState<string | null>(null);

    // 定时检查余额
    let ipfsStatusChecker: StatusChecker | null = null;

    const getIpfsStatus = async () => {
        const ipfsStatus = await localIpfsService.getStatus();
        setIpfsStatus(ipfsStatus);
        return ipfsStatus;
    }
    
    // 初始化
    useEffect(() => {
        const init = async () => {
            setInitializationStatus('初始化IPFS服务...')
            const ipfsServiceInit: IpfsServiceInit = {
              httpGatewayRoutingURL: backendStatus.ipfsGatewayRoutingURL,
              knownoknownEntryCID: backendStatus.knownoknownEntryCID,
              statusFlagCID: backendStatus.ipfsStatusFlagCID,
            }
            await localIpfsService.initialize(ipfsServiceInit);
            await getIpfsStatus();
            ipfsStatusChecker = setInterval(getIpfsStatus, 60000); // 60秒更新一次IPFS状态
            setInitialized(true);
        }
        if (!initialized) {
            init()
        }
    }, []);

    const createNewKnowledge = async (address: string) => {
        await localIpfsService.createNewKnowledge(address);
    }

    const getKnowledgeMetadata = async () => {
        const metadata = await localIpfsService.getKnowledgeMetadata();
        return metadata;
    }

    const setKnowledgeMetadata = async (metadata: any) => {
        await localIpfsService.setKnowledgeMetadata(metadata);
    }
    
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

  
    return (
      <IpfsContext.Provider 
        value={{ 
          ipfsStatus: ipfsStatus, 
          getIpfsStatus, 
          ipfsCreateNewKnowledge: createNewKnowledge, 
          ipfsGetKnowledgeMetadata: getKnowledgeMetadata, 
          ipfsSetKnowledgeMetadata: setKnowledgeMetadata, 
        }}
      >
        {children}
      </IpfsContext.Provider>
    );
};

// 自定义Hook，用于在组件中使用模态窗口上下文
const useIpfs = () => {
  const context = useContext(IpfsContext);
  if (context === undefined) {
    throw new Error('useIpfs must be used within a IpfsProvider');
  }
  return context;
}; 

export { IpfsProvider, useIpfs, IpfsServerStatus }
export type { IpfsContextType, IpfsServiceStatus }
