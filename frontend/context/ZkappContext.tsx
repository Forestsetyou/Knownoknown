import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { StatusChecker } from "@/interface/utilTypes";
import { useBackend, BackendServiceStatus, BackendServerStatus } from '@/context/BackendContext';
import { LocalZkappService, ZkappStatus } from '@/service/contractService';
import { ZkappFields } from "@/interface/utilTypes";

interface ZkappContextType {
    zkappStatus: ZkappStatus;
    getZkappFields: () => Promise<ZkappFields>;
    compileZkapp: () => Promise<void>;
}

const ZkappContext = createContext<ZkappContextType | undefined>(undefined);

const defaultZkappStatus : ZkappStatus = {
  compileStatus: false,
  contractAddress: '',
  zkappFields: undefined
}


const ZkappProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [zkappStatus, setZkappStatus] = useState<ZkappStatus>(defaultZkappStatus);
    const [localZkappService, setLocalZkappService] = useState<LocalZkappService>(new LocalZkappService());

    // sync with backend status
    const { backendStatus, getBackendStatus } = useBackend();
  
    // for initialization
    const [initialized, setInitialized] = useState(false);
    const [initializationStatus, setInitializationStatus] = useState('');
    const [initError, setInitError] = useState<string | null>(null);

    // 定时检查合约状态
    let zkappFieldChecker: StatusChecker | null = null;

    const getZkappFields = async () => {
      const zkappFields = await localZkappService.getZkappFields();
      setZkappStatus((prev:any) => ({
        ...prev,
        zkappFields
      }));
      return zkappFields;
    }
    
    // 初始化
    useEffect(() => {
        const init = async () => {
            setInitializationStatus('初始化合约服务...')
            await localZkappService.initThread();
            const contractAddress = backendStatus.contractAddress;
            await localZkappService.initZkapp(contractAddress);
            const compileStatus = await localZkappService.getCompileStatus();
            const zkappFields: ZkappFields = await localZkappService.getZkappFields();
            setZkappStatus({
              compileStatus,
              contractAddress,
              zkappFields
            });
            zkappFieldChecker = setInterval(getZkappFields, 60000); // 60秒更新一次IPFS状态
            setInitialized(true);
        }
        if (!initialized) {
            init()
        }
    }, []);
    
    const compileZkapp = async () => {
      await localZkappService.compileZkapp();
      setZkappStatus((prev:any) => ({
        ...prev,
        compileStatus: true
      }));
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
      <ZkappContext.Provider 
        value={{ 
          zkappStatus: zkappStatus, 
          getZkappFields: getZkappFields, 
          compileZkapp: compileZkapp, 
        }}
      >
        {children}
      </ZkappContext.Provider>
    );
};

// 自定义Hook，用于在组件中使用模态窗口上下文
const useZkapp = () => {
  const context = useContext(ZkappContext);
  if (context === undefined) {
    throw new Error('useZkapp must be used within a ZkappProvider');
  }
  return context;
}; 

export { ZkappProvider, useZkapp }
export type { ZkappContextType, ZkappStatus }
