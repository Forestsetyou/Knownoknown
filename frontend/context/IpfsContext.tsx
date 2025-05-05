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
    ipfsGetKnowledgeChapterData: (chapterIndex: number) => Promise<any>;
    ipfsAddKnowledgeChapterData: (newKnowledgeChapterData: any) => Promise<void>;
    ipfsCreateNewChapterData: () => Promise<any>;
    ipfsSetKnowledgeChapterData: (chapterIndex: number, newKnowledgeChapterData: any) => Promise<void>;
    ipfsRmKnowledgeChapterData: (chapterIndex: number) => Promise<void>;
    ipfsUpKnowledgeChapterData: (chapterIndex: number) => Promise<void>;
    ipfsDownKnowledgeChapterData: (chapterIndex: number) => Promise<void>;
    ipfsGetKnowledgeChapterDatas: () => Promise<any[]>;
    ipfsGetKnowledgeChapterDatasLength: () => Promise<number>;
    ipfsGetKnowledgeChapterTitles: () => Promise<string[]>;
    ipfsAddTempImage: (image_data: Uint8Array, mimeType: string) => Promise<string>;
    ipfsGetTempImage: (image_cid: string) => Promise<Uint8Array | null>;
    ipfsCheckKnowledgeDataPacked: () => Promise<boolean>;
    ipfsPackKnowledgeData: () => Promise<void>;
    ipfsCheckFingerprintData: () => Promise<boolean>;
    ipfsGenerateFingerprintData: () => Promise<void>;
    ipfsResetKnownoknownDag: () => Promise<void>;
    ipfsGenerateCheckReport: () => Promise<void>;
    ipfsCheckCheckReport: () => Promise<boolean>;
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
    const [localIpfsService, setLocalIpfsService] = useState<IpfsService | undefined>(undefined);

    // sync with backend status
    const { backendStatus, getBackendStatus, backendExtractFingerprintData } = useBackend();
  
    // for initialization
    const [initialized, setInitialized] = useState(false);
    const [initializationStatus, setInitializationStatus] = useState('');
    const [initError, setInitError] = useState<string | null>(null);

    // 定时检查余额
    let ipfsStatusChecker: StatusChecker | null = null;

    // 设置定时器
    useEffect(() => {
      if (localIpfsService) {
        ipfsStatusChecker = setInterval(getIpfsStatus, 60000); // 60秒更新一次IPFS状态
      }
      return () => {
        if (ipfsStatusChecker) {
          clearInterval(ipfsStatusChecker);
        }
      };
    }, [localIpfsService]);

    // 初始化
    useEffect(() => {
        const init = async () => {
            setInitializationStatus('初始化IPFS服务...')
            const localIpfsService = new IpfsService();
            setLocalIpfsService(localIpfsService);
            const ipfsServiceInit: IpfsServiceInit = {
              httpGatewayRoutingURL: backendStatus.ipfsGatewayRoutingURL,
              knownoknownEntryCID: backendStatus.knownoknownEntryCID,
              statusFlagCID: backendStatus.ipfsStatusFlagCID,
            }
            await localIpfsService.initialize(ipfsServiceInit);
            const ipfsStatus = await localIpfsService!.getStatus();
            setIpfsStatus(ipfsStatus);
            setInitialized(true);
        }
        if (!initialized) {
            init()
        }
    }, []);

    const getIpfsStatus = async () => {
        const ipfsStatus = await localIpfsService!.getStatus();
        setIpfsStatus(ipfsStatus);
        return ipfsStatus;
    }

    const createNewKnowledge = async (address: string) => {
        await localIpfsService!.createNewKnowledge(address);
    }

    const getKnowledgeMetadata = async () => {
        const metadata = await localIpfsService!.getKnowledgeMetadata();
        return metadata;
    }

    const setKnowledgeMetadata = async (metadata: any) => {
        await localIpfsService!.setKnowledgeMetadata(metadata);
    }

    const getKnowledgeChapterData = async (chapterIndex: number) => {
        const knowledgeChapterData = await localIpfsService!.getKnowledgeChapterData(chapterIndex);
        return knowledgeChapterData;
    }

    const addKnowledgeChapterData = async (newKnowledgeChapterData: any) => {
        await localIpfsService!.addKnowledgeChapterData(newKnowledgeChapterData);
    }

    const createNewChapterData = async () => {
        const newKnowledgeChapterData = await localIpfsService!.createNewChapterData();
        return newKnowledgeChapterData;
    }

    const setKnowledgeChapterData = async (chapterIndex: number, newKnowledgeChapterData: any) => {
        await localIpfsService!.setKnowledgeChapterData(chapterIndex, newKnowledgeChapterData);
    }
    

    const upKnowledgeChapterData = async (chapterIndex: number) => {
        await localIpfsService!.upKnowledgeChapterData(chapterIndex);
    }

    const downKnowledgeChapterData = async (chapterIndex: number) => {
        await localIpfsService!.downKnowledgeChapterData(chapterIndex);
    }
    
    const rmKnowledgeChapterData = async (chapterIndex: number) => {
        await localIpfsService!.rmKnowledgeChapterData(chapterIndex);
    }

    const getKnowledgeChapterDatas = async () => {
        const knowledgeChapterDatas = await localIpfsService!.getKnowledgeChapterDatas();
        return knowledgeChapterDatas;
    }

    const getKnowledgeChapterTitles = async () => {
        const knowledgeChapterTitles = await localIpfsService!.getKnowledgeChapterTitles();
        return knowledgeChapterTitles;
    }

    const getKnowledgeChapterDatasLength = async () => {
        const length = await localIpfsService!.getKnowledgeChapterDatasLength();
        return length;
    }

    const addTempImage = async (image_data: Uint8Array, mimeType: string) => {
        const customLink = await localIpfsService!.addTempImage(image_data, mimeType);
        return customLink;
    }

    const getTempImage = async (image_cid: string) => {
        const tempImageReader = await localIpfsService!.getTempImage(image_cid);
        return tempImageReader;
    }

    const checkKnowledgeDataPacked = async () => {
        const isPacked = await localIpfsService!.checkKnowledgeDataPacked();
        return isPacked;
    }

    const packKnowledgeData = async () => {
        await localIpfsService!.packKnowledgeData();
    }

    const checkFingerprintData = async () => {
        const isFingerprintData = await localIpfsService!.checkFingerprintData();
        return isFingerprintData;
    }

    const generateFingerprintData = async () => {
      const knowledgeDataCarBytes = await localIpfsService!.getKnowledgeDataCarBytes();
      const fingerprintDataCarBytes = await backendExtractFingerprintData(knowledgeDataCarBytes);
      await localIpfsService!.generateFingerprintDataFromCarBytes(fingerprintDataCarBytes);
    }

    const resetKnownoknownDag = async () => {
      const backendStatus = await getBackendStatus();
      const knownoknownEntryCID = backendStatus.knownoknownEntryCID;
      await localIpfsService!.resetKnownoknownDag(knownoknownEntryCID);
    }

    const generateCheckReport = async () => {
      await localIpfsService!.generateCheckReport();
    }
    
    const checkCheckReport = async () => {
      const isCheckReport = await localIpfsService!.checkCheckReport();
      return isCheckReport;
    }
    // 如果系统尚未初始化，显示加载中
    if (!initialized) {
      return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "50vh" }}>
          <div className="text-center">
            <h4>IPFS服务</h4>
            
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
          ipfsGetKnowledgeChapterData: getKnowledgeChapterData,
          ipfsAddKnowledgeChapterData: addKnowledgeChapterData,
          ipfsCreateNewChapterData: createNewChapterData,
          ipfsSetKnowledgeChapterData: setKnowledgeChapterData,
          ipfsRmKnowledgeChapterData: rmKnowledgeChapterData,
          ipfsUpKnowledgeChapterData: upKnowledgeChapterData,
          ipfsDownKnowledgeChapterData: downKnowledgeChapterData,
          ipfsGetKnowledgeChapterDatas: getKnowledgeChapterDatas,
          ipfsGetKnowledgeChapterDatasLength: getKnowledgeChapterDatasLength,
          ipfsGetKnowledgeChapterTitles: getKnowledgeChapterTitles,
          ipfsAddTempImage: addTempImage,
          ipfsGetTempImage: getTempImage,
          ipfsCheckKnowledgeDataPacked: checkKnowledgeDataPacked,
          ipfsPackKnowledgeData: packKnowledgeData,
          ipfsCheckFingerprintData: checkFingerprintData,
          ipfsGenerateFingerprintData: generateFingerprintData,
          ipfsResetKnownoknownDag: resetKnownoknownDag,
          ipfsGenerateCheckReport: generateCheckReport,
          ipfsCheckCheckReport: checkCheckReport,
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
