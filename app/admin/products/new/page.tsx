'use client';
import Layout from '@/components/layout/Layout';
import ProductFormMain from '@/components/admin/products/ProductFormMain';

export default function NewProductPage() {
  return (
    <Layout title="Add New Product" showBackButton={true}>
      <ProductFormMain />
    </Layout>
  );
}
