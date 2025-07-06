'use client';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingCart, User, Settings } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { restaurantInfo } from '@/data/mockData';
import { hasGuestSession } from '@/utils/guestSession';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  title = restaurantInfo.name,
  showBackButton = false 
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { cart, isLoggedIn, currentUser, cartIsLoading } = useAppContext(); // Include currentUser to check admin role

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const shouldShowBadge = !cartIsLoading && totalItems > 0;
  
  const goBack = () => {
    if (
      pathname === '/menu' ||
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname === '/cart' ||
      pathname === '/profile'
    ) {
      router.push('/');
    } else {
      router.back();
    }
  };
  
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* Left side: back button, logo, title */}
        <div className="flex items-center">
          {showBackButton && (
            <Button variant="ghost" size="sm" onClick={goBack} className="mr-2 p-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div onClick={() => router.push('/menu')} className="cursor-pointer">
            <img src="/lovable-uploads/c739d1da-89bf-4732-a560-e0d9fcaf13ac.png" alt="Coconut Beach Logo" className="h-[1.8rem]" />
          </div>
        </div>

        {/* Right side: Admin Settings, Cart and Profile/Login buttons */}
        <div className="flex items-center space-x-1">
          {currentUser?.role === 'admin' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin')}
              className="flex items-center"
            >
              <Settings className="h-[2.18rem] w-[2.18rem]" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => router.push('/cart')} className="relative flex items-center">
            <ShoppingCart className="h-[2.18rem] w-[2.18rem]" />
            {shouldShowBadge && (
              <span className="absolute -top-1 -right-1 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {totalItems}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            // Check if user is a hotel guest first
            const isHotelGuest = hasGuestSession();
            
            if (!isLoggedIn && !isHotelGuest) {
              router.push('/login');
            } else if (isLoggedIn && currentUser?.role === 'admin') {
              router.push('/profile');
            } else {
              // Both hotel guests and regular users go to order history
              router.push('/order-history');
            }
          }} className="flex items-center">
            <User className="h-[2.38rem] w-[2.38rem]" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
