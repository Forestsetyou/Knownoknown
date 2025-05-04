'use client';

import React, { useState, useEffect, useContext } from 'react';
import { Container, Tabs, Tab, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { FaFileImport, FaFileExport, FaArrowRight, FaArrowLeft, FaWallet, FaExclamationTriangle } from 'react-icons/fa';
import PublishMetadata from '@/components/publish/PublishMetadata';
import PublishChapters from '@/components/publish/PublishChapters';
import PublishIntro from '@/components/publish/PublishIntro';
import PublishReport from '@/components/publish/PublishReport';
import { WalletStatus, useWallet } from '@/context/WalletContext';
import { useIpfs } from '@/context/IpfsContext';
export default function PublishPage() {
  // 当前活动的标签页
  const [activeTab, setActiveTab] = useState('basic-info');
  
  // IPFS服务
  const { ipfsStatus, getIpfsStatus, ipfsCreateNewKnowledge, ipfsGetKnowledgeMetadata, ipfsSetKnowledgeMetadata } = useIpfs();
  
  // 钱包服务
  const { walletStatus, connectWallet, disconnectWallet, validateWalletPrivateKey, setWalletKey } = useWallet();
  const [localWalletStatus, setLocalWalletStatus] = useState<WalletStatus>(walletStatus);
  
  // 页面加载状态
  const [walletConnected, setWalletConnected] = useState(walletStatus.connected);
  const [pageLoading, setPageLoading] = useState(true);
  
  const initializeNewKnowledge = async () => {
    setPageLoading(true);
    // 只有在钱包已连接的情况下才初始化
    if (walletConnected) {
      try {
        await ipfsCreateNewKnowledge(localWalletStatus.address);
        setPageLoading(false);
      } catch (error) {
        console.error('初始化新知识失败:', error);
      }
    }
  };
  
  // 初始化新知识
  useEffect(() => {
    initializeNewKnowledge();
  }, [walletConnected]);

  const syncWalletStatus = async () => {
    setLocalWalletStatus(prev => ({
      ...prev,
      ...walletStatus!,
    }));
  }
  // 同步钱包状态
  useEffect(() => {
    syncWalletStatus();
    if (walletConnected !== walletStatus.connected) {
      setWalletConnected(walletStatus.connected);
    }
  }, [walletStatus]);
  
  // 处理页面刷新
  const handleRefreshPage = () => {
    initializeNewKnowledge();
  };
  
  // 处理下一步按钮点击
  const handleNextStep = () => {
    // 根据当前标签页确定下一个标签页
    if (activeTab === 'basic-info') {
      setActiveTab('chapter-content');
    } else if (activeTab === 'chapter-content') {
      setActiveTab('knowledge-intro');
    } else if (activeTab === 'knowledge-intro') {
      setActiveTab('check-report');
    }
  };
  
  // 处理上一步按钮点击
  const handlePrevStep = () => {
    // 根据当前标签页确定上一个标签页
    if (activeTab === 'chapter-content') {
      setActiveTab('basic-info');
    } else if (activeTab === 'knowledge-intro') {
      setActiveTab('chapter-content');
    } else if (activeTab === 'check-report') {
      setActiveTab('knowledge-intro');
    }
  };
  
  // 处理工作流导入
  const handleImportWorkflow = () => {
    // 模拟导入功能
    console.log('导入工作流');
    // 这里可以添加文件选择器和导入逻辑
  };
  
  // 处理工作流导出
  const handleExportWorkflow = () => {
    // 模拟导出功能
    console.log('导出工作流');
    // 这里可以添加导出逻辑
  };
  
  // 处理完成发布
  const handleFinishPublish = async () => {
    try {
      // 这里添加发布逻辑
      console.log('完成发布');
    } catch (error) {
      console.error('发布失败:', error);
    }
  };
  
  // 自定义标签样式
  const customTabStyle = {
    '--bs-nav-link-color': '#555',
    '--bs-nav-tabs-link-active-color': '#ff4c4c',
    '--bs-nav-tabs-link-hover-border-color': 'transparent transparent #dee2e6',
    '--bs-nav-tabs-link-active-border-color': 'transparent transparent #ff4c4c',
    '--bs-nav-tabs-border-width': '0 0 1px 0',
    '--bs-nav-tabs-border-color': '#dee2e6',
  } as React.CSSProperties;
  
  // 如果钱包未连接，显示连接提示
  if (!walletConnected) {
    return (
      <Container className="py-5">
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
          <div className="text-center mb-4">
            <FaExclamationTriangle size={50} className="text-warning mb-3" />
            <h4 className="mb-3">需要连接钱包</h4>
            <p className="text-muted mb-4">发布知识需要连接钱包以进行身份验证和上链操作。</p>
            <Alert variant="info" className="mb-4 text-start">
              <p className="mb-1"><strong>为什么需要连接钱包？</strong></p>
              <ul className="mb-0">
                <li>验证您的身份</li>
                <li>将知识内容安全地存储到IPFS</li>
                <li>在Mina区块链上注册您的知识产权</li>
              </ul>
            </Alert>
          </div>
        </div>
      </Container>
    );
  }
  
  // 如果页面正在加载，显示加载状态
  if (pageLoading) {
    return (
      <Container className="py-5">
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
          <Spinner animation="border" variant="danger" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
          <h5 className="text-muted mb-2">正在初始化知识发布环境</h5>
          <p className="text-muted">请稍候...</p>
        </div>
      </Container>
    );
  }
  
  return (
    <Container className="py-2">
      {/* 标题和工作流管理区域 */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">发布新知识</h4>
        <div>
          <Button 
            variant="outline-secondary" 
            className="me-2"
            onClick={handleImportWorkflow}
          >
            <FaFileImport className="me-2" />
            导入工作流
          </Button>
          <Button 
            variant="outline-secondary"
            onClick={handleExportWorkflow}
          >
            <FaFileExport className="me-2" />
            导出工作流
          </Button>
        </div>
      </div>
      
      {/* 标签页导航 */}
      <div className="tab-container">
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => k && setActiveTab(k)}
          className="custom-tabs"
          style={customTabStyle}
        >
          <Tab eventKey="basic-info" title="基本信息" />
          <Tab eventKey="chapter-content" title="章节内容" />
          <Tab eventKey="knowledge-intro" title="知识简介" />
          <Tab eventKey="check-report" title="检测报告" />
        </Tabs>
      </div>
      
      {/* 内容区域 */}
      <Card className="card-custom">
        {activeTab === 'basic-info' && (
          <>
            <Card.Header className="bg-light py-4">
              <h5 className="mb-0 fw-bold ms-2">基本信息</h5>
            </Card.Header>
            <Card.Body>
              <PublishMetadata />
            </Card.Body>
            <Card.Footer className="bg-white d-flex justify-content-end">
              <Button 
                variant="danger" 
                onClick={handleNextStep}
                className="d-flex align-items-center"
              >
                下一步
                <FaArrowRight className="ms-2" />
              </Button>
            </Card.Footer>
          </>
        )}
        
        {activeTab === 'chapter-content' && (
          <>
            <Card.Header className="bg-light py-4">
              <h5 className="mb-0 fw-bold ms-2">章节内容</h5>
            </Card.Header>
            <Card.Body>
              <PublishChapters />
            </Card.Body>
            <Card.Footer className="bg-white d-flex justify-content-end">
              <Button 
                variant="outline-secondary" 
                onClick={handlePrevStep}
                className="d-flex align-items-center me-2"
              >
                <FaArrowLeft className="me-2" />
                上一步
              </Button>
              <Button 
                variant="danger" 
                onClick={handleNextStep}
                className="d-flex align-items-center"
              >
                下一步
                <FaArrowRight className="ms-2" />
              </Button>
            </Card.Footer>
          </>
        )}
        
        {activeTab === 'knowledge-intro' && (
          <>
            <Card.Header className="bg-light py-4">
              <h5 className="mb-0 fw-bold ms-2">知识简介</h5>
            </Card.Header>
            <Card.Body>
              <PublishIntro />
            </Card.Body>
            <Card.Footer className="bg-white d-flex justify-content-end">
              <Button 
                variant="outline-secondary" 
                onClick={handlePrevStep}
                className="d-flex align-items-center me-2"
              >
                <FaArrowLeft className="me-2" />
                上一步
              </Button>
              <Button 
                variant="danger" 
                onClick={handleNextStep}
                className="d-flex align-items-center"
              >
                下一步
                <FaArrowRight className="ms-2" />
              </Button>
            </Card.Footer>
          </>
        )}
        
        {activeTab === 'check-report' && (
          <>
            <Card.Header className="bg-light py-4">
              <h5 className="mb-0 fw-bold ms-2">检测报告</h5>
            </Card.Header>
            <Card.Body>
              <PublishReport />
            </Card.Body>
            <Card.Footer className="bg-white d-flex justify-content-end">
              <Button 
                variant="outline-secondary" 
                onClick={handlePrevStep}
                className="d-flex align-items-center me-2"
              >
                <FaArrowLeft className="me-2" />
                上一步
              </Button>
              <Button 
                variant="danger" 
                onClick={handleFinishPublish}
                className="d-flex align-items-center"
              >
                完成发布
              </Button>
            </Card.Footer>
          </>
        )}
      </Card>
      
      {/* 添加自定义CSS样式 */}
      <style jsx global>{`
        .tab-container {
          padding: 0;
          width: 100%;
          border-bottom: 1px solid #e8e8e8;
          margin-bottom: 1rem;
        }
        
        .custom-tabs .nav-link {
          border: none;
          padding: 0.75rem 0.75rem;
          font-weight: 500;
          color: #555;
          margin-right: 0.75rem;
        }
        
        .custom-tabs .nav-link:hover {
          color: #ff4c4c;
          background-color: transparent;
        }
        
        .custom-tabs .nav-link.active {
          color: #ff4c4c;
          background-color: transparent;
          border-bottom: 2px solid #ff4c4c;
        }
        
        .custom-tabs .nav-tabs {
          border-bottom: none;
          width: 100%;
        }
        
        .card-custom .card-header {
          border-bottom: 1px solid #f0f0f0;
        }
        
        .card-custom .card-footer {
          border-top: 1px solid #f0f0f0;
        }
      `}</style>
    </Container>
  );
} 