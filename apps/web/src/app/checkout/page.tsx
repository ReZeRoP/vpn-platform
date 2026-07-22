'use client';

import type { Order, PaymentMethod, Plan } from '@app/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { Protected } from '@/components/protected';
import { Notice, PageTitle, Spinner } from '@/components/ui';
import { api, upload } from '@/lib/api';

const money = new Intl.NumberFormat('fa-IR');

function Checkout() {
  const router = useRouter();
  const query = useSearchParams();
  const planId = query.get('plan');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('RECEIPT');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  useEffect(() => {
    Promise.all([
      api<Plan[]>('/plans'),
      api<{ cardNumber: string; cardHolder: string }>('/settings/public'),
    ]).then(([items, settings]) => {
      setPlan(items.find((item) => item.id === planId) ?? null);
      setCardNumber(settings.cardNumber);
      setCardHolder(settings.cardHolder);
    }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [planId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan) return;
    setBusy(true); setError('');
    try {
      const data = new FormData(event.currentTarget);
      let receiptUrl: string | undefined;
      const file = data.get('receipt');
      if (method === 'RECEIPT' && file instanceof File && file.size) {
        receiptUrl = (await upload<{ url: string }>('/upload/receipt', file)).url;
      }
      await api<Order>('/orders', { method: 'POST', body: JSON.stringify({
        planId: plan.id,
        paymentMethod: method,
        receiptUrl,
        transactionId: String(data.get('transactionId') || '').trim() || undefined,
        couponCode: String(data.get('couponCode') || '').trim() || undefined,
      }) });
      router.push('/orders?created=1');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'ثبت سفارش انجام نشد'); }
    finally { setBusy(false); }
  }

  if (loading) return <Spinner />;
  if (!plan) return <main className="page-wrap max-w-3xl"><PageTitle title="تکمیل خرید" subtitle="پلن انتخاب‌شده در دسترس نیست" /><Notice>پلن مورد نظر یافت نشد. از فروشگاه یک پلن انتخاب کنید.</Notice></main>;
  return (
    <main className="page-wrap max-w-3xl">
      <PageTitle title="تکمیل خرید" subtitle={plan ? `پلن ${plan.title}` : 'پلن انتخاب‌شده در دسترس نیست'} />
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      {plan && <form className="grid gap-5 md:grid-cols-[1fr_280px]" onSubmit={submit}>
        <div className="card space-y-5 p-5 sm:p-6">
          <div><span className="label">روش پرداخت</span><div className="grid grid-cols-2 gap-2">
            {(['RECEIPT', 'WALLET'] as PaymentMethod[]).map((value) => <button type="button" key={value} onClick={() => setMethod(value)} className={`rounded-xl border p-4 text-sm transition ${method === value ? 'border-blue-400/60 bg-blue-500/10 text-white' : 'border-white/10 text-[var(--muted)]'}`}>{value === 'RECEIPT' ? 'کارت به کارت' : 'کیف پول'}</button>)}
          </div></div>
          {method === 'RECEIPT' && <>
            <div className="rounded-xl border border-white/10 bg-white/[.025] p-4 text-center"><p className="text-xs text-[var(--muted)]">واریز به کارت</p><p dir="ltr" className="my-2 select-all font-mono text-lg tracking-wider">{cardNumber}</p><p className="text-sm">به نام {cardHolder}</p></div>
            <label><span className="label">تصویر رسید</span><input className="field file:ml-3 file:rounded-md file:border-0 file:px-3 file:py-1" name="receipt" type="file" accept="image/*" /></label>
            <label><span className="label">شناسه تراکنش <span className="text-white/30">(در صورت نداشتن تصویر)</span></span><input className="field" name="transactionId" dir="ltr" /></label>
          </>}
          <label><span className="label">کد تخفیف <span className="text-white/30">(اختیاری)</span></span><input className="field" name="couponCode" dir="ltr" /></label>
        </div>
        <aside className="card h-fit p-5"><p className="text-sm text-[var(--muted)]">مبلغ سفارش</p><p className="mt-2 text-2xl font-black">{money.format(plan.price)} <small className="text-xs font-normal text-[var(--muted)]">تومان</small></p><div className="my-5 border-t border-white/10" /><button className="btn w-full px-3" disabled={busy}>{busy ? 'در حال ثبت…' : 'ثبت سفارش'}</button><p className="mt-4 text-center text-xs leading-6 text-[var(--muted)]">پرداخت کیف پول در صورت موجودی کافی، آنی تحویل می‌شود.</p></aside>
      </form>}
    </main>
  );
}

export default function CheckoutPage() { return <Protected><Suspense fallback={<Spinner />}><Checkout /></Suspense></Protected>; }
