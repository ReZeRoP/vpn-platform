import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'فروشگاه کانفیگ',
  description: 'خرید کانفیگ و گفتگوی لحظه‌ای',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-void text-[#f5f5f7] antialiased">{children}</body>
    </html>
  );
}
