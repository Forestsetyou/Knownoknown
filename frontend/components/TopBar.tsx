'use client';

import React, { useState, useEffect, useContext, useRef } from 'react';
import { Navbar, Container, Form, InputGroup, Dropdown, Badge, Button } from 'react-bootstrap';
import { FaSearch, FaServer, FaNetworkWired, FaWallet, FaSignOutAlt, FaCopy, FaKey, FaCheck } from 'react-icons/fa';
import { ZkappFields, StatusChecker } from "@/interface/utilTypes";
import { Field } from 'knownoknown-contract';
import { useModal } from '@/context/ModalContext';
import { WalletStatus, useWallet } from '@/context/WalletContext';
import { useBackend, BackendServiceStatus, BackendServerStatus } from '@/context/BackendContext';
import { useIpfs, IpfsServiceStatus, IpfsServerStatus } from '@/context/IpfsContext';
import { useZkapp, ZkappStatus } from '@/context/ZkappContext';

const TopBar = () => {
  // 使用context获取服务
  const { walletStatus, connectWallet, disconnectWallet, validateWalletPrivateKey, setWalletKey } = useWallet();
  const { backendStatus, getBackendStatus } = useBackend();
  const { ipfsStatus, getIpfsStatus } = useIpfs();
  const { zkappStatus, getZkappFields, compileZkapp } = useZkapp();
  const { showLoading, showSuccess, showError, showModal, hideModal } = useModal();

  const keyInputRef = useRef<HTMLInputElement>(null);

  // 本地服务状态的副本
  const [localWalletStatus, setLocalWalletStatus] = useState<WalletStatus>(walletStatus);
  const [localBackendStatus, setLocalBackendStatus] = useState<BackendServiceStatus>(backendStatus);
  const [localIpfsStatus, setLocalIpfsStatus] = useState<IpfsServiceStatus>(ipfsStatus);
  const [localZkappStatus, setLocalZkappStatus] = useState<ZkappStatus>(zkappStatus);

  const compileContract = async () => {
    try {
      showLoading("正在编译合约...", "合约编译");
      const beginTime = new Date();
      await compileZkapp();
      const endTime = new Date();
      showSuccess(`合约编译成功！, 用时${(endTime.getTime() - beginTime.getTime())/1000}s`, "编译完成");
    } catch (error) {
      console.error("合约编译失败:", error);
      showError("合约编译失败，请检查控制台获取详细错误信息。", "编译失败");
    }
  }

  const syncWalletStatus = async () => {
    setLocalWalletStatus(prev => ({
      ...prev,
      ...walletStatus!,
    }));
  }
  // 同步钱包状态
  useEffect(() => {
    syncWalletStatus();
  }, [walletStatus]); // 空依赖数组，表示只在组件挂载时执行一次设置

  const syncBackendStatus = async () => {
    setLocalBackendStatus(prev => ({
      ...prev,
      ...backendStatus!,
    }));
  }
  // 同步后端状态
  useEffect(() => {
    syncBackendStatus();
  }, [backendStatus]); // 空依赖数组，表示只在组件挂载时执行一次设置

  const syncIpfsStatus = async () => {
    setLocalIpfsStatus(prev => ({
      ...prev,
      ...ipfsStatus!,
    }));
  }
  // 同步钱包状态
  useEffect(() => {
    syncIpfsStatus();
  }, [ipfsStatus]); // 空依赖数组，表示只在组件挂载时执行一次设置

  const syncZkappStatus = async () => {
    setLocalZkappStatus(prev => ({
      ...prev,
      ...zkappStatus!,
    }));
  }
  // 同步钱包状态
  useEffect(() => {
    syncZkappStatus();
  }, [zkappStatus]); // 空依赖数组，表示只在组件挂载时执行一次设置
  
  // 管理员后端服务状态标记
  const getBackendStatusBadge = () => {
    switch(localBackendStatus.status) {
      case BackendServerStatus.ONLINE:
        return <Badge bg="success">正常</Badge>;
      case BackendServerStatus.OFFLINE:
        return <Badge bg="danger">离线</Badge>;
      default:
        return <Badge bg="secondary">未知</Badge>;
    }
  };
  // IPFS服务状态标记
  const getIpfsStatusBadge = () => {
    switch(localIpfsStatus.status) {
      case IpfsServerStatus.ONLINE:
        return <Badge bg="success">正常</Badge>;
      case IpfsServerStatus.OFFLINE:
        return <Badge bg="danger">离线</Badge>;
      default:
        return <Badge bg="secondary">未知</Badge>;
    }
  };
  
  // 根据合约状态显示不同的标记, knowledge与application表示commitment, action表示action
  const getZkappFieldBadge = (field: Field | undefined, type: 'knowledge' | 'application' | 'action') => {
    if (!field) { // 如果field为空，则返回未知
      return <Badge bg="secondary">未知</Badge>;
    }
    switch(type) {
      case 'knowledge':
        return <Badge bg="success">有效</Badge>;
      case 'application':
        return <Badge bg="success">有效</Badge>;
      case 'action':
        if (field?.equals(Field(0)).toBoolean()) {
          return <Badge bg="success">空闲</Badge>;
        } else {
          return <Badge bg="danger">占用</Badge>;
        }
      default:
        return <Badge bg="secondary">未知</Badge>;
    }
  };
  
  // 复制钱包地址到剪贴板
  const copyAddressToClipboard = () => {
    navigator.clipboard.writeText(localWalletStatus?.address!)
      .then(() => {
        alert('钱包地址已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };
  
  // 格式化显示的钱包地址
  const formatAddress = (address:any) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

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

  const handleDisconnectWallet = async () => {
    try {
      showLoading("正在断开钱包连接...", "断开连接");
      
      await disconnectWallet();
      
      showSuccess("钱包已断开连接。", "断开成功");
    } catch (error) {
      console.error("断开钱包连接错误:", error);
      showError("断开钱包连接时发生错误。", "断开错误");
    }
  }
  
  // 处理密钥提交
  const handleKeySubmit = async () => {
    const keyValue = keyInputRef.current?.value;
    
    if (!keyValue) {
      showError("未输入私钥", "私钥错误");
      return;
    }
    try {
      showLoading("正在验证私钥...", "验证中");
      const isValid = await validateWalletPrivateKey(keyValue);
      if (isValid) {
        await setWalletKey(keyValue);
        showSuccess("密钥已成功添加到您的钱包", "设置成功");
      } else {
        showError("提供的私钥无效，请检查后重试", "验证失败");
      }
    } catch (error) {
      console.error("密钥验证错误:", error);
      showError("验证过程中发生错误，请稍后重试", "验证错误");
    }
  };
  
  // 处理设置密钥
  const handleSetupKey = () => {
    showModal({
      type: 'custom',
      title: '设置钱包密钥',
      message: '请输入您的钱包私钥以启用完整功能',
      closable: true,
      customContent: (
        <div className="p-3">
          <Form.Group className="mb-3">
            <Form.Label>私钥</Form.Label>
            <Form.Control
              ref={keyInputRef}
              type="password"
              placeholder="输入您的私钥"
              autoComplete="off"
            />
            <Form.Text className="text-muted">
              您的私钥仅在本地使用，不会被发送到任何服务器
            </Form.Text>
          </Form.Group>
          <div className="d-flex justify-content-end">
            <Button variant="secondary" className="me-2" onClick={hideModal}>
              取消
            </Button>
            <Button variant="primary" onClick={handleKeySubmit}>
              添加
            </Button>
          </div>
        </div>
      )
    });
  };
  
  return (
    <Navbar bg="white" className="border-bottom shadow-sm py-2 mb-3" id="app-top-bar">
      <Container fluid>
        <div className="d-flex flex-grow-1 justify-content-center position-relative">
          <InputGroup className="w-50">
            <InputGroup.Text className="bg-light border-end-0">
              <FaSearch className="text-muted" />
            </InputGroup.Text>
            <Form.Control
              placeholder="搜索你感兴趣的知识..."
              className="bg-light border-start-0"
            />
          </InputGroup>
        </div>
        
        <div className="d-flex align-items-center">
          {/* 钱包状态 */}
          {!localWalletStatus?.connected ? (
            <Button 
              variant="outline-primary" 
              className="rounded-pill mx-1 d-flex align-items-center"
              onClick={handleConnectWallet}
              disabled={localWalletStatus?.connecting}
            >
              <FaWallet className="me-2" />
              {localWalletStatus?.connecting ? '连接中...' : '连接钱包'}
            </Button>
          ) : (
            <Dropdown className="mx-1">
              <Dropdown.Toggle variant="outline-success" className="rounded-pill d-flex align-items-center">
                <FaWallet className="me-2" />
                <span>{formatAddress(localWalletStatus.address)}</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Header>钱包信息</Dropdown.Header>
                <Dropdown.Item onClick={copyAddressToClipboard} className="d-flex align-items-center">
                  <div className="text-truncate" style={{maxWidth: '400px'}}>
                    钱包地址: {localWalletStatus.address}
                  </div>
                  <FaCopy className="ms-2" />
                </Dropdown.Item>
                <Dropdown.Item>Mina余额: {localWalletStatus.balance}</Dropdown.Item>
                <Dropdown.Item>
                  密钥状态: {localWalletStatus?.key ? (
                    <Badge bg="success" className="ms-2">
                      <FaCheck className="me-1" />已设置
                    </Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline-primary" 
                      className="ms-2"
                      onClick={handleSetupKey}
                    >
                      <FaKey className="me-1" />设置密钥
                    </Button>
                  )}
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item 
                  onClick={handleDisconnectWallet}
                  className="text-danger d-flex align-items-center"
                >
                  <FaSignOutAlt className="me-2" />
                  断开连接
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
          
          {/* 合约状态 */}
          <Dropdown className="mx-1">
            <Dropdown.Toggle variant="light" className="d-flex align-items-center border rounded-pill px-3 py-1">
              <FaNetworkWired className="me-2" />
              <span>Mina区块链</span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Header>知识状态</Dropdown.Header>
              <Dropdown.Item>根承诺: {getZkappFieldBadge(localZkappStatus?.zkappFields?.knowledgeEntryMerkleRoot, 'knowledge')}</Dropdown.Item>
              <Dropdown.Item>待发布: {getZkappFieldBadge(localZkappStatus?.zkappFields?.publishKnowledgeCidHash, 'action')}</Dropdown.Item>
              <Dropdown.Item>被更新: {getZkappFieldBadge(localZkappStatus?.zkappFields?.updateFromKnowledgeCidHash, 'action')}</Dropdown.Item>
              <Dropdown.Item>更新至: {getZkappFieldBadge(localZkappStatus?.zkappFields?.updateToKnowledgeCidHash, 'action')}</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Header>申请状态</Dropdown.Header>
              <Dropdown.Item>根承诺: {getZkappFieldBadge(localZkappStatus?.zkappFields?.applicationEntryMerkleRoot, 'application')}</Dropdown.Item>
              <Dropdown.Item>待发布: {getZkappFieldBadge(localZkappStatus?.zkappFields?.publishApplicationCidHash, 'action')}</Dropdown.Item>
              <Dropdown.Item>被更新: {getZkappFieldBadge(localZkappStatus?.zkappFields?.updateFromApplicationCidHash, 'action')}</Dropdown.Item>
              <Dropdown.Item>更新至: {getZkappFieldBadge(localZkappStatus?.zkappFields?.updateToApplicationCidHash, 'action')}</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Header>本地合约</Dropdown.Header>
              <Dropdown.Item>编译状态: {localZkappStatus?.compileStatus ? (
                <Badge bg="success">成功</Badge>
              ) : (
                  <Button 
                    variant="outline-primary" 
                    className="rounded-pill mx-1 align-items-center"
                    onClick={compileContract}
                  >
                    编译
                  </Button>
              )}</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>       
          {/* 服务状态 */}
          <Dropdown className="mx-1 me-2">
            <Dropdown.Toggle variant="light" className="d-flex align-items-center border rounded-pill px-3 py-1">
              <FaServer className="me-2" />
              <span>平台服务</span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Header>服务状态详情</Dropdown.Header>
              <Dropdown.Item>IPFS状态: {getIpfsStatusBadge()}</Dropdown.Item>
              <Dropdown.Item>后端服务: {getBackendStatusBadge()}</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </Container>
    </Navbar>
  );
};

export default TopBar; 