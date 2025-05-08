'use client';

import React, { useState, useEffect } from 'react';
import { Card, Tab, Tabs, Row, Col, Button, Form, Badge, Image, ListGroup } from 'react-bootstrap';
import { FaStar, FaRegStar, FaComment, FaShoppingCart, FaBook, FaUser, FaCalendarAlt, FaTag } from 'react-icons/fa';
import CheckReportDisplay from '@/components/CheckReportDisplay';
import { Knowledge_Intro_Simple, Knowledge_Intro_Pack } from '@/interface/knownoknownDag/knownoknownDagInterface';
import { Checkreport } from '@/interface/knownoknownDag/knowledgeEntryDagInterface';

interface DiscoverInfoProps {
  user: string;
  coverImageUrl: string;
  knowledgeIntroSimple: Knowledge_Intro_Simple;
  knowledgeIntroPack: Knowledge_Intro_Pack;
  changeStar: (publicOrder: string) => Promise<void>;
  getPvk: () => Promise<string>;
  goToReadKnowledge: (public_order: number, pvk: string, pbk: string, metadata: any) => Promise<void>;
}

const DiscoverInfo: React.FC<DiscoverInfoProps> = ({ 
  user, 
  coverImageUrl,
  knowledgeIntroSimple, 
  knowledgeIntroPack, 
  changeStar,
  getPvk,
  goToReadKnowledge,
}) => {
  // 状态管理
  const [activeTab, setActiveTab] = useState('intro');
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 检查当前用户是否已收藏
  const [isStarred, setIsStarred] = useState(false);
  
  // 初始化收藏状态
  useEffect(() => {
    // 检查当前用户是否已收藏该知识
      setIsStarred(knowledgeIntroSimple.is_stared);
      console.log('user', user);
      console.log('metadata', knowledgeIntroSimple.metadata);
  }, []);
  
  // 处理收藏点击
  const handleStarClick = async () => {
    setIsLoading(true);
    // 调用传入的changeStar函数同步状态
    await changeStar(knowledgeIntroSimple.metadata.public_order.toString());
    setIsStarred(!isStarred);
    setIsLoading(false);
  };
  
  // 处理评论提交
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 这里将来添加评论提交逻辑
    console.log('提交评论:', commentText);
    setCommentText('');
  };
  
  // 处理购买/阅读按钮点击
  const handlePurchase = () => {
    // 这里将来添加购买或阅读逻辑
  };
  
  // 处理购买/阅读按钮点击
  const handleRead = async () => {
    // 这里将来添加购买或阅读逻辑
    console.log('购买或阅读知识');
    const pvk = await getPvk();
    goToReadKnowledge(knowledgeIntroSimple.metadata.public_order, pvk, user, knowledgeIntroSimple.metadata);
    
  };
  
  return (
    <Card className="border-0 shadow">
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k || 'intro')}
        className="mb-3 px-3 pt-3"
      >
        <Tab eventKey="intro" title="简介">
          <Card.Body>
            {/* 知识标题和基本信息 */}
            <div className="mb-4">
              <h3 className="mb-2">{knowledgeIntroSimple.metadata.title}</h3>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  {knowledgeIntroSimple.metadata.price > 0 ? (
                    <Badge bg="primary" className="me-2">{knowledgeIntroSimple.metadata.price} Mina</Badge>
                  ) : (
                    <Badge bg="success" className="me-2">免费</Badge>
                  )}
                  <span className="text-muted">
                    <FaUser className="me-1" /> 作者: {knowledgeIntroSimple.metadata.author.substring(0, 8)}...
                  </span>
                </div>
                <div>
                  <span className="text-muted me-3">
                    <FaCalendarAlt className="me-1" /> 发布于: {new Date(knowledgeIntroSimple.metadata.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 知识封面图 */}
            {knowledgeIntroSimple.metadata.intro.image && (
              <div className="mb-4 text-center">
                <Image 
                  src={coverImageUrl} 
                  alt={knowledgeIntroSimple.metadata.title}
                  fluid
                  className="rounded"
                  style={{ maxHeight: '300px', objectFit: 'cover' }}
                />
              </div>
            )}
            
            {/* 知识简介内容 */}
            <div className="mb-4">
              <h5 className="mb-3">内容简介</h5>
              <p>{knowledgeIntroSimple.metadata.intro.content}</p>
            </div>
            
            {/* 标签 */}
            <div className="mb-4">
              <h5 className="mb-2">标签</h5>
              <div>
                {knowledgeIntroSimple.metadata.tags.map((tag, index) => (
                  <Badge 
                    key={index} 
                    bg="light" 
                    text="dark" 
                    className="me-2 mb-2 p-2"
                  >
                    <FaTag className="me-1" /> {tag}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* 统计信息 */}
            <Row className="mb-4 text-center">
              <Col xs={4}>
                <div className="p-3 bg-light rounded">
                  <h6 className="text-muted mb-1">销量</h6>
                  <p className="mb-0 fw-bold">{knowledgeIntroSimple.metadata.sales}/{knowledgeIntroSimple.metadata.sale_volume || '∞'}</p>
                </div>
              </Col>
              <Col xs={4}>
                <div className="p-3 bg-light rounded">
                  <h6 className="text-muted mb-1">收藏数</h6>
                  <p className="mb-0 fw-bold">{knowledgeIntroSimple.stars_num}</p>
                </div>
              </Col>
              <Col xs={4}>
                <div className="p-3 bg-light rounded">
                  <h6 className="text-muted mb-1">评论数</h6>
                  <p className="mb-0 fw-bold">{knowledgeIntroPack?.comments?.length || 0}</p>
                </div>
              </Col>
            </Row>
            
            {/* 评论区 */}
            <div className="mb-4">
              <h5 className="mb-3">评论区</h5>
              {knowledgeIntroPack?.comments && knowledgeIntroPack.comments.length > 0 ? (
                <ListGroup variant="flush">
                  {knowledgeIntroPack.comments.map((comment: any, index: number) => (
                    <ListGroup.Item key={index} className="px-0 py-3 border-bottom">
                      <div className="d-flex mb-2">
                        <div className="me-2">
                          <div className="bg-light rounded-circle p-2">
                            <FaUser />
                          </div>
                        </div>
                        <div>
                          <h6 className="mb-0">{comment.user_address.substring(0, 8)}...</h6>
                          <small className="text-muted">{new Date(comment.time).toLocaleString()}</small>
                        </div>
                      </div>
                      <p className="mb-0">{comment.content}</p>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted">暂无评论</p>
              )}
            </div>
            
            {/* 评论表单 */}
            <Form onSubmit={handleCommentSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>发表评论</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3} 
                  placeholder={user ? '请输入您的评论...' : '请先登录'} 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={!user}
                />
              </Form.Group>
            </Form>
            
            {/* 操作按钮 */}
            <div className="d-flex justify-content-between">
              <Button 
                variant={isStarred ? "warning" : "outline-warning"}
                onClick={handleStarClick}
                className="d-flex align-items-center"
                disabled={!user || isLoading}
              >
                {isStarred ? <FaStar className="me-2" /> : <FaRegStar className="me-2" />}
                {isStarred ? '已收藏' : '收藏'}
              </Button>
              
              <div>
                <Button 
                  variant="outline-primary" 
                  type="submit"
                  className="me-2 d-flex align-items-center"
                  disabled={!user || isLoading}
                >
                  <FaComment className="me-2" />
                  发表评论
                </Button>
                
                { (knowledgeIntroSimple.metadata.decryption_keys.free || user === knowledgeIntroSimple.metadata.author) ? (
                    <Button 
                        variant="primary"
                        onClick={handleRead}
                        className="d-flex align-items-center"
                        disabled={isLoading}
                    >
                        <FaBook className="me-2" />
                        阅读
                  </Button>
                  ) : (
                    <Button 
                        variant="primary"
                        onClick={handlePurchase}
                        className="d-flex align-items-center"
                        disabled={!user || isLoading}
                    >
                        <FaShoppingCart className="me-2" />
                        购买 ({knowledgeIntroSimple.metadata.price} Mina)
                    </Button>
                  )}
              </div>
            </div>
          </Card.Body>
        </Tab>
        
        <Tab eventKey="report" title="报告">
          <Card.Body>
            {knowledgeIntroPack?.check_report ? (
              <CheckReportDisplay report={knowledgeIntroPack.check_report as Checkreport} />
            ) : (
              <div className="text-center py-5">
                <p className="text-muted">暂无检测报告</p>
              </div>
            )}
          </Card.Body>
        </Tab>
      </Tabs>
    </Card>
  );
};

export default DiscoverInfo;
