import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { backupCartToSupabase, loadCartFromBackup, clearCartBackup } from '@/lib/cartService';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Cart Service Network Failure Handling', () => {
  const mockCart = [
    {
      id: 'test-item-1',
      menuItem: { id: 'menu-1', name: 'Test Item', price: 10.0 },
      quantity: 2,
      selectedOptions: {}
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle network failure gracefully when backing up cart', async () => {
    // Mock Supabase to throw network error
    const mockUpsert = vi.fn().mockRejectedValue(new Error('Network error'));
    const mockFrom = vi.fn().mockReturnValue({
      upsert: mockUpsert
    });
    (supabase.from as any).mockReturnValue({
      upsert: mockUpsert
    });

    // This should not throw an error
    await expect(backupCartToSupabase('test-guest-id', mockCart)).resolves.not.toThrow();
    
    // Verify the error was logged
    expect(console.error).toHaveBeenCalledWith('[CartBackup] Failed to backup', expect.any(Error));
  });

  it('should handle network failure gracefully when loading cart backup', async () => {
    // Mock Supabase to throw network error
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockRejectedValue(new Error('Network error'))
      })
    });
    (supabase.from as any).mockReturnValue({
      select: mockSelect
    });

    // This should return empty array instead of throwing
    const result = await loadCartFromBackup('test-guest-id');
    
    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalledWith('[CartBackup] Failed to load', expect.any(Error));
  });

  it('should handle network failure gracefully when clearing cart backup', async () => {
    // Mock Supabase to throw network error
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockRejectedValue(new Error('Network error'))
    });
    (supabase.from as any).mockReturnValue({
      delete: mockDelete
    });

    // This should not throw an error
    await expect(clearCartBackup('test-guest-id')).resolves.not.toThrow();
    
    // Verify the error was logged
    expect(console.error).toHaveBeenCalledWith('[CartBackup] Failed to clear', expect.any(Error));
  });

  it('should handle successful backup operation', async () => {
    // Mock successful Supabase operation
    const mockUpsert = vi.fn().mockResolvedValue({ data: {}, error: null });
    (supabase.from as any).mockReturnValue({
      upsert: mockUpsert
    });

    await backupCartToSupabase('test-guest-id', mockCart);
    
    expect(mockUpsert).toHaveBeenCalledWith({
      guest_user_id: 'test-guest-id',
      cart: mockCart,
      updated_at: expect.any(String)
    });
  });

  it('should handle successful load operation', async () => {
    // Mock successful Supabase operation
    const mockSingle = vi.fn().mockResolvedValue({ 
      data: { cart: mockCart }, 
      error: null 
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as any).mockReturnValue({
      select: mockSelect
    });

    const result = await loadCartFromBackup('test-guest-id');
    
    expect(result).toEqual(mockCart);
    expect(mockSelect).toHaveBeenCalledWith('cart');
    expect(mockEq).toHaveBeenCalledWith('guest_user_id', 'test-guest-id');
  });
});

