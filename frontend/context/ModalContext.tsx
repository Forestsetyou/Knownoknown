'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';

// 模态窗口类型
export type ModalType = 'loading' | 'success' | 'error' | 'confirm' | 'custom';

// 模态窗口状态接口
interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  closable: boolean;
  customContent?: React.ReactNode;
  size?: 'sm' | 'lg' | 'xl';
  onHide?: () => void;
}

// 模态窗口上下文接口
interface ModalContextType {
  modalState: ModalState;
  showModal: (options: Partial<ModalState>) => void;
  hideModal: () => void;
  showLoading: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string, onConfirm?: () => void) => void;
  showError: (message: string, title?: string, onConfirm?: () => void) => void;
  showConfirm: (message: string, title?: string, onConfirm?: () => void, onCancel?: () => void) => void;
}

// 创建上下文
const ModalContext = createContext<ModalContextType | undefined>(undefined);

// 默认模态窗口状态
const defaultModalState: ModalState = {
  isOpen: false,
  type: 'loading',
  title: '',
  message: '',
  closable: true,
  size: undefined,
  onHide: () => {}
};

// 模态窗口提供者组件
export const ModalProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>(defaultModalState);

  // 显示模态窗口
  const showModal = (options: Partial<ModalState>) => {
    setModalState({
      ...defaultModalState,
      ...options,
      isOpen: true
    });
  };

  // 隐藏模态窗口
  const hideModal = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
      onHide: undefined,
      size: undefined,
    }));
  };

  // 显示加载中模态窗口
  const showLoading = (message: string, title: string = '处理中') => {
    showModal({
      type: 'loading',
      title,
      message,
      closable: false
    });
  };

  // 显示成功模态窗口
  const showSuccess = (message: string, title: string = '成功', onConfirm?: () => void) => {
    showModal({
      type: 'success',
      title,
      message,
      confirmText: '确定',
      onConfirm: onConfirm || hideModal,
      closable: true
    });
  };

  // 显示错误模态窗口
  const showError = (message: string, title: string = '错误', onConfirm?: () => void) => {
    showModal({
      type: 'error',
      title,
      message,
      confirmText: '确定',
      onConfirm: onConfirm || hideModal,
      closable: true
    });
  };

  // 显示确认模态窗口
  const showConfirm = (
    message: string, 
    title: string = '确认', 
    onConfirm?: () => void, 
    onCancel?: () => void
  ) => {
    showModal({
      type: 'confirm',
      title,
      message,
      confirmText: '确定',
      cancelText: '取消',
      onConfirm: onConfirm || hideModal,
      onCancel: onCancel || hideModal,
      closable: true
    });
  };

  // 渲染模态窗口内容
  const renderModalContent = () => {
    switch (modalState.type) {
      case 'loading':
        return (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <p className="mb-0">{modalState.message}</p>
          </div>
        );
      case 'success':
        return (
          <>
            <Modal.Body className="text-center py-4">
              <div className="mb-3">
                <i className="fas fa-check-circle text-success" style={{ fontSize: '3rem' }}></i>
              </div>
              <p className="mb-0">{modalState.message}</p>
            </Modal.Body>
            <Modal.Footer className="justify-content-center border-0 pt-0">
              <Button variant="primary" onClick={modalState.onConfirm}>
                {modalState.confirmText}
              </Button>
            </Modal.Footer>
          </>
        );
      case 'error':
        return (
          <>
            <Modal.Body className="text-center py-4">
              <div className="mb-3">
                <i className="fas fa-times-circle text-danger" style={{ fontSize: '3rem' }}></i>
              </div>
              <p className="mb-0">{modalState.message}</p>
            </Modal.Body>
            <Modal.Footer className="justify-content-center border-0 pt-0">
              <Button variant="primary" onClick={modalState.onConfirm}>
                {modalState.confirmText}
              </Button>
            </Modal.Footer>
          </>
        );
      case 'confirm':
        return (
          <>
            <Modal.Body className="text-center py-4">
              <div className="mb-3">
                <i className="fas fa-question-circle text-warning" style={{ fontSize: '3rem' }}></i>
              </div>
              <p className="mb-0">{modalState.message}</p>
            </Modal.Body>
            <Modal.Footer className="justify-content-center border-0 pt-0">
              <Button variant="secondary" onClick={modalState.onCancel}>
                {modalState.cancelText}
              </Button>
              <Button variant="primary" onClick={modalState.onConfirm}>
                {modalState.confirmText}
              </Button>
            </Modal.Footer>
          </>
        );
      case 'custom':
        return (
          <>
            <Modal.Body>
              {modalState.message && <p>{modalState.message}</p>}
              {modalState.customContent}
            </Modal.Body>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <ModalContext.Provider 
      value={{ 
        modalState, 
        showModal, 
        hideModal, 
        showLoading, 
        showSuccess, 
        showError, 
        showConfirm 
      }}
    >
      {children}
      
      <Modal 
        show={modalState.isOpen} 
        onHide={modalState.onHide || modalState.closable ? hideModal : undefined}
        centered
        backdrop={modalState.closable ? true : 'static'}
        keyboard={modalState.closable}
        size={modalState.size}
      >
        {modalState.title && (
          <Modal.Header closeButton={modalState.closable}>
            <Modal.Title>{modalState.title}</Modal.Title>
          </Modal.Header>
        )}
        {renderModalContent()}
      </Modal>
    </ModalContext.Provider>
  );
};

// 自定义Hook，用于在组件中使用模态窗口上下文
export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}; 