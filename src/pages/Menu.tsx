import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/supabaseTypes';
import { useAppContext } from '@/context/AppContext';
import { formatThaiCurrency } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

const Menu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAdminCustomerContext } = useAppContext();
  
  // Get category from URL query params
  const searchParams = new URLSearchParams(location.search);
  const selectedCategoryId = searchParams.get('category');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(selectedCategoryId);
  
  // Check if this is an admin creating an order for a customer
  const adminCustomerContext = location.state as { adminCustomerId?: string; adminCustomerName?: string } | null;
  
  // Set admin customer context if present
  useEffect(() => {
    if (adminCustomerContext?.adminCustomerId) {
      setAdminCustomerContext({
        customerId: adminCustomerContext.adminCustomerId,
        customerName: adminCustomerContext.adminCustomerName || 'Customer'
      });
    }
    
    // Cleanup when leaving the page
    return () => {
      if (adminCustomerContext?.adminCustomerId) {
        setAdminCustomerContext(null);
      }
    };
  }, [adminCustomerContext, setAdminCustomerContext]);
  
  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
        
      if (error) throw error;
      return data as Category[];
    },
  });
  
  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ['menu-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*');
        
      if (error) throw error;
      return data as Product[];
    },
  });
  
  // Group menu items by category
  const groupedProducts = filteredProducts.reduce((acc, item) => {
    const categoryId = item.category_id || 'uncategorized';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(item);
    return acc;
  }, {} as Record<string, Product[]>);
  
  // Filter products when search query or category changes
  useEffect(() => {
    if (!products) return;
    
    let filtered = [...products];
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Filter by category
    if (activeCategory) {
      filtered = filtered.filter(item => item.category_id === activeCategory);
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, activeCategory, products]);
  
  // Replace the old formatPrice with the global standardized format
  const formatPrice = (price: number) => {
    // Use our global formatter that always uses no decimals
    return formatThaiCurrency(price);
  };
  
  return (
    <Layout 
      title={adminCustomerContext?.adminCustomerId ? `Creating Order for ${adminCustomerContext.adminCustomerName}` : "Menu"} 
      showBackButton
    >
      <div className="page-container">
        {adminCustomerContext?.adminCustomerId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              Creating order for: <strong>{adminCustomerContext.adminCustomerName}</strong>
            </p>
          </div>
        )}
        
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
            
            {categories && categories.map((category) => (
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
        {isLoading ? (
          <div className="text-center py-8">
            <p>Loading menu items...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No menu items found. Try a different search.</p>
          </div>
        ) : (
          <div>
            {activeCategory === null ? (
              // Display grouped by categories
              Object.entries(groupedProducts).map(([categoryId, items]) => {
                const category = categories?.find(c => c.id === categoryId) || { name: 'Uncategorized' };
                return (
                  <div key={categoryId} className="mb-8">
                    <div className="category-header">
                      {categoryId === 'uncategorized' ? 'Uncategorized' : category.name}
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
                              src={item.image_url || '/placeholder.svg'} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <h3 className="menu-item-name">{item.name}</h3>
                          <p className="menu-item-price">{formatPrice(item.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Display single category
              <div className="menu-grid">
                {filteredProducts.map((item) => (
                  <div 
                    key={item.id} 
                    className="food-card cursor-pointer relative"
                    onClick={() => navigate(`/menu/item/${item.id}`)}
                  >
                    <div className="aspect-square overflow-hidden mb-2">
                      <img 
                        src={item.image_url || '/placeholder.svg'} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="menu-item-name">{item.name}</h3>
                    <p className="menu-item-price">{formatPrice(item.price)}</p>
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
