import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResetPassword from './ResetPassword'; // Adjust path as necessary
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
      updateUser: jest.fn(),
    },
  },
}));

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ // Mock useLocation if your component uses it, e.g. for query params
    hash: '', // Supabase uses hash for access_token, though we're not explicitly testing token extraction here
    pathname: '/reset-password',
    search: '',
    state: null,
  }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('ResetPassword Page', () => {
  const mockToast = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-assign mockToast before each test
    (require('@/hooks/use-toast') as any).useToast = () => ({ toast: mockToast });
    // Reset Supabase mock implementation if needed
    (require('@/integrations/supabase/client').supabase.auth.updateUser as jest.Mock).mockReset();
  });

  const renderComponent = () => {
    render(
      <BrowserRouter> {/* BrowserRouter is needed if using Link or other router features */}
        <ResetPassword />
      </BrowserRouter>
    );
  };

  test('renders the form with password inputs and submit button', () => {
    renderComponent();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    expect(screen.getByText(/set your new password/i)).toBeInTheDocument();
  });

  test('shows error toast if password fields are empty', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Please fill out both password fields.",
        variant: "destructive",
      });
    });
    expect(require('@/integrations/supabase/client').supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  test('shows error toast if passwords do not match', async () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'password456' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
    });
    expect(require('@/integrations/supabase/client').supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  test('calls supabase.auth.updateUser with correct password and shows success message', async () => {
    const newPassword = 'newSecurePassword123';
    (require('@/integrations/supabase/client').supabase.auth.updateUser as jest.Mock)
      .mockResolvedValueOnce({ error: null });

    renderComponent();
    
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: newPassword } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: newPassword } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(screen.getByRole('button', { name: /updating.../i })).toBeDisabled();

    await waitFor(() => {
      expect(require('@/integrations/supabase/client').supabase.auth.updateUser).toHaveBeenCalledWith(
        { password: newPassword }
      );
    });
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Your password has been updated successfully. You can now log in with your new password.",
      });
    });

    // Check for success UI
    expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
  });

  test('shows error message if supabase.auth.updateUser returns an error (e.g. invalid token, weak password)', async () => {
    const newPassword = 'newSecurePassword123';
    const errorMessage = 'Your password should be stronger.';
    (require('@/integrations/supabase/client').supabase.auth.updateUser as jest.Mock)
      .mockResolvedValueOnce({ error: { message: errorMessage } });

    renderComponent();
    
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: newPassword } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: newPassword } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(screen.getByRole('button', { name: /updating.../i })).toBeDisabled();

    await waitFor(() => {
      expect(require('@/integrations/supabase/client').supabase.auth.updateUser).toHaveBeenCalledWith(
        { password: newPassword }
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error Updating Password",
        description: errorMessage,
        variant: "destructive",
      });
    });
    // Ensure the form is still visible
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.queryByText(/password updated/i)).not.toBeInTheDocument();
  });

  test('displays loading state correctly when form is submitting', async () => {
    const newPassword = 'loadingPassword123';
    (require('@/integrations/supabase/client').supabase.auth.updateUser as jest.Mock)
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)));

    renderComponent();
    
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: newPassword } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: newPassword } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    // Check for loading state
    expect(screen.getByRole('button', { name: /updating.../i })).toBeDisabled();
    expect(screen.getByLabelText(/new password/i)).toBeDisabled();
    expect(screen.getByLabelText(/confirm new password/i)).toBeDisabled();

    await waitFor(() => {
      // After completion, button should be enabled (or not present if success UI changes)
      // Here we check for the "Back to Login" button from the success UI.
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    });
  });

  test('Back to Login button on success screen navigates to /login', async () => {
    (require('@/integrations/supabase/client').supabase.auth.updateUser as jest.Mock)
      .mockResolvedValueOnce({ error: null });
    renderComponent();

    const newPassword = 'password123';
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: newPassword } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: newPassword } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

});
