import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductGrid from './ProductGrid';
import { DndContext } from '@dnd-kit/core'; // Needed to wrap SortableContext items
import { ProductWithCategory } from '@/types/supabaseTypes'; // Assuming this type is defined

// Mock lucide-react icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    GripVertical: () => <div data-testid="grip-vertical-icon" />,
    Plus: () => <div data-testid="plus-icon" />,
  };
});

// Mock navigate
const mockNavigate = vi.fn();

const mockProducts: ProductWithCategory[] = [
  { id: '1', name: 'Product 1', price: 100, sort_order: 0, image_url: null, description: null, category_id: 'cat1', created_at: '2023-01-01', user_id: 'user1', categories: { id: 'cat1', name: 'Category 1' } },
  { id: '2', name: 'Product 2', price: 200, sort_order: 1, image_url: null, description: null, category_id: 'cat1', created_at: '2023-01-01', user_id: 'user1', categories: { id: 'cat1', name: 'Category 1' } },
  { id: '3', name: 'Product 3', price: 300, sort_order: 2, image_url: null, description: null, category_id: 'cat2', created_at: '2023-01-01', user_id: 'user1', categories: { id: 'cat2', name: 'Category 2' } },
];

const mockCategories = [
  { id: 'cat1', name: 'Category 1' },
  { id: 'cat2', name: 'Category 2' },
];

describe('ProductGrid', () => {
  it('renders loading state correctly', () => {
    render(
      <ProductGrid
        products={[]}
        isLoading={true}
        categoryFilter={null}
        categories={[]}
        handleAddProduct={vi.fn()}
        navigate={mockNavigate}
        handleDragEnd={vi.fn()}
      />
    );
    // Expect 8 skeleton cards
    expect(screen.getAllByRole('article', { 'aria-busy': 'true' }).length).toBe(8);
  });

  it('renders empty state when no products are available', () => {
    render(
      <ProductGrid
        products={[]}
        isLoading={false}
        categoryFilter={null}
        categories={mockCategories}
        handleAddProduct={vi.fn()}
        navigate={mockNavigate}
        handleDragEnd={vi.fn()}
      />
    );
    expect(screen.getByText('No Products Found')).toBeInTheDocument();
    expect(screen.getByText('Add a new product to get started.')).toBeInTheDocument();
  });

  it('renders a list of SortableProductCard components', () => {
    render(
      // DndContext is required by useSortable used in SortableProductCard
      <DndContext onDragEnd={vi.fn()}>
        <ProductGrid
          products={mockProducts}
          isLoading={false}
          categoryFilter={null}
          categories={mockCategories}
          handleAddProduct={vi.fn()}
          navigate={mockNavigate}
          handleDragEnd={vi.fn()}
        />
      </DndContext>
    );

    const productCards = screen.getAllByRole('article'); // Card component has role="article"
    expect(productCards.length).toBe(mockProducts.length);

    mockProducts.forEach(product => {
      expect(screen.getByText(product.name!)).toBeInTheDocument();
    });
  });

  it('renders drag handles for each product card', () => {
    render(
      <DndContext onDragEnd={vi.fn()}>
        <ProductGrid
          products={mockProducts}
          isLoading={false}
          categoryFilter={null}
          categories={mockCategories}
          handleAddProduct={vi.fn()}
          navigate={mockNavigate}
          handleDragEnd={vi.fn()}
        />
      </DndContext>
    );
    const dragHandles = screen.getAllByTestId('grip-vertical-icon');
    expect(dragHandles.length).toBe(mockProducts.length);
  });

  // More tests will be added for onDragEnd prop call
});

// Mock @dnd-kit/core specifically for DndContext to spy on its props
const mockDndContextOnDragEnd = vi.fn();
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    DndContext: vi.fn(({ children, onDragEnd }) => {
      // Store the onDragEnd function so we can call it
      mockDndContextOnDragEnd.mockImplementation(onDragEnd);
      // Render children to ensure the rest of the component tree is processed
      return <div data-testid="dnd-context-wrapper">{children}</div>;
    }),
  };
});


describe('ProductGrid', () => {
  // beforeEach is important to clear mocks between tests, especially for DndContext spy
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    render(
      <ProductGrid
        products={[]}
        isLoading={true}
        categoryFilter={null}
        categories={[]}
        handleAddProduct={vi.fn()}
        navigate={mockNavigate}
        handleDragEnd={vi.fn()}
      />
    );
    // Expect 8 skeleton cards (actual cards, not DndContext wrapper)
    // The DndContext mock means we won't have the DndContext provider here unless we explicitly add it.
    // However, loading state should render independently of DndContext.
    const skeletonCards = screen.getAllByRole('article', { 'aria-busy': 'true' });
    expect(skeletonCards.length).toBe(8);
  });

  it('renders empty state when no products are available', () => {
    render(
      <ProductGrid
        products={[]}
        isLoading={false}
        categoryFilter={null}
        categories={mockCategories}
        handleAddProduct={vi.fn()}
        navigate={mockNavigate}
        handleDragEnd={vi.fn()}
      />
    );
    expect(screen.getByText('No Products Found')).toBeInTheDocument();
  });

  it('renders a list of SortableProductCard components', () => {
    // We need to ensure DndContext mock doesn't interfere with just rendering items
    // For this test, we might want the original DndContext or a simpler mock
    // Let's reset the DndContext mock for this specific test to default behavior or not mock it
    // Or, more simply, ensure the test checks for product cards within the DndContext mock wrapper.

    // To test rendering of SortableProductCards, they need to be within a DndContext.
    // Our main mock for DndContext replaces it with a div and captures onDragEnd.
    // This is fine, as ProductGrid itself provides the DndContext.
    render(
        <ProductGrid
          products={mockProducts}
          isLoading={false}
          categoryFilter={null}
          categories={mockCategories}
          handleAddProduct={vi.fn()}
          navigate={mockNavigate}
          handleDragEnd={vi.fn()} // This handleDragEnd is passed to the DndContext rendered by ProductGrid
        />
    );

    expect(screen.getByTestId('dnd-context-wrapper')).toBeInTheDocument(); // Confirms our mock DndContext is used

    const productCards = screen.getAllByRole('article');
    expect(productCards.length).toBe(mockProducts.length);

    mockProducts.forEach(product => {
      expect(screen.getByText(product.name!)).toBeInTheDocument();
    });
  });

  it('renders drag handles for each product card', () => {
    render(
        <ProductGrid
          products={mockProducts}
          isLoading={false}
          categoryFilter={null}
          categories={mockCategories}
          handleAddProduct={vi.fn()}
          navigate={mockNavigate}
          handleDragEnd={vi.fn()}
        />
    );
    const dragHandles = screen.getAllByTestId('grip-vertical-icon');
    expect(dragHandles.length).toBe(mockProducts.length);
  });

  it('calls handleDragEnd prop when DndContext triggers onDragEnd', () => {
    const mockHandleDragEndProp = vi.fn();
    render(
        <ProductGrid
          products={mockProducts}
          isLoading={false}
          categoryFilter={null}
          categories={mockCategories}
          handleAddProduct={vi.fn()}
          navigate={mockNavigate}
          handleDragEnd={mockHandleDragEndProp} // This is the function we want to test is called
        />
    );

    // The DndContext rendered by ProductGrid will use mockHandleDragEndProp for its onDragEnd.
    // Our mockDndContextOnDragEnd has captured this function.
    // So, we call the captured function.
    const dragEvent = { active: { id: '1' }, over: { id: '2' } };

    // Check if the DndContext mock was called (it should be, by ProductGrid's render)
    expect(vi.mocked(DndContext).mock.calls.length).toBe(1);

    // Now, simulate DndContext invoking its onDragEnd (which is mockHandleDragEndProp)
    // mockDndContextOnDragEnd is the implementation of the onDragEnd from the DndContext instance
    if(mockDndContextOnDragEnd.getMockImplementation()){
        mockDndContextOnDragEnd(dragEvent);
    } else {
        throw new Error("DndContext's onDragEnd was not captured correctly by the mock.");
    }

    expect(mockHandleDragEndProp).toHaveBeenCalledTimes(1);
    expect(mockHandleDragEndProp).toHaveBeenCalledWith(dragEvent);
  });

  // More tests will be added for onDragEnd prop call
});

// Helper to define ProductWithCategory if not globally available or properly typed from imports
// For the purpose of this test, ensure the mockProducts match the expected structure.
// If `Product` from '@/types/supabaseTypes' is `any` or not specific enough,
// we might need a more explicit local type or ensure the mock adheres to the actual ProductGrid's expected ProductWithCategory.
// For now, assuming mockProducts are correctly typed based on previous context.
// The local type definitions below are for ensuring test clarity and can be removed if
// ProductWithCategory is correctly and robustly imported from its source.

// interface Product {
//     id: string | null;
//     created_at?: string | null;
//     name: string | null;
//     description?: string | null;
//     image_url?: string | null;
//     price?: number | null;
//     category_id?: string | null;
//     user_id?: string | null;
//     sort_order: number | null;
// }
// interface Category {
//     id: string;
//     name: string;
// }
// export interface ProductWithCategoryForTest extends Product {
//     id: string;
//     name: string;
//     sort_order: number;
//     categories?: Category;
// }

// The mockProducts array is defined to match the expected structure for ProductWithCategory.
// The import `ProductWithCategory` from `@/types/supabaseTypes` is a placeholder.
// If it doesn't exactly match the structure used in `ProductGrid` (which extends a base `Product` type),
// then the mocks need to be robust, or the type needs to be imported from `ProductGrid` or `ProductsDashboard`.
// Given the `ProductWithCategory` is defined locally in `ProductGrid.tsx`, direct import might be tricky
// without refactoring the type to a shared location.
// For these tests, the structure of `mockProducts` is the source of truth for the expected data shape.
