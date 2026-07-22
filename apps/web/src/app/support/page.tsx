'use client';

import type { ConversationView } from '@app/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Protected } from '@/components/protected';
import { Empty, Notice, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';

export default function SupportPage() {
  const router = useRouter();
  const [items, setItems] = useState<ConversationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = () => api<ConversationView[]>('/conversations').then((all) => setItems(all.filter((item) => item.type === 'SUPPORT')));
  useEffect(() => { load().catch((e: Error) => setError(e.message)).finally(() => setLoading(false)); }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = new FormData(event.currentTarget); const conv = await api<ConversationView>('/conversations/support', { method: 'POST', body: JSON.stringify({ title: data.get('title') }) }); router.push(`/chat?conversation=${conv.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'ایجاد گفتگو ممکن نشد'); setBusy(false); }
  }
  return <Protected><main className="page-wrap max-w-3xl"><PageTitle title="پشتیبانی" subtitle="درخواست خود را مطرح کنید و پاسخ را در گفتگوی زنده دریافت کنید" />
    <form onSubmit={create} className="card mb-6 flex flex-col gap-3 p-5 sm:flex-row"><input name="title" className="field" minLength={2} maxLength={120} required placeholder="موضوع درخواست؛ مثلاً مشکل اتصال" /><button disabled={busy} className="btn whitespace-nowrap px-5">{busy ? 'در حال ایجاد…' : 'گفتگوی جدید'}</button></form>
    {error && <div className="mb-5"><Notice>{error}</Notice></div>}
    {loading ? <Spinner /> : items.length === 0 ? <Empty title="درخواست بازی ندارید" /> : <div className="space-y-3">{items.map((item) => <Link href={`/chat?conversation=${item.id}`} key={item.id} className="card flex items-center justify-between p-5 transition hover:border-white/20"><div><h2 className="font-semibold">{item.title || 'پشتیبانی'}</h2><p className="mt-1 max-w-sm truncate text-xs text-[var(--muted)]">{item.lastMessage?.content || 'گفتگو را آغاز کنید'}</p></div><span className="text-sm text-blue-300">ادامه گفتگو ←</span></Link>)}</div>}
  </main></Protected>;
}
