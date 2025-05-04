'use client';

import React from 'react';
import { Nav } from 'react-bootstrap';
import { useRouter } from '@/context/RouterContext';

export const navItems = [
  { path: '/discover', icon: 'fas fa-compass', label: '发现' },
  { path: '/publish', icon: 'fas fa-pen-to-square', label: '发布' },
  { path: '/notifications', icon: 'fas fa-bell', label: '通知' },
  { path: '/verify', icon: 'fas fa-check-circle', label: '验证' },
  { path: '/reading', icon: 'fas fa-book-open', label: '阅读' },
  { path: '/profile', icon: 'fas fa-user', label: '个人' }
]; 
const SideNav = () => {
  const { currentRoute, navigate } = useRouter();
  
  // 处理导航点击
  const handleNavClick = (route: string, e: React.MouseEvent) => {
    e.preventDefault();
    navigate(route as any);
  };
  
  return (
    <div className="d-flex flex-column p-2 h-100">
      <div className="logo-container text-center">
        <h3 className="platform-logo mb-1">KnowNoKnown</h3>
        <p className="platform-slogan mb-2">去中心化的知识付费平台</p>
        <div className="separator"></div>
      </div>
      <Nav className="flex-column mb-auto">
        {navItems.map((item) => (
          <a 
            key={item.path}
            href={item.path}
            className={`nav-link ${currentRoute === item.path.substring(1) ? 'active' : ''}`}
            onClick={(e) => handleNavClick(item.path.substring(1), e)}
          >
            <i className={item.icon}></i>
            <span>{item.label}</span>
          </a>
        ))}
      </Nav>
    </div>
  );
};

export default SideNav; 