'use client';

import React from 'react';
import { useRouter } from '@/context/RouterContext';
import Publish from '@/components/Publish';
import { Container } from 'react-bootstrap';

// 页面组件映射
const PageComponents: Record<string, React.ComponentType<any>> = {
  'discover': () => (
    <Container className="py-3">
      <h4 className="mb-4">发现页面</h4>
      <p className="text-muted">此页面正在开发中...</p>
    </Container>
  ),
  'publish': Publish,
  'notifications': () => (
    <Container className="py-3">
      <h4 className="mb-4">通知页面</h4>
      <p className="text-muted">此页面正在开发中...</p>
    </Container>
  ),
  'verify': () => (
    <Container className="py-3">
      <h4 className="mb-4">验证页面</h4>
      <p className="text-muted">此页面正在开发中...</p>
    </Container>
  ),
  'reading': () => (
    <Container className="py-3">
      <h4 className="mb-4">阅读页面</h4>
      <p className="text-muted">此页面正在开发中...</p>
    </Container>
  ),
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