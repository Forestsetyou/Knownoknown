import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { StatusChecker } from "@/interface/utilTypes";
import { IpfsService, IpfsServiceInit, IpfsServiceStatus, IpfsServerStatus } from "@/service/ipfsService";
import { useBackend, BackendServiceStatus, BackendServerStatus } from '@/context/BackendContext';
import { useRouter } from './RouterContext';

export interface goToReadKnowledgePack {
  public_order: number;
  pbk: string;
  pvk: string;
  metadata: any;
}

interface IpfsContextType {
    ipfsStatus: IpfsServiceStatus;
    goToReadKnowledgePack: goToReadKnowledgePack;
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
    ipfsGetCheckReport: () => Promise<any>;
    ipfsExportKnowledgeCheckPackManager: () => Promise<{ carName: string, carBytes: Uint8Array }>;
    ipfsImportKnowledgeCheckPackManager: (carBytes: Uint8Array) => Promise<void>;
    ipfsCheckKnowledgeBuilded: () => Promise<boolean>;
    ipfsBuildKnowledge: (keys: any, encryptedKeys: any, publicKey: string) => Promise<void>;
    ipfsTestFucntion: () => Promise<any>;
    ipfsGetKnowledgePublishCID: () => Promise<string>;
    ipfsGetKnowledgeCheckPackCarBytes: () => Promise<Uint8Array>;
    ipfsGetTempImgPackCarBytes: (chapterIndex: number, walletAddress: string) => Promise<Uint8Array>;
    ipfsGetKnowledgeIntroSimples: (user: string, keywords: string) => Promise<any>;
    ipfsGetKnowledgeIntroPack: (public_order: number) => Promise<any>;
    ipfsGoToReadKnowledge: (public_order: number, pvk: string, pbk: string, metadata: any) => Promise<void>;
    ipfsDecryptKnowledgeCarData: (public_order: number, decryptedKey: Uint8Array, decryptedNonce: Uint8Array) => Promise<boolean>;
    ipfsLocalDecryptKnowledgeData: (public_order: number, keys: any) => Promise<boolean>;
}

const IpfsContext = createContext<IpfsContextType | undefined>(undefined);

const defaultIpfsStatus : IpfsServiceStatus = {
    status: IpfsServerStatus.UNKNOWN,
    httpGatewayRoutingURL: '',
    statusFlagCID: '',
    knownoknownEntryCID: '',
}

const defaultGoToReadKnowledgePack : goToReadKnowledgePack = {
    public_order: -1,
    pbk: '',
    pvk: '',
    metadata: {},
}


const IpfsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [ipfsStatus, setIpfsStatus] = useState<IpfsServiceStatus>(defaultIpfsStatus);
    const [localIpfsService, setLocalIpfsService] = useState<IpfsService | undefined>(undefined);
    const [goToReadKnowledgePack, setGoToReadKnowledgePack] = useState<goToReadKnowledgePack>(defaultGoToReadKnowledgePack);

    // sync with backend status
    const { backendStatus, getBackendStatus, backendExtractFingerprintData, backendGetDecryptedKnowledgeCarBytes } = useBackend();
    // 路由服务
    const { currentRoute, navigate } = useRouter();
  
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
      await resetKnownoknownDag();
      await localIpfsService!.generateCheckReport();
    }
    
    const checkCheckReport = async () => {
      const isCheckReport = await localIpfsService!.checkCheckReport();
      return isCheckReport;
    }

    const getCheckReport = async () => {
      const checkReport = await localIpfsService!.getCheckReport();
      return checkReport;
    }

    const exportKnowledgeCheckPackManager = async () => {
      const { carName, carBytes } = await localIpfsService!.exportKnowledgeCheckPackManager();
      return { carName, carBytes };
    }

    const importKnowledgeCheckPackManager = async (carBytes: Uint8Array) => {
      await localIpfsService!.importKnowledgeCheckPackManager(carBytes);
    }

    const buildKnowledge = async (keys: any, encryptedKeys: any, publicKey: string) => {
      await localIpfsService!.buildKnowledge(keys, encryptedKeys, publicKey);
    }

    const checkKnowledgeBuilded = async () => {
      const isPacked = await localIpfsService!.checkKnowledgeBuilded();
      return isPacked;
    }

    const ipfsTestFucntion = async () => {
      const result = await localIpfsService!.ipfsTestFucntion();
      return result;
    }

    const getKnowledgePublishCID = async () => {
      const knowledgePublishCID = await localIpfsService!.getKnowledgePublishCID();
      return knowledgePublishCID;
    }

    const getKnowledgeCheckPackCarBytes = async () => {
      const knowledgeCheckPackCarBytes = await localIpfsService!.getKnowledgeCheckPackCarBytes();
      return knowledgeCheckPackCarBytes;
    }

    const getTempImgPackCarBytes = async (chapterIndex: number, walletAddress: string) => {
      const tempImgPackCarBytes = await localIpfsService!.getTempImgPackCarBytes(chapterIndex, walletAddress);
      return tempImgPackCarBytes;
    }

    const getKnowledgeIntroSimples = async (user: string, keywords: string) => {
      await resetKnownoknownDag();
      const knowledgeIntroSimples = await localIpfsService!.getKnowledgeIntroSimples(user, keywords);
      return knowledgeIntroSimples;
    }

    const getKnowledgeIntroPack = async (public_order: number) => {
      const knowledgeIntroPack = await localIpfsService!.getKnowledgeIntroPack(public_order);
      return knowledgeIntroPack;
    }

    const goToReadKnowledge = async (public_order: number, pvk: string, pbk: string, metadata: any) => {
      setGoToReadKnowledgePack({
        public_order: public_order,
        pvk: pvk,
        pbk: pbk,
        metadata: metadata,
      });
      navigate('reading' as any);
    }

    const decryptKnowledgeCarData = async (public_order: number, decryptedKey: Uint8Array, decryptedNonce: Uint8Array) => {
      const tempKeyPackCarBytes = await localIpfsService!.generateTempKeyPackCarBytes(public_order, decryptedKey, decryptedNonce);
      const decryptedKnowledgeCarBytes = await backendGetDecryptedKnowledgeCarBytes(tempKeyPackCarBytes);
      const success = await localIpfsService!.importDecryptedKnowledgeCarData(decryptedKnowledgeCarBytes);
      return success;
    }

    const localDecryptKnowledgeData = async (public_order: number, keys: any) => {
      const success = await localIpfsService!.decryptKnowledgeData(public_order, keys);
      return success;
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
          goToReadKnowledgePack: goToReadKnowledgePack,
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
          ipfsGetCheckReport: getCheckReport,
          ipfsExportKnowledgeCheckPackManager: exportKnowledgeCheckPackManager,
          ipfsImportKnowledgeCheckPackManager: importKnowledgeCheckPackManager,
          ipfsCheckKnowledgeBuilded: checkKnowledgeBuilded,
          ipfsBuildKnowledge: buildKnowledge,
          ipfsTestFucntion: ipfsTestFucntion,
          ipfsGetKnowledgePublishCID: getKnowledgePublishCID,
          ipfsGetKnowledgeCheckPackCarBytes: getKnowledgeCheckPackCarBytes,
          ipfsGetTempImgPackCarBytes: getTempImgPackCarBytes,
          ipfsGetKnowledgeIntroSimples: getKnowledgeIntroSimples,
          ipfsGetKnowledgeIntroPack: getKnowledgeIntroPack,
          ipfsGoToReadKnowledge: goToReadKnowledge,
          ipfsDecryptKnowledgeCarData: decryptKnowledgeCarData,
          ipfsLocalDecryptKnowledgeData: localDecryptKnowledgeData,
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
