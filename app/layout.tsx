import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: 'ぴた壁 — スクショ壁紙メーカー',
  description:
    '時計やDockを避けて、好きなスクショをiPhoneの壁紙に。機種別サイズ・余白調整・PNG保存。画像は端末内で処理します。',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
