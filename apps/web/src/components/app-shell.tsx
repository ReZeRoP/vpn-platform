'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/stores/auth';
import { api } from '@/lib/api';

const links = [
  { href: '/store', label: 'فروشگاه' },
  { href: '/orders', label: 'سفارش‌ها' },
  { href: '/wallet', label: 'کیف پول' },
  { href: '/chat', label: 'گفتگو' },
  { href: '/support', label: 'پشتیبانی' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated, loadMe, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (hydrated && user) loadMe().catch(() => undefined);
  }, [hydrated, user?.id, loadMe]);

  useEffect(() => {
    if (!hydrated || !user) return;
    api<{ count: number }>('/notifications/unread-count')
      .then((data) => setUnread(data.count))
      .catch(() => undefined);
    const interval = setInterval(() => {
      api<{ count: number }>('/notifications/unread-count')
        .then((data) => setUnread(data.count))
        .catch(() => undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, [hydrated, user]);

  useEffect(() => setOpen(false), [pathname]);

  const nav = user ? links : links.filter((link) => link.href === '/store');
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/[.07] bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-black tracking-tight">hollowcon</Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((link) => (
              <Link key={link.href} href={link.href} className={`nav-link ${pathname.startsWith(link.href) ? 'nav-active' : ''}`}>
                {link.label}
              </Link>
            ))}
            {user?.role === 'ADMIN' && <Link href="/admin" className={`nav-link ${pathname === '/admin' ? 'nav-active' : ''}`}>مدیریت</Link>}
            {user && (
              <Link href="/notifications" className={`nav-link relative ${pathname === '/notifications' ? 'nav-active' : ''}`}>
                اعلان‌ها
                {unread > 0 && <span className="absolute -top-0.5 -left-0.5 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>}
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {!hydrated ? <span className="h-8 w-16 animate-pulse rounded-lg bg-white/5" /> : user ? (
              <button className="hidden text-sm text-[var(--muted)] transition hover:text-white sm:block" onClick={async () => { await logout(); router.push('/'); }}>
                خروج از {user.username}
              </button>
            ) : (
              <Link className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black" href="/login">ورود</Link>
            )}
            <button aria-label="نمایش منو" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 md:hidden" onClick={() => setOpen(!open)}>
              <span className="text-lg">{open ? '×' : '☰'}</span>
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-white/[.07] bg-black px-4 py-3 md:hidden">
            {nav.map((link) => <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-3 text-sm text-[var(--muted)]">{link.label}</Link>)}
            {user?.role === 'ADMIN' && <Link href="/admin" className="block rounded-lg px-3 py-3 text-sm text-[var(--muted)]">مدیریت</Link>}
            {user && <Link href="/notifications" className="block rounded-lg px-3 py-3 text-sm text-[var(--muted)]">اعلان‌ها {unread > 0 ? `(${unread})` : ''}</Link>}
            {user && <button className="w-full rounded-lg px-3 py-3 text-right text-sm text-red-300" onClick={() => logout()}>خروج</button>}
          </nav>
        )}
      </header>
      {children}
    </div>
  );
}
