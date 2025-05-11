
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { menuItems, categories } from '@/data/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const Menu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get category from URL query params
  const searchParams = new URLSearchParams(location.search);
  const selectedCategoryId = searchParams.get('category');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(menuItems);
  const [activeCategory, setActiveCategory] = useState<string | null>(selectedCategoryId);
  
  // Filter menu items when search query or category changes
  useEffect(() => {
    let filtered = menuItems;
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by category
    if (activeCategory) {
      filtered = filtered.filter(item => item.category === activeCategory);
    }
    
    setFilteredItems(filtered);
  }, [searchQuery, activeCategory]);
  
  return (
    <Layout title="Menu" showBackButton>
      <div className="page-container">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search menu..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Categories Horizontal Scroll */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex space-x-2">
            <Button
              variant={activeCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(null)}
              className={`whitespace-nowrap ${activeCategory === null ? "bg-restaurant-primary hover:bg-restaurant-primary/90" : ""}`}
            >
              All
            </Button>
            
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className={`whitespace-nowrap ${activeCategory === category.id ? "bg-restaurant-primary hover:bg-restaurant-primary/90" : ""}`}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Menu Items */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No menu items found. Try a different search.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className="food-card cursor-pointer"
                onClick={() => navigate(`/menu/item/${item.id}`)}
              >
                <CardContent className="p-3 flex">
                  <div 
                    className="w-20 h-20 rounded-md mr-3 bg-center bg-cover" 
                    style={{ backgroundImage: `url(${item.image})` }}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-semibold">{item.name}</h3>
                      {item.popular && (
                        <span className="bg-restaurant-accent/20 text-restaurant-primary text-xs px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-semibold">${item.price.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Menu;
