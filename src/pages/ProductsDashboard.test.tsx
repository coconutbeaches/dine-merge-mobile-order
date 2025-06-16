import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductsDashboard from './ProductsDashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom'; // To handle useNavigate and other router features
import { ProductWithCategory } from './ProductsDashboard'; // Import the specific type from the component

// Mock supabase client
const mockSupabaseFrom = vi.fn().mockReturnThis();
const mockSupabaseSelect = vi.fn().mockReturnThis();
const mockSupabaseOrder = vi.fn().mockReturnThis();
const mockSupabaseIs = vi.fn().mockReturnThis();
const mockSupabaseEq = vi.fn().mockReturnThis();
const mockSupabaseUpdate = vi.fn().mockReturnThis();

const mockSupabaseClient = {
  from: mockSupabaseFrom,
  select: mockSupabaseSelect,
  order: mockSupabaseOrder,
  is: mockSupabaseIs,
  eq: mockSupabaseEq,
  update: mockSupabaseUpdate,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Mock dnd-kit/sortable's arrayMove
vi.mock('@dnd-kit/sortable', async () => {
    const actual = await vi.importActual('@dnd-kit/sortable');
    return {
        ...actual,
        arrayMove: vi.fn((array, from, to) => {
            const newArray = [...array];
            const [item] = newArray.splice(from, 1);
            newArray.splice(to, 0, item);
            return newArray;
        }),
    };
});


// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock sonner for toasts
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ProductGrid component as its internals are tested separately
vi.mock('@/components/admin/ProductGrid', () => ({
  default: vi.fn(({ products, handleDragEnd, isLoading }) => {
    if (isLoading) return <div>Loading...</div>;
    return (
      <div data-testid="product-grid">
        {products.map((p: ProductWithCategory) => (
          <div key={p.id} data-testid={`product-${p.id}`}>
            {p.name}
          </div>
        ))}
        {/* Button to simulate drag end for testing handleDragEnd */}
        <button
            data-testid="simulate-drag-end"
            onClick={() => handleDragEnd({ active: { id: '1' }, over: { id: '2' } })}
        >
            Simulate Drag
        </button>
      </div>
    );
  }),
}));


const initialProducts: ProductWithCategory[] = [
  { id: '1', name: 'Product A', price: 10, sort_order: 0, category_id: 'cat1', categories: { id: 'cat1', name: 'Category X'}, created_at: '2023-01-01', user_id: 'usr1', description: '', image_url: '' },
  { id: '2', name: 'Product B', price: 20, sort_order: 1, category_id: 'cat1', categories: { id: 'cat1', name: 'Category X'}, created_at: '2023-01-01', user_id: 'usr1', description: '', image_url: '' },
  { id: '3', name: 'Product C', price: 30, sort_order: 2, category_id: 'cat2', categories: { id: 'cat2', name: 'Category Y'}, created_at: '2023-01-01', user_id: 'usr1', description: '', image_url: '' },
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for testing
      staleTime: Infinity, // Prevent immediate refetch
    },
  },
});

// Wrapper component for providing QueryClient and Router
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe('ProductsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Clear all mocks before each test

    // Reset queryClient's cache
    queryClient.clear();

    // Mock successful products fetch
    mockSupabaseFrom.mockImplementation(() => mockSupabaseClient); // Default to returning self
    mockSupabaseSelect.mockReturnThis(); // from().select()
    mockSupabaseOrder.mockResolvedValue({ data: [...initialProducts], error: null }); // select().order()

    // Mock successful categories fetch
    // Specific handling for categories query if needed
    // For now, assume 'categories' query is also successful or not critical for these specific tests
     mockSupabaseClient.from = vi.fn((tableName: string) => {
        if (tableName === 'products') {
            return {
                select: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [...initialProducts], error: null }),
            };
        }
        if (tableName === 'categories') {
             return {
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [{id: 'cat1', name: 'Category X'}, {id: 'cat2', name: 'Category Y'}], error: null }),
            };
        }
        return { // Default mock for any other table
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
        };
    });
  });

  it('fetches and renders products in initial sort_order', async () => {
    render(<ProductsDashboard />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByTestId('product-grid')).toBeInTheDocument();
    });

    const productElements = screen.getAllByTestId(/product-\d/);
    expect(productElements.length).toBe(initialProducts.length);
    // Check order based on text content, assuming names are unique and reflect order
    expect(productElements[0]).toHaveTextContent('Product A');
    expect(productElements[1]).toHaveTextContent('Product B');
    expect(productElements[2]).toHaveTextContent('Product C');
  });

  describe('handleDragEnd logic', () => {
    it('optimistically updates UI and calls mutation on drag end', async () => {
      // Mock the setQueryData and invalidateQueries
      const originalSetQueryData = queryClient.setQueryData.bind(queryClient);
      queryClient.setQueryData = vi.fn((queryKey, updater) => {
        // Call original to keep cache behavior, or mock its effect
        if (typeof updater === 'function') {
          const existingData = queryClient.getQueryData(queryKey);
          const newData = updater(existingData);
          return originalSetQueryData(queryKey, newData);
        }
        return originalSetQueryData(queryKey, updater);
      });
      queryClient.invalidateQueries = vi.fn();

      // Mock the mutation's underlying Supabase update call to be successful
      // This mock needs to be specific for the 'products' table and 'update' operation
       mockSupabaseClient.from = vi.fn((tableName: string) => {
        if (tableName === 'products') {
            const productChain = {
                select: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                eq: vi.fn((colName, value) => { // Needed for mutation's .eq('id', update.id)
                    // console.log(`Mock Supabase: .eq called on products with ${colName}=${value}`);
                    return productChain; // Return self to allow chaining .update()
                }),
                order: vi.fn().mockResolvedValue({ data: [...initialProducts], error: null }),
                update: vi.fn().mockResolvedValue({ error: null }), // Ensure update resolves successfully
            };
            return productChain;
        }
        if (tableName === 'categories') {
             return {
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [{id: 'cat1', name: 'Category X'}, {id: 'cat2', name: 'Category Y'}], error: null }),
            };
        }
        return { /* default empty mock */ };
    });


      render(<ProductsDashboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('product-grid')).toBeInTheDocument();
      });

      // Simulate the drag-and-drop action by clicking the button in the mock ProductGrid
      // This button calls handleDragEnd({ active: { id: '1' }, over: { id: '2' } })
      // This means Product A (id:1, index:0) moves to Product B's position (id:2, index:1)
      screen.getByTestId('simulate-drag-end').click();

      // 1. Verify Optimistic Update (setQueryData call)
      await waitFor(() => {
        expect(queryClient.setQueryData).toHaveBeenCalledWith(
          ['products', null], // null is the default categoryFilter
          expect.any(Function) // The updater function
        );
      });

      // Check the actual data in the cache after optimistic update
      // Product A (id:1) and Product B (id:2) should swap.
      // Original: A (0), B (1), C (2)
      // Drag A over B: B (0), A (1), C (2) -- this is how arrayMove(arr, 0, 1) works
      const cachedData = queryClient.getQueryData<ProductWithCategory[]>(['products', null]);
      expect(cachedData).toBeDefined();
      expect(cachedData![0].id).toBe('2'); // Product B is now first
      expect(cachedData![0].sort_order).toBe(0);
      expect(cachedData![1].id).toBe('1'); // Product A is now second
      expect(cachedData![1].sort_order).toBe(1);
      expect(cachedData![2].id).toBe('3'); // Product C remains last
      expect(cachedData![2].sort_order).toBe(2);

      // 2. Verify Mutation Call
      // The mutation will call supabase.from('products').update(...).eq(...) for each item in the new order.
      // In this case, Product B (id:2) gets sort_order:0, Product A (id:1) gets sort_order:1. Product C is also updated.
      await waitFor(() => {
        // Expect supabase.from('products').update().eq() to be called for the reordered items
        // For Product B (id '2')
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
        const productUpdateMock = mockSupabaseClient.from('products').update; // Get the final update mock
        const productEqMock = mockSupabaseClient.from('products').eq; // Get the eq mock

        expect(productUpdateMock).toHaveBeenCalledWith({ sort_order: 0 });
        expect(productEqMock).toHaveBeenCalledWith('id', '2');

        expect(productUpdateMock).toHaveBeenCalledWith({ sort_order: 1 });
        expect(productEqMock).toHaveBeenCalledWith('id', '1');

        expect(productUpdateMock).toHaveBeenCalledWith({ sort_order: 2 });
        expect(productEqMock).toHaveBeenCalledWith('id', '3');
      });

      // 3. Verify toast and query invalidation on success
      await waitFor(() => {
        expect(vi.mocked(sonner.toast.success)).toHaveBeenCalledWith('Product order updated successfully!');
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['products', null] });
      });
    });
  });
});
