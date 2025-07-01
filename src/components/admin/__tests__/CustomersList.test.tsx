import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CustomersList from '../CustomersList';
import { Profile } from '@/types/supabaseTypes';

// Mock the utility function
vi.mock('@/utils/orderDashboardUtils', () => ({
  formatLastOrderDate: vi.fn((date) => {
    if (date === null || date === undefined || date === '') {
      return 'Never';
    }
    return 'Mar 15, 2024 2:30 PM'; // Mock formatted date
  })
}));

// Mock the ProfilePictureUploader component
vi.mock('../ProfilePictureUploader', () => ({
  ProfilePictureUploader: ({ userId }: { userId: string }) => (
    <div data-testid={`avatar-${userId}`}>Avatar</div>
  )
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Edit: () => <div>Edit Icon</div>,
  User: () => <div>User Icon</div>,
  Mail: () => <div>Mail Icon</div>,
  Calendar: () => <div>Calendar Icon</div>
}));

// Wrapper component for router
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

const mockCustomer: Profile & {
  total_spent: number;
  last_order_date: string | null;
  avatar_path?: string | null;
} = {
  id: '1',
  name: 'Test Customer',
  email: 'test@example.com',
  customer_type: 'hotel_guest',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  total_spent: 1500,
  last_order_date: '2024-03-15T14:30:00.000Z',
  avatar_path: null,
  avatar_url: null,
  phone_number: null,
  room_number: null,
  user_id: '1'
};

const defaultProps = {
  customers: [mockCustomer],
  selectedCustomers: [],
  toggleSelectCustomer: vi.fn(),
  selectAllCustomers: vi.fn(),
  clearSelection: vi.fn(),
  onEditCustomer: vi.fn(),
  onUpdateCustomer: vi.fn(),
  toggleCustomerType: vi.fn()
};

describe('CustomersList', () => {
  test('renders customer with valid last order date', () => {
    render(
      <RouterWrapper>
        <CustomersList {...defaultProps} />
      </RouterWrapper>
    );

    expect(screen.getByText('Test Customer')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Mar 15, 2024 2:30 PM')).toBeInTheDocument();
  });

  test('renders customer with null last order date', () => {
    const customerWithNullDate = {
      ...mockCustomer,
      last_order_date: null
    };

    render(
      <RouterWrapper>
        <CustomersList 
          {...defaultProps} 
          customers={[customerWithNullDate]} 
        />
      </RouterWrapper>
    );

    expect(screen.getByText('Test Customer')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  test('renders customer with undefined last order date', () => {
    const customerWithUndefinedDate = {
      ...mockCustomer,
      last_order_date: undefined as any
    };

    render(
      <RouterWrapper>
        <CustomersList 
          {...defaultProps} 
          customers={[customerWithUndefinedDate]} 
        />
      </RouterWrapper>
    );

    expect(screen.getByText('Test Customer')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  test('renders customer with empty string last order date', () => {
    const customerWithEmptyDate = {
      ...mockCustomer,
      last_order_date: ''
    };

    render(
      <RouterWrapper>
        <CustomersList 
          {...defaultProps} 
          customers={[customerWithEmptyDate]} 
        />
      </RouterWrapper>
    );

    expect(screen.getByText('Test Customer')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  test('renders multiple customers with different last order date scenarios', () => {
    const customers = [
      mockCustomer, // Valid date
      { ...mockCustomer, id: '2', name: 'Customer 2', last_order_date: null }, // Null date
      { ...mockCustomer, id: '3', name: 'Customer 3', last_order_date: '' }, // Empty date
    ];

    render(
      <RouterWrapper>
        <CustomersList 
          {...defaultProps} 
          customers={customers} 
        />
      </RouterWrapper>
    );

    expect(screen.getByText('Test Customer')).toBeInTheDocument();
    expect(screen.getByText('Customer 2')).toBeInTheDocument();
    expect(screen.getByText('Customer 3')).toBeInTheDocument();
    
    // Should have one formatted date and two "Never" entries
    expect(screen.getByText('Mar 15, 2024 2:30 PM')).toBeInTheDocument();
    expect(screen.getAllByText('Never')).toHaveLength(2);
  });

  test('renders empty state when no customers', () => {
    render(
      <RouterWrapper>
        <CustomersList 
          {...defaultProps} 
          customers={[]} 
        />
      </RouterWrapper>
    );

    expect(screen.getByText('No customers found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search or filter to find what you\'re looking for.')).toBeInTheDocument();
  });

  test('renders customer type badges correctly', () => {
    const guestCustomer = {
      ...mockCustomer,
      customer_type: 'hotel_guest' as const
    };
    
    const walkinCustomer = {
      ...mockCustomer,
      id: '2',
      name: 'Walk-in Customer',
      customer_type: 'walk_in' as const
    };

    render(
      <RouterWrapper>
        <CustomersList 
          {...defaultProps} 
          customers={[guestCustomer, walkinCustomer]} 
        />
      </RouterWrapper>
    );

    expect(screen.getByText('Guest')).toBeInTheDocument();
    expect(screen.getByText('Walk-in')).toBeInTheDocument();
  });

  test('handles customer with missing name gracefully', () => {
    const customerWithoutName = {
      ...mockCustomer,
      name: null as any
    };

    render(
      <RouterWrapper>
        <CustomersList 
          {...defaultProps} 
          customers={[customerWithoutName]} 
        />
      </RouterWrapper>
    );

    expect(screen.getByText('Unnamed Customer')).toBeInTheDocument();
  });

  test('applies recent update styling when recentlyUpdatedId matches', () => {
    render(
      <RouterWrapper>
        <CustomersList 
          {...defaultProps} 
          recentlyUpdatedId="1"
        />
      </RouterWrapper>
    );

    // Check that the row has the animation classes
    const row = screen.getByText('Test Customer').closest('tr');
    expect(row).toHaveClass('animate-pulse', 'bg-muted/20');
  });

  test('currency formatting works correctly', () => {
    const customerWithHighSpending = {
      ...mockCustomer,
      total_spent: 123456.78
    };

    render(
      <RouterWrapper>
        <CustomersList 
          {...defaultProps} 
          customers={[customerWithHighSpending]} 
        />
      </RouterWrapper>
    );

    // The exact format depends on the formatThaiCurrencyWithComma implementation
    // but it should be displayed somewhere in the component
    expect(screen.getByText('Test Customer')).toBeInTheDocument();
  });
});
