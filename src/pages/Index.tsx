
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { restaurantInfo, menuItems, categories } from '@/data/mockData';
import { useAppContext } from '@/context/AppContext';

const Index = () => {
  const navigate = useNavigate();
  const { isLoggedIn, currentUser } = useAppContext();
  
  // Get popular items
  const popularItems = menuItems.filter(item => item.popular).slice(0, 4);
  
  return (
    <Layout>
      <div className="page-container">
        {/* Hero Section */}
        <div className="mb-6">
          <Card className="overflow-hidden border-none shadow-none">
            <div 
              className="h-40 bg-center bg-cover" 
              style={{ backgroundImage: `url(${restaurantInfo.coverImage})` }}
            />
            <div className="p-4 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-black">{restaurantInfo.name}</h1>
                  <p className="text-sm text-gray-600 mt-1">{restaurantInfo.description}</p>
                </div>
                <div className="flex items-center bg-black text-white px-2 py-1 rounded-md">
                  <span className="text-sm font-bold">{restaurantInfo.rating} ★</span>
                </div>
              </div>
              
              <div className="mt-4">
                <Button 
                  className="w-full bg-black hover:bg-black/90 text-white" 
                  onClick={() => navigate('/menu')}
                >
                  View Menu
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Welcome Back - for logged in users */}
        {isLoggedIn && currentUser && (
          <div className="mb-6">
            <Card className="border border-gray-200">
              <div className="p-4">
                <h2 className="text-lg font-semibold">Welcome back, {currentUser.name.split(' ')[0]}!</h2>
                <p className="text-sm text-gray-600 mb-3">Ready to order your favorites?</p>
                
                {currentUser.orderHistory && currentUser.orderHistory.length > 0 ? (
                  <Button 
                    className="w-full border-black text-black hover:bg-gray-100" 
                    variant="outline"
                    onClick={() => navigate('/order-history')}
                  >
                    View Order History
                  </Button>
                ) : (
                  <Button 
                    className="w-full border-black text-black hover:bg-gray-100" 
                    variant="outline"
                    onClick={() => navigate('/menu')}
                  >
                    Start Ordering
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
        
        {/* Categories with Black Headers */}
        {categories.map((category) => {
          const categoryItems = menuItems.filter(item => item.category === category.id).slice(0, 4);
          if (categoryItems.length === 0) return null;
          
          return (
            <div key={category.id} className="mb-8">
              <div className="category-header">
                {category.name}
              </div>
              <div className="menu-grid">
                {categoryItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="food-card cursor-pointer relative"
                    onClick={() => navigate(`/menu/item/${item.id}`)}
                  >
                    <div className="aspect-square overflow-hidden mb-2">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="menu-item-name">{item.name}</h3>
                    <p className="menu-item-price">${item.price.toFixed(2)}</p>
                    {item.popular && (
                      <span className="popular-badge">Popular</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/menu?category=${category.id}`)}
                  className="border-black text-black hover:bg-gray-100"
                >
                  See All {category.name}
                </Button>
              </div>
            </div>
          );
        })}
        
        {/* Restaurant Info */}
        <div className="mb-6">
          <h2 className="section-heading">Restaurant Info</h2>
          <Card className="border border-gray-200">
            <div className="p-4">
              <div className="space-y-2">
                <div>
                  <strong className="text-sm">Address:</strong>
                  <p className="text-sm">{restaurantInfo.address.street}, {restaurantInfo.address.city}</p>
                </div>
                <div>
                  <strong className="text-sm">Phone:</strong>
                  <p className="text-sm">{restaurantInfo.phone}</p>
                </div>
                <div>
                  <strong className="text-sm">Hours Today:</strong>
                  <p className="text-sm">
                    {restaurantInfo.hours[Object.keys(restaurantInfo.hours)[0]].open} - 
                    {restaurantInfo.hours[Object.keys(restaurantInfo.hours)[0]].close}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
