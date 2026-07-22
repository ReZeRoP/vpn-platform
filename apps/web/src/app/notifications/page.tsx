'use client';

import type { Notification } from '@app/shared';
import { useEffect, useState } from 'react';
import { Protected } from '@/components/protected';
import { Empty, Notice, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatJalaliDateTime } from '@/lib/date';

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () =>
    api<Notification[]>('/notifications')
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  async function readAll() {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'عملیات ناموفق بود');
    }
  }

  async function readOne(id: string) {
    try {
      await api(`/notifications/${id}/read`, { method: 'POST' });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // silent
    }
  }

  return (
    <Protected>
      <main className="page-wrap max-w-3xl">
        <PageTitle
          title="اعلان‌ها"
          subtitle="وضعیت سفارش‌ها و سایر رویدادها"
          action={
            items.some((n) => !n.isRead) && (
              <button onClick={readAll} className="btn-outline btn px-4 text-sm">خواندن همه</button>
            )
          }
        />
        {error && <div className="mb-5"><Notice>{error}</Notice></div>}
        {loading ? <Spinner /> : items.length === 0 ? <Empty title="اعلانی ندارید" /> : (
          <div className="space-y-2">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.isRead && readOne(n.id)}
                className={`card w-full p-4 text-right transition ${n.isRead ? 'opacity-60' : 'border-blue-500/25'}`}
              >
                <div className="flex items-start gap-3">
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-400" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {n.body && <p className="mt-1 text-sm leading-7 text-[var(--muted)]">{n.body}</p>}
                    <p className="mt-1.5 text-xs text-[var(--muted)]">{formatJalaliDateTime(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </Protected>
  );
}
