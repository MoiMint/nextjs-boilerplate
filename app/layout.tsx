import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blabla | AI Command Simulator",
  description:
    "Nền tảng mô phỏng giúp học sinh, sinh viên và doanh nghiệp làm chủ AI bằng thực hành.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
