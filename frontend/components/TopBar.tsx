'use client';

import React, { useState, useEffect, useContext, useRef } from 'react';
import { Navbar, Container, Form, InputGroup, Dropdown, Badge, Button } from 'react-bootstrap';
import { FaSearch, FaServer, FaNetworkWired, FaWallet, FaSignOutAlt, FaCopy, FaKey, FaCheck } from 'react-icons/fa';
import { LocalZkappService, ZkappContext, ZkappStatus } from "@/service/contractService";
import { ZkappFields, StatusChecker } from "@/interface/utilTypes";
import { Field } from 'knownoknown-contract';
import { cookies } from 'next/headers';
import { LocalWalletService, WalletContext, WalletStatus } from "@/service/walletService";
import { useModal } from '@/context/ModalContext';
import { LocalBackendService, BackendContext, BackendServiceStatus, BackendServerStatus } from "@/service/backendService";
import { IpfsService, IpfsServiceContext, IpfsServiceInit, IpfsServiceStatus, IpfsServerStatus } from "@/service/ipfsService";

const TopBar = () => {
  const globalWallet: LocalWalletService | undefined = useContext(WalletContext);
  const globalZkapp: LocalZkappService | undefined = useContext(ZkappContext);
  const globalBackend: LocalBackendService | undefined = useContext(BackendContext);
  const globalIpfsService: IpfsService | undefined = useContext(IpfsServiceContext);
  const { showLoading, showSuccess, showError, showModal, hideModal } = useModal();
  const keyInputRef = useRef<HTMLInputElement>(null);

  const [walletStatus, setWalletStatus] = useState<WalletStatus | null>(null);
  const [zkappStatus, setZkappStatus] = useState<ZkappStatus | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendServiceStatus | null>(null);
  const [ipfsStatus, setIpfsStatus] = useState<IpfsServiceStatus | null>(null);

  let zkappFieldsChecker: StatusChecker | null = null;
  let walletBalanceChecker: StatusChecker | null = null;
  let serviceStatusChecker: StatusChecker | null = null;

  const checkZkappFields = async () => {
    const zkappFields = await globalZkapp!.getZkappFields();
    setZkappStatus({
      ...zkappStatus!,
      zkappFields
    });
  }

  const checkWalletBalance = async () => {
    const balance = Number(await globalWallet!.getWalletBalance() as unknown as string)/1e9;
    setWalletStatus({
      ...walletStatus!,
      balance: `${balance}`,
    });
  }

  const compileContract = async () => {
    try {
      showLoading("正在编译合约...", "合约编译");
      console.log("开始编译合约");
      await globalZkapp!.compileZkapp();
      console.log("合约编译完成");
      
      // 更新状态
      setZkappStatus({
        ...zkappStatus!,
        compileStatus: true
      });
      
      showSuccess("合约编译成功！", "编译完成");
    } catch (error) {
      console.error("合约编译失败:", error);
      showError("合约编译失败，请检查控制台获取详细错误信息。", "编译失败");
    }
  }

  // 定时查询服务状态
  useEffect(() => {
    const initWalletStatus = async () => {
      setWalletStatus({
        connected: false,
        connecting: false,
        address: '',
        key: '',
        balance: ''
      });
    }

    const initBackendStatus = async () => {
      const backendStatus = await globalBackend!.getBackendStatus();
      setBackendStatus(backendStatus);
      return backendStatus;
    }

    const initZkappStatus = async (backendStatus: BackendServiceStatus) => {
      const contractAddress = backendStatus.contractAddress;
      await globalZkapp!.initZkapp(contractAddress);
      const compileStatus = await globalZkapp!.getCompileStatus();
      const zkappFields: ZkappFields = await globalZkapp!.getZkappFields();
      setZkappStatus({
        compileStatus,
        contractAddress,
        zkappFields
      });
    }

    const initIpfsStatus = async (backendStatus: BackendServiceStatus) => {
      const ipfsServiceInit: IpfsServiceInit = {
        httpGatewayRoutingURL: backendStatus.ipfsGatewayRoutingURL,
        knownoknownEntryCID: backendStatus.knownoknownEntryCID,
        statusFlagCID: backendStatus.ipfsStatusFlagCID,
      }
      await globalIpfsService!.initialize(ipfsServiceInit);
      const ipfsStatus = await globalIpfsService!.getStatus();
      setIpfsStatus({
        status: ipfsStatus.status,
      });
    }

    const checkServiceStatus = async () => {
      const backendStatus = await globalBackend!.getBackendStatus();
      const ipfsStatus = await globalIpfsService!.getStatus();
      setBackendStatus(backendStatus);
      setIpfsStatus(ipfsStatus);
    }

    const topBarSetup = async () => {
      await initWalletStatus();
      const backendStatus = await initBackendStatus();
      await initZkappStatus(backendStatus);
      await initIpfsStatus(backendStatus);
      serviceStatusChecker = setInterval(checkServiceStatus, 120000);
      zkappFieldsChecker = setInterval(checkZkappFields, 60000);
    };
    topBarSetup();

    // 清理函数，组件卸载时清除定时器
    return () => {
      if (serviceStatusChecker) {
        clearInterval(serviceStatusChecker);
        serviceStatusChecker = null;
      }
      if (zkappFieldsChecker) {
        clearInterval(zkappFieldsChecker);
        zkappFieldsChecker = null;
      }
    };
  }, []); // 空依赖数组，表示只在组件挂载时执行一次设置
  
  // 管理员后端服务状态标记
  const getBackendStatusBadge = (status: BackendServerStatus | undefined) => {
    if (!status) {
      return <Badge bg="secondary">未知</Badge>;
    }
    switch(status) {
      case BackendServerStatus.ONLINE:
        return <Badge bg="success">正常</Badge>;
      // case 'degraded':
      //   return <Badge bg="warning">服务降级</Badge>;
      case BackendServerStatus.OFFLINE:
        return <Badge bg="danger">离线</Badge>;
      default:
        return <Badge bg="secondary">未知</Badge>;
    }
  };
  // IPFS服务状态标记
  const getIpfsStatusBadge = (status: IpfsServerStatus | undefined) => {
    if (!status) {
      return <Badge bg="secondary">未知</Badge>;
    }
    switch(status) {
      case IpfsServerStatus.ONLINE:
        return <Badge bg="success">正常</Badge>;
      // case 'degraded':
      //   return <Badge bg="warning">服务降级</Badge>;
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
        if (field?.equals(Field(0))) {
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
    navigator.clipboard.writeText(globalWallet!.getWalletAddress() as unknown as string)
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
      
      setWalletStatus({
        ...walletStatus!,
        connecting: true
      });
      
      if (await globalWallet!.connectWallet()) {
        const balance = Number(await globalWallet!.getWalletBalance() as unknown as string)/1e9;
        setWalletStatus({
          connected: true,
          connecting: false,
          address: (await globalWallet!.getWalletAddress()) as unknown as string,
          key: (await globalWallet!.getWalletKey()) as unknown as string,
          balance: `${balance}`,
        });
        walletBalanceChecker = setInterval(checkWalletBalance, 120000); // 120秒更新一次钱包余额
        
        showSuccess("钱包连接成功！", "连接成功");
      } else {
        setWalletStatus({
          ...walletStatus!,
          connecting: false
        });
        
        showError("钱包连接失败，请确保您已安装并解锁钱包。", "连接失败");
      }
    } catch (error) {
      console.error("钱包连接错误:", error);
      setWalletStatus({
        ...walletStatus!,
        connecting: false
      });
      
      showError("钱包连接过程中发生错误，请稍后重试。", "连接错误");
    }
  }

  const handleDisconnectWallet = async () => {
    try {
      showLoading("正在断开钱包连接...", "断开连接");
      
      await globalWallet!.disconnectWallet();
      setWalletStatus({
        ...walletStatus!,
        connected: false,
      });
      if (walletBalanceChecker) {
        clearInterval(walletBalanceChecker);
        walletBalanceChecker = null;
      }
      
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
      
      // 这里调用您的密钥验证逻辑
      const isValid = await globalWallet!.validatePrivateKey(keyValue);
      
      if (isValid) {
        // 可能需要调用您的钱包服务来保存密钥
        await globalWallet!.setWalletKey(keyValue);

        // 更新钱包状态，添加密钥
        setWalletStatus({
          ...walletStatus!,
          key: keyValue
        });
        
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
          {!walletStatus?.connected ? (
            <Button 
              variant="outline-primary" 
              className="rounded-pill mx-1 d-flex align-items-center"
              onClick={handleConnectWallet}
              disabled={walletStatus?.connecting}
            >
              <FaWallet className="me-2" />
              {walletStatus?.connecting ? '连接中...' : '连接钱包'}
            </Button>
          ) : (
            <Dropdown className="mx-1">
              <Dropdown.Toggle variant="outline-success" className="rounded-pill d-flex align-items-center">
                <FaWallet className="me-2" />
                <span>{formatAddress(walletStatus.address)}</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Header>钱包信息</Dropdown.Header>
                <Dropdown.Item onClick={copyAddressToClipboard} className="d-flex align-items-center">
                  <div className="text-truncate" style={{maxWidth: '400px'}}>
                    钱包地址: {walletStatus.address}
                  </div>
                  <FaCopy className="ms-2" />
                </Dropdown.Item>
                <Dropdown.Item>Mina余额: {walletStatus.balance}</Dropdown.Item>
                <Dropdown.Item>
                  密钥状态: {walletStatus?.key ? (
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
              <Dropdown.Item>根承诺: {getZkappFieldBadge(zkappStatus?.zkappFields?.knowledgeEntryMerkleRoot, 'knowledge')}</Dropdown.Item>
              <Dropdown.Item>待发布: {getZkappFieldBadge(zkappStatus?.zkappFields?.publishKnowledgeCidHash, 'action')}</Dropdown.Item>
              <Dropdown.Item>被更新: {getZkappFieldBadge(zkappStatus?.zkappFields?.updateFromKnowledgeCidHash, 'action')}</Dropdown.Item>
              <Dropdown.Item>更新至: {getZkappFieldBadge(zkappStatus?.zkappFields?.updateToKnowledgeCidHash, 'action')}</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Header>申请状态</Dropdown.Header>
              <Dropdown.Item>根承诺: {getZkappFieldBadge(zkappStatus?.zkappFields?.applicationEntryMerkleRoot, 'application')}</Dropdown.Item>
              <Dropdown.Item>待发布: {getZkappFieldBadge(zkappStatus?.zkappFields?.publishApplicationCidHash, 'action')}</Dropdown.Item>
              <Dropdown.Item>被更新: {getZkappFieldBadge(zkappStatus?.zkappFields?.updateFromApplicationCidHash, 'action')}</Dropdown.Item>
              <Dropdown.Item>更新至: {getZkappFieldBadge(zkappStatus?.zkappFields?.updateToApplicationCidHash, 'action')}</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Header>本地合约</Dropdown.Header>
              <Dropdown.Item>编译状态: {zkappStatus?.compileStatus ? (
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
              <Dropdown.Item>IPFS状态: {getIpfsStatusBadge(ipfsStatus?.status)}</Dropdown.Item>
              <Dropdown.Item>后端服务: {getBackendStatusBadge(backendStatus?.status)}</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </Container>
    </Navbar>
  );
};

export default TopBar; 