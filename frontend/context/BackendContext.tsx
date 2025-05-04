import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { StatusChecker } from "@/interface/utilTypes";
import { LocalBackendService, BackendServerStatus, BackendServiceStatus } from '@/service/backendService';

interface BackendContextType {
    backendStatus: BackendServiceStatus;
    getBackendStatus: () => Promise<BackendServiceStatus>;
}

const BackendContext = createContext<BackendContextType | undefined>(undefined);

const defaultBackendStatus : BackendServiceStatus = {
    status: BackendServerStatus.UNKNOWN,
    knownoknownEntryCID: '',
    contractAddress: '',
    ipfsGatewayRoutingURL: '',
    ipfsStatusFlagCID: '',
}

const BackendProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [backendStatus, setBackendStatus] = useState<BackendServiceStatus>(defaultBackendStatus);
    const [localBackendService, setLocalBackendService] = useState<LocalBackendService>(new LocalBackendService());
  
    // for initialization
    const [initialized, setInitialized] = useState(false);
    const [initializationStatus, setInitializationStatus] = useState('');
    const [initError, setInitError] = useState<string | null>(null);

    // 定时检查余额
    let backendStatusChecker: StatusChecker | null = null;
    
    const getBackendStatus = async () => {
        const backendStatus = await localBackendService.getBackendStatus();
        setBackendStatus(backendStatus);
        return backendStatus;
    }

    // 初始化
    useEffect(() => {
        const init = async () => {
            setInitializationStatus('初始化后端服务...')
            await getBackendStatus();
            backendStatusChecker = setInterval(getBackendStatus, 60000); // 60秒更新一次后端服务状态
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
  
    return (
      <BackendContext.Provider 
        value={{ 
          backendStatus: backendStatus, 
          getBackendStatus, 
        }}
      >
        {children}
      </BackendContext.Provider>
    );
};

// 自定义Hook，用于在组件中使用模态窗口上下文
const useBackend = () => {
  const context = useContext(BackendContext);
  if (context === undefined) {
    throw new Error('useBackend must be used within a BackendProvider');
  }
  return context;
}; 

export { BackendProvider, useBackend, BackendServerStatus }
export type { BackendContextType, BackendServiceStatus }
