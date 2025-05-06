'use client';

import React from 'react';
import { Card, Alert, Accordion, Badge, Row, Col, ProgressBar, Tab, Tabs, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaFileAlt, FaCode, FaImage, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { Checkreport } from '@/interface/knownoknownDag/knowledgeEntryDagInterface';

interface CheckReportDisplayProps {
  report: Checkreport | null;
}

const CheckReportDisplay: React.FC<CheckReportDisplayProps> = ({ report }) => {
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
  
  // 确定分数对应的颜色
  const getScoreVariant = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'danger';
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
                <ProgressBar 
                  variant={getScoreVariant(overallScore)}
                  now={overallScore} 
                  min={0}
                  max={100}
                  style={{ 
                    height: '120px', 
                    width: '120px', 
                    borderRadius: '50%',
                    background: '#f0f0f0',
                    transform: 'rotate(-90deg)',
                    clipPath: 'circle(50%)'
                  }}
                />
              </div>
            </Col>
            <Col md={8}>
              <h4 className="mb-3">检测报告总览</h4>
              <div className="d-flex flex-column gap-2">
                <div className="d-flex justify-content-between align-items-center">
                  <span><FaFileAlt className="me-2" />文本相似度</span>
                  <div className="d-flex align-items-center">
                    <Badge bg={getScoreVariant(report.pure_text_score)}>{report.pure_text_score}分</Badge>
                    {textScoreSource.id && (
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip id="text-source-tooltip">
                            <strong>来源知识:</strong> {textScoreSource.title}<br />
                            <strong>知识ID:</strong> {textScoreSource.id.substring(0, 12)}...
                          </Tooltip>
                        }
                      >
                        <span className="ms-2 text-muted" style={{ fontSize: '0.85rem', cursor: 'help' }}>
                          <FaInfoCircle className="me-1" />
                          来源: {textScoreSource.title.length > 15 ? textScoreSource.title.substring(0, 15) + '...' : textScoreSource.title}
                        </span>
                      </OverlayTrigger>
                    )}
                  </div>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span><FaCode className="me-2" />代码相似度</span>
                  <div className="d-flex align-items-center">
                    <Badge bg={getScoreVariant(report.code_section_score)}>{report.code_section_score}分</Badge>
                    {codeScoreSource.id && (
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip id="code-source-tooltip">
                            <strong>来源知识:</strong> {codeScoreSource.title}<br />
                            <strong>知识ID:</strong> {codeScoreSource.id.substring(0, 12)}...
                          </Tooltip>
                        }
                      >
                        <span className="ms-2 text-muted" style={{ fontSize: '0.85rem', cursor: 'help' }}>
                          <FaInfoCircle className="me-1" />
                          来源: {codeScoreSource.title.length > 15 ? codeScoreSource.title.substring(0, 15) + '...' : codeScoreSource.title}
                        </span>
                      </OverlayTrigger>
                    )}
                  </div>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span><FaImage className="me-2" />图片相似度</span>
                  <div className="d-flex align-items-center">
                    <Badge bg={getScoreVariant(report.image_score)}>{report.image_score}分</Badge>
                    {imageScoreSource.id && (
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip id="image-source-tooltip">
                            <strong>来源知识:</strong> {imageScoreSource.title}<br />
                            <strong>知识ID:</strong> {imageScoreSource.id.substring(0, 12)}...
                          </Tooltip>
                        }
                      >
                        <span className="ms-2 text-muted" style={{ fontSize: '0.85rem', cursor: 'help' }}>
                          <FaInfoCircle className="me-1" />
                          来源: {imageScoreSource.title.length > 15 ? imageScoreSource.title.substring(0, 15) + '...' : imageScoreSource.title}
                        </span>
                      </OverlayTrigger>
                    )}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 三个维度的详细报告 */}
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
                  <p>检测到 {report.pure_text_similarity.length} 条文本相似记录</p>
                  <Accordion className="mt-3">
                    {report.pure_text_similarity.map((record, index) => (
                      <Accordion.Item key={index} eventKey={index.toString()}>
                        <Accordion.Header>
                          <div className="d-flex justify-content-between align-items-center w-100 me-3">
                            <span>与知识 {record.compared_knowledge_title || record.compared_knowledge_id.substring(0, 8) + '...'} 的相似度</span>
                            <Badge bg={getScoreVariant(record.score)}>{record.score}分</Badge>
                          </div>
                        </Accordion.Header>
                        <Accordion.Body>
                          <div className="mb-2">
                            <strong>比较知识ID:</strong> {record.compared_knowledge_id}
                          </div>
                          <div className="mb-2">
                            <strong>比较知识标题:</strong> {record.compared_knowledge_title || '未知'}
                          </div>
                          <div className="mb-2">
                            <strong>本知识文本CID:</strong> {record.text_cid}
                          </div>
                          <div className="mb-2">
                            <strong>比较知识文本CID:</strong> {record.compared_text_cid}
                          </div>
                          <div>
                            <strong>相似度得分:</strong> {record.score}
                          </div>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </>
              ) : (
                <Alert variant="success">
                  <FaCheckCircle className="me-2" />
                  未检测到文本相似内容，得分为满分。
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
                  <p>检测到 {report.code_section_similarity.length} 条代码相似记录</p>
                  <Accordion className="mt-3">
                    {report.code_section_similarity.map((record, index) => (
                      <Accordion.Item key={index} eventKey={index.toString()}>
                        <Accordion.Header>
                          <div className="d-flex justify-content-between align-items-center w-100 me-3">
                            <span>与知识 {record.compared_knowledge_title || record.compared_knowledge_id.substring(0, 8) + '...'} 的相似度</span>
                            <Badge bg={getScoreVariant(record.score)}>{record.score}分</Badge>
                          </div>
                        </Accordion.Header>
                        <Accordion.Body>
                          <div className="mb-2">
                            <strong>比较知识ID:</strong> {record.compared_knowledge_id}
                          </div>
                          <div className="mb-2">
                            <strong>比较知识标题:</strong> {record.compared_knowledge_title || '未知'}
                          </div>
                          <div className="mb-2">
                            <strong>本知识代码CID:</strong> {record.code_section_cid}
                          </div>
                          <div className="mb-2">
                            <strong>比较知识代码CID:</strong> {record.compared_code_section_cid}
                          </div>
                          <div>
                            <strong>相似度得分:</strong> {record.score}
                          </div>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </>
              ) : (
                <Alert variant="success">
                  <FaCheckCircle className="me-2" />
                  未检测到代码相似内容，得分为满分。
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
                  <p>检测到 {report.image_similarity.length} 条图片相似记录</p>
                  <Accordion className="mt-3">
                    {report.image_similarity.map((record, index) => (
                      <Accordion.Item key={index} eventKey={index.toString()}>
                        <Accordion.Header>
                          <div className="d-flex justify-content-between align-items-center w-100 me-3">
                            <span>与知识 {record.compared_knowledge_title || record.compared_knowledge_id.substring(0, 8) + '...'} 的相似度</span>
                            <Badge bg={getScoreVariant(record.score)}>{record.score}分</Badge>
                          </div>
                        </Accordion.Header>
                        <Accordion.Body>
                          <div className="mb-2">
                            <strong>比较知识ID:</strong> {record.compared_knowledge_id}
                          </div>
                          <div className="mb-2">
                            <strong>比较知识标题:</strong> {record.compared_knowledge_title || '未知'}
                          </div>
                          <div className="mb-2">
                            <strong>本知识图片CID:</strong> {record.image_cid}
                          </div>
                          <div className="mb-2">
                            <strong>比较知识图片CID:</strong> {record.compared_image_cid}
                          </div>
                          <div>
                            <strong>相似度得分:</strong> {record.score}
                          </div>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </>
              ) : (
                <Alert variant="success">
                  <FaCheckCircle className="me-2" />
                  未检测到图片相似内容，得分为满分。
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
};

export default CheckReportDisplay;
