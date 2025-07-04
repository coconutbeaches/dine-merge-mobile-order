"use client";
// @ts-nocheck
// @ts-nocheck

import React from 'react';

import Link from 'next/link';

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = React.use(params);
  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-bold mb-4">Category: {categoryId}</h1>
      <Link href="/" className="text-blue-600 underline">
        Back to Home
      </Link>
    </div>
  );
}