'use client';

import type { Order, OrderStatus } from '@app/shared';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { Protected } from '@/components/protected';
import { Empty, Notice, PageTitle, Spinner } from '@/components/ui';
import { api, mediaUrl } from '@/lib/api';
import { formatJalali } from '@/lib/date';

const money = new Intl.NumberFormat('fa-IR');
const status: Record<OrderStatus, { text: string; style: string }> = {
  PENDING: { text: 'در انتظار بررسی', style: 'text-amber-300 border-amber-500/25' },
  APPROVED: { text: 'تأیید شده', style: 'text-blue-300 border-blue-500/25' },
  REJECTED: { text: 'رد شده', style: 'text-red-300 border-red-500/25' },
  FULFILLED: { text: 'تحویل شده', style: 'text-emerald-300 border-emerald-500/25' },
  EXPIRED: { text: 'منقضی شده', style: 'text-white/40 border-white/10' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  useEffect(() => { api<Order[]>('/orders/mine').then(setOrders).catch((e: Error) => setError(e.message)).finally(() => setLoading(false)); }, []);
  async function copy(value: string, id: string) {
    await navigator.clipboard.writeText(value);
    setCopied(id); setTimeout(() => setCopied(''), 1800);
  }
  return <Protected><main className="page-wrap">
    <PageTitle title="سفارش‌های من" subtitle="وضعیت پرداخت، رسیدها و کانفیگ‌های تحویل‌شده" />
    {loading ? <Spinner /> : error ? <Notice>{error}</Notice> : orders.length === 0 ? <Empty title="هنوز سفارشی ندارید" description="از فروشگاه پلن مناسب خود را انتخاب کنید." /> : <div className="space-y-4">
      {orders.map((order) => <article key={order.id} className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div><div className="mb-2 flex flex-wrap items-center gap-2"><h2 className="font-bold">{order.plan?.title || 'سفارش سرویس'}</h2><span className={`chip ${status[order.status].style}`}>{status[order.status].text}</span></div><p className="text-xs text-[var(--muted)]">{formatJalali(order.createdAt)} · شناسه {order.id.slice(-8)}</p></div>
          <div className="text-left"><strong>{money.format(order.amount)}</strong><span className="mr-1 text-xs text-[var(--muted)]">تومان</span><p className="mt-1 text-xs text-[var(--muted)]">{order.paymentMethod === 'WALLET' ? 'کیف پول' : 'کارت به کارت'}</p></div>
        </div>
        {(order.receiptUrl || order.transactionId || order.adminNote) && <div className="flex flex-wrap gap-4 border-t border-white/[.07] px-5 py-4 text-xs text-[var(--muted)] sm:px-6">
          {order.receiptUrl && <a className="text-blue-300" href={mediaUrl(order.receiptUrl)} target="_blank" rel="noreferrer">مشاهده رسید</a>}
          {order.transactionId && <span>تراکنش: <b dir="ltr" className="text-white">{order.transactionId}</b></span>}
          {order.adminNote && <span>یادداشت مدیریت: <b className="text-white">{order.adminNote}</b></span>}
        </div>}
        {order.fulfilledConfig && <div className="grid gap-5 border-t border-emerald-500/20 bg-emerald-500/[.035] p-5 sm:grid-cols-[1fr_auto] sm:p-6">
          <div className="min-w-0"><p className="mb-2 text-xs font-bold text-emerald-300">کانفیگ آماده اتصال</p><code dir="ltr" className="block overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-black p-3 text-xs text-white/70">{order.fulfilledConfig.configString}</code><div className="mt-3 flex items-center gap-3"><button className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-black" onClick={() => copy(order.fulfilledConfig!.configString, order.id)}>{copied === order.id ? 'کپی شد' : 'کپی کانفیگ'}</button>{order.expiresAt && <span className="text-xs text-[var(--muted)]">اعتبار تا {formatJalali(order.expiresAt)}</span>}</div></div>
          <div className="w-fit rounded-xl bg-white p-2"><QRCodeSVG value={order.fulfilledConfig.configString} size={112} level="M" /></div>
        </div>}
      </article>)}
    </div>}
  </main></Protected>;
}
