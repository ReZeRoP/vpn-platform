import { formatJalali, toPersianDigits } from '@/lib/date';

export default function HomePage() {
  const now = formatJalali(new Date());
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">فروشگاه کانفیگ و گفتگو</h1>
        <p className="text-muted">پلتفرم فروش کانفیگ با تحویل خودکار و چت لحظه‌ای</p>
        <span className="fa-nums text-sm text-muted">امروز: {now}</span>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="glass rounded-xl2 p-6">
          <h2 className="mb-2 text-lg font-semibold text-neon-blue">فروشگاه انبار کانفیگ</h2>
          <p className="text-sm text-muted">
            پلن‌ها، موجودی، و تحویل خودکار پس از تأیید رسید.
          </p>
        </div>
        <div className="glass rounded-xl2 p-6">
          <h2 className="mb-2 text-lg font-semibold text-neon-emerald">چت لحظه‌ای</h2>
          <p className="text-sm text-muted">
            گفتگوی عمومی، خصوصی، و پشتیبانی با تیک‌های خوانده‌شدن.
          </p>
        </div>
      </section>

      <div>
        <button className="btn-neon fa-nums">شروع خرید — {toPersianDigits(0)} کالا</button>
      </div>
    </main>
  );
}
