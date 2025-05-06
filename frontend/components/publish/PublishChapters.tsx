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
import { Image_Link_Format_Regex } from '@/interface/knownoknownDag/knowledgeEntryDagInterface';
import { checkImageWithTimeout, uint8ArrayToDataURL } from '@/interface/utils';

export default function PublishChapters() {
  // 状态管理
  const [chapterTitles, setChapterTitles] = useState<Array<any>>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [currentChapter, setCurrentChapter] = useState<any | null>(null);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [tempImagePackCID, setTempImagePackCID] = useState<string>('');
  const [previewContent, setPreviewContent] = useState<string>('');
  
  // 预览相关状态
  const [showPreview, setShowPreview] = useState(false);
  
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

  // 在状态管理部分添加预览加载状态
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // 在状态管理部分添加isPacked状态
  const [isPacked, setIsPacked] = useState(false);
  
  // 在状态管理部分添加指纹状态
  const [isFingerprinted, setIsFingerprinted] = useState(false);
  
  // 显示Toast通知
  const showToastNotification = (message: string, variant: string) => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };
  
  // 加载章节标题列表
  const fetchChapterTitles = async () => {
    if (ipfsStatus.status === IpfsServerStatus.ONLINE) {
      try {
        const titles = await ipfsGetKnowledgeChapterTitles();
        setChapterTitles(titles);
        return titles;
      } catch (error) {
        console.error('获取章节标题失败:', error);
        showToastNotification('获取章节标题失败', 'danger');
      }
    } else {
      showToastNotification('IPFS服务未连接', 'danger');
      throw new Error('IPFS服务未连接');
    }
  };
  
  // 加载指定章节的内容
  const loadChapterContent = async (chapterOrder: number) => {
    if (ipfsStatus.status === IpfsServerStatus.ONLINE) {
      const chapterData = await ipfsGetKnowledgeChapterData(chapterOrder);
      setCurrentChapter(chapterData);
      setIsModified(false);
    } else {
      showToastNotification('IPFS服务未连接', 'danger');
      throw new Error('IPFS服务未连接');
    }
  };
  
  // 初始化加载
  useEffect(() => {
    const init = async () => {
      setGlobalLoading(true);
      if (ipfsStatus.status === IpfsServerStatus.ONLINE) {
        try {
          const titles = await ipfsGetKnowledgeChapterTitles();
          setChapterTitles(titles);
          if (titles.length > 0) {
            setCurrentChapterIndex(titles.length - 1);
            const chapterData = await ipfsGetKnowledgeChapterData(titles.length - 1);
            setCurrentChapter(chapterData);
          } else {
            setCurrentChapter(null);
          }
          
          // 检查知识是否已打包
          const packedStatus = await ipfsCheckKnowledgeDataPacked();
          setIsPacked(packedStatus);
          
          // 检查指纹是否已生成
          const fingerprintStatus = await ipfsCheckFingerprintData();
          setIsFingerprinted(fingerprintStatus);
          
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
  
  // 清理临时图片URL
  // useEffect(() => {
  //   return () => {
  //     tempImagePackCID.forEach(url => URL.revokeObjectURL(url));
  //   };
  // }, [tempImagePackCID]);
  
  // 添加新章节
  const handleAddChapter = async () => {
    try {
      setActionLoading(true);
      await ipfsCreateNewChapterData();
      await fetchChapterTitles();
      setIsPacked(false);
      setActionLoading(false);
      // 新章节会被添加到末尾，所以设置当前索引为最后一个
      // setCurrentChapterIndex(chapterTitles.length);
      // showToastNotification('添加章节成功', 'success');
    } catch (error) {
      console.error('添加章节失败:', error);
      showToastNotification('添加章节失败', 'danger');
    }
  };
  
  // 选择章节
  const handleSelectChapter = async (index: number) => {
    if (isModified) {
      // 提示用户保存当前修改
      if (window.confirm('当前章节有未保存的修改，是否保存？')) {
        await handleSaveChapter();
      }
    }
    try {
      setActionLoading(true);
      setCurrentChapterIndex(index);
      await loadChapterContent(index);
      setActionLoading(false);
    } catch (error) {
      console.error('获取章节内容失败:', error);
      showToastNotification('获取章节内容失败', 'danger');
    }
  };
  
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
  
  // 删除章节
  const handleDeleteChapter = async (chapterOrder: number) => {
    try {
      setActionLoading(true);
      await ipfsRmKnowledgeChapterData(chapterOrder);
      
      // 重新获取章节标题列表
      const titles = await fetchChapterTitles();
      setIsPacked(false);
      if (chapterOrder === 0) {
        setCurrentChapterIndex(0);
      } else {
        setCurrentChapterIndex(chapterOrder - 1);
      }
      if (titles && titles.length !== 0) {
        await loadChapterContent(currentChapterIndex);
      } else {
        setCurrentChapter(null);
      }
      setActionLoading(false);
      // showToastNotification('删除章节成功', 'success');
    } catch (error) {
      console.error('删除章节失败:', error);
      showToastNotification('删除章节失败', 'danger');
    }
  };
  
  // 移动章节顺序（上移）
  const handleMoveChapterUp = async (chapterOrder: number) => {
    try {
      setActionLoading(true);
      await ipfsUpKnowledgeChapterData(chapterOrder);
      
      // 更新当前索引
      const newIndex = currentChapterIndex - 1;
      setCurrentChapterIndex(newIndex);
      
      // 重新获取章节标题列表
      await fetchChapterTitles();
      setIsPacked(false);
      setActionLoading(false);
      // showToastNotification('上移章节成功', 'success');
    } catch (error) {
      console.error('上移章节失败:', error);
      showToastNotification('上移章节失败', 'danger');
    }
  };
  
  // 移动章节顺序（下移）
  const handleMoveChapterDown = async (chapterOrder: number) => {
    try {
      setActionLoading(true);
      await ipfsDownKnowledgeChapterData(chapterOrder);
      
      // 更新当前索引
      const newIndex = currentChapterIndex + 1;
      setCurrentChapterIndex(newIndex);
      
      // 重新获取章节标题列表
      await fetchChapterTitles();
      setIsPacked(false);
      // showToastNotification('下移章节成功', 'success');
      setActionLoading(false);
    } catch (error) {
      console.error('下移章节失败:', error);
      showToastNotification('下移章节失败', 'danger');
    }
  };
  
  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    try {
      // console.log('Original file:', {
      //   name: file.name,
      //   type: file.type,
      //   size: (file.size / 1024 / 1024).toFixed(2) + 'MB'
      // });
      const processedUint8Array = await processImageToJpegUint8(file);
      // console.log('Processed image Uint8Array:', processedUint8Array);
      // console.log('Processed size:', (processedUint8Array.length / 1024 / 1024).toFixed(2) + 'MB');
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
    if (!currentChapter || !isModified) return;
    
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
      
      // 重新获取章节标题列表
      await fetchChapterTitles();

      setIsModified(false);
      
      // 保存章节后设置isPacked为false
      setIsPacked(false);
      
      showToastNotification('保存成功', 'success');
      setActionLoading(false);
    } catch (error) {
      console.error('保存章节失败:', error);
      showToastNotification('保存章节失败', 'danger');
    }
  };
  
  // 切换预览
  const togglePreview = async () => {
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
    if (!showPreview) {
      await getPreviewContent();
      setPreviewLoading(false);
    } else {
      if (tempImagePackCID) {
        await backendDelTempImgPack(tempImagePackCID);
      }
      setPreviewContent('');
      setPreviewLoading(false);
    }
  };

  const getPreviewContent = async () => { // 生成解析自定义的图片外链并生成临时图片链接
    let preview_content = currentChapter.ipfs_markdown_data;

    if (currentChapter.images.length === 0) {
      setPreviewContent(preview_content);
      return;
    } else {
      const walletAddress = walletStatus.address;
      const tempImgPackCarBytes = await ipfsGetTempImgPackCarBytes(currentChapterIndex, walletAddress);
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
  
  // 打包知识函数
  const handlePackKnowledge = async () => {
    try {
      setActionLoading(true);
      
      // 如果有未保存的修改，先提示保存
      if (isModified) {
        if (window.confirm('有未保存的修改，是否先保存当前章节？')) {
          await handleSaveChapter();
        }
      }
      
      // 打包知识
      await ipfsPackKnowledgeData();
      
      // 更新打包状态
      setIsPacked(true);
      // 打包后指纹需要重新生成
      setIsFingerprinted(false);
      
      setActionLoading(false);
      showToastNotification('知识打包成功', 'success');
    } catch (error) {
      console.error('知识打包失败:', error);
      showToastNotification('知识打包失败', 'danger');
    }
  };
  
  // 添加生成指纹函数
  const handleGenerateFingerprint = async () => {
    try {
      setActionLoading(true);
      
      // 生成指纹
      await ipfsGenerateFingerprintData();
      
      // 更新指纹状态
      setIsFingerprinted(true);
      
      setActionLoading(false);
      showToastNotification('指纹生成成功', 'success');
    } catch (error) {
      console.error('指纹生成失败:', error);
      showToastNotification('指纹生成失败', 'danger');
      setActionLoading(false);
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
        <Row className="g-3">
          {/* 左侧章节列表 */}
          <Col md={4} lg={3} className="d-flex flex-column" style={{ height: '100%' }}>
            <Card className="mb-3 flex-grow-1">
              <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                <h5 className="mb-0">章节列表</h5>
                <div className="d-flex">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="p-1 me-1"
                    style={{ width: '30px', height: '30px' }}
                    onClick={() => currentChapter && handleMoveChapterUp(currentChapterIndex)}
                    disabled={actionLoading || !currentChapter || currentChapterIndex === 0}
                    title="上移章节"
                  >
                    <FaArrowUp />
                  </Button>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="p-1 me-1"
                    style={{ width: '30px', height: '30px' }}
                    onClick={() => currentChapter && handleMoveChapterDown(currentChapterIndex)}
                    disabled={actionLoading || !currentChapter || currentChapterIndex === chapterTitles.length - 1}
                    title="下移章节"
                  >
                    <FaArrowDown />
                  </Button>
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    className="p-1 me-1"
                    style={{ width: '30px', height: '30px' }}
                    onClick={() => currentChapter && handleDeleteChapter(currentChapterIndex)}
                    disabled={actionLoading || !currentChapter}
                    title="删除章节"
                  >
                    <FaTrash />
                  </Button>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    className="p-1"
                    style={{ width: '30px', height: '30px' }}
                    onClick={handleAddChapter}
                    disabled={actionLoading}
                    title="添加章节"
                  >
                    <FaPlus />
                  </Button>
                </div>
              </Card.Header>
              <div className="chapters-list-container flex-grow-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                {chapterTitles.length === 0 ? (
                  <Card.Body className="text-center py-5">
                    <p className="text-muted mb-3">暂无章节数据</p>
                    <Button 
                      variant="primary" 
                      onClick={handleAddChapter}
                      disabled={actionLoading}
                    >
                      <FaPlus className="me-1" /> 添加第一个章节
                    </Button>
                  </Card.Body>
                ) : (
                  chapterTitles.map((chapter, index) => (
                    <Card 
                      key={index}
                      className={`chapter-card shadow-sm m-2 ${currentChapterIndex === index ? 'border-primary bg-light' : 'border'} ${actionLoading ? 'opacity-50' : ''}`}
                      onClick={actionLoading ? undefined : () => handleSelectChapter(index)}
                      style={{ cursor: actionLoading ? 'not-allowed' : 'pointer' }}
                    >
                      <Card.Body className="p-3">
                        <div className="d-flex align-items-center">
                          <div 
                            className={`rounded-circle d-flex align-items-center justify-content-center me-2 ${currentChapterIndex === index ? 'bg-primary text-white' : 'bg-secondary text-white'}`}
                            style={{ width: '28px', height: '28px', fontSize: '14px', flexShrink: 0 }}
                          >
                            {index + 1}
                          </div>
                          <div className="text-truncate">
                            {chapter || ''}
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))
                )}
              </div>
              <Card.Footer className="bg-light">
                <div className="d-flex flex-column gap-2">
                  <Button
                    variant={isPacked ? "success" : "primary"}
                    className="w-100"
                    onClick={handlePackKnowledge}
                    disabled={actionLoading || isPacked || chapterTitles.length === 0}
                  >
                    {actionLoading && !isFingerprinted ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        处理中...
                      </>
                    ) : isPacked ? (
                      <>
                        <FaCheckCircle className="me-2" />
                        已打包
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" />
                        打包知识
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant={isFingerprinted ? "success" : "outline-primary"}
                    className="w-100"
                    onClick={handleGenerateFingerprint}
                    disabled={actionLoading || !isPacked || isFingerprinted}
                  >
                    {actionLoading && isPacked ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        处理中...
                      </>
                    ) : isFingerprinted ? (
                      <>
                        <FaCheckCircle className="me-2" />
                        指纹已同步
                      </>
                    ) : (
                      <>
                        <FaKey className="me-2" />
                        提取指纹
                      </>
                    )}
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          </Col>
          
          {/* 右侧编辑区域 */}
          <Col md={8} lg={9}>
            {currentChapter ? (
              <Card>
                <Card.Header className="bg-light">
                  <Form.Control
                    type="text"
                    placeholder="章节标题"
                    value={currentChapter.chapter_title}
                    onChange={handleUpdateChapterTitle}
                    disabled={actionLoading}
                  />
                </Card.Header>
                <Card.Body>
                  <MarkdownEditor
                    ref={editorRef}
                    value={currentChapter.ipfs_markdown_data}
                    style={{ height: '500px' }}
                    onChange={handleEditorChange}
                    renderHTML={(text) => <ReactMarkdown>{text}</ReactMarkdown>}
                    onImageUpload={handleImageUpload}
                    readOnly={actionLoading}
                    view={{ menu: !actionLoading, md: !actionLoading, html: true }}
                  />
                </Card.Body>
                <Card.Footer className="bg-light">
                  <div className="d-flex">
                    <Button 
                      variant="outline-primary"
                      className="flex-grow-1 me-2"
                      onClick={togglePreview}
                      disabled={!currentChapter || previewLoading || actionLoading}
                    >
                      {previewLoading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-1"
                          />
                          加载中...
                        </>
                      ) : (
                        <>
                          <FaEye className="me-1" /> 预览
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="danger"
                      className="flex-grow-1"
                      onClick={handleSaveChapter}
                      disabled={!isModified || actionLoading}
                    >
                      {actionLoading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-1"
                          />
                          处理中...
                        </>
                      ) : (
                        <>
                          <FaSave className="me-1" /> 保存
                        </>
                      )}
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            ) : (
              <Card className="text-center p-5">
                <Card.Body>
                  <p className="text-muted mb-3">请选择一个章节进行编辑，或添加新章节</p>
                  <Button 
                    variant="primary" 
                    onClick={handleAddChapter}
                    disabled={actionLoading}
                  >
                    <FaPlus className="me-1" /> 添加新章节
                  </Button>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      )}
      
      {/* 预览模态框 */}
      <Modal
        show={showPreview}
        onHide={() => setShowPreview(false)}
        size="xl"
        dialogClassName="preview-modal"
        centered
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>{currentChapter?.chapter_title || '章节预览'}</Modal.Title>
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
        .chapter-card {
          transition: all 0.2s ease;
        }
        .chapter-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
        }
        .chapter-card.border-primary {
          box-shadow: 0 0 0 2px #0d6efd !important;
        }
        .chapters-list-container {
          scrollbar-width: thin;
        }
        .chapters-list-container::-webkit-scrollbar {
          width: 6px;
        }
        .chapters-list-container::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.2);
          border-radius: 3px;
        }
        .markdown-preview {
          font-size: 16px;
          line-height: 1.6;
          width: 100%;
          max-width: 100%;
        }
        .markdown-preview img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1rem auto;
          border-radius: 4px;
        }
        .markdown-preview h1, 
        .markdown-preview h2, 
        .markdown-preview h3, 
        .markdown-preview h4, 
        .markdown-preview h5, 
        .markdown-preview h6 {
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }
        .markdown-preview p {
          margin-bottom: 1rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: normal;
        }
        .markdown-preview code {
          background-color: #f8f9fa;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-size: 0.9em;
          word-wrap: break-word;
          white-space: pre-wrap;
        }
        .markdown-preview pre {
          background-color: #f8f9fa;
          padding: 1rem;
          border-radius: 4px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .markdown-preview pre code {
          white-space: pre-wrap;
        }
        .markdown-preview blockquote {
          border-left: 4px solid #e9ecef;
          padding-left: 1rem;
          color: #6c757d;
        }
        .markdown-preview table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
          table-layout: fixed;
        }
        .markdown-preview th, 
        .markdown-preview td {
          border: 1px solid #dee2e6;
          padding: 0.5rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .markdown-preview th {
          background-color: #f8f9fa;
        }
        .preview-modal {
          max-width: 90%;
        }
        .preview-modal .modal-body {
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
      `}</style>
    </div>
  );
}