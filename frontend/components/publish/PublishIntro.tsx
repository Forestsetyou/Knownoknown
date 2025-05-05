'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Form, Row, Col, Button, Card, Toast, ToastContainer, Spinner } from 'react-bootstrap';
import { FaSave, FaCheckCircle, FaExclamationCircle, FaUpload, FaImage } from 'react-icons/fa';
import { useIpfs, IpfsServerStatus } from '@/context/IpfsContext';
import MarkdownEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';
import ReactMarkdown from 'react-markdown';
import { processImageToJpegUint8 } from '@/interface/utils';
import { Image_Link_Format_Regex } from '@/interface/knownoknownDag/knowledgeEntryDagInterface';
import { CID } from 'multiformats/cid';
import { Badge } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';

interface IntroStatus {
  content: string;
  image: {
    cid: CID | null;
    url: string;
  };
  tags: Array<any>;
}

export default function PublishIntro() {
  // IPFS服务
  const { 
    ipfsStatus, 
    ipfsGetKnowledgeMetadata,
    ipfsSetKnowledgeMetadata,
    ipfsAddTempImage,
    ipfsGetTempImage
  } = useIpfs();
  
  // 状态管理
  const [introData, setIntroData] = useState<IntroStatus>({
    content: '',
    image: {
      cid: null,
      url: ''
    },
    tags: [] as Array<any>
  });
  
  const [newTag, setNewTag] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tempImageUrls, setTempImageUrls] = useState<string[]>([]);
  
  // 编辑器引用
  const editorRef = useRef<any>(null);
  
  // Toast通知状态
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');
  
  // 分类选项
  // const categoryOptions = [
  //   '技术教程', '学术研究', '艺术创作', '生活技能',
  //   '职业发展', '健康养生', '心理成长', '其他'
  // ];
  
  // 初始化加载
  useEffect(() => {
    const fetchIntroData = async () => {
      if (ipfsStatus.status === IpfsServerStatus.ONLINE) {
        try {
          setLoading(true);
          const metadata = await ipfsGetKnowledgeMetadata();
          if (metadata) {
            if (metadata.intro.image) {
              const image_data = await ipfsGetTempImage(metadata.intro.image.toString());
              if (image_data) {
                const tmp_image_url = URL.createObjectURL(new Blob([image_data]));
                setTempImageUrls(prev => [...prev, tmp_image_url]);
                setIntroData({
                  content: metadata.intro.content,
                  image: {
                    cid: metadata.intro.image,
                    url: tmp_image_url
                  },
                  tags: metadata.tags
                });
              } else {
                showToastNotification('获取简介封面图片失败', 'danger');
                throw new Error('获取简介封面图片失败');
              }
            } else {
              setIntroData({
                content: metadata.intro.content,
                image: {
                  cid: null,
                  url: ''
                },
                tags: metadata.tags
              });
            }
          }
          setLoading(false);
          setIsModified(false);
        } catch (error) {
          console.error('获取简介数据失败:', error);
          showToastNotification('获取简介数据失败', 'danger');
          setLoading(false);
        }
      }
    };
    
    fetchIntroData();
  }, []);
  
  // 清理临时图片URL
  useEffect(() => {
    return () => {
      tempImageUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [tempImageUrls]);
  
  // 显示Toast通知
  const showToastNotification = (message: string, variant: string) => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };
  
  // 处理摘要内容变化
  const handleSummaryChange = ({html, text}: {html: string, text: string}) => {
    setIntroData(prev => ({
      ...prev,
      content: text
    }));
    setIsModified(true);
  };
  
  // 处理分类变化
  // const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   setIntroData(prev => ({
  //     ...prev,
  //     category: e.target.value
  //   }));
  //   setIsModified(true);
  // };
  
  // 处理标签输入变化
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTag(e.target.value);
  };
  
  // 添加标签
  const handleAddTag = () => {
    if (newTag.trim() && !introData.tags.includes(newTag.trim())) {
      setIntroData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
      setIsModified(true);
    }
  };
  
  // 删除标签
  const handleRemoveTag = (tagToRemove: string) => {
    setIntroData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
    setIsModified(true);
  };
  
  // 处理封面图片上传
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // 显示上传中状态
      setLoading(true);
      const image_data = await processImageToJpegUint8(file);
      // 上传图片到IPFS
      const custom_link = await ipfsAddTempImage(image_data, file.type);
      const tmp_image_cid = custom_link.split(':')[1].split('>')[0];
      if (tmp_image_cid) {
        const image_cid = CID.parse(tmp_image_cid);
        const temp_image_url = URL.createObjectURL(new Blob([image_data]));
        // 保存临时URL以便清理
        setTempImageUrls(prev => [...prev, temp_image_url]);
        // 更新封面图片URL
        setIntroData(prev => ({
          ...prev,
          image: {
            cid: image_cid,
            url: temp_image_url
          }
        }));
      
        setIsModified(true);
        setLoading(false);
      } else {
        throw new Error('上传封面图片失败');
      }
    } catch (error) {
      console.error('上传封面图片失败:', error);
      showToastNotification('上传封面图片失败', 'danger');
    }
  };
  
  // 处理图片上传（Markdown编辑器）
  // const handleImageUpload = async (file: File) => {
  //   try {
  //     // 创建临时URL
  //     const tempUrl = URL.createObjectURL(file);
      
  //     // 保存到状态中，以便后续清理
  //     setTempImageUrls(prev => [...prev, tempUrl]);
      
  //     // 上传图片到IPFS
  //     const imageUrl = await ipfsAddTempImage(file);
      
  //     // 返回临时URL供编辑器使用
  //     return imageUrl;
  //   } catch (error) {
  //     console.error('图片处理失败:', error);
  //     return null;
  //   }
  // };
  
  // 保存简介数据
  const handleSaveIntro = async () => {
    if (!introData.image.cid) {
      showToastNotification('请先上传封面图片', 'danger');
      return;
    }
      
    try {
      setLoading(true);
      const new_metadata = {
        tags: introData.tags,
        intro: {
          content: introData.content,
          image: introData.image.cid
        }
      }
      await ipfsSetKnowledgeMetadata(new_metadata);
      showToastNotification('简介保存成功', 'success');
      setIsModified(false);
    } catch (error) {
      console.error('保存简介失败:', error);
      showToastNotification('保存简介失败', 'danger');
    } finally {
      setLoading(false);
    }
  };
  
  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5">
        <Spinner animation="border" variant="danger" className="mb-3" />
        <p className="text-muted">正在加载知识简介数据...</p>
      </div>
    );
  }
  
  return (
    <div>
      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h5 className="mb-0">知识摘要</h5>
            </Card.Header>
            <Card.Body>
              <MarkdownEditor
                ref={editorRef}
                value={introData.content}
                style={{ height: '300px' }}
                onChange={handleSummaryChange}
                renderHTML={(text) => <ReactMarkdown>{text}</ReactMarkdown>}
              />
              <Form.Text className="text-muted mt-2">
                使用Markdown格式编写知识摘要，简要介绍知识内容和特点
              </Form.Text>
            </Card.Body>
          </Card>
          
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h5 className="mb-0">标签</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>知识标签</Form.Label>
                <div className="d-flex mb-2">
                  <Form.Control
                    type="text"
                    placeholder="添加标签"
                    value={newTag}
                    onChange={handleTagInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button 
                    variant="outline-primary" 
                    className="ms-2"
                    onClick={handleAddTag}
                  >
                    添加
                  </Button>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {introData.tags.map(tag => (
                    <Badge 
                      key={tag} 
                      bg="primary" 
                      className="d-flex align-items-center p-2"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} <FaTimes className="ms-1" size={10} />
                    </Badge>
                  ))}
                </div>
                <Form.Text className="text-muted mt-2">
                  添加相关标签，帮助用户更好地找到您的知识（点击标签可删除）
                </Form.Text>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h5 className="mb-0">封面图片</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center mb-3">
                {introData.image.cid ? (
                  <img 
                    src={introData.image.url} 
                    alt="封面图片" 
                    className="img-fluid rounded" 
                    style={{ maxHeight: '200px', objectFit: 'cover' }}
                  />
                ) : (
                  <div 
                    className="d-flex flex-column align-items-center justify-content-center bg-light rounded p-4"
                    style={{ height: '200px' }}
                  >
                    <FaImage size={40} className="text-muted mb-2" />
                    <p className="text-muted">暂无封面图片</p>
                  </div>
                )}
              </div>
              
              <Form.Group controlId="coverImageUpload">
                <Form.Label>上传封面图片</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageUpload}
                />
                <Form.Text className="text-muted">
                  推荐尺寸: 1200 x 630 像素，最大文件大小: 2MB
                </Form.Text>
              </Form.Group>
            </Card.Body>
          </Card>
          
          <div className="d-grid mt-4">
            <Button 
              variant="danger" 
              size="lg"
              onClick={handleSaveIntro}
              disabled={!isModified || loading}
            >
              <FaSave className="me-2" />
              保存简介
            </Button>
          </div>
        </Col>
      </Row>
      
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
    </div>
  );
} 