'use client';

import type { ReactNode } from 'react';

export function Spinner({ label = 'در حال بارگذاری' }: { label?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-sm text-[var(--muted)]">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-white" />
      <span>{label}</span>
    </div>
  );
}

export function Notice({
  children,
  tone = 'error',
}: {
  children: ReactNode;
  tone?: 'error' | 'success' | 'neutral';
}) {
  const styles = tone === 'error'
    ? 'border-red-500/25 bg-red-500/10 text-red-200'
    : tone === 'success'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
      : 'border-white/10 bg-white/[.03] text-[var(--muted)]';
  return <div className={`rounded-xl border px-4 py-3 text-sm leading-7 ${styles}`}>{children}</div>;
}

export function Empty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card flex min-h-48 flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 block h-2 w-2 rounded-full bg-white/25" />
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-7 text-[var(--muted)]">{description}</p>}
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
