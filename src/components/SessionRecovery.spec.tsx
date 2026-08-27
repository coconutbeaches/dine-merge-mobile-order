import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionRecovery } from './SessionRecovery';

const state = vi.hoisted(() => ({ pathname: '', replace: vi.fn(), getSession: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace }), usePathname: () => state.pathname }));
vi.mock('@/context/AppContext', () => ({ useAppContext: () => ({ currentUser: null, isLoading: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: state.getSession } } }));

describe('session recovery during handshake', () => {
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
  it.each(['/restaurant/upgrade', '/register/unknown?table=6&handshake=ABCDE-FGHJK'])(
    'does not redirect a saved account away from %s', async (path) => {
      vi.useFakeTimers();
      window.history.replaceState(null, '', path);
      state.pathname = path.split('?')[0];
      render(<SessionRecovery><p>Verification</p></SessionRecovery>);
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
      expect(state.getSession).not.toHaveBeenCalled();
      expect(state.replace).not.toHaveBeenCalled();
    },
  );
});
