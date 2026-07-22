'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/stores/auth';

export function Protected({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const router = useRouter();
  const { hydrated, user } = useAuth();
  useEffect(() => {
    if (hydrated && (!user || (admin && user.role !== 'ADMIN'))) {
      router.replace(user ? '/' : `/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    }
  }, [admin, hydrated, router, user]);
  if (!hydrated || !user || (admin && user.role !== 'ADMIN')) return <Spinner label="در حال بررسی دسترسی" />;
  return <>{children}</>;
}
