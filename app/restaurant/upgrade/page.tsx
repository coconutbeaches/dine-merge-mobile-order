'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getGuestSession, getTableNumber, type GuestSession } from '@/utils/guestSession';
import { persistGuestUpgrade } from '@/lib/restaurantGuestUpgradeSession';

type UpgradePayload = {
  status?: 'pending' | 'bound';
  ref?: string;
  first_name?: string;
  whatsapp_url?: string;
  session?: GuestSession;
  error?: string;
};

async function callUpgrade(body: Record<string, unknown>): Promise<UpgradePayload> {
  const response = await fetch('/api/restaurant/handshake/upgrade', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    cache: 'no-store', body: JSON.stringify(body),
  });
  const payload = await response.json() as UpgradePayload;
  if (!response.ok) throw new Error(payload.error || 'Could not upgrade this account.');
  return payload;
}

export default function RestaurantAccountUpgrade() {
  const router = useRouter();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [ready, setReady] = useState(false);
  const [ref, setRef] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const [checkVersion, setCheckVersion] = useState(0);

  useEffect(() => {
    const current = getGuestSession();
    setSession(current);
    setName(current?.guest_first_name ?? '');
    setRef(new URLSearchParams(window.location.hash.slice(1)).get('handshake') ?? '');
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !session || !ref) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const check = async () => {
      try {
        const payload = await callUpgrade({ action: 'complete', handshake_ref: ref });
        if (cancelled) return;
        if (payload.status === 'bound' && payload.session) {
          persistGuestUpgrade(payload.session, ref);
          setName(payload.session.guest_first_name);
          setComplete(true);
          setError('');
          window.history.replaceState(null, '', window.location.pathname);
        } else if (payload.status === 'pending') {
          attempts += 1;
          if (attempts < 60) timer = setTimeout(check, 2000);
          else setError('Still waiting for WhatsApp verification. Send the verification message, then check again.');
        } else {
          throw new Error('Unexpected verification response. Please check again.');
        }
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : 'Could not check verification.');
      }
    };
    void check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [ready, session, ref, checkVersion]);

  const start = async () => {
    if (!session || busy) return;
    setBusy(true);
    setError('');
    try {
      const payload = await callUpgrade({ action: 'start',
        guest_user_id: session.guest_user_id, guest_stay_id: session.guest_stay_id,
        table_number: getTableNumber() || 'Take Away',
      });
      if (!payload.ref || !payload.whatsapp_url || !payload.first_name) {
        throw new Error('Could not start verification. Please try again.');
      }
      const url = new URL(payload.whatsapp_url);
      if (url.origin !== 'https://wa.me' || url.pathname !== '/66631457299') {
        throw new Error('Unexpected WhatsApp destination. Please ask for help.');
      }
      window.history.replaceState(null, '', `#handshake=${encodeURIComponent(payload.ref)}`);
      setName(payload.first_name);
      setWhatsappUrl(payload.whatsapp_url);
      setRef(payload.ref);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not start verification.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-12 text-stone-900">
      <section className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
        <p className="mb-3 text-sm font-medium text-emerald-700">Coconut Beach · Restaurant</p>
        <h1 className="text-2xl font-semibold">{complete ? 'Account upgraded' : 'Enable automatic kitchen delivery'}</h1>
        {!ready ? <p className="mt-5" role="status">Checking this browser’s account…</p> : !session ? (
          <p className="mt-5">Open this page in the browser you already use for orders. Do not log out or clear your cookies.</p>
        ) : complete ? (
          <>
            <p className="mt-5"><strong>{name}</strong> keeps the same account and order history. WhatsApp verification is now linked to this browser.</p>
            <p className="mt-3 text-sm text-stone-600">Your next eligible order can use automatic delivery. No existing orders were resent.</p>
            <button className="mt-6 w-full rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white" onClick={() => router.push('/menu')}>Back to menu</button>
          </>
        ) : (
          <>
            <p className="mt-5">Keep your existing account and order history. Verify using the same WhatsApp number you used for previous orders.</p>
            <p className="mt-4 rounded-lg bg-stone-100 p-3 font-medium">{name}</p>
            {ref ? (
              <>
                <p className="mt-4 text-sm">Send the verification message in WhatsApp, then return here or follow the reply link. This does not place an order.</p>
                {whatsappUrl && <a className="mt-5 block rounded-lg bg-emerald-700 px-4 py-3 text-center font-medium text-white" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Open WhatsApp verification</a>}
                <button className="mt-4 w-full rounded-lg border border-stone-300 px-4 py-3" onClick={() => { setError(''); setCheckVersion((value) => value + 1); }}>Check verification again</button>
                {error && <button className="mt-3 w-full text-sm underline disabled:opacity-50" disabled={busy} onClick={start}>Start a fresh verification</button>}
              </>
            ) : (
              <button className="mt-6 w-full rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white disabled:opacity-50" disabled={busy} onClick={start}>{busy ? 'Preparing verification…' : 'Upgrade my existing account'}</button>
            )}
          </>
        )}
        {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
        {!complete && <Link className="mt-6 block text-center text-sm underline" href="/menu">Back to menu — keep manual ordering</Link>}
      </section>
    </main>
  );
}
