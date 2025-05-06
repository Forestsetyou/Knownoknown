'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner, Alert, Toast, ToastContainer } from 'react-bootstrap';
import { FaExclamationTriangle, FaSync, FaKey, FaCheckCircle, FaCubes, FaArrowRight } from 'react-icons/fa';
import { useIpfs, IpfsServerStatus } from '@/context/IpfsContext';
import { useZkapp } from '@/context/ZkappContext';
import { useWallet } from '@/context/WalletContext';
import CheckReportDisplay from '@/components/CheckReportDisplay';
import { Checkreport } from '@/interface/knownoknownDag/knowledgeEntryDagInterface';
import { randomBytes } from '@noble/hashes/utils';

// 主组件
export default function PublishReport() {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [buildingKnowledge, setBuildingKnowledge] = useState(false);
  const [report, setReport] = useState<Checkreport | null>(null);
  const [isFingerprinted, setIsFingerprinted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Toast通知状态
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');
  
  // IPFS服务
  const { 
    ipfsStatus, 
    ipfsCheckFingerprintData,
    ipfsCheckCheckReport,
    ipfsGetCheckReport,
    ipfsGenerateCheckReport,
    ipfsBuildKnowledge,
  } = useIpfs();

  // 合约服务
  const { zkappEncryptKey } = useZkapp();

  // 钱包服务
  const { walletStatus } = useWallet();

  // 显示Toast通知
  const showToastNotification = (message: string, variant: string = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };
  
  // 初始化时检查指纹状态和报告
  useEffect(() => {
    const init = async () => {
      if (ipfsStatus.status === IpfsServerStatus.ONLINE) {
        try {
          setLoading(true);
          
          // 检查指纹是否已生成
          const fingerprintStatus = await ipfsCheckFingerprintData();
          setIsFingerprinted(fingerprintStatus);
          
          // 如果指纹已生成，尝试获取检测报告（但不自动生成）
          if (fingerprintStatus) {
            try {
              const reportData = await ipfsGetCheckReport();
              if (reportData) {
                setReport(reportData);
              }
            } catch (reportError) {
              console.log('未找到检测报告，可能尚未生成');
              // 不设置错误，因为报告可能尚未生成
            }
          }
          
          setLoading(false);
        } catch (error) {
          console.error('初始化检测报告页面失败:', error);
          setError('初始化失败，请检查IPFS服务状态');
          setLoading(false);
        }
      }
    };
    
    init();
  }, []);
  
  // 生成检测报告
  const handleGenerateReport = async () => {
    if (!isFingerprinted) {
      setError('请先生成知识指纹后再进行检测');
      showToastNotification('请先生成知识指纹后再进行检测', 'danger');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 生成检测报告
      await ipfsGenerateCheckReport();
      const reportData = await ipfsGetCheckReport();
      setReport(reportData);
      
      showToastNotification('检测报告生成成功！', 'success');
      setLoading(false);
    } catch (error) {
      console.error('生成检测报告失败:', error);
      setError('生成检测报告失败，请稍后重试');
      showToastNotification('生成检测报告失败，请稍后重试', 'danger');
      setLoading(false);
    }
  };
  
  // 构建知识
  const handleBuildKnowledge = async () => {
    if (!(await ipfsCheckCheckReport())) {
      showToastNotification('请先同步检测报告', 'danger');
      return;
    }
    
    try {
      setBuildingKnowledge(true);
      setError(null);
      
      // 构建知识实体
      const key = randomBytes(32);
      const nonce = randomBytes(12); // GCM 推荐 12 字节 nonce
      const keys = {
        key: key,
        nonce: nonce,
      }
      const publicKey = walletStatus.address;
      const encryptedKeys = await zkappEncryptKey(key, nonce, publicKey);
      await ipfsBuildKnowledge(keys, encryptedKeys, publicKey);
      
      showToastNotification('知识构建成功！', 'success');
      setBuildingKnowledge(false);
      
      // 可选：构建成功后跳转到下一步或完成页面
      // router.push('/publish/complete');
    } catch (error) {
      setError('构建知识失败，请稍后重试');
      showToastNotification('构建知识失败，请稍后重试', 'danger');
      throw error;
    }
  };
  
  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">正在处理，请稍候...</p>
      </div>
    );
  }
  
  // 如果正在构建知识，显示构建状态
  if (buildingKnowledge) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="success" />
        <h4 className="mt-3">正在构建知识</h4>
        <p className="text-muted">请稍候，正在将您的知识内容打包并构建知识实体...</p>
      </div>
    );
  }
  
  return (
    <div className="publish-report">
      {/* 错误提示 */}
      {error && (
        <Alert variant="danger" className="mb-4">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}
      
      {/* 指纹状态提示 */}
      {!isFingerprinted ? (
        <Alert variant="warning" className="mb-4">
          <div className="d-flex align-items-center">
            <FaKey className="me-2" size={20} />
            <div>
              <h5 className="mb-1">知识指纹未生成</h5>
              <p className="mb-0">请先在章节内容页面生成知识指纹，然后再进行检测。</p>
            </div>
          </div>
        </Alert>
      ) : (!report || Object.keys(report).length === 0) ? (
        <Alert variant="info" className="mb-4">
          <div className="d-flex align-items-center">
            <FaSync className="me-2" size={20} />
            <div>
              <h5 className="mb-1">可以生成检测报告</h5>
              <p className="mb-0">知识指纹已同步，您现在可以生成检测报告。</p>
            </div>
          </div>
        </Alert>
      ) : null}
      
      {/* 生成报告按钮 */}
      {(!report || Object.keys(report).length === 0) && (
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Body className="text-center py-5">
            <h4 className="mb-3">尚未生成检测报告</h4>
            <p className="text-muted mb-4">生成检测报告将对您的知识内容进行相似度检测，帮助您了解内容的原创性。</p>
            <Button 
              variant="primary" 
              size="lg"
              onClick={handleGenerateReport}
              disabled={!isFingerprinted}
            >
              <FaSync className="me-2" />
              生成检测报告
            </Button>
          </Card.Body>
        </Card>
      )}
      
      {/* 检测报告显示 */}
      {report && Object.keys(report).length > 0 && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Button 
              variant="outline-primary" 
              onClick={handleGenerateReport}
              disabled={!isFingerprinted}
            >
              <FaSync className="me-2" />
              重新生成报告
            </Button>
            <Button 
              variant="success" 
              size="lg"
              onClick={handleBuildKnowledge}
              disabled={!report}
              className="d-flex align-items-center"
            >
              <FaCubes className="me-2" />
              构建知识
              <FaArrowRight className="ms-2" />
            </Button>
          </div>
          <CheckReportDisplay report={report} />
        </>
      )}
      
      {/* Toast通知 */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1060 }}>
        <Toast 
          onClose={() => setShowToast(false)} 
          show={showToast} 
          delay={3000} 
          autohide
          bg={toastVariant}
          className="text-white"
        >
          <Toast.Header closeButton={false}>
            <strong className="me-auto">
              {toastVariant === 'success' ? (
                <FaCheckCircle className="me-2" />
              ) : (
                <FaExclamationTriangle className="me-2" />
              )}
              {toastVariant === 'success' ? '操作成功' : '操作失败'}
            </strong>
          </Toast.Header>
          <Toast.Body>{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
} 