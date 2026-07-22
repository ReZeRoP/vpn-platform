'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Notice } from '@/components/ui';
import { useAuth } from '@/stores/auth';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const search = useSearchParams();
  const { user, hydrated, busy, login, register } = useAuth();
  const [error, setError] = useState('');
  const isLogin = mode === 'login';

  useEffect(() => {
    if (hydrated && user) router.replace(search.get('next') || '/store');
  }, [hydrated, router, search, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    const values = {
      username: String(data.get('username') ?? '').trim(),
      password: String(data.get('password') ?? ''),
      referralCode: String(data.get('referralCode') ?? '').trim() || undefined,
    };
    try {
      await (isLogin ? login(values) : register(values));
      router.replace(search.get('next') || '/store');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ورود انجام نشد');
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-12">
      <div className="card w-full p-6 sm:p-8">
        <div className="mb-8">
          <span className="mb-4 block h-1 w-10 rounded-full bg-[var(--accent)]" />
          <h1 className="text-2xl font-extrabold">{isLogin ? 'ورود به حساب' : 'ساخت حساب تازه'}</h1>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{isLogin ? 'برای دسترسی به سفارش‌ها و گفتگو وارد شوید.' : 'نام کاربری انگلیسی و یک رمز امن انتخاب کنید.'}</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <label><span className="label">نام کاربری</span><input className="field" name="username" dir="ltr" autoComplete="username" minLength={3} required /></label>
          <label><span className="label">رمز عبور</span><input className="field" name="password" dir="ltr" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={6} required /></label>
          {!isLogin && <label><span className="label">کد معرف <span className="text-white/30">(اختیاری)</span></span><input className="field" name="referralCode" dir="ltr" /></label>}
          {error && <Notice>{error}</Notice>}
          <button className="btn w-full" disabled={busy}>{busy ? 'کمی صبر کنید…' : isLogin ? 'ورود' : 'ثبت‌نام'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          {isLogin ? 'هنوز حساب ندارید؟' : 'قبلاً ثبت‌نام کرده‌اید؟'}{' '}
          <Link className="text-white underline decoration-white/25 underline-offset-4" href={isLogin ? '/register' : '/login'}>{isLogin ? 'ثبت‌نام' : 'ورود'}</Link>
        </p>
      </div>
    </main>
  );
}
