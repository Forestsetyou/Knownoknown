'use client';

import React from 'react';
import { useRouter } from '@/context/RouterContext';
import { Container } from 'react-bootstrap';
import Publish from '@/components/Publish';
import Verify from '@/components/Verify';
import Discover from '@/components/Discover';
import Reading from '@/components/Reading';

// 页面组件映射
const PageComponents: Record<string, React.ComponentType<any>> = {
  'discover': Discover,
  'publish': Publish,
  'notifications': () => (
    <Container className="py-3">
      <h4 className="mb-4">通知页面</h4>
      <p className="text-muted">此页面正在开发中...</p>
    </Container>
  ),
  'verify': Verify,
  'reading': Reading,
  'profile': () => (
    <Container className="py-3">
      <h4 className="mb-4">个人页面</h4>
      <p className="text-muted">此页面正在开发中...</p>
    </Container>
  )
};

export default function Home() {
  const { currentRoute } = useRouter();
  
  // 获取当前路由对应的组件
  const CurrentComponent = PageComponents[currentRoute] || PageComponents['publish'];
  
  // 使用currentRoute作为key，确保路由变化时组件会被完全卸载和重新挂载
  return <CurrentComponent key={currentRoute} />;
} 