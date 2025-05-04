// import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
// import { LocalBackendService, BackendServerStatus } from '@/service/backendService'
// import { Container, Row, Col, Alert } from 'react-bootstrap';

// interface BackendState {
//     localBackendService?: LocalBackendService;
//     status: BackendServerStatus;
//     knownoknownEntryCID: string;
//     contractAddress: string;
//     ipfsGatewayRoutingURL: string;
//     ipfsStatusFlagCID: string;
// }

// interface BackendContextType {
//     zkappState: BackendState;
// }

// const BackendContext = createContext<BackendContextType | undefined>(undefined);

// const defaultBackendState : BackendState = {
//     localBackendService: undefined,
//     status: BackendServerStatus.UNKNOWN,
//     knownoknownEntryCID: '',
//     contractAddress: '',
//     ipfsGatewayRoutingURL: '',
//     ipfsStatusFlagCID: '',
// }


// const BackendProvider: React.FC<{children: ReactNode}> = ({ children }) => {
//     const [backendState, setBackendState] = useState<BackendState>(defaultBackendState);
  
//     // for initialization
//     const [initialized, setInitialized] = useState(false);
//     const [initializationStatus, setInitializationStatus] = useState('');
//     const [initError, setInitError] = useState<string | null>(null);
    
//     // 初始化
//     useEffect(() => {
//         const init = async () => {
//             setInitializationStatus('初始化后端服务...')
//             const backend = new LocalBackendService();
//             const backendStatus = await backend.getBackendStatus();
//             const backendState: BackendState = {
//                 ...backendStatus,
//                 localBackendService: backend,
//             }
//             setBackendState(backendState)
//             setInitialized(true);
//         }
//         if (!initialized) {
//             init()
//         }
//     }, []);
    
//     // 如果系统尚未初始化，显示加载中
//     if (!initialized) {
//       return (
//         <html lang="zh">
//           <head>
//             <link
//               rel="stylesheet"
//               href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
//               integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
//               crossOrigin="anonymous"
//               referrerPolicy="no-referrer"
//             />
//           </head>
//           <body>
//             <Container className="d-flex align-items-center justify-content-center" style={{ height: "100vh" }}>
//               <div className="text-center">
//                 <h2>KnowNoKnown</h2>
//                 <p>基于Mina Protocol的知识付费平台</p>
                
//                 {initError ? (
//                   <Alert variant="danger" className="mt-3">
//                     <Alert.Heading>初始化错误</Alert.Heading>
//                     <p>{initError}</p>
//                     <p className="mb-0">
//                       这可能是由于浏览器不支持某些功能所致。请检查控制台获取更多信息。
//                     </p>
//                     <button 
//                       className="btn btn-outline-danger mt-3" 
//                       onClick={()=>{}}
//                     >
//                       重试初始化
//                     </button>
//                   </Alert>
//                 ) : (
//                   <>
//                     <div className="spinner-border" role="status">
//                       <span className="visually-hidden">Loading...</span>
//                     </div>
//                     <p className="mt-3">{initializationStatus}</p>
//                   </>
//                 )}
//               </div>
//             </Container>
//           </body>
//         </html>
//       );
//     }
    
//     const getBackendStatus = async (zkappAddress: string) => {
//         const backendStatus = await backendState.localBackendService!.getBackendStatus();
//         setBackendState(prev => ({
//             ...prev,
//             ...backendStatus,
//         }))
//         return backendStatus
//     }
  
//     return (
//       <ZkappContext.Provider 
//         value={{ 
//           zkappState, 
//           showModal, 
//           hideModal, 
//           showLoading, 
//           showSuccess, 
//           showError, 
//           showConfirm 
//         }}
//       >
//         {children}
//       </ZkappContext.Provider>
//     );
// };

// export { ZkappContext, ZkappProvider }
// export type { ZkappContextType, ZkappState }
