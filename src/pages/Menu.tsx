
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { menuItems, categories } from '@/data/mockData';
import { Card } from '@/components/ui/card';
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
  
  // Group menu items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);
  
  // Filter menu items when search query or category changes
  useEffect(() => {
    let filtered = menuItems;
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
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
            className="pl-9 border-black"
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
              className={`whitespace-nowrap ${activeCategory === null ? "bg-black text-white hover:bg-black/90" : "border-black text-black hover:bg-gray-100"}`}
            >
              All
            </Button>
            
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className={`whitespace-nowrap ${activeCategory === category.id ? "bg-black text-white hover:bg-black/90" : "border-black text-black hover:bg-gray-100"}`}
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
          <div>
            {activeCategory === null ? (
              // Display grouped by categories
              Object.entries(groupedItems).map(([categoryId, items]) => {
                const category = categories.find(c => c.id === categoryId);
                return (
                  <div key={categoryId} className="mb-8">
                    <div className="category-header">
                      {category?.name}
                    </div>
                    <div className="menu-grid">
                      {items.map((item) => (
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
                  </div>
                );
              })
            ) : (
              // Display single category
              <div className="menu-grid">
                {filteredItems.map((item) => (
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
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Menu;
