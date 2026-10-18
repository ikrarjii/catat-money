import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Catat Money",
  description: "Catat pemasukan dan pengeluaran dengan lebih mudah.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
