import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'هالوکُن | اینترنت آزاد', template: '%s | هالوکُن' },
  description: 'اینترنت آزاد برای همه — خرید کانفیگ با تحویل خودکار و چت لحظه‌ای',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
          rel="stylesheet"
        />
      </head>
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
