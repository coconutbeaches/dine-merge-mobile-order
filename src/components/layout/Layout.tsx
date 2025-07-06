
import React, { ReactNode } from 'react';
import Image from 'next/image';
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
    <div className="relative min-h-screen w-full">
      <Image src="/bg-landing.png" alt="" fill priority className="object-cover object-center -z-10" />
      <div className="min-h-screen flex flex-col">
        <Header title={title} showBackButton={showBackButton} />
        
        <main className="flex-1">
          {children}
        </main>
        
      </div>
    </div>
  );
};

export default Layout;
