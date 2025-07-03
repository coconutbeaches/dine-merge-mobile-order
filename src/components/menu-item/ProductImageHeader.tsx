
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductImageHeaderProps {
  isLoading: boolean;
  error: unknown;
  productDescription: string | null;
  imageUrl: string | null;
}

const ProductImageHeader: React.FC<ProductImageHeaderProps> = ({
  isLoading,
  error,
  productDescription,
  imageUrl
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="page-container text-center py-10">
        <p>Loading product details...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="page-container text-center py-10">
        <AlertTriangle className="h-12 w-12 mx-auto text-black mb-4" />
        <h2 className="text-xl font-bold mb-2">Menu Item Not Found</h2>
        <p className="text-gray-600 mb-6">The item you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/menu')} className="bg-black hover:bg-black/90 text-white">
          Back to Menu
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Item Image */}
      <div 
        className="h-80 w-full bg-center bg-cover rounded-none mb-4" 
        style={{ backgroundImage: `url(${imageUrl || '/placeholder.svg'})` }}
      />
      
      {/* Item Details */}
      {(productDescription && productDescription !== 'No description') && (
        <div className="mb-6">
          <p className="text-gray-600">{productDescription}</p>
        </div>
      )}
    </>
  );
};

export default ProductImageHeader;
