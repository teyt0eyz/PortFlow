import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'PortFlow - บันทึกหุ้น',
  description: 'ระบบจดบันทึกการลงทุนและคำนวณภาษีสำหรับคนไทย',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563EB',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <div className="max-w-lg mx-auto min-h-screen flex flex-col relative">
          <main className="flex-1 pb-safe overflow-x-hidden">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
