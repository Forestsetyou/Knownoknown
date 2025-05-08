'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, InputGroup, Button, Badge, Spinner, Dropdown } from 'react-bootstrap';
import { FaSearch, FaFilter, FaTag, FaStar, FaHeart, FaTimes, FaUser, FaComment, FaFileAlt, FaImage, FaCode } from 'react-icons/fa';
import { useIpfs } from '@/context/IpfsContext';
import { Knowledge_Intro_Simple, Knowledge_Intro_Pack } from '@/interface/knownoknownDag/knownoknownDagInterface';
import { useWallet } from '@/context/WalletContext';
import { useModal } from '@/context/ModalContext';
import DiscoverInfo from './discover/DiscoverInfo';
import { useBackend } from '@/context/BackendContext';
import { WalletStatus } from '@/service/walletService';

export default function Discover() {
  // IPFS服务
  const { ipfsGetKnowledgeIntroSimples, ipfsGetKnowledgeIntroPack, ipfsGoToReadKnowledge } = useIpfs();
  // 后端服务
  const { backendChangeStar } = useBackend();
  // 钱包
  const { walletStatus, getWalletKey } = useWallet();
  // 模态框
  const { showModal, hideModal } = useModal();

  // 状态管理
  const [knowledgeList, setKnowledgeList] = useState<Knowledge_Intro_Simple[]>([]);
  const [filteredList, setFilteredList] = useState<Knowledge_Intro_Simple[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('');
  
  // 所有标签的集合
  const [allTags, setAllTags] = useState<string[]>([]);
  
  // 临时图片URL管理
  const [coverImageUrls, setCoverImageUrls] = useState<{[key: string]: string}>({});
  
  const [localWalletStatus, setLocalWalletStatus] = useState<WalletStatus>(walletStatus);
  const [walletConnected, setWalletConnected] = useState(walletStatus.connected);
  
  // 处理图片并生成临时URL
  const processCoverImages = (knowledgeItems: Knowledge_Intro_Simple[]) => {
    const newCoverUrls: {[key: string]: string} = {};
    
    console.log('knowledgeItems:', knowledgeItems);
    knowledgeItems.forEach(item => {
      console.log('item:', item);
      const itemId = item.metadata.public_order.toString();
      
      // 如果已经有URL且item有cover，则重用现有URL
      if (coverImageUrls[itemId]) {
        newCoverUrls[itemId] = coverImageUrls[itemId];
      } 
      // 如果有cover数据但没有URL，创建新URL
      else if (item.cover) {
        newCoverUrls[itemId] = URL.createObjectURL(new Blob([item.cover]));
      }
      // 如果没有cover数据，使用默认图片
      else {
        newCoverUrls[itemId] = '/placeholder-image.jpg';
      }
    });
    
    // 清理不再使用的旧URL
    Object.entries(coverImageUrls).forEach(([id, url]) => {
      if (!newCoverUrls[id] && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });

    console.log('newCoverUrls:', newCoverUrls);
    setCoverImageUrls(newCoverUrls);
  };
  
  
  // 获取封面图片URL
  const getCoverImageUrl = (publicOrder: string) => {
    return coverImageUrls[publicOrder] || '/placeholder-image.jpg';
  };

  const fetchKnowledgeList = async () => {
    try {
      setLoading(true);
      const list = await ipfsGetKnowledgeIntroSimples(localWalletStatus.address, '');
      setKnowledgeList(list);
      setFilteredList(list);
      
      // 处理封面图片
      processCoverImages(list);
      
      // 提取所有标签
      const tagsSet = new Set<string>();
      list.forEach((item: Knowledge_Intro_Simple) => {
        item.metadata.tags.forEach((tag: string) => {
          tagsSet.add(tag);
        });
      });
      setAllTags(Array.from(tagsSet));
      
      setLoading(false);
    } catch (error) {
      console.error('获取知识列表失败:', error);
      setLoading(false);
    }
  };
  
  // 初始化加载
  useEffect(() => {
    fetchKnowledgeList();
    return () => {
      // if (Object.keys(coverImageUrls).length > 0) { // 清理临时URL
      //   Object.values(coverImageUrls).forEach(url => {
      //     if (url.startsWith('blob:')) {
      //       console.log('清理封面图的临时URL:', url);
      //       URL.revokeObjectURL(url);
      //     }
      //   });
      // }
    }
  }, [walletConnected]);

  const syncWalletStatus = async () => {
    setLocalWalletStatus(prev => ({
      ...prev,
      ...walletStatus!,
    }));
  }
  // 同步钱包状态
  useEffect(() => {
    syncWalletStatus();
    if (walletConnected !== walletStatus.connected) {
      setWalletConnected(walletStatus.connected);
    }
  }, [walletStatus]);
  
  // 处理搜索和筛选
  useEffect(() => {
    let result = knowledgeList;
    
    // 搜索筛选
    if (searchTerm) {
      result = result.filter(item => 
        item.metadata.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.metadata.intro.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 免费筛选
    if (showFreeOnly) {
      result = result.filter(item => item.metadata.price === 0);
    }
    
    // 标签筛选
    if (selectedTag) {
      result = result.filter(item => 
        item.metadata.tags.includes(selectedTag)
      );
    }
    
    setFilteredList(result);
  }, [searchTerm, showFreeOnly, selectedTag, knowledgeList]);
  
  // 处理搜索输入
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // 处理免费筛选
  const toggleFreeOnly = () => {
    setShowFreeOnly(!showFreeOnly);
  };
  
  // 处理标签选择
  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag === selectedTag ? '' : tag);
  };
  
  // 清除标签筛选
  const clearTagFilter = () => {
    setSelectedTag('');
  };
  
  // 清除所有筛选
  const clearFilters = () => {
    setSearchTerm('');
    setShowFreeOnly(false);
    setSelectedTag('');
  };
  
  // 格式化价格显示
  const formatPrice = (metadata: any) => {
    if ( walletStatus.address && metadata.author === walletStatus.address) {
      return '创作';
    }
    const decryptionKey = metadata.decryption_keys.specialized[walletStatus.address];
    if (decryptionKey) {
      return '已购';
    }
    return metadata.price === 0 ? '免费' : `${metadata.price} MINA`;
  };
  
  // 格式化地址显示
  const formatAddress = (address: string) => {
    if (!address) return '';
    return address.length > 10 ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : address;
  };
  
  // 获取分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };
  
  // 计算综合分数
  const calculateOverallScore = (scoreObj: any) => {
    if (!scoreObj) return 0;
    const { text_score, image_score, code_score } = scoreObj;
    return Math.round((text_score + image_score + code_score) / 3);
  };
  
  // 处理卡片点击
  const handleCardClick = async (knowledge: Knowledge_Intro_Simple) => {
    try {
      
      // 获取知识包详细信息
      const publicOrder = knowledge.metadata.public_order;
      const introPack = await ipfsGetKnowledgeIntroPack(publicOrder);
      console.log('user:', walletStatus.address);
      
      // 显示模态框
      showModal({
        type: 'custom',
        title: knowledge.metadata.title,
        customContent: (
          <DiscoverInfo 
            user={walletStatus.address}
            coverImageUrl={getCoverImageUrl(knowledge.metadata.public_order.toString())}
            knowledgeIntroSimple={knowledge}
            knowledgeIntroPack={introPack}
            changeStar={async (publicOrder: string) => {
              // 暂时为空函数，后续实现
              if (!walletStatus.address) {
                throw new Error('用户未登录');
              }
              const {success} = await backendChangeStar(publicOrder, walletStatus.address);
              if (!success) {
                throw new Error('收藏失败');
              } else {
                console.log('收藏成功');
              }
              const isStared = knowledgeList[Number(publicOrder)].is_stared;
              knowledgeList[Number(publicOrder)].is_stared = !isStared;
              if(isStared) {
                knowledgeList[Number(publicOrder)].stars_num--;
              } else {
                knowledgeList[Number(publicOrder)].stars_num++;
              }
              setKnowledgeList([...knowledgeList]);
              console.log('收藏状态变更:', publicOrder);
            }}
            getPvk={async () => {
              return await getWalletKey();
            }}
            goToReadKnowledge={async (public_order: number, pvk: string, pbk: string, metadata: any) => {
              hideModal();
              await ipfsGoToReadKnowledge(public_order, pvk, pbk, metadata);
            }}
          />
        ),
        size: 'xl',
        closable: true
      });
    } catch (error) {
      console.error('获取知识详情失败:', error);
      // 可以添加错误提示
    }
  };
  
  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <Container className="py-5">
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
          <Spinner animation="border" variant="danger" className="mb-3" />
          <p className="text-muted">正在加载知识列表...</p>
        </div>
      </Container>
    );
  }
  
  return (
    <Container fluid className="py-4">
      {/* 顶部搜索和筛选区域 */}
      <div className="mb-4">
        <Row className="align-items-center">
          <Col lg={3} md={12} className="d-flex align-items-center mb-3 mb-lg-0">
            <div className="discover-title-container">
              <h5 className="discover-title mb-0">探索知识</h5>
              <p className="text-muted mb-0 discover-subtitle">发现平台上的优质内容</p>
            </div>
          </Col>
          <Col lg={6} md={12} className="mb-3 mb-lg-0">
            <InputGroup className="mx-auto search-input-group" style={{ maxWidth: '500px' }}>
              <InputGroup.Text className="search-icon-container">
                <FaSearch className="search-icon" />
              </InputGroup.Text>
              <Form.Control
                placeholder="搜索知识..."
                className="search-input"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {searchTerm && (
                <Button 
                  variant="light" 
                  onClick={() => setSearchTerm('')}
                  className="search-clear-btn"
                >
                  <FaTimes />
                </Button>
              )}
            </InputGroup>
          </Col>
          <Col lg={3} md={12}>
            <div className="d-flex flex-wrap gap-2 justify-content-end">
              <div className="d-flex align-items-center tag-filter-container">
                {selectedTag && (
                  <Button 
                    variant="light" 
                    className="clear-tag-btn"
                    onClick={clearTagFilter}
                  >
                    <FaTimes />
                  </Button>
                )}
                <Dropdown>
                  <Dropdown.Toggle 
                    variant="light" 
                    className="d-flex align-items-center filter-btn tag-dropdown"
                    style={{ borderTopLeftRadius: selectedTag ? '0' : '0.375rem', borderBottomLeftRadius: selectedTag ? '0' : '0.375rem' }}
                  >
                    <FaTag className="me-2 filter-icon" />
                    {selectedTag || '标签筛选'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="dropdown-menu-end">
                    <Dropdown.Header>选择标签</Dropdown.Header>
                    {allTags.map(tag => (
                      <Dropdown.Item 
                        key={tag} 
                        active={tag === selectedTag}
                        onClick={() => handleTagSelect(tag)}
                      >
                        {tag}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </div>
              
              <div>
                <Button 
                  variant={showFreeOnly ? "success" : "light"} 
                  onClick={toggleFreeOnly}
                  className="d-flex align-items-center filter-btn free-filter-btn"
                >
                  <FaFilter className="me-2 filter-icon" />
                  {showFreeOnly ? '免费' : '全部'}
                </Button>
              </div>
              
              {/* {(searchTerm || showFreeOnly || selectedTag) && (
                <Button 
                  variant="outline-secondary" 
                  onClick={clearFilters}
                  className="d-flex align-items-center"
                >
                  <FaFilter className="me-2" />
                  清除筛选
                </Button>
              )} */}
            </div>
          </Col>
        </Row>
      </div>
      
      {/* 筛选结果提示 */}
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <p className="mb-0">
          共找到 <strong>{filteredList.length}</strong> 条知识
          {selectedTag && <span className="ms-2">标签: <Badge bg="primary">{selectedTag}</Badge></span>}
          {showFreeOnly && <span className="ms-2"><Badge bg="success">仅免费</Badge></span>}
        </p>
      </div>
      
      {/* 知识列表 */}
      <Row className="g-4">
        {loading ? (
          <></>
        ) : filteredList.length > 0 ? (
          filteredList.map((item, index) => (
            <Col key={index} lg={3} md={4} sm={6} xs={12}>
              <Card 
                className="h-100 knowledge-card border-0 shadow-sm"
                onClick={() => handleCardClick(item)}
                style={{ cursor: 'pointer' }}
              >
                <div className="position-relative card-img-container">
                  <Card.Img 
                    variant="top" 
                    src={getCoverImageUrl(item.metadata.public_order.toString())} 
                    className="card-cover-img"
                  />
                  <Badge 
                    bg={item.metadata.price === 0 ? "success" : "primary"} 
                    className="position-absolute top-0 end-0 m-2 price-badge"
                  >
                    {formatPrice(item.metadata)}
                  </Badge>
                </div>
                <Card.Body className="custom-card-body">
                  <h6 className="card-title text-truncate">{item.metadata.title}</h6>
                  
                  {/* 销量和检测分数行 */}
                  <div className="d-flex justify-content-between align-items-center stats-row">
                    <div className="score-mini-container">
                      <div 
                        className={`score-mini-bar score-${getScoreColor(calculateOverallScore(item.check_report_score))}`}
                        style={{ width: `${Math.min(100, Math.max(5, calculateOverallScore(item.check_report_score)))}%` }}
                      >
                      </div>
                    </div>
                    <div className="sales-info">
                      <span className="sales-count">销量:{item.metadata.sales}/{item.metadata.sale_volume}</span>
                    </div>
                  </div>
                  
                  <div className="card-intro-text">
                    {item.metadata.intro.content}
                  </div>
                  <div className="card-tags">
                    {item.metadata.tags.slice(0, 2).map((tag, idx) => (
                      <Badge 
                        key={idx} 
                        bg="light" 
                        text="dark" 
                        className="small me-1"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTagSelect(tag);
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card.Body>
                <Card.Footer className="custom-card-footer">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <FaStar className="me-1 footer-icon text-warning" />
                      <span className="me-3">{item.stars_num || 0}</span>
                      <FaComment className="me-1 footer-icon text-primary" />
                      <span>{item.comments_num || 0}</span>
                    </div>
                    <div className="text-truncate author-address">
                      <FaUser className="me-1 text-muted" /> {formatAddress(item.metadata.author)}
                    </div>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))
        ) : (
          <Col xs={12} className="text-center py-5">
            <p className="text-muted">没有找到符合条件的知识</p>
          </Col>
        )}
      </Row>
      
      {/* 自定义CSS样式 */}
      <style jsx global>{`
        .discover-subtitle {
          font-size: 1rem;
          color: #666;
          font-weight: 400;
        }
        
        .knowledge-card {
          transition: all 0.3s ease;
          height: 100%;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .knowledge-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
        }
        
        .card-img-container {
          height: 180px;
          overflow: hidden;
        }
        
        .card-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        
        .knowledge-card:hover .card-cover-img {
          transform: scale(1.05);
        }
        
        .price-badge {
          font-size: 0.8rem;
          padding: 0.35rem 0.65rem;
          z-index: 2;
        }
        
        .card-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #333;
          line-height: 1.3;
        }
        
        .stats-row {
          margin-bottom: 0.75rem;
          height: 1.2rem;
        }
        
        .score-mini-container {
          width: 60%;
          background-color: #f0f0f0;
          height: 0.5rem;
          border-radius: 0.25rem;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
        }
        
        .score-mini-bar {
          height: 100%;
          border-radius: 0.25rem;
        }
        
        .sales-info {
          font-size: 0.75rem;
          color: #666;
        }
        
        .sales-count {
          white-space: nowrap;
        }
        
        .card-intro-text {
          font-size: 0.85rem;
          color: #666;
          height: 2.6rem;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          line-height: 1.3rem;
          margin-bottom: 0.75rem;
        }
        
        .card-tags {
          height: 1.75rem;
          overflow: hidden;
          margin-bottom: 0;
        }
        
        .score-indicator {
          display: flex;
          align-items: center;
          padding: 0.5rem 0;
          border-top: 1px solid rgba(0,0,0,0.08);
          margin-bottom: 0;
        }
        
        .score-label {
          display: flex;
          align-items: center;
          width: 70px;
          margin-right: 0.75rem;
        }
        
        .score-type {
          font-size: 0.8rem;
          color: #555;
          font-weight: 500;
        }
        
        .score-bar-container {
          flex: 1;
          background-color: #f0f0f0;
          height: 1.4rem;
          border-radius: 0.7rem;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
        }
        
        .score-bar {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 0.5rem;
          min-width: 2rem;
          transition: width 0.3s ease;
        }
        
        .score-value {
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .score-success {
          background: linear-gradient(90deg, #28a745, #34ce57);
        }
        
        .score-warning {
          background: linear-gradient(90deg, #ffc107, #ffda6a);
        }
        
        .score-danger {
          background: linear-gradient(90deg, #dc3545, #ff6b6b);
        }
        
        .card-footer {
          border-top: none;
          padding: 0.5rem 0.25rem;
          font-size: 0.8rem;
          margin-top: 0;
        }
        
        .footer-icon {
          font-size: 1.1rem;
          margin-right: 0.3rem;
        }
        
        .author-address {
          max-width: 45%;
          font-size: 0.8rem;
          color: #777;
          display: flex;
          align-items: center;
        }
        
        .dropdown-menu {
          max-height: 300px;
          overflow-y: auto;
        }
        
        .tag-filter-container {
          position: relative;
        }
        
        .clear-tag-btn {
          position: relative;
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
          border-right: none;
          padding-left: 0.75rem;
          padding-right: 0.75rem;
          z-index: 1;
        }
        
        .tag-dropdown {
          height: 100%;
        }
        
        .filter-btn {
          height: 38px;
        }
        
        .filter-icon {
          margin-right: 0.5rem;
        }
        
        /* 确保所有筛选控件高度一致 */
        .form-control, .input-group-text, .btn, .dropdown-toggle {
          height: 38px;
        }
        
        .input-group {
          height: 38px;
        }
        
        .custom-card-body {
          padding: 1rem 1rem 0.5rem !important;
        }
        
        .custom-card-footer {
          border-top: none !important;
          padding: 0.5rem 1rem 0.75rem !important;
          font-size: 0.85rem;
          margin-top: 0;
          background-color: rgba(0,0,0,0.02) !important;
        }
        
        /* 标题样式 */
        .discover-title-container {
          padding-left: 0.5rem;
          border-left: 4px solid #dc3545;
        }
        
        .discover-title {
          font-weight: 600;
          color: #333;
          font-size: 1.25rem;
        }
        
        .discover-subtitle {
          font-size: 0.85rem;
          color: #666;
        }
        
        /* 搜索框样式 */
        .search-input-group {
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .search-icon-container {
          background-color: #f8f9fa;
          border: 1px solid #ced4da;
          border-right: none;
          padding-left: 1rem;
          padding-right: 1rem;
        }
        
        .search-icon {
          color: #dc3545;
        }
        
        .search-input {
          border: 1px solid #ced4da;
          padding: 0.6rem 1rem;
          font-size: 0.95rem;
        }
        
        .search-input:focus {
          box-shadow: none;
          border-color: #dc3545;
        }
        
        .search-clear-btn {
          border: 1px solid #ced4da;
          border-left: none;
          background-color: #f8f9fa;
        }
        
        /* 筛选按钮样式 */
        .filter-btn {
          border: 1px solid #ced4da;
          background-color: #f8f9fa;
          padding: 0.6rem 1rem;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        }
        
        .filter-btn:hover {
          background-color: #f0f0f0;
          border-color: #bbb;
        }
        
        .filter-icon {
          color: #dc3545;
        }
        
        .tag-dropdown {
          min-width: 120px;
        }
        
        .free-filter-btn {
          min-width: 90px;
        }
        
        .free-filter-btn.btn-success {
          background-color: #28a745;
          border-color: #28a745;
        }
        
        .free-filter-btn.btn-success .filter-icon {
          color: white;
        }
        
        // /* 确保在大屏幕上每行显示4个卡片 */
        // @media (min-width: 992px) {
        //   .container-fluid {
        //     max-width: 1400px;
        //     margin: 0 auto;
        //   }
        // }
        
        // /* 在中等屏幕上显示3个卡片 */
        // @media (min-width: 768px) and (max-width: 991.98px) {
        //   .container-fluid {
        //     max-width: 1100px;
        //     margin: 0 auto;
        //   }
        // }
      `}</style>
    </Container>
  );
}
