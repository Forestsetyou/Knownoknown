'use client';

import React, { useState, useEffect } from 'react';
import { Container, Tabs, Tab, Card, Button, Spinner } from 'react-bootstrap';
import { FaArrowRight, FaArrowLeft, FaRedo, FaCheckCircle, FaExclamationCircle, FaFingerprint } from 'react-icons/fa';
import { useIpfs } from '@/context/IpfsContext';
import { useModal } from '@/context/ModalContext';
import TraceCheck from '@/components/verify/TraceCheck';
import { Toast, ToastContainer } from 'react-bootstrap';
import { Checkreport } from '@/interface/knownoknownDag/knowledgeEntryDagInterface';
import CheckReportDisplay from '@/components/CheckReportDisplay';

export default function VerifyPage() {
  // 当前活动的标签页
  const [activeTab, setActiveTab] = useState('trace-check');
  const [report, setReport] = useState<Checkreport | null>(null);
  
  // IPFS服务
  const { ipfsCreateNewKnowledge, ipfsGenerateFingerprintData, ipfsGenerateCheckReport, ipfsGetCheckReport, ipfsCheckKnowledgeDataPacked } = useIpfs();
  
  // 模态框服务
  const { showConfirm, showError, showSuccess, hideModal, showLoading, showModal } = useModal();
  
  // Toast通知状态
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');
  
  // 页面加载状态
  const [pageLoading, setPageLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  
  const initializeNewKnowledge = async () => {
    setPageLoading(true);
    try {
        await ipfsCreateNewKnowledge('');
        setPageLoading(false);
    } catch (error) {
        console.error('初始化新知识失败:', error);
    }
  };
  
  // 初始化新知识
  useEffect(() => {
    initializeNewKnowledge();
  }, []);
  
  // 显示Toast通知
  const showToastNotification = (message: string, variant: string) => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };
  
  // 处理重置工作流
  const handleResetWorkflow = async () => {
    showConfirm('确定要重置当前工作流吗？这将清除所有未保存的内容。', '重置工作流', async () => {
        try {
          setResetting(true);
          await ipfsCreateNewKnowledge('');
          // await ipfsTestFucntion();
          console.log('重置工作流成功');
          setActiveTab('trace-check'); // 重置后返回第一个标签页
        } catch (error) {
          console.error('重置工作流失败:', error);
        } finally {
          setResetting(false);
          hideModal();
        }
      },
      () => {
        console.log('取消重置工作流');
        setResetting(false);
        hideModal();
      }
    )
  };

  const handleVerify = async () => {
    // 检查知识是否已打包
    const packedStatus = await ipfsCheckKnowledgeDataPacked();
    if (!packedStatus) {
      showToastNotification('请先保存知识片段后再进行溯源检测', 'danger');
      return;
    }

    try {
      // 显示加载模态框
      showLoading("正在生成指纹...", "指纹生成");
      
      // 生成指纹
      await ipfsGenerateFingerprintData();

      // 显示加载模态框
      showLoading("正在生成检测报告...", "检测报告生成");

      // 生成检测报告
      await ipfsGenerateCheckReport();
      const reportData = await ipfsGetCheckReport();
      setReport(reportData);

      showSuccess("溯源检测成功!请查看检测报告!", "溯源检测");

    } catch (error: any) {
        throw new Error('溯源检测失败', error.message);
    }
  };

  const handleViewReport = async () => {
    try {
      // 检查是否已有报告
      if (!report) {
        throw new Error('检测报告不存在');
      }
      
      // 使用模态框显示报告
      showModal({
        type: 'custom',
        title: '溯源检测报告',
        closable: true,
        customContent: (
          <div className="report-modal-content">
            <CheckReportDisplay report={report} />
          </div>
        ),
        size: 'xl',
      });
    } catch (error) {
      console.error('查看报告失败:', error);
      showError("查看报告时发生错误，请稍后重试", "查看报告失败");
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
  
  // 如果页面正在加载，显示加载状态
  if (pageLoading) {
    return (
      <Container className="py-5">
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
          <Spinner animation="border" variant="danger" className="mb-3" />
          <p className="text-muted">正在初始化验证页面...</p>
        </div>
      </Container>
    );
  }
  
  // 如果正在重置工作流，显示重置状态
  if (resetting) {
    return (
      <Container className="py-5">
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
          <Spinner animation="border" variant="warning" className="mb-3" />
          <p className="text-muted">正在重置工作流...</p>
        </div>
      </Container>
    );
  }
  
  return (
    <Container className="py-4">
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-0">
          <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
            <h4 className="mb-0 text-primary">
              <FaFingerprint className="me-2" />
              知识溯源检测
            </h4>
            <Button 
              variant="outline-secondary" 
              onClick={handleResetWorkflow}
              className="d-flex align-items-center"
              disabled={resetting}
            >
              <FaRedo className="me-2" />
              重置工作流
            </Button>
          </div>
          
          {activeTab === 'trace-check' && (
            <>
              <TraceCheck />
              <Card.Footer className="bg-white d-flex justify-content-end p-4">
                <Button 
                  variant="outline-secondary" 
                  onClick={handleViewReport}
                  className="d-flex align-items-center me-2"
                  disabled={!report}
                >
                  <FaArrowLeft className="me-2" />
                  查看报告
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleVerify}
                  className="d-flex align-items-center"
                >
                  溯源检测
                  <FaArrowRight className="ms-2" />
                </Button>
              </Card.Footer>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Toast通知 */}
      <ToastContainer position="top-end" className="p-3">
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
                <FaExclamationCircle className="me-2" />
              )}
              {toastVariant === 'success' ? '操作成功' : '操作失败'}
            </strong>
          </Toast.Header>
          <Toast.Body>{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
      
      {/* 添加自定义CSS样式 */}
      <style jsx global>{`
        /* 自定义模态框样式 */
        .modal-dialog.modal-xl {
          max-width: 90%;
          width: 90%;
          margin: 1.75rem auto;
        }
        
        .report-modal-content {
          padding: 0;
          width: 100%;
        }
        
        /* 确保报告内容能够充分利用模态框空间 */
        .report-modal-content > div {
          width: 100%;
        }
        
        /* 优化模态框内部的滚动行为 */
        .modal-body {
          max-height: 80vh;
          overflow-y: auto;
          padding: 0;
        }
        
        /* 在小屏幕上调整模态框宽度 */
        @media (max-width: 992px) {
          .modal-dialog.modal-xl {
            max-width: 95%;
            width: 95%;
            margin: 1rem auto;
          }
        }
        
        /* 优化模态框标题和底部样式 */
        .modal-header, .modal-footer {
          padding: 1rem 1.5rem;
        }
        
        .card-custom .card-header {
          border-bottom: 1px solid #f0f0f0;
        }
        
        .card-custom .card-footer {
          border-top: 1px solid #f0f0f0;
        }
        
        .btn-danger {
          background-color: #ff4c4c;
          border-color: #ff4c4c;
          transition: all 0.2s ease;
        }
        
        .btn-danger:hover:not(:disabled) {
          background-color: #e04141;
          border-color: #e04141;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(255, 76, 76, 0.2);
        }
        
        .btn-outline-secondary {
          transition: all 0.2s ease;
        }
        
        .btn-outline-secondary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </Container>
  );
} 