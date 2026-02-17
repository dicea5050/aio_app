import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIO診断 - AI検索最適化診断ツール",
  description: "あなたの企業ホームページがAI検索でヒットするかを無料診断。構造化データ、コンテンツ品質、技術的最適化、権威性、AI対応度の5軸で総合評価。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="grid-bg" />
        {children}
      </body>
    </html>
  );
}
