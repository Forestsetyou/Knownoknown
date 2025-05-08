import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Form, Spinner, Toast, ToastContainer, Row, Col, Modal } from 'react-bootstrap';
import { FaPlus, FaTrash, FaArrowUp, FaArrowDown, FaSave, FaCheckCircle, FaExclamationCircle, FaEye, FaKey } from 'react-icons/fa';
import MarkdownEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';
import ReactMarkdown from 'react-markdown';
import { useIpfs, IpfsServerStatus } from '@/context/IpfsContext';
import { useBackend } from '@/context/BackendContext';
import { useWallet } from '@/context/WalletContext';
import { processImageToJpegUint8 } from '@/interface/utils';

const currentChapterIndex = 0;

export default function TraceCheck() {
  // 状态管理
  const [currentChapter, setCurrentChapter] = useState<any | null>(null);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [tempImagePackCID, setTempImagePackCID] = useState<string>('');
  const [previewContent, setPreviewContent] = useState<string>('');
  
  // 预览相关状态
  const [showPreview, setShowPreview] = useState(false);
  // 在状态管理部分添加预览加载状态
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Toast通知状态
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');
  
  // 编辑器引用
  const editorRef = useRef<any>(null);
  
  // IPFS服务
  const { 
    ipfsStatus, 
    ipfsGetKnowledgeChapterData, 
    ipfsSetKnowledgeChapterData, 
    ipfsRmKnowledgeChapterData, 
    ipfsGetKnowledgeChapterTitles, 
    ipfsGetKnowledgeChapterDatasLength, 
    ipfsCreateNewChapterData, 
    ipfsUpKnowledgeChapterData, 
    ipfsDownKnowledgeChapterData,
    ipfsAddKnowledgeChapterData,
    ipfsGetTempImage,
    ipfsAddTempImage,
    ipfsCheckKnowledgeDataPacked,
    ipfsPackKnowledgeData,
    ipfsCheckFingerprintData,
    ipfsGenerateFingerprintData,
    ipfsGetTempImgPackCarBytes,
  } = useIpfs();
  
  const {
    backendSetTempImgPack,
    backendDelTempImgPack,
    backendGetTempImgTempLinks,
  } = useBackend();

  const { walletStatus } = useWallet();
  
  // 显示Toast通知
  const showToastNotification = (message: string, variant: string) => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };
  
  // 初始化加载
  useEffect(() => {
    const init = async () => {
      setGlobalLoading(true);
      if (ipfsStatus.status === IpfsServerStatus.ONLINE) {
        try {
          const titles = await ipfsGetKnowledgeChapterTitles();
          if (titles.length > 0) {
            const chapterData = await ipfsGetKnowledgeChapterData(currentChapterIndex);
            setCurrentChapter(chapterData);
          } else {
            throw new Error('章节数据为空');
          }
          setGlobalLoading(false);
        } catch (error) {
          console.error('获取章节标题失败:', error);
          showToastNotification('获取章节标题失败', 'danger');
        }
      } else {
        showToastNotification('IPFS服务未连接', 'danger');
        throw new Error('IPFS服务未连接');
      }
    }
    init();
  }, []);
  
  // 更新章节标题
  const handleUpdateChapterTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentChapter) return;
    
    setCurrentChapter({
      ...currentChapter,
      chapter_title: e.target.value
    });
    
    setIsModified(true);
  };
  
  // 更新章节内容
  const handleEditorChange = ({html, text}: {html: string, text: string}) => {
    if (!currentChapter) return;
    
    setCurrentChapter({
      ...currentChapter,
      ipfs_markdown_data: text
    });
    
    setIsModified(true);
  };
  
  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    console.log('handleImageUpload', file);
    try {
      const processedUint8Array = await processImageToJpegUint8(file);
      const customLink = await ipfsAddTempImage(processedUint8Array, file.type);
      console.log('Temp image custom link:', customLink);
      return customLink;
    } catch (error) {
      console.error('Error processing image:', error);
      return null;
    }
  };
  
  // 保存当前章节
  const handleSaveChapter = async () => {
    if (!currentChapter) {
      throw new Error('当前章节为空');
    }
    if (!isModified) {
      showToastNotification('当前章节没有修改', 'danger');
      return;
    }
    
    if (ipfsStatus.status !== IpfsServerStatus.ONLINE) {
      showToastNotification('IPFS服务未在线', 'danger');
      throw new Error('IPFS服务未在线');
    }
    
    try {
      setActionLoading(true);
      
      // 处理章节中的临时图片
      let ipfs_markdown_data = currentChapter.ipfs_markdown_data;
      const chater_data = {
        id: currentChapter.id,
        chapter_title: currentChapter.chapter_title,
        ipfs_markdown_data: ipfs_markdown_data,
      }
      await ipfsSetKnowledgeChapterData(currentChapterIndex, chater_data);
      const new_chapter_data = await ipfsGetKnowledgeChapterData(currentChapterIndex);
      setCurrentChapter(new_chapter_data);

      // 打包知识
      await ipfsPackKnowledgeData();
      showToastNotification('知识片段保存成功', 'success');
      // showToastNotification('知识打包成功', 'success');

      setIsModified(false);
      setActionLoading(false);
    } catch (error) {
      console.error('保存章节失败:', error);
      showToastNotification('保存章节失败', 'danger');
    }
  };
  
  // 启动预览
  const startPreview = async () => {
    if (!currentChapter) {
      showToastNotification('当前章节为空', 'danger');
      return;
    }
    if (isModified) {
      showToastNotification('当前章节有未保存的修改，请先保存', 'danger');
      return;
    }
    setPreviewLoading(true);
    setShowPreview(!showPreview);
    await getPreviewContent();
    setPreviewLoading(false);
  };

  // 停止预览
  const stopPreview = async () => {
    setPreviewLoading(true);
    console.log('stopPreview', tempImagePackCID);
    if (tempImagePackCID) {
      const {success} = await backendDelTempImgPack(tempImagePackCID);
      if (success) {
        setTempImagePackCID('');
        showToastNotification('临时图片清理成功', 'success');
      } else {
        throw new Error('临时图片清理失败');
      }
    }
    setPreviewLoading(false);
    setShowPreview(false);
  };

  const getPreviewContent = async () => { // 生成解析自定义的图片外链并生成临时图片链接
    let preview_content = currentChapter.ipfs_markdown_data;

    if (currentChapter.images.length === 0) {
      setPreviewContent(preview_content);
      return;
    } else {
      const walletAddress = walletStatus.address;
      const tempImgPackCarBytes = await ipfsGetTempImgPackCarBytes(currentChapterIndex, 'TraceCheck');
      const {success, cid} = await backendSetTempImgPack(tempImgPackCarBytes);
      if (!success) {
        showToastNotification('临时图片打包失败', 'danger');
        return;
      }
      setTempImagePackCID(cid);
      const tempImgTempLinks = await backendGetTempImgTempLinks(currentChapter.images);
      for (const image_link in tempImgTempLinks) {
        preview_content = preview_content.replace(image_link, tempImgTempLinks[image_link]);
      }
      setPreviewContent(preview_content);
    }
  };
  
  return (
    <div className="publish-chapters">
      {/* 仅在初始加载时显示全页加载状态 */}
      {globalLoading && (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">加载中...</p>
        </div>
      )}
      
      {/* 主要内容 */}
      {!globalLoading && (
        <Row>
          {/* 编辑区域 - 使用完整宽度 */}
          <Col xs={12}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <div className="editor-container">
                  <Form.Group className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <Form.Label className="fw-bold mb-0">知识片段内容</Form.Label>
                      <div>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={startPreview}
                          disabled={globalLoading || actionLoading || !currentChapter}
                          className="preview-button"
                        >
                          <FaEye className="me-1" /> 预览
                        </Button>
                      </div>
                    </div>
                    
                    {globalLoading ? (
                      <div className="editor-placeholder d-flex flex-column align-items-center justify-content-center">
                        <Spinner animation="border" variant="secondary" className="mb-3" />
                        <p className="text-muted">正在加载编辑器...</p>
                      </div>
                    ) : (
                      <div className="markdown-editor-wrapper">
                        <MarkdownEditor
                          ref={editorRef}
                          value={currentChapter?.ipfs_markdown_data || ''}
                          style={{ height: '500px', maxHeight: '70vh' }}
                          onChange={handleEditorChange}
                          renderHTML={text => text}
                          placeholder="在此输入Markdown格式的知识片段内容..."
                          config={{
                            view: {
                              menu: true,
                              md: true,
                              html: false,
                            },
                            canView: {
                              menu: true,
                              md: true,
                              html: false,
                              fullScreen: true,
                              hideMenu: true,
                            },
                            table: {
                              maxRow: 5,
                              maxCol: 6,
                            },
                            syncScrollMode: ['rightFollowLeft'],
                          }}
                          onImageUpload={handleImageUpload}
                          className={`custom-editor ${actionLoading ? 'editor-disabled' : ''}`}
                        />
                      </div>
                    )}
                  </Form.Group>
                  
                  <div className="d-flex justify-content-end mt-4">
                    <Button
                      variant="primary"
                      onClick={handleSaveChapter}
                      disabled={globalLoading || actionLoading || !isModified}
                      className="save-button d-flex align-items-center"
                    >
                      {actionLoading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          保存中...
                        </>
                      ) : (
                        <>
                          <FaSave className="me-2" />
                          保存知识片段
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      
      {/* 预览模态框 */}
      <Modal
        show={showPreview}
        onHide={stopPreview}
        size="xl"
        dialogClassName="preview-modal"
        centered
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>知识片段预览</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {previewLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">正在处理预览内容...</p>
            </div>
          ) : (
            <div className="markdown-preview p-3">
              <ReactMarkdown
              components={{
                img: ({ src, alt, ...props }) => (
                  <img src={src} alt={alt} {...props} />
                ),
              }}>{previewContent || currentChapter?.ipfs_markdown_data || ''}</ReactMarkdown>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            关闭
          </Button>
        </Modal.Footer>
      </Modal>
      
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
      
      {/* 添加自定义CSS */}
      <style jsx>{`
        .editor-container {
          background-color: #fff;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 0;
        }
        
        .markdown-editor-wrapper {
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e0e0e0;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        
        .markdown-editor-wrapper:focus-within {
          border-color: #0d6efd;
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
        }
        
        .custom-editor {
          font-family: 'Roboto Mono', monospace;
        }
        
        .custom-editor .rc-md-navigation {
          background-color: #f8f9fa;
          border-bottom: 1px solid #e0e0e0;
          padding: 0.5rem;
        }
        
        .custom-editor .rc-md-editor {
          border: none !important;
        }
        
        .custom-editor .rc-md-editor .section-container {
          padding: 0.5rem;
        }
        
        .editor-disabled {
          opacity: 0.7;
          pointer-events: none;
        }
        
        .editor-placeholder {
          height: 500px;
          border: 1px dashed #dee2e6;
          border-radius: 8px;
          background-color: #f8f9fa;
        }
        
        .preview-button {
          font-size: 0.85rem;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .preview-button:hover:not(:disabled) {
          background-color: #f8f9fa;
          color: #0d6efd;
          transform: translateY(-1px);
        }
        
        .save-button {
          padding: 0.5rem 1.25rem;
          font-weight: 500;
          transition: all 0.2s ease;
          border-radius: 6px;
        }
        
        .save-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(13, 110, 253, 0.2);
        }
        
        /* 自定义编辑器内部样式 */
        :global(.rc-md-editor .editor-container .sec-md .input) {
          font-size: 15px !important;
          line-height: 1.6 !important;
          padding: 16px !important;
          color: #333 !important;
        }
        
        :global(.rc-md-editor .editor-container .sec-md) {
          background-color: #fff !important;
        }
        
        :global(.rc-md-editor .rc-md-navigation .button-wrap .button) {
          color: #555 !important;
        }
        
        :global(.rc-md-editor .rc-md-navigation .button-wrap .button:hover) {
          color: #0d6efd !important;
        }
        
        :global(.rc-md-editor .editor-container .sec-md .input::placeholder) {
          color: #adb5bd !important;
          font-style: italic;
        }
        
        /* 预览模态框样式 */
        :global(.preview-modal .modal-content) {
          border: none;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        :global(.preview-modal .modal-header) {
          border-bottom: 1px solid #f0f0f0;
        }
        
        :global(.preview-modal .modal-footer) {
          border-top: 1px solid #f0f0f0;
        }
        
        .markdown-preview {
          font-size: 16px;
          line-height: 1.7;
        }
        
        .markdown-preview img {
          max-width: 100%;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        
        .markdown-preview h1, 
        .markdown-preview h2, 
        .markdown-preview h3 {
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          color: #333;
        }
        
        .markdown-preview pre {
          background-color: #f8f9fa;
          border-radius: 6px;
          padding: 1rem;
        }
      `}</style>
    </div>
  );
}