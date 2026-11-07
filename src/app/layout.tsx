import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kas Sosial Measuring Center - System Keuangan Kas",
  description: "Aplikasi Pengelolaan Kas Sosial Anggota Measuring Center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans text-[#1b1b23] bg-[#fcf8ff] selection:bg-[#4648d4] selection:text-white">
        {children}
      </body>
    </html>
  );
}
