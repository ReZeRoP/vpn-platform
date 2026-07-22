'use client';

import type { Order, Plan } from '@app/shared';
import { FormEvent, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/stores/auth';
import { api, mediaUrl } from '@/lib/api';
import { formatJalali } from '@/lib/date';
import { Empty, Notice, PageTitle, Spinner } from '@/components/ui';

const money = new Intl.NumberFormat('fa-IR');

type Tab = 'stats' | 'orders' | 'plans' | 'users' | 'coupons' | 'settings';

interface Stats {
  users: number;
  pendingOrders: number;
  fulfilledOrders: number;
  availableStock: number;
  revenue: number;
}

interface AdminUser {
  id: string;
  username: string;
  phone: string | null;
  email: string | null;
  role: 'USER' | 'ADMIN';
  isBanned: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  walletBalance: number;
  orderCount: number;
}

interface Coupon {
  id: string;
  code: string;
  percentOff: number | null;
  amountOff: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

interface Settings {
  payment_card_number: string;
  payment_card_holder: string;
}

const tabs: { key: Tab; label: string }[] = [
  { key: 'stats', label: 'داشبورد' },
  { key: 'orders', label: 'سفارش‌ها' },
  { key: 'plans', label: 'پلن‌ها' },
  { key: 'users', label: 'کاربران' },
  { key: 'coupons', label: 'تخفیف' },
  { key: 'settings', label: 'تنظیمات' },
];

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('stats');
  const { user } = useAuth();

  return (
    <main className="page-wrap">
      <PageTitle title="پنل مدیریت" subtitle={`خوش آمدید ${user?.username}`} />
      <div className="mb-6 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.key ? 'bg-white text-black' : 'border border-white/10 text-[var(--muted)] hover:bg-white/5'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <StatsTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'plans' && <PlansTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'coupons' && <CouponsTab />}
      {tab === 'settings' && <SettingsTab />}
    </main>
  );
}

// ============ STATS TAB ============
function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<Stats>('/admin/stats').then(setStats).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <Notice>{error}</Notice>;
  if (!stats) return <Spinner />;

  const cards = [
    { label: 'کاربران', value: stats.users, color: 'text-blue-300' },
    { label: 'سفارش‌های در انتظار', value: stats.pendingOrders, color: 'text-amber-300' },
    { label: 'سفارش‌های تحویل‌شده', value: stats.fulfilledOrders, color: 'text-emerald-300' },
    { label: 'موجودی انبار', value: stats.availableStock, color: 'text-violet-300' },
    { label: 'درآمد کل (تومان)', value: money.format(stats.revenue), color: 'text-emerald-300' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="card p-5">
          <p className="text-sm text-[var(--muted)]">{card.label}</p>
          <p className={`mt-2 text-2xl font-black ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// ============ ORDERS TAB ============
function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback((status: string) => {
    setLoading(true);
    api<Order[]>(`/admin/orders${status ? `?status=${status}` : ''}`)
      .then(setOrders)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  async function review(id: string, action: 'APPROVE' | 'REJECT', note?: string) {
    setBusy(id);
    try {
      await api(`/admin/orders/${id}/review`, { method: 'POST', body: JSON.stringify({ action, adminNote: note }) });
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'عملیات ناموفق بود');
    } finally {
      setBusy('');
    }
  }

  const filters = ['', 'PENDING', 'FULFILLED', 'REJECTED'];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f || 'all'}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === f ? 'bg-white text-black' : 'border border-white/10 text-[var(--muted)]'}`}
          >
            {f === '' ? 'همه' : f === 'PENDING' ? 'در انتظار' : f === 'FULFILLED' ? 'تحویل‌شده' : 'ردشده'}
          </button>
        ))}
      </div>
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {loading ? <Spinner /> : orders.length === 0 ? <Empty title="سفارشی یافت نشد" /> : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{order.plan?.title || 'سفارش'}</span>
                    <span className="chip text-xs">{order.user?.username || 'کاربر'}</span>
                    <span className="chip text-xs">{order.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{formatJalali(order.createdAt)} · {money.format(order.amount)} تومان</p>
                  {order.transactionId && <p className="mt-1 text-xs text-[var(--muted)]">تراکنش: <b dir="ltr" className="text-white">{order.transactionId}</b></p>}
                  {order.adminNote && <p className="mt-1 text-xs text-[var(--muted)]">یادداشت: {order.adminNote}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {order.receiptUrl && (
                    <a href={mediaUrl(order.receiptUrl)} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5">مشاهده رسید</a>
                  )}
                  {order.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => review(order.id, 'APPROVE')}
                        disabled={busy === order.id}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >تأیید</button>
                      <button
                        onClick={() => { const note = prompt('دلیل رد سفارش:'); if (note !== null) review(order.id, 'REJECT', note); }}
                        disabled={busy === order.id}
                        className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                      >رد</button>
                    </>
                  )}
                </div>
              </div>
              {order.fulfilledConfig && (
                <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[.05] p-3">
                  <p className="text-xs text-emerald-300">کانفیگ تحویل‌شده:</p>
                  <code dir="ltr" className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-white/70">{order.fulfilledConfig.configString}</code>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ PLANS TAB ============
function PlansTab() {
  const [plans, setPlans] = useState<(Plan & { stock?: number; sold?: number; lowStock?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [inventoryFor, setInventoryFor] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api<(Plan & { stock: number; sold: number; lowStock: boolean })[]>('/admin/plans')
      .then(setPlans)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setShowCreate(!showCreate)} className="btn px-4 text-sm">{showCreate ? 'انصراف' : 'پلن جدید'}</button>
      </div>
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}

      {showCreate && <CreatePlanForm onDone={() => { setShowCreate(false); load(); }} />}

      {inventoryFor && <InventoryForm planId={inventoryFor} onDone={() => { setInventoryFor(null); load(); }} />}

      {loading ? <Spinner /> : plans.length === 0 ? <Empty title="پلنی وجود ندارد" /> : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{plan.title}</h3>
                    {plan.isActive ? <span className="chip text-xs text-emerald-300">فعال</span> : <span className="chip text-xs text-red-300">غیرفعال</span>}
                    {plan.lowStock && <span className="chip text-xs text-amber-300">رو به اتمام</span>}
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{plan.durationDays} روز · {plan.dataLimitGb == null ? 'نامحدود' : `${plan.dataLimitGb} گیگ`} · {money.format(plan.price)} تومان</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">موجودی: {plan.stock ?? 0} · فروخته‌شده: {plan.sold ?? 0}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setInventoryFor(plan.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5">افزودن موجودی</button>
                  <button
                    onClick={async () => { await api(`/admin/plans/${plan.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !plan.isActive }) }); load(); }}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5"
                  >{plan.isActive ? 'غیرفعال‌کردن' : 'فعال‌کردن'}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreatePlanForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      await api('/admin/plans', {
        method: 'POST',
        body: JSON.stringify({
          title: data.get('title'),
          description: data.get('description') || undefined,
          durationDays: Number(data.get('durationDays')),
          dataLimitGb: data.get('dataLimitGb') ? Number(data.get('dataLimitGb')) : undefined,
          price: Number(data.get('price')),
        }),
      });
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : 'ایجاد ناموفق بود'); }
  }
  return (
    <form onSubmit={submit} className="card mb-4 space-y-3 p-5">
      {error && <Notice>{error}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="label">عنوان</span><input className="field" name="title" required minLength={2} /></label>
        <label><span className="label">مدت (روز)</span><input className="field" name="durationDays" type="number" min={1} required /></label>
        <label><span className="label">حجم (گیگ، خالی=نامحدود)</span><input className="field" name="dataLimitGb" type="number" min={0} /></label>
        <label><span className="label">قیمت (تومان)</span><input className="field" name="price" type="number" min={0} required /></label>
      </div>
      <label><span className="label">توضیحات</span><textarea className="field" name="description" rows={2} /></label>
      <button type="submit" className="btn px-5 text-sm">ایجاد پلن</button>
    </form>
  );
}

function InventoryForm({ planId, onDone }: { planId: string; onDone: () => void }) {
  const [error, setError] = useState('');
  const [added, setAdded] = useState<number | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = String(data.get('configs') || '');
    const configs = text.split('\n').map((c) => c.trim()).filter(Boolean);
    if (configs.length === 0) return;
    try {
      const result = await api<{ added: number }>(`/admin/plans/${planId}/inventory`, {
        method: 'POST',
        body: JSON.stringify({ configs }),
      });
      setAdded(result.added);
      setTimeout(onDone, 1500);
    } catch (err) { setError(err instanceof Error ? err.message : 'افزودن ناموفق بود'); }
  }
  return (
    <form onSubmit={submit} className="card mb-4 space-y-3 p-5">
      <h3 className="font-bold">افزودن موجودی (هر خط یک لینک ساب)</h3>
      {error && <Notice>{error}</Notice>}
      {added !== null && <Notice tone="success">{added} لینک اضافه شد</Notice>}
      <textarea className="field font-mono text-sm" name="configs" rows={6} placeholder="vless://...\nhttps://sub.example.com/...\n..." dir="ltr" />
      <button type="submit" className="btn px-5 text-sm">افزودن</button>
    </form>
  );
}

// ============ USERS TAB ============
function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adjusting, setAdjusting] = useState<string | null>(null);

  const load = (q?: string) => {
    setLoading(true);
    api<AdminUser[]>(`/admin/users${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(setUsers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function toggleBan(u: AdminUser) {
    try {
      await api(`/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ isBanned: !u.isBanned }) });
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isBanned: !u.isBanned } : x));
    } catch (e) { setError(e instanceof Error ? e.message : 'عملیات ناموفق بود'); }
  }

  async function toggleRole(u: AdminUser) {
    try {
      await api(`/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' }) });
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' as const } : x));
    } catch (e) { setError(e instanceof Error ? e.message : 'عملیات ناموفق بود'); }
  }

  async function adjustWallet(u: AdminUser) {
    const amountStr = prompt(`مبلغ تغییر موجودی ${u.username} (مثبت/منفی):`);
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (!amount) return;
    const note = prompt('توضیح:') || 'بدون توضیح';
    setAdjusting(u.id);
    try {
      await api(`/admin/wallet/${u.id}/adjust`, { method: 'POST', body: JSON.stringify({ amount, note }) });
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, walletBalance: x.walletBalance + amount } : x));
    } catch (e) { setError(e instanceof Error ? e.message : 'عملیات ناموفق بود'); }
    finally { setAdjusting(null); }
  }

  return (
    <div>
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); load(search); }}>
        <input className="field flex-1" placeholder="جستجوی نام کاربری، تلفن، ایمیل…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="btn-outline btn px-4 text-sm">جستجو</button>
      </form>
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {loading ? <Spinner /> : users.length === 0 ? <Empty title="کاربری یافت نشد" /> : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{u.username}</span>
                  {u.role === 'ADMIN' && <span className="chip text-xs text-blue-300">مدیر</span>}
                  {u.isBanned && <span className="chip text-xs text-red-300">مسدود</span>}
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">موجودی: {money.format(u.walletBalance)} تومان · {u.orderCount} سفارش</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => adjustWallet(u)} disabled={adjusting === u.id} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5 disabled:opacity-50">تغییر موجودی</button>
                <button onClick={() => toggleRole(u)} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5">{u.role === 'ADMIN' ? 'کاربر عادی' : 'مدیر کن'}</button>
                <button onClick={() => toggleBan(u)} className={`rounded-lg border px-3 py-2 text-xs ${u.isBanned ? 'border-emerald-500/30 text-emerald-300' : 'border-red-500/30 text-red-300'}`}>{u.isBanned ? 'رفع مسدودیت' : 'مسدود کن'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ COUPONS TAB ============
function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    api<Coupon[]>('/admin/coupons').then(setCoupons).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function toggle(c: Coupon) {
    await api(`/admin/coupons/${c.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !c.isActive }) });
    load();
  }

  async function remove(id: string) {
    if (!confirm('حذف این کد تخفیف؟')) return;
    await api(`/admin/coupons/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setShowCreate(!showCreate)} className="btn px-4 text-sm">{showCreate ? 'انصراف' : 'کد جدید'}</button>
      </div>
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {showCreate && <CreateCouponForm onDone={() => { setShowCreate(false); load(); }} />}
      {loading ? <Spinner /> : coupons.length === 0 ? <Empty title="کد تخفیفی وجود ندارد" /> : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <code dir="ltr" className="font-bold">{c.code}</code>
                  {c.isActive ? <span className="chip text-xs text-emerald-300">فعال</span> : <span className="chip text-xs text-red-300">غیرفعال</span>}
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {c.percentOff ? `${c.percentOff}% تخفیف` : c.amountOff ? `${money.format(c.amountOff)} تومان تخفیف` : '—'}
                  {' · '}استفاده: {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''}
                  {c.expiresAt && ` · انقضا: ${formatJalali(c.expiresAt)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggle(c)} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5">{c.isActive ? 'غیرفعال' : 'فعال'}</button>
                <button onClick={() => remove(c.id)} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10">حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateCouponForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      await api('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: data.get('code'),
          percentOff: data.get('percentOff') ? Number(data.get('percentOff')) : undefined,
          amountOff: data.get('amountOff') ? Number(data.get('amountOff')) : undefined,
          maxUses: data.get('maxUses') ? Number(data.get('maxUses')) : undefined,
        }),
      });
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : 'ایجاد ناموفق بود'); }
  }
  return (
    <form onSubmit={submit} className="card mb-4 space-y-3 p-5">
      {error && <Notice>{error}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="label">کد</span><input className="field" name="code" required minLength={2} dir="ltr" /></label>
        <label><span className="label">درصد تخفیف</span><input className="field" name="percentOff" type="number" min={1} max={100} /></label>
        <label><span className="label">مبلغ تخفیف (تومان)</span><input className="field" name="amountOff" type="number" min={1} /></label>
        <label><span className="label">حد استفاده</span><input className="field" name="maxUses" type="number" min={1} /></label>
      </div>
      <p className="text-xs text-[var(--muted)]">فقط یکی از درصد یا مبلغ را پر کنید.</p>
      <button type="submit" className="btn px-5 text-sm">ایجاد</button>
    </form>
  );
}

// ============ SETTINGS TAB ============
function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<Settings>('/admin/settings').then(setSettings).catch((e: Error) => setError(e.message));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true); setSaved(false);
    try {
      await api('/admin/settings', { method: 'PATCH', body: JSON.stringify(settings) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود'); }
    finally { setSaving(false); }
  }

  if (error) return <Notice>{error}</Notice>;
  if (!settings) return <Spinner />;

  return (
    <form onSubmit={submit} className="card max-w-lg space-y-4 p-5">
      <div>
        <span className="label">شماره کارت پرداخت</span>
        <input
          className="field font-mono"
          dir="ltr"
          value={settings.payment_card_number}
          onChange={(e) => setSettings({ ...settings, payment_card_number: e.target.value })}
          placeholder="۶۰۳۷-xxxx-xxxx-xxxx"
        />
      </div>
      <div>
        <span className="label">نام دارنده کارت</span>
        <input
          className="field"
          value={settings.payment_card_holder}
          onChange={(e) => setSettings({ ...settings, payment_card_holder: e.target.value })}
          placeholder="نام و نام خانوادگی"
        />
      </div>
      <p className="text-xs leading-6 text-[var(--muted)]">این اطلاعات در صفحه پرداخت به کاربران نمایش داده می‌شود.</p>
      <button type="submit" className="btn px-5 text-sm" disabled={saving}>{saving ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}</button>
      {saved && <Notice tone="success">تنظیمات ذخیره شد</Notice>}
    </form>
  );
}
