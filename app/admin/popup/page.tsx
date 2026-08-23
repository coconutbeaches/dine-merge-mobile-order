"use client";

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import PopupMessageText from '@/components/menu/PopupMessageText';
import { toast } from 'sonner';

type PopupNotice = {
  message: string;
  expires_at: string;
  created_at?: string;
  updated_at?: string;
};

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function defaultBangkokExpiryInput() {
  const bangkokNow = new Date(Date.now() + BANGKOK_OFFSET_MS);
  return `${bangkokNow.getUTCFullYear()}-${pad(bangkokNow.getUTCMonth() + 1)}-${pad(
    bangkokNow.getUTCDate()
  )}T23:59`;
}

function isoToBangkokInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return defaultBangkokExpiryInput();

  const bangkok = new Date(date.getTime() + BANGKOK_OFFSET_MS);
  return `${bangkok.getUTCFullYear()}-${pad(bangkok.getUTCMonth() + 1)}-${pad(
    bangkok.getUTCDate()
  )}T${pad(bangkok.getUTCHours())}:${pad(bangkok.getUTCMinutes())}`;
}

function bangkokInputToIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match.map(Number);
  const utcMillis =
    Date.UTC(year, month - 1, day, hour, minute, 0, 0) - BANGKOK_OFFSET_MS;
  const date = new Date(utcMillis);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatBangkokTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export default function PopupAdminPage() {
  const [message, setMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState(defaultBangkokExpiryInput());
  const [notice, setNotice] = useState<PopupNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const isActive = useMemo(() => {
    if (!notice?.expires_at) return false;
    return new Date(notice.expires_at).getTime() > Date.now();
  }, [notice]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/admin/popup', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Failed to load popup');
        if (cancelled) return;

        const loadedNotice = payload.notice as PopupNotice | null;
        setNotice(loadedNotice);
        if (loadedNotice) {
          setMessage(loadedNotice.message || '');
          setExpiresAt(isoToBangkokInput(loadedNotice.expires_at));
        } else {
          setExpiresAt(defaultBangkokExpiryInput());
        }
      } catch (error) {
        console.error('[admin/popup] Load failed:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load popup');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error('Enter a popup message first');
      return;
    }

    const expiresIso = bangkokInputToIso(expiresAt);
    if (!expiresIso) {
      toast.error('Choose a valid expiration time');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/popup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, expiresAt: expiresIso }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to save popup');

      const saved = payload.notice as PopupNotice;
      setNotice(saved);
      setMessage(saved.message);
      setExpiresAt(isoToBangkokInput(saved.expires_at));
      toast.success('Popup saved');
    } catch (error) {
      console.error('[admin/popup] Save failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save popup');
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setClearing(true);
    try {
      const response = await fetch('/api/admin/popup', { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to clear popup');

      setNotice(null);
      setMessage('');
      setExpiresAt(defaultBangkokExpiryInput());
      toast.success('Popup cleared');
    } catch (error) {
      console.error('[admin/popup] Clear failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clear popup');
    } finally {
      setClearing(false);
    }
  };

  return (
    <Layout title="Popup" showBackButton>
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Popup</h1>
          <p className="mt-1 text-sm text-gray-600">
            Add one temporary message to the menu toaster.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-6">
            <div>
              <label htmlFor="popup-message" className="mb-2 block text-sm font-medium">
                Message
              </label>
              <textarea
                id="popup-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={500}
                rows={4}
                placeholder="**Last order today is 4pm**"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
              <p className="mt-1 text-xs text-gray-500">
                Markdown: **bold**, *italic*, or ***bold italic***. Maximum 500 characters.
              </p>
            </div>

            <div>
              <label htmlFor="popup-expiry" className="mb-2 block text-sm font-medium">
                Expires at — Bangkok time (UTC+7)
              </label>
              <input
                id="popup-expiry"
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
              <p className="mt-1 text-xs text-gray-500">
                New popups default to 11:59 PM today in Bangkok.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={save}
                disabled={saving || clearing}
                className="bg-black text-white"
              >
                {saving ? 'Saving...' : 'Save popup'}
              </Button>
              {notice && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={clear}
                  disabled={saving || clearing}
                >
                  {clearing ? 'Clearing...' : 'Clear popup'}
                </Button>
              )}
            </div>

            <div className="text-sm">
              {!notice && <span className="text-gray-500">Status: None</span>}
              {notice && isActive && (
                <span className="font-medium text-green-700">
                  Active until {formatBangkokTime(notice.expires_at)} Bangkok time
                </span>
              )}
              {notice && !isActive && (
                <span className="font-medium text-amber-700">
                  Expired {formatBangkokTime(notice.expires_at)} Bangkok time
                </span>
              )}
            </div>

            {message.trim() && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Preview
                </p>
                <div className="rounded-2xl bg-black px-5 py-4 text-base leading-snug text-white shadow-xl">
                  <PopupMessageText message={message.trim()} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
