
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { restaurantInfo } from '@/data/mockData';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  title = restaurantInfo.name,
  showBackButton = false 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const goBack = () => {
    if (location.pathname === '/menu' || location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/cart') {
      navigate('/');
    } else {
      navigate(-1);
    }
  };
  
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center">
          {showBackButton && (
            <Button variant="ghost" size="sm" onClick={goBack} className="mr-2 p-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-bold text-black">{title}</h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
