import Link from 'next/link';
import { formatJalali } from '@/lib/date';

export default function HomePage() {
  const today = formatJalali(new Date());

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16 sm:px-12">
        <div className="fade f2 mb-9 inline-flex items-center gap-2 self-start text-[13px] text-[var(--muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          همه سرویس‌ها فعال
        </div>

        <h1 className="fade f2 max-w-[15ch] text-[clamp(2.8rem,7vw,5.5rem)] font-extrabold leading-[1.18] tracking-tight">
          اینترنت آزاد <span className="font-light text-[var(--muted)]">برای</span> همه.
        </h1>

        <p className="fade f3 mt-7 max-w-[48ch] text-[clamp(1.05rem,1.8vw,1.2rem)] leading-[2.1] text-[var(--muted)]">
          کانفیگ پرسرعت، تحویل خودکار و لحظه‌ای پس از پرداخت. یک کلیک تا کپی، یک اسکن تا اتصال.
        </p>

        <div className="fade f4 mt-11 flex flex-wrap items-center gap-6">
          <Link href="/store" className="btn">مشاهده پلن‌ها</Link>
          <Link href="/chat" className="btn">چت عمومی</Link>
          <Link href="/support" className="link">
            <span className="arrow">←</span> گفتگو با پشتیبانی
          </Link>
        </div>
      </main>

      <footer className="fade f5 flex items-center justify-between px-6 py-6 text-xs text-[var(--muted)] sm:px-12">
        <span className="fa-nums">{today}</span>
        <span>hollowcon</span>
      </footer>
    </div>
  );
}
