import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Profile from '@/pages/Profile'; // Adjusted path
import { vi } from 'vitest';
import { useAppContext } from '@/context/AppContext'; // Import to mock

// Mock react-router-dom for useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AppContext using useAppContext
vi.mock('@/context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { phone: '123-456-7890' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({ // Mock update function
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    auth: {
      updateUser: vi.fn(() => Promise.resolve({ error: null })), // Mock if email updates were part of profile
    }
  }
}));


describe('Profile Page', () => {
  const mockCurrentUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    // Add other fields if your Profile component or its logic expects them
  };

  beforeEach(() => {
    mockNavigate.mockClear();
    // Reset mock for useAppContext before each test
    (useAppContext as jest.Mock).mockReturnValue({
      currentUser: mockCurrentUser,
      isLoggedIn: true,
      isLoading: false, // Renamed from isLoadingAppContext to isLoading as per AppContext.tsx
      logout: vi.fn(),
      // Provide other functions/values from AppContextType if Profile uses them directly
      // For now, keeping it minimal for the button test
      cart: [],
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      updateCartItemQuantity: vi.fn(),
      clearCart: vi.fn(),
      cartTotal: 0,
      placeOrder: vi.fn(),
      getOrderHistory: vi.fn(),
    });

    // Reset supabase mocks if necessary, though the default mock might be enough
    vi.clearAllMocks(); // Clears all mocks

    // Re-initialize useNavigate mock
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate, // Ensure mockNavigate is used
      };
    });
    mockNavigate.mockClear(); // Clear any calls from previous tests

    // Re-initialize useAppContext mock
    (useAppContext as jest.Mock).mockReturnValue({
      currentUser: mockCurrentUser,
      isLoggedIn: true,
      isLoading: false, // Corresponds to isLoadingAppContext in Profile's useEffect
      logout: vi.fn(),
      cart: [], // Add cart to prevent error in Footer
      // Minimal necessary values for Profile rendering and initial load
      // Other AppContext values can be added if Profile component's logic expands
    });

    // Re-initialize Supabase client mock for fetchProfileDetails
    vi.mock('@/integrations/supabase/client', () => ({
      supabase: {
        from: vi.fn().mockReturnValue({ // Ensure 'from' is a mock function
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { phone: '123-456-7890' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({ 
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
        auth: {
          updateUser: vi.fn().mockResolvedValue({ error: null }),
        }
      }
    }));
  });

  it('renders the "My Orders" button and navigates on click', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    // Check if the button exists
    // Using a regex for case-insensitivity and flexibility
    const myOrdersButton = await screen.findByRole('button', { name: /my orders/i });
    expect(myOrdersButton).not.toBeNull(); // Check if it's in the document

    // Simulate click
    fireEvent.click(myOrdersButton);

    // Check if navigate was called correctly
    expect(mockNavigate).toHaveBeenCalledWith('/order-history');
  });
});
