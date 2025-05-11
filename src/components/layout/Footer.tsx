
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Home, Menu, User, ShoppingCart } from 'lucide-react';

const Footer = () => {
  const { cart, isLoggedIn } = useAppContext();
  const navigate = useNavigate();
  
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 shadow-lg z-10">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="flex flex-col items-center"
        >
          <Home className="h-5 w-5 mb-1" />
          <span className="text-xs">Home</span>
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={() => navigate('/menu')}
          className="flex flex-col items-center"
        >
          <Menu className="h-5 w-5 mb-1" />
          <span className="text-xs">Menu</span>
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={() => navigate('/cart')}
          className="flex flex-col items-center relative"
        >
          <ShoppingCart className="h-5 w-5 mb-1" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-restaurant-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              {totalItems}
            </span>
          )}
          <span className="text-xs">Cart</span>
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={() => navigate(isLoggedIn ? '/profile' : '/login')}
          className="flex flex-col items-center"
        >
          <User className="h-5 w-5 mb-1" />
          <span className="text-xs">{isLoggedIn ? 'Profile' : 'Login'}</span>
        </Button>
      </div>
    </footer>
  );
};

export default Footer;
