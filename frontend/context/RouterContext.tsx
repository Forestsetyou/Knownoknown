import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';


// 定义路由类型
export type RouteKey = 'discover' | 'publish' | 'notifications' | 'verify' | 'reading' | 'profile';

// 定义路由上下文类型
interface RouterContextType {
  currentRoute: RouteKey;
  navigate: (route: RouteKey, params?: Record<string, string>) => void;
  params: Record<string, string>;
  goBack: () => void;
  history: RouteKey[];
}

// 创建路由上下文
export const RouterContext = createContext<RouterContextType>({
  currentRoute: 'publish',
  navigate: () => {},
  params: {},
  goBack: () => {},
  history: ['publish']
});

// 自定义钩子，用于访问路由上下文
export const useRouter = () => useContext(RouterContext);

// 路由提供者属性类型
interface RouterProviderProps {
  children: ReactNode;
  initialRoute?: RouteKey;
}

// 路由提供者组件
export const RouterProvider = ({ children, initialRoute = 'publish' }: RouterProviderProps) => {
  // 当前路由状态
  const [currentRoute, setCurrentRoute] = useState<RouteKey>(initialRoute);
  
  // 路由参数状态
  const [params, setParams] = useState<Record<string, string>>({});
  
  // 路由历史记录
  const [history, setHistory] = useState<RouteKey[]>([initialRoute]);
  
  // 导航到指定路由
  const navigate = (route: RouteKey, newParams: Record<string, string> = {}) => {
    setCurrentRoute(route);
    setParams(newParams);
    setHistory(prev => [...prev, route]);
    
    // 可选：更新URL以反映路由变化（不会触发页面刷新）
    const url = `/${route}${Object.keys(newParams).length > 0 
      ? '?' + new URLSearchParams(newParams).toString() 
      : ''}`;
    window.history.pushState(null, '', url);
  };
  
  // 返回上一个路由
  const goBack = () => {
    if (history.length > 1) {
      // 移除当前路由
      const newHistory = [...history];
      newHistory.pop();
      
      // 设置为上一个路由
      const previousRoute = newHistory[newHistory.length - 1];
      setCurrentRoute(previousRoute);
      setHistory(newHistory);
      
      // 更新URL
      window.history.back();
    }
  };
  
  // 监听浏览器的后退/前进按钮
  useEffect(() => {
    const handlePopState = () => {
      // 从URL中提取路由和参数
      const path = window.location.pathname.substring(1) || 'publish';
      const urlParams = Object.fromEntries(new URLSearchParams(window.location.search));
      
      // 验证路由是否有效
      const validRoute = ['discover', 'publish', 'notifications', 'verify', 'reading', 'profile'].includes(path)
        ? path as RouteKey
        : 'publish';
      
      setCurrentRoute(validRoute);
      setParams(urlParams);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // 提供路由上下文
  return (
    <RouterContext.Provider value={{ currentRoute, navigate, params, goBack, history }}>
      {children}
    </RouterContext.Provider>
  );
};
