import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RestaurantAccountUpgrade from '../../app/restaurant/upgrade/page';
import { saveGuestSession, getGuestSession } from '@/utils/guestSession';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
const old = { guest_user_id: 'existing', guest_stay_id: 'walkin-existing', guest_first_name: 'Kung' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

describe('account upgrade page', () => {
  beforeEach(() => {
    localStorage.clear(); window.history.replaceState(null, '', '/restaurant/upgrade');
    vi.restoreAllMocks(); push.mockClear();
  });
  it('requires the original browser and makes no request without a session', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    render(<RestaurantAccountUpgrade />);
    expect(await screen.findByText(/Open this page in the browser/)).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('starts, waits, and completes without registering a guest or delivering an order', async () => {
    saveGuestSession(old);
    let verified = false;
    const fetch = vi.fn(async (_url, options) => {
      const body = JSON.parse(options.body);
      if (body.action === 'start') return json({ status: 'pending', ref: 'ABCDE-FGHJK', first_name: 'KUNG STAFF',
        whatsapp_url: 'https://wa.me/66631457299?text=verification' });
      return json(verified ? { status: 'bound', session: { ...old, guest_first_name: 'KUNG STAFF' } } : { status: 'pending' });
    });
    vi.stubGlobal('fetch', fetch);
    render(<RestaurantAccountUpgrade />);
    fireEvent.click(await screen.findByRole('button', { name: 'Upgrade my existing account' }));
    expect(await screen.findByRole('link', { name: 'Open WhatsApp verification' })).toHaveAttribute('href', 'https://wa.me/66631457299?text=verification');
    expect(getGuestSession()).toEqual(old); // canonical name is not saved before verification
    verified = true;
    fireEvent.click(screen.getByRole('button', { name: 'Check verification again' }));
    expect(await screen.findByRole('heading', { name: 'Account upgraded' })).toBeVisible();
    expect(getGuestSession()).toEqual({ ...old, guest_first_name: 'KUNG STAFF' });
    expect(fetch.mock.calls.every(([url]) => url === '/api/restaurant/handshake/upgrade')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }));
    expect(push).toHaveBeenCalledWith('/menu');
  });
  it('resumes a callback but does not overwrite a different account', async () => {
    saveGuestSession(old);
    window.history.replaceState(null, '', '/restaurant/upgrade#handshake=ABCDE-FGHJK');
    vi.stubGlobal('fetch', vi.fn(async () => json({ status: 'bound', session: { ...old, guest_user_id: 'someone-else' } })));
    render(<RestaurantAccountUpgrade />);
    expect(await screen.findByRole('alert')).toHaveTextContent('has not been replaced');
    expect(getGuestSession()).toEqual(old);
    expect(screen.queryByRole('heading', { name: 'Account upgraded' })).not.toBeInTheDocument();
  });
  it('shows a wrong-phone error without changing storage', async () => {
    saveGuestSession(old);
    window.history.replaceState(null, '', '/restaurant/upgrade#handshake=ABCDE-FGHJK');
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'Use the same WhatsApp number as previous orders.' }, 409)));
    render(<RestaurantAccountUpgrade />);
    expect(await screen.findByRole('alert')).toHaveTextContent('same WhatsApp number');
    expect(getGuestSession()).toEqual(old);
  });
});
