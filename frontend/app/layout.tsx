'use client';

import "../styles/globals.css"
import React, { useState, useEffect, useContext } from 'react';
import dynamic from 'next/dynamic';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { LocalZkappService, ZkappContext } from "@/service/contractService";
import { LocalWalletService, WalletContext } from "@/service/walletService";
import { ModalProvider } from '@/context/ModalContext';
import { LocalBackendService, BackendContext } from "@/service/backendService";
import { IpfsService, IpfsServiceContext } from "@/service/ipfsService";
import { RouterProvider } from '@/context/RouterContext';

// 动态导入顶部横栏组件
const TopBar = dynamic(() => import('@/components/TopBar'), {
  ssr: false
});

// 动态导入侧边导航栏组件
const SideNav = dynamic(() => import('@/components/SideNav'), {
  ssr: false
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [globalZkapp, setGlobalZkapp] = useState<LocalZkappService | undefined>(undefined);
  const [globalWallet, setGlobalWallet] = useState<LocalWalletService | undefined>(undefined);
  const [globalBackend, setGlobalBackend] = useState<LocalBackendService | undefined>(undefined);
  const [globalIpfsService, setGlobalIpfsService] = useState<IpfsService | undefined>(undefined);

  // for initialization
  const [initialized, setInitialized] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState('');
  const [initError, setInitError] = useState<string | null>(null);
  
  // 初始化系统
  useEffect(() => {
    const initContract = async () => {
      const zkapp = new LocalZkappService();
      setGlobalZkapp(zkapp);
      setInitializationStatus("Loading web worker")
      // await new Promise((resolve) => setTimeout(resolve, 5000));
      await zkapp.initThread();
      console.log("contract thread init done");
    }
    const initWallet = async () => {
      const wallet = new LocalWalletService();
      setGlobalWallet(wallet);
    }
    const initBackend = async () => {
      const backend = new LocalBackendService();
      setGlobalBackend(backend);
    }
    const initIpfsService = async () => {
      const ipfsService = new IpfsService();
      setGlobalIpfsService(ipfsService);
    }
    const appInit = async () => {
      try {
        await initContract();
        await initWallet();
        await initBackend();
        await initIpfsService();
        setInitialized(true);
      } catch (error) {
        console.log(error)
        setInitError(error as string)
      }
    }
    if (!initialized) {
      appInit();
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
        <ModalProvider>
          <RouterProvider>
            <Container fluid className="vh-100 p-0">
              <Row className="h-100 g-0">
                {/* 左侧导航栏 */}
                <Col md={2} className="bg-white vh-100 border-end position-fixed shadow-sm"  
                id="app-sidebar-navigation">
                  <SideNav />
                </Col>
                <WalletContext.Provider value={globalWallet}>
                  <BackendContext.Provider value={globalBackend}>
                    <IpfsServiceContext.Provider value={globalIpfsService}>
                      <ZkappContext.Provider value={globalZkapp}>
                        {/* 右侧内容区域 */}
                        <Col md={12} className="ms-md-1 h-100 overflow-auto">
                        <div id="main-content-wrapper">
                          <TopBar />
                          <div id="app-content-area">
                            {children}
                          </div>
                        </div>
                        </Col>
                      </ZkappContext.Provider>
                    </IpfsServiceContext.Provider>
                  </BackendContext.Provider>
                </WalletContext.Provider>
              </Row>
            </Container>
          </RouterProvider>
        </ModalProvider>
      </body>
    </html>
  );
} 