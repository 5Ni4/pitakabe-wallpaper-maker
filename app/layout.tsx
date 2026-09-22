import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: 'ぴた壁 — スクショ壁紙メーカー',
  description:
    '時計・検索・Dockを避けて、好きなスクショをiPhoneの壁紙に。シリーズ別の機種選択・余白と背景模様・PNG保存。画像は端末内で処理します。',
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
