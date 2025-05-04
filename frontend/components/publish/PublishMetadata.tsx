'use client';

import React, { useState, useContext, useEffect } from 'react';
import { Form, Row, Col, Button, Toast, ToastContainer, Spinner } from 'react-bootstrap';
import { FaSave, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { IpfsServiceContext } from '@/service/ipfsService';

export default function PublishMetadata() {
  // IPFS服务
  const ipfsService = useContext(IpfsServiceContext);
  
  // 基本信息表单状态
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    price: 0,
    sale_volume: 0,
    isFree: false
  });
  
  // 表单验证状态
  const [validated, setValidated] = useState(false);
  
  // 保存状态
  const [saveStatus, setSaveStatus] = useState({
    saving: false,
    saved: false,
    error: false,
    message: ''
  });
  
  // 内容修改状态
  const [isModified, setIsModified] = useState(false);
  
  // 加载状态
  const [loading, setLoading] = useState(true);
  
  // Toast通知状态
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  // 组件加载时获取元数据
  useEffect(() => {
    const fetchMetadata = async () => {
      if (ipfsService) {
        try {
          setLoading(true);
          const metadata:any = await ipfsService.getKnowledgeMetadata();
          console.log('获取到元数据:', metadata);
          
          if (metadata) {
            // 更新基本信息状态
            setBasicInfo(prev => ({
              ...prev,
              title: metadata?.title || '',
              price: metadata?.price || 0,
              sale_volume: metadata?.sale_volume || 0,
              // 如果价格为0，则认为是免费知识
              isFree: metadata?.price === 0
            }));
          }
        } catch (error) {
          console.error('获取元数据失败:', error);
          showToastNotification('获取元数据失败，将使用默认值', 'danger');
        } finally {
          setLoading(false);
          // 初始加载不算修改
          setIsModified(false);
        }
      } else {
        throw new Error('IPFS服务未初始化');
      }
    };
    fetchMetadata();
  }, []);
  
  // 处理基本信息表单变化
  const handleBasicInfoChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      // 处理复选框
      setBasicInfo(prev => ({
        ...prev,
        [name]: checked,
        // 如果勾选了免费，则价格和容量设为0
        ...(name === 'isFree' && checked ? { price: 0, sale_volume: 0 } : {})
      }));
    } else {
      // 处理其他输入
      setBasicInfo(prev => ({
        ...prev,
        [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value
      }));
    }
    
    // 标记内容已修改
    setIsModified(true);
    
    // 如果之前保存过，则重置保存状态
    if (saveStatus.saved || saveStatus.error) {
      setSaveStatus({
        saving: false,
        saved: false,
        error: false,
        message: ''
      });
    }
  };
  
  // 显示Toast通知
  const showToastNotification = (message: string, variant: 'success' | 'danger' | 'info') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };
  
  // 保存元数据到IPFS
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.currentTarget as HTMLFormElement;
    
    // 表单验证
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    // 设置保存中状态
    setSaveStatus({
      saving: true,
      saved: false,
      error: false,
      message: '正在保存...'
    });
    
    try {
      // 这里添加保存元数据的逻辑
      if (ipfsService) {
        const metadata = {
          title: basicInfo.title,
          price: basicInfo.price,
          sale_volume: basicInfo.sale_volume,
        }
        console.log('保存元数据:', metadata);
        
        await ipfsService.setKnowledgeMetadata(metadata);
        
        // 设置保存成功状态
        setSaveStatus({
          saving: false,
          saved: true,
          error: false,
          message: '保存成功！'
        });
        
        // 显示成功Toast
        showToastNotification('基本信息保存成功！', 'success');
        
        // 重置修改状态
        setIsModified(false);
      } else {
        throw new Error('IPFS服务未初始化');
      }
    } catch (error) {
      console.error('保存元数据失败:', error);
      
      // 设置保存失败状态
      setSaveStatus({
        saving: false,
        saved: false,
        error: true,
        message: '保存失败，请重试'
      });
      
      // 显示错误Toast
      showToastNotification('保存失败，请重试', 'danger');
    }
  };
  
  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5">
        <Spinner animation="border" variant="danger" className="mb-3" />
        <p className="text-muted">正在加载知识元数据...</p>
      </div>
    );
  }
  
  return (
    <Form noValidate validated={validated} onSubmit={handleSaveMetadata}>
      <Row>
        <Col md={10} lg={8}>
          <Form.Group className="mb-3">
            <Form.Label>知识标题</Form.Label>
            <Form.Control
              type="text"
              name="title"
              value={basicInfo.title}
              onChange={handleBasicInfoChange}
              required
              placeholder="请输入知识标题"
            />
            <Form.Control.Feedback type="invalid">
              请输入知识标题
            </Form.Control.Feedback>
          </Form.Group>
          
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Mina定价</Form.Label>
                <Form.Control
                  type="number"
                  name="price"
                  value={basicInfo.price}
                  onChange={handleBasicInfoChange}
                  disabled={basicInfo.isFree}
                  min={basicInfo.isFree ? 0 : 1}
                  required
                  placeholder="请输入Mina定价"
                />
                <Form.Control.Feedback type="invalid">
                  {basicInfo.isFree ? '' : 'Mina定价不能低于1'}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  {basicInfo.isFree ? '免费知识无需设置价格' : '付费知识的最低定价为1 Mina'}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6} className="d-flex align-items-center">
              <Form.Group className="mt-md-4">
                <Form.Check
                  type="checkbox"
                  id="free-knowledge-checkbox"
                  name="isFree"
                  label="发布免费知识"
                  checked={basicInfo.isFree}
                  onChange={handleBasicInfoChange}
                />
              </Form.Group>
            </Col>
          </Row>
          
          <Form.Group className="mb-3">
            <Form.Label>销售容量</Form.Label>
            <Form.Control
              type="number"
              name="sale_volume"
              value={basicInfo.sale_volume}
              onChange={handleBasicInfoChange}
              disabled={basicInfo.isFree}
              min={basicInfo.isFree ? 0 : 1}
              required
              placeholder="请输入销售容量"
            />
            <Form.Control.Feedback type="invalid">
              {basicInfo.isFree ? '' : '销售容量不能低于1'}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              {basicInfo.isFree ? '免费知识无需设置销售容量' : '设置此知识的最大销售数量'}
            </Form.Text>
          </Form.Group>
          
          {/* 保存按钮 */}
          <div className="d-flex justify-content-start mt-4">
            <Button 
              type="submit"
              variant="danger" 
              className="d-flex align-items-center"
              disabled={saveStatus.saving || !isModified}
            >
              <FaSave className="me-2" />
              {saveStatus.saving ? '保存中...' : '保存基本信息'}
            </Button>
          </div>
        </Col>
      </Row>
      
      {/* Toast通知 */}
      <ToastContainer 
        position="top-end" 
        className="p-3" 
        style={{ zIndex: 1060 }}
      >
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
    </Form>
  );
} 