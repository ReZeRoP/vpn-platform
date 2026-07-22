'use client';

import type { Plan } from '@app/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Empty, Notice, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';

const money = new Intl.NumberFormat('fa-IR');

export default function StorePage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api<Plan[]>('/plans').then(setPlans).catch((e: Error) => setError(e.message)).finally(() => setLoading(false)); }, []);
  return (
    <main className="page-wrap">
      <PageTitle title="پلن‌های اتصال" subtitle="تحویل خودکار کانفیگ از موجودی امن، بلافاصله پس از تأیید پرداخت" />
      {loading ? <Spinner /> : error ? <Notice>{error}</Notice> : plans.length === 0 ? <Empty title="فعلاً پلنی موجود نیست" description="به‌زودی ظرفیت‌های تازه اضافه می‌شوند." /> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <article key={plan.id} className={`card relative flex min-h-72 flex-col overflow-hidden p-6 ${index === 0 ? 'border-blue-500/30' : ''}`}>
              {index === 0 && <span className="absolute left-5 top-5 text-[11px] font-bold text-blue-300">پیشنهاد ما</span>}
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.05] text-sm">{plan.durationDays}</div>
              <h2 className="text-xl font-bold">{plan.title}</h2>
              <p className="mt-2 min-h-14 text-sm leading-7 text-[var(--muted)]">{plan.description || 'اتصال پرسرعت و پایدار با تحویل آنی'}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                <span className="chip">{money.format(plan.durationDays)} روز</span>
                <span className="chip">{plan.dataLimitGb == null ? 'حجم نامحدود' : `${money.format(plan.dataLimitGb)} گیگ`}</span>
                <span className={`chip ${plan.stock === 0 ? 'text-red-300' : 'text-emerald-300'}`}>{plan.stock === 0 ? 'ناموجود' : `${money.format(plan.stock ?? 0)} موجود`}</span>
              </div>
              <div className="mt-auto flex items-end justify-between pt-7">
                <div><strong className="text-xl">{money.format(plan.price)}</strong><span className="mr-1 text-xs text-[var(--muted)]">تومان</span></div>
                <Link href={`/checkout?plan=${plan.id}`} aria-disabled={plan.stock === 0} className={`rounded-lg px-4 py-2.5 text-sm font-bold ${plan.stock === 0 ? 'pointer-events-none bg-white/5 text-white/25' : 'bg-white text-black'}`}>انتخاب</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
