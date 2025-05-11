
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { restaurantInfo, menuItems, categories } from '@/data/mockData';
import { useAppContext } from '@/context/AppContext';

const Index = () => {
  const navigate = useNavigate();
  const { isLoggedIn, currentUser } = useAppContext();
  
  // Get popular items
  const popularItems = menuItems.filter(item => item.popular).slice(0, 3);
  
  return (
    <Layout>
      <div className="page-container">
        {/* Hero Section */}
        <div className="mb-6">
          <Card className="overflow-hidden">
            <div 
              className="h-40 bg-center bg-cover" 
              style={{ backgroundImage: `url(${restaurantInfo.coverImage})` }}
            />
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-restaurant-primary">{restaurantInfo.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{restaurantInfo.description}</p>
                </div>
                <div className="flex items-center bg-restaurant-secondary text-restaurant-text px-2 py-1 rounded-md">
                  <span className="text-sm font-bold">{restaurantInfo.rating} ★</span>
                </div>
              </div>
              
              <div className="mt-4">
                <Button 
                  className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90" 
                  onClick={() => navigate('/menu')}
                >
                  View Menu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Welcome Back - for logged in users */}
        {isLoggedIn && currentUser && (
          <div className="mb-6">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold">Welcome back, {currentUser.name.split(' ')[0]}!</h2>
                <p className="text-sm text-muted-foreground mb-3">Ready to order your favorites?</p>
                
                {currentUser.orderHistory && currentUser.orderHistory.length > 0 ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => navigate('/order-history')}
                  >
                    View Order History
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => navigate('/menu')}
                  >
                    Start Ordering
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Popular Items */}
        <div className="mb-6">
          <h2 className="section-heading">Popular Items</h2>
          <div className="space-y-3">
            {popularItems.map((item) => (
              <Card key={item.id} className="food-card">
                <CardContent className="p-3 flex items-center">
                  <div 
                    className="w-16 h-16 rounded-md mr-3 bg-center bg-cover" 
                    style={{ backgroundImage: `url(${item.image})` }}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-semibold">${item.price.toFixed(2)}</span>
                      <Button 
                        size="sm" 
                        onClick={() => navigate(`/menu/item/${item.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="text-center mt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/menu')}
                className="mx-auto"
              >
                View Full Menu
              </Button>
            </div>
          </div>
        </div>
        
        {/* Categories */}
        <div className="mb-6">
          <h2 className="section-heading">Browse Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <Card 
                key={category.id} 
                className="food-card cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/menu?category=${category.id}`)}
              >
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold">{category.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Restaurant Info */}
        <div className="mb-6">
          <h2 className="section-heading">Restaurant Info</h2>
          <Card>
            <CardContent className="p-4">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
