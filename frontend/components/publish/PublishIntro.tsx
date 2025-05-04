'use client';

import React, { useContext } from 'react';
import { IpfsServiceContext } from '@/service/ipfsService';

export default function PublishIntro() {
  // IPFS服务
  const ipfsService = useContext(IpfsServiceContext);
  
  return (
    <div className="text-center py-5">
      <p className="text-muted">知识简介标签页（待开发）</p>
    </div>
  );
} 