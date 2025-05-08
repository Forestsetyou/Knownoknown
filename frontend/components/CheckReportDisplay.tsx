'use client';

import React, { useState } from 'react';
import { Card, Alert, Accordion, Badge, Row, Col, ProgressBar, Tab, Tabs, OverlayTrigger, Tooltip, ButtonGroup, Button } from 'react-bootstrap';
import { FaFileAlt, FaCode, FaImage, FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaFingerprint, FaFilter } from 'react-icons/fa';
import { Checkreport } from '@/interface/knownoknownDag/knowledgeEntryDagInterface';

interface CheckReportDisplayProps {
  report: Checkreport | null;
}

// 相似度区间类型
type SimilarityRange = 'all' | 'high' | 'medium' | 'low';

const CheckReportDisplay: React.FC<CheckReportDisplayProps> = ({ report }) => {
  // 筛选状态
  const [textFilter, setTextFilter] = useState<SimilarityRange>('all');
  const [codeFilter, setCodeFilter] = useState<SimilarityRange>('all');
  const [imageFilter, setImageFilter] = useState<SimilarityRange>('all');

  if (!report) {
    return (
      <Alert variant="info">
        <Alert.Heading>未找到检测报告</Alert.Heading>
        <p>尚未生成检测报告或报告数据为空。</p>
      </Alert>
    );
  }

  // 计算总体分数 (三个维度的平均值)
  const overallScore = (report.pure_text_score + report.code_section_score + report.image_score) / 3;
  
  // 确定分数对应的颜色 - 修改阈值
  const getScoreVariant = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  // 获取分数对应的文本描述
  const getScoreDescription = (score: number) => {
    if (score >= 80) return '原创性高';
    if (score >= 60) return '略微相似';
    return '抄袭嫌疑';
  };

  // 根据筛选条件过滤记录
  const filterRecords = (filterType: 'text' | 'code' | 'image', filter: SimilarityRange) => {
    const records = filterType === 'text' ? report.pure_text_similarity : 
      filterType === 'code' ? report.code_section_similarity : 
      report.image_similarity;

    if (filter === 'all') return records;
    
    return records.filter(record => {
      if (filter === 'high') return record.score >= 80;
      if (filter === 'medium') return record.score >= 60 && record.score < 80;
      return record.score < 60;
    });
  };

  // 查找文本分数来源
  const findTextScoreSource = () => {
    if (report.pure_text_similarity.length === 0) {
      return { id: '', title: '无相似内容', score: 100 };
    }
    
    // 找到分数最低的记录（即与报告分数相同的记录）
    const lowestScoreRecord = report.pure_text_similarity.reduce(
      (lowest, current) => current.score < lowest.score ? current : lowest,
      report.pure_text_similarity[0]
    );
    
    return {
      id: lowestScoreRecord.compared_knowledge_id,
      title: lowestScoreRecord.compared_knowledge_title || '未知标题',
      score: lowestScoreRecord.score
    };
  };

  // 查找代码分数来源
  const findCodeScoreSource = () => {
    if (report.code_section_similarity.length === 0) {
      return { id: '', title: '无相似内容', score: 100 };
    }
    
    // 找到分数最低的记录
    const lowestScoreRecord = report.code_section_similarity.reduce(
      (lowest, current) => current.score < lowest.score ? current : lowest,
      report.code_section_similarity[0]
    );
    
    return {
      id: lowestScoreRecord.compared_knowledge_id,
      title: lowestScoreRecord.compared_knowledge_title || '未知标题',
      score: lowestScoreRecord.score
    };
  };

  // 查找图片分数来源
  const findImageScoreSource = () => {
    if (report.image_similarity.length === 0) {
      return { id: '', title: '无相似内容', score: 100 };
    }
    
    // 找到分数最低的记录
    const lowestScoreRecord = report.image_similarity.reduce(
      (lowest, current) => current.score < lowest.score ? current : lowest,
      report.image_similarity[0]
    );
    
    return {
      id: lowestScoreRecord.compared_knowledge_id,
      title: lowestScoreRecord.compared_knowledge_title || '未知标题',
      score: lowestScoreRecord.score
    };
  };

  // 获取各维度分数来源
  const textScoreSource = findTextScoreSource();
  const codeScoreSource = findCodeScoreSource();
  const imageScoreSource = findImageScoreSource();

  // 渲染相似度记录卡片
  const renderSimilarityCard = (record: any, index: number, type: 'text' | 'code' | 'image') => {
    const scoreVariant = getScoreVariant(record.score);
    const scoreIcon = record.score >= 80 ? 
      <FaCheckCircle className="text-success" /> : 
      (record.score >= 60 ? <FaExclamationTriangle className="text-warning" /> : <FaExclamationTriangle className="text-danger" />);
    
    let cidField = '';
    let comparedCidField = '';
    
    if (type === 'text') {
      cidField = record.pure_text_fingerprint;
      comparedCidField = record.compared_pure_text_fingerprint;
    } else if (type === 'code') {
      cidField = record.code_section_cid;
      comparedCidField = record.compared_code_section_cid;
    } else {
      cidField = record.image_cid;
      comparedCidField = record.compared_image_cid;
    }
    
    return (
      <Card key={index} className="mb-3 border-0 shadow-sm">
        <Card.Header className={`bg-${scoreVariant} bg-opacity-10 d-flex justify-content-between align-items-center`}>
          <div className="d-flex align-items-center">
            {scoreIcon}
            <span className="ms-2 fw-bold">
              与知识「{record.compared_knowledge_title || '未知标题'}」的相似度
            </span>
          </div>
          <div className="d-flex align-items-center">
            <span className={`me-2 badge bg-${scoreVariant} bg-opacity-25 text-${scoreVariant}`}>
              {getScoreDescription(record.score)}
            </span>
            <Badge 
              bg={scoreVariant} 
              className="fs-6 px-3 py-2"
              style={{ borderRadius: '20px' }}
            >
              {record.score}分
            </Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-4">
          <Row>
            <Col md={6} className="mb-3">
              <div className="d-flex align-items-center mb-2">
                <FaFingerprint className="text-primary me-2" />
                <h6 className="mb-0 fw-bold">比较知识信息</h6>
              </div>
              <div className="ps-4 mt-3">
                <p className="mb-2">
                  <strong className="text-muted">知识ID:</strong> 
                  <span className="ms-2" style={{ wordBreak: 'break-all' }}>{record.compared_knowledge_id}</span>
                </p>
                <p className="mb-0">
                  <strong className="text-muted">知识标题:</strong> 
                  <span className="ms-2">{record.compared_knowledge_title || '未知'}</span>
                </p>
              </div>
            </Col>
            <Col md={6}>
              <div className="d-flex align-items-center mb-2">
                <FaFingerprint className="text-danger me-2" />
                <h6 className="mb-0 fw-bold">指纹信息</h6>
              </div>
              <div className="ps-4 mt-3">
                <p className="mb-2">
                  <strong className="text-muted">本知识{type === 'text' ? '文本指纹' : (type === 'code' ? '代码CID' : '图片CID')}:</strong>
                  <span className="ms-2 text-truncate d-inline-block" style={{ maxWidth: '200px' }} title={cidField}>
                    {cidField}
                  </span>
                </p>
                <p className="mb-0">
                  <strong className="text-muted">比较知识{type === 'text' ? '文本指纹' : (type === 'code' ? '代码CID' : '图片CID')}:</strong>
                  <span className="ms-2 text-truncate d-inline-block" style={{ maxWidth: '200px' }} title={comparedCidField}>
                    {comparedCidField}
                  </span>
                </p>
              </div>
            </Col>
          </Row>
          
          <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <strong>相似度评分</strong>
              <span className={`text-${scoreVariant} fw-bold`}>{record.score}分</span>
            </div>
            <ProgressBar 
              now={record.score} 
              variant={scoreVariant} 
              style={{ height: '10px', borderRadius: '5px' }} 
            />
          </div>
        </Card.Body>
      </Card>
    );
  };

  // 渲染筛选按钮组
  const renderFilterButtons = (
    currentFilter: SimilarityRange, 
    setFilter: React.Dispatch<React.SetStateAction<SimilarityRange>>,
    totalCount: number,
    filterType: 'text' | 'code' | 'image'
  ) => {
    const highCount = filterRecords(
      filterType, 
      'high'
    ).length;
      
    const mediumCount = filterRecords(
      filterType, 
      'medium'
    ).length;
      
    const lowCount = filterRecords(
      filterType, 
      'low'
    ).length;

    return (
      <div className="d-flex align-items-center mb-3">
        <FaFilter className="me-2 text-muted" />
        <span className="me-2 text-muted">筛选:</span>
        <ButtonGroup size="sm">
          <Button 
            variant={currentFilter === 'all' ? 'secondary' : 'outline-secondary'}
            onClick={() => setFilter('all')}
          >
            全部 ({highCount + mediumCount + lowCount})
          </Button>
          <Button 
            variant={currentFilter === 'high' ? 'success' : 'outline-success'}
            onClick={() => setFilter('high')}
            disabled={highCount === 0}
          >
            原创性高 ({highCount})
          </Button>
          <Button 
            variant={currentFilter === 'medium' ? 'warning' : 'outline-warning'}
            onClick={() => setFilter('medium')}
            disabled={mediumCount === 0}
          >
            略微相似 ({mediumCount})
          </Button>
          <Button 
            variant={currentFilter === 'low' ? 'danger' : 'outline-danger'}
            onClick={() => setFilter('low')}
            disabled={lowCount === 0}
          >
            抄袭嫌疑 ({lowCount})
          </Button>
        </ButtonGroup>
      </div>
    );
  };

  // 过滤后的记录
  const filteredTextRecords = filterRecords('text', textFilter);
  const filteredCodeRecords = filterRecords('code', codeFilter);
  const filteredImageRecords = filterRecords('image', imageFilter);

  return (
    <div className="check-report-display">
      {/* 总体分数展示 */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={4} className="text-center">
              <div className="d-inline-block position-relative" style={{ width: '120px', height: '120px' }}>
                <div 
                  className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                  style={{ fontSize: '2rem', fontWeight: 'bold' }}
                >
                  {Math.round(overallScore)}
                </div>
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path 
                    className="circle-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#eee"
                    strokeWidth="2"
                  />
                  <path 
                    className={`circle text-${getScoreVariant(overallScore)}`}
                    strokeDasharray={`${overallScore}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={`var(--bs-${getScoreVariant(overallScore)})`}
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="mt-2">
                <h5 className="mb-0">总体评分</h5>
                <p className="text-muted small mb-0">{getScoreDescription(overallScore)}</p>
              </div>
            </Col>
            <Col md={8}>
              <h5 className="mb-3">维度评分</h5>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="d-flex align-items-center">
                    <FaFileAlt className="me-2 text-primary" />
                    <span>文本相似度</span>
                    
                    {textScoreSource.id && (
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip>
                            来源: {textScoreSource.title}<br />
                            ID: {textScoreSource.id}
                          </Tooltip>
                        }
                      >
                        <span className="ms-2 text-muted small" style={{ cursor: 'help' }}>
                          <FaInfoCircle /> 来源: {textScoreSource.title.length > 10 ? textScoreSource.title.substring(0, 10) + '...' : textScoreSource.title}
                        </span>
                      </OverlayTrigger>
                    )}
                  </div>
                  <Badge bg={getScoreVariant(report.pure_text_score)}>{report.pure_text_score}分</Badge>
                </div>
                <ProgressBar 
                  now={report.pure_text_score} 
                  variant={getScoreVariant(report.pure_text_score)} 
                  style={{ height: '8px', borderRadius: '4px' }} 
                />
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="d-flex align-items-center">
                    <FaCode className="me-2 text-success" />
                    <span>代码相似度</span>
                    
                    {codeScoreSource.id && (
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip>
                            来源: {codeScoreSource.title}<br />
                            ID: {codeScoreSource.id}
                          </Tooltip>
                        }
                      >
                        <span className="ms-2 text-muted small" style={{ cursor: 'help' }}>
                          <FaInfoCircle /> 来源: {codeScoreSource.title.length > 10 ? codeScoreSource.title.substring(0, 10) + '...' : codeScoreSource.title}
                        </span>
                      </OverlayTrigger>
                    )}
                  </div>
                  <Badge bg={getScoreVariant(report.code_section_score)}>{report.code_section_score}分</Badge>
                </div>
                <ProgressBar 
                  now={report.code_section_score} 
                  variant={getScoreVariant(report.code_section_score)} 
                  style={{ height: '8px', borderRadius: '4px' }} 
                />
              </div>
              
              <div>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="d-flex align-items-center">
                    <FaImage className="me-2 text-info" />
                    <span>图片相似度</span>
                    
                    {imageScoreSource.id && (
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip>
                            来源: {imageScoreSource.title}<br />
                            ID: {imageScoreSource.id}
                          </Tooltip>
                        }
                      >
                        <span className="ms-2 text-muted small" style={{ cursor: 'help' }}>
                          <FaInfoCircle /> 来源: {imageScoreSource.title.length > 10 ? imageScoreSource.title.substring(0, 10) + '...' : imageScoreSource.title}
                        </span>
                      </OverlayTrigger>
                    )}
                  </div>
                  <Badge bg={getScoreVariant(report.image_score)}>{report.image_score}分</Badge>
                </div>
                <ProgressBar 
                  now={report.image_score} 
                  variant={getScoreVariant(report.image_score)} 
                  style={{ height: '8px', borderRadius: '4px' }} 
                />
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* 详细检测结果标签页 */}
      <Tabs defaultActiveKey="text" className="mb-4">
        {/* 文本相似度 */}
        <Tab eventKey="text" title={<span><FaFileAlt className="me-2" />文本相似度</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">文本相似度检测</h5>
              <Badge bg={getScoreVariant(report.pure_text_score)} className="fs-6">{report.pure_text_score}分</Badge>
            </Card.Header>
            <Card.Body>
              {report.pure_text_similarity.length > 0 ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <p className="mb-0">检测到 {report.pure_text_similarity.length} 条文本相似记录</p>
                    {renderFilterButtons(textFilter, setTextFilter, filteredTextRecords.length, 'text')}
                  </div>
                  
                  {filteredTextRecords.length > 0 ? (
                    filteredTextRecords.map((record, index) => 
                      renderSimilarityCard(record, index, 'text')
                    )
                  ) : (
                    <Alert variant="info">
                      当前筛选条件下没有相似记录
                    </Alert>
                  )}
                </>
              ) : (
                <Alert variant="success" className="d-flex align-items-center">
                  <FaCheckCircle className="me-3 fs-4" />
                  <div>
                    <strong>未检测到文本相似内容</strong>
                    <p className="mb-0 mt-1">您的文本内容具有较高的原创性，得分为满分。</p>
                  </div>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* 代码相似度 */}
        <Tab eventKey="code" title={<span><FaCode className="me-2" />代码相似度</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">代码相似度检测</h5>
              <Badge bg={getScoreVariant(report.code_section_score)} className="fs-6">{report.code_section_score}分</Badge>
            </Card.Header>
            <Card.Body>
              {report.code_section_similarity.length > 0 ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <p className="mb-0">检测到 {report.code_section_similarity.length} 条代码相似记录</p>
                    {renderFilterButtons(codeFilter, setCodeFilter, filteredCodeRecords.length, 'code')}
                  </div>
                  
                  {filteredCodeRecords.length > 0 ? (
                    filteredCodeRecords.map((record, index) => 
                      renderSimilarityCard(record, index, 'code')
                    )
                  ) : (
                    <Alert variant="info">
                      当前筛选条件下没有相似记录
                    </Alert>
                  )}
                </>
              ) : (
                <Alert variant="success" className="d-flex align-items-center">
                  <FaCheckCircle className="me-3 fs-4" />
                  <div>
                    <strong>未检测到代码相似内容</strong>
                    <p className="mb-0 mt-1">您的代码内容具有较高的原创性，得分为满分。</p>
                  </div>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* 图片相似度 */}
        <Tab eventKey="image" title={<span><FaImage className="me-2" />图片相似度</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">图片相似度检测</h5>
              <Badge bg={getScoreVariant(report.image_score)} className="fs-6">{report.image_score}分</Badge>
            </Card.Header>
            <Card.Body>
              {report.image_similarity.length > 0 ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <p className="mb-0">检测到 {report.image_similarity.length} 条图片相似记录</p>
                    {renderFilterButtons(imageFilter, setImageFilter, filteredImageRecords.length, 'image')}
                  </div>
                  
                  {filteredImageRecords.length > 0 ? (
                    filteredImageRecords.map((record, index) => 
                      renderSimilarityCard(record, index, 'image')
                    )
                  ) : (
                    <Alert variant="info">
                      当前筛选条件下没有相似记录
                    </Alert>
                  )}
                </>
              ) : (
                <Alert variant="success" className="d-flex align-items-center">
                  <FaCheckCircle className="me-3 fs-4" />
                  <div>
                    <strong>未检测到图片相似内容</strong>
                    <p className="mb-0 mt-1">您的图片内容具有较高的原创性，得分为满分。</p>
                  </div>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
      
      {/* 添加圆形进度条的CSS */}
      <style jsx global>{`
        .circular-chart {
          display: block;
          margin: 0 auto;
          max-width: 100%;
          max-height: 100%;
          transform: rotate(-90deg);
        }
        
        .circle-bg {
          fill: none;
          stroke: #eee;
          stroke-width: 2;
        }
        
        .circle {
          fill: none;
          stroke-width: 2;
          stroke-linecap: round;
          animation: progress 1s ease-out forwards;
        }
        
        @keyframes progress {
          0% {
            stroke-dasharray: 0 100;
          }
        }
      `}</style>
    </div>
  );
};

export default CheckReportDisplay;
