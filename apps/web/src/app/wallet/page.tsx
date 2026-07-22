'use client';

import type { WalletTransaction } from '@app/shared';
import { useEffect, useState } from 'react';
import { Protected } from '@/components/protected';
import { Empty, Notice, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatJalali } from '@/lib/date';
import { useAuth } from '@/stores/auth';

const money = new Intl.NumberFormat('fa-IR');
type WalletResponse = { balance: number; transactions: WalletTransaction[] };

export default function WalletPage() {
  const { profile, loadMe } = useAuth();
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([
      loadMe().catch(() => undefined),
      api<WalletResponse | WalletTransaction[]>('/wallet/transactions').then((data) => {
        if (Array.isArray(data)) setItems(data); else { setItems(data.transactions); setBalance(data.balance); }
      }),
    ]).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [loadMe]);
  const shownBalance = balance ?? profile?.walletBalance ?? 0;
  return <Protected><main className="page-wrap max-w-4xl">
    <PageTitle title="کیف پول" subtitle="موجودی و گردش حساب شما" />
    <section className="card mb-6 overflow-hidden p-6 sm:p-8"><p className="text-sm text-[var(--muted)]">موجودی قابل استفاده</p><p className="mt-3 text-3xl font-black sm:text-4xl">{money.format(shownBalance)} <small className="text-sm font-normal text-[var(--muted)]">تومان</small></p></section>
    {loading ? <Spinner /> : error ? <Notice>{error}</Notice> : items.length === 0 ? <Empty title="گردش حسابی ثبت نشده" /> : <div className="card divide-y divide-white/[.07] overflow-hidden">{items.map((txn) => <div key={txn.id} className="flex items-center justify-between gap-4 p-4 sm:px-6"><div><p className="text-sm font-semibold">{({ TOPUP: 'افزایش موجودی', PURCHASE: 'خرید سرویس', REFUND: 'بازگشت وجه', REFERRAL_BONUS: 'پاداش معرفی', ADMIN_ADJUST: 'اصلاح موجودی' } as const)[txn.type]}</p><p className="mt-1 text-xs text-[var(--muted)]">{formatJalali(txn.createdAt)}{txn.reference ? ` · ${txn.reference}` : ''}</p></div><div className="text-left"><strong dir="ltr" className={txn.amount >= 0 ? 'text-emerald-300' : 'text-red-300'}>{txn.amount >= 0 ? '+' : ''}{money.format(txn.amount)}</strong><p className="mt-1 text-xs text-[var(--muted)]">مانده {money.format(txn.balanceAfter)}</p></div></div>)}</div>}
  </main></Protected>;
}
