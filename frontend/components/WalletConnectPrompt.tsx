'use client';

import React from 'react';
import { Container, Button, Alert } from 'react-bootstrap';
import { FaExclamationTriangle, FaWallet } from 'react-icons/fa';
import { useWallet } from '@/context/WalletContext';
import { useModal } from '@/context/ModalContext';

interface WalletConnectPromptProps {
  message?: string;
  details?: string[];
}

const WalletConnectPrompt: React.FC<WalletConnectPromptProps> = ({ 
  message = '发布知识需要连接钱包以进行身份验证和上链操作。',
  details = [
    '验证您的身份',
    '将知识内容安全地存储到IPFS',
    '在Mina区块链上注册您的知识产权'
  ]
}) => {
  const { connectWallet } = useWallet();
  const { showLoading, showSuccess, showError } = useModal();

  const handleConnectWallet = async () => {
    try {
      showLoading("正在连接钱包...", "钱包连接");
      
      if (await connectWallet()) {
        showSuccess("钱包连接成功！", "连接成功");
      } else {
        showError("钱包连接失败，请确保您已安装并解锁钱包。", "连接失败");
      }
    } catch (error) {
      console.error("钱包连接错误:", error);
      showError("钱包连接过程中发生错误，请稍后重试。", "连接错误");
    }
  }
  
  return (
    <Container className="py-5">
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="text-center mb-4">
          <FaExclamationTriangle size={50} className="text-warning mb-3" />
          <h4 className="mb-3">需要连接钱包</h4>
          <p className="text-muted mb-4">{message}</p>
          <Alert variant="info" className="mb-4 text-start">
            <p className="mb-1"><strong>为什么需要连接钱包？</strong></p>
            <ul className="mb-0">
              {details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          </Alert>
        </div>
        <Button 
          variant="primary" 
          size="lg" 
          className="d-flex align-items-center"
          onClick={handleConnectWallet}
        >
          <FaWallet className="me-2" />
          连接钱包
        </Button>
      </div>
    </Container>
  );
};

export default WalletConnectPrompt; 