import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ForgotPassword from './ForgotPassword'; // Adjust path as necessary
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('ForgotPassword Page', () => {
  const mockToast = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-assign mockToast before each test if useToast is re-mocked per test or provide it differently
    (require('@/hooks/use-toast') as any).useToast = () => ({ toast: mockToast }); 
  });

  const renderComponent = () => {
    render(
      <BrowserRouter>
        <ForgotPassword />
      </BrowserRouter>
    );
  };

  test('renders the form with email input and submit button', () => {
    renderComponent();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
  });

  test('shows error toast if email is not provided', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive",
      });
    });
    expect(require('@/integrations/supabase/client').supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  test('calls supabase.auth.resetPasswordForEmail with correct parameters and shows success message', async () => {
    const testEmail = 'test@example.com';
    (require('@/integrations/supabase/client').supabase.auth.resetPasswordForEmail as jest.Mock)
      .mockResolvedValueOnce({ error: null });

    renderComponent();
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: testEmail } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByRole('button', { name: /sending.../i })).toBeDisabled();

    await waitFor(() => {
      expect(require('@/integrations/supabase/client').supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        testEmail,
        { redirectTo: `${window.location.origin}/reset-password` }
      );
    });
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Check Your Email",
        description: "If an account exists for this email, a password reset link has been sent.",
      });
    });

    // Check for success UI
    expect(screen.getByText(/password reset email sent/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
  });

  test('shows error message if supabase.auth.resetPasswordForEmail returns an error', async () => {
    const testEmail = 'error@example.com';
    const errorMessage = 'Supabase error occurred';
    (require('@/integrations/supabase/client').supabase.auth.resetPasswordForEmail as jest.Mock)
      .mockResolvedValueOnce({ error: { message: errorMessage } });

    renderComponent();
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: testEmail } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByRole('button', { name: /sending.../i })).toBeDisabled();

    await waitFor(() => {
      expect(require('@/integrations/supabase/client').supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        testEmail,
        { redirectTo: `${window.location.origin}/reset-password` }
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    });
    // Ensure the form is still visible and not the success message
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByText(/password reset email sent/i)).not.toBeInTheDocument();
  });

  test('displays loading state correctly when form is submitting', async () => {
    const testEmail = 'loading@example.com';
    (require('@/integrations/supabase/client').supabase.auth.resetPasswordForEmail as jest.Mock)
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)));

    renderComponent();
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: testEmail } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    // Check for loading state
    expect(screen.getByRole('button', { name: /sending.../i })).toBeDisabled();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();

    await waitFor(() => {
      // After completion, button should be enabled (or not present if success UI changes)
      // Here we check for the "Back to Login" button from the success UI.
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    });
  });
  
  test('Back to Login button on success screen navigates to /login', async () => {
    (require('@/integrations/supabase/client').supabase.auth.resetPasswordForEmail as jest.Mock)
      .mockResolvedValueOnce({ error: null });
    renderComponent();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/password reset email sent/i)).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

});
