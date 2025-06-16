
import React, { ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title, 
  showBackButton = false
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header title={title} showBackButton={showBackButton} />
      
      <main className="flex-1">
        {children}
      </main>
      
    </div>
  );
};

export default Layout;
